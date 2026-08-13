/* Analisaku Signal API configuration.
   Public endpoint only. Never put API secrets, tokens, or Pine logic here. */
window.ANALISAKU_SIGNAL_API = "https://analisaku-signal.pitizain.workers.dev/signal";

/* Technical page add-on: load the 20-stock monitor after Decision Panel exists. */
(function(){
  if(!document.getElementById('decisionPanel'))return;
  if(document.querySelector('script[src*="signal-monitor.js"]'))return;
  const base=document.currentScript?.src||location.href;
  const s=document.createElement('script');
  s.src=new URL('signal-monitor.js',base).href;
  s.async=true;
  document.head.appendChild(s);
})();
