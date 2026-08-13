/* Analisaku 20-Stock Signal Monitor */
(function(){
  const anchor=document.getElementById('decisionPanel');
  if(!anchor)return;

  const moduleSrc=document.currentScript?.src||location.href;
  if(!document.querySelector('link[href*="signal-monitor.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=new URL('../css/signal-monitor.css',moduleSrc).href;
    document.head.appendChild(link);
  }

  const symbols=['RAJA','BBCA','BMRI','BBRI','BBNI','TLKM','ASII','ANTM','AMMN','MDKA','TPIA','BUMI','BRMS','ADRO','PGAS','INCO','UNTR','ICBP','ITMG','GOTO'];
  const tf='1D';
  const rank={'BUY SETUP':1,'HOLD':2,'WATCH':3,'TAKE PROFIT':4,'EXIT':5,'WAIT':6};
  let api='';
  let rows=[];
  let filter='ALL';

  const section=document.createElement('section');
  section.className='signal-monitor';
  section.id='signalMonitor';
  section.innerHTML=`
    <div class="signal-monitor-head">
      <div>
        <div class="kicker">20-STOCK SIGNAL MONITOR</div>
        <h3>Market Watch <small>1D</small></h3>
        <p>Ringkasan output Signal Hub. Klik saham untuk membuka Decision Panel dan chart.</p>
      </div>
      <button type="button" class="signal-refresh" id="signalMonitorRefresh">Refresh</button>
    </div>
    <div class="signal-summary" id="signalSummary"></div>
    <div class="signal-filters" id="signalFilters"></div>
    <div class="signal-monitor-meta" id="signalMonitorMeta">Memuat 20 saham…</div>
    <div class="signal-table-wrap">
      <table class="signal-table">
        <thead><tr><th>Ticker</th><th>Trend</th><th>Status</th><th>Trigger</th><th>Entry</th><th>Updated</th></tr></thead>
        <tbody id="signalMonitorBody"></tbody>
      </table>
    </div>`;
  anchor.insertAdjacentElement('afterend',section);

  const $=id=>document.getElementById(id);
  const fmt=v=>{
    if(v===undefined||v===null||v==='')return '—';
    const n=Number(v);
    return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v);
  };
  const entry=d=>(d.entry_low||d.entry_high)?`${fmt(d.entry_low)} – ${fmt(d.entry_high)}`:'—';
  const statusClass=s=>'s-'+String(s||'WAIT').toLowerCase().replace(/\s+/g,'-');
  const updated=d=>{
    const ts=Number(d.received_at||d.updated_at);
    return Number.isFinite(ts)?new Date(ts).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'—';
  };

  function renderSummary(){
    const statuses=['BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
    const host=$('signalSummary');
    host.innerHTML=statuses.map(s=>{
      const count=rows.filter(r=>r.data&&String(r.data.status).toUpperCase()===s).length;
      return `<button type="button" data-filter="${s}" class="signal-summary-card ${statusClass(s)}"><span>${s}</span><strong>${count}</strong></button>`;
    }).join('');
    [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderFilters();renderTable()}));
  }

  function renderFilters(){
    const host=$('signalFilters');
    const filters=['ALL','BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
    host.innerHTML=filters.map(f=>`<button type="button" data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('');
    [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderFilters();renderTable()}));
  }

  function renderTable(){
    const body=$('signalMonitorBody');
    let view=rows.slice().sort((a,b)=>{
      const ar=a.data?rank[String(a.data.status||'WAIT').toUpperCase()]||99:99;
      const br=b.data?rank[String(b.data.status||'WAIT').toUpperCase()]||99:99;
      return ar-br||a.symbol.localeCompare(b.symbol);
    });
    if(filter!=='ALL')view=view.filter(r=>r.data&&String(r.data.status||'').toUpperCase()===filter);

    body.innerHTML=view.map(r=>{
      if(!r.data)return `<tr class="signal-row unavailable" data-symbol="${r.symbol}"><td><b>${r.symbol}</b></td><td>—</td><td><span class="signal-pill">NO DATA</span></td><td>—</td><td>—</td><td>—</td></tr>`;
      const d=r.data;
      const s=String(d.status||'WAIT').toUpperCase();
      return `<tr class="signal-row" data-symbol="${r.symbol}">
        <td><b>${r.symbol}</b></td>
        <td>${String(d.trend||'NEUTRAL').toUpperCase()}</td>
        <td><span class="signal-pill ${statusClass(s)}">${s}</span></td>
        <td>${fmt(d.trigger)}</td>
        <td>${entry(d)}</td>
        <td>${updated(d)}</td>
      </tr>`;
    }).join('')||'<tr><td colspan="6" class="signal-empty">Tidak ada saham untuk filter ini.</td></tr>';

    [...body.querySelectorAll('.signal-row:not(.unavailable)')].forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
  }

  function openSymbol(symbol){
    const ticker=document.getElementById('tvTicker');
    const interval=document.getElementById('tvInterval');
    const apply=document.getElementById('tvApply');
    if(ticker)ticker.value=symbol;
    if(interval)interval.value='D';
    if(apply)apply.click();
    document.getElementById('tradingview-chart')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function ensureApi(){
    if(window.ANALISAKU_SIGNAL_API){api=String(window.ANALISAKU_SIGNAL_API);return}
    await new Promise(resolve=>{
      const s=document.createElement('script');
      s.src=new URL('signal-config.js',moduleSrc).href;
      s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);
    });
    api=String(window.ANALISAKU_SIGNAL_API||'');
  }

  async function load(){
    await ensureApi();
    if(!api){$('signalMonitorMeta').textContent='Signal API belum tersedia.';return}
    $('signalMonitorMeta').textContent='Mengambil snapshot 20 saham…';
    const results=await Promise.all(symbols.map(async symbol=>{
      try{
        const url=new URL(api);url.searchParams.set('ticker',symbol);url.searchParams.set('timeframe',tf);
        const res=await fetch(url,{cache:'no-store'});
        if(!res.ok)return {symbol,data:null};
        const body=await res.json();
        return {symbol,data:body.data||body};
      }catch(e){return {symbol,data:null}}
    }));
    rows=results;
    const available=rows.filter(r=>r.data).length;
    const latest=Math.max(0,...rows.map(r=>Number(r.data?.received_at||r.data?.updated_at)||0));
    $('signalMonitorMeta').textContent=`${available}/20 snapshot tersedia`+(latest?` • update terakhir ${new Date(latest).toLocaleString('id-ID')}`:'');
    renderSummary();renderFilters();renderTable();
  }

  $('signalMonitorRefresh').addEventListener('click',load);
  renderFilters();
  load();
  setInterval(load,60000);
})();
