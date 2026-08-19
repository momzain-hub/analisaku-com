/* Analisaku Signal API configuration.
   Public endpoint only. Never put API secrets, tokens, or proprietary engine logic here. */
window.ANALISAKU_SIGNAL_API = "https://analisaku-signal.pitizain.workers.dev/signal";

/* Home-only loader for Hot Issues / Risk Overlay. */
(function () {
  if (!document.body?.classList.contains('home-market')) return;

  const src = document.currentScript?.src || location.href;
  const version = '20260819-1328';

  const cssId = 'home-hot-issues-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = new URL(`../css/home-hot-issues.css?v=${version}`, src).href;
    document.head.appendChild(link);
  }

  const jsId = 'home-hot-issues-js';
  if (!document.getElementById(jsId)) {
    const script = document.createElement('script');
    script.id = jsId;
    script.src = new URL(`home-hot-issues.js?v=${version}`, src).href;
    script.defer = true;
    document.body.appendChild(script);
  }
})();
