# Quote Vault

Fetches quotes from public APIs (dummyjson.com, zenquotes.io, with an offline fallback from `data/quote_history_seed.json`), lets you save favorites to a Postgres table, shows your favorites history, and copies quotes to the clipboard.

## Structure
- `public/index.html` – frontend (vanilla JS, no build step)
- `api/quote.js` – GET `/api/quote?mode=random|daily` (server-side proxy to public APIs)
- `api/favorites.js` – GET / POST / DELETE `/api/favorites`
- `data/quote_history_seed.json` – 80 sample quotes used when both public APIs fail
- `api/_db.js` – Neon Postgres client; creates the `favorites` table automatically

## Database table
```sql
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content)
);
```
It is created automatically on the first request.

## Deploy on Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com choose Add New, then Project, and import the repo. Leave the framework preset as "Other" and keep the build settings empty.
3. In the project, open Storage, then Create Database, pick Neon (Postgres) and connect it to the project. This adds `DATABASE_URL` automatically. (Or create a free database at neon.tech and add `DATABASE_URL` under Settings, then Environment Variables.)
4. Deploy (or redeploy if you added the database after the first deploy).

## Run locally
```bash
npm install
npm i -g vercel
cp .env.example .env.local   # paste your DATABASE_URL
vercel dev
```
Open http://localhost:3000.

## Notes
- Test the fallback with `/api/quote?mode=fallback`.
- Users are anonymous: each browser stores a random id in localStorage and sends it as `x-user-id`, so favorites are per browser. Add real auth if you need cross-device accounts.
- SQLite will not work on Vercel (read-only, ephemeral filesystem), which is why this uses hosted Postgres.

Working Link - https://quote-vault-zeta.vercel.app/
