// Analisaku Signal API — Cloudflare Worker
// Supports both legacy single-signal webhook payloads and Signal Hub batch payloads.
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

const allowedStatus = new Set(['WAIT','WATCH','BUY SETUP','HOLD','TAKE PROFIT','EXIT']);
const allowedTrend = new Set(['BULLISH','NEUTRAL','BEARISH']);
const allowedSetup = new Set(['ACTIVE','INACTIVE']);

function normalizeSignal(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const ticker = safeTicker(input.ticker);
  const timeframe = safeTf(input.timeframe);
  if (!ticker || !timeframe) return null;

  const trend = clean(input.trend).toUpperCase();
  const setup = clean(input.setup).toUpperCase();
  const status = clean(input.status).toUpperCase();

  return {
    ticker,
    timeframe,
    trend: allowedTrend.has(trend) ? trend : 'NEUTRAL',
    setup: allowedSetup.has(setup) ? setup : 'INACTIVE',
    status: allowedStatus.has(status) ? status : 'WAIT',
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
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
      const token = decodeURIComponent(url.pathname.slice('/webhook/'.length));
      if (!env.WEBHOOK_TOKEN || token !== env.WEBHOOK_TOKEN) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }

      let input;
      try { input = await request.json(); }
      catch { return json({ ok: false, error: 'invalid_json' }, 400); }

      // Backward compatible:
      // Legacy V1.2 -> { ticker, timeframe, ... }
      // Signal Hub V1.4 -> { signals: [{ ticker, timeframe, ... }, ...] }
      const isBatch = Array.isArray(input?.signals);
      const rawSignals = isBatch ? input.signals : [input];

      if (!rawSignals.length) return json({ ok: false, error: 'signals_required' }, 400);
      if (rawSignals.length > 40) return json({ ok: false, error: 'too_many_signals', max: 40 }, 400);

      const deduped = new Map();
      for (let i = 0; i < rawSignals.length; i++) {
        const signal = normalizeSignal(rawSignals[i]);
        if (!signal) {
          return json({ ok: false, error: 'ticker_and_timeframe_required', index: i }, 400);
        }
        deduped.set(`${signal.ticker}:${signal.timeframe}`, signal);
      }

      // Every signal uses a different ticker:timeframe key in normal Hub operation.
      // Map de-duplication prevents multiple writes to the same key in one request.
      await Promise.all(
        [...deduped.entries()].map(([key, signal]) =>
          env.SIGNALS.put(key, JSON.stringify(signal))
        )
      );

      return json({
        ok: true,
        mode: isBatch ? 'batch' : 'single',
        received: rawSignals.length,
        written: deduped.size
      });
    }

    if (request.method === 'GET' && url.pathname === '/signal') {
      const ticker = safeTicker(url.searchParams.get('ticker'));
      const timeframe = safeTf(url.searchParams.get('timeframe'));
      if (!ticker || !timeframe) return json({ ok: false, error: 'ticker_and_timeframe_required' }, 400);

      const raw = await env.SIGNALS.get(`${ticker}:${timeframe}`);
      if (!raw) return json({ ok: false, error: 'signal_not_found' }, 404);
      return json({ ok: true, data: JSON.parse(raw) });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'analisaku-signal-api', batch: true });
    }

    return json({ ok: false, error: 'not_found' }, 404);
  }
};
