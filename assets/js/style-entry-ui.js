/* Analisaku Market Radar — execution-plan presentation */
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
  const pct=v=>Number.isFinite(v)?`${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})}%`:'—';
  const rr=v=>Number.isFinite(v)&&v>0?`1 : ${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})}`:'—';

  function endpoint(){
    const url=new URL(API);
    url.pathname='/signals';url.search='';url.hash='';url.searchParams.set('timeframe','1D');
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

  function areaLabel(mode){
    if(mode==='BREAKOUT WATCH')return 'AREA KONFIRMASI';
    if(mode==='BREAKOUT CONFIRMED')return 'BREAKOUT ENTRY';
    if(mode==='PULLBACK')return 'PULLBACK ENTRY';
    if(mode==='BUY ON WEAKNESS')return 'WEAKNESS ENTRY';
    return 'ENTRY REFERENSI';
  }

  function riskLabel(mode){
    if(mode==='BREAKOUT WATCH')return 'BATAS RISIKO RENCANA';
    if(mode==='BREAKOUT CONFIRMED')return 'STOP BREAKOUT';
    if(mode==='PULLBACK')return 'STOP PULLBACK';
    if(mode==='BUY ON WEAKNESS')return 'STOP WEAKNESS';
    return 'STRUCTURAL INVALIDATION';
  }

  function areaOf(d){
    const mode=modeOf(d);
    const styleLow=numeric(d?.style_entry_low),styleHigh=numeric(d?.style_entry_high);
    if(mode)return {mode,label:areaLabel(mode),low:styleLow,high:styleHigh,ready:styleLow!==null||styleHigh!==null,reference:false};
    const low=numeric(d?.entry_low),high=numeric(d?.entry_high);
    return {mode:'',label:'ENTRY REFERENSI',low,high,ready:low!==null||high!==null,reference:true};
  }

  function riskOf(d,area){
    const styleStop=numeric(d?.style_stop);
    if(area.mode)return {label:riskLabel(area.mode),value:styleStop,ready:styleStop!==null,style:true};
    const structural=numeric(d?.invalidation);
    return {label:'STRUCTURAL INVALIDATION',value:structural,ready:structural!==null,style:false};
  }

  function nextTargetOf(d){
    const price=numeric(d?.price);
    const trend=String(d?.trend||'').toUpperCase();
    const targets=[numeric(d?.target1),numeric(d?.target2),numeric(d?.target3)].filter(v=>v!==null);
    if(!targets.length)return {value:null,index:0,passed:false};
    if(price===null)return {value:targets[0],index:1,passed:false};
    if(trend==='BEARISH'){
      const i=targets.findIndex(v=>v<price);
      return i>=0?{value:targets[i],index:i+1,passed:i>0}:{value:null,index:0,passed:true};
    }
    const i=targets.findIndex(v=>v>price);
    return i>=0?{value:targets[i],index:i+1,passed:i>0}:{value:null,index:0,passed:true};
  }

  function metricsOf(d,area,risk,target){
    if(!area.mode||!area.ready||!risk.ready||target.value===null)return {riskPct:null,rr:null};
    const values=[area.low,area.high].filter(v=>v!==null);
    if(!values.length)return {riskPct:null,rr:null};
    const entry=Math.max(...values);
    const stop=risk.value;
    if(!(stop<entry))return {riskPct:null,rr:null};
    const riskCash=entry-stop;
    const reward=target.value-entry;
    return {riskPct:riskCash/entry*100,rr:reward>0?reward/riskCash:null};
  }

  function positionOf(d,area,risk){
    const price=numeric(d?.price);
    const status=String(d?.status||'').toUpperCase();
    if(status==='EXIT')return {text:'INVALID / EXIT',className:'invalid'};
    if(price===null)return {text:'',className:''};
    if(area.mode&&risk.ready&&price<=risk.value)return {text:'DI BAWAH BATAS RISIKO',className:'invalid'};
    if(!area.ready)return {text:area.mode?'MENUNGGU STYLE ZONE':'BELUM ADA AREA',className:'pending'};
    const values=[area.low,area.high].filter(v=>v!==null);
    if(!values.length)return {text:'BELUM ADA AREA',className:'pending'};
    const lo=Math.min(...values),hi=Math.max(...values);
    if(price<lo)return {text:'BELOW ZONE',className:'below'};
    if(price<=hi)return {text:'IN ZONE',className:'inside'};
    return {text:'ABOVE ZONE • JANGAN CHASE',className:'above'};
  }

  function range(area){
    if(!area.ready)return '—';
    const values=[area.low,area.high].filter(v=>v!==null);
    return values.map(fmt).join(' – ')||'—';
  }

  function planOf(d){
    const area=areaOf(d);
    const risk=riskOf(d,area);
    const target=nextTargetOf(d);
    const metrics=metricsOf(d,area,risk,target);
    const position=positionOf(d,area,risk);
    return {area,risk,target,metrics,position};
  }

  function decorateTable(){
    const table=document.querySelector('.market-radar-table');
    if(!table)return;
    const heads=table.querySelectorAll('thead th');
    if(heads[6])heads[6].textContent='Area Skenario';
    if(heads[7])heads[7].textContent='Risk Boundary';
    if(heads[8])heads[8].textContent='Next Target';

    table.querySelectorAll('tbody tr[data-symbol]').forEach(row=>{
      const d=map.get(String(row.dataset.symbol||'').toUpperCase());if(!d)return;
      const plan=planOf(d);
      const entryCell=row.querySelector('td:nth-child(7)');
      const riskCell=row.querySelector('td:nth-child(8)');
      const targetCell=row.querySelector('td:nth-child(9)');

      if(entryCell)entryCell.innerHTML=`<div class="style-entry-cell">
        <small>${plan.area.label}</small><strong>${range(plan.area)}</strong>
        <em class="${plan.position.className}">${plan.position.text}</em>
      </div>`;

      if(riskCell)riskCell.innerHTML=`<div class="style-risk-cell">
        <small>${plan.risk.label}</small><strong>${plan.risk.ready?fmt(plan.risk.value):'—'}</strong>
        <em>${plan.area.mode&&plan.risk.ready?`RISK ${pct(plan.metrics.riskPct)}`:(plan.area.mode?'MENUNGGU RISK BOUNDARY':'STRUKTURAL')}</em>
      </div>`;

      if(targetCell)targetCell.innerHTML=`<div class="style-target-cell">
        <small>${plan.target.value!==null?`NEXT TARGET${plan.target.index?` ${plan.target.index}`:''}`:'NEXT TARGET'}</small>
        <strong>${plan.target.value!==null?fmt(plan.target.value):'—'}</strong>
        <em>${plan.area.mode&&plan.target.value!==null?`R:R ${rr(plan.metrics.rr)}`:(plan.target.passed?'TARGET EKSTENSI TERLEWATI':'')}</em>
      </div>`;
    });
  }

  function decorateOpportunities(){
    document.querySelectorAll('.opportunity-card[data-symbol]').forEach(card=>{
      const d=map.get(String(card.dataset.symbol||'').toUpperCase());
      let host=card.querySelector('.opportunity-execution-plan');
      if(!d){host?.remove();return;}
      const plan=planOf(d);
      if(!plan.area.mode){host?.remove();return;}
      if(!host){
        host=document.createElement('div');host.className='opportunity-execution-plan';
        const meta=card.querySelector('.market-setup-meta');
        if(meta)meta.insertAdjacentElement('afterend',host);else card.appendChild(host);
      }
      host.innerHTML=`
        <div><small>${plan.area.label}</small><b>${range(plan.area)}</b></div>
        <div><small>${plan.risk.label}</small><b>${plan.risk.ready?fmt(plan.risk.value):'—'}</b></div>
        <div><small>NEXT TARGET</small><b>${plan.target.value!==null?fmt(plan.target.value):'—'}</b></div>
        <span class="${plan.position.className}">${plan.position.text}${Number.isFinite(plan.metrics.rr)?` • R:R ${rr(plan.metrics.rr)}`:''}</span>`;
    });
  }

  function decorateDetail(){
    const modal=document.querySelector('.radar-detail-modal');
    const title=modal?.querySelector('#radarDetailTitle');
    if(!modal||!title||modal.closest('.radar-detail-overlay')?.hidden)return;
    const ticker=String(title.firstChild?.nodeValue||'').trim().toUpperCase();
    const d=map.get(ticker);if(!d)return;
    const plan=planOf(d);

    const tags=modal.querySelector('.radar-detail-tags');
    if(tags){
      tags.querySelectorAll('[data-execution-chip]').forEach(el=>el.remove());
      const stage=String(d.setup_stage||'').toUpperCase();
      [stage,plan.area.mode,plan.position.text].filter(Boolean).forEach((text,index)=>{
        const chip=document.createElement('span');
        chip.className='radar-detail-chip'+(index===1?' strong':'');
        chip.dataset.executionChip='true';chip.textContent=text;tags.appendChild(chip);
      });
    }

    const grid=modal.querySelector('.radar-detail-grid');if(!grid)return;
    const fields=[...grid.querySelectorAll('.radar-detail-field')];
    const findField=label=>fields.find(field=>String(field.querySelector('small')?.textContent||'').trim().toUpperCase()===label);

    let entry=findField('ENTRY')||grid.querySelector('[data-execution-entry]');
    if(entry){entry.dataset.executionEntry='true';entry.querySelector('small').textContent=plan.area.label;entry.querySelector('strong').textContent=range(plan.area);}

    let invalid=findField('INVALIDATION')||grid.querySelector('[data-execution-risk]');
    if(invalid){invalid.dataset.executionRisk='true';invalid.querySelector('small').textContent=plan.risk.label;invalid.querySelector('strong').textContent=plan.risk.ready?fmt(plan.risk.value):'—';}

    let t1=findField('TARGET 1')||grid.querySelector('[data-execution-target]');
    if(t1){t1.dataset.executionTarget='true';t1.querySelector('small').textContent='NEXT TARGET';t1.querySelector('strong').textContent=plan.target.value!==null?fmt(plan.target.value):'—';}

    grid.querySelectorAll('[data-execution-metric]').forEach(el=>el.remove());
    if(plan.area.mode){
      const risk=document.createElement('div');risk.className='radar-detail-field';risk.dataset.executionMetric='risk';risk.innerHTML=`<small>Risk</small><strong>${pct(plan.metrics.riskPct)}</strong>`;
      const ratio=document.createElement('div');ratio.className='radar-detail-field';ratio.dataset.executionMetric='rr';ratio.innerHTML=`<small>Risk : Reward</small><strong>${rr(plan.metrics.rr)}</strong>`;
      grid.append(risk,ratio);
    }
  }

  function decorate(){decorateTable();decorateOpportunities();decorateDetail();}

  async function load(){
    try{
      const res=await fetch(endpoint(),{cache:'no-store'});if(!res.ok)return;
      const body=await res.json();map.clear();
      (Array.isArray(body.signals)?body.signals:[]).forEach(d=>map.set(String(d.ticker||'').toUpperCase(),d));
      decorate();
    }catch(e){}
  }

  let scheduled=false;
  function scheduleDecorate(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;decorate();});
  }

  const observer=new MutationObserver(scheduleDecorate);
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
    observer.observe(body,{childList:true,subtree:false});
    observer.observe(opportunities,{childList:true,subtree:false});
    load();bindDetailObserver();setInterval(load,60000);
  }

  bind();
})();