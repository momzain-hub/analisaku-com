/* Analisaku Decision Panel action layer. Public-output presentation only. */
(function(){
  if(document.documentElement.dataset.decisionActionUiBound==='true')return;
  document.documentElement.dataset.decisionActionUiBound='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  let requestId=0,timer=0;
  const $=id=>document.getElementById(id);
  const numeric=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
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

  function contextOf(data){
    const status=String(data?.status||'WAIT').toUpperCase();
    const mode=modeOf(data);
    const price=numeric(data?.price);
    const stop=numeric(data?.style_stop);
    const low=numeric(data?.style_entry_low);
    const high=numeric(data?.style_entry_high);

    if(status==='EXIT')return {key:'INVALID',mode,status};
    if(mode&&price!==null&&stop!==null&&price<=stop)return {key:'INVALID',mode,status};
    if(!mode)return {key:'NONE',mode,status};
    if(price===null||(low===null&&high===null))return {key:'UNKNOWN',mode,status};

    const values=[low,high].filter(v=>v!==null);
    const lo=Math.min(...values),hi=Math.max(...values);
    if(price<lo)return {key:'BELOW',mode,status};
    if(price<=hi)return {key:'IN',mode,status};
    return {key:'ABOVE',mode,status};
  }

  function actionOf(data){
    const ctx=contextOf(data),mode=ctx.mode,status=ctx.status;

    if(status==='EXIT'||ctx.key==='INVALID'){
      return {label:'NO ENTRY / INVALID',note:'Batas risiko atau status setup tidak mendukung entry baru.',tone:'avoid'};
    }
    if(status==='TAKE PROFIT'){
      return {label:'TAKE PROFIT / NO NEW ENTRY',note:'Fokus pengelolaan posisi; bukan area untuk membuka entry baru.',tone:'manage'};
    }
    if(status==='HOLD'){
      return {label:'HOLD / MANAGE POSITION',note:'Kelola posisi yang sudah ada menggunakan stop dan target aktif.',tone:'manage'};
    }

    if(mode==='BREAKOUT WATCH'){
      if(ctx.key==='ABOVE')return {label:'WAIT FOR CONFIRMATION',note:'Harga sudah melewati area konfirmasi tetapi status belum confirmed. Jangan chase.',tone:'wait'};
      if(ctx.key==='IN')return {label:'WAIT FOR CONFIRMATION',note:'Harga sedang menguji area konfirmasi. Belum menjadi area beli aktif.',tone:'wait'};
      return {label:'WAIT FOR CONFIRMATION',note:'Tunggu harga masuk area konfirmasi dan breakout berubah menjadi confirmed.',tone:'wait'};
    }

    if(mode==='BREAKOUT CONFIRMED'){
      if(ctx.key==='IN')return {label:'BUY AREA ACTIVE',note:'Harga berada di Breakout Entry. Gunakan Stop Breakout dan Next Target sebagai batas rencana.',tone:'buy'};
      if(ctx.key==='ABOVE')return {label:'DO NOT CHASE',note:'Breakout sudah valid tetapi harga berada di atas area entry. Tunggu peluang yang lebih favorable.',tone:'wait'};
      if(ctx.key==='BELOW')return {label:'WAIT / RECHECK SETUP',note:'Harga berada di bawah Breakout Entry. Tunggu respons struktur sebelum entry.',tone:'wait'};
    }

    if(mode==='PULLBACK'){
      if(ctx.key==='IN')return {label:'BUY AREA ACTIVE',note:'Harga berada di Pullback Entry. Gunakan Stop Pullback dan Next Target sebagai batas rencana.',tone:'buy'};
      if(ctx.key==='ABOVE')return {label:'WAIT FOR PULLBACK',note:'Harga belum kembali ke area pullback. Hindari mengejar harga.',tone:'wait'};
      if(ctx.key==='BELOW')return {label:'WAIT / RECHECK SUPPORT',note:'Harga sudah di bawah area pullback tetapi belum melewati style stop. Tunggu validasi ulang.',tone:'wait'};
    }

    if(mode==='BUY ON WEAKNESS'){
      if(ctx.key==='IN')return {label:'BUY AREA ACTIVE',note:'Harga berada di Weakness Entry. Gunakan Stop Weakness dan Next Target sebagai batas rencana.',tone:'buy'};
      if(ctx.key==='ABOVE')return {label:'WAIT FOR WEAKNESS',note:'Harga masih di atas area weakness. Tunggu harga kembali ke area yang direncanakan.',tone:'wait'};
      if(ctx.key==='BELOW')return {label:'WAIT / RECHECK STRUCTURE',note:'Harga sudah di bawah area weakness tetapi belum melewati style stop. Tunggu validasi ulang.',tone:'wait'};
    }

    if(ctx.key==='UNKNOWN')return {label:'WAIT / DATA PENDING',note:'Skenario aktif tetapi area harga belum lengkap.',tone:'wait'};
    return {label:'WAIT / NO ACTIVE ENTRY',note:'Belum ada entry style aktif. Gunakan level yang tampil hanya sebagai referensi struktur.',tone:'wait'};
  }

  function ensureCard(){
    const grid=$('decisionPanel')?.querySelector('.decision-grid');
    if(!grid)return null;
    let card=$('dAction')?.closest('.decision-card');
    if(!card){
      card=document.createElement('div');
      card.className='decision-card decision-action-card';
      card.innerHTML='<span>ACTION</span><strong id="dAction">—</strong><small id="dActionNote">Menentukan apakah area beli sedang aktif</small>';
    }
    if(grid.firstElementChild!==card)grid.insertBefore(card,grid.firstChild);
    return card;
  }

  function render(data){
    const card=ensureCard();if(!card)return;
    const action=actionOf(data);
    $('dAction').textContent=action.label;
    $('dActionNote').textContent=action.note;
    card.dataset.action=action.tone;
  }

  function endpoint(ticker,timeframe){
    const u=new URL(API);u.pathname='/signal';u.search='';u.hash='';u.searchParams.set('ticker',ticker);u.searchParams.set('timeframe',timeframe);return u;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,450);}
  async function refresh(){
    const ticker=clean($('tvTicker')?.value||$('decisionTicker')?.textContent),tf=apiTf($('tvInterval')?.value||'D');if(!ticker)return;
    const id=++requestId;
    try{
      const r=await fetch(endpoint(ticker,tf),{cache:'no-store'});if(!r.ok)return;
      const body=await r.json();if(id!==requestId)return;render(body.data||body);
    }catch(e){}
  }
  function bind(){
    $('tvApply')?.addEventListener('click',schedule);
    $('tvInterval')?.addEventListener('change',schedule);
    $('tvTicker')?.addEventListener('keydown',e=>{if(e.key==='Enter')schedule()});
    document.querySelectorAll('.tv-chip').forEach(btn=>btn.addEventListener('click',schedule));
    const source=$('decisionSource');if(source)new MutationObserver(schedule).observe(source,{childList:true,subtree:true,characterData:true});
    const grid=$('decisionPanel')?.querySelector('.decision-grid');if(grid)new MutationObserver(()=>ensureCard()).observe(grid,{childList:true});
    setInterval(refresh,60000);
  }
  function wait(){
    if(!$('decisionPanel')||!$('tvTicker')||!$('tvInterval')){setTimeout(wait,180);return;}
    ensureCard();bind();refresh();
  }
  wait();
})();