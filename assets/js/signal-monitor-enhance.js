/* Analisaku Technical Radar UX: search, watchlist, status changes, quick detail, compact mobile */
(function(){
  const FAVORITES_KEY='analisaku-watchlist-v1';
  const STATUS_KEY='analisaku-status-memory-v1';
  const CHANGE_TTL=12*60*60*1000;
  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  const clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9._-]/g,'').slice(0,20);
  const isEmptyValue=v=>{
    const text=String(v||'').replace(/\s+/g,' ').trim();
    return !text||text==='—'||text==='-'||text==='–';
  };
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const fmt=v=>{
    if(isEmptyValue(v))return '';
    const n=Number(v);
    return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v);
  };
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(e){return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}};
  let favorites=new Set(readJson(FAVORITES_KEY,[]).map(clean).filter(Boolean));
  let statusMemory=readJson(STATUS_KEY,{});
  const radarStates=[];
  let detailModal=null;
  let detailSymbol='';

  function endpoint(path,params={}){
    const url=new URL(API);
    url.pathname=path;
    url.search='';
    url.hash='';
    url.searchParams.set('timeframe','1D');
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    return url;
  }

  function gcPublicState(v){
    const state=String(v||'OFF').toUpperCase();
    return state==='FRESH'?'BARU':state==='RECENT'?'TERKONFIRMASI':state==='ACTIVE'?'AKTIF':'—';
  }

  function waitForRadar(){
    const market=document.getElementById('signalMonitor');
    const gc=document.getElementById('goldenCrossRadar');
    if(!market||!gc||!document.getElementById('marketLimit')||!document.getElementById('gcLimit')){
      setTimeout(waitForRadar,180);
      return;
    }
    if(document.documentElement.dataset.radarUxReady==='true')return;
    document.documentElement.dataset.radarUxReady='true';

    enhanceRadar({
      root:market,
      bodyId:'signalMonitorBody',
      countId:'marketViewCount',
      limitId:'marketLimit',
      searchId:'marketTickerSearch',
      watchId:'marketWatchFilter',
      placeholder:'Cari ticker, mis. RAJA',
      tableClass:'market-compact',
      labels:['Ticker','Score','Trend','Radar','Status','Trigger','Entry','Invalidation','Target 1','Updated']
    });

    enhanceRadar({
      root:gc,
      bodyId:'gcBody',
      countId:'gcViewCount',
      limitId:'gcLimit',
      searchId:'gcTickerSearch',
      watchId:'gcWatchFilter',
      placeholder:'Cari ticker, mis. BBRI',
      tableClass:'gc-compact',
      labels:['Ticker','Score','Radar','EMA Golden Cross','MA Golden Cross','Confluence','Decision']
    });

    syncStatusMemory();
    setInterval(syncStatusMemory,60000);
  }

  function enhanceRadar(cfg){
    const controls=cfg.root.querySelector('.market-view-controls');
    const limit=document.getElementById(cfg.limitId);
    const body=document.getElementById(cfg.bodyId);
    const table=body?.closest('table');
    if(!controls||!limit||!body||!table)return;
    table.classList.add(cfg.tableClass);

    let search=document.getElementById(cfg.searchId);
    if(!search){
      const label=document.createElement('label');
      label.className='market-control radar-search-control';
      label.innerHTML=`<span>Cari ticker</span><input id="${cfg.searchId}" class="radar-search-input" type="search" inputmode="search" autocomplete="off" spellcheck="false" maxlength="20" placeholder="${cfg.placeholder}">`;
      controls.insertBefore(label,controls.firstChild);
      search=label.querySelector('input');
    }

    let watch=document.getElementById(cfg.watchId);
    if(!watch){
      watch=document.createElement('div');
      watch.id=cfg.watchId;
      watch.className='radar-watch-control';
      watch.innerHTML='<span>Watchlist</span><div class="radar-segment"><button type="button" class="active" data-watch-mode="ALL">Semua</button><button type="button" data-watch-mode="FAVORITES">★ Favorit</button></div>';
      controls.appendChild(watch);
    }

    const state={cfg,controls,limit,body,table,search,watch,favoritesOnly:false,savedLimit:limit.value||'5',overrideActive:false};
    radarStates.push(state);

    watch.querySelectorAll('[data-watch-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      state.favoritesOnly=btn.dataset.watchMode==='FAVORITES';
      watch.querySelectorAll('[data-watch-mode]').forEach(b=>b.classList.toggle('active',b===btn));
      updateOverride(state);
    }));

    search.addEventListener('input',()=>updateOverride(state));
    search.addEventListener('search',()=>updateOverride(state));

    const observer=new MutationObserver(()=>{
      decorateRows(state);
      if(state.overrideActive)requestAnimationFrame(()=>applyVisibility(state));
    });
    observer.observe(body,{childList:true,subtree:false});

    decorateRows(state);
  }

  function updateOverride(state){
    const query=clean(state.search.value);
    if(state.search.value!==query)state.search.value=query;
    const needsOverride=Boolean(query)||state.favoritesOnly;

    if(needsOverride&&!state.overrideActive){
      state.savedLimit=state.limit.value||'5';
      state.overrideActive=true;
      state.limit.value='ALL';
      state.limit.disabled=true;
      state.limit.dispatchEvent(new Event('change',{bubbles:true}));
    }else if(!needsOverride&&state.overrideActive){
      state.overrideActive=false;
      state.limit.disabled=false;
      state.limit.value=state.savedLimit;
      state.limit.dispatchEvent(new Event('change',{bubbles:true}));
    }
    requestAnimationFrame(()=>{
      decorateRows(state);
      applyVisibility(state);
    });
  }

  function applyVisibility(state){
    const query=clean(state.search.value);
    const rows=[...state.body.querySelectorAll('tr.signal-row[data-symbol]')];
    if(!state.overrideActive){
      rows.forEach(row=>row.hidden=false);
      return;
    }
    let matches=0;
    rows.forEach(row=>{
      const symbol=clean(row.dataset.symbol);
      const matchSearch=!query||symbol.includes(query);
      const matchWatch=!state.favoritesOnly||favorites.has(symbol);
      const visible=matchSearch&&matchWatch;
      row.hidden=!visible;
      if(visible)matches+=1;
    });
    const count=document.getElementById(state.cfg.countId);
    if(count){
      if(state.favoritesOnly&&query)count.textContent=`${matches} saham favorit cocok dengan pencarian`;
      else if(state.favoritesOnly)count.textContent=`Menampilkan ${matches} saham favorit`;
      else count.textContent=`Hasil pencarian ${matches} saham`;
    }
  }

  function decorateRows(state){
    state.body.querySelectorAll('tr.signal-row[data-symbol]').forEach(row=>{
      const symbol=clean(row.dataset.symbol);
      [...row.children].forEach((cell,index)=>{
        if(state.cfg.labels[index])cell.dataset.label=state.cfg.labels[index];
        cell.classList.toggle('is-empty',isEmptyValue(cell.textContent));
      });
      const first=row.children[0];
      if(!first)return;
      first.classList.add('radar-ticker-cell');

      let star=first.querySelector('.radar-star');
      if(!star){
        star=document.createElement('button');
        star.type='button';
        star.className='radar-star';
        star.setAttribute('aria-label',`Tambahkan ${symbol} ke favorit`);
        star.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          toggleFavorite(symbol);
        });
        first.insertBefore(star,first.firstChild);
      }
      updateStar(star,symbol);
      applyChangeBadge(row,symbol);

      if(!row.dataset.quickDetailBound){
        row.dataset.quickDetailBound='true';
        row.addEventListener('click',event=>{
          if(event.target.closest('button,a,input,select'))return;
          event.preventDefault();
          event.stopPropagation();
          openDetail(symbol);
        },true);
      }
    });
  }

  function updateStar(button,symbol){
    const active=favorites.has(symbol);
    button.classList.toggle('active',active);
    button.textContent=active?'★':'☆';
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?`Hapus ${symbol} dari favorit`:`Tambahkan ${symbol} ke favorit`);
  }

  function toggleFavorite(symbol){
    const s=clean(symbol);if(!s)return;
    if(favorites.has(s))favorites.delete(s);else favorites.add(s);
    writeJson(FAVORITES_KEY,[...favorites].sort());
    radarStates.forEach(state=>{
      decorateRows(state);
      if(state.overrideActive)applyVisibility(state);
    });
    refreshModalFavorite();
  }

  async function syncStatusMemory(){
    try{
      const res=await fetch(endpoint('/signals'),{cache:'no-store'});
      if(!res.ok)return;
      const body=await res.json();
      const now=Date.now();
      (Array.isArray(body.signals)?body.signals:[]).forEach(signal=>{
        const symbol=clean(signal.ticker);
        const status=String(signal.status||'').toUpperCase();
        if(!symbol||!status)return;
        const old=statusMemory[symbol];
        if(old?.status&&old.status!==status){
          statusMemory[symbol]={status,previous:old.status,changedAt:now};
        }else if(old){
          statusMemory[symbol]={status,previous:old.previous||'',changedAt:(Number(old.changedAt)&&now-Number(old.changedAt)<CHANGE_TTL)?Number(old.changedAt):0};
        }else{
          statusMemory[symbol]={status,previous:'',changedAt:0};
        }
      });
      writeJson(STATUS_KEY,statusMemory);
      radarStates.forEach(decorateRows);
    }catch(e){}
  }

  function applyChangeBadge(row,symbol){
    const first=row.children[0];if(!first)return;
    first.querySelector('.radar-new-badge')?.remove();
    const memory=statusMemory[symbol];
    const changedAt=Number(memory?.changedAt)||0;
    if(!changedAt||Date.now()-changedAt>=CHANGE_TTL)return;
    const badge=document.createElement('span');
    badge.className='radar-new-badge';
    badge.textContent='BARU';
    if(memory.previous)badge.title=`Status sebelumnya: ${memory.previous}`;
    first.appendChild(badge);
  }

  function ensureModal(){
    if(detailModal)return detailModal;
    const modal=document.createElement('div');
    modal.className='radar-detail-overlay';
    modal.hidden=true;
    modal.innerHTML=`
      <section class="radar-detail-modal" role="dialog" aria-modal="true" aria-labelledby="radarDetailTitle">
        <button type="button" class="radar-detail-close" aria-label="Tutup detail">×</button>
        <div class="radar-detail-content"><div class="radar-detail-loading">Memuat detail saham…</div></div>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{if(event.target===modal)closeDetail();});
    modal.querySelector('.radar-detail-close').addEventListener('click',closeDetail);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeDetail();});
    detailModal=modal;
    return modal;
  }

  async function openDetail(symbol){
    const ticker=clean(symbol);if(!ticker)return;
    detailSymbol=ticker;
    const modal=ensureModal();
    modal.hidden=false;
    document.body.classList.add('radar-modal-open');
    const host=modal.querySelector('.radar-detail-content');
    host.innerHTML='<div class="radar-detail-loading">Memuat detail saham…</div>';
    try{
      const [signalRes,technicalRes]=await Promise.all([
        fetch(endpoint('/signal',{ticker}),{cache:'no-store'}),
        fetch(endpoint('/technical'),{cache:'no-store'})
      ]);
      if(!signalRes.ok)throw new Error('signal');
      const signal=await signalRes.json();
      let gc=null;
      if(technicalRes.ok){
        const technical=await technicalRes.json();
        const groups=['double_fresh','double_gc','ema_gc','sma_gc','fresh_gc'];
        for(const group of groups){
          const found=(technical[group]||[]).find(item=>clean(item.ticker)===ticker);
          if(found){gc=found;break;}
        }
      }
      renderDetail(signal,gc);
    }catch(e){
      host.innerHTML='<div class="radar-detail-error">Detail belum dapat dimuat. Coba lagi beberapa saat.</div>';
    }
  }

  function detailField(label,value){
    const val=fmt(value);if(!val)return '';
    return `<div class="radar-detail-field"><small>${esc(label)}</small><strong>${esc(val)}</strong></div>`;
  }

  function renderDetail(signal,gc){
    const modal=ensureModal();
    const host=modal.querySelector('.radar-detail-content');
    const ticker=clean(signal.ticker||detailSymbol);
    const radar=String(signal.radar_status||'—').toUpperCase();
    const status=String(signal.status||'WAIT').toUpperCase();
    const trend=String(signal.trend||'NEUTRAL').toUpperCase();
    const entryLow=fmt(signal.entry_low),entryHigh=fmt(signal.entry_high);
    const entry=(entryLow||entryHigh)?[entryLow,entryHigh].filter(Boolean).join(' – '):'';
    const changed=statusMemory[ticker];
    const isNew=Number(changed?.changedAt)>0&&Date.now()-Number(changed.changedAt)<CHANGE_TTL;
    const updatedTs=Number(signal.received_at||signal.updated_at)||0;
    const updatedText=updatedTs?new Date(updatedTs).toLocaleString('id-ID'):'';

    host.innerHTML=`
      <div class="radar-detail-head">
        <div><div class="radar-detail-kicker">QUICK DETAIL</div><h3 id="radarDetailTitle">${esc(ticker)}${isNew?' <span class="radar-new-badge">BARU</span>':''}</h3></div>
        <div class="radar-detail-score"><small>SCORE</small><strong>${esc(fmt(signal.score)||'—')}</strong></div>
      </div>
      <div class="radar-detail-tags">
        <span class="radar-detail-chip">${esc(trend)}</span>
        <span class="radar-detail-chip">${esc(radar)}</span>
        <span class="radar-detail-chip strong">${esc(status)}</span>
      </div>
      <div class="radar-detail-grid">
        ${detailField('Trigger',signal.trigger)}
        ${detailField('Entry',entry)}
        ${detailField('Invalidation',signal.invalidation)}
        ${detailField('Target 1',signal.target1)}
        ${detailField('Target 2',signal.target2)}
        ${detailField('Target 3',signal.target3)}
      </div>
      ${gc?`<div class="radar-detail-gc">
        <div><small>EMA Golden Cross</small><strong>${esc(gcPublicState(gc.ema_gc))}</strong></div>
        <div><small>MA Golden Cross</small><strong>${esc(gcPublicState(gc.sma_gc))}</strong></div>
        <div><small>Confluence</small><strong>${gc.double_gc?'DOUBLE':'—'}</strong></div>
      </div>`:''}
      ${updatedText?`<div class="radar-detail-updated">Updated ${esc(updatedText)}</div>`:''}
      <div class="radar-detail-actions">
        <button type="button" class="radar-modal-favorite"></button>
        <button type="button" class="radar-open-chart">Buka Chart</button>
      </div>`;

    host.querySelector('.radar-modal-favorite').addEventListener('click',()=>toggleFavorite(ticker));
    host.querySelector('.radar-open-chart').addEventListener('click',()=>openChart(ticker));
    refreshModalFavorite();
  }

  function refreshModalFavorite(){
    if(!detailModal||detailModal.hidden||!detailSymbol)return;
    const btn=detailModal.querySelector('.radar-modal-favorite');if(!btn)return;
    const active=favorites.has(detailSymbol);
    btn.textContent=active?'★ Favorit':'☆ Tambah Favorit';
    btn.classList.toggle('active',active);
  }

  function openChart(symbol){
    const ticker=document.getElementById('tvTicker');
    const interval=document.getElementById('tvInterval');
    const apply=document.getElementById('tvApply');
    if(ticker)ticker.value=symbol;
    if(interval)interval.value='D';
    if(apply)apply.click();
    closeDetail();
    document.getElementById('tradingview-chart')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function closeDetail(){
    if(!detailModal)return;
    detailModal.hidden=true;
    document.body.classList.remove('radar-modal-open');
  }

  waitForRadar();
})();
