import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

mkdirSync(path.dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'coordinator',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  -- Single-row table (id = 1) holding the org-wide Zoho CRM connection.
  CREATE TABLE IF NOT EXISTS zoho_connection (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    refresh_token TEXT NOT NULL,
    access_token  TEXT,
    expires_at    INTEGER NOT NULL DEFAULT 0,  -- epoch ms
    api_domain    TEXT,
    scope         TEXT,
    connected_by  TEXT,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Short-lived OAuth "state" values for CSRF protection on the consent round-trip.
  CREATE TABLE IF NOT EXISTS oauth_states (
    state      TEXT PRIMARY KEY,
    user_id    INTEGER,
    created_at INTEGER NOT NULL  -- epoch ms
  );
`);

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export interface ZohoConnectionRow {
  id: 1;
  refresh_token: string;
  access_token: string | null;
  expires_at: number;
  api_domain: string | null;
  scope: string | null;
  connected_by: string | null;
  updated_at: string;
}
