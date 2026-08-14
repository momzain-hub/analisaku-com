(function(){
  const rows=[...document.querySelectorAll('[data-home-rank]')];
  const meta=document.getElementById('homeRadarMeta');
  if(!rows.length)return;

  const recentScript=document.createElement('script');
  recentScript.src='assets/js/home-recent-lite.js?v=20260814-0725';
  document.body.appendChild(recentScript);

  fetch('https://analisaku-signal.pitizain.workers.dev/signals?timeframe=1D',{cache:'no-store'})
    .then(r=>r.json())
    .then(data=>{
      const all=Array.isArray(data.signals)?data.signals:[];
      const preferred=all.filter(d=>String(d.radar_status||'').toUpperCase()!=='AVOID'&&String(d.status||'').toUpperCase()!=='EXIT');
      const items=(preferred.length?preferred:all).slice().sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)).slice(0,5);
      rows.forEach((row,i)=>{
        const d=items[i];
        if(!d){row.hidden=true;return;}
        row.hidden=false;
        const ticker=String(d.ticker||'').toUpperCase();
        const radar=String(d.radar_status||'—').toUpperCase();
        const decision=String(d.status||'—').toUpperCase();
        const cells=row.children;
        cells[1].textContent=ticker;
        cells[2].textContent=String(Math.round(Number(d.score)||0));
        cells[3].textContent=radar;
        cells[3].className='home-radar-pill home-r-'+radar.toLowerCase();
        cells[4].textContent=decision;
        cells[4].className='home-status-pill home-s-'+decision.toLowerCase().replace(/\s+/g,'-');
        row.href='technical.html?symbol='+encodeURIComponent(ticker);
      });
      if(meta)meta.textContent=all.length+' saham dipantau';
    })
    .catch(()=>{if(meta)meta.textContent='Top Radar belum dapat dimuat.';});
})();
