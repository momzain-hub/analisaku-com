/* Analisaku Signal API configuration.
   Public endpoint only. Never put API secrets, tokens, or proprietary engine logic here. */
window.ANALISAKU_SIGNAL_API = "https://analisaku-signal.pitizain.workers.dev/signal";

(function(){
  if(!document.querySelector('.technical-hero'))return;
  let tries=0;
  const maxTries=150;
  const VERSION='20260813-1510';

  function loadMonitor(){
    if(document.querySelector('script[data-analisaku-monitor-loader-v2]'))return true;
    if(!document.getElementById('decisionPanel'))return false;
    const base=document.currentScript?.src||location.href;
    const s=document.createElement('script');
    s.src=new URL('signal-monitor-v2-loader.js',base).href+'?v='+VERSION;
    s.async=true;
    s.dataset.analisakuMonitorLoaderV2='true';
    document.head.appendChild(s);
    return true;
  }

  if(loadMonitor())return;
  const timer=setInterval(()=>{
    tries+=1;
    if(loadMonitor()||tries>=maxTries)clearInterval(timer);
  },100);
})();
