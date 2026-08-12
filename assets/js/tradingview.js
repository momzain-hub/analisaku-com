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
          <div><div class="kicker">LIVE CHART / TRADINGVIEW</div><h2>Analisis langsung di chart.</h2></div>
          <p>Cari saham Bursa Efek Indonesia, pilih timeframe, gunakan drawing tools dan indikator bawaan TradingView. Setup indikator pribadi Analisaku akan kita hubungkan pada tahap berikutnya.</p>
        </div>
        <div class="tv-controls">
          <div class="tv-field"><label>Kode Saham IDX</label><input id="tvTicker" type="text" inputmode="text" autocomplete="off" value="RAJA" placeholder="Contoh: RAJA, BBCA, BMRI"></div>
          <div class="tv-field"><label>Timeframe</label><select id="tvInterval"><option value="15">15 menit</option><option value="60">1 jam</option><option value="240">4 jam</option><option value="D" selected>1 Hari</option><option value="W">1 Minggu</option><option value="M">1 Bulan</option></select></div>
          <button class="tv-apply" id="tvApply" type="button">Buka Chart →</button>
        </div>
        <div class="tv-presets" aria-label="Contoh ticker"><button class="tv-chip active" data-tv-symbol="RAJA">RAJA</button><button class="tv-chip" data-tv-symbol="BBCA">BBCA</button><button class="tv-chip" data-tv-symbol="BMRI">BMRI</button><button class="tv-chip" data-tv-symbol="TLKM">TLKM</button><button class="tv-chip" data-tv-symbol="ANTM">ANTM</button></div>
        <div class="tv-chart-frame" id="tvChartFrame" aria-label="TradingView Advanced Chart"></div>
        <div class="tv-note"><div><b>Catatan:</b> data dan chart disediakan oleh TradingView. Fitur ini untuk analisis dan edukasi; bukan rekomendasi beli/jual. Indikator Pine Script pribadi belum ditampilkan pada embed ini.</div><div class="tv-status" id="tvStatus">IDX:RAJA • 1D</div></div>
      </div>
    </div>`;
  hero.insertAdjacentElement('afterend',section);

  const ticker=document.getElementById('tvTicker');
  const interval=document.getElementById('tvInterval');
  const apply=document.getElementById('tvApply');
  const frame=document.getElementById('tvChartFrame');
  const status=document.getElementById('tvStatus');
  const chips=[...section.querySelectorAll('.tv-chip')];
  let currentSymbol='RAJA';
  let renderToken=0;

  const cleanTicker=value=>String(value||'').toUpperCase().replace(/^IDX:/,'').replace(/[^A-Z0-9._-]/g,'').slice(0,20)||'RAJA';
  const labelInterval=value=>({15:'15M',60:'1H',240:'4H',D:'1D',W:'1W',M:'1M'})[value]||value;
  const getTheme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';

  function renderChart(){
    const token=++renderToken;
    currentSymbol=cleanTicker(ticker.value);
    ticker.value=currentSymbol;
    const tvSymbol='IDX:'+currentSymbol;
    const tvInterval=interval.value||'D';
    status.textContent=tvSymbol+' • '+labelInterval(tvInterval);
    chips.forEach(c=>c.classList.toggle('active',c.dataset.tvSymbol===currentSymbol));
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
  chips.forEach(chip=>chip.addEventListener('click',()=>{ticker.value=chip.dataset.tvSymbol;renderChart()}));

  let lastTheme=getTheme();
  const observer=new MutationObserver(()=>{
    const next=getTheme();
    if(next!==lastTheme){lastTheme=next;renderChart()}
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  renderChart();
})();
