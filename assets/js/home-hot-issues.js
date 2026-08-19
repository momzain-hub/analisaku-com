/* Analisaku Home — Hot Issues / Risk Overlay */
(function () {
  if (!document.body?.classList.contains('home-market')) return;

  const envBox = document.querySelector('.market-environment');
  if (!envBox || document.querySelector('.hot-issues-panel')) return;

  const panel = document.createElement('div');
  panel.className = 'hot-issues-panel';
  panel.innerHTML = `
    <div class="hot-issues-head">
      <div>
        <small>HOT ISSUES / RISK OVERLAY</small>
        <h3>Risiko global yang perlu dipantau.</h3>
      </div>
      <p>Isu global berfungsi sebagai risk overlay dan tidak otomatis menentukan Global Sentiment.</p>
    </div>
    <div class="hot-issues-grid" id="hotIssuesGrid">
      <div class="hot-issues-empty">Memuat risk overlay…</div>
    </div>
  `;

  envBox.insertAdjacentElement('afterend', panel);

  const grid = document.getElementById('hotIssuesGrid');

  function endpoint() {
    const api = String(window.ANALISAKU_SIGNAL_API || '');
    if (!api) return '';

    try {
      const url = new URL(api);
      url.pathname = '/market-context';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch (e) {
      return '';
    }
  }

  function clean(value, fallback = '—') {
    const text = String(value || '').trim();
    return text || fallback;
  }

  function render(items) {
    if (!grid) return;

    const issues = Array.isArray(items)
      ? items.slice(0, 3)
      : [];

    if (!issues.length) {
      grid.innerHTML =
        '<div class="hot-issues-empty">No major global risk escalation detected.</div>';
      return;
    }

    grid.innerHTML = '';

    issues.forEach(issue => {
      const card = document.createElement('article');
      card.className = 'hot-issue-card';

      const top = document.createElement('div');
      top.className = 'hot-issue-top';

      const category = document.createElement('small');
      category.textContent = clean(issue?.category).toUpperCase();

      const risk = document.createElement('span');
      risk.className = 'hot-risk';
      risk.dataset.risk = clean(issue?.risk, 'MODERATE').toUpperCase();
      risk.textContent = risk.dataset.risk;

      const title = document.createElement('strong');
      title.textContent = clean(issue?.title);

      top.append(category, risk);
      card.append(top, title);
      grid.appendChild(card);
    });
  }

  const url = endpoint();

  if (!url) {
    render([]);
    return;
  }

  fetch(url, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => render(data?.hot_issues))
    .catch(() => {
      if (grid) {
        grid.innerHTML =
          '<div class="hot-issues-empty">Risk overlay belum dapat dimuat.</div>';
      }
    });
})();
