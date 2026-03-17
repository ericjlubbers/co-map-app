import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import type { Env, MapInput, MapRecord } from './types';

const app = new Hono<{ Bindings: Env }>();

// ---------- Helpers ----------

/** Build the canonical cache key for a map's JSON response */
function mapCacheKey(id: string, baseUrl: string): string {
  const url = new URL(baseUrl);
  return `${url.origin}/api/maps/${id}`;
}

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
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return corsMiddleware(c, next);
});

/** Auth gate — write operations require Bearer token matching API_KEY secret. */
function requireAuth(c: { req: { header: (name: string) => string | undefined }; env: Env }) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!c.env.API_KEY || token !== c.env.API_KEY) {
    return { authorized: false as const };
  }
  return { authorized: true as const };
}

// ---------- Routes ----------

// List maps (public — filters by status, defaults to non-archived)
app.get('/api/maps', async (c) => {
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

// Get single map (public for published, auth for draft)
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

  // Draft maps require auth
  if (row.status === 'draft') {
    const { authorized } = requireAuth(c);
    if (!authorized) return c.json({ error: 'Unauthorized' }, 401);
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
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
      },
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }

  return c.json(payload);
});

// Create map (auth required)
app.post('/api/maps', async (c) => {
  const { authorized } = requireAuth(c);
  if (!authorized) return c.json({ error: 'Unauthorized' }, 401);

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
  const { authorized } = requireAuth(c);
  if (!authorized) return c.json({ error: 'Unauthorized' }, 401);

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
  const { authorized } = requireAuth(c);
  if (!authorized) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM maps WHERE id = ?').bind(id).run();

  if (!result.meta.changes) return c.json({ error: 'Map not found' }, 404);
  return c.json({ deleted: true });
});

// Duplicate map (auth required)
app.post('/api/maps/:id/duplicate', async (c) => {
  const { authorized } = requireAuth(c);
  if (!authorized) return c.json({ error: 'Unauthorized' }, 401);

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

export default app;
