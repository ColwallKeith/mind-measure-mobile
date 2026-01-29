/**
 * Invite/opt-out token generation and verification. Store hash only.
 */

import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;
const INVITE_EXPIRY_DAYS = 14;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function inviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d;
}

export function isExpired(expiresAt: Date | string): boolean {
  return new Date() > new Date(expiresAt);
}
