/* Analisaku Technical Monitor cache-busting loader */
(function(){
  const VERSION='20260813-1605';
  const base=document.currentScript?.src||location.href;

  function loadStyles(){
    document.querySelectorAll('link[href*="signal-monitor.css"],link[href*="signal-monitor-plus.css"],link[href*="signal-monitor-mobile.css"]').forEach(el=>el.remove());

    ['../css/signal-monitor.css','../css/signal-monitor-plus.css','../css/signal-monitor-mobile.css'].forEach(path=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=new URL(path,base).href+'?v='+VERSION;
      document.head.appendChild(link);
    });
  }

  function loadEnhancer(){
    document.querySelectorAll('script[data-analisaku-radar-enhance]').forEach(el=>el.remove());
    delete document.documentElement.dataset.radarUxReady;
    const enhance=document.createElement('script');
    enhance.src=new URL('signal-monitor-enhance.js',base).href+'?v='+VERSION;
    enhance.async=true;
    enhance.dataset.analisakuRadarEnhance='true';
    document.head.appendChild(enhance);
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
    s.onload=loadEnhancer;
    document.head.appendChild(s);
  }

  loadV2();
})();