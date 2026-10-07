import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type ModuleName = 'ingresos' | 'reportes' | 'directorio';

export type AuthzUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

export function parsePermissions(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === 'string');
  } catch {
    return [];
  }
}

type AuthzResult = { ok: true; user: AuthzUser } | { ok: false; response: NextResponse };

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
}

/**
 * Verifica sesión + consulta el usuario en BD (permisos frescos, no cacheados en el JWT)
 * + verifica el permiso de módulo si se indicó.
 * `module = null` exige solo sesión válida.
 */
export async function requireAuthz(module: ModuleName | null = null): Promise<AuthzResult> {
  const session = await getSession();
  if (!session?.id) return { ok: false, response: unauthorized() };

  const dbUser = await prisma.user.findUnique({
    where: { id: Number(session.id) },
    select: { id: true, email: true, name: true, role: true, permissions: true },
  });
  if (!dbUser) return { ok: false, response: unauthorized() };

  const permissions = parsePermissions(dbUser.permissions);
  if (module && dbUser.role !== 'ADMIN' && !permissions.includes(module)) {
    return { ok: false, response: forbidden() };
  }

  return {
    ok: true,
    user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, permissions },
  };
}

/** Solo usuarios con rol ADMIN (sesión válida + rol verificado en BD). */
export async function requireAdminAuthz(): Promise<AuthzResult> {
  const result = await requireAuthz(null);
  if (!result.ok) return result;
  if (result.user.role !== 'ADMIN') return { ok: false, response: forbidden() };
  return result;
}

/**
 * Para páginas (Server Components): devuelve el usuario con permisos frescos
 * de BD, o null si no hay sesión válida.
 */
export async function getPageUser(): Promise<AuthzUser | null> {
  const result = await requireAuthz(null);
  return result.ok ? result.user : null;
}

/** ADMIN tiene acceso a todos los módulos. */
export function hasModule(user: AuthzUser | null, module: ModuleName): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.permissions.includes(module);
}
