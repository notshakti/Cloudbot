import jwt, { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../types';
import { config } from '../config';

// expiresIn in seconds: 7d = 604800, 30d = 2592000
const accessTokenOptions: SignOptions = { expiresIn: 604800 };
const refreshTokenOptions: SignOptions = { expiresIn: 2592000 };

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, config.jwt.secret, accessTokenOptions);
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload as object, config.jwt.refreshSecret, refreshTokenOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
}
