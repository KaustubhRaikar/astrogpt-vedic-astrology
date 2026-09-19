// SQLite local offline caching schemas

export const CREATE_CHARTS_TABLE = `
  CREATE TABLE IF NOT EXISTS cached_charts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_REPORTS_TABLE = `
  CREATE TABLE IF NOT EXISTS cached_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chart_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_CHATS_TABLE = `
  CREATE TABLE IF NOT EXISTS cached_chats (
    chart_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
