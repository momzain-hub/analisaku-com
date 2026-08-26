/* Analisaku Market Context — freshness display + backend Market Environment */

(function () {
  const ENDPOINT = 'https://analisaku-signal.pitizain.workers.dev/market-context';
  const HOUR = 60 * 60 * 1000;

  const LIMITS = {
    rupiahHours: 96,
    sectorHours: 96,
    hotIssuesHours: 12
  };

  function ageHours(timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return Math.max(0, (Date.now() - ts) / HOUR);
  }

  function dateAgeHours(date) {
    const value = String(date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const ts = new Date(`${value}T23:59:59+07:00`).getTime();
    return Number.isFinite(ts) ? Math.max(0, (Date.now() - ts) / HOUR) : null;
  }

  function fallbackFreshness(timestamp, date, maxHours, hasData) {
    if (!hasData) return 'waiting';
    const tsAge = ageHours(timestamp);
    if (tsAge !== null) return tsAge <= maxHours ? 'fresh' : 'delayed';
    const dAge = dateAgeHours(date);
    if (dAge !== null) return dAge <= maxHours ? 'fresh' : 'delayed';
    return 'delayed';
  }

  function normalizeFreshness(value, fallback) {
    const v = String(value || '').toLowerCase();
    if (['fresh', 'delayed', 'waiting'].includes(v)) return v;
    return fallback;
  }

  function resolveFreshness(data) {
    const backend = data?.market_environment?.components || {};

    const fallback = {
      rupiah: fallbackFreshness(
        data?.rupiah_updated_at,
        data?.market_pulse?.rupiah?.date,
        LIMITS.rupiahHours,
        Boolean(data?.market_pulse?.rupiah)
      ),
      sector: fallbackFreshness(
        data?.sector_leadership_updated_at,
        data?.sector_leadership?.date,
        LIMITS.sectorHours,
        Boolean(data?.sector_leadership)
      ),
      hotIssues: fallbackFreshness(
        data?.hot_issues_updated_at,
        '',
        LIMITS.hotIssuesHours,
        Array.isArray(data?.hot_issues) && data.hot_issues.length > 0
      )
    };

    return {
      rupiah: normalizeFreshness(backend?.rupiah?.freshness, fallback.rupiah),
      sector: normalizeFreshness(backend?.sector?.freshness, fallback.sector),
      hotIssues: normalizeFreshness(backend?.hot_issues?.freshness, fallback.hotIssues)
    };
  }

  function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n > 0 ? '+' : ''}${n.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }

  function formatDateOnly(value) {
    if (!value) return '';
    try {
      return new Date(`${value}T12:00:00+07:00`).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(value);
    }
  }

  function formatTimestamp(value) {
    const ts = Number(value);
    if (!Number.isFinite(ts) || ts <= 0) return '';
    return new Date(ts).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function resolveUpdateLabel(timestamp, date) {
    return formatTimestamp(timestamp) || formatDateOnly(date) || 'waktu update tidak tersedia';
  }

  function pulseCard(label) {
    return [...document.querySelectorAll('.pulse-card')].find(card =>
      String(card.querySelector('small')?.textContent || '').trim().toUpperCase() === label
    );
  }

  function renderRupiah(data, timestamp, freshness) {
    const card = pulseCard('RUPIAH');
    if (!card || !data) return;

    const strong = card.querySelector('strong');
    const span = card.querySelector('span');
    const parts = [];
    const value = Number(data.value);

    if (strong) strong.textContent = String(data.status || '—').toUpperCase();
    if (Number.isFinite(value)) {
      parts.push(`JISDOR ${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`);
    }
    if (Number.isFinite(Number(data.change_5d))) {
      parts.push(`5D ${formatPercent(data.change_5d)}`);
    }
    parts.push(`Update ${resolveUpdateLabel(timestamp, data.date)}`);
    if (freshness === 'delayed') parts.unshift('DATA DELAYED');

    if (span) span.textContent = parts.join(' • ');
    card.classList.remove('pending');
    card.dataset.freshness = freshness;
  }

  function renderSector(data, timestamp, freshness) {
    const shell = document.querySelector('.sector-shell');
    const items = [...document.querySelectorAll('.sector-item')];
    const note = shell?.querySelector('.data-note');
    if (!shell || !items.length) return;

    shell.dataset.freshness = freshness;

    if (!data) {
      items.forEach(item => {
        const strong = item.querySelector('strong');
        const span = item.querySelector('span');
        if (strong) strong.textContent = '—';
        if (span) span.textContent = 'Menunggu penutupan bursa berikutnya';
      });
      if (note) {
        note.textContent = 'Sumber: indeks sektor IDX-IC • Ranking berdasarkan perubahan harian • Menunggu data live dari penutupan bursa berikutnya.';
      }
      return;
    }

    const leaders = Array.isArray(data.leaders) ? data.leaders.slice(0, 3) : [];
    leaders.forEach((sector, index) => {
      const item = items[index];
      if (!item) return;
      const strong = item.querySelector('strong');
      const span = item.querySelector('span');
      if (strong) strong.textContent = String(sector?.sector || '—').toUpperCase();
      if (span) span.textContent = `${formatPercent(sector?.change)}${freshness === 'delayed' ? ' • DATA DELAYED' : ''}`;
    });

    const weakItem = items[3];
    const weakest = data.weakest;
    if (weakItem && weakest) {
      const strong = weakItem.querySelector('strong');
      const span = weakItem.querySelector('span');
      if (strong) strong.textContent = String(weakest?.sector || '—').toUpperCase();
      if (span) span.textContent = `${formatPercent(weakest?.change)}${freshness === 'delayed' ? ' • DATA DELAYED' : ''}`;
    }

    if (note) {
      const parts = [
        'Sumber: indeks sektor IDX-IC',
        'Ranking berdasarkan perubahan harian',
        `Update ${resolveUpdateLabel(timestamp, data.date)}`
      ];
      if (freshness === 'delayed') parts.splice(2, 0, 'DATA DELAYED');
      note.textContent = parts.join(' • ');
    }
  }

  function localRupiahScore(data) {
    const status = String(data?.status || '').toUpperCase();
    if (status === 'STRENGTHENING') return 1;
    if (status === 'WEAKENING') return -1;
    if (status === 'STABLE') return 0;
    return null;
  }

  function localSectorScore(data) {
    const changes = (Array.isArray(data?.leaders) ? data.leaders.slice(0, 3) : [])
      .map(item => Number(item?.change))
      .filter(Number.isFinite);
    if (!changes.length) return null;
    const positiveCount = changes.filter(value => value > 0).length;
    const average = changes.reduce((sum, value) => sum + value, 0) / changes.length;
    if (positiveCount >= 2 && average > 0) return 1;
    if (positiveCount === 0 || average < 0) return -1;
    return 0;
  }

  function localHotIssuesScore(issues) {
    if (!Array.isArray(issues) || !issues.length) return null;
    const risks = issues.map(item => String(item?.risk || '').toUpperCase());
    if (risks.includes('HIGH')) return -2;
    if (risks.filter(risk => risk === 'ELEVATED').length >= 2) return -1;
    return 0;
  }

  function fallbackEnvironment(data, freshness) {
    const scores = [];
    if (freshness.rupiah === 'fresh') {
      const score = localRupiahScore(data?.market_pulse?.rupiah);
      if (score !== null) scores.push(score);
    }
    if (freshness.sector === 'fresh') {
      const score = localSectorScore(data?.sector_leadership);
      if (score !== null) scores.push(score);
    }
    if (freshness.hotIssues === 'fresh') {
      const score = localHotIssuesScore(data?.hot_issues);
      if (score !== null) scores.push(score);
    }

    if (scores.length < 2) {
      return { status: 'MENUNGGU DATA', score: null, source: 'FRONTEND_FALLBACK' };
    }

    const total = scores.reduce((sum, value) => sum + value, 0);
    return {
      status: total >= 2 ? 'CONSTRUCTIVE' : total >= 0 ? 'NEUTRAL' : total === -1 ? 'CAUTIOUS' : 'RISK OFF',
      score: total,
      source: 'FRONTEND_FALLBACK'
    };
  }

  function renderEnvironment(environment, freshness) {
    const box = document.querySelector('.market-environment');
    if (!box) return;

    const strong = box.querySelector('strong');
    const detail = box.querySelector('p');
    const status = String(environment?.status || 'MENUNGGU DATA').toUpperCase();

    const descriptions = {
      CONSTRUCTIVE: 'Sumber data yang masih fresh cenderung mendukung kondisi pasar, dengan tetap memperhatikan seleksi sektor dan saham.',
      NEUTRAL: 'Sinyal dari sumber data yang masih fresh masih berimbang. Seleksi saham tetap menjadi prioritas.',
      CAUTIOUS: 'Tekanan dari sumber data yang masih fresh mulai meningkat. Perketat seleksi saham dan pengelolaan risiko.',
      'RISK OFF': 'Tekanan pasar dari sumber data yang masih fresh sedang dominan. Prioritaskan perlindungan modal.',
      'MENUNGGU DATA': 'Market Environment ditahan sampai minimal dua sumber data masih fresh.'
    };

    let text = descriptions[status] || descriptions['MENUNGGU DATA'];
    if (freshness.sector === 'waiting') text += ' Sector Leadership menunggu data live.';
    else if (freshness.sector === 'delayed') text += ' Sector Leadership tidak dihitung karena data terlambat.';

    if (strong) strong.textContent = status;
    if (detail) detail.textContent = text;

    box.dataset.environment = status;
    box.dataset.environmentSource = environment?.source || 'BACKEND_MARKET_ENVIRONMENT';
  }

  function freshnessText(label, state, timestamp, date, waitingText) {
    if (state === 'waiting') return `${label} • ${waitingText}`;
    const updated = resolveUpdateLabel(timestamp, date);
    if (state === 'delayed') return `${label} • DATA DELAYED • ${updated}`;
    return `${label} • ${updated}`;
  }

  function renderFreshnessSummary(data, freshness) {
    const host = document.getElementById('marketFreshness');
    if (!host) return;
    host.innerHTML = '';

    const entries = [
      {
        state: freshness.rupiah,
        text: freshnessText('Rupiah', freshness.rupiah, data?.rupiah_updated_at, data?.market_pulse?.rupiah?.date, 'menunggu data')
      },
      {
        state: freshness.hotIssues,
        text: freshnessText('Hot Issues', freshness.hotIssues, data?.hot_issues_updated_at, '', 'menunggu data')
      },
      {
        state: freshness.sector,
        text: freshnessText('Sector', freshness.sector, data?.sector_leadership_updated_at, data?.sector_leadership?.date, 'menunggu penutupan bursa')
      }
    ];

    entries.forEach(entry => {
      const chip = document.createElement('span');
      chip.className = `is-${entry.state}`;
      chip.textContent = entry.text;
      host.appendChild(chip);
    });
  }

  async function refresh() {
    try {
      const response = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.ok) return;

      const freshness = resolveFreshness(data);
      const environment = data?.market_environment || fallbackEnvironment(data, freshness);

      renderRupiah(data?.market_pulse?.rupiah, data?.rupiah_updated_at, freshness.rupiah);
      renderSector(data?.sector_leadership, data?.sector_leadership_updated_at, freshness.sector);
      renderEnvironment(environment, freshness);
      renderFreshnessSummary(data, freshness);
    } catch {
      /* Existing page content stays visible if the context API is temporarily unavailable. */
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(refresh, 300);
  } else {
    window.addEventListener('load', function () {
      setTimeout(refresh, 700);
    });
  }
})();
