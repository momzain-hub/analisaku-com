/* Analisaku Wealth Management v1.9.1 bootstrap */
(function(){
  const current=document.currentScript;
  const url=relative=>current?new URL(relative,current.src).href:relative;

  function loadCss(href,key){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset[key]='true';document.head.appendChild(link);
  }
  function loadScript(src,attrs={}){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){if(existing.dataset.loaded==='true'||existing.readyState==='complete')return resolve(existing);existing.addEventListener('load',()=>resolve(existing),{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const script=document.createElement('script');script.src=src;Object.entries(attrs).forEach(([key,value])=>{if(value!==undefined&&value!==null)script.setAttribute(key,value)});script.addEventListener('load',()=>{script.dataset.loaded='true';resolve(script)},{once:true});script.addEventListener('error',reject,{once:true});document.body.appendChild(script);
    });
  }

  async function init(){
    loadCss(url('../css/wealth-v4.css?v=20260915-1815'),'wealthV4');
    loadCss(url('../css/wealth-products.css?v=20260915-2045'),'wealthProducts');
    loadCss(url('../css/wealth-future-value.css?v=20260915-2145'),'wealthFutureValue');
    loadCss(url('../css/wealth-yearly-breakdown.css?v=1.1-20260915-2155'),'wealthYearlyBreakdown');
    loadCss(url('../css/wealth-equity-sleeve.css?v=1.2-20260915-2205'),'wealthEquitySleeve');
    loadCss(url('../css/wealth-planning-mode.css?v=1.3-20260915-2225'),'wealthPlanningMode');
    loadCss(url('../css/wealth-mode-questionnaire.css?v=1.4-20260915-2245'),'wealthModeQuestionnaire');
    loadCss(url('../css/wealth-buffer-result.css?v=1.6-20260915-2315'),'wealthBufferResult');
    loadCss(url('../css/wealth-v19.css?v=1.9.1-20260916-0055'),'wealthV19');

    try{await loadScript(url('wealth-product-intro.js?v=20260915-2115'));}catch(error){console.warn('Informasi produk Wealth belum termuat',error);}
    try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',{crossorigin:'anonymous',referrerpolicy:'no-referrer'});}catch(error){console.warn('Generator PDF belum termuat',error);}

    try{
      await loadScript(url('wealth-route-init.js?v=1.6-20260915-2315'));
      await loadScript(url('wealth-planning-mode.js?v=1.3-20260915-2225'));
      await loadScript(url('wealth-mode-navigation.js?v=1.9-20260916-0022'));
      await loadScript(url('wealth-mode-questionnaire.js?v=1.9-20260916-0015'));
      await loadScript(url('wealth-questionnaire-required.js?v=1.9-20260916-0018'));
      await loadScript(url('wealth-unified.js?v=20260915-2145'));
      await loadScript(url('wealth-yearly-breakdown.js?v=1.1-20260915-2155'));
      await loadScript(url('wealth-equity-sleeve.js?v=1.2-20260915-2205'));
      await loadScript(url('wealth-buffer-result.js?v=1.6-20260915-2315'));
      await loadScript(url('wealth-customer-copy.js?v=1.9-20260916-0022'));
      window.ANALISAKU_WEALTH_MODE_API?.apply?.();
      setTimeout(()=>{
        window.ANALISAKU_WEALTH_COPY?.apply?.();
        const badge=document.querySelector('.wm-version-badge');
        if(badge)badge.textContent='WEALTH v1.9.1';
      },80);
    }catch(error){console.error('Wealth Management v1.9.1 gagal dimuat',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
