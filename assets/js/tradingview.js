/* Analisaku TradingView + Master Signal integration */
(function(){
  const hero=document.querySelector('.technical-hero');
  if(!hero)return;

  const moduleSrc=document.currentScript?.src||location.href;
  const cssHref=new URL('../css/tradingview.css',moduleSrc).href;
  if(!document.querySelector('link[href*="tradingview.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href=cssHref;document.head.appendChild(link);
  }

  const section=document.createElement('section');
  section.className='tv-section';
  section.id='tradingview-chart';
  section.innerHTML=`
    <div class="container"><div class="tv-shell">
      <div class="tv-head">
        <div><div class="kicker">LIVE CHART / TRADINGVIEW</div><h2>Chart lengkap di TradingView.<br>Keputusan diringkas oleh Analisaku.</h2></div>
        <p>Cari saham Bursa Efek Indonesia dan gunakan chart untuk analisis detail. Decision Panel menampilkan output Master Signal tanpa membuka formula internal.</p>
      </div>
      <div class="tv-controls">
        <div class="tv-field"><label>Kode Saham IDX</label><input id="tvTicker" type="text" autocomplete="off" value="RAJA" placeholder="Contoh: RAJA, BBCA, BMRI"></div>
        <div class="tv-field"><label>Timeframe</label><select id="tvInterval"><option value="15">15 menit</option><option value="60">1 jam</option><option value="240">4 jam</option><option value="D" selected>1 Hari</option><option value="W">1 Minggu</option><option value="M">1 Bulan</option></select></div>
        <button class="tv-apply" id="tvApply" type="button">Buka Chart →</button>
      </div>
      <div class="tv-presets"><button class="tv-chip active" data-tv-symbol="RAJA">RAJA</button><button class="tv-chip" data-tv-symbol="BBCA">BBCA</button><button class="tv-chip" data-tv-symbol="BMRI">BMRI</button><button class="tv-chip" data-tv-symbol="TLKM">TLKM</button><button class="tv-chip" data-tv-symbol="ANTM">ANTM</button></div>
      <div class="tv-chart-frame" id="tvChartFrame" aria-label="TradingView Advanced Chart"></div>
      <div class="tv-note"><div><b>Catatan:</b> chart/data disediakan TradingView. Decision Panel bersifat analisis dan edukasi, bukan rekomendasi transaksi. Metodologi proprietary Analisaku tidak ditampilkan.</div><div class="tv-status" id="tvStatus">IDX:RAJA • 1D</div></div>

      <section class="decision-panel" id="decisionPanel">
        <div class="decision-head">
          <div><div class="kicker">ANALISAKU DECISION PANEL</div><h3><span id="decisionTicker">RAJA</span> <small id="decisionTf">1D</small></h3><p>Output ringkas dari Master Signal: trend, area keputusan, trigger, invalidation, target, dan status.</p></div>
          <div class="decision-status waiting" id="decisionStatus"><span></span><b>WAITING</b><small>Signal API belum aktif</small></div>
        </div>
        <div class="decision-source" id="decisionSource"><div><span>DATA SOURCE</span><b>Signal API siap dihubungkan</b></div><button type="button" id="tvDemo">Preview RAJA</button></div>
        <div class="decision-grid">
          <div class="decision-card"><span>TREND / REGIME</span><strong id="dTrend">—</strong><small>Output Master Signal</small></div>
          <div class="decision-card"><span>SETUP</span><strong id="dSetup">—</strong><small>Metodologi disembunyikan</small></div>
          <div class="decision-card"><span>ENTRY ZONE</span><strong id="dEntry">—</strong><small>Area keputusan</small></div>
          <div class="decision-card"><span>TRIGGER</span><strong id="dBreakout">—</strong><small>Konfirmasi harga</small></div>
          <div class="decision-card risk"><span>INVALIDATION / STOP</span><strong id="dStop">—</strong><small>Batas skenario dianggap salah</small></div>
          <div class="decision-card"><span>TARGET 1</span><strong id="dTp1">—</strong><small>Target terdekat</small></div>
          <div class="decision-card"><span>TARGET 2</span><strong id="dTp2">—</strong><small>Target lanjutan</small></div>
          <div class="decision-card"><span>TARGET 3</span><strong id="dTp3">—</strong><small>Target ekstensi</small></div>
        </div>
        <div class="decision-action"><div><span>DECISION</span><strong id="dDecision">Belum ada keputusan otomatis.</strong></div><p id="dDecisionCopy">Master Signal akan menampilkan WAIT, WATCH, BUY SETUP, HOLD, TAKE PROFIT, atau EXIT.</p></div>
        <div class="decision-demo-note" id="decisionDemoNote" hidden>Preview memakai contoh RAJA sebelumnya, bukan signal API dan bukan data live.</div>
      </section>
    </div></div>`;
  hero.insertAdjacentElement('afterend',section);

  const $=id=>document.getElementById(id);
  const ticker=$('tvTicker'),interval=$('tvInterval'),apply=$('tvApply'),frame=$('tvChartFrame'),status=$('tvStatus');
  const chips=[...section.querySelectorAll('.tv-chip')],demoBtn=$('tvDemo');
  let currentSymbol='RAJA',renderToken=0,signalApi='',signalRequest=0;

  const cleanTicker=v=>String(v||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20)||'RAJA';
  const tfLabel=v=>({15:'15M',60:'1H',240:'4H',D:'1D',W:'1W',M:'1M'})[v]||v;
  const theme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
  const put=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  const price=v=>{if(v===null||v===undefined||v==='')return '—';const n=Number(v);return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v)};
  const range=(a,b)=>a&&b?price(a)+' – '+price(b):price(a||b);

  function sourceText(value){const b=document.querySelector('#decisionSource b');if(b)b.textContent=value}
  function setBadge(value,sub='Master Signal'){
    const badge=$('decisionStatus');if(!badge)return;
    const s=String(value||'WAIT').toUpperCase();
    badge.className='decision-status '+(s==='WATCH'?'watch':'');
    badge.innerHTML='<span></span><b>'+s+'</b><small>'+sub+'</small>';
    const color=s==='EXIT'?'var(--red)':(s==='BUY SETUP'||s==='HOLD')?'var(--green)':(s==='WATCH'||s==='TAKE PROFIT')?'var(--gold)':'var(--muted2)';
    badge.style.borderColor='color-mix(in srgb,'+color+' 38%,var(--line))';
    badge.querySelector('span').style.background=color;
    badge.querySelector('b').style.color=color;
  }
  function decisionCopy(s){
    return ({
      'BUY SETUP':['Trigger terkonfirmasi.','Kelola risiko dan position size sesuai trading plan.'],
      'HOLD':['Setup masih valid.','Ikuti invalidation dan target; hindari keputusan emosional.'],
      'TAKE PROFIT':['Target tercapai.','Evaluasi take profit bertahap dan perlindungan sisa posisi.'],
      'EXIT':['Setup tidak valid / tekanan bearish.','Prioritaskan proteksi risiko dan tunggu setup baru.'],
      'WATCH':['Pantau area keputusan.','Tunggu konfirmasi; jangan chase harga.'],
      'WAIT':['Tunggu setup dan konfirmasi.','Tidak perlu memaksakan transaksi.']
    })[s]||['Tunggu setup dan konfirmasi.','Tidak perlu memaksakan transaksi.'];
  }
  function resetDecision(message='Signal API belum aktif'){
    put('dTrend','—');put('dSetup','—');put('dEntry','—');put('dBreakout','—');put('dStop','—');put('dTp1','—');put('dTp2','—');put('dTp3','—');
    put('dDecision','Belum ada keputusan otomatis.');put('dDecisionCopy','Master Signal akan menampilkan WAIT, WATCH, BUY SETUP, HOLD, TAKE PROFIT, atau EXIT.');
    setBadge('WAITING',message);$('decisionDemoNote').hidden=true;
  }
  function applySignal(data){
    if(!data)return;
    const s=String(data.status||'WAIT').toUpperCase();
    put('dTrend',String(data.trend||'NEUTRAL').toUpperCase());put('dSetup',String(data.setup||'INACTIVE').toUpperCase());
    put('dEntry',range(data.entry_low,data.entry_high));put('dBreakout',price(data.trigger));put('dStop',price(data.invalidation));
    put('dTp1',price(data.target1));put('dTp2',price(data.target2));put('dTp3',price(data.target3));
    const copy=decisionCopy(s);put('dDecision',copy[0]);put('dDecisionCopy',copy[1]);setBadge(s,'Master Signal');
    const ts=Number(data.received_at||data.updated_at);sourceText('Master Signal'+(Number.isFinite(ts)?' • '+new Date(ts).toLocaleString('id-ID') : ''));
    $('decisionDemoNote').hidden=true;
  }
  function syncHeader(){put('decisionTicker',currentSymbol);put('decisionTf',tfLabel(interval.value||'D'))}

  async function loadSignalConfig(){
    await new Promise(resolve=>{
      const s=document.createElement('script');s.src=new URL('signal-config.js',moduleSrc).href;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);
    });
    signalApi=String(window.ANALISAKU_SIGNAL_API||'').trim();
    if(!signalApi){sourceText('Signal API siap — endpoint belum diaktifkan');resetDecision('Endpoint belum diaktifkan')}
  }
  async function fetchSignal(){
    if(!signalApi)return;
    const req=++signalRequest;
    sourceText('Mengambil Master Signal…');
    try{
      const url=new URL(signalApi);url.searchParams.set('ticker',currentSymbol);url.searchParams.set('timeframe',interval.value||'D');
      const res=await fetch(url,{cache:'no-store'});if(req!==signalRequest)return;
      if(res.status===404){resetDecision('Belum ada signal');sourceText('Belum ada signal untuk '+currentSymbol+' • '+tfLabel(interval.value||'D'));return}
      if(!res.ok)throw new Error('HTTP '+res.status);
      const body=await res.json();applySignal(body.data||body);
    }catch(e){if(req===signalRequest){resetDecision('API tidak tersedia');sourceText('Signal API belum dapat diakses')}}
  }

  function showDemo(){
    if(currentSymbol!=='RAJA'){alert('Preview contoh tersedia untuk RAJA.');return}
    applySignal({trend:'BULLISH',setup:'ACTIVE',status:'WATCH',entry_low:'864',entry_high:'880',trigger:'936',invalidation:'852',target1:'955',target2:'1028',target3:'1090'});
    sourceText('Preview manual RAJA');$('decisionDemoNote').hidden=false;
  }

  function renderChart(){
    const token=++renderToken;currentSymbol=cleanTicker(ticker.value);ticker.value=currentSymbol;const tvTf=interval.value||'D';
    status.textContent='IDX:'+currentSymbol+' • '+tfLabel(tvTf);chips.forEach(c=>c.classList.toggle('active',c.dataset.tvSymbol===currentSymbol));syncHeader();resetDecision(signalApi?'Mengambil signal…':'Endpoint belum diaktifkan');frame.innerHTML='';
    const wrap=document.createElement('div');wrap.className='tradingview-widget-container';wrap.style.cssText='height:100%;width:100%';
    const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.cssText='height:100%;width:100%';wrap.appendChild(widget);
    const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;
    script.text=JSON.stringify({autosize:true,symbol:'IDX:'+currentSymbol,interval:tvTf,timezone:'exchange',theme:theme(),backgroundColor:theme()==='light'?'#fffdf8':'#081522',gridColor:theme()==='light'?'rgba(55,43,22,0.08)':'rgba(255,255,255,0.06)',style:'1',locale:'en',hide_side_toolbar:false,hide_top_toolbar:false,hide_legend:false,hide_volume:false,allow_symbol_change:true,save_image:true,withdateranges:true,calendar:false,details:false,hotlist:false,support_host:'https://www.tradingview.com'});
    wrap.appendChild(script);if(token===renderToken)frame.appendChild(wrap);fetchSignal();
  }

  apply.addEventListener('click',renderChart);ticker.addEventListener('keydown',e=>{if(e.key==='Enter')renderChart()});interval.addEventListener('change',renderChart);
  chips.forEach(c=>c.addEventListener('click',()=>{ticker.value=c.dataset.tvSymbol;renderChart()}));demoBtn.addEventListener('click',showDemo);
  let lastTheme=theme();new MutationObserver(()=>{const next=theme();if(next!==lastTheme){lastTheme=next;renderChart()}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  loadSignalConfig().then(()=>{renderChart();setInterval(fetchSignal,60000)});
})();
