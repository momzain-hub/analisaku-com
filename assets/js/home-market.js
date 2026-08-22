/* Analisaku Home Market Command Center */

(function () {
  const $ = id => document.getElementById(id);

  const moduleSrc =
    document.currentScript?.src || location.href;

  const dataUrl =
    new URL('../data/weekly-outlook.json', moduleSrc).href;

  const configUrl =
    new URL('signal-config.js', moduleSrc).href;


  /* =========================================================
     WEEKLY OUTLOOK
     ========================================================= */

  function jakartaToday() {
    const parts =
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());

    const map =
      Object.fromEntries(
        parts.map(p => [p.type, p.value])
      );

    return `${map.year}-${map.month}-${map.day}`;
  }


  function chooseWeek(weeks, today) {
    const active =
      weeks.find(
        w => today >= w.start && today <= w.end
      );

    if (active) return active;

    const upcoming =
      weeks.find(
        w => today < w.start
      );

    return upcoming || weeks[weeks.length - 1];
  }


  function renderWeekly(data) {
    const host = $('weeklyOutlook');

    if (!host) return;

    const today = jakartaToday();

    const week =
      chooseWeek(
        data.weeks || [],
        today
      );

    if (!week) {
      host.innerHTML =
        '<div class="mc-empty">Weekly Outlook belum tersedia.</div>';

      return;
    }

    if ($('weeklyRange')) {
      $('weeklyRange').textContent =
        week.display_range;
    }

    if ($('weeklyBias')) {
      $('weeklyBias').textContent =
        week.bias;
    }

    if ($('weeklyCall')) {
      $('weeklyCall').textContent =
        week.weekly_call;
    }

    if ($('weeklyStrategy')) {
      $('weeklyStrategy').textContent =
        week.strategy;
    }

    if ($('weeklyLegend')) {
      $('weeklyLegend').textContent =
        data.symbol_legend ||
        '◆ = Key Timing Window';
    }


    host.innerHTML =
      week.days.map(day => {

        const isToday =
          day.date === today;

        const classes =
          ['weekly-day'];

        if (day.key) {
          classes.push('key-window');
        }

        if (day.closed) {
          classes.push('market-closed');
        }

        if (isToday) {
          classes.push('is-today');
        }


        const badge =
          isToday
            ? (
                day.closed
                  ? 'TODAY • MARKET CLOSED'
                  : day.key
                    ? 'TODAY • ◆ KEY WINDOW'
                    : 'TODAY'
              )
            : day.closed
              ? 'MARKET CLOSED'
              : day.key
                ? '◆ KEY WINDOW'
                : '';


        return `
          <article class="${classes.join(' ')}">

            <div class="weekly-day-top">

              <strong>
                ${day.label}${day.key ? ' ◆' : ''}
              </strong>

              ${
                badge
                  ? `<span>${badge}</span>`
                  : ''
              }

            </div>

            <p>${day.text}</p>

          </article>
        `;

      }).join('');
  }


  fetch(dataUrl, {
    cache: 'no-store'
  })
    .then(r =>
      r.ok
        ? r.json()
        : Promise.reject()
    )
    .then(renderWeekly)
    .catch(() => {

      const host =
        $('weeklyOutlook');

      if (host) {
        host.innerHTML =
          '<div class="mc-empty">Weekly Outlook belum dapat dimuat.</div>';
      }

    });


  /* =========================================================
     SIGNAL API CONFIG
     ========================================================= */

  const ticker =
    $('homeTicker');

  const tf =
    $('homeTf');

  const check =
    $('homeCheckSignal');

  let api = '';


  function loadConfig() {
    return new Promise(resolve => {

      if (window.ANALISAKU_SIGNAL_API) {

        api =
          String(
            window.ANALISAKU_SIGNAL_API
          );

        resolve();

        return;
      }


      const s =
        document.createElement('script');

      s.src =
        configUrl;


      s.onload = () => {

        api =
          String(
            window.ANALISAKU_SIGNAL_API ||
            ''
          );

        resolve();

      };


      s.onerror =
        resolve;


      document.head.appendChild(s);

    });
  }


  function workerEndpoint(path) {

    if (!api) return '';

    try {

      const u =
        new URL(api);

      u.pathname =
        path;

      u.search =
        '';

      u.hash =
        '';

      return u.href;

    } catch (e) {

      return '';

    }
  }


  /* =========================================================
     MARKET CONTEXT
     ========================================================= */

  function pulseCard(label) {

    return [
      ...document.querySelectorAll(
        '.pulse-card'
      )
    ].find(card =>

      String(
        card.querySelector('small')
          ?.textContent || ''
      )
        .trim()
        .toUpperCase() === label

    );
  }


  function formatPercent(value) {

    const n =
      Number(value);

    if (!Number.isFinite(n)) {
      return '—';
    }

    return (
      `${n > 0 ? '+' : ''}` +
      n.toLocaleString(
        'id-ID',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ) +
      '%'
    );
  }


  function setPulseCard(
    label,
    status,
    detail
  ) {

    const card =
      pulseCard(label);

    if (!card) return;


    const strong =
      card.querySelector('strong');

    const span =
      card.querySelector('span');


    if (strong) {

      strong.textContent =
        String(
          status || '—'
        ).toUpperCase();

    }


    if (span) {

      span.textContent =
        detail || '—';

    }


    card.classList.remove(
      'pending'
    );


    card.dataset.pulseStatus =
      String(
        status || ''
      ).toUpperCase();
  }


  function renderRupiah(data) {

    if (!data) return;


    const parts =
      [];


    const value =
      Number(data.value);


    if (
      Number.isFinite(value)
    ) {

      parts.push(
        `JISDOR ${value.toLocaleString(
          'id-ID',
          {
            maximumFractionDigits: 2
          }
        )}`
      );

    }


    if (
      Number.isFinite(
        Number(
          data.change_5d
        )
      )
    ) {

      parts.push(
        `5D ${formatPercent(
          data.change_5d
        )}`
      );

    }


    setPulseCard(
      'RUPIAH',
      data.status,
      parts.join(' • ') ||
      'Sumber: BI / JISDOR'
    );
  }


  function renderSectorLeadership(data) {

    if (!data) return;


    const items =
      [
        ...document.querySelectorAll(
          '.sector-item'
        )
      ];


    const leaders =
      Array.isArray(
        data.leaders
      )
        ? data.leaders.slice(0, 3)
        : [];


    leaders.forEach(
      (sector, index) => {

        const item =
          items[index];

        if (!item) return;


        const strong =
          item.querySelector(
            'strong'
          );

        const span =
          item.querySelector(
            'span'
          );


        if (strong) {

          strong.textContent =
            String(
              sector.sector ||
              '—'
            ).toUpperCase();

        }


        if (span) {

          span.textContent =
            formatPercent(
              sector.change
            );

        }

      }
    );


    const weakest =
      data.weakest;

    const weakItem =
      items[3];


    if (
      weakest &&
      weakItem
    ) {

      const strong =
        weakItem.querySelector(
          'strong'
        );

      const span =
        weakItem.querySelector(
          'span'
        );


      if (strong) {

        strong.textContent =
          String(
            weakest.sector ||
            '—'
          ).toUpperCase();

      }


      if (span) {

        span.textContent =
          formatPercent(
            weakest.change
          );

      }

    }
  }


  function renderMarketContext(data) {

    if (
      !data ||
      !data.ok
    ) {
      return;
    }


    const pulse =
      data.market_pulse;


    if (pulse) {

      renderRupiah(
        pulse.rupiah
      );

    }


    renderSectorLeadership(
      data.sector_leadership
    );
  }


  async function fetchMarketPulse() {

    const endpoint =
      workerEndpoint(
        '/market-context'
      );

    if (!endpoint) return;


    try {

      const response =
        await fetch(
          endpoint,
          {
            cache: 'no-store'
          }
        );


      if (!response.ok) {
        return;
      }


      const data =
        await response.json();


      renderMarketContext(
        data
      );

    } catch (e) {

      /*
        API gagal:
        placeholder Home tetap tampil.
      */

    }
  }


  /* =========================================================
     TECHNICAL QUICK SNAPSHOT
     ========================================================= */

  const clean =
    value =>
      String(value || '')
        .toUpperCase()
        .replace(/^IDX:/, '')
        .replace(
          /[^A-Z0-9._-]/g,
          ''
        )
        .slice(0, 20) ||
      'RAJA';


  const apiTf =
    value =>
      ({
        D: '1D',
        W: '1W',
        M: '1M'
      })[value] ||
      value;


  const price =
    value => {

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return '—';
      }


      const n =
        Number(value);


      return Number.isFinite(n)
        ? n.toLocaleString(
            'id-ID',
            {
              maximumFractionDigits: 2
            }
          )
        : String(value);

    };


  const publicStatus =
    status =>
      ({
        'WAIT':
          'WAIT',

        'WATCH':
          'WATCH',

        'BUY SETUP':
          'SETUP ACTIVE',

        'HOLD':
          'ACTIVE',

        'TAKE PROFIT':
          'TARGET REACHED',

        'EXIT':
          'INVALID'

      })[status] ||
      status ||
      '—';


  function contextText(status) {

    return ({

      'WATCH':
        'Area keputusan sedang dipantau; tunggu konfirmasi lanjutan.',

      'WAIT':
        'Belum ada kondisi teknikal yang cukup kuat.',

      'BUY SETUP':
        'Trigger teknikal sudah terkonfirmasi.',

      'HOLD':
        'Struktur teknikal masih aktif.',

      'TAKE PROFIT':
        'Harga sudah mencapai area target.',

      'EXIT':
        'Skenario teknikal sebelumnya sudah tidak valid.'

    })[status] ||
    'Menunggu output Master Signal.';
  }


  function resetQuick(
    note =
      'Pilih ticker lalu cek technical snapshot terakhir.'
  ) {

    [
      'hqTrend',
      'hqStatus',
      'hqEntry',
      'hqTrigger',
      'hqStop',
      'hqTarget'
    ].forEach(id => {

      if ($(id)) {
        $(id).textContent =
          '—';
      }

    });


    if ($('hqDecision')) {

      $('hqDecision').textContent =
        note;

    }


    if ($('hqSource')) {

      $('hqSource').textContent =
        'Master Signal';

    }
  }


  async function fetchQuick() {

    if (!ticker) return;


    const symbol =
      clean(
        ticker.value
      );


    ticker.value =
      symbol;


    if (!api) {

      resetQuick(
        'Signal API belum tersedia.'
      );

      return;
    }


    if ($('hqSource')) {

      $('hqSource').textContent =
        'Mengambil technical snapshot…';

    }


    try {

      const selectedTf =
        tf?.value ||
        'D';


      const url =
        new URL(api);


      url.searchParams.set(
        'ticker',
        symbol
      );


      url.searchParams.set(
        'timeframe',
        apiTf(
          selectedTf
        )
      );


      const r =
        await fetch(
          url,
          {
            cache: 'no-store'
          }
        );


      if (
        r.status === 404
      ) {

        resetQuick(
          'Belum ada snapshot tersimpan untuk ticker/timeframe ini.'
        );

        return;
      }


      if (!r.ok) {
        throw new Error(
          'Signal API error'
        );
      }


      const body =
        await r.json();


      const d =
        body.data ||
        body;


      const raw =
        String(
          d.status ||
          ''
        ).toUpperCase();


      if ($('hqTrend')) {

        $('hqTrend').textContent =
          String(
            d.trend ||
            '—'
          ).toUpperCase();

      }


      if ($('hqStatus')) {

        $('hqStatus').textContent =
          publicStatus(
            raw
          );

      }


      if ($('hqEntry')) {

        $('hqEntry').textContent =
          (
            d.entry_low ||
            d.entry_high
          )
            ? (
                `${price(d.entry_low)}` +
                ` – ` +
                `${price(d.entry_high)}`
              )
            : '—';

      }


      if ($('hqTrigger')) {

        $('hqTrigger').textContent =
          price(
            d.trigger
          );

      }


      if ($('hqStop')) {

        $('hqStop').textContent =
          price(
            d.invalidation
          );

      }


      if ($('hqTarget')) {

        $('hqTarget').textContent =
          price(
            d.target1
          );

      }


      if ($('hqDecision')) {

        $('hqDecision').textContent =
          contextText(
            raw
          );

      }


      const ts =
        Number(
          d.received_at ||
          d.updated_at
        );


      if ($('hqSource')) {

        $('hqSource').textContent =
          'Technical snapshot' +
          (
            Number.isFinite(ts)
              ? (
                  ' • ' +
                  new Date(ts)
                    .toLocaleString(
                      'id-ID'
                    )
                )
              : ''
          );

      }

    } catch (e) {

      resetQuick(
        'Signal API belum dapat diakses.'
      );

    }
  }


  /* =========================================================
     EVENTS
     ========================================================= */

  if (check) {

    check.addEventListener(
      'click',
      fetchQuick
    );

  }


  if (ticker) {

    ticker.addEventListener(
      'keydown',
      e => {

        if (
          e.key === 'Enter'
        ) {

          fetchQuick();

        }

      }

    );

  }


  /* =========================================================
     START
     ========================================================= */

  loadConfig()
    .then(() => {

      resetQuick();

      fetchMarketPulse();

    });

})();
