/* Analisaku public Technical Monitor V2 */
(function(){
  function boot(){
    const anchor=document.getElementById('decisionPanel');
    if(!anchor){setTimeout(boot,250);return;}
    if(document.getElementById('signalMonitor'))return;
    init(anchor);
  }

  function init(anchor){
    const moduleSrc=document.currentScript?.src||location.href;
    if(!document.querySelector('link[href*="signal-monitor.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=new URL('../css/signal-monitor.css',moduleSrc).href;
      document.head.appendChild(link);
    }

    const tf='1D';
    const decisionRank={'BUY SETUP':1,'HOLD':2,'WATCH':3,'TAKE PROFIT':4,'EXIT':5,'WAIT':6};
    const trendRank={'BULLISH':1,'NEUTRAL':2,'BEARISH':3};
    let api='';
    let rows=[];
    let filter='ALL';
    let bullishOnly=false;
    let gcPayload=null;
    let gcFilter='ALL_GC';

    const section=document.createElement('section');
    section.className='signal-monitor';
    section.id='signalMonitor';
    section.innerHTML=`
      <div class="signal-monitor-head">
        <div>
          <div class="kicker">ANALISAKU MARKET RADAR</div>
          <h3>Market Radar <small>1D</small></h3>
          <p>Saham diprioritaskan berdasarkan output Analisaku. Klik saham untuk membuka Decision Panel dan chart.</p>
        </div>
        <button type="button" class="signal-refresh" id="signalMonitorRefresh">Refresh</button>
      </div>
      <div class="market-opportunities-wrap">
        <div class="market-opportunities-head">
          <div><span>TOP OPPORTUNITIES</span><small>Prioritas output terbaik yang tersedia saat ini.</small></div>
        </div>
        <div class="market-opportunities" id="marketOpportunities"></div>
      </div>
      <div class="signal-summary" id="signalSummary"></div>
      <div class="signal-toolbar">
        <div class="signal-filters" id="signalFilters"></div>
        <button type="button" class="signal-bullish-toggle" id="signalBullishToggle" aria-pressed="false">Bullish only</button>
      </div>
      <div class="market-meta-row">
        <div class="signal-monitor-meta" id="signalMonitorMeta">Memuat radar…</div>
        <span class="data-freshness" id="dataFreshness">CHECKING</span>
      </div>
      <div class="signal-table-wrap">
        <table class="signal-table market-radar-table">
          <thead><tr><th>Ticker</th><th>Score</th><th>Trend</th><th>Radar</th><th>Status</th><th>Trigger</th><th>Entry</th><th>Invalidation</th><th>Target 1</th><th>Updated</th></tr></thead>
          <tbody id="signalMonitorBody"></tbody>
        </table>
      </div>`;
    anchor.insertAdjacentElement('afterend',section);

    const gc=document.createElement('section');
    gc.className='signal-monitor golden-cross-radar';
    gc.id='goldenCrossRadar';
    gc.innerHTML=`
      <div class="signal-monitor-head">
        <div>
          <div class="kicker">ANALISAKU GOLDEN CROSS RADAR</div>
          <h3>Golden Cross <small>1D</small></h3>
          <p>Saham yang terdeteksi memiliki struktur Golden Cross. Parameter dan perhitungan internal tidak ditampilkan.</p>
        </div>
        <button type="button" class="signal-refresh" id="gcRefresh">Refresh</button>
      </div>
      <div class="gc-summary" id="gcSummary"></div>
      <div class="signal-toolbar"><div class="signal-filters" id="gcFilters"></div></div>
      <div class="signal-monitor-meta" id="gcMeta">Memuat Golden Cross Radar…</div>
      <div class="signal-table-wrap">
        <table class="signal-table gc-table">
          <thead><tr><th>Ticker</th><th>Score</th><th>Radar</th><th>EMA Golden Cross</th><th>MA Golden Cross</th><th>Confluence</th><th>Decision</th></tr></thead>
          <tbody id="gcBody"></tbody>
        </table>
      </div>`;
    section.insertAdjacentElement('afterend',gc);

    const $=id=>document.getElementById(id);
    const fmt=v=>{
      if(v===undefined||v===null||v==='')return '—';
      const n=Number(v);
      return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v);
    };
    const statusClass=s=>'s-'+String(s||'WAIT').toLowerCase().replace(/\s+/g,'-');
    const radarClass=s=>'r-'+String(s||'AVOID').toLowerCase();
    const ts=d=>Number(d?.received_at||d?.updated_at)||0;
    const entry=d=>(d.entry_low||d.entry_high)?`${fmt(d.entry_low)} – ${fmt(d.entry_high)}`:'—';
    const updated=d=>{
      const stamp=ts(d);if(!stamp)return '—';
      const date=new Date(stamp),today=new Date();
      return date.toDateString()===today.toDateString()
        ? date.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})
        : date.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit'});
    };
    const bool=v=>v===true||String(v).toLowerCase()==='true'||String(v)==='1';
    const publicGcState=v=>{
      const state=String(v||'OFF').toUpperCase();
      return state==='FRESH'?'BARU':state==='RECENT'?'TERKONFIRMASI':state==='ACTIVE'?'AKTIF':'—';
    };
    const gcStateClass=v=>{
      const state=String(v||'OFF').toUpperCase();
      return state==='FRESH'?'gc-fresh':state==='RECENT'?'gc-recent':state==='ACTIVE'?'gc-active':'gc-off';
    };
    const gcCell=v=>`<span class="gc-state ${gcStateClass(v)}"><b>${publicGcState(v)}</b></span>`;

    function businessDaysElapsed(fromTs,toTs=Date.now()){
      if(!fromTs)return 99;
      const from=new Date(fromTs),to=new Date(toTs);
      const cursor=new Date(from.getFullYear(),from.getMonth(),from.getDate()+1);
      const end=new Date(to.getFullYear(),to.getMonth(),to.getDate());
      let days=0;
      while(cursor<=end){
        const day=cursor.getDay();
        if(day!==0&&day!==6)days+=1;
        cursor.setDate(cursor.getDate()+1);
      }
      return days;
    }

    function freshness(stamp){
      if(!stamp)return {label:'BELUM ADA DATA',className:'stale'};
      const ageHours=Math.max(0,(Date.now()-stamp)/3600000);
      const businessDays=businessDaysElapsed(stamp);
      if(businessDays===0&&ageHours<=36)return {label:'LIVE SNAPSHOT',className:'live'};
      if(businessDays<=1)return {label:'SNAPSHOT TERBARU',className:'current'};
      return {label:'DATA PERLU DIPERBARUI',className:'stale'};
    }

    function byScore(list){
      return list.slice().sort((a,b)=>(Number(b?.score)||0)-(Number(a?.score)||0)||String(a?.ticker||'').localeCompare(String(b?.ticker||'')));
    }

    function renderOpportunities(){
      const host=$('marketOpportunities');if(!host)return;
      const candidates=byScore(rows.map(r=>r.data).filter(Boolean).filter(d=>{
        const radar=String(d.radar_status||'').toUpperCase();
        const status=String(d.status||'').toUpperCase();
        return radar&&radar!=='AVOID'&&status!=='EXIT';
      })).slice(0,3);

      if(!candidates.length){
        host.innerHTML='<div class="opportunity-empty">Belum ada kandidat prioritas pada snapshot saat ini.</div>';
        return;
      }

      host.innerHTML=candidates.map((d,index)=>{
        const ticker=String(d.ticker||'');
        const radar=String(d.radar_status||'').toUpperCase();
        const status=String(d.status||'WAIT').toUpperCase();
        const trend=String(d.trend||'NEUTRAL').toUpperCase();
        return `<button type="button" class="opportunity-card" data-symbol="${ticker}">
          <span class="opportunity-rank">#${index+1}</span>
          <div class="opportunity-main"><b>${ticker}</b><strong>${fmt(d.score)}</strong></div>
          <div class="opportunity-tags"><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span><span class="signal-pill ${statusClass(status)}">${status}</span></div>
          <small>${trend}</small>
        </button>`;
      }).join('');

      host.querySelectorAll('.opportunity-card').forEach(card=>card.addEventListener('click',()=>openSymbol(card.dataset.symbol)));
    }

    function renderSummary(){
      const statuses=['BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
      const host=$('signalSummary');
      host.innerHTML=statuses.map(s=>{
        const count=rows.filter(r=>r.data&&String(r.data.status).toUpperCase()===s).length;
        return `<button type="button" data-filter="${s}" class="signal-summary-card ${statusClass(s)} ${filter===s?'active':''}"><span>${s}</span><strong>${count}</strong></button>`;
      }).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
        filter=filter===b.dataset.filter?'ALL':b.dataset.filter;renderSummary();renderFilters();renderTable();
      }));
    }

    function renderFilters(){
      const host=$('signalFilters');
      const filters=['ALL','BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
      host.innerHTML=filters.map(f=>`<button type="button" data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderSummary();renderFilters();renderTable();}));
      const toggle=$('signalBullishToggle');
      toggle?.classList.toggle('active',bullishOnly);
      toggle?.setAttribute('aria-pressed',String(bullishOnly));
    }

    function renderTable(){
      const body=$('signalMonitorBody');
      let view=rows.slice().sort((a,b)=>{
        const ar=a.data?decisionRank[String(a.data.status||'WAIT').toUpperCase()]||99:99;
        const br=b.data?decisionRank[String(b.data.status||'WAIT').toUpperCase()]||99:99;
        if(ar!==br)return ar-br;
        const scoreDiff=(Number(b.data?.score)||0)-(Number(a.data?.score)||0);
        if(scoreDiff!==0)return scoreDiff;
        const at=a.data?trendRank[String(a.data.trend||'NEUTRAL').toUpperCase()]||99:99;
        const bt=b.data?trendRank[String(b.data.trend||'NEUTRAL').toUpperCase()]||99:99;
        return at-bt||a.symbol.localeCompare(b.symbol);
      });
      if(filter!=='ALL')view=view.filter(r=>r.data&&String(r.data.status||'').toUpperCase()===filter);
      if(bullishOnly)view=view.filter(r=>r.data&&String(r.data.trend||'').toUpperCase()==='BULLISH');

      body.innerHTML=view.map(r=>{
        if(!r.data)return '';
        const d=r.data;
        const s=String(d.status||'WAIT').toUpperCase();
        const trend=String(d.trend||'NEUTRAL').toUpperCase();
        const radar=String(d.radar_status||'—').toUpperCase();
        return `<tr class="signal-row" data-symbol="${r.symbol}">
          <td><b>${r.symbol}</b></td>
          <td><b>${fmt(d.score)}</b></td>
          <td><span class="signal-trend ${trend.toLowerCase()}">${trend}</span></td>
          <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
          <td><span class="signal-pill ${statusClass(s)}">${s}</span></td>
          <td>${fmt(d.trigger)}</td>
          <td>${entry(d)}</td>
          <td>${fmt(d.invalidation)}</td>
          <td>${fmt(d.target1)}</td>
          <td>${updated(d)}</td>
        </tr>`;
      }).join('')||'<tr><td colspan="10" class="signal-empty">Tidak ada saham untuk filter ini.</td></tr>';

      body.querySelectorAll('.signal-row[data-symbol]').forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
    }

    function gcAll(){
      if(!gcPayload)return [];
      const map=new Map();
      [...(gcPayload.ema_gc||[]),...(gcPayload.sma_gc||[])].forEach(d=>map.set(d.ticker,d));
      return byScore([...map.values()]);
    }

    function gcView(){
      if(!gcPayload)return [];
      return byScore(({ALL_GC:gcAll(),DOUBLE_NEW:gcPayload.double_fresh||[],DOUBLE_GC:gcPayload.double_gc||[],EMA_GC:gcPayload.ema_gc||[],SMA_GC:gcPayload.sma_gc||[],NEW_GC:gcPayload.fresh_gc||[]}[gcFilter]||gcAll()));
    }

    function renderGcSummary(){
      const host=$('gcSummary');if(!host)return;
      const s=gcPayload?.summary||{};
      const cards=[['DOUBLE_NEW','DOUBLE BARU',Number(s.double_fresh)||0],['DOUBLE_GC','DOUBLE GC',Number(s.double_gc)||0],['EMA_GC','EMA GC',Number(s.ema_gc)||0],['SMA_GC','MA GC',Number(s.sma_gc)||0],['NEW_GC','GC BARU',Number(s.fresh_gc)||0]];
      host.innerHTML=cards.map(([key,label,count])=>`<button type="button" data-gc-filter="${key}" class="gc-summary-card ${gcFilter===key?'active':''}"><span>${label}</span><strong>${count}</strong></button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{gcFilter=gcFilter===b.dataset.gcFilter?'ALL_GC':b.dataset.gcFilter;renderGcSummary();renderGcFilters();renderGcTable();}));
    }

    function renderGcFilters(){
      const host=$('gcFilters');if(!host)return;
      const filters=[['ALL_GC','ALL GC'],['DOUBLE_GC','DOUBLE GC'],['EMA_GC','EMA GC'],['SMA_GC','MA GC'],['NEW_GC','GC BARU'],['DOUBLE_NEW','DOUBLE BARU']];
      host.innerHTML=filters.map(([key,label])=>`<button type="button" data-gc-filter="${key}" class="${gcFilter===key?'active':''}">${label}</button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{gcFilter=b.dataset.gcFilter;renderGcSummary();renderGcFilters();renderGcTable();}));
    }

    function renderGcTable(){
      const body=$('gcBody');if(!body)return;
      const view=gcView();
      body.innerHTML=view.map(d=>{
        const ticker=String(d.ticker||'');
        const radar=String(d.radar_status||'AVOID').toUpperCase();
        const decision=String(d.status||'WAIT').toUpperCase();
        return `<tr class="signal-row gc-row" data-symbol="${ticker}">
          <td><b>${ticker}</b></td>
          <td><b>${fmt(d.score)}</b></td>
          <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
          <td>${gcCell(d.ema_gc)}</td>
          <td>${gcCell(d.sma_gc)}</td>
          <td>${bool(d.double_gc)?'<span class="gc-double">DOUBLE</span>':'—'}</td>
          <td><span class="signal-pill ${statusClass(decision)}">${decision}</span></td>
        </tr>`;
      }).join('')||'<tr><td colspan="7" class="signal-empty">Belum ada saham pada kategori ini.</td></tr>';
      body.querySelectorAll('.gc-row').forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
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
      if(window.ANALISAKU_SIGNAL_API){api=String(window.ANALISAKU_SIGNAL_API);return;}
      await new Promise(resolve=>{
        const s=document.createElement('script');
        s.src=new URL('signal-config.js',moduleSrc).href;
        s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);
      });
      api=String(window.ANALISAKU_SIGNAL_API||'');
    }

    function endpoint(path){
      const url=new URL(api);
      url.pathname=path;
      url.search='';
      url.hash='';
      url.searchParams.set('timeframe',tf);
      return url;
    }

    async function loadGoldenCross(){
      await ensureApi();
      if(!api){$('gcMeta').textContent='Signal API belum tersedia.';return;}
      try{
        const res=await fetch(endpoint('/technical'),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        gcPayload=await res.json();
        const s=gcPayload.summary||{};
        const stamp=Number(gcPayload.updated_at)||0;
        $('gcMeta').textContent=`${Number(s.total)||0} saham dipantau • Double GC ${Number(s.double_gc)||0} • EMA GC ${Number(s.ema_gc)||0} • MA GC ${Number(s.sma_gc)||0}`+(stamp?` • update ${new Date(stamp).toLocaleString('id-ID')}`:'');
        renderGcSummary();renderGcFilters();renderGcTable();
      }catch(e){
        $('gcMeta').textContent='Golden Cross Radar belum dapat dimuat. Coba Refresh.';
      }
    }

    async function load(){
      await ensureApi();
      if(!api){$('signalMonitorMeta').textContent='Signal API belum tersedia.';return;}
      $('signalMonitorMeta').textContent='Mengambil snapshot market…';
      try{
        const res=await fetch(endpoint('/signals'),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const body=await res.json();
        const signals=Array.isArray(body.signals)?body.signals:[];
        rows=signals.map(data=>({symbol:String(data.ticker||''),data})).filter(r=>r.symbol);
        const latest=Math.max(0,...rows.map(r=>ts(r.data)));
        const fresh=freshness(latest);
        const badge=$('dataFreshness');
        badge.textContent=fresh.label;
        badge.className='data-freshness '+fresh.className;
        $('signalMonitorMeta').textContent=`${rows.length} saham dipantau`+(latest?` • update terakhir ${new Date(latest).toLocaleString('id-ID')}`:'');
        renderOpportunities();renderSummary();renderFilters();renderTable();
      }catch(e){
        rows=[];
        $('signalMonitorMeta').textContent='Market Radar belum dapat dimuat. Coba Refresh.';
        const badge=$('dataFreshness');
        badge.textContent='API ERROR';badge.className='data-freshness stale';
        renderOpportunities();renderSummary();renderFilters();renderTable();
      }
    }

    $('gcRefresh').addEventListener('click',loadGoldenCross);
    $('signalMonitorRefresh').addEventListener('click',load);
    $('signalBullishToggle').addEventListener('click',()=>{bullishOnly=!bullishOnly;renderFilters();renderTable();});
    renderFilters();renderGcFilters();load();loadGoldenCross();
    setInterval(()=>{load();loadGoldenCross();},60000);
  }

  boot();
})();
