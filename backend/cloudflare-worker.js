// Analisaku Signal API — public-safe Cloudflare Worker
// Internal webhook data may be stored in KV, but public GET endpoints expose outputs only.
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
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    const ticker = value => String(value || '').toUpperCase().replace(/^IDX:/, '').replace(/[^A-Z0-9._-]/g, '').slice(0, 20);
    const timeframe = value => {
      const v = String(value || '').toUpperCase();
      return ({D:'1D','1D':'1D',W:'1W','1W':'1W',M:'1M','1M':'1M'})[v] || v;
    };
    const yes = value => value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
    const gcState = value => ['FRESH','RECENT','ACTIVE'].includes(String(value || '').toUpperCase()) ? String(value).toUpperCase() : 'OFF';

    const publicSignal = s => ({
      ticker: ticker(s?.ticker),
      timeframe: timeframe(s?.timeframe),
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

    const publicGc = s => ({
      ticker: ticker(s?.ticker),
      timeframe: timeframe(s?.timeframe),
      radar_status: String(s?.radar_status || ''),
      status: String(s?.status || ''),
      ema_gc: gcState(s?.ema_gc),
      sma_gc: gcState(s?.sma_gc),
      double_gc: yes(s?.double_gc),
      updated_at: Number(s?.updated_at || 0),
      received_at: Number(s?.received_at || 0)
    });

    async function readAll(tf) {
      const list = await env.SIGNALS.list({ prefix: 'signal:', limit: 100 });
      const keys = list.keys.map(k => k.name).filter(k => k.endsWith(`:${tf}`));
      const values = await Promise.all(keys.map(k => env.SIGNALS.get(k, { type: 'json' })));
      return values.filter(Boolean);
    }

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'analisaku-signal', version: '2.1-public-safe', status: 'ready' });
    }

    if (request.method === 'GET' && url.pathname === '/signal') {
      const t = ticker(url.searchParams.get('ticker'));
      const tf = timeframe(url.searchParams.get('timeframe'));
      if (!t || !tf) return json({ ok: false, error: 'ticker dan timeframe wajib diisi' }, 400);
      const data = await env.SIGNALS.get(`signal:${t}:${tf}`, { type: 'json' });
      if (!data) return json({ ok: false, error: 'signal belum tersedia', ticker: t, timeframe: tf }, 404);
      return json({ ok: true, ...publicSignal(data) });
    }

    if (request.method === 'GET' && url.pathname === '/signals') {
      const tf = timeframe(url.searchParams.get('timeframe') || '1D');
      const all = await readAll(tf);
      return json({ ok: true, timeframe: tf, count: all.length, signals: all.map(publicSignal) });
    }

    if (request.method === 'GET' && url.pathname === '/technical') {
      const tf = timeframe(url.searchParams.get('timeframe') || '1D');
      const internal = await readAll(tf);
      const ema = internal.filter(s => gcState(s.ema_gc) !== 'OFF');
      const sma = internal.filter(s => gcState(s.sma_gc) !== 'OFF');
      const double = internal.filter(s => yes(s.double_gc));
      const fresh = internal.filter(s => gcState(s.ema_gc) === 'FRESH' || gcState(s.sma_gc) === 'FRESH');
      const doubleFresh = internal.filter(s => yes(s.double_gc) && gcState(s.ema_gc) === 'FRESH' && gcState(s.sma_gc) === 'FRESH');
      const newest = internal.reduce((m,s) => Math.max(m, Number(s.updated_at || 0)), 0);
      return json({
        ok: true,
        timeframe: tf,
        updated_at: newest,
        summary: {
          total: internal.length,
          double_gc: double.length,
          double_fresh: doubleFresh.length,
          ema_gc: ema.length,
          sma_gc: sma.length,
          fresh_gc: fresh.length
        },
        double_fresh: doubleFresh.map(publicGc),
        double_gc: double.map(publicGc),
        ema_gc: ema.map(publicGc),
        sma_gc: sma.map(publicGc),
        fresh_gc: fresh.map(publicGc)
      });
    }

    if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
      const supplied = decodeURIComponent(url.pathname.slice('/webhook/'.length));
      if (!env.WEBHOOK_SECRET || supplied !== env.WEBHOOK_SECRET) return json({ ok: false, error: 'unauthorized' }, 401);

      let payload;
      try { payload = await request.json(); }
      catch { return json({ ok: false, error: 'body harus JSON' }, 400); }

      const batch = Array.isArray(payload?.signals);
      const raw = batch ? payload.signals : [payload];
      if (!raw.length) return json({ ok: false, error: 'signals kosong' }, 400);
      if (raw.length > 40) return json({ ok: false, error: 'terlalu banyak signal', max: 40 }, 400);

      const receivedAt = Date.now();
      const writes = [];
      for (let i = 0; i < raw.length; i++) {
        const item = raw[i] || {};
        const t = ticker(item.ticker);
        const tf = timeframe(item.timeframe);
        if (!t || !tf || !item.status) return json({ ok: false, error: 'payload tidak lengkap', index: i }, 400);
        const internal = { ...item, ticker: t, timeframe: tf, received_at: receivedAt };
        writes.push({ key: `signal:${t}:${tf}`, value: internal });
      }

      await Promise.all(writes.map(w => env.SIGNALS.put(w.key, JSON.stringify(w.value))));
      return json({ ok: true, version: '2.1-public-safe', mode: batch ? 'batch' : 'single', count: writes.length });
    }

    return json({ ok: false, error: 'not found' }, 404);
  }
};
