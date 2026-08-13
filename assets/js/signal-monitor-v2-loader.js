/* Analisaku Technical Monitor cache-busting loader */
(function(){
  const VERSION='20260813-1510';
  const base=document.currentScript?.src||location.href;

  function polishPublicLabels(){
    const monitor=document.getElementById('signalMonitor');
    if(monitor){
      const kicker=monitor.querySelector('.kicker');
      const title=monitor.querySelector('h3');
      const copy=monitor.querySelector('.signal-monitor-head p');
      if(kicker)kicker.textContent='ANALISAKU MARKET RADAR';
      if(title)title.innerHTML='Market Radar <small>1D</small>';
      if(copy)copy.textContent='Saham diprioritaskan berdasarkan output Analisaku. Klik saham untuk membuka Decision Panel dan chart.';
    }

    const gc=document.getElementById('goldenCrossRadar');
    if(gc){
      const kicker=gc.querySelector('.kicker');
      const copy=gc.querySelector('.signal-monitor-head p');
      if(kicker)kicker.textContent='ANALISAKU GOLDEN CROSS RADAR';
      if(copy)copy.textContent='Saham yang terdeteksi memiliki struktur Golden Cross. Parameter dan perhitungan internal tidak ditampilkan.';
    }
  }

  function loadV2(){
    const panel=document.getElementById('decisionPanel');
    if(!panel){setTimeout(loadV2,200);return;}

    document.getElementById('signalMonitor')?.remove();
    document.getElementById('goldenCrossRadar')?.remove();
    document.querySelectorAll('script[data-analisaku-monitor-v2]').forEach(el=>el.remove());
    document.querySelectorAll('link[href*="signal-monitor.css"]').forEach(el=>el.remove());

    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href=new URL('../css/signal-monitor.css',base).href+'?v='+VERSION;
    document.head.appendChild(css);

    const s=document.createElement('script');
    s.src=new URL('signal-monitor.js',base).href+'?v='+VERSION;
    s.async=true;
    s.dataset.analisakuMonitorV2='true';
    s.onload=()=>{
      polishPublicLabels();
      setTimeout(polishPublicLabels,300);
    };
    document.head.appendChild(s);
  }

  loadV2();
})();
