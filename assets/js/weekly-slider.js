/* Analisaku Weekly Outlook — slide by week + show all */
(function () {
  const scriptSrc = document.currentScript?.src || location.href;
  const dataUrl = new URL('../data/weekly-outlook.json', scriptSrc).href;

  let data = null;
  let currentIndex = 0;
  let allMode = false;

  function jakartaToday() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initialWeekIndex(weeks, today) {
    const active = weeks.findIndex(w => today >= w.start && today <= w.end);
    if (active >= 0) return active;
    const upcoming = weeks.findIndex(w => today < w.start);
    return upcoming >= 0 ? upcoming : Math.max(0, weeks.length - 1);
  }

  function monthTitle(weeks) {
    const start = weeks?.[0]?.start;
    if (!start) return 'IHSG OUTLOOK';
    try {
      return new Date(`${start}T12:00:00+07:00`).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
    } catch (_) {
      return 'IHSG OUTLOOK';
    }
  }

  function dayMarkup(day, today) {
    const isToday = day.date === today;
    const classes = ['weekly-day'];
    if (day.key) classes.push('key-window');
    if (day.closed) classes.push('market-closed');
    if (isToday) classes.push('is-today');

    const badge = isToday
      ? (day.closed ? 'TODAY • MARKET CLOSED' : day.key ? 'TODAY • ◆ KEY WINDOW' : 'TODAY')
      : day.closed ? 'MARKET CLOSED' : day.key ? '◆ KEY WINDOW' : '';

    return `
      <article class="${classes.join(' ')}">
        <div class="weekly-day-top">
          <strong>${escapeHtml(day.label)}${day.key ? ' ◆' : ''}</strong>
          ${badge ? `<span>${escapeHtml(badge)}</span>` : ''}
        </div>
        <p>${escapeHtml(day.text)}</p>
      </article>`;
  }

  function ensureToolbar(weeks) {
    const shell = document.querySelector('.weekly-shell');
    const head = shell?.querySelector('.weekly-head');
    if (!shell || !head) return null;

    let toolbar = shell.querySelector('.weekly-slider-toolbar');
    if (toolbar) return toolbar;

    toolbar = document.createElement('div');
    toolbar.className = 'weekly-slider-toolbar';
    toolbar.innerHTML = `
      <div class="weekly-slider-nav" aria-label="Navigasi Weekly Outlook">
        <button class="weekly-nav-btn" id="weeklyPrev" type="button" aria-label="Minggu sebelumnya">←</button>
        <div class="weekly-week-tabs" id="weeklyWeekTabs">
          ${weeks.map((week, index) => `
            <button class="weekly-tab" type="button" data-week-index="${index}" aria-label="${escapeHtml(week.label)} ${escapeHtml(week.display_range)}">
              ${escapeHtml(week.label.replace('WEEK ', 'W'))}
            </button>`).join('')}
        </div>
        <button class="weekly-nav-btn" id="weeklyNext" type="button" aria-label="Minggu berikutnya">→</button>
      </div>
      <button class="weekly-view-toggle" id="weeklyViewToggle" type="button">Tampilkan Semua</button>`;

    head.insertAdjacentElement('afterend', toolbar);

    toolbar.querySelector('#weeklyPrev')?.addEventListener('click', () => {
      if (allMode || currentIndex <= 0) return;
      currentIndex -= 1;
      renderWeek();
    });

    toolbar.querySelector('#weeklyNext')?.addEventListener('click', () => {
      if (allMode || currentIndex >= weeks.length - 1) return;
      currentIndex += 1;
      renderWeek();
    });

    toolbar.querySelectorAll('[data-week-index]').forEach(button => {
      button.addEventListener('click', () => {
        currentIndex = Number(button.dataset.weekIndex) || 0;
        allMode = false;
        renderWeek();
      });
    });

    toolbar.querySelector('#weeklyViewToggle')?.addEventListener('click', () => {
      allMode = !allMode;
      if (allMode) renderAll();
      else renderWeek();
    });

    return toolbar;
  }

  function updateToolbar() {
    const toolbar = document.querySelector('.weekly-slider-toolbar');
    if (!toolbar || !data) return;

    const prev = toolbar.querySelector('#weeklyPrev');
    const next = toolbar.querySelector('#weeklyNext');
    const toggle = toolbar.querySelector('#weeklyViewToggle');

    if (prev) prev.disabled = allMode || currentIndex <= 0;
    if (next) next.disabled = allMode || currentIndex >= data.weeks.length - 1;
    if (toggle) {
      toggle.textContent = allMode ? 'Kembali ke Mingguan' : 'Tampilkan Semua';
      toggle.classList.toggle('is-active', allMode);
    }

    toolbar.querySelectorAll('[data-week-index]').forEach(button => {
      const active = !allMode && Number(button.dataset.weekIndex) === currentIndex;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  function setHeader(week) {
    const range = document.getElementById('weeklyRange');
    const bias = document.getElementById('weeklyBias');
    const call = document.getElementById('weeklyCall');
    const strategy = document.getElementById('weeklyStrategy');
    const legend = document.getElementById('weeklyLegend');

    if (range) range.textContent = week.display_range;
    if (bias) bias.textContent = week.bias;
    if (call) call.textContent = week.weekly_call;
    if (strategy) strategy.textContent = week.strategy;
    if (legend) legend.textContent = data.symbol_legend || '◆ = Key Timing Window';
  }

  function renderWeek() {
    if (!data?.weeks?.length) return;
    allMode = false;
    currentIndex = Math.min(Math.max(currentIndex, 0), data.weeks.length - 1);

    const shell = document.querySelector('.weekly-shell');
    const host = document.getElementById('weeklyOutlook');
    const foot = shell?.querySelector('.weekly-foot');
    if (!shell || !host) return;

    const week = data.weeks[currentIndex];
    const today = jakartaToday();

    shell.classList.remove('is-all-weeks');
    host.classList.remove('weekly-all-mode');
    if (foot) foot.hidden = false;
    setHeader(week);

    host.innerHTML = week.days.map(day => dayMarkup(day, today)).join('');
    host.classList.remove('weekly-slide-in');
    void host.offsetWidth;
    host.classList.add('weekly-slide-in');

    updateToolbar();
  }

  function allWeekMarkup(week, index, today) {
    const active = index === initialWeekIndex(data.weeks, today);
    return `
      <section class="weekly-all-card${active ? ' is-current-week' : ''}">
        <div class="weekly-all-head">
          <div>
            <small>${escapeHtml(week.label)}</small>
            <strong>${escapeHtml(week.display_range)}</strong>
          </div>
          <div class="weekly-all-bias">
            <span>BIAS</span>
            <b>${escapeHtml(week.bias)}</b>
          </div>
        </div>
        <div class="weekly-all-days">
          ${week.days.map(day => dayMarkup(day, today)).join('')}
        </div>
        <div class="weekly-all-foot">
          <div><small>WEEKLY CALL</small><strong>${escapeHtml(week.weekly_call)}</strong></div>
          <div><small>STRATEGY</small><strong>${escapeHtml(week.strategy)}</strong></div>
        </div>
      </section>`;
  }

  function renderAll() {
    if (!data?.weeks?.length) return;
    allMode = true;

    const shell = document.querySelector('.weekly-shell');
    const host = document.getElementById('weeklyOutlook');
    const foot = shell?.querySelector('.weekly-foot');
    const range = document.getElementById('weeklyRange');
    const bias = document.getElementById('weeklyBias');
    if (!shell || !host) return;

    shell.classList.add('is-all-weeks');
    host.classList.add('weekly-all-mode');
    if (foot) foot.hidden = true;
    if (range) range.textContent = monthTitle(data.weeks);
    if (bias) bias.textContent = 'ALL WEEKS';

    const today = jakartaToday();
    host.innerHTML = data.weeks.map((week, index) => allWeekMarkup(week, index, today)).join('');
    updateToolbar();
  }

  function bindSwipe() {
    const host = document.getElementById('weeklyOutlook');
    if (!host || host.dataset.swipeBound === '1') return;
    host.dataset.swipeBound = '1';

    let startX = null;
    host.addEventListener('touchstart', event => {
      if (allMode) return;
      startX = event.changedTouches?.[0]?.clientX ?? null;
    }, { passive: true });

    host.addEventListener('touchend', event => {
      if (allMode || startX === null) return;
      const endX = event.changedTouches?.[0]?.clientX ?? startX;
      const delta = endX - startX;
      startX = null;
      if (Math.abs(delta) < 50) return;
      if (delta < 0 && currentIndex < data.weeks.length - 1) {
        currentIndex += 1;
        renderWeek();
      } else if (delta > 0 && currentIndex > 0) {
        currentIndex -= 1;
        renderWeek();
      }
    }, { passive: true });
  }

  async function init() {
    const shell = document.querySelector('.weekly-shell');
    if (!shell || shell.dataset.sliderReady === '1') return;

    try {
      const response = await fetch(dataUrl, { cache: 'no-store' });
      if (!response.ok) return;
      data = await response.json();
      if (!Array.isArray(data?.weeks) || !data.weeks.length) return;

      currentIndex = initialWeekIndex(data.weeks, jakartaToday());
      ensureToolbar(data.weeks);
      bindSwipe();
      shell.dataset.sliderReady = '1';
      renderWeek();

      // Re-assert after the legacy renderer finishes, preventing a fetch race.
      setTimeout(() => {
        if (allMode) renderAll();
        else renderWeek();
      }, 900);
    } catch (_) {
      /* Existing weekly view remains as fallback. */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 250));
  } else {
    setTimeout(init, 250);
  }
})();
