/* Analisaku 20-Stock Signal Monitor V2 */
(function(){
  function bootMonitor(){
    const anchor=document.getElementById('decisionPanel');
    if(!anchor){setTimeout(bootMonitor,250);return;}
    if(document.getElementById('signalMonitor'))return;
    initMonitor(anchor);
  }

  function initMonitor(anchor){
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
    const trendRank={'BULLISH':1,'NEUTRAL':2,'BEARISH':3};
    const CHANGE_TTL=12*60*60*1000;
    const MEMORY_KEY='analisaku-signal-monitor-v2';
    let api='';
    let rows=[];
    let filter='ALL';
    let bullishOnly=false;

    const section=document.createElement('section');
    section.className='signal-monitor';
    section.id='signalMonitor';
    section.innerHTML=`
      <div class="signal-monitor-head">
        <div>
          <div class="kicker">20-STOCK SIGNAL MONITOR • V2</div>
          <h3>Market Watch <small>1D</small></h3>
          <p>Prioritas otomatis berdasarkan status. Klik saham untuk membuka Decision Panel dan chart.</p>
        </div>
        <button type="button" class="signal-refresh" id="signalMonitorRefresh">Refresh</button>
      </div>
      <div class="signal-summary" id="signalSummary"></div>
      <div class="signal-toolbar">
        <div class="signal-filters" id="signalFilters"></div>
        <button type="button" class="signal-bullish-toggle" id="signalBullishToggle" aria-pressed="false">Bullish only</button>
      </div>
      <div class="signal-monitor-meta" id="signalMonitorMeta">Memuat 20 saham…</div>
      <div class="signal-table-wrap">
        <table class="signal-table">
          <thead><tr><th>Ticker</th><th>Trend</th><th>Status</th><th>Trigger</th><th>Entry</th><th>Invalidation</th><th>Target 1</th><th>Updated</th></tr></thead>
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
    const signalTs=d=>Number(d?.received_at||d?.updated_at)||0;
    const updated=d=>{
      const ts=signalTs(d);
      if(!ts)return '—';
      const date=new Date(ts);
      const today=new Date();
      const sameDay=date.toDateString()===today.toDateString();
      return sameDay
        ? date.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})
        : date.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit'})+' '+date.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    };

    function loadMemory(){
      try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'{}')||{}}
      catch(e){return {}}
    }
    function saveMemory(memory){
      try{localStorage.setItem(MEMORY_KEY,JSON.stringify(memory))}catch(e){}
    }
    function detectStatusChanges(resultRows){
      const memory=loadMemory();
      const now=Date.now();
      resultRows.forEach(row=>{
        row.changed=false;
        row.previousStatus='';
        if(!row.data)return;
        const status=String(row.data.status||'WAIT').toUpperCase();
        const receivedAt=signalTs(row.data);
        const old=memory[row.symbol];
        let changedAt=Number(old?.changedAt)||0;

        if(old&&old.status&&old.status!==status&&receivedAt>=(Number(old.receivedAt)||0)){
          changedAt=now;
          row.previousStatus=old.status;
        }

        if(changedAt&&now-changedAt<CHANGE_TTL)row.changed=true;
        else if(changedAt)changedAt=0;

        memory[row.symbol]={status,receivedAt,changedAt};
      });
      saveMemory(memory);
    }

    function renderSummary(){
      const statuses=['BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
      const host=$('signalSummary');
      host.innerHTML=statuses.map(s=>{
        const count=rows.filter(r=>r.data&&String(r.data.status).toUpperCase()===s).length;
        return `<button type="button" data-filter="${s}" class="signal-summary-card ${statusClass(s)} ${filter===s?'active':''}"><span>${s}</span><strong>${count}</strong></button>`;
      }).join('');
      [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{
        filter=filter===b.dataset.filter?'ALL':b.dataset.filter;
        renderSummary();renderFilters();renderTable();
      }));
    }

    function renderFilters(){
      const host=$('signalFilters');
      const filters=['ALL','BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
      host.innerHTML=filters.map(f=>`<button type="button" data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('');
      [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{
        filter=b.dataset.filter;renderSummary();renderFilters();renderTable();
      }));
      const toggle=$('signalBullishToggle');
      if(toggle){
        toggle.classList.toggle('active',bullishOnly);
        toggle.setAttribute('aria-pressed',String(bullishOnly));
      }
    }

    function renderTable(){
      const body=$('signalMonitorBody');
      let view=rows.slice().sort((a,b)=>{
        const ar=a.data?rank[String(a.data.status||'WAIT').toUpperCase()]||99:99;
        const br=b.data?rank[String(b.data.status||'WAIT').toUpperCase()]||99:99;
        if(ar!==br)return ar-br;
        const at=a.data?trendRank[String(a.data.trend||'NEUTRAL').toUpperCase()]||99:99;
        const bt=b.data?trendRank[String(b.data.trend||'NEUTRAL').toUpperCase()]||99:99;
        if(at!==bt)return at-bt;
        if(Boolean(a.changed)!==Boolean(b.changed))return a.changed?-1:1;
        return signalTs(b.data)-signalTs(a.data)||a.symbol.localeCompare(b.symbol);
      });

      if(filter!=='ALL')view=view.filter(r=>r.data&&String(r.data.status||'').toUpperCase()===filter);
      if(bullishOnly)view=view.filter(r=>r.data&&String(r.data.trend||'').toUpperCase()==='BULLISH');

      body.innerHTML=view.map(r=>{
        if(!r.data)return `<tr class="signal-row unavailable" data-symbol="${r.symbol}"><td><b>${r.symbol}</b></td><td>—</td><td><span class="signal-pill">NO DATA</span></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
        const d=r.data;
        const s=String(d.status||'WAIT').toUpperCase();
        const trend=String(d.trend||'NEUTRAL').toUpperCase();
        const changeBadge=r.changed?'<span class="signal-change-badge">STATUS BARU</span>':'';
        return `<tr class="signal-row ${r.changed?'signal-changed':''}" data-symbol="${r.symbol}">
          <td><div class="signal-ticker-cell"><b>${r.symbol}</b>${changeBadge}</div></td>
          <td><span class="signal-trend ${trend.toLowerCase()}">${trend}</span></td>
          <td><span class="signal-pill ${statusClass(s)}">${s}</span></td>
          <td>${fmt(d.trigger)}</td>
          <td>${entry(d)}</td>
          <td>${fmt(d.invalidation)}</td>
          <td>${fmt(d.target1)}</td>
          <td>${updated(d)}</td>
        </tr>`;
      }).join('')||'<tr><td colspan="8" class="signal-empty">Tidak ada saham untuk filter ini.</td></tr>';

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

      detectStatusChanges(results);
      rows=results;
      const available=rows.filter(r=>r.data).length;
      const changed=rows.filter(r=>r.changed).length;
      const latest=Math.max(0,...rows.map(r=>signalTs(r.data)));
      $('signalMonitorMeta').textContent=`${available}/20 snapshot tersedia`+
        (changed?` • ${changed} perubahan status baru`:'')+
        (latest?` • update terakhir ${new Date(latest).toLocaleString('id-ID')}`:'');
      renderSummary();renderFilters();renderTable();
    }

    $('signalMonitorRefresh').addEventListener('click',load);
    $('signalBullishToggle').addEventListener('click',()=>{
      bullishOnly=!bullishOnly;renderFilters();renderTable();
    });
    renderFilters();
    load();
    setInterval(load,60000);
  }

  bootMonitor();
})();
