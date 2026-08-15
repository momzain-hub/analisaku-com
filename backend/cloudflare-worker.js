// Analisaku Signal API — public-safe Cloudflare Worker
// Public GET endpoints expose approved output fields only.
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
      const v = String(value || '').toUpperCase().trim();
      return ({ D:'1D', '1D':'1D', W:'1W', '1W':'1W', M:'1M', '1M':'1M' })[v] || '';
    };

    const toBool = value =>
      value === true || String(value).toLowerCase() === 'true' || String(value) === '1';

    const toScore = value => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const publicEnum = (value, allowed, fallback = '') => {
      const v = String(value || '').toUpperCase().trim();
      return allowed.includes(v) ? v : fallback;
    };

    const DECISIONS = ['WAIT','WATCH','BUY SETUP','HOLD','TAKE PROFIT','EXIT'];
    const publicTrend = value => publicEnum(value, ['BULLISH','NEUTRAL','BEARISH'], 'NEUTRAL');
    const publicSetup = value => publicEnum(value, ['ACTIVE','INACTIVE'], 'INACTIVE');
    const publicStage = value => publicEnum(value, ['EARLY WATCH','CONFIRMED','ACTIVE']);
    const publicEntryStyle = value => publicEnum(value, ['BREAKOUT','PULLBACK','WEAKNESS']);
    const publicDecision = value => publicEnum(value, DECISIONS, 'WAIT');
    const publicRadar = value => publicEnum(value, ['AVOID','WATCH','READY','HOT','EXTENDED'], 'AVOID');

    const publicPrice = value => {
      if (value === undefined || value === null || value === '') return '';
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? String(n) : '';
    };

    const publicTimestamp = value => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    };

    const gcState = value => publicEnum(value, ['FRESH','RECENT','ACTIVE'], 'OFF');

    const gcCandleAge = (value, state) => {
      if (gcState(state) === 'OFF') return null;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    };

    const publicSignal = s => ({
      ticker: normalizeTicker(s?.ticker),
      timeframe: normalizeTimeframe(s?.timeframe),
      score: toScore(s?.score),
      trend: publicTrend(s?.trend),
      setup: publicSetup(s?.setup),
      setup_stage: publicStage(s?.setup_stage),
      entry_style: publicEntryStyle(s?.entry_style),
      style_entry_low: publicPrice(s?.style_entry_low),
      style_entry_high: publicPrice(s?.style_entry_high),
      style_stop: publicPrice(s?.style_stop),
      status: publicDecision(s?.status),
      entry_low: publicPrice(s?.entry_low),
      entry_high: publicPrice(s?.entry_high),
      trigger: publicPrice(s?.trigger),
      invalidation: publicPrice(s?.invalidation),
      target1: publicPrice(s?.target1),
      target2: publicPrice(s?.target2),
      target3: publicPrice(s?.target3),
      price: publicPrice(s?.price),
      radar_status: publicRadar(s?.radar_status),
      updated_at: publicTimestamp(s?.updated_at),
      received_at: publicTimestamp(s?.received_at)
    });

    const publicGc = s => ({
      ticker: normalizeTicker(s?.ticker),
      timeframe: normalizeTimeframe(s?.timeframe),
      score: toScore(s?.score),
      radar_status: publicRadar(s?.radar_status),
      status: publicDecision(s?.status),
      ema_gc: gcState(s?.ema_gc),
      ema_gc_candles: gcCandleAge(s?.ema_gc_age, s?.ema_gc),
      sma_gc: gcState(s?.sma_gc),
      sma_gc_candles: gcCandleAge(s?.sma_gc_age, s?.sma_gc),
      double_gc: toBool(s?.double_gc),
      updated_at: publicTimestamp(s?.updated_at),
      received_at: publicTimestamp(s?.received_at)
    });

    const sanitizeForStorage = (item, ticker, timeframe, receivedAt) => ({
      ticker,
      timeframe,
      score: toScore(item?.score),
      trend: publicTrend(item?.trend),
      setup: publicSetup(item?.setup),
      setup_stage: publicStage(item?.setup_stage),
      entry_style: publicEntryStyle(item?.entry_style),
      style_entry_low: publicPrice(item?.style_entry_low),
      style_entry_high: publicPrice(item?.style_entry_high),
      style_stop: publicPrice(item?.style_stop),
      status: publicDecision(item?.status),
      entry_low: publicPrice(item?.entry_low),
      entry_high: publicPrice(item?.entry_high),
      trigger: publicPrice(item?.trigger),
      invalidation: publicPrice(item?.invalidation),
      target1: publicPrice(item?.target1),
      target2: publicPrice(item?.target2),
      target3: publicPrice(item?.target3),
      price: publicPrice(item?.price),
      radar_status: publicRadar(item?.radar_status),
      ema_gc: gcState(item?.ema_gc),
      ema_gc_age: gcCandleAge(item?.ema_gc_age, item?.ema_gc),
      sma_gc: gcState(item?.sma_gc),
      sma_gc_age: gcCandleAge(item?.sma_gc_age, item?.sma_gc),
      double_gc: toBool(item?.double_gc),
      updated_at: publicTimestamp(item?.updated_at),
      received_at: receivedAt
    });

    const byScore = (a, b) =>
      toScore(b?.score) - toScore(a?.score) ||
      String(a?.ticker || '').localeCompare(String(b?.ticker || ''));

    async function readAll(tf) {
      const list = await env.SIGNALS.list({ prefix: 'signal:', limit: 100 });
      const keys = list.keys.map(k => k.name).filter(k => k.endsWith(`:${tf}`));
      const values = await Promise.all(keys.map(k => env.SIGNALS.get(k, { type: 'json' })));
      return values.filter(Boolean);
    }

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'analisaku-signal', version: '2.5-execution-plan', status: 'ready' });
    }

    if (request.method === 'GET' && url.pathname === '/signal') {
      const ticker = normalizeTicker(url.searchParams.get('ticker'));
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe'));
      if (!ticker || !timeframe) return json({ ok: false, error: 'ticker dan timeframe wajib diisi' }, 400);
      const data = await env.SIGNALS.get(`signal:${ticker}:${timeframe}`, { type: 'json' });
      if (!data) return json({ ok: false, error: 'signal belum tersedia', ticker, timeframe }, 404);
      return json({ ok: true, ...publicSignal(data) });
    }

    if (request.method === 'GET' && url.pathname === '/signals') {
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe') || '1D');
      if (!timeframe) return json({ ok: false, error: 'timeframe tidak valid' }, 400);
      const all = await readAll(timeframe);
      const signals = all.map(publicSignal).sort(byScore);
      return json({ ok: true, timeframe, count: signals.length, signals });
    }

    if (request.method === 'GET' && url.pathname === '/technical') {
      const timeframe = normalizeTimeframe(url.searchParams.get('timeframe') || '1D');
      if (!timeframe) return json({ ok: false, error: 'timeframe tidak valid' }, 400);
      const internal = await readAll(timeframe);
      const ema = internal.filter(s => gcState(s.ema_gc) !== 'OFF');
      const sma = internal.filter(s => gcState(s.sma_gc) !== 'OFF');
      const double = internal.filter(s => toBool(s.double_gc));
      const fresh = internal.filter(s => gcState(s.ema_gc) === 'FRESH' || gcState(s.sma_gc) === 'FRESH');
      const doubleFresh = internal.filter(s =>
        toBool(s.double_gc) && gcState(s.ema_gc) === 'FRESH' && gcState(s.sma_gc) === 'FRESH'
      );
      const newest = internal.reduce((max, s) => Math.max(max, publicTimestamp(s.updated_at)), 0);
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
      if (!env.WEBHOOK_SECRET || supplied !== env.WEBHOOK_SECRET) return json({ ok: false, error: 'unauthorized' }, 401);

      let payload;
      try { payload = await request.json(); }
      catch { return json({ ok: false, error: 'body harus JSON' }, 400); }

      const isBatch = Array.isArray(payload?.signals);
      const raw = isBatch ? payload.signals : [payload];
      if (!raw.length) return json({ ok: false, error: 'signals kosong' }, 400);
      if (raw.length > 40) return json({ ok: false, error: 'terlalu banyak signal', max: 40 }, 400);

      const receivedAt = Date.now();
      const writes = [];
      for (let i = 0; i < raw.length; i++) {
        const item = raw[i] || {};
        const ticker = normalizeTicker(item.ticker);
        const timeframe = normalizeTimeframe(item.timeframe);
        const rawStatus = String(item.status || '').toUpperCase().trim();
        if (!ticker || !timeframe || !DECISIONS.includes(rawStatus)) {
          return json({ ok: false, error: 'payload tidak lengkap / status tidak valid', index: i }, 400);
        }
        writes.push({
          key: `signal:${ticker}:${timeframe}`,
          value: sanitizeForStorage(item, ticker, timeframe, receivedAt)
        });
      }

      await Promise.all(writes.map(w => env.SIGNALS.put(w.key, JSON.stringify(w.value))));
      return json({ ok: true, version: '2.5-execution-plan', mode: isBatch ? 'batch' : 'single', count: writes.length });
    }

    return json({ ok: false, error: 'not found' }, 404);
  }
};