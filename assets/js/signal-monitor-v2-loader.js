/* Analisaku Signal Monitor V2 cache-busting loader */
(function(){
  const VERSION='20260813-1204';
  const base=document.currentScript?.src||location.href;

  function loadV2(){
    const panel=document.getElementById('decisionPanel');
    if(!panel){setTimeout(loadV2,200);return;}

    const old=document.getElementById('signalMonitor');
    if(old)old.remove();

    document.querySelectorAll('link[href*="signal-monitor.css"]').forEach(el=>el.remove());
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href=new URL('../css/signal-monitor.css',base).href+'?v='+VERSION;
    document.head.appendChild(css);

    if(document.querySelector('script[data-analisaku-monitor-v2]'))return;
    const s=document.createElement('script');
    s.src=new URL('signal-monitor.js',base).href+'?v='+VERSION;
    s.async=true;
    s.dataset.analisakuMonitorV2='true';
    document.head.appendChild(s);
  }

  loadV2();
})();
