import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Rate limiting en memoria: 10 intentos fallidos cada 15 minutos por IP+email
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function pruneAttempts() {
  if (failedAttempts.size < 5000) return;
  const now = Date.now();
  for (const [key, entry] of failedAttempts) {
    if (now > entry.resetAt) failedAttempts.delete(key);
  }
}

function isRateLimited(key: string): boolean {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  pruneAttempts();
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

// Hash dummy para igualar el tiempo cuando el usuario no existe (evita enumeración)
let dummyHash: string | null = null;
async function burnCompareTime(password: string) {
  if (!dummyHash) dummyHash = await bcrypt.hash('timing-equalizer-password', 10);
  await bcrypt.compare(password, dummyHash);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación con Zod
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = result.data;

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rateKey = `${clientIp}|${email.toLowerCase()}`;

    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await burnCompareTime(password);
      registerFailure(rateKey);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      registerFailure(rateKey);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    failedAttempts.delete(rateKey);

    // Generar token JWT
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    });

    // Guardar en cookies (HttpOnly)
    const cookieStore = await cookies();
    cookieStore.set('sic-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas
    });

    return NextResponse.json({ success: true, redirectUrl: '/ingresos' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
