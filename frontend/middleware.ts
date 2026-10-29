import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Гард кабинета. Включается переменной окружения LVS_REQUIRE_AUTH=1.
 * По умолчанию выключен, чтобы интерфейс можно было открыть и оценить
 * без поднятого бэкенда (все экраны имеют демо-состояние).
 */
export function middleware(request: NextRequest) {
  if (process.env.LVS_REQUIRE_AUTH !== '1') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const publicPaths = ['/', '/login', '/auth/callback', '/contacts', '/terms', '/privacy', '/api'];
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const session =
    request.cookies.get('lvs_session')?.value ||
    request.cookies.get('session')?.value ||
    request.cookies.get('access_token')?.value;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
