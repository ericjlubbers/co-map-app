export interface MapRecord {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  design_state: string; // JSON string
  data_config: string;  // JSON string
  created_at: string;
  updated_at: string;
}

export interface MapInput {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  design_state?: Record<string, unknown>;
  data_config?: Record<string, unknown>;
}

export interface Env {
  DB: D1Database;
  CORS_ORIGIN: string;
  ASSETS: Fetcher;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface UserRow extends UserRecord {
  password_hash: string;
}
