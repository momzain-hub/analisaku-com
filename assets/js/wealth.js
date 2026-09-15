/* Analisaku Wealth v5 bootstrap */
(function(){
  const current=document.currentScript;
  const url=relative=>current?new URL(relative,current.src).href:relative;

  function loadCss(href,key){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset[key]='true';
    document.head.appendChild(link);
  }

  function loadScript(src,attrs={}){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(existing.dataset.loaded==='true'||existing.readyState==='complete')return resolve(existing);
        existing.addEventListener('load',()=>resolve(existing),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      Object.entries(attrs).forEach(([key,value])=>{if(value!==undefined&&value!==null)script.setAttribute(key,value)});
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve(script)},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.body.appendChild(script);
    });
  }

  async function init(){
    loadCss(url('../css/wealth-v4.css?v=20260915-1815'),'wealthV4');
    loadCss(url('../css/wealth-products.css?v=20260915-2045'),'wealthProducts');

    try{
      await loadScript(url('wealth-product-intro.js?v=20260915-2045'));
    }catch(error){
      console.warn('Product overview Wealth belum termuat',error);
    }

    try{
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',{crossorigin:'anonymous',referrerpolicy:'no-referrer'});
    }catch(error){
      console.warn('jsPDF belum termuat',error);
    }

    try{
      await loadScript(url('wealth-unified.js?v=20260915-2045'));
    }catch(error){
      console.error('Wealth v5 gagal dimuat',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
