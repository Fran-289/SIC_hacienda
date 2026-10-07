import { SignJWT, jwtVerify } from 'jose';

const secretValue = process.env.JWT_SECRET;
if (!secretValue) {
  throw new Error(
    'JWT_SECRET no está definido. Agrega JWT_SECRET a .env antes de arrancar la aplicación.'
  );
}
const encodedKey = new TextEncoder().encode(secretValue);

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encodedKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}
