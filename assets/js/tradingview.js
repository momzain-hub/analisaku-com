/* Analisaku TradingView integration — Technical page */
(function(){
  const hero=document.querySelector('.technical-hero');
  if(!hero)return;

  const cssHref=new URL('../css/tradingview.css',document.currentScript.src).href;
  if(!document.querySelector('link[href*="tradingview.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href=cssHref;document.head.appendChild(link);
  }

  const section=document.createElement('section');
  section.className='tv-section';
  section.id='tradingview-chart';
  section.innerHTML=`
    <div class="container">
      <div class="tv-shell">
        <div class="tv-head">
          <div><div class="kicker">LIVE CHART / TRADINGVIEW</div><h2>Chart lengkap di TradingView.<br>Keputusan diringkas oleh Analisaku.</h2></div>
          <p>Cari saham Bursa Efek Indonesia dan gunakan chart untuk analisis detail. Di bawah chart, Analisaku menyiapkan Decision Panel yang nantinya menerima output gabungan dari indikator Anda.</p>
        </div>
        <div class="tv-controls">
          <div class="tv-field"><label>Kode Saham IDX</label><input id="tvTicker" type="text" inputmode="text" autocomplete="off" value="RAJA" placeholder="Contoh: RAJA, BBCA, BMRI"></div>
          <div class="tv-field"><label>Timeframe</label><select id="tvInterval"><option value="15">15 menit</option><option value="60">1 jam</option><option value="240">4 jam</option><option value="D" selected>1 Hari</option><option value="W">1 Minggu</option><option value="M">1 Bulan</option></select></div>
          <button class="tv-apply" id="tvApply" type="button">Buka Chart →</button>
        </div>
        <div class="tv-presets" aria-label="Contoh ticker"><button class="tv-chip active" data-tv-symbol="RAJA">RAJA</button><button class="tv-chip" data-tv-symbol="BBCA">BBCA</button><button class="tv-chip" data-tv-symbol="BMRI">BMRI</button><button class="tv-chip" data-tv-symbol="TLKM">TLKM</button><button class="tv-chip" data-tv-symbol="ANTM">ANTM</button></div>
        <div class="tv-chart-frame" id="tvChartFrame" aria-label="TradingView Advanced Chart"></div>
        <div class="tv-note"><div><b>Catatan:</b> data dan chart disediakan oleh TradingView. Fitur ini untuk analisis dan edukasi; bukan rekomendasi beli/jual. Pine Script pribadi belum terhubung ke website.</div><div class="tv-status" id="tvStatus">IDX:RAJA • 1D</div></div>

        <section class="decision-panel" id="decisionPanel" aria-label="Analisaku Decision Panel">
          <div class="decision-head">
            <div>
              <div class="kicker">ANALISAKU DECISION PANEL</div>
              <h3><span id="decisionTicker">RAJA</span> <small id="decisionTf">1D</small></h3>
              <p>Tujuan panel ini adalah menerjemahkan output indikator menjadi keputusan yang singkat, terukur, dan mudah dibaca.</p>
            </div>
            <div class="decision-status waiting" id="decisionStatus"><span></span><b>WAITING</b><small>Signal engine belum terhubung</small></div>
          </div>

          <div class="decision-source" id="decisionSource">
            <div><span>DATA SOURCE</span><b>Belum terhubung ke Master Pine Signal</b></div>
            <button type="button" id="tvDemo">Preview format RAJA</button>
          </div>

          <div class="decision-grid">
            <div class="decision-card"><span>TREND / REGIME</span><strong id="dTrend">—</strong><small id="dTrendNote">Menunggu indikator trend</small></div>
            <div class="decision-card"><span>SETUP</span><strong id="dSetup">—</strong><small id="dSetupNote">Menunggu setup utama</small></div>
            <div class="decision-card"><span>ENTRY ZONE</span><strong id="dEntry">—</strong><small id="dEntryNote">Pullback / breakout</small></div>
            <div class="decision-card"><span>BREAKOUT TRIGGER</span><strong id="dBreakout">—</strong><small id="dBreakoutNote">Konfirmasi harga</small></div>
            <div class="decision-card risk"><span>INVALIDATION / STOP</span><strong id="dStop">—</strong><small id="dStopNote">Batas skenario dianggap salah</small></div>
            <div class="decision-card"><span>TARGET 1</span><strong id="dTp1">—</strong><small>Target terdekat</small></div>
            <div class="decision-card"><span>TARGET 2</span><strong id="dTp2">—</strong><small>Target lanjutan</small></div>
            <div class="decision-card"><span>TARGET 3</span><strong id="dTp3">—</strong><small>Target ekstensi</small></div>
          </div>

          <div class="decision-action">
            <div><span>DECISION</span><strong id="dDecision">Belum ada keputusan otomatis.</strong></div>
            <p id="dDecisionCopy">Setelah tiga Pine Script digabung, bagian ini akan menampilkan WAIT, WATCH, BUY SETUP, HOLD, TAKE PROFIT, atau EXIT berdasarkan rule Anda.</p>
          </div>
          <div class="decision-demo-note" id="decisionDemoNote" hidden>Preview ini memakai level dari screenshot RAJA yang Anda lampirkan, bukan data live dan bukan rekomendasi transaksi.</div>
        </section>
      </div>
    </div>`;
  hero.insertAdjacentElement('afterend',section);

  const ticker=document.getElementById('tvTicker');
  const interval=document.getElementById('tvInterval');
  const apply=document.getElementById('tvApply');
  const frame=document.getElementById('tvChartFrame');
  const status=document.getElementById('tvStatus');
  const chips=[...section.querySelectorAll('.tv-chip')];
  const demoBtn=document.getElementById('tvDemo');
  let currentSymbol='RAJA';
  let renderToken=0;

  const cleanTicker=value=>String(value||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20)||'RAJA';
  const labelInterval=value=>({15:'15M',60:'1H',240:'4H',D:'1D',W:'1W',M:'1M'})[value]||value;
  const getTheme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
  const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};

  function resetDecision(){
    text('dTrend','—'); text('dTrendNote','Menunggu indikator trend');
    text('dSetup','—'); text('dSetupNote','Menunggu setup utama');
    text('dEntry','—'); text('dEntryNote','Pullback / breakout');
    text('dBreakout','—'); text('dBreakoutNote','Konfirmasi harga');
    text('dStop','—'); text('dStopNote','Batas skenario dianggap salah');
    text('dTp1','—'); text('dTp2','—'); text('dTp3','—');
    text('dDecision','Belum ada keputusan otomatis.');
    text('dDecisionCopy','Setelah tiga Pine Script digabung, bagian ini akan menampilkan WAIT, WATCH, BUY SETUP, HOLD, TAKE PROFIT, atau EXIT berdasarkan rule Anda.');
    const badge=document.getElementById('decisionStatus');
    badge.className='decision-status waiting';
    badge.innerHTML='<span></span><b>WAITING</b><small>Signal engine belum terhubung</small>';
    const source=document.querySelector('#decisionSource b');if(source)source.textContent='Belum terhubung ke Master Pine Signal';
    const note=document.getElementById('decisionDemoNote');if(note)note.hidden=true;
  }

  function syncDecisionHeader(){
    text('decisionTicker',currentSymbol);
    text('decisionTf',labelInterval(interval.value||'D'));
    resetDecision();
  }

  function showRajaDemo(){
    if(currentSymbol!=='RAJA'){
      alert('Preview contoh saat ini hanya dibuat dari screenshot RAJA yang Anda lampirkan. Pilih RAJA terlebih dahulu.');
      return;
    }
    text('dTrend','BULLISH'); text('dTrendNote','Struktur masih constructive');
    text('dSetup','FIB CONTINUATION'); text('dSetupNote','Contoh interpretasi manual');
    text('dEntry','864 – 880'); text('dEntryNote','Area pullback yang dipantau');
    text('dBreakout','> 936 / > 955'); text('dBreakoutNote','Konfirmasi continuation');
    text('dStop','< 852'); text('dStopNote','Major invalidation lebih bawah: 832–810');
    text('dTp1','936 – 955'); text('dTp2','1.028 – 1.040'); text('dTp3','1.090 – 1.105');
    text('dDecision','WATCH — jangan chase.');
    text('dDecisionCopy','Tunggu pullback valid ke area entry atau breakout terkonfirmasi. Ini hanya preview format keputusan dari screenshot yang Anda kirim.');
    const badge=document.getElementById('decisionStatus');
    badge.className='decision-status watch';
    badge.innerHTML='<span></span><b>WATCH</b><small>Preview manual, bukan signal live</small>';
    const source=document.querySelector('#decisionSource b');if(source)source.textContent='Preview manual dari screenshot RAJA';
    const note=document.getElementById('decisionDemoNote');if(note)note.hidden=false;
  }

  function renderChart(){
    const token=++renderToken;
    currentSymbol=cleanTicker(ticker.value);
    ticker.value=currentSymbol;
    const tvSymbol='IDX:'+currentSymbol;
    const tvInterval=interval.value||'D';
    status.textContent=tvSymbol+' • '+labelInterval(tvInterval);
    chips.forEach(c=>c.classList.toggle('active',c.dataset.tvSymbol===currentSymbol));
    syncDecisionHeader();
    frame.innerHTML='';

    const container=document.createElement('div');
    container.className='tradingview-widget-container';
    container.style.height='100%';container.style.width='100%';
    const widget=document.createElement('div');
    widget.className='tradingview-widget-container__widget';
    widget.style.height='100%';widget.style.width='100%';
    container.appendChild(widget);

    const script=document.createElement('script');
    script.type='text/javascript';
    script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async=true;
    script.text=JSON.stringify({
      autosize:true,
      symbol:tvSymbol,
      interval:tvInterval,
      timezone:'exchange',
      theme:getTheme(),
      backgroundColor:getTheme()==='light'?'#fffdf8':'#081522',
      gridColor:getTheme()==='light'?'rgba(55,43,22,0.08)':'rgba(255,255,255,0.06)',
      style:'1',
      locale:'en',
      hide_side_toolbar:false,
      hide_top_toolbar:false,
      hide_legend:false,
      hide_volume:false,
      allow_symbol_change:true,
      save_image:true,
      withdateranges:true,
      calendar:false,
      details:false,
      hotlist:false,
      support_host:'https://www.tradingview.com'
    });
    container.appendChild(script);
    const copyright=document.createElement('div');
    copyright.className='tradingview-widget-copyright';
    copyright.innerHTML='<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Chart</a> by TradingView';
    container.appendChild(copyright);
    if(token===renderToken)frame.appendChild(container);
  }

  apply.addEventListener('click',renderChart);
  ticker.addEventListener('keydown',e=>{if(e.key==='Enter')renderChart()});
  interval.addEventListener('change',()=>{syncDecisionHeader()});
  chips.forEach(chip=>chip.addEventListener('click',()=>{ticker.value=chip.dataset.tvSymbol;renderChart()}));
  if(demoBtn)demoBtn.addEventListener('click',showRajaDemo);

  let lastTheme=getTheme();
  const observer=new MutationObserver(()=>{
    const next=getTheme();
    if(next!==lastTheme){lastTheme=next;renderChart()}
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  renderChart();
})();
