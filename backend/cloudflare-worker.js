// Analisaku Signal API — Cloudflare Worker
// Version: 3.1-market-cleanup
// Required bindings: SIGNALS (KV), WEBHOOK_SECRET (secret)

const VERSION = '3.1-market-cleanup';
const MARKET_KEY = 'market:context:latest';
const HOT_DEBUG_KEY = 'market:hot-issues:debug';
const HOT_ISSUES_CRON = '15 */4 * * *';

const JISDOR_URL = 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor1';
const CENTCOM_URL = 'https://www.centcom.mil/MEDIA/PUBLIC-RELEASES/';
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

const OFFICIAL_FEEDS = [
  {
    id: 'FED_MONETARY',
    label: 'Federal Reserve',
    url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    weight: 1.6
  },
  {
    id: 'ECB_PRESS',
    label: 'European Central Bank',
    url: 'https://www.ecb.europa.eu/rss/press.html',
    weight: 1.4
  },
  {
    id: 'EIA_TODAY',
    label: 'U.S. EIA Today in Energy',
    url: 'https://www.eia.gov/rss/todayinenergy.xml',
    weight: 1.5
  },
  {
    id: 'EIA_PRESS',
    label: 'U.S. EIA Press Releases',
    url: 'https://www.eia.gov/rss/press_rss.xml',
    weight: 1.7
  },
  {
    id: 'US_DOW_NEWS',
    label: 'U.S. Defense News',
    url: 'https://www.war.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10',
    weight: 1.5
  }
];

const IDX_SECTOR_MAP = {
  IDXENERGY: 'ENERGY',
  IDXBASIC: 'BASIC MATERIALS',
  IDXINDUST: 'INDUSTRIALS',
  IDXNONCYC: 'CONSUMER NON-CYCLICALS',
  IDXCYCLIC: 'CONSUMER CYCLICALS',
  IDXHEALTH: 'HEALTHCARE',
  IDXFINANCE: 'FINANCIALS',
  IDXPROPERT: 'PROPERTY',
  IDXTECHNO: 'TECHNOLOGY',
  IDXINFRA: 'INFRASTRUCTURE',
  IDXTRANS: 'TRANSPORTATION'
};

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    // Hot Issues cron is every 4 hours at minute 15.
    if (event.cron === HOT_ISSUES_CRON) {
      ctx.waitUntil(syncHotIssues(env));
    } else {
      ctx.waitUntil(syncJisdor(env));
    }
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === 'GET' && url.pathname === '/') {
    return json({
      ok: true,
      service: 'analisaku-signal',
      version: VERSION,
      status: 'ready'
    });
  }

  // =========================================================
  // TECHNICAL ROUTES
  // =========================================================

  if (request.method === 'GET' && url.pathname === '/signal') {
    const ticker = normalizeTicker(url.searchParams.get('ticker'));
    const timeframe = normalizeTimeframe(url.searchParams.get('timeframe'));

    if (!ticker || !timeframe) {
      return json({ ok: false, error: 'ticker dan timeframe wajib diisi' }, 400);
    }

    const data = await env.SIGNALS.get(
      `signal:${ticker}:${timeframe}`,
      { type: 'json' }
    );

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

    if (!timeframe) {
      return json({ ok: false, error: 'timeframe tidak valid' }, 400);
    }

    const all = await readAllSignals(env, timeframe);
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

    if (!timeframe) {
      return json({ ok: false, error: 'timeframe tidak valid' }, 400);
    }

    const internal = await readAllSignals(env, timeframe);
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
      (max, s) => Math.max(max, publicTimestamp(s.updated_at)),
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
      const rawStatus = String(item.status || '').toUpperCase().trim();

      if (!ticker || !timeframe || !DECISIONS.includes(rawStatus)) {
        return json({
          ok: false,
          error: 'payload tidak lengkap / status tidak valid',
          index: i
        }, 400);
      }

      writes.push({
        key: `signal:${ticker}:${timeframe}`,
        value: sanitizeForStorage(item, ticker, timeframe, receivedAt)
      });
    }

    await Promise.all(
      writes.map(w => env.SIGNALS.put(w.key, JSON.stringify(w.value)))
    );

    return json({
      ok: true,
      version: VERSION,
      mode: isBatch ? 'batch' : 'single',
      count: writes.length
    });
  }

  // =========================================================
  // MARKET CONTEXT — PUBLIC
  // =========================================================

  if (request.method === 'GET' && url.pathname === '/market-context') {
    const current = await readMarketContext(env);

    if (!current) {
      return json({
        ok: true,
        updated_at: 0,
        market_pulse: null,
        sector_leadership: null,
        hot_issues: []
      });
    }

    const cleaned = cleanLegacyMarketFields(current);

    // Automatic one-time migration: old dummy fields disappear from KV.
    if (stableJson(cleaned) !== stableJson(current)) {
      await env.SIGNALS.put(MARKET_KEY, JSON.stringify(cleaned));
    }

    return json({ ok: true, ...cleaned });
  }

  // =========================================================
  // MARKET CONTEXT — ADMIN
  // =========================================================

  if (request.method === 'POST' && url.pathname === '/market-context/update') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'body harus JSON' }, 400);
    }

    const current = (await readMarketContext(env)) || emptyMarketContext();
    const merged = mergeMarketContext(current, payload);
    const cleaned = cleanLegacyMarketFields(merged);

    await env.SIGNALS.put(MARKET_KEY, JSON.stringify(cleaned));

    return json({
      ok: true,
      version: VERSION,
      updated_at: cleaned.updated_at,
      cleaned_fields: ['foreign_flow', 'global_sentiment', 'market_breadth', 'environment']
    });
  }

  // Deprecated route kept so old callers do not break.
  // It only performs cleanup and never writes Global Sentiment back.
  if (request.method === 'POST' && url.pathname === '/market-context/global-update') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const current = (await readMarketContext(env)) || emptyMarketContext();
    const cleaned = cleanLegacyMarketFields(current);
    await env.SIGNALS.put(MARKET_KEY, JSON.stringify(cleaned));

    return json({
      ok: true,
      deprecated: true,
      message: 'Global Sentiment sudah tidak digunakan.',
      updated_at: cleaned.updated_at
    });
  }

  if (request.method === 'POST' && url.pathname === '/market-context/jisdor-sync') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    try {
      const result = await syncJisdor(env);
      return json(result, result.ok ? 200 : 502);
    } catch (error) {
      return json({
        ok: false,
        error: cleanText(error?.message || error, 200)
      }, 502);
    }
  }

  if (request.method === 'POST' && url.pathname === '/market-context/hot-issues-sync') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    try {
      const result = await syncHotIssues(env);
      return json(result, result.ok ? 200 : 502);
    } catch (error) {
      return json({
        ok: false,
        error: cleanText(error?.message || error, 200)
      }, 502);
    }
  }

  if (request.method === 'GET' && url.pathname === '/market-context/hot-issues-debug') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const debug = await env.SIGNALS.get(HOT_DEBUG_KEY, { type: 'json' });
    return json({ ok: true, debug: debug || null });
  }

  if (request.method === 'POST' && url.pathname === '/market-context/sector-update') {
    if (!isAdmin(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'body harus JSON' }, 400);
    }

    const result = await updateSectorLeadership(env, payload);
    return json(result, result.ok ? 200 : 400);
  }

  // TradingView Sector Leadership webhook.
  if (request.method === 'POST' && url.pathname.startsWith('/sector-webhook/')) {
    const supplied = decodeURIComponent(
      url.pathname.slice('/sector-webhook/'.length)
    );

    if (!env.WEBHOOK_SECRET || supplied !== env.WEBHOOK_SECRET) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'body harus JSON' }, 400);
    }

    const result = await updateSectorLeadership(env, payload);
    return json(result, result.ok ? 200 : 400);
  }

  return json({ ok: false, error: 'not found' }, 404);
}

// =========================================================
// TECHNICAL HELPERS
// =========================================================

const DECISIONS = ['WAIT', 'WATCH', 'BUY SETUP', 'HOLD', 'TAKE PROFIT', 'EXIT'];

function normalizeTicker(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/^IDX:/, '')
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, 20);
}

function normalizeTimeframe(value) {
  const v = String(value || '').toUpperCase().trim();
  return ({
    D: '1D',
    '1D': '1D',
    '60': '60',
    '1H': '60',
    '240': '240',
    '4H': '240',
    W: '1W',
    '1W': '1W',
    M: '1M',
    '1M': '1M'
  })[v] || '';
}

function toBool(value) {
  return value === true ||
    String(value).toLowerCase() === 'true' ||
    String(value) === '1';
}

function toScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function publicEnum(value, allowed, fallback = '') {
  const v = String(value || '').toUpperCase().trim();
  return allowed.includes(v) ? v : fallback;
}

function publicTrend(value) {
  return publicEnum(value, ['BULLISH', 'NEUTRAL', 'BEARISH'], 'NEUTRAL');
}

function publicSetup(value) {
  return publicEnum(value, ['ACTIVE', 'INACTIVE'], 'INACTIVE');
}

function publicStage(value) {
  return publicEnum(value, ['EARLY WATCH', 'CONFIRMED', 'ACTIVE']);
}

function publicEntryStyle(value) {
  return publicEnum(value, ['BREAKOUT', 'PULLBACK', 'WEAKNESS']);
}

function publicDecision(value) {
  return publicEnum(value, DECISIONS, 'WAIT');
}

function publicRadar(value) {
  return publicEnum(value, ['AVOID', 'WATCH', 'READY', 'HOT', 'EXTENDED'], 'AVOID');
}

function publicPrice(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function publicTimestamp(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function gcState(value) {
  return publicEnum(value, ['FRESH', 'RECENT', 'ACTIVE'], 'OFF');
}

function gcCandleAge(value, state) {
  if (gcState(state) === 'OFF') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function publicSignal(s) {
  return {
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
  };
}

function publicGc(s) {
  return {
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
  };
}

function sanitizeForStorage(item, ticker, timeframe, receivedAt) {
  return {
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
  };
}

function byScore(a, b) {
  return toScore(b?.score) - toScore(a?.score) ||
    String(a?.ticker || '').localeCompare(String(b?.ticker || ''));
}

async function readAllSignals(env, timeframe) {
  let cursor;
  const keys = [];

  do {
    const page = await env.SIGNALS.list({
      prefix: 'signal:',
      limit: 1000,
      cursor
    });

    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const selected = keys.filter(k => k.endsWith(`:${timeframe}`));
  const values = await Promise.all(
    selected.map(k => env.SIGNALS.get(k, { type: 'json' }))
  );

  return values.filter(Boolean);
}

// =========================================================
// GENERIC HELPERS
// =========================================================

function cleanText(value, max = 160) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanDate(value) {
  const v = String(value || '').trim();
  if (!v) return '';

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const mm = String(slash[1]).padStart(2, '0');
    const dd = String(slash[2]).padStart(2, '0');
    return `${slash[3]}-${mm}-${dd}`;
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return '';
}

function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return Boolean(env.WEBHOOK_SECRET && supplied === env.WEBHOOK_SECRET);
}

function stableJson(value) {
  return JSON.stringify(value);
}

function contentChanged(a, b) {
  return stableJson(a) !== stableJson(b);
}

function cloneJson(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function emptyMarketContext() {
  return {
    updated_at: 0,
    market_pulse: {
      rupiah: null
    },
    sector_leadership: null,
    hot_issues: [],
    hot_issues_source: '',
    hot_issues_sources: []
  };
}

async function readMarketContext(env) {
  return env.SIGNALS.get(MARKET_KEY, { type: 'json' });
}

function sanitizeRupiah(data) {
  if (!data || typeof data !== 'object') return null;

  const status = publicEnum(
    data.status,
    ['STABLE', 'STRENGTHENING', 'WEAKENING'],
    'STABLE'
  );

  const value = cleanNumber(data.value);
  const change5d = cleanNumber(data.change_5d);
  const date = cleanDate(data.date);

  if (!Number.isFinite(value)) return null;

  return {
    status,
    value,
    change_5d: Number.isFinite(change5d) ? change5d : 0,
    date
  };
}

function sanitizeSectorRecord(item) {
  if (!item || typeof item !== 'object') return null;

  const sector = cleanText(item.sector, 50).toUpperCase();
  const change = cleanNumber(item.change);

  if (!sector || !Number.isFinite(change)) return null;
  return { sector, change: Math.round(change * 100) / 100 };
}

function sanitizeSectorLeadership(data) {
  if (!data || typeof data !== 'object') return null;

  const leaders = Array.isArray(data.leaders)
    ? data.leaders.map(sanitizeSectorRecord).filter(Boolean).slice(0, 3)
    : [];

  const weakest = sanitizeSectorRecord(data.weakest);

  if (!leaders.length && !weakest) return null;

  return {
    leaders,
    weakest,
    date: cleanDate(data.date),
    source: cleanText(data.source || 'IDX_SECTOR_INDICES', 60)
  };
}

function sanitizeHotIssue(item) {
  if (!item || typeof item !== 'object') return null;

  const category = publicEnum(
    item.category,
    ['MONETARY POLICY', 'GEOPOLITICS', 'ENERGY', 'GLOBAL TRADE', 'MACRO'],
    'MACRO'
  );

  const risk = publicEnum(
    item.risk,
    ['HIGH', 'ELEVATED', 'MODERATE'],
    'MODERATE'
  );

  const title = cleanText(item.title, 100);
  if (!title) return null;

  const out = { category, title, risk };

  if (item.detail) out.detail = cleanText(item.detail, 220);
  if (item.score !== undefined && Number.isFinite(Number(item.score))) {
    out.score = Math.round(Number(item.score) * 10) / 10;
  }

  return out;
}

function cleanLegacyMarketFields(input) {
  const data = cloneJson(input) || emptyMarketContext();
  const pulse = data.market_pulse || {};
  const rupiah = sanitizeRupiah(pulse.rupiah);

  // Market Pulse intentionally contains Rupiah only.
  // Removed permanently: foreign_flow, global_sentiment, market_breadth, environment.
  data.market_pulse = { rupiah };

  data.sector_leadership = sanitizeSectorLeadership(data.sector_leadership);
  data.hot_issues = Array.isArray(data.hot_issues)
    ? data.hot_issues.map(sanitizeHotIssue).filter(Boolean).slice(0, 3)
    : [];
  data.hot_issues_source = cleanText(data.hot_issues_source, 60);
  data.hot_issues_sources = Array.isArray(data.hot_issues_sources)
    ? [...new Set(data.hot_issues_sources.map(v => cleanText(v, 80)).filter(Boolean))].slice(0, 10)
    : [];

  data.updated_at = publicTimestamp(data.updated_at);
  data.rupiah_updated_at = publicTimestamp(data.rupiah_updated_at);
  data.sector_leadership_updated_at = publicTimestamp(data.sector_leadership_updated_at);
  data.hot_issues_updated_at = publicTimestamp(data.hot_issues_updated_at);

  return data;
}

function mergeMarketContext(current, payload) {
  const merged = cloneJson(current) || emptyMarketContext();

  if (payload?.market_pulse?.rupiah) {
    merged.market_pulse = merged.market_pulse || {};
    merged.market_pulse.rupiah = payload.market_pulse.rupiah;
  }

  if (payload?.sector_leadership) {
    merged.sector_leadership = payload.sector_leadership;
  }

  if (Array.isArray(payload?.hot_issues)) {
    merged.hot_issues = payload.hot_issues;
  }

  if (payload?.hot_issues_source !== undefined) {
    merged.hot_issues_source = payload.hot_issues_source;
  }

  if (Array.isArray(payload?.hot_issues_sources)) {
    merged.hot_issues_sources = payload.hot_issues_sources;
  }

  merged.updated_at = Date.now();
  return merged;
}

// =========================================================
// JISDOR
// =========================================================

async function fetchJisdorRows() {
  const response = await fetch(JISDOR_URL, {
    headers: {
      'User-Agent': 'Analisaku.com/1.0',
      'Accept': 'text/xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`BI JISDOR HTTP ${response.status}`);
  }

  const xml = await response.text();
  const blocks = xml.match(/<Table>[\s\S]*?<\/Table>/gi) || [];
  const rows = [];

  for (const block of blocks) {
    const currency = xmlTag(block, 'mts_subkursasing').toUpperCase();
    if (currency !== 'USD') continue;

    const dateRaw = xmlTag(block, 'tgl_subkursasing');
    const sellRaw = xmlTag(block, 'jual_subkursasing');
    const buyRaw = xmlTag(block, 'beli_subkursasing');
    const valueRaw = sellRaw || buyRaw;

    const date = cleanDate(dateRaw);
    const value = parseLooseNumber(valueRaw);

    if (date && Number.isFinite(value)) {
      rows.push({ date, value });
    }
  }

  const unique = new Map();
  for (const row of rows) {
    if (!unique.has(row.date)) unique.set(row.date, row);
  }

  return [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function syncJisdor(env) {
  const rows = await fetchJisdorRows();

  if (rows.length < 6) {
    throw new Error(`JISDOR data kurang: ${rows.length} baris`);
  }

  const latest = rows[0];
  const compare = rows[5];
  const change5d = ((latest.value / compare.value) - 1) * 100;
  const roundedChange = Math.round(change5d * 100) / 100;

  const status = roundedChange <= -0.5
    ? 'STRENGTHENING'
    : roundedChange >= 0.5
      ? 'WEAKENING'
      : 'STABLE';

  const current = cleanLegacyMarketFields(
    (await readMarketContext(env)) || emptyMarketContext()
  );

  const nextRupiah = {
    status,
    value: latest.value,
    change_5d: roundedChange,
    date: latest.date
  };

  const changed = contentChanged(current.market_pulse?.rupiah, nextRupiah);
  current.market_pulse = { rupiah: nextRupiah };
  current.rupiah_updated_at = Date.now();
  if (changed) current.updated_at = Date.now();

  await env.SIGNALS.put(MARKET_KEY, JSON.stringify(current));

  return {
    ok: true,
    changed,
    source: 'BANK_INDONESIA_JISDOR',
    rupiah: nextRupiah
  };
}

function xmlTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = String(block || '').match(re);
  return match ? decodeEntities(stripCdata(match[1])).trim() : '';
}

function parseLooseNumber(value) {
  let s = String(value || '').trim();
  if (!s) return NaN;

  s = s.replace(/\s/g, '');

  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// =========================================================
// SECTOR LEADERSHIP
// =========================================================

function sanitizeSectorPayload(payload) {
  const date = cleanDate(payload?.date);
  const raw = Array.isArray(payload?.sectors) ? payload.sectors : [];
  const sectors = [];
  const seen = new Set();

  for (const item of raw) {
    const code = String(item?.code || '').toUpperCase().trim();
    const sector = IDX_SECTOR_MAP[code];
    const change = Number(item?.change);

    if (!sector || !Number.isFinite(change) || seen.has(code)) continue;

    seen.add(code);
    sectors.push({
      code,
      sector,
      change: Math.round(change * 100) / 100
    });
  }

  return { date, sectors };
}

async function updateSectorLeadership(env, payload) {
  const parsed = sanitizeSectorPayload(payload);

  if (parsed.sectors.length < 8) {
    return {
      ok: false,
      error: 'SECTOR_COUNT',
      valid_count: parsed.sectors.length,
      minimum: 8
    };
  }

  const sorted = [...parsed.sectors].sort((a, b) => b.change - a.change);
  const leadership = {
    leaders: sorted.slice(0, 3).map(item => ({
      sector: item.sector,
      change: item.change
    })),
    weakest: {
      sector: sorted[sorted.length - 1].sector,
      change: sorted[sorted.length - 1].change
    },
    date: parsed.date || jakartaDate(),
    source: 'IDX_SECTOR_INDICES'
  };

  const current = cleanLegacyMarketFields(
    (await readMarketContext(env)) || emptyMarketContext()
  );

  const changed = contentChanged(current.sector_leadership, leadership);
  current.sector_leadership = leadership;
  current.sector_leadership_updated_at = Date.now();
  if (changed) current.updated_at = Date.now();

  await env.SIGNALS.put(MARKET_KEY, JSON.stringify(current));

  return {
    ok: true,
    changed,
    valid_count: parsed.sectors.length,
    sector_leadership: leadership
  };
}

// =========================================================
// HOT ISSUES
// =========================================================

async function syncHotIssues(env) {
  const startedAt = Date.now();
  const officialArticles = [];
  const sourceStatus = [];

  const feedResults = await Promise.allSettled(
    OFFICIAL_FEEDS.map(feed => fetchOfficialFeed(feed))
  );

  for (let i = 0; i < feedResults.length; i++) {
    const feed = OFFICIAL_FEEDS[i];
    const result = feedResults[i];

    if (result.status === 'fulfilled') {
      officialArticles.push(...result.value);
      sourceStatus.push({
        id: feed.id,
        label: feed.label,
        ok: true,
        count: result.value.length
      });
    } else {
      sourceStatus.push({
        id: feed.id,
        label: feed.label,
        ok: false,
        error: cleanText(result.reason?.message || result.reason, 160)
      });
    }
  }

  try {
    const centcom = await fetchCentcom();
    officialArticles.push(...centcom);
    sourceStatus.push({
      id: 'CENTCOM_PUBLIC',
      label: 'U.S. Central Command',
      ok: true,
      count: centcom.length
    });
  } catch (error) {
    sourceStatus.push({
      id: 'CENTCOM_PUBLIC',
      label: 'U.S. Central Command',
      ok: false,
      error: cleanText(error?.message || error, 160)
    });
  }

  let candidates = buildHotIssueCandidates(officialArticles);
  const officialClusters = new Set(candidates.map(item => item.category));
  const needGdelt = officialClusters.size < 2 || !officialClusters.has('GEOPOLITICS');
  let gdeltStatus = 'NOT_NEEDED';
  let gdeltArticles = [];

  if (needGdelt) {
    try {
      gdeltArticles = await fetchGdeltArticles();
      gdeltStatus = 'SUCCESS';
      candidates = buildHotIssueCandidates([...officialArticles, ...gdeltArticles]);
    } catch (error) {
      gdeltStatus = String(error?.message || '').includes('429')
        ? 'RATE_LIMITED'
        : 'FAILED';
    }
  }

  const selected = selectHotIssues(candidates);
  const mode = gdeltArticles.length ? 'OFFICIAL_PLUS_GDELT' : 'OFFICIAL_ONLY';

  const current = cleanLegacyMarketFields(
    (await readMarketContext(env)) || emptyMarketContext()
  );

  const usableSources = [...new Set(
    selected.flatMap(issue => issue.sources || [])
  )];

  const publicIssues = selected.map(issue => ({
    category: issue.category,
    title: issue.title,
    risk: issue.risk
  }));

  const changed = contentChanged(current.hot_issues, publicIssues) ||
    current.hot_issues_source !== mode ||
    contentChanged(current.hot_issues_sources, usableSources);

  current.hot_issues = publicIssues;
  current.hot_issues_source = mode;
  current.hot_issues_sources = usableSources;
  current.hot_issues_updated_at = Date.now();
  if (changed) current.updated_at = Date.now();

  await env.SIGNALS.put(MARKET_KEY, JSON.stringify(current));

  const debug = {
    ok: selected.length > 0,
    changed,
    stale: false,
    fallback: gdeltArticles.length > 0,
    mode,
    source: mode,
    official_article_pool: officialArticles.length,
    official_sources_ok: sourceStatus.filter(s => s.ok).length,
    official_sources_total: sourceStatus.length,
    gdelt_status: gdeltStatus,
    gdelt_article_pool: gdeltArticles.length,
    selected: selected.map(issue => ({
      category: issue.category,
      title: issue.title,
      risk: issue.risk,
      score: Math.round(issue.score * 10) / 10,
      sources: issue.sources
    })),
    sources: sourceStatus,
    started_at: startedAt,
    completed_at: Date.now()
  };

  await env.SIGNALS.put(
    HOT_DEBUG_KEY,
    JSON.stringify(debug),
    { expirationTtl: 86400 }
  );

  return debug;
}

async function fetchOfficialFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      'User-Agent': 'Analisaku.com/1.0',
      'Accept': 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`${feed.id} HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseFeed(xml).slice(0, 15).map(item => ({
    ...item,
    sourceId: feed.id,
    source: feed.label,
    sourceWeight: feed.weight,
    official: true
  }));
}

function parseFeed(xml) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const entryBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks.map(block => {
    const title = extractXmlValue(block, ['title']);
    const description = extractXmlValue(block, ['description', 'summary', 'content']);
    const published = extractXmlValue(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const link = extractLink(block);

    return {
      title: cleanText(decodeEntities(stripTags(title)), 220),
      description: cleanText(decodeEntities(stripTags(description)), 500),
      link: cleanText(link, 500),
      publishedAt: parseDateSafe(published)
    };
  }).filter(item => item.title);
}

function extractXmlValue(block, tags) {
  for (const tag of tags) {
    const escaped = tag.replace(':', '\\:');
    const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const match = block.match(re);
    if (match) return stripCdata(match[1]);
  }
  return '';
}

function extractLink(block) {
  const simple = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (simple) return decodeEntities(stripCdata(simple[1])).trim();

  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?\s*>/i);
  return href ? decodeEntities(href[1]).trim() : '';
}

async function fetchCentcom() {
  const response = await fetch(CENTCOM_URL, {
    headers: {
      'User-Agent': 'Analisaku.com/1.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`CENTCOM HTTP ${response.status}`);
  }

  const html = await response.text();
  const anchors = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const articles = [];
  const seen = new Set();

  for (const match of anchors) {
    const title = cleanText(decodeEntities(stripTags(match[2])), 220);
    const href = match[1];

    if (!title || title.length < 18) continue;
    if (!/(release|statement|strike|attack|iran|israel|syria|iraq|yemen|houthi|red sea|hormuz|military|operation)/i.test(title + ' ' + href)) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    articles.push({
      title,
      description: '',
      link: absolutizeUrl(href, CENTCOM_URL),
      publishedAt: null,
      sourceId: 'CENTCOM_PUBLIC',
      source: 'U.S. Central Command',
      sourceWeight: 1.8,
      official: true
    });

    if (articles.length >= 10) break;
  }

  return articles;
}

async function fetchGdeltArticles() {
  const query = [
    '"Strait of Hormuz"',
    'Iran Israel',
    'Middle East oil',
    'global tariffs trade',
    'Federal Reserve rates'
  ].join(' OR ');

  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    maxrecords: '25',
    format: 'json',
    sort: 'HybridRel'
  });

  const response = await fetch(`${GDELT_URL}?${params.toString()}`, {
    headers: {
      'User-Agent': 'Analisaku.com/1.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`GDELT HTTP ${response.status}`);
  }

  const data = await response.json();
  const list = Array.isArray(data?.articles) ? data.articles : [];

  return list.map(item => ({
    title: cleanText(item?.title, 220),
    description: cleanText(item?.seendate || '', 100),
    link: cleanText(item?.url, 500),
    publishedAt: parseDateSafe(item?.seendate),
    sourceId: 'GDELT',
    source: cleanText(item?.domain || 'GDELT', 80),
    sourceWeight: 0.9,
    official: false
  })).filter(item => item.title);
}

function buildHotIssueCandidates(articles) {
  const grouped = new Map();
  const now = Date.now();

  for (const article of articles) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    const category = classifyHotIssue(text);
    if (!category) continue;

    const score = scoreHotArticle(article, text, category, now);
    if (score <= 0) continue;

    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({ ...article, category, articleScore: score });
  }

  const candidates = [];

  for (const [category, items] of grouped.entries()) {
    items.sort((a, b) => b.articleScore - a.articleScore);
    const top = items.slice(0, 4);
    const sources = [...new Set(top.map(item => item.source).filter(Boolean))];
    const sourceIds = [...new Set(top.map(item => item.sourceId).filter(Boolean))];
    const crossSource = sourceIds.length >= 2;
    const severe = top.some(item => severeKeyword(`${item.title} ${item.description}`));
    const impact = top.some(item => marketImpactKeyword(`${item.title} ${item.description}`));

    let total = 0;
    top.forEach((item, index) => {
      const diminish = index === 0 ? 1 : index === 1 ? 0.65 : index === 2 ? 0.4 : 0.25;
      total += item.articleScore * diminish;
    });

    if (crossSource) total += 2.5;

    const risk =
      (crossSource && severe && total >= 11) || (severe && impact && total >= 14)
        ? 'HIGH'
        : crossSource || (severe && impact && total >= 8)
          ? 'ELEVATED'
          : total >= 8
            ? 'MODERATE'
            : 'MODERATE';

    candidates.push({
      category,
      title: issueTitle(category, top),
      risk,
      score: total,
      sources,
      crossSource,
      severe,
      impact
    });
  }

  return candidates;
}

function classifyHotIssue(text) {
  if (/(strait of hormuz|iran|israel|gaza|middle east|houthi|red sea|centcom|military|missile|strike|attack|war|conflict)/i.test(text)) {
    return 'GEOPOLITICS';
  }

  if (/(oil|crude|petroleum|natural gas|lng|energy|opec|eia)/i.test(text)) {
    return 'ENERGY';
  }

  if (/(tariff|trade war|trade policy|import duty|export ban|global trade|sanction)/i.test(text)) {
    return 'GLOBAL TRADE';
  }

  if (/(federal reserve|fed\b|ecb|interest rate|rate cut|rate hike|monetary policy|inflation|cpi|pce)/i.test(text)) {
    return 'MONETARY POLICY';
  }

  if (/(recession|gdp|unemployment|economic growth|global economy)/i.test(text)) {
    return 'MACRO';
  }

  return null;
}

function scoreHotArticle(article, text, category, now) {
  const baseImpact = {
    GEOPOLITICS: 4.0,
    ENERGY: 3.6,
    'GLOBAL TRADE': 3.4,
    'MONETARY POLICY': 3.2,
    MACRO: 2.5
  }[category] || 2;

  let score = baseImpact * Number(article.sourceWeight || 1);

  const ts = article.publishedAt instanceof Date && !Number.isNaN(article.publishedAt.getTime())
    ? article.publishedAt.getTime()
    : 0;

  if (ts) {
    const ageHours = Math.max(0, (now - ts) / 3600000);
    if (ageHours <= 24) score += 2.5;
    else if (ageHours <= 72) score += 1.5;
    else if (ageHours <= 168) score += 0.6;
  }

  if (severeKeyword(text)) score += 2.5;
  if (marketImpactKeyword(text)) score += 1.5;
  if (article.official) score += 0.8;

  if (
    (category === 'GEOPOLITICS' && ['CENTCOM_PUBLIC', 'US_DOW_NEWS'].includes(article.sourceId)) ||
    (category === 'ENERGY' && ['EIA_TODAY', 'EIA_PRESS'].includes(article.sourceId)) ||
    (category === 'MONETARY POLICY' && ['FED_MONETARY', 'ECB_PRESS'].includes(article.sourceId))
  ) {
    score += 1.1;
  }

  return score;
}

function severeKeyword(text) {
  return /(attack|strike|war|missile|drone|closure|closed|blockade|escalat|emergency|sanction|embargo|surge|shock|crisis)/i.test(text);
}

function marketImpactKeyword(text) {
  return /(oil|crude|energy|inflation|interest rate|rate cut|rate hike|tariff|trade|shipping|strait|currency|dollar|growth|recession|supply)/i.test(text);
}

function issueTitle(category, topItems) {
  const text = topItems.map(item => `${item.title} ${item.description}`).join(' ').toLowerCase();

  if (category === 'GEOPOLITICS') {
    if (/hormuz/.test(text)) return 'Strait of Hormuz / Middle East';
    if (/red sea|houthi/.test(text)) return 'Red Sea / Middle East';
    return 'Middle East / geopolitics';
  }

  if (category === 'ENERGY') return 'Oil / global energy';
  if (category === 'GLOBAL TRADE') return 'Tariffs / global trade';

  if (category === 'MONETARY POLICY') {
    if (/ecb|european central bank/.test(text) && !/federal reserve|\bfed\b/.test(text)) {
      return 'ECB rate outlook';
    }
    if (/federal reserve|\bfed\b/.test(text)) return 'Fed rate outlook';
    return 'Global rate outlook';
  }

  return 'Global macro outlook';
}

function selectHotIssues(candidates) {
  return [...candidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// =========================================================
// SMALL PARSING HELPERS
// =========================================================

function stripCdata(value) {
  return String(value || '')
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '');
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function parseDateSafe(value) {
  if (!value) return null;

  const raw = String(value).trim();
  let date;

  if (/^\d{14}$/.test(raw)) {
    date = new Date(
      `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`
    );
  } else {
    date = new Date(raw);
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function absolutizeUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return cleanText(href, 500);
  }
}

function jakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
