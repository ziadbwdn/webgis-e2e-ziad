import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/database.config';
import { JWTPayload } from '../types';

export function generateToken(userId: number, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
  };

  const secret = jwtConfig.secret as string;

  return jwt.sign(payload, secret, {
    expiresIn: jwtConfig.expiresIn,
  } as any);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = jwtConfig.secret as string;
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
