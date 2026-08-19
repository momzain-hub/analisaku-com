/* Analisaku Action Ranking controls — public DOM presentation only. */
(function(){
  if(document.documentElement.dataset.actionRadarControlsBound==='true')return;
  document.documentElement.dataset.actionRadarControlsBound='true';

  let search='',style='ALL',sortMode='PRIORITY',limit=5,applying=false;

  const text=(row,i)=>String(row.children[i]?.textContent||'').trim();
  const num=v=>{const m=String(v||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/g);return m?Number(m[m.length-1]):0};
  const styleMatch=(mode,filter)=>{
    if(filter==='ALL')return true;
    mode=String(mode||'').toUpperCase();
    if(filter==='BREAKOUT')return mode.includes('BREAKOUT');
    if(filter==='PULLBACK')return mode.includes('PULLBACK');
    if(filter==='WEAKNESS')return mode.includes('WEAKNESS');
    return true;
  };

  function ensureStyles(){
    if(document.getElementById('actionRadarControlStyles'))return;
    const s=document.createElement('style');s.id='actionRadarControlStyles';
    s.textContent=`
      /* Global Technical form contrast: applies to all modules, not only Action Ranking. */
      html[data-theme="dark"] body select,
      html[data-theme="dark"] body input,
      html[data-theme="dark"] body textarea{
        color-scheme:dark!important;
        background-color:#112131!important;
        color:#f8f7f2!important;
        border-color:rgba(255,255,255,.17)!important;
      }
      html[data-theme="dark"] body select option,
      html[data-theme="dark"] body select optgroup{
        background-color:#112131!important;
        color:#f8f7f2!important;
      }
      html[data-theme="dark"] body select option:checked{
        background:#20364c!important;
        color:#ffffff!important;
      }
      html[data-theme="dark"] body input::placeholder,
      html[data-theme="dark"] body textarea::placeholder{
        color:#aab8c6!important;
        opacity:.9!important;
      }

      html[data-theme="light"] body select,
      html[data-theme="light"] body input,
      html[data-theme="light"] body textarea{
        color-scheme:light!important;
        background-color:#fffdf8!important;
        color:#2c2923!important;
        border-color:rgba(55,43,22,.22)!important;
      }
      html[data-theme="light"] body select option,
      html[data-theme="light"] body select optgroup{
        background-color:#fffdf8!important;
        color:#2c2923!important;
      }
      html[data-theme="light"] body select option:checked{
        background:#f2e7d5!important;
        color:#11100e!important;
      }
      html[data-theme="light"] body input::placeholder,
      html[data-theme="light"] body textarea::placeholder{
        color:#6f685e!important;
        opacity:.9!important;
      }

      body select:focus,
      body input:focus,
      body textarea:focus{
        outline:none!important;
        border-color:var(--gold)!important;
        box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 14%,transparent)!important;
      }

      .action-radar-controls{display:grid;grid-template-columns:minmax(170px,1.35fr) repeat(3,minmax(120px,.7fr));gap:8px;margin:0 0 10px}
      .action-radar-control{display:grid;gap:4px}.action-radar-control span{font-size:8px;font-weight:900;letter-spacing:.04em;color:var(--muted);text-transform:uppercase}
      .action-radar-control input,.action-radar-control select{width:100%;min-height:36px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:10px;outline:none}
      .action-radar-control input:focus,.action-radar-control select:focus{border-color:color-mix(in srgb,var(--gold) 55%,var(--line))}
      .action-radar-view-bar .action-radar-native-limit{display:none!important}
      @media(max-width:800px){.action-radar-controls{grid-template-columns:1fr 1fr}.action-radar-control.search{grid-column:1/-1}}
      @media(max-width:520px){.action-radar-controls{grid-template-columns:1fr}.action-radar-control.search{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function forceUnderlyingAll(section){
    const native=section.querySelector('#actionRadarLimit');
    if(!native)return;
    const label=native.closest('label');if(label)label.classList.add('action-radar-native-limit');
    if(native.value!=='ALL'){
      native.value='ALL';
      native.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function ensureControls(section){
    if(section.querySelector('#actionRadarControls'))return;
    ensureStyles();
    const bar=section.querySelector('.action-radar-view-bar');if(!bar)return;
    forceUnderlyingAll(section);
    const controls=document.createElement('div');controls.id='actionRadarControls';controls.className='action-radar-controls';
    controls.innerHTML=`
      <label class="action-radar-control search"><span>Cari ticker</span><input id="actionRadarSearch" type="search" placeholder="Contoh: MDKA, BRMS, INET" autocomplete="off"></label>
      <label class="action-radar-control"><span>Entry Style</span><select id="actionRadarStyle"><option value="ALL">Semua Style</option><option value="BREAKOUT">Breakout</option><option value="PULLBACK">Pullback</option><option value="WEAKNESS">Weakness</option></select></label>
      <label class="action-radar-control"><span>Sort</span><select id="actionRadarSort"><option value="PRIORITY">Priority</option><option value="RR">R:R Tertinggi</option><option value="SCORE">Score Tertinggi</option></select></label>
      <label class="action-radar-control"><span>Tampilkan</span><select id="actionRadarEnhancedLimit"><option value="5" selected>5 saham</option><option value="10">10 saham</option><option value="20">20 saham</option><option value="40">40 saham</option><option value="ALL">Semua</option></select></label>`;
    bar.insertAdjacentElement('beforebegin',controls);
    controls.querySelector('#actionRadarSearch').addEventListener('input',e=>{search=String(e.target.value||'').trim().toUpperCase();apply(section)});
    controls.querySelector('#actionRadarStyle').addEventListener('change',e=>{style=String(e.target.value||'ALL');apply(section)});
    controls.querySelector('#actionRadarSort').addEventListener('change',e=>{sortMode=String(e.target.value||'PRIORITY');apply(section)});
    controls.querySelector('#actionRadarEnhancedLimit').addEventListener('change',e=>{const v=String(e.target.value||'5');limit=v==='ALL'?Infinity:Math.max(1,Number(v)||5);apply(section)});
  }

  function apply(section){
    if(applying)return;applying=true;
    try{
      forceUnderlyingAll(section);
      const body=section.querySelector('#actionRadarBody');if(!body)return;
      const rows=[...body.querySelectorAll('tr[data-symbol]')];
      rows.forEach((r,i)=>{if(!r.dataset.baseRank)r.dataset.baseRank=String(i+1)});
      let matched=rows.filter(r=>{
        const ticker=text(r,1).toUpperCase();
        const mode=text(r,3).toUpperCase();
        return (!search||ticker.includes(search))&&styleMatch(mode,style);
      });
      if(sortMode==='RR')matched.sort((a,b)=>num(text(b,9))-num(text(a,9))||num(text(b,10))-num(text(a,10)));
      else if(sortMode==='SCORE')matched.sort((a,b)=>num(text(b,10))-num(text(a,10))||num(text(b,9))-num(text(a,9)));
      else matched.sort((a,b)=>Number(a.dataset.baseRank||999)-Number(b.dataset.baseRank||999));

      const visible=Number.isFinite(limit)?matched.slice(0,limit):matched;
      const visibleSet=new Set(visible);
      matched.forEach(r=>body.appendChild(r));
      rows.filter(r=>!matched.includes(r)).forEach(r=>body.appendChild(r));
      rows.forEach(r=>r.style.display=visibleSet.has(r)?'':'none');
      visible.forEach((r,i)=>{const cell=r.children[0];if(cell)cell.innerHTML=`<b>${i+1}</b>`});
      const count=section.querySelector('#actionRadarViewCount');
      if(count){const total=rows.length;count.textContent=`Menampilkan ${visible.length} dari ${matched.length} hasil · ${total} saham pada kategori`}
    }finally{applying=false;}
  }

  function bind(){
    const section=document.getElementById('actionRadar');
    if(!section){setTimeout(bind,250);return;}
    ensureStyles();
    ensureControls(section);forceUnderlyingAll(section);apply(section);
    const body=section.querySelector('#actionRadarBody');
    if(body){
      const observer=new MutationObserver(()=>{if(!applying)setTimeout(()=>apply(section),0)});
      observer.observe(body,{childList:true,subtree:false});
    }
    section.querySelector('#actionRadarSummary')?.addEventListener('click',()=>setTimeout(()=>apply(section),20));
    section.querySelector('#actionRadarRefresh')?.addEventListener('click',()=>setTimeout(()=>apply(section),250));
  }
  bind();
})();
