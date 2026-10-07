import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Archivos estáticos del framework y API de auth están permitidos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('sic-session')?.value;
  const session = token ? await verifyToken(token) : null;

  // Rutas legacy de reportes generados antes de moverlos fuera de public/
  const isLegacyReport =
    pathname.startsWith('/reports/') || pathname.startsWith('/uploads/');

  if (!session) {
    // La pantalla de login debe ser accesible sin sesión (evita bucle /login -> /login)
    if (pathname === '/login') {
      return NextResponse.next();
    }
    // Las APIs deben recibir 401 JSON, no un redirect con HTML
    if (pathname.startsWith('/api/') || isLegacyReport) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Si hay sesión y trata de ir a login o a la raíz, redirigir a la bandeja principal
  if (pathname === '/login' || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/ingresos';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Archivos legacy: servirlos desde storage/ con autenticación
  if (isLegacyReport) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/archivos${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
