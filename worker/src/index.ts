import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import type { Env, MapInput, MapRecord, UserRecord, UserRow } from './types';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
  purgeExpiredSessions,
  sessionCookie,
  clearSessionCookie,
  getSessionToken,
} from './auth';

type AppEnv = { Bindings: Env; Variables: { user?: UserRecord } };
const app = new Hono<AppEnv>();

// ---------- Helpers ----------

/** Build the canonical cache key for a map's JSON response */
function mapCacheKey(id: string, baseUrl: string): string {
  const url = new URL(baseUrl);
  return `${url.origin}/api/maps/${id}`;
}

/** Edge cache TTL: serve cached map JSON for up to 24 hours */
const CACHE_MAX_AGE_SECONDS = 86_400;
/** Allow stale responses for up to 1 hour while revalidating in the background */
const CACHE_SWR_SECONDS = 3_600;

/** Purge a cached map response (best-effort; non-fatal on error). */
async function purgeCachedMap(id: string, baseUrl: string): Promise<void> {
  try {
    const cache = caches.default;
    await cache.delete(new Request(mapCacheKey(id, baseUrl)));
  } catch {
    // Cache purge is best-effort; don't fail the write request
  }
}

// ---------- Middleware ----------

app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

/** Resolve the current user from session cookie (sets c.var.user if valid). */
async function resolveUser(c: { req: { header: (name: string) => string | undefined }; env: Env; set: (key: string, value: unknown) => void }): Promise<UserRecord | null> {
  const token = getSessionToken(c.req.header('Cookie'));
  if (!token) return null;
  const user = await validateSession(c.env.DB, token);
  if (user) c.set('user', user);
  return user;
}

/** Return 401 if the user is not authenticated. */
async function requireAuth(c: { req: { header: (name: string) => string | undefined }; env: Env; set: (key: string, value: unknown) => void; json: (data: unknown, status?: number) => Response; var: { user?: UserRecord } }): Promise<Response | null> {
  // Already resolved?
  if (c.var.user) return null;
  const user = await resolveUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return null;
}

// ---------- Auth Routes ----------

// Setup — create first user (only works when no users exist)
app.post('/api/auth/setup', async (c) => {
  const count = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>();
  if (count && count.n > 0) {
    return c.json({ error: 'Setup already completed. Use the admin panel to manage users.' }, 403);
  }

  const body = await c.req.json<{ email?: string; password?: string; name?: string }>().catch(() => ({} as { email?: string; password?: string; name?: string }));
  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const id = nanoid(12);
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, body.email.toLowerCase().trim(), passwordHash, body.name ?? '', now, now).run();

  // Auto-login the new user
  const token = await createSession(c.env.DB, id);
  return c.json(
    { id, email: body.email },
    201,
    { 'Set-Cookie': sessionCookie(token, c.env) },
  );
});

// Login
app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }));
  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?',
  ).bind(body.email.toLowerCase().trim()).first<UserRow>();

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await createSession(c.env.DB, user.id);

  // Opportunistic cleanup of expired sessions
  c.executionCtx.waitUntil(purgeExpiredSessions(c.env.DB));

  return c.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    200,
    { 'Set-Cookie': sessionCookie(token, c.env) },
  );
});

// Logout
app.post('/api/auth/logout', async (c) => {
  const token = getSessionToken(c.req.header('Cookie'));
  if (token) {
    c.executionCtx.waitUntil(deleteSession(c.env.DB, token));
  }
  return c.json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(c.env) });
});

// Current user
app.get('/api/auth/me', async (c) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ user: null }, 200);
  return c.json({ user: { id: user.id, email: user.email, name: user.name } });
});

// ---------- User Management Routes (auth required) ----------

// List users
app.get('/api/users', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const result = await c.env.DB.prepare(
    'SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at',
  ).all<UserRecord>();
  return c.json({ users: result.results });
});

// Create user
app.post('/api/users', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const body = await c.req.json<{ email?: string; password?: string; name?: string }>().catch(() => ({} as { email?: string; password?: string; name?: string }));
  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(body.email.toLowerCase().trim()).first();
  if (existing) return c.json({ error: 'A user with this email already exists' }, 409);

  const id = nanoid(12);
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, body.email.toLowerCase().trim(), passwordHash, body.name ?? '', now, now).run();

  return c.json({ id, email: body.email, name: body.name ?? '' }, 201);
});

// Reset password
app.put('/api/users/:userId/password', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const userId = c.req.param('userId');
  const body = await c.req.json<{ password?: string }>().catch(() => ({} as { password?: string }));
  if (!body.password || body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const passwordHash = await hashPassword(body.password);
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
  ).bind(passwordHash, now, userId).run();

  if (!result.meta.changes) return c.json({ error: 'User not found' }, 404);

  // Invalidate all sessions for this user
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();

  return c.json({ ok: true });
});

// Delete user
app.delete('/api/users/:userId', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const userId = c.req.param('userId');

  // Prevent deleting yourself
  if (c.var.user?.id === userId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  const result = await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  if (!result.meta.changes) return c.json({ error: 'User not found' }, 404);
  return c.json({ deleted: true });
});

// ---------- Map Routes ----------

// List maps (auth required)
app.get('/api/maps', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const status = c.req.query('status'); // draft | published | archived | all
  let query: string;
  let params: string[];

  if (status === 'all') {
    query = 'SELECT id, title, description, status, created_at, updated_at FROM maps ORDER BY updated_at DESC';
    params = [];
  } else if (status) {
    query = 'SELECT id, title, description, status, created_at, updated_at FROM maps WHERE status = ? ORDER BY updated_at DESC';
    params = [status];
  } else {
    query = 'SELECT id, title, description, status, created_at, updated_at FROM maps WHERE status != ? ORDER BY updated_at DESC';
    params = ['archived'];
  }

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ maps: result.results });
});

// Get single map — public for published maps (embeds), auth required for drafts
app.get('/api/maps/:id', async (c) => {
  const id = c.req.param('id');

  // Serve from Cloudflare edge cache for published maps
  const cacheKey = new Request(mapCacheKey(id, c.req.url));
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const row = await c.env.DB.prepare(
    'SELECT * FROM maps WHERE id = ?'
  ).bind(id).first<MapRecord>();

  if (!row) return c.json({ error: 'Map not found' }, 404);

  // Non-published maps require auth
  if (row.status !== 'published') {
    const denied = await requireAuth(c);
    if (denied) return denied;
  }

  const payload = {
    ...row,
    design_state: JSON.parse(row.design_state),
    data_config: JSON.parse(row.data_config),
  };

  // Cache published maps at the edge for 24 hours
  if (row.status === 'published') {
    const response = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${CACHE_SWR_SECONDS}`,
      },
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }

  return c.json(payload);
});

// Create map (auth required)
app.post('/api/maps', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const body = await c.req.json<MapInput>().catch(() => ({} as MapInput));
  const id = nanoid(12);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO maps (id, title, description, status, design_state, data_config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.title ?? 'Untitled Map',
    body.description ?? '',
    body.status ?? 'draft',
    JSON.stringify(body.design_state ?? {}),
    JSON.stringify(body.data_config ?? {}),
    now,
    now,
  ).run();

  return c.json({ id, created_at: now }, 201);
});

// Update map (auth required)
app.put('/api/maps/:id', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const id = c.req.param('id');
  const body = await c.req.json<MapInput>().catch(() => ({} as MapInput));
  const now = new Date().toISOString();

  // Build dynamic SET clause from provided fields
  const sets: string[] = [];
  const values: (string | undefined)[] = [];

  if (body.title !== undefined) { sets.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { sets.push('description = ?'); values.push(body.description); }
  if (body.status !== undefined) { sets.push('status = ?'); values.push(body.status); }
  if (body.design_state !== undefined) { sets.push('design_state = ?'); values.push(JSON.stringify(body.design_state)); }
  if (body.data_config !== undefined) { sets.push('data_config = ?'); values.push(JSON.stringify(body.data_config)); }

  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400);

  sets.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const result = await c.env.DB.prepare(
    `UPDATE maps SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  if (!result.meta.changes) return c.json({ error: 'Map not found' }, 404);

  // Purge edge cache in the background so the next GET reflects the updated data
  c.executionCtx.waitUntil(purgeCachedMap(id, c.req.url));

  return c.json({ updated_at: now });
});

// Delete map (auth required) — hard delete; use PUT status=archived for soft delete
app.delete('/api/maps/:id', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM maps WHERE id = ?').bind(id).run();

  if (!result.meta.changes) return c.json({ error: 'Map not found' }, 404);
  return c.json({ deleted: true });
});

// Duplicate map (auth required)
app.post('/api/maps/:id/duplicate', async (c) => {
  const denied = await requireAuth(c);
  if (denied) return denied;

  const id = c.req.param('id');
  const original = await c.env.DB.prepare('SELECT * FROM maps WHERE id = ?').bind(id).first<MapRecord>();
  if (!original) return c.json({ error: 'Map not found' }, 404);

  const newId = nanoid(12);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO maps (id, title, description, status, design_state, data_config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId,
    `${original.title} (copy)`,
    original.description,
    'draft',
    original.design_state,
    original.data_config,
    now,
    now,
  ).run();

  return c.json({ id: newId, created_at: now }, 201);
});

// ---------- SPA fallback ----------
// Non-API routes are served by the static assets binding (Vite build output).
// The `not_found_handling = "single-page-application"` in wrangler.toml ensures
// that missing files return index.html so client-side routing works.
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
