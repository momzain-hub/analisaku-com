/* Analisaku Home Market Command Center */
(function(){
  const $=id=>document.getElementById(id);
  const moduleSrc=document.currentScript?.src||location.href;
  const dataUrl=new URL('../data/weekly-outlook.json',moduleSrc).href;
  const configUrl=new URL('signal-config.js',moduleSrc).href;

  function jakartaToday(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function chooseWeek(weeks,today){
    const active=weeks.find(w=>today>=w.start&&today<=w.end);
    if(active)return active;
    const upcoming=weeks.find(w=>today<w.start);
    return upcoming||weeks[weeks.length-1];
  }

  function renderWeekly(data){
    const host=$('weeklyOutlook');
    if(!host)return;
    const today=jakartaToday();
    const week=chooseWeek(data.weeks||[],today);
    if(!week){host.innerHTML='<div class="mc-empty">Weekly Outlook belum tersedia.</div>';return}

    $('weeklyRange').textContent=week.display_range;
    $('weeklyBias').textContent=week.bias;
    $('weeklyCall').textContent=week.weekly_call;
    $('weeklyStrategy').textContent=week.strategy;
    $('weeklyLegend').textContent=data.symbol_legend||'◆ = Key Timing Window';

    host.innerHTML=week.days.map(day=>{
      const isToday=day.date===today;
      const classes=['weekly-day'];
      if(day.key)classes.push('key-window');
      if(day.closed)classes.push('market-closed');
      if(isToday)classes.push('is-today');
      const badge=isToday?(day.closed?'TODAY • MARKET CLOSED':day.key?'TODAY • ◆ KEY WINDOW':'TODAY'):day.closed?'MARKET CLOSED':day.key?'◆ KEY WINDOW':'';
      return `<article class="${classes.join(' ')}">
        <div class="weekly-day-top"><strong>${day.label}${day.key?' ◆':''}</strong>${badge?`<span>${badge}</span>`:''}</div>
        <p>${day.text}</p>
      </article>`;
    }).join('');
  }

  fetch(dataUrl,{cache:'no-store'})
    .then(r=>r.ok?r.json():Promise.reject())
    .then(renderWeekly)
    .catch(()=>{const host=$('weeklyOutlook');if(host)host.innerHTML='<div class="mc-empty">Weekly Outlook belum dapat dimuat.</div>'});

  const ticker=$('homeTicker');
  const tf=$('homeTf');
  const check=$('homeCheckSignal');
  let api='';

  function loadConfig(){
    return new Promise(resolve=>{
      if(window.ANALISAKU_SIGNAL_API){api=window.ANALISAKU_SIGNAL_API;resolve();return}
      const s=document.createElement('script');s.src=configUrl;s.onload=()=>{api=String(window.ANALISAKU_SIGNAL_API||'');resolve()};s.onerror=resolve;document.head.appendChild(s);
    });
  }

  const clean=v=>String(v||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20)||'RAJA';
  const price=v=>{if(v===undefined||v===null||v==='')return '—';const n=Number(v);return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v)};
  const publicStatus=status=>({
    'WAIT':'WAIT',
    'WATCH':'WATCH',
    'BUY SETUP':'SETUP ACTIVE',
    'HOLD':'ACTIVE',
    'TAKE PROFIT':'TARGET REACHED',
    'EXIT':'INVALID'
  })[status]||status||'—';

  function contextText(status){
    return ({
      'WATCH':'Area keputusan sedang dipantau; tunggu konfirmasi lanjutan.',
      'WAIT':'Belum ada kondisi teknikal yang cukup kuat.',
      'BUY SETUP':'Trigger teknikal sudah terkonfirmasi.',
      'HOLD':'Struktur teknikal masih aktif.',
      'TAKE PROFIT':'Harga sudah mencapai area target.',
      'EXIT':'Skenario teknikal sebelumnya sudah tidak valid.'
    })[status]||'Menunggu output Master Signal.';
  }

  function resetQuick(note='Pilih ticker lalu cek technical snapshot terakhir.'){
    ['hqTrend','hqStatus','hqEntry','hqTrigger','hqStop','hqTarget'].forEach(id=>{if($(id))$(id).textContent='—'});
    if($('hqDecision'))$('hqDecision').textContent=note;
    if($('hqSource'))$('hqSource').textContent='Master Signal';
  }

  async function fetchQuick(){
    const symbol=clean(ticker.value);ticker.value=symbol;
    if(!api){resetQuick('Signal API belum tersedia.');return}
    $('hqSource').textContent='Mengambil technical snapshot…';
    try{
      const url=new URL(api);url.searchParams.set('ticker',symbol);url.searchParams.set('timeframe',tf.value||'D');
      const r=await fetch(url,{cache:'no-store'});
      if(r.status===404){resetQuick('Belum ada snapshot tersimpan untuk ticker/timeframe ini.');return}
      if(!r.ok)throw new Error();
      const d=await r.json();
      const raw=String(d.status||'').toUpperCase();
      $('hqTrend').textContent=String(d.trend||'—').toUpperCase();
      $('hqStatus').textContent=publicStatus(raw);
      $('hqEntry').textContent=(d.entry_low||d.entry_high)?`${price(d.entry_low)} – ${price(d.entry_high)}`:'—';
      $('hqTrigger').textContent=price(d.trigger);
      $('hqStop').textContent=price(d.invalidation);
      $('hqTarget').textContent=price(d.target1);
      $('hqDecision').textContent=contextText(raw);
      const ts=Number(d.received_at||d.updated_at);
      $('hqSource').textContent='Technical snapshot'+(Number.isFinite(ts)?' • '+new Date(ts).toLocaleString('id-ID'):'');
    }catch(e){resetQuick('Signal API belum dapat diakses.');}
  }

  if(check)check.addEventListener('click',fetchQuick);
  if(ticker)ticker.addEventListener('keydown',e=>{if(e.key==='Enter')fetchQuick()});
  loadConfig().then(()=>resetQuick());
})();
