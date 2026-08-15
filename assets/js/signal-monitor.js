/* Analisaku public Technical Monitor V2 */
(function(){
  function boot(){
    const anchor=document.getElementById('decisionPanel');
    if(!anchor){setTimeout(boot,250);return;}
    if(document.getElementById('signalMonitor'))return;
    init(anchor);
  }

  function init(anchor){
    const tf='1D';
    const decisionRank={'BUY SETUP':1,'HOLD':2,'WATCH':3,'TAKE PROFIT':4,'EXIT':5,'WAIT':6};
    const trendRank={'BULLISH':1,'NEUTRAL':2,'BEARISH':3};
    const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');

    let rows=[];
    let filter='ALL';
    let entryFilter='ALL';
    let stageFilter='ALL';
    let bullishOnly=false;
    let sortMode='SCORE_DESC';
    let displayLimit=5;
    let gcPayload=null;
    let gcFilter='ALL_GC';
    let gcDisplayLimit=5;

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
        <div class="market-opportunities-head"><div><span>TOP OPPORTUNITIES</span><small>Prioritas output terbaik yang tersedia saat ini.</small></div></div>
        <div class="market-opportunities" id="marketOpportunities"></div>
      </div>

      <div class="signal-summary" id="signalSummary"></div>

      <div class="market-strategy-panel" id="marketStrategyPanel" hidden>
        <div class="market-strategy-head">
          <div><span>ENTRY STYLE</span><small>Breakout Watch, Breakout Confirmed, Pullback, atau Buy on Weakness.</small></div>
          <label class="market-stage-control"><span>Setup Stage</span>
            <select id="marketStageFilter" aria-label="Filter Setup Stage">
              <option value="ALL">Semua tahap</option>
              <option value="EARLY WATCH">Early Watch</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ACTIVE">Active</option>
            </select>
          </label>
        </div>
        <div class="market-entry-filters" id="marketEntryFilters"></div>
      </div>

      <div class="signal-toolbar market-toolbar">
        <div class="signal-filters" id="signalFilters"></div>
        <button type="button" class="signal-bullish-toggle" id="signalBullishToggle" aria-pressed="false">Bullish only</button>
      </div>

      <div class="market-view-bar">
        <div class="market-view-controls">
          <label class="market-control"><span>Urutkan</span>
            <select id="marketSort" aria-label="Urutkan Market Radar">
              <option value="SCORE_DESC" selected>Score tertinggi</option>
              <option value="SCORE_ASC">Score terendah</option>
              <option value="STATUS">Status prioritas</option>
              <option value="TICKER">Ticker A–Z</option>
            </select>
          </label>
          <label class="market-control"><span>Tampilkan</span>
            <select id="marketLimit" aria-label="Jumlah saham Market Radar">
              <option value="5" selected>5 saham</option>
              <option value="10">10 saham</option>
              <option value="20">20 saham</option>
              <option value="50">50 saham</option>
              <option value="ALL">Semua</option>
            </select>
          </label>
        </div>
        <span class="market-view-count" id="marketViewCount">Menampilkan 0 saham</span>
      </div>

      <div class="market-meta-row">
        <div class="signal-monitor-meta" id="signalMonitorMeta">Memuat radar…</div>
        <span class="data-freshness" id="dataFreshness">CHECKING</span>
      </div>
      <div class="signal-table-wrap">
        <table class="signal-table market-radar-table">
          <thead><tr><th>Ticker</th><th>Score</th><th>Trend</th><th>Radar</th><th>Status / Setup</th><th>Trigger</th><th>Entry</th><th>Invalidation</th><th>Target 1</th><th>Updated</th></tr></thead>
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

      <div class="market-view-bar gc-view-bar">
        <div class="market-view-controls">
          <label class="market-control"><span>Tampilkan</span>
            <select id="gcLimit" aria-label="Jumlah saham Golden Cross Radar">
              <option value="5" selected>5 saham</option>
              <option value="10">10 saham</option>
              <option value="20">20 saham</option>
              <option value="50">50 saham</option>
              <option value="ALL">Semua</option>
            </select>
          </label>
        </div>
        <span class="market-view-count" id="gcViewCount">Menampilkan 0 saham</span>
      </div>

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
    const stageClass=s=>'stage-'+String(s||'').toLowerCase().replace(/\s+/g,'-');
    const entryClass=s=>'entry-'+String(s||'').toLowerCase().replace(/\s+/g,'-');
    const stampOf=d=>Number(d?.received_at||d?.updated_at)||0;
    const entry=d=>(d.entry_low||d.entry_high)?`${fmt(d.entry_low)} – ${fmt(d.entry_high)}`:'—';
    const updated=d=>{
      const stamp=stampOf(d);if(!stamp)return '—';
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

    function publicEntryMode(d){
      const stage=String(d?.setup_stage||'').toUpperCase();
      const style=String(d?.entry_style||'').toUpperCase();
      if(style==='BREAKOUT')return stage==='CONFIRMED'?'BREAKOUT CONFIRMED':'BREAKOUT WATCH';
      if(style==='PULLBACK')return 'PULLBACK';
      if(style==='WEAKNESS')return 'BUY ON WEAKNESS';
      return '';
    }

    function byScore(list){
      return list.slice().sort((a,b)=>(Number(b?.score)||0)-(Number(a?.score)||0)||String(a?.ticker||'').localeCompare(String(b?.ticker||'')));
    }

    function endpoint(path){
      const url=new URL(API);
      url.pathname=path;
      url.search='';
      url.hash='';
      url.searchParams.set('timeframe',tf);
      return url;
    }

    function freshness(stamp){
      if(!stamp)return {label:'BELUM ADA DATA',className:'stale'};
      const ageHours=Math.max(0,(Date.now()-stamp)/3600000);
      if(ageHours<=36)return {label:'LIVE SNAPSHOT',className:'live'};
      if(ageHours<=72)return {label:'SNAPSHOT TERBARU',className:'current'};
      return {label:'DATA PERLU DIPERBARUI',className:'stale'};
    }

    function strategyMeta(d){
      const stage=String(d?.setup_stage||'').toUpperCase();
      const style=publicEntryMode(d);
      if(!stage&&!style)return '';
      return `<div class="market-setup-meta">${stage?`<span class="market-stage ${stageClass(stage)}">${stage}</span>`:''}${style?`<span class="market-entry-style ${entryClass(style)}">${style}</span>`:''}</div>`;
    }

    function renderOpportunities(){
      const host=$('marketOpportunities');if(!host)return;
      const candidates=byScore(rows.map(r=>r.data).filter(Boolean).filter(d=>{
        const radar=String(d.radar_status||'').toUpperCase();
        const status=String(d.status||'').toUpperCase();
        return radar&&radar!=='AVOID'&&status!=='EXIT';
      })).slice(0,3);
      if(!candidates.length){host.innerHTML='<div class="opportunity-empty">Belum ada kandidat prioritas pada snapshot saat ini.</div>';return;}
      host.innerHTML=candidates.map((d,index)=>{
        const ticker=String(d.ticker||'');
        const radar=String(d.radar_status||'').toUpperCase();
        const status=String(d.status||'WAIT').toUpperCase();
        const trend=String(d.trend||'NEUTRAL').toUpperCase();
        return `<button type="button" class="opportunity-card" data-symbol="${ticker}">
          <span class="opportunity-rank">#${index+1}</span>
          <div class="opportunity-main"><b>${ticker}</b><strong>${fmt(d.score)}</strong></div>
          <div class="opportunity-tags"><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span><span class="signal-pill ${statusClass(status)}">${status}</span></div>
          ${strategyMeta(d)}
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
        filter=filter===b.dataset.filter?'ALL':b.dataset.filter;
        renderSummary();renderFilters();renderTable();
      }));
    }

    function renderStrategyFilters(){
      const panel=$('marketStrategyPanel');
      const host=$('marketEntryFilters');
      if(!panel||!host)return;
      const strategyReady=rows.some(r=>r.data&&(String(r.data.setup_stage||'').trim()||String(r.data.entry_style||'').trim()));
      panel.hidden=!strategyReady;
      if(!strategyReady){entryFilter='ALL';stageFilter='ALL';return;}
      const styles=['ALL','BREAKOUT WATCH','BREAKOUT CONFIRMED','PULLBACK','BUY ON WEAKNESS'];
      host.innerHTML=styles.map(style=>{
        const count=style==='ALL'
          ? rows.filter(r=>r.data&&publicEntryMode(r.data)).length
          : rows.filter(r=>r.data&&publicEntryMode(r.data)===style).length;
        const label=style==='ALL'?'ALL STYLE':style;
        return `<button type="button" data-entry-filter="${style}" class="${entryFilter===style?'active':''}"><span>${label}</span><strong>${count}</strong></button>`;
      }).join('');
      host.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
        entryFilter=btn.dataset.entryFilter||'ALL';
        renderStrategyFilters();
        renderTable();
      }));
      const stage=$('marketStageFilter');
      if(stage&&stage.value!==stageFilter)stage.value=stageFilter;
    }

    function renderFilters(){
      const host=$('signalFilters');
      const filters=['ALL','BUY SETUP','HOLD','WATCH','TAKE PROFIT','EXIT','WAIT'];
      host.innerHTML=filters.map(f=>`<button type="button" data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
        filter=b.dataset.filter;renderSummary();renderFilters();renderTable();
      }));
      $('signalBullishToggle')?.classList.toggle('active',bullishOnly);
      $('signalBullishToggle')?.setAttribute('aria-pressed',String(bullishOnly));
    }

    function sortRows(list){
      const view=list.slice();
      if(sortMode==='SCORE_ASC')return view.sort((a,b)=>(Number(a.data?.score)||0)-(Number(b.data?.score)||0)||a.symbol.localeCompare(b.symbol));
      if(sortMode==='STATUS')return view.sort((a,b)=>{
        const ar=decisionRank[String(a.data?.status||'WAIT').toUpperCase()]||99;
        const br=decisionRank[String(b.data?.status||'WAIT').toUpperCase()]||99;
        return ar-br||(Number(b.data?.score)||0)-(Number(a.data?.score)||0)||a.symbol.localeCompare(b.symbol);
      });
      if(sortMode==='TICKER')return view.sort((a,b)=>a.symbol.localeCompare(b.symbol));
      return view.sort((a,b)=>{
        const scoreDiff=(Number(b.data?.score)||0)-(Number(a.data?.score)||0);
        if(scoreDiff!==0)return scoreDiff;
        const at=trendRank[String(a.data?.trend||'NEUTRAL').toUpperCase()]||99;
        const bt=trendRank[String(b.data?.trend||'NEUTRAL').toUpperCase()]||99;
        return at-bt||a.symbol.localeCompare(b.symbol);
      });
    }

    function renderTable(){
      const body=$('signalMonitorBody');
      let view=rows.filter(r=>r.data);
      if(filter!=='ALL')view=view.filter(r=>String(r.data.status||'').toUpperCase()===filter);
      if(entryFilter!=='ALL')view=view.filter(r=>publicEntryMode(r.data)===entryFilter);
      if(stageFilter!=='ALL')view=view.filter(r=>String(r.data.setup_stage||'').toUpperCase()===stageFilter);
      if(bullishOnly)view=view.filter(r=>String(r.data.trend||'').toUpperCase()==='BULLISH');
      view=sortRows(view);
      const total=view.length;
      const visible=displayLimit==='ALL'?view:view.slice(0,Number(displayLimit)||5);
      $('marketViewCount').textContent=total===visible.length?`Menampilkan ${visible.length} saham`:`Menampilkan ${visible.length} dari ${total} saham`;
      body.innerHTML=visible.map(r=>{
        const d=r.data;
        const status=String(d.status||'WAIT').toUpperCase();
        const trend=String(d.trend||'NEUTRAL').toUpperCase();
        const radar=String(d.radar_status||'—').toUpperCase();
        return `<tr class="signal-row" data-symbol="${r.symbol}">
          <td><b>${r.symbol}</b></td><td><b>${fmt(d.score)}</b></td>
          <td><span class="signal-trend ${trend.toLowerCase()}">${trend}</span></td>
          <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
          <td><span class="signal-pill ${statusClass(status)}">${status}</span>${strategyMeta(d)}</td>
          <td>${fmt(d.trigger)}</td><td>${entry(d)}</td><td>${fmt(d.invalidation)}</td><td>${fmt(d.target1)}</td><td>${updated(d)}</td>
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
      const lists={ALL_GC:gcAll(),DOUBLE_NEW:gcPayload.double_fresh||[],DOUBLE_GC:gcPayload.double_gc||[],EMA_GC:gcPayload.ema_gc||[],SMA_GC:gcPayload.sma_gc||[],NEW_GC:gcPayload.fresh_gc||[]};
      return byScore(lists[gcFilter]||gcAll());
    }

    function renderGcSummary(){
      const host=$('gcSummary');if(!host)return;
      const s=gcPayload?.summary||{};
      const cards=[['DOUBLE_NEW','DOUBLE BARU',Number(s.double_fresh)||0],['DOUBLE_GC','DOUBLE GC',Number(s.double_gc)||0],['EMA_GC','EMA GC',Number(s.ema_gc)||0],['SMA_GC','MA GC',Number(s.sma_gc)||0],['NEW_GC','GC BARU',Number(s.fresh_gc)||0]];
      host.innerHTML=cards.map(([key,label,count])=>`<button type="button" data-gc-filter="${key}" class="gc-summary-card ${gcFilter===key?'active':''}"><span>${label}</span><strong>${count}</strong></button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
        gcFilter=gcFilter===b.dataset.gcFilter?'ALL_GC':b.dataset.gcFilter;
        renderGcSummary();renderGcFilters();renderGcTable();
      }));
    }

    function renderGcFilters(){
      const host=$('gcFilters');if(!host)return;
      const filters=[['ALL_GC','ALL GC'],['DOUBLE_GC','DOUBLE GC'],['EMA_GC','EMA GC'],['SMA_GC','MA GC'],['NEW_GC','GC BARU'],['DOUBLE_NEW','DOUBLE BARU']];
      host.innerHTML=filters.map(([key,label])=>`<button type="button" data-gc-filter="${key}" class="${gcFilter===key?'active':''}">${label}</button>`).join('');
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
        gcFilter=b.dataset.gcFilter;renderGcSummary();renderGcFilters();renderGcTable();
      }));
    }

    function renderGcTable(){
      const body=$('gcBody');if(!body)return;
      const view=gcView();
      const total=view.length;
      const visible=gcDisplayLimit==='ALL'?view:view.slice(0,Number(gcDisplayLimit)||5);
      $('gcViewCount').textContent=total===visible.length?`Menampilkan ${visible.length} saham`:`Menampilkan ${visible.length} dari ${total} saham`;
      body.innerHTML=visible.map(d=>{
        const ticker=String(d.ticker||'');
        const radar=String(d.radar_status||'AVOID').toUpperCase();
        const decision=String(d.status||'WAIT').toUpperCase();
        return `<tr class="signal-row gc-row" data-symbol="${ticker}">
          <td><b>${ticker}</b></td><td><b>${fmt(d.score)}</b></td>
          <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
          <td>${gcCell(d.ema_gc)}</td><td>${gcCell(d.sma_gc)}</td>
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

    async function loadGoldenCross(){
      try{
        const res=await fetch(endpoint('/technical'),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        gcPayload=await res.json();
        const s=gcPayload.summary||{};
        const stamp=Number(gcPayload.updated_at)||0;
        $('gcMeta').textContent=`${Number(s.total)||0} saham dipantau • Double GC ${Number(s.double_gc)||0} • EMA GC ${Number(s.ema_gc)||0} • MA GC ${Number(s.sma_gc)||0}`+(stamp?` • update ${new Date(stamp).toLocaleString('id-ID')}`:'');
        renderGcSummary();renderGcFilters();renderGcTable();
      }catch(e){
        gcPayload=null;
        $('gcMeta').textContent='Golden Cross Radar belum dapat dimuat. Coba Refresh.';
        renderGcSummary();renderGcFilters();renderGcTable();
      }
    }

    async function load(){
      $('signalMonitorMeta').textContent='Mengambil snapshot market…';
      try{
        const res=await fetch(endpoint('/signals'),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const body=await res.json();
        const signals=Array.isArray(body.signals)?body.signals:[];
        rows=signals.map(data=>({symbol:String(data.ticker||''),data})).filter(r=>r.symbol);
        const latest=Math.max(0,...rows.map(r=>stampOf(r.data)));
        const fresh=freshness(latest);
        const badge=$('dataFreshness');badge.textContent=fresh.label;badge.className='data-freshness '+fresh.className;
        $('signalMonitorMeta').textContent=`${rows.length} saham dipantau`+(latest?` • update terakhir ${new Date(latest).toLocaleString('id-ID')}`:'');
        renderOpportunities();renderSummary();renderStrategyFilters();renderFilters();renderTable();
      }catch(e){
        rows=[];
        $('signalMonitorMeta').textContent='Market Radar belum dapat dimuat. Coba Refresh.';
        const badge=$('dataFreshness');badge.textContent='API ERROR';badge.className='data-freshness stale';
        renderOpportunities();renderSummary();renderStrategyFilters();renderFilters();renderTable();
      }
    }

    $('gcRefresh').addEventListener('click',loadGoldenCross);
    $('signalMonitorRefresh').addEventListener('click',load);
    $('signalBullishToggle').addEventListener('click',()=>{bullishOnly=!bullishOnly;renderFilters();renderTable();});
    $('marketSort').addEventListener('change',e=>{sortMode=e.target.value||'SCORE_DESC';renderTable();});
    $('marketLimit').addEventListener('change',e=>{displayLimit=e.target.value==='ALL'?'ALL':Number(e.target.value)||5;renderTable();});
    $('marketStageFilter').addEventListener('change',e=>{stageFilter=String(e.target.value||'ALL').toUpperCase();renderTable();});
    $('gcLimit').addEventListener('change',e=>{gcDisplayLimit=e.target.value==='ALL'?'ALL':Number(e.target.value)||5;renderGcTable();});

    renderFilters();renderStrategyFilters();renderGcFilters();load();loadGoldenCross();
    setInterval(()=>{load();loadGoldenCross();},60000);
  }

  boot();
})();
