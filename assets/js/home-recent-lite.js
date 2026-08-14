(function(){
  const rows=[...document.querySelectorAll('[data-home-change]')];
  const empty=document.getElementById('homeRecentEmpty');
  const meta=document.getElementById('homeRecentMeta');
  if(!rows.length)return;
  let previous={};
  let history=[];

  function show(){
    rows.forEach((row,i)=>{
      const x=history[i];
      if(!x){row.hidden=true;return;}
      row.hidden=false;
      row.children[0].children[0].textContent=x.ticker;
      row.children[0].children[1].textContent='Score '+x.score;
      row.children[1].children[0].textContent=x.from;
      row.children[1].children[2].textContent=x.to;
      row.children[2].textContent=x.time;
    });
    if(empty)empty.hidden=history.length>0;
    if(meta)meta.textContent=history.length?history.length+' perubahan sesi ini':'Monitoring perubahan aktif.';
  }

  function compare(signals){
    const current={};
    signals.forEach(d=>{
      const ticker=String(d.ticker||'').toUpperCase();
      const decision=String(d.status||'WAIT').toUpperCase();
      const score=Math.round(Number(d.score)||0);
      if(previous[ticker]&&previous[ticker]!==decision){
        history.unshift({ticker,from:previous[ticker],to:decision,score,time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})});
      }
      current[ticker]=decision;
    });
    previous=current;
    history=history.slice(0,5);
    show();
  }

  function load(){
    fetch('https://analisaku-signal.pitizain.workers.dev/signals?timeframe=1D',{cache:'no-store'})
      .then(r=>r.json())
      .then(data=>compare(Array.isArray(data.signals)?data.signals:[]))
      .catch(()=>{});
  }

  load();
  setInterval(load,60000);
})();
