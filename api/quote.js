// GET /api/quote?mode=random|daily
// Proxies public quote APIs server-side (avoids CORS issues) with fallbacks.

// Offline fallback pool (80 sample quotes), used when both public APIs fail.
const SEED = require('../data/quote_history_seed.json');

function fromSeed() {
  const q = SEED[Math.floor(Math.random() * SEED.length)];
  return { text: q.text, author: q.author, topic: q.topic, source: 'seed data (offline fallback)' };
}

async function getJson(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function fromDummyJson() {
  const j = await getJson('https://dummyjson.com/quotes/random');
  if (!j.quote) throw new Error('bad dummyjson payload');
  return { text: j.quote, author: j.author || 'Unknown', source: 'dummyjson.com' };
}

async function fromZen(path) {
  const j = await getJson(`https://zenquotes.io/api/${path}`);
  const item = Array.isArray(j) ? j[0] : null;
  if (!item || !item.q || /too many requests/i.test(item.q)) throw new Error('bad zenquotes payload');
  return { text: item.q, author: item.a || 'Unknown', source: 'zenquotes.io' };
}

async function firstSuccess(fns) {
  for (const fn of fns) {
    try {
      return await fn();
    } catch (_) {
      /* try next source */
    }
  }
  return fromSeed();
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // /api/quote?mode=fallback forces the seed data, handy for testing the fallback path.
  if (req.query.mode === 'fallback') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(fromSeed());
  }

  const daily = req.query.mode === 'daily';
  const quote = await firstSuccess(
    daily
      ? [() => fromZen('today'), fromDummyJson]
      : [fromDummyJson, () => fromZen('random')]
  );

  res.setHeader(
    'Cache-Control',
    daily ? 'public, s-maxage=3600, stale-while-revalidate=600' : 'no-store'
  );
  res.status(200).json(quote);
};
