(function(){
  const rows=[...document.querySelectorAll('[data-home-rank]')];
  const meta=document.getElementById('homeRadarMeta');
  if(!rows.length)return;

  fetch('https://analisaku-signal.pitizain.workers.dev/signals?timeframe=1D',{cache:'no-store'})
    .then(r=>r.json())
    .then(data=>{
      const all=Array.isArray(data.signals)?data.signals:[];
      const items=all.slice().sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)).slice(0,5);
      rows.forEach((row,i)=>{
        const d=items[i];
        if(!d){row.hidden=true;return;}
        const cells=row.children;
        cells[1].textContent=String(d.ticker||'').toUpperCase();
        cells[2].textContent=String(Math.round(Number(d.score)||0));
        cells[3].textContent=String(d.radar_status||'—').toUpperCase();
        cells[4].textContent=String(d.status||'—').toUpperCase();
      });
      if(meta)meta.textContent=all.length+' saham dipantau';
    })
    .catch(()=>{if(meta)meta.textContent='Top Radar belum dapat dimuat.';});
})();
