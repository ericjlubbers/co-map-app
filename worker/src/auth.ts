import { nanoid } from 'nanoid';
import type { Env, UserRecord } from './types';

// ── PBKDF2 password hashing (Web Crypto API) ───────────────────

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8,
  );
}

/** Hash a password → "salt_hex:hash_hex" */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveKey(password, salt.buffer);
  return `${bufToHex(salt.buffer)}:${bufToHex(hash)}`;
}

/** Verify a password against a stored "salt_hex:hash_hex" string */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = hexToBuf(saltHex);
  const derived = await deriveKey(password, salt);
  return bufToHex(derived) === hashHex;
}

// ── Session management ──────────────────────────────────────────

const SESSION_TTL_DAYS = 30;

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
  ).bind(token, userId, expiresAt).run();
  return token;
}

export async function validateSession(db: D1Database, token: string): Promise<UserRecord | null> {
  const row = await db.prepare(
    `SELECT u.id, u.email, u.name, u.created_at, u.updated_at
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  ).bind(token).first<UserRecord>();
  return row ?? null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
}

/** Remove all expired sessions (housekeeping). */
export async function purgeExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// ── Cookie helpers ──────────────────────────────────────────────

const COOKIE_NAME = 'session';

export function sessionCookie(token: string, env: Env): string {
  const isProduction = env.CORS_ORIGIN?.startsWith('https');
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_DAYS * 86_400}`,
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(env: Env): string {
  const isProduction = env.CORS_ORIGIN?.startsWith('https');
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}

export function getSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}
