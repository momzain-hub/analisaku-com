(function(){
  const host=document.querySelector('.watchlist-shell');
  if(!host)return;
  fetch('https://analisaku-signal.pitizain.workers.dev/signals?timeframe=1D',{cache:'no-store'})
    .then(r=>r.json())
    .then(data=>{
      const items=Array.isArray(data.signals)?data.signals.slice(0,5):[];
      host.textContent=items.map(x=>String(x.ticker||'')).join(' • ');
    })
    .catch(()=>{});
})();
