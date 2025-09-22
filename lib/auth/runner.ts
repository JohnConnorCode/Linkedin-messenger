import { SignJWT, jwtVerify } from 'jose';

// Ensure we have a proper secret in production
const getRunnerSecret = () => {
  const secret = process.env.RUNNER_SHARED_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('RUNNER_SHARED_SECRET is required in production');
  }

  // Only use default in development
  if (!secret && process.env.NODE_ENV === 'development') {
    console.warn('Using development runner secret. Set RUNNER_SHARED_SECRET for production.');
    return 'dev-secret-only-for-development';
  }

  return secret || 'dev-secret-only-for-development';
};

const RUNNER_SECRET = getRunnerSecret();
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