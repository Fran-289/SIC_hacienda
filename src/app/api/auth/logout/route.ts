import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('sic-session');
  
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
