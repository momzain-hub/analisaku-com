/* Analisaku Decision Panel execution-plan context. Public outputs only. */
(function(){
  if(document.documentElement.dataset.decisionPriceContextModule==='true')return;
  document.documentElement.dataset.decisionPriceContextModule='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  let requestId=0,timer=0;
  const $=id=>document.getElementById(id);
  const numeric=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
  const fmt=v=>{const n=numeric(v);return n===null?'—':n.toLocaleString('id-ID',{maximumFractionDigits:2})};
  const pct=v=>Number.isFinite(v)?`${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})}%`:'—';
  const rr=v=>Number.isFinite(v)&&v>0?`1 : ${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})}`:'—';
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

  function areaLabel(mode){
    if(mode==='BREAKOUT WATCH')return ['AREA KONFIRMASI','Zona yang perlu diuji sebelum breakout dianggap siap'];
    if(mode==='BREAKOUT CONFIRMED')return ['BREAKOUT ENTRY','Area eksekusi setelah breakout terkonfirmasi'];
    if(mode==='PULLBACK')return ['PULLBACK ENTRY','Area retest pada struktur breakout yang masih valid'];
    if(mode==='BUY ON WEAKNESS')return ['WEAKNESS ENTRY','Area weakness pada struktur bullish yang masih valid'];
    return ['ENTRY / DECISION AREA','Area keputusan dari Master Signal'];
  }

  function riskLabel(mode){
    if(mode==='BREAKOUT WATCH')return ['BATAS RISIKO RENCANA','Belum menjadi stop aktif sebelum entry'];
    if(mode==='BREAKOUT CONFIRMED')return ['STOP BREAKOUT','Batas risiko skenario breakout'];
    if(mode==='PULLBACK')return ['STOP PULLBACK','Batas risiko skenario pullback'];
    if(mode==='BUY ON WEAKNESS')return ['STOP WEAKNESS','Batas risiko skenario weakness'];
    return ['INVALIDATION / STOP','Batas struktur utama dianggap gagal'];
  }

  function areaOf(data){
    const mode=modeOf(data),a=numeric(data?.style_entry_low),b=numeric(data?.style_entry_high);
    if(mode)return {mode,low:a,high:b,ready:a!==null||b!==null};
    const lo=numeric(data?.entry_low),hi=numeric(data?.entry_high);
    return {mode:'',low:lo,high:hi,ready:lo!==null||hi!==null};
  }
  function rangeOf(area){if(!area.ready)return '—';return [area.low,area.high].filter(v=>v!==null).map(fmt).join(' – ')||'—'}

  function nextTargetOf(data){
    const p=numeric(data?.price),trend=String(data?.trend||'').toUpperCase();
    const t=[numeric(data?.target1),numeric(data?.target2),numeric(data?.target3)].filter(v=>v!==null);
    if(!t.length)return {value:null,index:0};
    if(p===null)return {value:t[0],index:1};
    const i=trend==='BEARISH'?t.findIndex(v=>v<p):t.findIndex(v=>v>p);
    return i>=0?{value:t[i],index:i+1}:{value:null,index:0};
  }

  function planOf(data){
    const area=areaOf(data),mode=area.mode;
    const styleStop=numeric(data?.style_stop),structural=numeric(data?.invalidation);
    const risk={value:mode?styleStop:structural,ready:(mode?styleStop:structural)!==null};
    const target=nextTargetOf(data);
    let riskPct=null,ratio=null;
    if(mode&&area.ready&&risk.ready&&target.value!==null){
      const vals=[area.low,area.high].filter(v=>v!==null);
      const entry=vals.length?Math.max(...vals):null;
      if(entry!==null&&risk.value<entry){
        const r=entry-risk.value,reward=target.value-entry;
        riskPct=r/entry*100;
        ratio=reward>0?reward/r:null;
      }
    }
    return {area,risk,target,riskPct,ratio};
  }

  function contextOf(data,plan){
    const p=numeric(data?.price),s=String(data?.status||'').toUpperCase();
    if(s==='EXIT')return {key:'INVALID',label:'INVALID / EXIT',note:'Skenario tidak aktif'};
    if(p===null)return {key:'UNKNOWN',label:'BELUM TERSEDIA',note:'Harga snapshot belum tersedia'};
    if(plan.area.mode&&plan.risk.ready&&p<=plan.risk.value)return {key:'INVALID',label:'DI BAWAH BATAS RISIKO',note:'Harga telah melewati batas risiko skenario'};
    if(plan.area.mode&&!plan.area.ready)return {key:'UNKNOWN',label:'MENUNGGU AREA SKENARIO',note:'Klasifikasi tersedia, area khusus belum diterima'};
    if(!plan.area.ready)return {key:'UNKNOWN',label:'BELUM TERSEDIA',note:'Area harga belum tersedia'};
    const vals=[plan.area.low,plan.area.high].filter(v=>v!==null),lo=Math.min(...vals),hi=Math.max(...vals);
    if(p<lo)return {key:'BELOW',label:'BELOW ZONE',note:'Harga masih di bawah area skenario'};
    if(p<=hi)return {key:'IN',label:'IN ZONE',note:'Harga sedang berada di area skenario'};
    return {key:'ABOVE',label:'ABOVE ZONE',note:'Harga sudah di atas area; hindari chase'};
  }

  function ensureCards(){
    const grid=$('decisionPanel')?.querySelector('.decision-grid');if(!grid)return;
    const add=(id,label,note,after)=>{
      if($(id))return;
      const card=document.createElement('div');card.className='decision-card';card.innerHTML=`<span>${label}</span><strong id="${id}">—</strong><small>${note}</small>`;
      const anchor=after?$(after)?.closest('.decision-card'):null;
      if(anchor)anchor.insertAdjacentElement('afterend',card);else grid.appendChild(card);
    };
    add('dCurrentPrice','CURRENT PRICE','Harga snapshot terakhir');
    add('dPricePosition','PRICE POSITION','Posisi harga terhadap area skenario','dCurrentPrice');
    add('dEntryStyle','ENTRY STYLE','Klasifikasi skenario aktif','dSetup');
    add('dRiskPct','RISK','Risiko konservatif dari batas atas entry','dEntryStyle');
    add('dRiskReward','RISK : REWARD','Menggunakan next target aktif','dRiskPct');
    const priceCard=$('dCurrentPrice')?.closest('.decision-card');if(priceCard&&grid.firstElementChild!==priceCard)grid.insertBefore(priceCard,grid.firstChild);
    const posCard=$('dPricePosition')?.closest('.decision-card');if(posCard&&priceCard?.nextSibling!==posCard)grid.insertBefore(posCard,priceCard.nextSibling);

    const entry=$('dEntry')?.closest('.decision-card');
    if(entry){entry.querySelector('span').id='dEntryLabel';entry.querySelector('small').id='dEntryNote';}
    const stop=$('dStop')?.closest('.decision-card');
    if(stop){stop.querySelector('span').id='dStopLabel';stop.querySelector('small').id='dStopNote';}
    const t1=$('dTp1')?.closest('.decision-card');
    if(t1){t1.querySelector('span').id='dTarget1Label';t1.querySelector('small').id='dTarget1Note';}
  }

  function decisionText(data,plan,ctx){
    const mode=plan.area.mode,s=String(data?.status||'WAIT').toUpperCase();
    if(s==='EXIT')return ['Skenario tidak aktif.','Tunggu struktur baru sebelum mempertimbangkan transaksi.'];
    if(ctx.key==='INVALID')return ['Batas risiko terlewati.','Jangan mempertahankan skenario entry yang batas risikonya sudah gagal.'];
    if(mode==='BREAKOUT WATCH'){
      if(ctx.key==='IN')return ['Breakout sedang diuji.','Ini masih fase watch, bukan entry otomatis. Tunggu konfirmasi breakout.'];
      if(ctx.key==='ABOVE')return ['Harga melewati area konfirmasi.','Pastikan status sudah berubah menjadi CONFIRMED; jika belum, jangan chase.'];
      return ['Menunggu area konfirmasi.','Pantau harga mendekati trigger dan tunggu konfirmasi.'];
    }
    if(mode==='BREAKOUT CONFIRMED'){
      if(ctx.key==='IN')return ['Breakout terkonfirmasi.','Area entry aktif; gunakan stop skenario dan next target sebagai trading plan.'];
      if(ctx.key==='ABOVE')return ['Breakout valid, tetapi harga sudah di atas entry.','Jangan chase jika risk/reward sudah memburuk.'];
      return ['Harga kembali di bawah breakout entry.','Pantau apakah berubah menjadi retest/pullback atau setup melemah.'];
    }
    if(mode==='PULLBACK'){
      if(ctx.key==='IN')return ['Pullback berada di area entry.','Retest masih valid; gunakan stop pullback dan next target.'];
      if(ctx.key==='ABOVE')return ['Harga belum kembali ke area pullback.','Tunggu retest yang lebih favorable daripada mengejar harga.'];
      return ['Harga di bawah area pullback.','Periksa batas risiko sebelum mempertahankan skenario.'];
    }
    if(mode==='BUY ON WEAKNESS'){
      if(ctx.key==='IN')return ['Harga berada di area weakness.','Struktur masih valid, tetapi tetap tunggu respons harga dan disiplin risk boundary.'];
      if(ctx.key==='ABOVE')return ['Harga di atas area weakness.','Tunggu area yang lebih favorable; jangan mengejar harga.'];
      return ['Harga di bawah area weakness.','Periksa apakah struktur bullish masih valid.'];
    }
    return null;
  }

  function render(data){
    ensureCards();
    const plan=planOf(data),ctx=contextOf(data,plan),mode=plan.area.mode;
    if($('dCurrentPrice'))$('dCurrentPrice').textContent=fmt(data?.price);
    if($('dPricePosition')){$('dPricePosition').textContent=ctx.label;$('dPricePosition').dataset.position=ctx.key;}
    const posNote=$('dPricePosition')?.closest('.decision-card')?.querySelector('small');if(posNote)posNote.textContent=ctx.note;
    if($('dEntryStyle'))$('dEntryStyle').textContent=mode||'—';
    if($('dSetup'))$('dSetup').textContent=String(data?.setup_stage||data?.setup||'INACTIVE').toUpperCase();
    if($('dEntry'))$('dEntry').textContent=rangeOf(plan.area);
    if($('dRiskPct'))$('dRiskPct').textContent=mode?pct(plan.riskPct):'—';
    if($('dRiskReward'))$('dRiskReward').textContent=mode?rr(plan.ratio):'—';

    const aCopy=areaLabel(mode);if($('dEntryLabel'))$('dEntryLabel').textContent=aCopy[0];if($('dEntryNote'))$('dEntryNote').textContent=mode&&!plan.area.ready?'Menunggu area khusus dari Signal Hub':aCopy[1];
    const rCopy=riskLabel(mode);if($('dStopLabel'))$('dStopLabel').textContent=rCopy[0];if($('dStopNote'))$('dStopNote').textContent=mode&&!plan.risk.ready?'Menunggu risk boundary dari Signal Hub':rCopy[1];if($('dStop'))$('dStop').textContent=plan.risk.ready?fmt(plan.risk.value):'—';
    if($('dTarget1Label'))$('dTarget1Label').textContent='NEXT TARGET';if($('dTarget1Note'))$('dTarget1Note').textContent=plan.target.value!==null?`Target aktif berikutnya${plan.target.index?` (T${plan.target.index})`:''}`:'Belum ada target berikutnya';if($('dTp1'))$('dTp1').textContent=plan.target.value!==null?fmt(plan.target.value):'—';

    const custom=decisionText(data,plan,ctx);
    if(custom){if($('dDecision'))$('dDecision').textContent=custom[0];if($('dDecisionCopy'))$('dDecisionCopy').textContent=custom[1];}
  }

  function endpoint(ticker,timeframe){const u=new URL(API);u.pathname='/signal';u.search='';u.hash='';u.searchParams.set('ticker',ticker);u.searchParams.set('timeframe',timeframe);return u;}
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,450);}
  function bind(){
    if(document.documentElement.dataset.decisionPriceContextBound==='true')return;
    document.documentElement.dataset.decisionPriceContextBound='true';
    $('tvApply')?.addEventListener('click',schedule);$('tvInterval')?.addEventListener('change',schedule);$('tvTicker')?.addEventListener('keydown',e=>{if(e.key==='Enter')schedule()});
    document.querySelectorAll('.tv-chip').forEach(btn=>btn.addEventListener('click',schedule));
    const source=$('decisionSource');if(source)new MutationObserver(schedule).observe(source,{childList:true,subtree:true,characterData:true});
    setInterval(refresh,60000);
  }
  async function refresh(){
    const ticker=clean($('tvTicker')?.value||$('decisionTicker')?.textContent),tf=apiTf($('tvInterval')?.value||'D');if(!ticker)return;
    const id=++requestId;try{const r=await fetch(endpoint(ticker,tf),{cache:'no-store'});if(!r.ok)return;const body=await r.json();if(id!==requestId)return;render(body.data||body);}catch(e){}
  }
  function wait(){if(!$('decisionPanel')||!$('dEntry')||!$('tvTicker')||!$('tvInterval')){setTimeout(wait,180);return;}ensureCards();bind();refresh();}
  wait();
})();