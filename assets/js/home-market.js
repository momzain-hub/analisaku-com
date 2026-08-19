// Analisaku Signal API — Cloudflare Worker v2.9
// Features:
// - Technical signal API + TradingView webhook
// - Market Context API
// - Automatic BI JISDOR sync
// - Global Sentiment + Hot Issues / Risk Overlay
// - GDELT-powered Hot Issue Engine
//
// Required bindings:
// SIGNALS (KV)
// WEBHOOK_SECRET (secret)

const JISDOR_URL =
  'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor1';

const GDELT_DOC_URL =
  'https://api.gdeltproject.org/api/v2/doc/doc';

const GDELT_HOME =
  'https://www.gdeltproject.org/';

const HOT_ISSUES_CRON =
  '15 */4 * * *';


/* =========================================================
   GENERIC
   ========================================================= */

function round2(value) {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}


function safeTimestamp(value) {
  const n = Number(value);

  return (
    Number.isFinite(n) &&
    n > 0
  )
    ? Math.floor(n)
    : 0;
}


/* =========================================================
   JISDOR
   ========================================================= */

function xmlValue(block, tag) {

  const match = block.match(
    new RegExp(
      `<${tag}>([\\s\\S]*?)<\\/${tag}>`,
      'i'
    )
  );

  return match
    ? String(match[1] || '').trim()
    : '';
}


function parseJisdorXml(xml) {

  const rows = [];

  const tableRegex =
    /<Table\b[^>]*>([\s\S]*?)<\/Table>/gi;

  let match;


  while (
    (match = tableRegex.exec(xml)) !== null
  ) {

    const block =
      match[1];


    const currency =
      xmlValue(
        block,
        'mts_subkursasing'
      ).toUpperCase();


    if (currency !== 'USD') {
      continue;
    }


    const rawValue =
      xmlValue(
        block,
        'jual_subkursasing'
      ) ||
      xmlValue(
        block,
        'beli_subkursasing'
      );


    const rawDate =
      xmlValue(
        block,
        'tgl_subkursasing'
      );


    const value =
      Number(rawValue);


    const dateMatch =
      rawDate.match(
        /^(\d{4}-\d{2}-\d{2})/
      );


    const date =
      dateMatch
        ? dateMatch[1]
        : '';


    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      !date
    ) {
      continue;
    }


    rows.push({
      currency,
      value,
      date
    });
  }


  const unique =
    new Map();


  for (const row of rows) {

    if (!unique.has(row.date)) {

      unique.set(
        row.date,
        row
      );
    }
  }


  return [
    ...unique.values()
  ].sort(
    (a, b) =>
      b.date.localeCompare(a.date)
  );
}


function jisdorStatus(change5d) {

  if (change5d <= -0.5) {
    return 'STRENGTHENING';
  }

  if (change5d >= 0.5) {
    return 'WEAKENING';
  }

  return 'STABLE';
}


async function syncJisdor(env) {

  if (!env?.SIGNALS) {

    throw new Error(
      'SIGNALS KV binding tidak tersedia'
    );
  }


  const response =
    await fetch(
      JISDOR_URL,
      {
        method: 'GET',

        headers: {
          Accept:
            'application/xml,text/xml,*/*'
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `BI JISDOR HTTP ${response.status}`
    );
  }


  const xml =
    await response.text();


  const rows =
    parseJisdorXml(xml);


  if (rows.length < 6) {

    throw new Error(
      `Data JISDOR tidak cukup untuk 5D: ${rows.length} record`
    );
  }


  const latest =
    rows[0];


  const reference5d =
    rows[5];


  const change5d =
    round2(
      (
        (
          latest.value /
          reference5d.value
        ) - 1
      ) * 100
    );


  const rupiah = {

    status:
      jisdorStatus(change5d),

    value:
      latest.value,

    change_5d:
      change5d,

    date:
      latest.date
  };


  const current =
    await env.SIGNALS.get(
      'market:context:latest',
      {
        type: 'json'
      }
    );


  if (
    !current ||
    typeof current !== 'object'
  ) {

    throw new Error(
      'market:context:latest belum tersedia'
    );
  }


  const previous =
    current
      ?.market_pulse
      ?.rupiah || {};


  const unchanged =
    String(
      previous.status || ''
    ) === rupiah.status &&

    Number(
      previous.value
    ) === rupiah.value &&

    Number(
      previous.change_5d
    ) === rupiah.change_5d &&

    String(
      previous.date || ''
    ) === rupiah.date;


  if (unchanged) {

    return {

      ok: true,

      changed: false,

      source:
        'BANK_INDONESIA_JISDOR',

      latest:
        rupiah,

      reference_5d:
        reference5d
    };
  }


  current.market_pulse =
    current.market_pulse || {};


  current.market_pulse.rupiah =
    rupiah;


  current.updated_at =
    Date.now();


  current.jisdor_updated_at =
    current.updated_at;


  await env.SIGNALS.put(
    'market:context:latest',

    JSON.stringify(
      current
    )
  );


  return {

    ok: true,

    changed: true,

    source:
      'BANK_INDONESIA_JISDOR',

    updated_at:
      current.updated_at,

    latest:
      rupiah,

    reference_5d:
      reference5d
  };
}


/* =========================================================
   GDELT HOT ISSUE ENGINE
   ========================================================= */

const ISSUE_FAMILIES = [

  {
    id:
      'MIDDLE_EAST',

    category:
      'GEOPOLITICS',

    title:
      'Middle East tensions',

    terms: [
      'iran',
      'israel',
      'gaza',
      'lebanon',
      'hezbollah',
      'houthi',
      'yemen',
      'syria',
      'hormuz',
      'red sea',
      'middle east'
    ],

    severe: [
      'strike',
      'strikes',
      'attack',
      'attacks',
      'missile',
      'missiles',
      'drone',
      'drones',
      'war',
      'escalation',
      'blockade',
      'closure',
      'closed',
      'killed',
      'explosion'
    ]
  },


  {
    id:
      'RUSSIA_UKRAINE',

    category:
      'GEOPOLITICS',

    title:
      'Russia-Ukraine',

    terms: [
      'ukraine',
      'ukrainian',
      'russia',
      'russian',
      'kyiv',
      'moscow',
      'zelensky',
      'putin'
    ],

    severe: [
      'strike',
      'strikes',
      'attack',
      'attacks',
      'missile',
      'missiles',
      'drone',
      'drones',
      'war',
      'invasion',
      'escalation',
      'sanctions',
      'killed'
    ]
  },


  {
    id:
      'US_MONETARY',

    category:
      'MONETARY POLICY',

    title:
      'Fed rate outlook',

    terms: [
      'federal reserve',
      'fed',
      'powell',
      'interest rate',
      'interest rates',
      'rate cut',
      'rate cuts',
      'rate hike',
      'rate hikes',
      'us inflation',
      'u.s. inflation',
      'cpi'
    ],

    severe: [
      'surprise',
      'shock',
      'hotter',
      'higher inflation',
      'hawkish',
      'emergency',
      'recession'
    ]
  },


  {
    id:
      'ENERGY',

    category:
      'ENERGY',

    title:
      'Oil / global energy',

    terms: [
      'oil',
      'crude',
      'opec',
      'brent',
      'wti',
      'natural gas',
      'lng'
    ],

    severe: [
      'surge',
      'spike',
      'soar',
      'shortage',
      'disruption',
      'halt',
      'blocked',
      'closure',
      'sanctions',
      'war'
    ]
  },


  {
    id:
      'TRADE_SANCTIONS',

    category:
      'GLOBAL TRADE',

    title:
      'Tariffs / global trade',

    terms: [
      'tariff',
      'tariffs',
      'trade war',
      'sanction',
      'sanctions',
      'export control',
      'export controls',
      'trade restriction',
      'trade restrictions'
    ],

    severe: [
      'new tariffs',
      'retaliation',
      'ban',
      'bans',
      'escalation',
      'expanded sanctions',
      'embargo'
    ]
  },


  {
    id:
      'CHINA',

    category:
      'CHINA / ASIA',

    title:
      'China growth / policy',

    terms: [
      'china',
      'chinese',
      'pboc',
      'yuan',
      'renminbi',
      'china property',
      'chinese property'
    ],

    severe: [
      'slowdown',
      'deflation',
      'default',
      'crisis',
      'stimulus',
      'devaluation',
      'tariff',
      'tariffs'
    ]
  },


  {
    id:
      'GLOBAL_GROWTH',

    category:
      'GLOBAL ECONOMY',

    title:
      'Global growth concerns',

    terms: [
      'global growth',
      'global economy',
      'recession',
      'imf',
      'world bank'
    ],

    severe: [
      'downgrade',
      'contraction',
      'recession',
      'crisis',
      'slowdown'
    ]
  },


  {
    id:
      'ASIA_SECURITY',

    category:
      'GEOPOLITICS',

    title:
      'Asia security tensions',

    terms: [
      'taiwan',
      'taiwan strait',
      'north korea',
      'south china sea'
    ],

    severe: [
      'missile',
      'missiles',
      'military drill',
      'military drills',
      'attack',
      'war',
      'blockade',
      'incursion'
    ]
  }
];


const GDELT_QUERY = [

  'Iran',
  'Israel',
  'Gaza',
  'Lebanon',
  'Hormuz',
  '"Red Sea"',

  'Ukraine',
  'Russia',

  '"Federal Reserve"',
  '"interest rates"',

  '"oil prices"',
  'OPEC',

  'tariffs',
  'sanctions',

  'China',

  'recession',

  'Taiwan',
  '"North Korea"'

].join(' OR ');


function normalizeTitle(value) {

  return String(value || '')

    .replace(
      /&amp;/gi,
      '&'
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /<[^>]*>/g,
      ' '
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


function gdeltArticles(payload) {

  if (
    Array.isArray(
      payload?.articles
    )
  ) {
    return payload.articles;
  }


  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }


  if (
    Array.isArray(payload)
  ) {
    return payload;
  }


  return [];
}


function articleSeenAt(article) {

  const raw =
    String(
      article?.seendate ||
      article?.date_published ||
      article?.date_modified ||
      article?.pubdate ||
      ''
    ).trim();


  if (!raw) {
    return 0;
  }


  const compact =
    raw.match(
      /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?Z?$/
    );


  if (compact) {

    const [
      ,
      y,
      m,
      d,
      hh,
      mm,
      ss = '00'
    ] = compact;


    const ts =
      Date.parse(
        `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`
      );


    return Number.isFinite(ts)
      ? ts
      : 0;
  }


  const ts =
    Date.parse(raw);


  return Number.isFinite(ts)
    ? ts
    : 0;
}


function containsTerm(
  text,
  term
) {

  return text.includes(term);
}


function issueSpecificTitle(
  issueId,
  matchedText
) {

  const text =
    matchedText.toLowerCase();


  if (
    issueId ===
    'MIDDLE_EAST'
  ) {

    if (
      text.includes(
        'hormuz'
      )
    ) {
      return (
        'Strait of Hormuz / Middle East'
      );
    }


    if (
      text.includes('iran') &&
      text.includes('israel')
    ) {
      return (
        'Iran-Israel / Middle East'
      );
    }


    if (
      text.includes('red sea') ||
      text.includes('houthi')
    ) {
      return (
        'Red Sea / Houthi tensions'
      );
    }


    if (
      text.includes('israel') &&
      text.includes('gaza')
    ) {
      return (
        'Israel-Gaza / Middle East'
      );
    }


    return (
      'Middle East tensions'
    );
  }


  if (
    issueId ===
    'RUSSIA_UKRAINE'
  ) {
    return 'Russia-Ukraine';
  }


  if (
    issueId ===
    'US_MONETARY'
  ) {
    return 'Fed rate outlook';
  }


  if (
    issueId ===
    'ENERGY'
  ) {
    return 'Oil / global energy';
  }


  if (
    issueId ===
    'TRADE_SANCTIONS'
  ) {
    return 'Tariffs / global trade';
  }


  if (
    issueId ===
    'CHINA'
  ) {
    return 'China growth / policy';
  }


  if (
    issueId ===
    'GLOBAL_GROWTH'
  ) {
    return 'Global growth concerns';
  }


  if (
    issueId ===
    'ASIA_SECURITY'
  ) {

    if (
      text.includes('taiwan')
    ) {
      return (
        'Taiwan Strait tensions'
      );
    }


    if (
      text.includes(
        'north korea'
      )
    ) {
      return (
        'North Korea security risk'
      );
    }


    return (
      'Asia security tensions'
    );
  }


  return 'Global risk issue';
}


function issueRisk(
  score,
  articles,
  severeHits,
  domains
) {

  if (
    score >= 30 ||
    (
      articles >= 10 &&
      severeHits >= 6 &&
      domains >= 5
    )
  ) {
    return 'HIGH';
  }


  if (
    score >= 18 ||
    (
      articles >= 7 &&
      severeHits >= 3
    )
  ) {
    return 'ELEVATED';
  }


  if (
    score >= 8 ||
    articles >= 4
  ) {
    return 'MODERATE';
  }


  return 'LOW';
}


function classifyHotIssues(
  articles
) {

  const now =
    Date.now();


  const buckets =
    ISSUE_FAMILIES.map(
      family => ({

        ...family,

        article_count:
          0,

        severe_hits:
          0,

        recent_hits:
          0,

        domains:
          new Set(),

        matched_text:
          [],

        score:
          0
      })
    );


  for (
    const article
    of articles
  ) {

    const title =
      normalizeTitle(
        article?.title ||
        article?.name ||
        ''
      );


    if (!title) {
      continue;
    }


    const titleLower =
      title.toLowerCase();


    const domain =
      String(
        article?.domain || ''
      )
        .toLowerCase()
        .trim();


    const seenAt =
      articleSeenAt(
        article
      );


    const ageHours =
      seenAt > 0
        ? Math.max(
            0,
            (
              now -
              seenAt
            ) / 3600000
          )
        : 99;


    for (
      const bucket
      of buckets
    ) {

      const matched =
        bucket
          .terms
          .some(
            term =>
              containsTerm(
                titleLower,
                term
              )
          );


      if (!matched) {
        continue;
      }


      bucket.article_count +=
        1;


      if (domain) {

        bucket
          .domains
          .add(
            domain
          );
      }


      if (
        bucket
          .matched_text
          .length < 12
      ) {

        bucket
          .matched_text
          .push(
            titleLower
          );
      }


      let articleScore =
        2;


      if (
        ageHours <= 6
      ) {

        articleScore +=
          2;

        bucket.recent_hits +=
          1;

      } else if (
        ageHours <= 12
      ) {

        articleScore +=
          1;

        bucket.recent_hits +=
          1;
      }


      const severe =
        bucket
          .severe
          .some(
            term =>
              containsTerm(
                titleLower,
                term
              )
          );


      if (severe) {

        articleScore +=
          2;

        bucket.severe_hits +=
          1;
      }


      bucket.score +=
        articleScore;
    }
  }


  const ranked =
    buckets

      .map(
        bucket => {

          const domainCount =
            bucket.domains.size;


          const diversityBoost =
            Math.min(
              6,
              domainCount * 0.75
            );


          const finalScore =
            round2(
              bucket.score +
              diversityBoost
            );


          const combinedText =
            bucket
              .matched_text
              .join(' | ');


          return {

            id:
              bucket.id,

            category:
              bucket.category,

            title:
              issueSpecificTitle(
                bucket.id,
                combinedText
              ),

            risk:
              issueRisk(
                finalScore,
                bucket.article_count,
                bucket.severe_hits,
                domainCount
              ),

            score:
              finalScore,

            articles:
              bucket.article_count,

            severe_hits:
              bucket.severe_hits,

            recent_hits:
              bucket.recent_hits,

            domains:
              domainCount
          };
        }
      )


      .filter(
        item =>
          item.articles >= 2 &&
          item.score >= 5
      )


      .sort(
        (a, b) =>
          b.score -
          a.score ||

          b.articles -
          a.articles
      );


  /*
    Hindari kartu dampak yang
    terlalu duplikatif.

    Jika Middle East sudah dominan,
    ENERGY tidak otomatis mengambil
    slot tambahan kecuali tekanan
    energi memang cukup besar.
  */

  const selected =
    [];


  for (
    const item
    of ranked
  ) {

    const middleEast =
      selected.find(
        x =>
          x.id ===
          'MIDDLE_EAST'
      );


    if (
      item.id ===
        'ENERGY' &&

      middleEast &&

      [
        'HIGH',
        'ELEVATED'
      ].includes(
        middleEast.risk
      ) &&

      item.score <
        middleEast.score *
        0.9
    ) {
      continue;
    }


    selected.push(
      item
    );


    if (
      selected.length === 3
    ) {
      break;
    }
  }


  return selected;
}


function sameHotIssues(
  a,
  b
) {

  const clean =
    value =>
      (
        Array.isArray(value)
          ? value
          : []
      ).map(
        item => ({

          category:
            String(
              item?.category ||
              ''
            ),

          title:
            String(
              item?.title ||
              ''
            ),

          risk:
            String(
              item?.risk ||
              ''
            )
        })
      );


  return (
    JSON.stringify(
      clean(a)
    ) ===
    JSON.stringify(
      clean(b)
    )
  );
}


async function fetchGdeltArticles() {

  const params =
    new URLSearchParams({

      query:
        `(${GDELT_QUERY}) sourcelang:english`,

      mode:
        'artlist',

      maxrecords:
        '150',

      timespan:
        '24h',

      sort:
        'datedesc',

      format:
        'json'
    });


  const response =
    await fetch(
      `${GDELT_DOC_URL}?${params.toString()}`,
      {
        method: 'GET',

        headers: {
          Accept:
            'application/json,text/plain,*/*'
        }
      }
    );


  if (
    response.status === 429
  ) {

    throw new Error(
      'GDELT rate limited (HTTP 429)'
    );
  }


  if (!response.ok) {

    throw new Error(
      `GDELT HTTP ${response.status}`
    );
  }


  const text =
    await response.text();


  let payload;


  try {

    payload =
      JSON.parse(text);

  } catch {

    throw new Error(
      'GDELT response bukan JSON valid'
    );
  }


  const articles =
    gdeltArticles(
      payload
    );


  if (!articles.length) {

    throw new Error(
      'GDELT tidak mengembalikan artikel'
    );
  }


  return articles;
}


async function syncHotIssues(
  env
) {

  if (!env?.SIGNALS) {

    throw new Error(
      'SIGNALS KV binding tidak tersedia'
    );
  }


  const current =
    await env.SIGNALS.get(
      'market:context:latest',
      {
        type: 'json'
      }
    );


  if (
    !current ||
    typeof current !== 'object'
  ) {

    throw new Error(
      'market:context:latest belum tersedia'
    );
  }


  const articles =
    await fetchGdeltArticles();


  const ranked =
    classifyHotIssues(
      articles
    );


  const hotIssues =
    ranked.map(
      item => ({

        category:
          item.category,

        title:
          item.title,

        risk:
          item.risk
      })
    );


  const now =
    Date.now();


  const unchanged =
    sameHotIssues(
      current.hot_issues,
      hotIssues
    );


  current.hot_issues =
    hotIssues;


  current.hot_issues_source =
    'GDELT_PROJECT';


  current.hot_issues_source_url =
    GDELT_HOME;


  current.hot_issues_updated_at =
    now;


  if (!unchanged) {

    current.updated_at =
      now;
  }


  await env.SIGNALS.put(
    'market:context:latest',

    JSON.stringify(
      current
    )
  );


  const debug = {

    source:
      'GDELT_PROJECT',

    fetched_at:
      now,

    article_pool:
      articles.length,

    top:
      ranked
  };


  await env.SIGNALS.put(
    'market:hot-issues:debug',

    JSON.stringify(
      debug
    ),

    {
      expirationTtl:
        86400
    }
  );


  return {

    ok:
      true,

    changed:
      !unchanged,

    source:
      'GDELT_PROJECT',

    attribution:
      'GDELT Project',

    updated_at:
      now,

    article_pool:
      articles.length,

    hot_issues:
      hotIssues,

    diagnostics:
      ranked.map(
        ({
          id,
          score,
          articles,
          severe_hits,
          recent_hits,
          domains
        }) => ({

          id,
          score,
          articles,
          severe_hits,
          recent_hits,
          domains
        })
      )
  };
}


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    const headers = {

      'Access-Control-Allow-Origin':
        '*',

      'Access-Control-Allow-Methods':
        'GET,POST,OPTIONS',

      'Access-Control-Allow-Headers':
        'Content-Type, Authorization',

      'Content-Type':
        'application/json; charset=utf-8',

      'Cache-Control':
        'no-store',

      'X-Content-Type-Options':
        'nosniff'
    };


    const json =
      (
        body,
        status = 200
      ) =>
        new Response(
          JSON.stringify(
            body
          ),
          {
            status,
            headers
          }
        );


    const authorize =
      () => {

        const auth =
          request
            .headers
            .get(
              'Authorization'
            ) || '';


        const supplied =
          auth.startsWith(
            'Bearer '
          )
            ? auth
                .slice(7)
                .trim()
            : '';


        return (
          Boolean(
            env.WEBHOOK_SECRET
          ) &&

          supplied ===
            env.WEBHOOK_SECRET
        );
      };


    /* =====================================================
       HELPERS
       ===================================================== */

    const normalizeTicker =
      value =>
        String(value || '')

          .toUpperCase()

          .replace(
            /^IDX:/,
            ''
          )

          .replace(
            /[^A-Z0-9._-]/g,
            ''
          )

          .slice(
            0,
            20
          );


    const normalizeTimeframe =
      value => {

        const v =
          String(value || '')
            .toUpperCase()
            .trim();


        return ({

          D:
            '1D',

          '1D':
            '1D',

          W:
            '1W',

          '1W':
            '1W',

          M:
            '1M',

          '1M':
            '1M'

        })[v] || '';
      };


    const toBool =
      value =>
        value === true ||
        String(value)
          .toLowerCase() ===
          'true' ||
        String(value) ===
          '1';


    const toScore =
      value => {

        const n =
          Number(value);

        return Number.isFinite(n)
          ? n
          : 0;
      };


    const publicEnum =
      (
        value,
        allowed,
        fallback = ''
      ) => {

        const v =
          String(value || '')
            .toUpperCase()
            .trim();


        return allowed.includes(v)
          ? v
          : fallback;
      };


    const DECISIONS = [
      'WAIT',
      'WATCH',
      'BUY SETUP',
      'HOLD',
      'TAKE PROFIT',
      'EXIT'
    ];


    const publicTrend =
      value =>
        publicEnum(
          value,
          [
            'BULLISH',
            'NEUTRAL',
            'BEARISH'
          ],
          'NEUTRAL'
        );


    const publicSetup =
      value =>
        publicEnum(
          value,
          [
            'ACTIVE',
            'INACTIVE'
          ],
          'INACTIVE'
        );


    const publicStage =
      value =>
        publicEnum(
          value,
          [
            'EARLY WATCH',
            'CONFIRMED',
            'ACTIVE'
          ]
        );


    const publicEntryStyle =
      value =>
        publicEnum(
          value,
          [
            'BREAKOUT',
            'PULLBACK',
            'WEAKNESS'
          ]
        );


    const publicDecision =
      value =>
        publicEnum(
          value,
          DECISIONS,
          'WAIT'
        );


    const publicRadar =
      value =>
        publicEnum(
          value,
          [
            'AVOID',
            'WATCH',
            'READY',
            'HOT',
            'EXTENDED'
          ],
          'AVOID'
        );


    const publicPrice =
      value => {

        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return '';
        }


        const n =
          Number(value);


        return (
          Number.isFinite(n) &&
          n > 0
        )
          ? String(n)
          : '';
      };


    const publicTimestamp =
      safeTimestamp;


    /* =====================================================
       MARKET CONTEXT HELPERS
       ===================================================== */

    const cleanText =
      (
        value,
        max = 120
      ) =>
        String(value || '')

          .replace(
            /[<>]/g,
            ''
          )

          .trim()

          .slice(
            0,
            max
          );


    const cleanNumber =
      (
        value,
        fallback = 0
      ) => {

        const n =
          Number(value);

        return Number.isFinite(n)
          ? n
          : fallback;
      };


    const cleanInt =
      (
        value,
        fallback = 0
      ) => {

        const n =
          Number(value);


        return (
          Number.isFinite(n) &&
          n >= 0
        )
          ? Math.floor(n)
          : fallback;
      };


    const cleanDate =
      value => {

        const v =
          String(value || '')
            .trim();


        return (
          /^\d{4}-\d{2}-\d{2}$/
            .test(v)
        )
          ? v
          : '';
      };


    const marketStatus =
      value =>
        publicEnum(
          value,
          [
            'POSITIVE',
            'NEUTRAL',
            'NEGATIVE'
          ],
          'NEUTRAL'
        );


    const foreignStatus =
      value =>
        publicEnum(
          value,
          [
            'NET BUY',
            'NET SELL',
            'NEUTRAL'
          ],
          'NEUTRAL'
        );


    const rupiahStatus =
      value =>
        publicEnum(
          value,
          [
            'STABLE',
            'STRENGTHENING',
            'WEAKENING'
          ],
          'STABLE'
        );


    const environmentStatus =
      value =>
        publicEnum(
          value,
          [
            'CONSTRUCTIVE',
            'NEUTRAL',
            'CAUTIOUS',
            'RISK OFF'
          ],
          'NEUTRAL'
        );


    const hotRisk =
      value =>
        publicEnum(
          value,
          [
            'LOW',
            'MODERATE',
            'ELEVATED',
            'HIGH'
          ],
          'MODERATE'
        );


    const cleanSector =
      item => ({

        sector:
          cleanText(
            item?.sector,
            50
          ).toUpperCase(),

        change:
          cleanNumber(
            item?.change
          )
      });


    const cleanHotIssue =
      item => ({

        category:
          cleanText(
            item?.category,
            40
          ).toUpperCase(),

        title:
          cleanText(
            item?.title,
            100
          ),

        risk:
          hotRisk(
            item?.risk
          )
      });


    const sanitizeHotIssues =
      value =>
        Array.isArray(value)

          ? value
              .slice(
                0,
                3
              )

              .map(
                cleanHotIssue
              )

              .filter(
                item =>
                  item.category &&
                  item.title
              )

          : [];


    const sanitizeMarketContext =
      payload => {

        const pulse =
          payload
            ?.market_pulse ||
          {};


        const leadership =
          payload
            ?.sector_leadership ||
          {};


        const leaders =
          Array.isArray(
            leadership?.leaders
          )
            ? leadership
                .leaders
                .slice(
                  0,
                  3
                )
                .map(
                  cleanSector
                )

            : [];


        return {

          updated_at:
            Date.now(),


          market_pulse: {

            foreign_flow: {

              status:
                foreignStatus(
                  pulse
                    ?.foreign_flow
                    ?.status
                ),

              value:
                cleanNumber(
                  pulse
                    ?.foreign_flow
                    ?.value
                ),

              date:
                cleanDate(
                  pulse
                    ?.foreign_flow
                    ?.date
                )
            },


            rupiah: {

              status:
                rupiahStatus(
                  pulse
                    ?.rupiah
                    ?.status
                ),

              value:
                cleanNumber(
                  pulse
                    ?.rupiah
                    ?.value
                ),

              change_5d:
                cleanNumber(
                  pulse
                    ?.rupiah
                    ?.change_5d
                ),

              date:
                cleanDate(
                  pulse
                    ?.rupiah
                    ?.date
                )
            },


            global_sentiment: {

              status:
                marketStatus(
                  pulse
                    ?.global_sentiment
                    ?.status
                ),

              detail:
                cleanText(
                  pulse
                    ?.global_sentiment
                    ?.detail,
                  180
                )
            },


            market_breadth: {

              status:
                marketStatus(
                  pulse
                    ?.market_breadth
                    ?.status
                ),

              advancers:
                cleanInt(
                  pulse
                    ?.market_breadth
                    ?.advancers
                ),

              decliners:
                cleanInt(
                  pulse
                    ?.market_breadth
                    ?.decliners
                )
            },


            environment:
              environmentStatus(
                pulse
                  ?.environment
              )
          },


          hot_issues:
            sanitizeHotIssues(
              payload
                ?.hot_issues
            ),


          sector_leadership: {

            leaders,

            weakest:
              cleanSector(
                leadership
                  ?.weakest
              )
          }
        };
      };


    /* =====================================================
       TECHNICAL
       ===================================================== */

    const gcState =
      value =>
        publicEnum(
          value,
          [
            'FRESH',
            'RECENT',
            'ACTIVE'
          ],
          'OFF'
        );


    const gcCandleAge =
      (
        value,
        state
      ) => {

        if (
          gcState(state) ===
          'OFF'
        ) {
          return null;
        }


        const n =
          Number(value);


        return (
          Number.isFinite(n) &&
          n >= 0
        )
          ? Math.floor(n)
          : null;
      };


    const publicSignal =
      s => ({

        ticker:
          normalizeTicker(
            s?.ticker
          ),

        timeframe:
          normalizeTimeframe(
            s?.timeframe
          ),

        score:
          toScore(
            s?.score
          ),

        trend:
          publicTrend(
            s?.trend
          ),

        setup:
          publicSetup(
            s?.setup
          ),

        setup_stage:
          publicStage(
            s?.setup_stage
          ),

        entry_style:
          publicEntryStyle(
            s?.entry_style
          ),

        style_entry_low:
          publicPrice(
            s?.style_entry_low
          ),

        style_entry_high:
          publicPrice(
            s?.style_entry_high
          ),

        style_stop:
          publicPrice(
            s?.style_stop
          ),

        status:
          publicDecision(
            s?.status
          ),

        entry_low:
          publicPrice(
            s?.entry_low
          ),

        entry_high:
          publicPrice(
            s?.entry_high
          ),

        trigger:
          publicPrice(
            s?.trigger
          ),

        invalidation:
          publicPrice(
            s?.invalidation
          ),

        target1:
          publicPrice(
            s?.target1
          ),

        target2:
          publicPrice(
            s?.target2
          ),

        target3:
          publicPrice(
            s?.target3
          ),

        price:
          publicPrice(
            s?.price
          ),

        radar_status:
          publicRadar(
            s?.radar_status
          ),

        updated_at:
          publicTimestamp(
            s?.updated_at
          ),

        received_at:
          publicTimestamp(
            s?.received_at
          )
      });


    const publicGc =
      s => ({

        ticker:
          normalizeTicker(
            s?.ticker
          ),

        timeframe:
          normalizeTimeframe(
            s?.timeframe
          ),

        score:
          toScore(
            s?.score
          ),

        radar_status:
          publicRadar(
            s?.radar_status
          ),

        status:
          publicDecision(
            s?.status
          ),

        ema_gc:
          gcState(
            s?.ema_gc
          ),

        ema_gc_candles:
          gcCandleAge(
            s?.ema_gc_age,
            s?.ema_gc
          ),

        sma_gc:
          gcState(
            s?.sma_gc
          ),

        sma_gc_candles:
          gcCandleAge(
            s?.sma_gc_age,
            s?.sma_gc
          ),

        double_gc:
          toBool(
            s?.double_gc
          ),

        updated_at:
          publicTimestamp(
            s?.updated_at
          ),

        received_at:
          publicTimestamp(
            s?.received_at
          )
      });


    const sanitizeForStorage =
      (
        item,
        ticker,
        timeframe,
        receivedAt
      ) => ({

        ticker,
        timeframe,

        score:
          toScore(
            item?.score
          ),

        trend:
          publicTrend(
            item?.trend
          ),

        setup:
          publicSetup(
            item?.setup
          ),

        setup_stage:
          publicStage(
            item?.setup_stage
          ),

        entry_style:
          publicEntryStyle(
            item?.entry_style
          ),

        style_entry_low:
          publicPrice(
            item?.style_entry_low
          ),

        style_entry_high:
          publicPrice(
            item?.style_entry_high
          ),

        style_stop:
          publicPrice(
            item?.style_stop
          ),

        status:
          publicDecision(
            item?.status
          ),

        entry_low:
          publicPrice(
            item?.entry_low
          ),

        entry_high:
          publicPrice(
            item?.entry_high
          ),

        trigger:
          publicPrice(
            item?.trigger
          ),

        invalidation:
          publicPrice(
            item?.invalidation
          ),

        target1:
          publicPrice(
            item?.target1
          ),

        target2:
          publicPrice(
            item?.target2
          ),

        target3:
          publicPrice(
            item?.target3
          ),

        price:
          publicPrice(
            item?.price
          ),

        radar_status:
          publicRadar(
            item?.radar_status
          ),

        ema_gc:
          gcState(
            item?.ema_gc
          ),

        ema_gc_age:
          gcCandleAge(
            item?.ema_gc_age,
            item?.ema_gc
          ),

        sma_gc:
          gcState(
            item?.sma_gc
          ),

        sma_gc_age:
          gcCandleAge(
            item?.sma_gc_age,
            item?.sma_gc
          ),

        double_gc:
          toBool(
            item?.double_gc
          ),

        updated_at:
          publicTimestamp(
            item?.updated_at
          ),

        received_at:
          receivedAt
      });


    const byScore =
      (a, b) =>
        toScore(
          b?.score
        ) -
        toScore(
          a?.score
        ) ||

        String(
          a?.ticker || ''
        ).localeCompare(
          String(
            b?.ticker || ''
          )
        );


    async function readAll(tf) {

      const list =
        await env.SIGNALS.list({

          prefix:
            'signal:',

          limit:
            100
        });


      const keys =
        list
          .keys

          .map(
            k =>
              k.name
          )

          .filter(
            k =>
              k.endsWith(
                `:${tf}`
              )
          );


      const values =
        await Promise.all(

          keys.map(
            k =>
              env.SIGNALS.get(
                k,
                {
                  type:
                    'json'
                }
              )
          )
        );


      return values.filter(
        Boolean
      );
    }


    /* =====================================================
       CORS
       ===================================================== */

    if (
      request.method ===
      'OPTIONS'
    ) {

      return new Response(
        null,
        {
          status:
            204,

          headers
        }
      );
    }


    /* =====================================================
       HEALTH
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/'
    ) {

      return json({

        ok:
          true,

        service:
          'analisaku-signal',

        version:
          '2.9-hot-issue-engine',

        status:
          'ready'
      });
    }


    /* =====================================================
       SINGLE SIGNAL
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/signal'
    ) {

      const ticker =
        normalizeTicker(
          url
            .searchParams
            .get(
              'ticker'
            )
        );


      const timeframe =
        normalizeTimeframe(
          url
            .searchParams
            .get(
              'timeframe'
            )
        );


      if (
        !ticker ||
        !timeframe
      ) {

        return json({

          ok:
            false,

          error:
            'ticker dan timeframe wajib diisi'

        }, 400);
      }


      const data =
        await env.SIGNALS.get(
          `signal:${ticker}:${timeframe}`,
          {
            type:
              'json'
          }
        );


      if (!data) {

        return json({

          ok:
            false,

          error:
            'signal belum tersedia',

          ticker,
          timeframe

        }, 404);
      }


      return json({

        ok:
          true,

        ...publicSignal(
          data
        )
      });
    }


    /* =====================================================
       SIGNALS
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/signals'
    ) {

      const timeframe =
        normalizeTimeframe(
          url
            .searchParams
            .get(
              'timeframe'
            ) ||
          '1D'
        );


      if (!timeframe) {

        return json({

          ok:
            false,

          error:
            'timeframe tidak valid'

        }, 400);
      }


      const all =
        await readAll(
          timeframe
        );


      const signals =
        all
          .map(
            publicSignal
          )
          .sort(
            byScore
          );


      return json({

        ok:
          true,

        timeframe,

        count:
          signals.length,

        signals
      });
    }


    /* =====================================================
       TECHNICAL
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/technical'
    ) {

      const timeframe =
        normalizeTimeframe(
          url
            .searchParams
            .get(
              'timeframe'
            ) ||
          '1D'
        );


      if (!timeframe) {

        return json({

          ok:
            false,

          error:
            'timeframe tidak valid'

        }, 400);
      }


      const internal =
        await readAll(
          timeframe
        );


      const ema =
        internal.filter(
          s =>
            gcState(
              s.ema_gc
            ) !== 'OFF'
        );


      const sma =
        internal.filter(
          s =>
            gcState(
              s.sma_gc
            ) !== 'OFF'
        );


      const double =
        internal.filter(
          s =>
            toBool(
              s.double_gc
            )
        );


      const fresh =
        internal.filter(
          s =>
            gcState(
              s.ema_gc
            ) === 'FRESH' ||

            gcState(
              s.sma_gc
            ) === 'FRESH'
        );


      const doubleFresh =
        internal.filter(
          s =>
            toBool(
              s.double_gc
            ) &&

            gcState(
              s.ema_gc
            ) === 'FRESH' &&

            gcState(
              s.sma_gc
            ) === 'FRESH'
        );


      const newest =
        internal.reduce(
          (
            max,
            s
          ) =>
            Math.max(
              max,
              publicTimestamp(
                s.updated_at
              )
            ),
          0
        );


      return json({

        ok:
          true,

        timeframe,

        updated_at:
          newest,


        summary: {

          total:
            internal.length,

          double_gc:
            double.length,

          double_fresh:
            doubleFresh.length,

          ema_gc:
            ema.length,

          sma_gc:
            sma.length,

          fresh_gc:
            fresh.length
        },


        double_fresh:
          doubleFresh
            .map(
              publicGc
            )
            .sort(
              byScore
            ),


        double_gc:
          double
            .map(
              publicGc
            )
            .sort(
              byScore
            ),


        ema_gc:
          ema
            .map(
              publicGc
            )
            .sort(
              byScore
            ),


        sma_gc:
          sma
            .map(
              publicGc
            )
            .sort(
              byScore
            ),


        fresh_gc:
          fresh
            .map(
              publicGc
            )
            .sort(
              byScore
            )
      });
    }


    /* =====================================================
       MARKET CONTEXT PUBLIC
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/market-context'
    ) {

      const data =
        await env.SIGNALS.get(
          'market:context:latest',
          {
            type:
              'json'
          }
        );


      if (!data) {

        return json({

          ok:
            true,

          updated_at:
            0,

          market_pulse:
            null,

          hot_issues:
            [],

          sector_leadership:
            null
        });
      }


      return json({

        ok:
          true,

        ...data,

        hot_issues:
          Array.isArray(
            data.hot_issues
          )
            ? data.hot_issues
            : []
      });
    }


    /* =====================================================
       FULL MARKET CONTEXT UPDATE
       ===================================================== */

    if (
      request.method ===
        'POST' &&

      url.pathname ===
        '/market-context/update'
    ) {

      if (!authorize()) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      let payload;


      try {

        payload =
          await request.json();

      } catch {

        return json({

          ok:
            false,

          error:
            'body harus JSON'

        }, 400);
      }


      const data =
        sanitizeMarketContext(
          payload
        );


      await env.SIGNALS.put(
        'market:context:latest',

        JSON.stringify(
          data
        )
      );


      return json({

        ok:
          true,

        updated_at:
          data.updated_at
      });
    }


    /* =====================================================
       GLOBAL MANUAL UPDATE
       ===================================================== */

    if (
      request.method ===
        'POST' &&

      url.pathname ===
        '/market-context/global-update'
    ) {

      if (!authorize()) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      let payload;


      try {

        payload =
          await request.json();

      } catch {

        return json({

          ok:
            false,

          error:
            'body harus JSON'

        }, 400);
      }


      const current =
        await env.SIGNALS.get(
          'market:context:latest',
          {
            type:
              'json'
          }
        );


      if (
        !current ||
        typeof current !==
          'object'
      ) {

        return json({

          ok:
            false,

          error:
            'market:context:latest belum tersedia'

        }, 409);
      }


      const globalSentiment =
        payload
          ?.global_sentiment ||
        {};


      current.market_pulse =
        current.market_pulse ||
        {};


      current
        .market_pulse
        .global_sentiment = {

          status:
            marketStatus(
              globalSentiment
                ?.status
            ),

          detail:
            cleanText(
              globalSentiment
                ?.detail,
              180
            )
        };


      current.hot_issues =
        sanitizeHotIssues(
          payload
            ?.hot_issues
        );


      current.updated_at =
        Date.now();


      current.global_context_updated_at =
        current.updated_at;


      current.hot_issues_source =
        'MANUAL';


      current.hot_issues_updated_at =
        current.updated_at;


      delete (
        current
          .hot_issues_source_url
      );


      await env.SIGNALS.put(
        'market:context:latest',

        JSON.stringify(
          current
        )
      );


      return json({

        ok:
          true,

        updated_at:
          current.updated_at,

        global_sentiment:
          current
            .market_pulse
            .global_sentiment,

        hot_issues:
          current.hot_issues
      });
    }


    /* =====================================================
       JISDOR MANUAL SYNC
       ===================================================== */

    if (
      request.method ===
        'POST' &&

      url.pathname ===
        '/market-context/jisdor-sync'
    ) {

      if (!authorize()) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      try {

        const result =
          await syncJisdor(
            env
          );


        return json(
          result
        );

      } catch (error) {

        return json({

          ok:
            false,

          error:
            String(
              error?.message ||
              error
            )

        }, 502);
      }
    }


    /* =====================================================
       GDELT HOT ISSUES SYNC
       ===================================================== */

    if (
      request.method ===
        'POST' &&

      url.pathname ===
        '/market-context/hot-issues-sync'
    ) {

      if (!authorize()) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      try {

        const result =
          await syncHotIssues(
            env
          );


        return json(
          result
        );

      } catch (error) {

        return json({

          ok:
            false,

          error:
            String(
              error?.message ||
              error
            )

        }, 502);
      }
    }


    /* =====================================================
       HOT ISSUE DEBUG — PROTECTED
       ===================================================== */

    if (
      request.method ===
        'GET' &&

      url.pathname ===
        '/market-context/hot-issues-debug'
    ) {

      if (!authorize()) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      const debug =
        await env.SIGNALS.get(
          'market:hot-issues:debug',
          {
            type:
              'json'
          }
        );


      return json({

        ok:
          true,

        debug:
          debug || null
      });
    }


    /* =====================================================
       TRADINGVIEW WEBHOOK
       ===================================================== */

    if (
      request.method ===
        'POST' &&

      url.pathname.startsWith(
        '/webhook/'
      )
    ) {

      const supplied =
        decodeURIComponent(
          url.pathname.slice(
            '/webhook/'.length
          )
        );


      if (
        !env.WEBHOOK_SECRET ||
        supplied !==
          env.WEBHOOK_SECRET
      ) {

        return json({

          ok:
            false,

          error:
            'unauthorized'

        }, 401);
      }


      let payload;


      try {

        payload =
          await request.json();

      } catch {

        return json({

          ok:
            false,

          error:
            'body harus JSON'

        }, 400);
      }


      const isBatch =
        Array.isArray(
          payload?.signals
        );


      const raw =
        isBatch
          ? payload.signals
          : [payload];


      if (!raw.length) {

        return json({

          ok:
            false,

          error:
            'signals kosong'

        }, 400);
      }


      if (
        raw.length > 40
      ) {

        return json({

          ok:
            false,

          error:
            'terlalu banyak signal',

          max:
            40

        }, 400);
      }


      const receivedAt =
        Date.now();


      const writes =
        [];


      for (
        let i = 0;
        i < raw.length;
        i++
      ) {

        const item =
          raw[i] || {};


        const ticker =
          normalizeTicker(
            item.ticker
          );


        const timeframe =
          normalizeTimeframe(
            item.timeframe
          );


        const rawStatus =
          String(
            item.status ||
            ''
          )
            .toUpperCase()
            .trim();


        if (
          !ticker ||
          !timeframe ||
          !DECISIONS.includes(
            rawStatus
          )
        ) {

          return json({

            ok:
              false,

            error:
              'payload tidak lengkap / status tidak valid',

            index:
              i

          }, 400);
        }


        writes.push({

          key:
            `signal:${ticker}:${timeframe}`,

          value:
            sanitizeForStorage(
              item,
              ticker,
              timeframe,
              receivedAt
            )
        });
      }


      await Promise.all(

        writes.map(
          w =>
            env.SIGNALS.put(
              w.key,

              JSON.stringify(
                w.value
              )
            )
        )
      );


      return json({

        ok:
          true,

        version:
          '2.9-hot-issue-engine',

        mode:
          isBatch
            ? 'batch'
            : 'single',

        count:
          writes.length
      });
    }


    return json({

      ok:
        false,

      error:
        'not found'

    }, 404);
  },


  /* =========================================================
     CRON ROUTER
     ========================================================= */

  async scheduled(
    controller,
    env,
    ctx
  ) {

    const cron =
      String(
        controller?.cron ||
        ''
      );


    try {

      /*
        Cron Hot Issues belum
        dibuat sekarang.

        Saat nanti dibuat:
        15 */4 * * *
      */

      if (
        cron ===
        HOT_ISSUES_CRON
      ) {

        const result =
          await syncHotIssues(
            env
          );


        console.log(

          'Hot Issues scheduled sync',

          JSON.stringify({

            cron,

            scheduledTime:
              controller.scheduledTime,

            result
          })
        );


        return;
      }


      /*
        Semua Cron lama / default
        tetap menjalankan JISDOR.

        Jadi Cron JISDOR yang sudah
        dibuat tidak terganggu.
      */

      const result =
        await syncJisdor(
          env
        );


      console.log(

        'JISDOR scheduled sync',

        JSON.stringify({

          cron,

          scheduledTime:
            controller.scheduledTime,

          result
        })
      );


    } catch (error) {

      console.error(

        'Scheduled sync failed',

        JSON.stringify({

          cron,

          error:
            String(
              error?.message ||
              error
            )
        })
      );


      throw error;
    }
  }
};
