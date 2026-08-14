/* Analisaku Golden Cross candle-age UI. Public outputs only. */
(function(){
  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  const TF='1D';
  let payload=null;
  let sortMode='SCORE_DESC';
  let observer=null;
  let detailObserver=null;
  let renderTimer=0;

  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const bool=v=>v===true||String(v).toLowerCase()==='true'||String(v)==='1';
  const statusClass=s=>'s-'+String(s||'WAIT').toLowerCase().replace(/\s+/g,'-');
  const radarClass=s=>'r-'+String(s||'AVOID').toLowerCase();
  const publicState=v=>{
    const state=String(v||'OFF').toUpperCase();
    return state==='FRESH'?'BARU':state==='RECENT'?'TERKONFIRMASI':state==='ACTIVE'?'AKTIF':'—';
  };
  const stateClass=v=>{
    const state=String(v||'OFF').toUpperCase();
    return state==='FRESH'?'gc-fresh':state==='RECENT'?'gc-recent':state==='ACTIVE'?'gc-active':'gc-off';
  };
  const gcCell=(state,age)=>{
    const n=num(age);
    const ageText=n!==null&&n>=0?`<small>${Math.floor(n)} candle</small>`:'';
    return `<span class="gc-state ${stateClass(state)}"><b>${publicState(state)}</b>${ageText}</span>`;
  };

  function endpoint(){
    const u=new URL(API);
    u.pathname='/technical';u.search='';u.hash='';u.searchParams.set('timeframe',TF);
    return u;
  }

  function wait(){
    const root=document.getElementById('goldenCrossRadar');
    const body=document.getElementById('gcBody');
    const controls=root?.querySelector('.gc-view-bar .market-view-controls');
    if(!root||!body||!controls||!document.getElementById('gcLimit')||!document.getElementById('gcFilters')){
      setTimeout(wait,180);return;
    }
    if(root.dataset.gcCandleReady==='true')return;
    root.dataset.gcCandleReady='true';

    addControls(root,controls);
    bind(root,body);
    bindQuickDetail();
    load();
    setInterval(load,60000);
  }

  function addControls(root,controls){
    if(!document.getElementById('gcSort')){
      const label=document.createElement('label');
      label.className='market-control';
      const title=document.createElement('span');title.textContent='Urutkan';
      const select=document.createElement('select');select.id='gcSort';select.setAttribute('aria-label','Urutkan Golden Cross Radar');
      [
        ['SCORE_DESC','Score tertinggi'],
        ['CANDLE_ASC','Candle terbaru'],
        ['CANDLE_DESC','Candle terlama'],
        ['TICKER','Ticker A–Z']
      ].forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o)});
      label.append(title,select);
      const limit=document.getElementById('gcLimit')?.closest('.market-control');
      controls.insertBefore(label,limit||controls.firstChild);
      select.addEventListener('change',()=>{sortMode=select.value||'SCORE_DESC';render()});
    }

    if(!document.getElementById('gcNewFormed')){
      const info=document.createElement('button');
      info.type='button';info.id='gcNewFormed';info.className='gc-new-formed';
      info.style.display='none';
      info.innerHTML='<span>BARU TERBENTUK</span><strong>0 saham</strong><small>Golden Cross baru pada snapshot ini</small>';
      const summary=document.getElementById('gcSummary');
      summary?.insertAdjacentElement('afterend',info);
      info.addEventListener('click',()=>{
        const target=document.querySelector('#gcFilters [data-gc-filter="NEW_GC"]');
        if(target)target.click();
      });
    }

    if(!document.getElementById('gcCandleAvailability')){
      const note=document.createElement('div');
      note.id='gcCandleAvailability';
      note.className='gc-candle-availability';
      note.hidden=true;
      note.textContent='Data candle Golden Cross belum tersedia dari server.';
      document.getElementById('gcNewFormed')?.insertAdjacentElement('afterend',note);
    }

    renameNewLabels(root);
  }

  function renameNewLabels(root){
    root.querySelectorAll('[data-gc-filter="NEW_GC"]').forEach(el=>{
      const span=el.querySelector('span');
      if(span)span.textContent='BARU TERBENTUK';
      else if(el.tagName==='BUTTON')el.textContent='BARU TERBENTUK';
    });
  }

  function bind(root,body){
    root.addEventListener('click',e=>{
      if(e.target.closest('[data-gc-filter]'))setTimeout(()=>{renameNewLabels(root);render()},0);
      if(e.target.closest('#gcRefresh'))setTimeout(load,250);
    });
    document.getElementById('gcLimit')?.addEventListener('change',()=>setTimeout(render,0));

    observer=new MutationObserver(()=>{
      clearTimeout(renderTimer);
      renderTimer=setTimeout(()=>{renameNewLabels(root);render()},20);
    });
    observer.observe(body,{childList:true,subtree:false});
  }

  function bindQuickDetail(){
    if(detailObserver)return;
    detailObserver=new MutationObserver(()=>{
      const modal=document.querySelector('.radar-detail-modal');
      if(modal&&!modal.closest('.radar-detail-overlay')?.hidden)setTimeout(decorateQuickDetail,0);
    });
    detailObserver.observe(document.body,{childList:true,subtree:true});
  }

  async function load(){
    try{
      const r=await fetch(endpoint(),{cache:'no-store'});
      if(!r.ok)throw new Error();
      payload=await r.json();
      updateNewCount();
      updateAvailability();
      render();
      decorateQuickDetail();
    }catch(e){/* original radar keeps its own error state */}
  }

  function updateNewCount(){
    const n=Number(payload?.summary?.fresh_gc)||0;
    const info=document.getElementById('gcNewFormed');
    if(info){
      const strong=info.querySelector('strong');
      if(strong)strong.textContent=`${n} saham`;
      info.style.display=n>0?'':'none';
    }
    const meta=document.getElementById('gcMeta');
    if(meta&&payload?.summary){
      const s=payload.summary;
      const stamp=Number(payload.updated_at)||0;
      meta.textContent=`${Number(s.total)||0} saham dipantau • ${n} baru membentuk Golden Cross • Double GC ${Number(s.double_gc)||0} • EMA GC ${Number(s.ema_gc)||0} • MA GC ${Number(s.sma_gc)||0}`+(stamp?` • update ${new Date(stamp).toLocaleString('id-ID')}`:'');
    }
  }

  function allPayloadRows(){
    const map=new Map();
    ['double_fresh','double_gc','ema_gc','sma_gc','fresh_gc'].forEach(group=>{
      (payload?.[group]||[]).forEach(d=>map.set(String(d.ticker||'').toUpperCase(),d));
    });
    return [...map.values()];
  }

  function hasCandleData(){
    return allPayloadRows().some(d=>num(d?.ema_gc_candles)!==null||num(d?.sma_gc_candles)!==null);
  }

  function updateAvailability(){
    const note=document.getElementById('gcCandleAvailability');
    if(note)note.hidden=hasCandleData();
  }

  function activeFilter(){
    return document.querySelector('#gcFilters button.active')?.dataset.gcFilter||'ALL_GC';
  }

  function allGc(){
    const map=new Map();
    [...(payload?.ema_gc||[]),...(payload?.sma_gc||[])].forEach(d=>map.set(String(d.ticker||''),d));
    return [...map.values()];
  }

  function listFor(filter){
    const lists={
      ALL_GC:allGc(),
      DOUBLE_NEW:payload?.double_fresh||[],
      DOUBLE_GC:payload?.double_gc||[],
      EMA_GC:payload?.ema_gc||[],
      SMA_GC:payload?.sma_gc||[],
      NEW_GC:payload?.fresh_gc||[]
    };
    return (lists[filter]||allGc()).slice();
  }

  function candleAge(d,filter){
    const ema=num(d?.ema_gc_candles),ma=num(d?.sma_gc_candles);
    if(filter==='EMA_GC')return ema;
    if(filter==='SMA_GC')return ma;
    const ages=[ema,ma].filter(v=>v!==null&&v>=0);
    return ages.length?Math.min(...ages):null;
  }

  function sortList(list,filter){
    return list.sort((a,b)=>{
      if(sortMode==='TICKER')return String(a.ticker||'').localeCompare(String(b.ticker||''));
      if(sortMode==='CANDLE_ASC'||sortMode==='CANDLE_DESC'){
        const aa=candleAge(a,filter),bb=candleAge(b,filter);
        if(aa===null&&bb!==null)return 1;if(aa!==null&&bb===null)return -1;
        if(aa!==null&&bb!==null&&aa!==bb)return sortMode==='CANDLE_ASC'?aa-bb:bb-aa;
      }
      return (Number(b.score)||0)-(Number(a.score)||0)||String(a.ticker||'').localeCompare(String(b.ticker||''));
    });
  }

  function render(){
    if(!payload)return;
    const body=document.getElementById('gcBody');if(!body)return;
    const filter=activeFilter();
    const list=sortList(listFor(filter),filter);
    const limitEl=document.getElementById('gcLimit');
    const limit=limitEl?.value||'5';
    const visible=limit==='ALL'?list:list.slice(0,Number(limit)||5);
    const count=document.getElementById('gcViewCount');
    if(count)count.textContent=list.length===visible.length?`Menampilkan ${visible.length} saham`:`Menampilkan ${visible.length} dari ${list.length} saham`;

    if(observer)observer.disconnect();
    body.innerHTML=visible.map(d=>{
      const ticker=String(d.ticker||'').toUpperCase();
      const radar=String(d.radar_status||'AVOID').toUpperCase();
      const decision=String(d.status||'WAIT').toUpperCase();
      return `<tr class="signal-row gc-row" data-symbol="${ticker}">
        <td><b>${ticker}</b></td><td><b>${Math.round(Number(d.score)||0)}</b></td>
        <td><span class="gc-radar-pill ${radarClass(radar)}">${radar}</span></td>
        <td>${gcCell(d.ema_gc,d.ema_gc_candles)}</td>
        <td>${gcCell(d.sma_gc,d.sma_gc_candles)}</td>
        <td>${bool(d.double_gc)?'<span class="gc-double">DOUBLE</span>':'—'}</td>
        <td><span class="signal-pill ${statusClass(decision)}">${decision}</span></td>
      </tr>`;
    }).join('')||'<tr><td colspan="7" class="signal-empty">Belum ada saham pada kategori ini.</td></tr>';
    observer?.observe(body,{childList:true,subtree:false});

    body.querySelectorAll('.gc-row').forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
  }

  function payloadForTicker(ticker){
    const symbol=String(ticker||'').toUpperCase();
    return allPayloadRows().find(d=>String(d.ticker||'').toUpperCase()===symbol)||null;
  }

  function decorateQuickDetail(){
    if(!payload)return;
    const modal=document.querySelector('.radar-detail-modal');
    const overlay=modal?.closest('.radar-detail-overlay');
    if(!modal||overlay?.hidden)return;
    const title=modal.querySelector('#radarDetailTitle');
    const ticker=String(title?.childNodes?.[0]?.textContent||title?.textContent||'').trim().split(/\s+/)[0].toUpperCase();
    const d=payloadForTicker(ticker);if(!d)return;
    const gc=modal.querySelector('.radar-detail-gc');if(!gc)return;
    [...gc.children].forEach(box=>{
      const label=String(box.querySelector('small')?.textContent||'').toUpperCase();
      let age=null;
      if(label.includes('EMA GOLDEN CROSS'))age=num(d.ema_gc_candles);
      else if(label.includes('MA GOLDEN CROSS'))age=num(d.sma_gc_candles);
      else return;
      let ageEl=box.querySelector('.gc-detail-age');
      if(!ageEl){ageEl=document.createElement('span');ageEl.className='gc-detail-age';box.appendChild(ageEl)}
      ageEl.textContent=age!==null&&age>=0?`${Math.floor(age)} candle`:'Data candle belum tersedia';
    });
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

  wait();
})();
