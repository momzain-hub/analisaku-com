/* Analisaku Signal API configuration.
   Public endpoint only. Never put API secrets, tokens, or Pine logic here. */
window.ANALISAKU_SIGNAL_API = "https://analisaku-signal.pitizain.workers.dev/signal";

/* Technical page add-on: wait for Decision Panel, then load 20-stock monitor. */
(function(){
  if(!document.querySelector('.technical-hero'))return;

  let tries=0;
  const maxTries=100; // ~10 seconds

  function loadMonitor(){
    if(document.querySelector('script[src*="signal-monitor.js"]'))return true;
    if(!document.getElementById('decisionPanel'))return false;

    const base=document.currentScript?.src||location.href;
    const s=document.createElement('script');
    s.src=new URL('signal-monitor.js',base).href+'?v=2';
    s.async=true;
    document.head.appendChild(s);
    return true;
  }

  if(loadMonitor())return;

  const timer=setInterval(()=>{
    tries+=1;
    if(loadMonitor()||tries>=maxTries)clearInterval(timer);
  },100);
})();
