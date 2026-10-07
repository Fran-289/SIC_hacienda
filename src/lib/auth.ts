import { cookies } from 'next/headers';
import { signToken, verifyToken } from '@/lib/jwt';

export { signToken, verifyToken };

export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('sic-session')?.value;
  if (!sessionToken) return null;

  return await verifyToken(sessionToken);
}
