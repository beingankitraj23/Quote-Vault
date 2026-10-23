const { neon } = require('@neondatabase/serverless');

let sql;
let ready;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

// Creates the favorites table on first use (safe to call on every request).
async function db() {
  const q = getSql();
  if (!ready) {
    ready = (async () => {
      await q`
        CREATE TABLE IF NOT EXISTS favorites (
          id         SERIAL PRIMARY KEY,
          user_id    TEXT        NOT NULL,
          content    TEXT        NOT NULL,
          author     TEXT        NOT NULL DEFAULT 'Unknown',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, content)
        )`;
      await q`CREATE INDEX IF NOT EXISTS favorites_user_created_idx ON favorites (user_id, created_at DESC)`;
    })().catch((err) => {
      ready = null; // retry on next request
      throw err;
    });
  }
  await ready;
  return q;
}

module.exports = { db };
