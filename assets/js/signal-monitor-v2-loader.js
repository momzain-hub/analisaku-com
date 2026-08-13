/* Analisaku Technical Monitor cache-busting loader */
(function(){
  const VERSION='20260813-1532';
  const base=document.currentScript?.src||location.href;

  function loadStyles(){
    document.querySelectorAll('link[href*="signal-monitor.css"],link[href*="signal-monitor-plus.css"]').forEach(el=>el.remove());

    const baseCss=document.createElement('link');
    baseCss.rel='stylesheet';
    baseCss.href=new URL('../css/signal-monitor.css',base).href+'?v='+VERSION;
    document.head.appendChild(baseCss);

    const plusCss=document.createElement('link');
    plusCss.rel='stylesheet';
    plusCss.href=new URL('../css/signal-monitor-plus.css',base).href+'?v='+VERSION;
    document.head.appendChild(plusCss);
  }

  function loadV2(){
    const panel=document.getElementById('decisionPanel');
    if(!panel){setTimeout(loadV2,200);return;}

    document.getElementById('signalMonitor')?.remove();
    document.getElementById('goldenCrossRadar')?.remove();
    document.querySelectorAll('script[data-analisaku-monitor-v2]').forEach(el=>el.remove());

    loadStyles();

    const s=document.createElement('script');
    s.src=new URL('signal-monitor.js',base).href+'?v='+VERSION;
    s.async=true;
    s.dataset.analisakuMonitorV2='true';
    document.head.appendChild(s);
  }

  loadV2();
})();
