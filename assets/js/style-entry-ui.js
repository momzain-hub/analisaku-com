/* Analisaku Market Radar — style-specific entry presentation */
(function(){
  if(document.documentElement.dataset.styleEntryUiBound==='true')return;
  document.documentElement.dataset.styleEntryUiBound='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  const map=new Map();

  const fmt=v=>{
    if(v===undefined||v===null||v==='')return '—';
    const n=Number(v);
    return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v);
  };

  function endpoint(){
    const url=new URL(API);
    url.pathname='/signals';
    url.search='';
    url.hash='';
    url.searchParams.set('timeframe','1D');
    return url;
  }

  function modeOf(d){
    const stage=String(d?.setup_stage||'').toUpperCase();
    const style=String(d?.entry_style||'').toUpperCase();
    if(style==='BREAKOUT')return stage==='CONFIRMED'?'BREAKOUT CONFIRMED':'BREAKOUT WATCH';
    if(style==='PULLBACK')return 'PULLBACK';
    if(style==='WEAKNESS')return 'BUY ON WEAKNESS';
    return '';
  }

  function labelOf(mode){
    if(mode==='BREAKOUT WATCH')return 'AREA KONFIRMASI';
    if(mode==='BREAKOUT CONFIRMED')return 'BREAKOUT ENTRY';
    if(mode==='PULLBACK')return 'PULLBACK ENTRY';
    if(mode==='BUY ON WEAKNESS')return 'WEAKNESS ENTRY';
    return 'ENTRY REFERENSI';
  }

  function range(low,high){
    if(low||high)return `${fmt(low)} – ${fmt(high)}`;
    return '—';
  }

  function decorate(){
    const table=document.querySelector('.market-radar-table');
    if(!table)return;
    const header=table.querySelector('thead th:nth-child(7)');
    if(header)header.textContent='Style Entry';

    table.querySelectorAll('tbody tr[data-symbol]').forEach(row=>{
      const ticker=String(row.dataset.symbol||'').toUpperCase();
      const d=map.get(ticker);
      if(!d)return;
      const cell=row.querySelector('td:nth-child(7)');
      if(!cell)return;

      const mode=modeOf(d);
      const hasStyleRange=Boolean(d.style_entry_low||d.style_entry_high);
      const low=hasStyleRange?d.style_entry_low:d.entry_low;
      const high=hasStyleRange?d.style_entry_high:d.entry_high;
      const state=hasStyleRange?'LIVE STYLE ZONE':(mode?'MENUNGGU STYLE ZONE':'REFERENSI STRUKTUR');

      cell.innerHTML=`<div class="style-entry-cell">
        <small>${labelOf(mode)}</small>
        <strong>${range(low,high)}</strong>
        <em class="${hasStyleRange?'ready':'pending'}">${state}</em>
      </div>`;
    });
  }

  async function load(){
    try{
      const res=await fetch(endpoint(),{cache:'no-store'});
      if(!res.ok)return;
      const body=await res.json();
      map.clear();
      (Array.isArray(body.signals)?body.signals:[]).forEach(d=>map.set(String(d.ticker||'').toUpperCase(),d));
      decorate();
    }catch(e){}
  }

  const observer=new MutationObserver(()=>decorate());
  function bind(){
    const body=document.getElementById('signalMonitorBody');
    if(!body){setTimeout(bind,250);return;}
    observer.observe(body,{childList:true,subtree:true});
    decorate();
    load();
    setInterval(load,60000);
  }

  bind();
})();
