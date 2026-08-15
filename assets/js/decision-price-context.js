/* Analisaku Decision Panel price context. Public outputs only. */
(function(){
  if(document.documentElement.dataset.decisionPriceContextModule==='true')return;
  document.documentElement.dataset.decisionPriceContextModule='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  let requestId=0;
  let timer=0;

  const $=id=>document.getElementById(id);
  const numeric=v=>{
    if(v===null||v===undefined||String(v).trim()==='')return null;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:null;
  };
  const fmt=v=>{
    const n=numeric(v);
    return n===null?'—':n.toLocaleString('id-ID',{maximumFractionDigits:2});
  };
  const clean=v=>String(v||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20);
  const apiTf=v=>({D:'1D',W:'1W',M:'1M'})[String(v||'D').toUpperCase()]||String(v||'D');

  function modeOf(data){
    const stage=String(data?.setup_stage||'').toUpperCase();
    const style=String(data?.entry_style||'').toUpperCase();
    if(style==='BREAKOUT')return stage==='CONFIRMED'?'BREAKOUT CONFIRMED':'BREAKOUT WATCH';
    if(style==='PULLBACK')return 'PULLBACK';
    if(style==='WEAKNESS')return 'BUY ON WEAKNESS';
    return '';
  }

  function areaOf(data){
    const mode=modeOf(data);
    const styleLow=numeric(data?.style_entry_low),styleHigh=numeric(data?.style_entry_high);
    if(mode){
      return {mode,low:styleLow,high:styleHigh,ready:styleLow!==null||styleHigh!==null,reference:false};
    }
    const low=numeric(data?.entry_low),high=numeric(data?.entry_high);
    return {mode:'',low,high,ready:low!==null||high!==null,reference:true};
  }

  function rangeOf(area){
    if(!area?.ready)return '—';
    const values=[area.low,area.high].filter(v=>v!==null);
    return values.map(fmt).join(' – ')||'—';
  }

  function areaLabel(mode,ctxKey='UNKNOWN'){
    if(mode==='BREAKOUT WATCH')return ['AREA KONFIRMASI','Zona yang perlu diuji sebelum breakout dianggap siap'];
    if(mode==='BREAKOUT CONFIRMED')return ['BREAKOUT ENTRY','Area eksekusi setelah breakout terkonfirmasi'];
    if(mode==='PULLBACK')return ['PULLBACK ENTRY','Area retest pada struktur breakout yang masih valid'];
    if(mode==='BUY ON WEAKNESS')return ['WEAKNESS ENTRY','Area weakness pada struktur bullish yang masih valid'];
    if(ctxKey==='BELOW')return ['AREA KONFIRMASI','Area referensi yang perlu direclaim / dikonfirmasi'];
    if(ctxKey==='IN')return ['ENTRY / DECISION AREA','Harga sedang berada di area keputusan'];
    if(ctxKey==='ABOVE')return ['AREA REFERENSI ENTRY','Harga sudah berada di atas area referensi'];
    return ['ENTRY / DECISION AREA','Area keputusan dari Master Signal'];
  }

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
      positionCard.innerHTML='<span>PRICE POSITION</span><strong id="dPricePosition">—</strong><small id="dPricePositionNote">Posisi harga terhadap area skenario</small>';
      grid.insertBefore(positionCard,priceCard.nextSibling);
    }

    if(!$('dEntryStyle')){
      const card=document.createElement('div');
      card.className='decision-card decision-entry-style-card';
      card.innerHTML='<span>ENTRY STYLE</span><strong id="dEntryStyle">—</strong><small>Klasifikasi skenario aktif</small>';
      const setupCard=$('dSetup')?.closest('.decision-card');
      if(setupCard)setupCard.insertAdjacentElement('afterend',card);else grid.appendChild(card);
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
    const p=numeric(data?.price),area=areaOf(data);
    if(p===null)return {key:'UNKNOWN',label:'BELUM TERSEDIA',note:'Harga snapshot belum tersedia',area};
    if(area.mode&&!area.ready)return {key:'UNKNOWN',label:'MENUNGGU AREA SKENARIO',note:'Klasifikasi sudah ada, tetapi area khusus skenario belum diterima',area};
    if(!area.ready)return {key:'UNKNOWN',label:'BELUM TERSEDIA',note:'Area harga belum tersedia',area};
    const values=[area.low,area.high].filter(v=>v!==null);
    const lo=Math.min(...values),hi=Math.max(...values);
    if(p<lo)return {key:'BELOW',label:'DI BAWAH AREA SKENARIO',note:'Harga masih di bawah area yang sedang dipantau',area};
    if(p<=hi)return {key:'IN',label:'DI AREA SKENARIO',note:'Harga sedang berada di area skenario aktif',area};
    return {key:'ABOVE',label:'DI ATAS AREA SKENARIO',note:'Harga sudah berada di atas area skenario aktif',area};
  }

  function decisionText(status,ctx,data){
    const s=String(status||'WAIT').toUpperCase();
    if(['EXIT','TAKE PROFIT'].includes(s))return null;
    const mode=ctx.area?.mode||'';
    const trigger=fmt(data?.trigger);

    if(mode==='BREAKOUT WATCH'){
      if(ctx.key==='BELOW')return ['Menunggu area konfirmasi.','Harga belum masuk zona konfirmasi breakout. Pantau penguatan tanpa mengejar harga.'];
      if(ctx.key==='IN')return ['Breakout sedang diuji.','Harga sudah berada di area konfirmasi. Tunggu status dan konfirmasi penutupan sebelum eksekusi.'];
      if(ctx.key==='ABOVE')return ['Harga di atas area konfirmasi.','Cek apakah breakout sudah berstatus CONFIRMED. Jika belum, hindari chase dan tunggu validasi berikutnya.'];
    }
    if(mode==='BREAKOUT CONFIRMED'){
      if(ctx.key==='IN')return ['Breakout terkonfirmasi di area entry.','Gunakan area breakout yang aktif bersama invalidation dan target; tetap sesuaikan position size.'];
      if(ctx.key==='ABOVE')return ['Harga di atas breakout entry.','Breakout valid tidak berarti harus dikejar. Tunggu risk/reward yang tetap masuk akal.'];
      if(ctx.key==='BELOW')return ['Harga kembali di bawah breakout entry.','Pantau apakah struktur masih valid atau berubah menjadi skenario retest/pullback.'];
    }
    if(mode==='PULLBACK'){
      if(ctx.key==='IN')return ['Harga masuk area pullback.','Skenario retest sedang aktif. Konfirmasi bahwa struktur tetap valid sebelum eksekusi.'];
      if(ctx.key==='ABOVE')return ['Pullback belum kembali ke area.','Tunggu retest yang lebih favorable; jangan memaksakan entry di atas zona.'];
      if(ctx.key==='BELOW')return ['Harga menembus bawah area pullback.','Periksa invalidation dan kualitas struktur sebelum mempertimbangkan skenario ini.'];
    }
    if(mode==='BUY ON WEAKNESS'){
      if(ctx.key==='IN')return ['Harga masuk area weakness.','Area weakness aktif pada struktur bullish; tetap tunggu respons harga dan disiplin invalidation.'];
      if(ctx.key==='ABOVE')return ['Harga belum berada di area weakness.','Tunggu harga kembali ke zona yang lebih favorable daripada mengejar pergerakan.'];
      if(ctx.key==='BELOW')return ['Harga di bawah area weakness.','Periksa apakah struktur bullish masih valid sebelum mempertahankan skenario.'];
    }

    if((s==='WAIT'||s==='WATCH')&&ctx.key==='BELOW')return ['Tunggu harga kembali ke area keputusan.',`Harga masih di bawah area referensi${trigger!=='—'?`; pantau trigger sekitar ${trigger}`:''}.`];
    if((s==='WAIT'||s==='WATCH')&&ctx.key==='IN')return ['Harga sudah di area keputusan.','Tunggu konfirmasi Master Signal; jangan terburu-buru entry.'];
    if((s==='WAIT'||s==='WATCH')&&ctx.key==='ABOVE')return ['Harga sudah di atas area referensi.','Hindari mengejar harga. Tunggu setup yang memberi risk/reward lebih jelas.'];
    return null;
  }

  function render(data){
    ensureCards();
    const ctx=contextOf(data),p=numeric(data?.price),mode=ctx.area?.mode||'';
    if($('dCurrentPrice'))$('dCurrentPrice').textContent=p===null?'—':fmt(p);
    if($('dPricePosition')){$('dPricePosition').textContent=ctx.label;$('dPricePosition').dataset.position=ctx.key;}
    if($('dPricePositionNote'))$('dPricePositionNote').textContent=ctx.note;
    if($('dEntryStyle'))$('dEntryStyle').textContent=mode||'—';
    if($('dSetup'))$('dSetup').textContent=String(data?.setup_stage||data?.setup||'INACTIVE').toUpperCase();
    if($('dEntry'))$('dEntry').textContent=rangeOf(ctx.area);

    const entryLabel=$('dEntryLabel'),entryNote=$('dEntryNote');
    if(entryLabel&&entryNote){
      const copy=areaLabel(mode,ctx.key);
      entryLabel.textContent=copy[0];
      entryNote.textContent=mode&&!ctx.area?.ready?'Menunggu area khusus dari Signal Hub':copy[1];
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
