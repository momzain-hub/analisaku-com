/* Analisaku Wealth v2 bootstrap */
(function(){
  const current=document.currentScript;
  const url=relative=>current?new URL(relative,current.src).href:relative;

  function loadCss(){
    if(document.querySelector('link[data-wealth-v2]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=url('../css/wealth-v2.css?v=20260915-1430');
    link.dataset.wealthV2='true';
    document.head.appendChild(link);
  }

  function loadScript(src,attrs={}){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(existing.dataset.loaded==='true')return resolve(existing);
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
    loadCss();

    const pdfPromise=loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
      {
        integrity:'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==',
        crossorigin:'anonymous',
        referrerpolicy:'no-referrer'
      }
    ).catch(error=>console.warn('PDF library belum termuat',error));

    try{
      await loadScript(url('wealth-engine.js?v=20260915-1430'));
      await loadScript(url('wealth-report.js?v=20260915-1430'));
      await pdfPromise;
    }catch(error){
      console.error('Wealth v2 gagal dimuat',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
