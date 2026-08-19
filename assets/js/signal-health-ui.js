/* Analisaku Signal Health — public delivery coverage monitor only. */
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
    if(!stamp)return 'belum ada delivery';
    const ms=Math.max(0,Date.now()-stamp),mins=Math.floor(ms/60000),hours=ms/3600000;
    if(mins<1)return 'baru saja';
    if(mins<60)return `${mins} menit lalu`;
    if(hours<24)return `${Math.floor(hours)} jam lalu`;
    return `${Math.floor(hours/24)} hari lalu`;
  }

  function timeLabel(stamp){
    if(!stamp)return '—';
    return new Date(stamp).toLocaleString('id-ID',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }

  function healthFor(name,list,map){
    const present=list.filter(t=>map.has(t));
    const missing=list.filter(t=>!map.has(t));
    const latest=Math.max(0,...present.map(t=>stampOf(map.get(t))));
    const ageHours=latest?Math.max(0,(Date.now()-latest)/3600000):Infinity;
    let state='ACTIVE',tone='active';
    if(missing.length){state='INCOMPLETE';tone='check';}
    else if(!latest||ageHours>96){state='CHECK ALERT';tone='check';}
    else if(ageHours>48){state='QUIET';tone='quiet';}
    return {name,total:list.length,present:present.length,missing,latest,state,tone};
  }

  function ensure(){
    let section=document.getElementById('signalHealth');
    if(section)return section;
    const anchor=document.getElementById('topSetupNow')||document.getElementById('actionRadar')||document.getElementById('signalMonitor');
    if(!anchor)return null;
    section=document.createElement('section');
    section.id='signalHealth';
    section.className='signal-health';
    section.innerHTML=`<style>
      .signal-health{margin-top:22px;padding:16px 18px;border:1px solid var(--line);border-radius:18px;background:color-mix(in srgb,var(--panel) 96%,transparent)}
      .signal-health-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.signal-health-head h3{margin:3px 0 4px;font-size:20px}.signal-health-head h3 small{font-size:11px;color:var(--gold)}.signal-health-head p{margin:0;color:var(--muted);font-size:11px;line-height:1.5;max-width:780px}.signal-health-badge{display:inline-flex;align-items:center;padding:7px 9px;border:1px solid var(--line);border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.045em;white-space:nowrap}.signal-health-badge.active{color:var(--green);border-color:color-mix(in srgb,var(--green) 45%,var(--line));background:color-mix(in srgb,var(--green) 8%,transparent)}.signal-health-badge.quiet{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 45%,var(--line));background:color-mix(in srgb,var(--gold) 8%,transparent)}.signal-health-badge.check{color:var(--red);border-color:color-mix(in srgb,var(--red) 45%,var(--line));background:color-mix(in srgb,var(--red) 8%,transparent)}
      .signal-health-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}.signal-health-card{padding:12px;border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--panel) 88%,transparent)}.signal-health-card>span{display:block;font-size:7.5px;font-weight:900;letter-spacing:.05em;color:var(--muted);text-transform:uppercase;margin-bottom:5px}.signal-health-card strong{display:block;font-size:18px;line-height:1.1;margin-bottom:5px}.signal-health-card small{display:block;color:var(--muted);font-size:9px;line-height:1.45}.signal-health-card.active strong{color:var(--green)}.signal-health-card.quiet strong{color:var(--gold)}.signal-health-card.check strong{color:var(--red)}
      .signal-health-foot{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:8.5px;line-height:1.45}.signal-health-missing{color:var(--red);font-weight:800}
      @media(max-width:720px){.signal-health{padding:14px}.signal-health-head{display:grid}.signal-health-grid{grid-template-columns:1fr}.signal-health-foot{display:grid}.signal-health-card strong{font-size:16px}}
    </style><div class="signal-health-head"><div><div class="kicker">ANALISAKU SYSTEM HEALTH</div><h3>Signal Health <small>1D</small></h3><p>Memantau coverage 40 ticker dan aktivitas delivery terakhir Hub A / Hub B. Health ini memeriksa jalur data publik, bukan formula internal.</p></div><span id="signalHealthOverall" class="signal-health-badge quiet">CHECKING</span></div><div id="signalHealthGrid" class="signal-health-grid"></div><div id="signalHealthFoot" class="signal-health-foot"></div>`;
    anchor.insertAdjacentElement('beforebegin',section);
    return section;
  }

  function render(signals){
    if(!ensure())return;
    const map=new Map((signals||[]).map(d=>[upper(d?.ticker),d]).filter(([t])=>t));
    const allPresent=EXPECTED.filter(t=>map.has(t));
    const allMissing=EXPECTED.filter(t=>!map.has(t));
    const a=healthFor('HUB A',HUBS.A,map),b=healthFor('HUB B',HUBS.B,map);
    const overall=document.getElementById('signalHealthOverall');
    const healthy=allMissing.length===0&&a.tone!=='check'&&b.tone!=='check';
    const quiet=healthy&&(a.tone==='quiet'||b.tone==='quiet');
    overall.textContent=healthy?(quiet?'SYSTEM QUIET':'SYSTEM HEALTHY'):'CHECK SIGNAL HUB';
    overall.className=`signal-health-badge ${healthy?(quiet?'quiet':'active'):'check'}`;

    const grid=document.getElementById('signalHealthGrid');
    grid.innerHTML=`
      <div class="signal-health-card ${allMissing.length?'check':'active'}"><span>Coverage</span><strong>${allPresent.length}/${EXPECTED.length}</strong><small>${allMissing.length?`${allMissing.length} ticker belum tersedia`:'Seluruh watchlist A+B tersedia'}</small></div>
      <div class="signal-health-card ${a.tone}"><span>Hub A</span><strong>${a.present}/${a.total} · ${a.state}</strong><small>Last delivery ${ageLabel(a.latest)} · ${timeLabel(a.latest)}</small></div>
      <div class="signal-health-card ${b.tone}"><span>Hub B</span><strong>${b.present}/${b.total} · ${b.state}</strong><small>Last delivery ${ageLabel(b.latest)} · ${timeLabel(b.latest)}</small></div>`;

    const missing=[...new Set([...a.missing,...b.missing])];
    const foot=document.getElementById('signalHealthFoot');
    foot.innerHTML=`<span>ACTIVE ≤48 jam · QUIET 48–96 jam · CHECK ALERT &gt;96 jam atau coverage tidak lengkap.</span>${missing.length?`<span class="signal-health-missing">Missing: ${missing.join(', ')}</span>`:'<span>Catatan: ticker yang tidak berubah bisa memiliki timestamp signal lebih lama; indikator kesehatan memakai aktivitas delivery terbaru per hub.</span>'}`;
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
      const grid=document.getElementById('signalHealthGrid');if(grid)grid.innerHTML='<div class="signal-health-card check"><span>Signal API</span><strong>TIDAK TERBACA</strong><small>Coba refresh halaman. Jika berlanjut, cek Worker/API.</small></div>';
    }
  }

  function boot(){if(!ensure()){setTimeout(boot,250);return;}load();setInterval(load,60000);}
  boot();
})();
