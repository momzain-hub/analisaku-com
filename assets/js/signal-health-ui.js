/* Analisaku Signal Health — compact public delivery coverage monitor only. */
(function(){
  if(document.documentElement.dataset.signalHealthUiBound==='true')return;
  document.documentElement.dataset.signalHealthUiBound='true';

  const API=String(window.ANALISAKU_SIGNAL_API||'https://analisaku-signal.pitizain.workers.dev/signal');
  const HUBS={
    A:['RAJA','BBCA','BMRI','BBRI','BBNI','TLKM','ASII','ANTM','AMMN','MDKA','TPIA','BUMI','BRMS','ADRO','PGAS','INCO','UNTR','ICBP','ITMG','GOTO'],
    B:['INET','CSIS','PGEO','ISAT','MIKA','HRUM','ESSA','WIFI','BABY','KIJA','BKSL','TEBE','BJTM','DMAS','DSSA','TINS','NCKL','BIPI','BBTN','EXCL']
  };
  const EXPECTED=[...new Set([...HUBS.A,...HUBS.B])];

  const upper=v=>String(v||'').toUpperCase().replace(/^IDX:/,'').trim();
  const stampOf=d=>Math.max(Number(d?.received_at)||0,Number(d?.updated_at)||0);
  const endpoint=()=>{const u=new URL(API);u.pathname='/signals';u.search='';u.hash='';u.searchParams.set('timeframe','1D');return u;};

  function ageLabel(stamp){
    if(!stamp)return 'belum ada';
    const ms=Math.max(0,Date.now()-stamp),mins=Math.floor(ms/60000),hours=ms/3600000;
    if(mins<1)return 'baru saja';
    if(mins<60)return `${mins}m lalu`;
    if(hours<24)return `${Math.floor(hours)}j lalu`;
    return `${Math.floor(hours/24)}h lalu`;
  }

  function healthFor(list,map){
    const present=list.filter(t=>map.has(t));
    const missing=list.filter(t=>!map.has(t));
    const latest=Math.max(0,...present.map(t=>stampOf(map.get(t))));
    const ageHours=latest?Math.max(0,(Date.now()-latest)/3600000):Infinity;
    let state='ACTIVE',tone='active';
    if(missing.length){state='INCOMPLETE';tone='check';}
    else if(!latest||ageHours>96){state='CHECK';tone='check';}
    else if(ageHours>48){state='QUIET';tone='quiet';}
    return {total:list.length,present:present.length,missing,latest,state,tone};
  }

  function ensure(){
    let section=document.getElementById('signalHealth');
    if(section)return section;
    const anchor=document.getElementById('topSetupNow')||document.getElementById('actionRadar')||document.getElementById('signalMonitor');
    if(!anchor)return null;
    section=document.createElement('section');
    section.id='signalHealth';
    section.className='signal-health compact';
    section.innerHTML=`<style>
      .signal-health.compact{margin-top:14px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--panel) 96%,transparent)}
      .signal-health-row{display:flex;align-items:center;gap:10px;min-width:0}
      .signal-health-title{display:flex;align-items:center;gap:7px;min-width:145px}.signal-health-title .kicker{margin:0;font-size:7px;white-space:nowrap}.signal-health-title b{font-size:12px;white-space:nowrap}.signal-health-title small{font-size:8px;color:var(--gold)}
      .signal-health-items{display:flex;align-items:center;gap:7px;flex:1;min-width:0}.signal-health-item{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--line);border-radius:999px;white-space:nowrap;font-size:8px;color:var(--muted)}.signal-health-item span{font-weight:900;text-transform:uppercase;letter-spacing:.035em}.signal-health-item strong{font-size:10px;color:var(--text)}.signal-health-item.active strong{color:var(--green)}.signal-health-item.quiet strong{color:var(--gold)}.signal-health-item.check strong{color:var(--red)}
      .signal-health-badge{margin-left:auto;display:inline-flex;align-items:center;padding:5px 8px;border:1px solid var(--line);border-radius:999px;font-size:7px;font-weight:900;letter-spacing:.045em;white-space:nowrap}.signal-health-badge.active{color:var(--green);border-color:color-mix(in srgb,var(--green) 45%,var(--line));background:color-mix(in srgb,var(--green) 8%,transparent)}.signal-health-badge.quiet{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 45%,var(--line));background:color-mix(in srgb,var(--gold) 8%,transparent)}.signal-health-badge.check{color:var(--red);border-color:color-mix(in srgb,var(--red) 45%,var(--line));background:color-mix(in srgb,var(--red) 8%,transparent)}
      .signal-health-meta{margin-top:6px;padding-top:6px;border-top:1px solid color-mix(in srgb,var(--line) 65%,transparent);display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:7.5px;line-height:1.35}.signal-health-missing{color:var(--red);font-weight:800}
      @media(max-width:820px){.signal-health-row{flex-wrap:wrap}.signal-health-title{min-width:auto}.signal-health-items{order:3;width:100%;overflow:auto;padding-bottom:1px}.signal-health-badge{margin-left:auto}.signal-health-meta{display:none}}
    </style><div class="signal-health-row"><div class="signal-health-title"><div class="kicker">SYSTEM HEALTH</div><b>Signal Health <small>1D</small></b></div><div id="signalHealthItems" class="signal-health-items"></div><span id="signalHealthOverall" class="signal-health-badge quiet">CHECKING</span></div><div id="signalHealthMeta" class="signal-health-meta"></div>`;
    anchor.insertAdjacentElement('beforebegin',section);
    return section;
  }

  function render(signals){
    if(!ensure())return;
    const map=new Map((signals||[]).map(d=>[upper(d?.ticker),d]).filter(([t])=>t));
    const allPresent=EXPECTED.filter(t=>map.has(t));
    const allMissing=EXPECTED.filter(t=>!map.has(t));
    const a=healthFor(HUBS.A,map),b=healthFor(HUBS.B,map);
    const healthy=allMissing.length===0&&a.tone!=='check'&&b.tone!=='check';
    const quiet=healthy&&(a.tone==='quiet'||b.tone==='quiet');

    const overall=document.getElementById('signalHealthOverall');
    overall.textContent=healthy?(quiet?'SYSTEM QUIET':'SYSTEM HEALTHY'):'CHECK HUB';
    overall.className=`signal-health-badge ${healthy?(quiet?'quiet':'active'):'check'}`;

    const items=document.getElementById('signalHealthItems');
    items.innerHTML=`
      <div class="signal-health-item ${allMissing.length?'check':'active'}"><span>Coverage</span><strong>${allPresent.length}/${EXPECTED.length}</strong></div>
      <div class="signal-health-item ${a.tone}"><span>Hub A</span><strong>${a.present}/${a.total} · ${a.state}</strong></div>
      <div class="signal-health-item ${b.tone}"><span>Hub B</span><strong>${b.present}/${b.total} · ${b.state}</strong></div>`;

    const missing=[...new Set([...a.missing,...b.missing])];
    const meta=document.getElementById('signalHealthMeta');
    meta.innerHTML=missing.length
      ? `<span>Last delivery: Hub A ${ageLabel(a.latest)} · Hub B ${ageLabel(b.latest)}</span><span class="signal-health-missing">Missing: ${missing.join(', ')}</span>`
      : `<span>Last delivery: Hub A ${ageLabel(a.latest)} · Hub B ${ageLabel(b.latest)}</span><span>ACTIVE ≤48j · QUIET 48–96j · CHECK &gt;96j</span>`;
  }

  async function load(){
    try{
      ensure();
      const res=await fetch(endpoint(),{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const body=await res.json();
      render(Array.isArray(body.signals)?body.signals:[]);
    }catch(e){
      ensure();
      const overall=document.getElementById('signalHealthOverall');if(overall){overall.textContent='API CHECK';overall.className='signal-health-badge check';}
      const items=document.getElementById('signalHealthItems');if(items)items.innerHTML='<div class="signal-health-item check"><span>API</span><strong>TIDAK TERBACA</strong></div>';
    }
  }

  function boot(){if(!ensure()){setTimeout(boot,250);return;}load();setInterval(load,60000);}
  boot();
})();
