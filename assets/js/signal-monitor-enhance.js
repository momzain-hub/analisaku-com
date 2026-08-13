/* Analisaku Technical Radar UX enhancements: ticker search + mobile labels */
(function(){
  const clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9._-]/g,'').slice(0,20);

  function waitForRadar(){
    const market=document.getElementById('signalMonitor');
    const gc=document.getElementById('goldenCrossRadar');
    if(!market||!gc||!document.getElementById('marketLimit')||!document.getElementById('gcLimit')){
      setTimeout(waitForRadar,180);
      return;
    }
    if(document.documentElement.dataset.radarUxReady==='true')return;
    document.documentElement.dataset.radarUxReady='true';
    enhanceRadar({
      root:market,
      bodyId:'signalMonitorBody',
      countId:'marketViewCount',
      limitId:'marketLimit',
      searchId:'marketTickerSearch',
      placeholder:'Cari ticker, mis. RAJA',
      labels:['Ticker','Score','Trend','Radar','Status','Trigger','Entry','Invalidation','Target 1','Updated']
    });
    enhanceRadar({
      root:gc,
      bodyId:'gcBody',
      countId:'gcViewCount',
      limitId:'gcLimit',
      searchId:'gcTickerSearch',
      placeholder:'Cari ticker, mis. BBRI',
      labels:['Ticker','Score','Radar','EMA Golden Cross','MA Golden Cross','Confluence','Decision']
    });
  }

  function enhanceRadar(cfg){
    const controls=cfg.root.querySelector('.market-view-controls');
    const limit=document.getElementById(cfg.limitId);
    const body=document.getElementById(cfg.bodyId);
    if(!controls||!limit||!body)return;

    let search=document.getElementById(cfg.searchId);
    if(!search){
      const label=document.createElement('label');
      label.className='market-control radar-search-control';
      label.innerHTML=`<span>Cari ticker</span><input id="${cfg.searchId}" class="radar-search-input" type="search" inputmode="search" autocomplete="off" spellcheck="false" maxlength="20" placeholder="${cfg.placeholder}">`;
      controls.insertBefore(label,controls.firstChild);
      search=label.querySelector('input');
    }

    let savedLimit=limit.value||'5';
    let searchActive=false;

    function labelCells(){
      body.querySelectorAll('tr.signal-row').forEach(row=>{
        [...row.children].forEach((cell,index)=>{
          if(cfg.labels[index])cell.dataset.label=cfg.labels[index];
        });
      });
    }

    function applySearch(){
      const query=clean(search.value);
      if(search.value!==query)search.value=query;
      const rows=[...body.querySelectorAll('tr.signal-row[data-symbol]')];
      if(!query){
        rows.forEach(row=>row.hidden=false);
        return;
      }
      let matches=0;
      rows.forEach(row=>{
        const symbol=clean(row.dataset.symbol);
        const match=symbol.includes(query);
        row.hidden=!match;
        if(match)matches+=1;
      });
      const count=document.getElementById(cfg.countId);
      if(count)count.textContent=`Hasil pencarian ${matches} saham`;
    }

    function activateSearch(){
      const query=clean(search.value);
      if(query&&!searchActive){
        savedLimit=limit.value||'5';
        searchActive=true;
        limit.value='ALL';
        limit.disabled=true;
        limit.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(!query&&searchActive){
        searchActive=false;
        limit.disabled=false;
        limit.value=savedLimit;
        limit.dispatchEvent(new Event('change',{bubbles:true}));
      }
      requestAnimationFrame(()=>{labelCells();applySearch();});
    }

    search.addEventListener('input',activateSearch);
    search.addEventListener('search',activateSearch);

    const observer=new MutationObserver(()=>{
      labelCells();
      if(searchActive)requestAnimationFrame(applySearch);
    });
    observer.observe(body,{childList:true,subtree:false});

    labelCells();
  }

  waitForRadar();
})();