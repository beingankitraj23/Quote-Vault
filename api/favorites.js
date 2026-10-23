// GET    /api/favorites           -> list this user's favorites (newest first)
// POST   /api/favorites           -> save { text, author }
// DELETE /api/favorites?id=123    -> remove one
// Users are anonymous: the browser sends a random id in the x-user-id header.

const { db } = require('./_db');

const USER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const userId = req.headers['x-user-id'];
  if (!userId || !USER_ID_RE.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid x-user-id header' });
  }

  try {
    const sql = await db();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, content AS text, author, created_at
        FROM favorites
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 200`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const text = String(body.text || '').trim();
      const author = String(body.author || 'Unknown').trim().slice(0, 200) || 'Unknown';
      if (!text || text.length > 1000) {
        return res.status(400).json({ error: 'Quote text is required (max 1000 characters)' });
      }

      const inserted = await sql`
        INSERT INTO favorites (user_id, content, author)
        VALUES (${userId}, ${text}, ${author})
        ON CONFLICT (user_id, content) DO NOTHING
        RETURNING id, content AS text, author, created_at`;

      if (inserted.length) return res.status(201).json(inserted[0]);

      const existing = await sql`
        SELECT id, content AS text, author, created_at
        FROM favorites WHERE user_id = ${userId} AND content = ${text}`;
      return res.status(200).json({ ...existing[0], duplicate: true });
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id, 10);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Valid id is required' });
      await sql`DELETE FROM favorites WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    const msg = err.message === 'DATABASE_URL is not set'
      ? 'Database is not configured. Set DATABASE_URL in your Vercel project.'
      : 'Server error';
    return res.status(500).json({ error: msg });
  }
};
