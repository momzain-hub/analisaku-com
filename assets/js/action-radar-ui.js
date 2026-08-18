/* Analisaku Action Radar — public-output execution ranking only. */
(function(){
  if(document.documentElement.dataset.actionRadarUiBound==='true')return;
  document.documentElement.dataset.actionRadarUiBound='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  let filter='ALL',data=[],displayLimit=5;
  const numeric=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
  const fmt=v=>{const n=numeric(v);return n===null?'—':n.toLocaleString('id-ID',{maximumFractionDigits:2})};
  const pct=v=>Number.isFinite(v)?`${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})}%`:'—';
  const rr=v=>Number.isFinite(v)&&v>0?`1 : ${v.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})}`:'—';
  const upper=v=>String(v||'').toUpperCase();

  function endpoint(){const u=new URL(API);u.pathname='/signals';u.search='';u.hash='';u.searchParams.set('timeframe','1D');return u;}
  function modeOf(d){const stage=upper(d?.setup_stage),style=upper(d?.entry_style);if(style==='BREAKOUT')return stage==='CONFIRMED'?'BREAKOUT CONFIRMED':'BREAKOUT WATCH';if(style==='PULLBACK')return 'PULLBACK';if(style==='WEAKNESS')return 'BUY ON WEAKNESS';return '';}
  function areaOf(d){const mode=modeOf(d),a=numeric(d?.style_entry_low),b=numeric(d?.style_entry_high);return {mode,low:a,high:b,ready:a!==null||b!==null};}
  function contextOf(d,area){const status=upper(d?.status),price=numeric(d?.price),stop=numeric(d?.style_stop);if(status==='EXIT')return 'INVALID';if(area.mode&&price!==null&&stop!==null&&price<=stop)return 'INVALID';if(!area.mode)return 'NONE';if(price===null||!area.ready)return 'UNKNOWN';const values=[area.low,area.high].filter(v=>v!==null),lo=Math.min(...values),hi=Math.max(...values);if(price<lo)return 'BELOW';if(price<=hi)return 'IN';return 'ABOVE';}
  function nextTargetOf(d,area){const p=numeric(d?.price),targets=[numeric(d?.target1),numeric(d?.target2),numeric(d?.target3)].filter(v=>v!==null);if(!targets.length)return null;const zoneTop=area.ready?Math.max(...[area.low,area.high].filter(v=>v!==null)):null;const threshold=p===null?zoneTop:(zoneTop===null?p:Math.max(p,zoneTop));if(threshold===null)return targets[0];return targets.find(v=>v>threshold)??null;}
  function metricsOf(d,area,target){const stop=numeric(d?.style_stop);if(!area.mode||!area.ready||stop===null||target===null)return {risk:null,ratio:null};const entry=Math.max(...[area.low,area.high].filter(v=>v!==null));if(!(stop<entry&&target>entry))return {risk:null,ratio:null};const riskCash=entry-stop;return {risk:riskCash/entry*100,ratio:(target-entry)/riskCash};}

  function actionOf(d){
    const area=areaOf(d),ctx=contextOf(d,area),status=upper(d?.status),mode=area.mode;
    if(status==='EXIT'||ctx==='INVALID')return {label:'NO ENTRY / INVALID',group:'AVOID',rank:90};
    if(status==='TAKE PROFIT')return {label:'TAKE PROFIT / NO NEW ENTRY',group:'MANAGE',rank:70};
    if(status==='HOLD')return {label:'HOLD / MANAGE POSITION',group:'MANAGE',rank:60};
    if(mode==='BREAKOUT WATCH')return {label:'WAIT FOR CONFIRMATION',group:'WAIT',rank:20};
    if(mode==='BREAKOUT CONFIRMED'){
      if(ctx==='IN')return {label:'BUY AREA ACTIVE',group:'BUY',rank:10};
      if(ctx==='ABOVE')return {label:'DO NOT CHASE',group:'WAIT',rank:35};
      return {label:'WAIT / RECHECK SETUP',group:'WAIT',rank:40};
    }
    if(mode==='PULLBACK'){
      if(ctx==='IN')return {label:'BUY AREA ACTIVE',group:'BUY',rank:10};
      if(ctx==='ABOVE')return {label:'WAIT FOR PULLBACK',group:'WAIT',rank:25};
      return {label:'WAIT / RECHECK SUPPORT',group:'WAIT',rank:40};
    }
    if(mode==='BUY ON WEAKNESS'){
      if(ctx==='IN')return {label:'BUY AREA ACTIVE',group:'BUY',rank:10};
      if(ctx==='ABOVE')return {label:'WAIT FOR WEAKNESS',group:'WAIT',rank:25};
      return {label:'WAIT / RECHECK STRUCTURE',group:'WAIT',rank:40};
    }
    if(ctx==='UNKNOWN')return {label:'WAIT / DATA PENDING',group:'WAIT',rank:50};
    return {label:'WAIT / NO ACTIVE ENTRY',group:'WAIT',rank:55};
  }

  function enrich(d){const area=areaOf(d),target=nextTargetOf(d,area),metrics=metricsOf(d,area,target),action=actionOf(d);return {...d,_area:area,_target:target,_risk:metrics.risk,_rr:metrics.ratio,_action:action};}
  function sort(list){return list.slice().sort((a,b)=>a._action.rank-b._action.rank||(b._action.group==='BUY'?(Number(b._rr)||0)-(Number(a._rr)||0):0)||(Number(b.score)||0)-(Number(a.score)||0)||String(a.ticker||'').localeCompare(String(b.ticker||'')));}

  function openSymbol(ticker){const input=document.getElementById('tvTicker');if(input)input.value=ticker;const apply=document.getElementById('tvApply');if(apply)apply.click();document.getElementById('decisionPanel')?.scrollIntoView({behavior:'smooth',block:'start'});}

  function ensure(){
    const monitor=document.getElementById('signalMonitor');if(!monitor)return null;
    let section=document.getElementById('actionRadar');
    if(section)return section;
    section=document.createElement('section');section.id='actionRadar';section.className='action-radar';
    section.innerHTML=`<div class="action-radar-head"><div><div class="kicker">ANALISAKU ACTION RADAR</div><h3>Action Ranking <small>1D</small></h3><p>Memprioritaskan 20 saham berdasarkan posisi harga terhadap execution plan publik. BUY AREA ACTIVE berarti harga sedang berada di area skenario aktif; bukan perintah transaksi otomatis.</p></div><button type="button" id="actionRadarRefresh" class="signal-refresh">Refresh</button></div><div id="actionRadarSummary" class="action-radar-summary"></div><div class="action-radar-view-bar"><label><span>Tampilkan</span><select id="actionRadarLimit" aria-label="Jumlah saham Action Ranking"><option value="5" selected>5 saham</option><option value="10">10 saham</option><option value="20">20 saham</option><option value="ALL">Semua</option></select></label><span id="actionRadarViewCount" class="action-radar-view-count">Menampilkan 0 saham</span></div><div class="action-radar-table-wrap"><table class="action-radar-table"><thead><tr><th>#</th><th>Ticker</th><th>Action</th><th>Style</th><th>Price</th><th>Area</th><th>Stop</th><th>Next Target</th><th>Risk</th><th>R:R</th><th>Score</th></tr></thead><tbody id="actionRadarBody"></tbody></table></div>`;
    monitor.insertAdjacentElement('beforebegin',section);
    section.querySelector('#actionRadarRefresh')?.addEventListener('click',load);
    section.querySelector('#actionRadarLimit')?.addEventListener('change',e=>{const v=String(e.target.value||'5');displayLimit=v==='ALL'?Infinity:Math.max(1,Number(v)||5);renderTable();});
    return section;
  }

  function renderSummary(){const host=document.getElementById('actionRadarSummary');if(!host)return;const groups=['ALL','BUY','WAIT','MANAGE','AVOID'];host.innerHTML=groups.map(g=>{const count=g==='ALL'?data.length:data.filter(d=>d._action.group===g).length;const label=g==='ALL'?'ALL':g==='BUY'?'BUY ACTIVE':g;return `<button type="button" data-action-filter="${g}" class="${filter===g?'active':''} ${g.toLowerCase()}"><span>${label}</span><strong>${count}</strong></button>`;}).join('');host.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.actionFilter||'ALL';render();}));}
  function range(area){if(!area.ready)return '—';return [area.low,area.high].filter(v=>v!==null).map(fmt).join(' – ')||'—';}
  function renderTable(){
    const body=document.getElementById('actionRadarBody');if(!body)return;
    const allView=sort(data.filter(d=>filter==='ALL'||d._action.group===filter));
    const view=Number.isFinite(displayLimit)?allView.slice(0,displayLimit):allView;
    const count=document.getElementById('actionRadarViewCount');if(count)count.textContent=`Menampilkan ${view.length} dari ${allView.length} saham`;
    body.innerHTML=view.map((d,i)=>`<tr data-symbol="${d.ticker}" class="action-${d._action.group.toLowerCase()}"><td><b>${i+1}</b></td><td><strong>${d.ticker}</strong></td><td><span class="action-pill ${d._action.group.toLowerCase()}">${d._action.label}</span></td><td>${d._area.mode||'—'}</td><td>${fmt(d.price)}</td><td>${range(d._area)}</td><td>${fmt(d.style_stop)}</td><td>${fmt(d._target)}</td><td>${pct(d._risk)}</td><td>${rr(d._rr)}</td><td>${Number(d.score)||0}</td></tr>`).join('')||'<tr><td colspan="11" class="action-empty">Tidak ada saham pada kategori ini.</td></tr>';
    body.querySelectorAll('tr[data-symbol]').forEach(row=>row.addEventListener('click',()=>openSymbol(row.dataset.symbol)));
  }
  function render(){ensure();renderSummary();renderTable();}
  async function load(){try{const res=await fetch(endpoint(),{cache:'no-store'});if(!res.ok)return;const body=await res.json();data=(Array.isArray(body.signals)?body.signals:[]).map(enrich);render();}catch(e){}}
  function boot(){if(!ensure()){setTimeout(boot,250);return;}load();setInterval(load,60000);}
  boot();
})();