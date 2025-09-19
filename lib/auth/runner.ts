import { SignJWT, jwtVerify } from 'jose';

const RUNNER_SECRET = process.env.RUNNER_SHARED_SECRET || 'dev-secret';
const secret = new TextEncoder().encode(RUNNER_SECRET);

export async function createRunnerToken(runnerId: string): Promise<string> {
  const token = await new SignJWT({ runnerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

export async function verifyRunnerToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.runnerId as string;
  } catch (error) {
    console.error('Invalid runner token:', error);
    return null;
  }
}