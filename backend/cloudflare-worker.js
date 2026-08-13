// Analisaku Signal API — public-safe Cloudflare Worker
// Stores the full private webhook payload in KV, but GET endpoints expose output-only fields.
// Required bindings: SIGNALS (KV), WEBHOOK_SECRET (secret)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    };

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });

    const normalizeTicker = value =>
      String(value || '')
        .toUpperCase()
        .replace(/^IDX:/, '')
        .replace(/[^A-Z0-9._-]/g, '')
        .slice(0, 20);

    const normalizeTimeframe = value => {
      const v = String(value || '').toUpperCase();
      return ({ D:'1D', '1D':'1D', W:'1W', '1W':'1W', M:'1M', '1M':'1M' })[v] || v;
    };

    const toBool = value =>
      value === true || String(value).toLowerCase() === 'true' || String(value) === '1';

    const toScore = value => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const gcState = value => {
      const state = String(value || '').toUpperCase();
      return ['FRESH','RECENT','ACTIVE'].includes(state) ? state : 'OFF';
    };

    // Public Decision Panel payload. Score is intentionally public.
    const publicSignal = s => ({
      ticker: normalizeTicker(s?.ticker),
      timeframe: normalizeTimeframe(s?.timeframe),
      score: toScore(s?.score),
      trend: String(s?.trend || ''),
      setup: String(s?.setup || ''),
      status: String(s?.status || ''),
      entry_low: String(s?.entry_low || ''),
      entry_high: String(s?.entry_high || ''),
      trigger: String(s?.trigger || ''),
      invalidation: String(s?.invalidation || ''),
      target1: String(s?.target1 || ''),
      target2: String(s?.target2 || ''),
      target3: String(s?.target3 || ''),
      price: String(s?.price || ''),
      radar_status: String(s?.radar_status || ''),
      updated_at: Number(s?.updated_at || 0),
      received_at: Number(s?.received_at || 0)
    });

    // Public Technical Radar payload. No periods, MA/EMA values, ages, RVOL,
    // score components, thresholds, weights, or other proprietary calculation fields.
    const publicGc = s => ({
      ticker: normalizeTicker(s?.ticker),
      timeframe: normalizeTimeframe(s?.timeframe),
      score: toScore(s?.score),
      radar_status: String(s?.radar_status || ''),
      status: String(s?.status || ''),
      ema_gc: gcState(s?.ema_gc),
      sma_gc: gcState(s?.sma_gc),
      double_gc: toBool(s?.double_gc),
      updated_at: Number(s?.updated_at || 0),
      received_at: Number(s?.received_at || 0)
    });

    const byScore = (a, b) =>
      toScore(b?.score) - toScore(a?.score) ||
      String(a?.ticker || '').localeCompare(String(b?.ticker || ''));

    async function readAll(tf) {
      const list = await env.SIGNALS.list({ prefix: 'signal:', limit: 100 });
      const keys = list.keys
        .map(k => k.name)
        .filter(k => k.endsWith(`:${tf}`));

      const values = await Promise.all(
        keys.map(k => env.SIGNALS.get(k, { type: 'json' }))
      );

      return values.filter(Boolean);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === 'GET' && url.pathname === '/') {
      return json({
        ok: true,
        service: 'analisaku-signal',
        version: '2.2-public-safe',
        status: 'ready'
      });
    }

    if (request.method === 'GET' && url.pathname === '/signal') {
      const ticker = normalizeTicker(url.searchParams.get('ticker'));
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe'));

      if (!ticker || !timeframe) {
        return json({ ok: false, error: 'ticker dan timeframe wajib diisi' }, 400);
      }

      const data = await env.SIGNALS.get(`signal:${ticker}:${timeframe}`, { type: 'json' });

      if (!data) {
        return json({
          ok: false,
          error: 'signal belum tersedia',
          ticker,
          timeframe
        }, 404);
      }

      return json({ ok: true, ...publicSignal(data) });
    }

    if (request.method === 'GET' && url.pathname === '/signals') {
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe') || '1D');
      const all = await readAll(timeframe);
      const signals = all.map(publicSignal).sort(byScore);

      return json({
        ok: true,
        timeframe,
        count: signals.length,
        signals
      });
    }

    if (request.method === 'GET' && url.pathname === '/technical') {
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe') || '1D');
      const internal = await readAll(timeframe);

      const ema = internal.filter(s => gcState(s.ema_gc) !== 'OFF');
      const sma = internal.filter(s => gcState(s.sma_gc) !== 'OFF');
      const double = internal.filter(s => toBool(s.double_gc));
      const fresh = internal.filter(s =>
        gcState(s.ema_gc) === 'FRESH' || gcState(s.sma_gc) === 'FRESH'
      );
      const doubleFresh = internal.filter(s =>
        toBool(s.double_gc) &&
        gcState(s.ema_gc) === 'FRESH' &&
        gcState(s.sma_gc) === 'FRESH'
      );

      const newest = internal.reduce(
        (max, s) => Math.max(max, Number(s.updated_at || 0)),
        0
      );

      return json({
        ok: true,
        timeframe,
        updated_at: newest,
        summary: {
          total: internal.length,
          double_gc: double.length,
          double_fresh: doubleFresh.length,
          ema_gc: ema.length,
          sma_gc: sma.length,
          fresh_gc: fresh.length
        },
        double_fresh: doubleFresh.map(publicGc).sort(byScore),
        double_gc: double.map(publicGc).sort(byScore),
        ema_gc: ema.map(publicGc).sort(byScore),
        sma_gc: sma.map(publicGc).sort(byScore),
        fresh_gc: fresh.map(publicGc).sort(byScore)
      });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
      const supplied = decodeURIComponent(url.pathname.slice('/webhook/'.length));

      if (!env.WEBHOOK_SECRET || supplied !== env.WEBHOOK_SECRET) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: 'body harus JSON' }, 400);
      }

      const isBatch = Array.isArray(payload?.signals);
      const raw = isBatch ? payload.signals : [payload];

      if (!raw.length) {
        return json({ ok: false, error: 'signals kosong' }, 400);
      }

      if (raw.length > 40) {
        return json({ ok: false, error: 'terlalu banyak signal', max: 40 }, 400);
      }

      const receivedAt = Date.now();
      const writes = [];

      for (let i = 0; i < raw.length; i++) {
        const item = raw[i] || {};
        const ticker = normalizeTicker(item.ticker);
        const timeframe = normalizeTimeframe(item.timeframe);

        if (!ticker || !timeframe || !item.status) {
          return json({ ok: false, error: 'payload tidak lengkap', index: i }, 400);
        }

        // Full engine output remains private in KV and is never returned as-is by GET endpoints.
        const internal = {
          ...item,
          ticker,
          timeframe,
          received_at: receivedAt
        };

        writes.push({
          key: `signal:${ticker}:${timeframe}`,
          value: internal
        });
      }

      await Promise.all(
        writes.map(w => env.SIGNALS.put(w.key, JSON.stringify(w.value)))
      );

      return json({
        ok: true,
        version: '2.2-public-safe',
        mode: isBatch ? 'batch' : 'single',
        count: writes.length
      });
    }

    return json({ ok: false, error: 'not found' }, 404);
  }
};
