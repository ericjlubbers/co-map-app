/** Typed API client for the co-map Worker */

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Standard fetch options — sends session cookie automatically. */
function opts(extra?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...extra,
  };
}

// ── Types (mirror worker/src/types.ts) ──────────────────────

export interface MapSummary {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface MapDetail extends MapSummary {
  design_state: Record<string, unknown>;
  data_config: Record<string, unknown>;
}

export interface MapInput {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  design_state?: Record<string, unknown>;
  data_config?: Record<string, unknown>;
}

// ── API calls ───────────────────────────────────────────────

export async function listMaps(status?: string): Promise<MapSummary[]> {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/maps${params}`, opts());
  if (!res.ok) throw new Error(`Failed to list maps: ${res.status}`);
  const json = await res.json();
  return json.maps;
}

export async function getMap(id: string): Promise<MapDetail> {
  const res = await fetch(`${API_BASE}/maps/${encodeURIComponent(id)}`, opts());
  if (!res.ok) throw new Error(`Failed to get map: ${res.status}`);
  return res.json();
}

export async function createMap(input?: MapInput): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/maps`, opts({
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  }));
  if (!res.ok) throw new Error(`Failed to create map: ${res.status}`);
  return res.json();
}

export async function updateMap(id: string, input: MapInput): Promise<void> {
  const res = await fetch(`${API_BASE}/maps/${encodeURIComponent(id)}`, opts({
    method: 'PUT',
    body: JSON.stringify(input),
  }));
  if (!res.ok) throw new Error(`Failed to update map: ${res.status}`);
}

/** Set map status to "published" and purge edge cache. */
export async function publishMap(id: string): Promise<void> {
  await updateMap(id, { status: 'published' });
}

export async function deleteMap(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/maps/${encodeURIComponent(id)}`, opts({
    method: 'DELETE',
  }));
  if (!res.ok) throw new Error(`Failed to delete map: ${res.status}`);
}

export async function duplicateMap(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/maps/${encodeURIComponent(id)}/duplicate`, opts({
    method: 'POST',
  }));
  if (!res.ok) throw new Error(`Failed to duplicate map: ${res.status}`);
  return res.json();
}
