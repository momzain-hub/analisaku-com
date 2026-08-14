/* Analisaku Decision Panel price context. Public outputs only. */
(function(){
  if(document.documentElement.dataset.decisionPriceContextModule==='true')return;
  document.documentElement.dataset.decisionPriceContextModule='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  let requestId=0;
  let timer=0;

  const $=id=>document.getElementById(id);
  const numeric=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const fmt=v=>{
    const n=numeric(v);
    return n===null?'—':n.toLocaleString('id-ID',{maximumFractionDigits:2});
  };
  const clean=v=>String(v||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20);
  const apiTf=v=>({D:'1D',W:'1W',M:'1M'})[String(v||'D').toUpperCase()]||String(v||'D');

  function wait(){
    if(!$('decisionPanel')||!$('dEntry')||!$('tvTicker')||!$('tvInterval')){
      setTimeout(wait,180);return;
    }
    ensureCards();
    bind();
    refresh();
  }

  function ensureCards(){
    const grid=$('decisionPanel')?.querySelector('.decision-grid');
    if(!grid)return;

    let priceCard=$('dCurrentPrice')?.closest('.decision-card');
    if(!priceCard){
      priceCard=document.createElement('div');
      priceCard.className='decision-card decision-price-card';
      priceCard.innerHTML='<span>CURRENT PRICE</span><strong id="dCurrentPrice">—</strong><small>Harga snapshot terakhir</small>';
      grid.insertBefore(priceCard,grid.firstChild);
    }

    let positionCard=$('dPricePosition')?.closest('.decision-card');
    if(!positionCard){
      positionCard=document.createElement('div');
      positionCard.className='decision-card decision-position-card';
      positionCard.innerHTML='<span>PRICE POSITION</span><strong id="dPricePosition">—</strong><small id="dPricePositionNote">Posisi harga terhadap area keputusan</small>';
      grid.insertBefore(positionCard,priceCard.nextSibling);
    }

    const entry=$('dEntry')?.closest('.decision-card');
    if(entry){
      const label=entry.querySelector('span');
      const note=entry.querySelector('small');
      if(label)label.id='dEntryLabel';
      if(note)note.id='dEntryNote';
    }
  }

  function bind(){
    if(document.documentElement.dataset.decisionPriceContextBound==='true')return;
    document.documentElement.dataset.decisionPriceContextBound='true';

    $('tvApply')?.addEventListener('click',schedule);
    $('tvInterval')?.addEventListener('change',schedule);
    $('tvTicker')?.addEventListener('keydown',e=>{if(e.key==='Enter')schedule()});
    document.querySelectorAll('.tv-chip').forEach(btn=>btn.addEventListener('click',schedule));

    const source=$('decisionSource');
    if(source)new MutationObserver(schedule).observe(source,{childList:true,subtree:true,characterData:true});
    setInterval(refresh,60000);
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,450);}

  function endpoint(ticker,timeframe){
    const u=new URL(API);
    u.pathname='/signal';u.search='';u.hash='';
    u.searchParams.set('ticker',ticker);
    u.searchParams.set('timeframe',timeframe);
    return u;
  }

  function contextOf(data){
    const p=numeric(data?.price),a=numeric(data?.entry_low),b=numeric(data?.entry_high);
    if(p===null||a===null||b===null)return {key:'UNKNOWN',label:'BELUM TERSEDIA',note:'Konteks harga belum tersedia'};
    const lo=Math.min(a,b),hi=Math.max(a,b);
    if(p<lo)return {key:'BELOW',label:'DI BAWAH AREA KONFIRMASI',note:'Harga belum masuk area keputusan'};
    if(p<=hi)return {key:'IN',label:'DI AREA KEPUTUSAN',note:'Harga sedang berada di area keputusan'};
    return {key:'ABOVE',label:'DI ATAS AREA REFERENSI',note:'Harga sudah berada di atas area entry referensi'};
  }

  function decisionText(status,ctx,data){
    const s=String(status||'WAIT').toUpperCase();
    const trigger=fmt(data?.trigger);
    if((s==='WAIT'||s==='WATCH')&&ctx.key==='BELOW')return ['Tunggu harga kembali ke area konfirmasi.',`Harga masih di bawah area keputusan. Pantau penguatan/reclaim dan konfirmasi berikutnya${trigger!=='—'?` di sekitar ${trigger}`:''}.`];
    if((s==='WAIT'||s==='WATCH')&&ctx.key==='IN')return ['Harga sudah di area keputusan.',`Tunggu konfirmasi Master Signal${trigger!=='—'?` dan trigger sekitar ${trigger}`:''}; jangan terburu-buru entry.`];
    if((s==='WAIT'||s==='WATCH')&&ctx.key==='ABOVE')return ['Harga sudah di atas area referensi.','Ikuti status Master Signal dan hindari mengejar harga. Tunggu setup yang memberi risk/reward lebih jelas.'];
    return null;
  }

  function render(data){
    ensureCards();
    const ctx=contextOf(data),p=numeric(data?.price);
    if($('dCurrentPrice'))$('dCurrentPrice').textContent=p===null?'—':fmt(p);
    if($('dPricePosition')){$('dPricePosition').textContent=ctx.label;$('dPricePosition').dataset.position=ctx.key;}
    if($('dPricePositionNote'))$('dPricePositionNote').textContent=ctx.note;

    const entryLabel=$('dEntryLabel'),entryNote=$('dEntryNote');
    if(entryLabel&&entryNote){
      if(ctx.key==='BELOW'){entryLabel.textContent='AREA KONFIRMASI';entryNote.textContent='Area yang perlu direclaim / dikonfirmasi';}
      else if(ctx.key==='IN'){entryLabel.textContent='ENTRY / DECISION AREA';entryNote.textContent='Harga sedang berada di area keputusan';}
      else if(ctx.key==='ABOVE'){entryLabel.textContent='AREA REFERENSI ENTRY';entryNote.textContent='Harga sudah berada di atas area ini';}
      else{entryLabel.textContent='ENTRY / DECISION AREA';entryNote.textContent='Area keputusan dari Master Signal';}
    }

    const custom=decisionText(data?.status,ctx,data);
    if(custom){
      if($('dDecision'))$('dDecision').textContent=custom[0];
      if($('dDecisionCopy'))$('dDecisionCopy').textContent=custom[1];
    }
  }

  async function refresh(){
    const ticker=clean($('tvTicker')?.value||$('decisionTicker')?.textContent),tf=apiTf($('tvInterval')?.value||'D');
    if(!ticker)return;
    const id=++requestId;
    try{
      const r=await fetch(endpoint(ticker,tf),{cache:'no-store'});
      if(!r.ok)return;
      const body=await r.json();
      if(id!==requestId)return;
      render(body.data||body);
    }catch(e){}
  }

  wait();
})();
