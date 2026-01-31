// Middleware desactivado para favorecer a la pantalla de login inmersiva de Draco.
import { NextResponse } from 'next/server';
export function middleware() { return NextResponse.next(); }
export const config = { matcher: '/admin/:path*' };
