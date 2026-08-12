// Analisaku Signal API — Cloudflare Worker template
// Public-safe backend: stores only generic signal output, never Pine/source formulas.
// Required bindings:
//   KV namespace: SIGNALS
//   Secret: WEBHOOK_TOKEN

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});

const clean = value => String(value ?? '').trim();
const safeTicker = value => clean(value).toUpperCase().replace(/[^A-Z0-9._-]/g, '').slice(0, 20);
const safeTf = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
      const token = decodeURIComponent(url.pathname.slice('/webhook/'.length));
      if (!env.WEBHOOK_TOKEN || token !== env.WEBHOOK_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);

      let input;
      try { input = await request.json(); }
      catch { return json({ ok: false, error: 'invalid_json' }, 400); }

      const ticker = safeTicker(input.ticker);
      const timeframe = safeTf(input.timeframe);
      if (!ticker || !timeframe) return json({ ok: false, error: 'ticker_and_timeframe_required' }, 400);

      const allowedStatus = new Set(['WAIT','WATCH','BUY SETUP','HOLD','TAKE PROFIT','EXIT']);
      const allowedTrend = new Set(['BULLISH','NEUTRAL','BEARISH']);
      const allowedSetup = new Set(['ACTIVE','INACTIVE']);

      const signal = {
        ticker,
        timeframe,
        trend: allowedTrend.has(clean(input.trend).toUpperCase()) ? clean(input.trend).toUpperCase() : 'NEUTRAL',
        setup: allowedSetup.has(clean(input.setup).toUpperCase()) ? clean(input.setup).toUpperCase() : 'INACTIVE',
        status: allowedStatus.has(clean(input.status).toUpperCase()) ? clean(input.status).toUpperCase() : 'WAIT',
        entry_low: clean(input.entry_low),
        entry_high: clean(input.entry_high),
        trigger: clean(input.trigger),
        invalidation: clean(input.invalidation),
        target1: clean(input.target1),
        target2: clean(input.target2),
        target3: clean(input.target3),
        price: clean(input.price),
        updated_at: Number(input.updated_at) || Date.now(),
        received_at: Date.now()
      };

      await env.SIGNALS.put(`${ticker}:${timeframe}`, JSON.stringify(signal));
      return json({ ok: true });
    }

    if (request.method === 'GET' && url.pathname === '/signal') {
      const ticker = safeTicker(url.searchParams.get('ticker'));
      const timeframe = safeTf(url.searchParams.get('timeframe'));
      if (!ticker || !timeframe) return json({ ok: false, error: 'ticker_and_timeframe_required' }, 400);

      const raw = await env.SIGNALS.get(`${ticker}:${timeframe}`);
      if (!raw) return json({ ok: false, error: 'signal_not_found' }, 404);
      return json({ ok: true, data: JSON.parse(raw) });
    }

    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, service: 'analisaku-signal-api' });
    return json({ ok: false, error: 'not_found' }, 404);
  }
};
