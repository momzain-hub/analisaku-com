/* Analisaku 20-Stock Signal Monitor V2 + Golden Cross Radar */
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
    let gcPayload=null;
    let gcFilter='ALL_GC';

    const gcSection=document.createElement('section');
    gcSection.className='signal-monitor golden-cross-radar';
    gcSection.id='goldenCrossRadar';
    gcSection.innerHTML=`
      <div class="signal-monitor-head">
        <div>
          <div class="kicker">GOLDEN CROSS RADAR • V2</div>
          <h3>Golden Cross <small>1D</small></h3>
          <p>Daftar saham EMA 12/36 dan MA 12/36 yang masih golden cross. Fresh = cross baru ≤3 bar; Recent = 4–10 bar; Active = >10 bar.</p>
        </div>
        <button type="button" class="signal-refresh" id="gcRefresh">Refresh</button>
      </div>
      <div class="gc-summary" id="gcSummary"></div>
      <div class="signal-toolbar gc-toolbar">
        <div class="signal-filters" id="gcFilters"></div>
        <div class="gc-legend"><span class="gc-dot fresh"></span>Fresh <span class="gc-dot recent"></span>Recent <span class="gc-dot active"></span>Active</div>
      </div>
      <div class="signal-monitor-meta" id="gcMeta">Memuat Golden Cross Radar…</div>
      <div class="signal-table-wrap">
        <table class="signal-table gc-table">
          <thead><tr><th>Ticker</th><th>Score</th><th>Radar</th><th>EMA 12/36</th><th>MA 12/36</th><th>Double GC</th><th>RVOL</th><th>Decision</th></tr></thead>
          <tbody id="gcBody"></tbody>
        </table>
      </div>`;
    anchor.insertAdjacentElement('afterend',gcSection);

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
    gcSection.insertAdjacentElement('afterend',section);

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
    const bool=v=>v===true||String(v).toLowerCase()==='true'||String(v)==='1';
    const gcState=v=>String(v||'OFF').toUpperCase();
    const gcStateClass=v=>'gc-'+gcState(v).toLowerCase();
    const gcCell=(state,age)=>{
      const s=gcState(state);
      if(s==='OFF')return '<span class="gc-state gc-off">OFF</span>';
      const n=Number(age);
      const ageText=Number.isFinite(n)&&n<9999?`<small>${n} bar</small>`:'';
      return `<span class="gc-state ${gcStateClass(s)}"><b>${s}</b>${ageText}</span>`;
    };
    const scoreCell=d=>{
      const score=Number(d?.score)||0;
      const delta=Number(d?.score_delta)||0;
      const sign=delta>0?'+':'';
      const cls=delta>0?'up':delta<0?'down':'flat';
      return `<div class="gc-score"><b>${score}</b><small class="${cls}">${sign}${delta}</small></div>`;
    };
    const radarClass=s=>'r-'+String(s||'AVOID').toLowerCase();

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
          <td>${fmt(d.trigger)}</td><td>${entry(d)}</td><td>${fmt(d.invalidation)}</td><td>${fmt(d.target1)}</td><td>${updated(d)}</td>
        </tr>`;
      }).join('')||'<tr><td colspan="8" class="signal-empty">Tidak ada saham untuk filter ini.</td></tr>';
      [...body.querySelectorAll('.signal-row:not(.unavailable)')].forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
    }

    function gcAll(){
      if(!gcPayload)return [];
      const map=new Map();
      [...(gcPayload.ema_gc||[]),...(gcPayload.sma_gc||[])].forEach(d=>map.set(d.ticker,d));
      return [...map.values()].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||(Number(a.rank)||999)-(Number(b.rank)||999));
    }
    function gcView(){
      if(!gcPayload)return [];
      const source={
        ALL_GC:gcAll(),
        DOUBLE_FRESH:gcPayload.double_fresh||[],
        DOUBLE_GC:gcPayload.double_gc||[],
        EMA_GC:gcPayload.ema_gc||[],
        SMA_GC:gcPayload.sma_gc||[],
        FRESH_GC:gcPayload.fresh_gc||[]
      }[gcFilter]||gcAll();
      return source.slice().sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||(Number(a.rank)||999)-(Number(b.rank)||999));
    }
    function renderGcSummary(){
      const host=$('gcSummary');
      if(!host)return;
      const s=gcPayload?.summary||{};
      const cards=[
        ['DOUBLE_FRESH','DOUBLE FRESH',Number(s.double_fresh)||0],
        ['DOUBLE_GC','DOUBLE GC',Number(s.double_gc)||0],
        ['EMA_GC','EMA GC',Number(s.ema_gc)||0],
        ['SMA_GC','MA GC',Number(s.sma_gc)||0],
        ['FRESH_GC','FRESH GC',Number(s.fresh_gc)||0]
      ];
      host.innerHTML=cards.map(([key,label,count])=>`<button type="button" data-gc-filter="${key}" class="gc-summary-card ${gcFilter===key?'active':''}"><span>${label}</span><strong>${count}</strong></button>`).join('');
      [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{
        gcFilter=gcFilter===b.dataset.gcFilter?'ALL_GC':b.dataset.gcFilter;
        renderGcSummary();renderGcFilters();renderGcTable();
      }));
    }
    function renderGcFilters(){
      const host=$('gcFilters');
      if(!host)return;
      const filters=[['ALL_GC','ALL GC'],['DOUBLE_GC','DOUBLE GC'],['EMA_GC','EMA GC'],['SMA_GC','MA GC'],['FRESH_GC','FRESH GC'],['DOUBLE_FRESH','DOUBLE FRESH']];
      host.innerHTML=filters.map(([key,label])=>`<button type="button" data-gc-filter="${key}" class="${gcFilter===key?'active':''}">${label}</button>`).join('');
      [...host.querySelectorAll('button')].forEach(b=>b.addEventListener('click',()=>{
        gcFilter=b.dataset.gcFilter;renderGcSummary();renderGcFilters();renderGcTable();
      }));
    }
    function renderGcTable(){
      const body=$('gcBody');
      if(!body)return;
      const view=gcView();
      body.innerHTML=view.map(d=>{
        const ticker=String(d.ticker||'');
        const radar=String(d.radar_status||'AVOID').toUpperCase();
        const decision=String(d.status||'WAIT').toUpperCase();
        const rvol=Number(d.rvol);
        return `<tr class="signal-row gc-row" data-symbol="${ticker}">
          <td><b>${ticker}</b></td>
          <td>${scoreCell(d)}</td>
          <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
          <td>${gcCell(d.ema_gc,d.ema_gc_age)}</td>
          <td>${gcCell(d.sma_gc,d.sma_gc_age)}</td>
          <td>${bool(d.double_gc)?'<span class="gc-double">DOUBLE</span>':'—'}</td>
          <td>${Number.isFinite(rvol)?rvol.toFixed(2)+'×':'—'}</td>
          <td><span class="signal-pill ${statusClass(decision)}">${decision}</span></td>
        </tr>`;
      }).join('')||'<tr><td colspan="8" class="signal-empty">Belum ada saham pada kategori Golden Cross ini.</td></tr>';
      [...body.querySelectorAll('.gc-row')].forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
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
    function technicalEndpoint(){
      const url=new URL(api);
      url.pathname=url.pathname.replace(/\/signal\/?$/,'/technical');
      url.search='';
      url.searchParams.set('timeframe',tf);
      return url;
    }

    async function loadGoldenCross(){
      await ensureApi();
      if(!api){$('gcMeta').textContent='Signal API belum tersedia.';return}
      $('gcMeta').textContent='Mengambil daftar Golden Cross…';
      try{
        const res=await fetch(technicalEndpoint(),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        gcPayload=await res.json();
        const s=gcPayload.summary||{};
        const ts=Number(gcPayload.updated_at)||0;
        $('gcMeta').textContent=`${Number(s.total)||0} saham dipantau • Double GC ${Number(s.double_gc)||0} • EMA GC ${Number(s.ema_gc)||0} • MA GC ${Number(s.sma_gc)||0}`+(ts?` • update ${new Date(ts).toLocaleString('id-ID')}`:'');
        renderGcSummary();renderGcFilters();renderGcTable();
      }catch(e){
        $('gcMeta').textContent='Golden Cross Radar belum dapat dimuat. Coba Refresh.';
      }
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
      $('signalMonitorMeta').textContent=`${available}/20 snapshot tersedia`+(changed?` • ${changed} perubahan status baru`:'')+(latest?` • update terakhir ${new Date(latest).toLocaleString('id-ID')}`:'');
      renderSummary();renderFilters();renderTable();
    }

    $('signalMonitorRefresh').addEventListener('click',load);
    $('gcRefresh').addEventListener('click',loadGoldenCross);
    $('signalBullishToggle').addEventListener('click',()=>{
      bullishOnly=!bullishOnly;renderFilters();renderTable();
    });
    renderFilters();renderGcFilters();
    loadGoldenCross();load();
    setInterval(()=>{loadGoldenCross();load();},60000);
  }

  bootMonitor();
})();
