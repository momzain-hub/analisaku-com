/* Analisaku Market Radar — style-specific entry presentation */
(function(){
  if(document.documentElement.dataset.styleEntryUiBound==='true')return;
  document.documentElement.dataset.styleEntryUiBound='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  const map=new Map();

  const numeric=v=>{
    if(v===undefined||v===null||String(v).trim()==='')return null;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:null;
  };

  const fmt=v=>{
    const n=numeric(v);
    return n===null?'—':n.toLocaleString('id-ID',{maximumFractionDigits:2});
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

  function areaOf(d){
    const mode=modeOf(d);
    const styleLow=numeric(d?.style_entry_low);
    const styleHigh=numeric(d?.style_entry_high);
    if(mode){
      return {
        mode,
        label:labelOf(mode),
        low:styleLow,
        high:styleHigh,
        ready:styleLow!==null||styleHigh!==null,
        reference:false
      };
    }
    const low=numeric(d?.entry_low),high=numeric(d?.entry_high);
    return {
      mode:'',
      label:'ENTRY REFERENSI',
      low,
      high,
      ready:low!==null||high!==null,
      reference:true
    };
  }

  function range(area){
    if(!area.ready)return '—';
    const values=[area.low,area.high].filter(v=>v!==null);
    return values.map(fmt).join(' – ')||'—';
  }

  function positionOf(d,area){
    const price=numeric(d?.price);
    if(price===null||!area.ready)return {text:'',className:''};
    const values=[area.low,area.high].filter(v=>v!==null);
    if(!values.length)return {text:'',className:''};
    const lo=Math.min(...values),hi=Math.max(...values);
    if(price<lo)return {text:'HARGA DI BAWAH AREA',className:'below'};
    if(price<=hi)return {text:'HARGA DI AREA',className:'inside'};
    return {text:'HARGA DI ATAS AREA',className:'above'};
  }

  function cellState(area,position){
    if(area.mode&&!area.ready)return {text:'MENUNGGU STYLE ZONE',className:'pending'};
    if(position.text)return {text:position.text,className:position.className};
    if(area.reference&&area.ready)return {text:'REFERENSI STRUKTUR',className:'reference'};
    return {text:'BELUM ADA AREA',className:'pending'};
  }

  function decorateTable(){
    const table=document.querySelector('.market-radar-table');
    if(!table)return;
    const header=table.querySelector('thead th:nth-child(7)');
    if(header)header.textContent='Area Skenario';

    table.querySelectorAll('tbody tr[data-symbol]').forEach(row=>{
      const ticker=String(row.dataset.symbol||'').toUpperCase();
      const d=map.get(ticker);
      if(!d)return;
      const cell=row.querySelector('td:nth-child(7)');
      if(!cell)return;

      const area=areaOf(d);
      const position=positionOf(d,area);
      const state=cellState(area,position);

      cell.innerHTML=`<div class="style-entry-cell">
        <small>${area.label}</small>
        <strong>${range(area)}</strong>
        <em class="${state.className}">${state.text}</em>
      </div>`;
    });
  }

  function decorateOpportunities(){
    document.querySelectorAll('.opportunity-card[data-symbol]').forEach(card=>{
      const ticker=String(card.dataset.symbol||'').toUpperCase();
      const d=map.get(ticker);
      let zone=card.querySelector('.opportunity-style-zone');
      if(!d){zone?.remove();return;}
      const area=areaOf(d);
      if(!area.mode){zone?.remove();return;}
      if(!zone){
        zone=document.createElement('div');
        zone.className='opportunity-style-zone';
        const meta=card.querySelector('.market-setup-meta');
        if(meta)meta.insertAdjacentElement('afterend',zone);else card.appendChild(zone);
      }
      zone.innerHTML=`<small>${area.label}</small><strong>${range(area)}</strong><span>${area.ready?'STYLE ZONE':'MENUNGGU ZONE'}</span>`;
      zone.classList.toggle('pending',!area.ready);
    });
  }

  function decorateDetail(){
    const modal=document.querySelector('.radar-detail-modal');
    const title=modal?.querySelector('#radarDetailTitle');
    if(!modal||!title||modal.closest('.radar-detail-overlay')?.hidden)return;
    const ticker=String(title.firstChild?.nodeValue||'').trim().toUpperCase();
    const d=map.get(ticker);
    if(!d)return;

    const area=areaOf(d);
    const tags=modal.querySelector('.radar-detail-tags');
    if(tags){
      tags.querySelectorAll('[data-style-chip]').forEach(el=>el.remove());
      const stage=String(d.setup_stage||'').toUpperCase();
      if(stage){
        const chip=document.createElement('span');
        chip.className='radar-detail-chip';
        chip.dataset.styleChip='stage';
        chip.textContent=stage;
        tags.appendChild(chip);
      }
      if(area.mode){
        const chip=document.createElement('span');
        chip.className='radar-detail-chip strong';
        chip.dataset.styleChip='mode';
        chip.textContent=area.mode;
        tags.appendChild(chip);
      }
    }

    const grid=modal.querySelector('.radar-detail-grid');
    if(grid){
      const fields=[...grid.querySelectorAll('.radar-detail-field')];
      let entryField=fields.find(field=>String(field.querySelector('small')?.textContent||'').trim().toUpperCase()==='ENTRY');
      if(!entryField)entryField=fields.find(field=>field.dataset.styleEntryField==='true');
      if(entryField){
        entryField.dataset.styleEntryField='true';
        const small=entryField.querySelector('small'),strong=entryField.querySelector('strong');
        if(small)small.textContent=area.label;
        if(strong)strong.textContent=range(area);
        entryField.classList.toggle('is-empty',!area.ready);
      }

      let priceField=grid.querySelector('[data-style-price-field]');
      if(!priceField&&numeric(d.price)!==null){
        priceField=document.createElement('div');
        priceField.className='radar-detail-field';
        priceField.dataset.stylePriceField='true';
        priceField.innerHTML='<small>Current Price</small><strong></strong>';
        grid.prepend(priceField);
      }
      if(priceField){
        const strong=priceField.querySelector('strong');
        if(strong)strong.textContent=fmt(d.price);
      }
    }
  }

  function decorate(){
    decorateTable();
    decorateOpportunities();
    decorateDetail();
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
  function bindDetailObserver(){
    const modal=document.querySelector('.radar-detail-overlay');
    if(!modal){setTimeout(bindDetailObserver,300);return;}
    observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    decorateDetail();
  }

  function bind(){
    const body=document.getElementById('signalMonitorBody');
    const opportunities=document.getElementById('marketOpportunities');
    if(!body||!opportunities){setTimeout(bind,250);return;}
    observer.observe(body,{childList:true,subtree:true});
    observer.observe(opportunities,{childList:true,subtree:true});
    decorate();
    load();
    bindDetailObserver();
    setInterval(load,60000);
  }

  bind();
})();
