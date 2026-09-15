/* Wealth v1.9 mode navigation — professional landing + smooth dedicated planner tabs */
(function(){
  const VERSION='1.9';
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeLabel={goal:'Kejar Target',lump:'Dana Sudah Ada',buffer:'Investor / Trader + Cash Buffer'};
  const routeCopy={
    goal:'Membangun dana secara bertahap untuk tujuan dengan waktu yang jelas.',
    lump:'Mengalokasikan modal yang sudah tersedia sejak awal.',
    buffer:'Memisahkan likuiditas dari modal aktif investasi atau trading.'
  };
  const cardData={
    goal:{no:'01',title:'Kejar Target',desc:'Untuk pendidikan, rumah, kendaraan, pensiun, atau tujuan lain yang dibangun dengan dana awal dan investasi berkala.',benefits:['Hitung target & kebutuhan investasi bulanan','Sesuaikan risiko dengan deadline tujuan','Lihat proyeksi sampai tahun target']},
    lump:{no:'02',title:'Dana Sudah Ada',desc:'Untuk cash atau modal yang sudah tersedia sekarang dan ingin langsung dialokasikan ke beberapa instrumen.',benefits:['Alokasi berdasarkan horizon & kebutuhan likuiditas','Proyeksi pertumbuhan dana sekaligus','Tambahan bulanan tetap opsional']},
    buffer:{no:'03',title:'Investor / Trader + Cash Buffer',desc:'Untuk investor aktif yang ingin menjaga dana likuid terpisah dari modal yang digunakan di pasar.',benefits:['Pisahkan cash buffer & modal aktif','Buffer fokus pada instrumen likuid/defensif','Modal aktif tidak diberi asumsi return trading tetap']}
  };

  function currentMode(){return route||window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode||window.ANALISAKU_WEALTH_MODE?.mode||'goal';}

  function writeLoadingTab(win,mode){
    const label=routeLabel[mode]||'Wealth Plan';
    try{
      win.document.open();
      win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} | Analisaku.com</title><style>html,body{margin:0;background:#07111b;color:#eef3f7;font-family:Arial,sans-serif;height:100%}.w{height:100%;display:grid;place-items:center;padding:24px;box-sizing:border-box}.c{text-align:center;max-width:420px}.s{width:40px;height:40px;border:3px solid #394451;border-top-color:#f3c95c;border-radius:50%;margin:0 auto 18px;animation:r .7s linear infinite}.k{font-size:11px;letter-spacing:1.2px;color:#f3c95c;font-weight:800}.t{font-size:24px;font-weight:800;margin-top:8px}.p{font-size:13px;line-height:1.6;color:#91a0ad;margin-top:8px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div class="w"><div class="c"><div class="s"></div><div class="k">ANALISAKU WEALTH</div><div class="t">${label}</div><div class="p">Menyiapkan pertanyaan dan perhitungan yang sesuai dengan jenis rencana Anda.</div></div></div></body></html>`);
      win.document.close();
    }catch(_){ }
  }

  function openPlanner(mode,btn){
    if(!['goal','lump','buffer'].includes(mode))return;
    const target=`wealth.html?mode=${encodeURIComponent(mode)}&standalone=1&v=${VERSION}`;
    btn?.classList.add('is-opening');
    const child=window.open('about:blank','_blank');
    if(child){
      writeLoadingTab(child,mode);
      try{child.opener=null;}catch(_){ }
      setTimeout(()=>{try{child.location.replace(target);}catch(_){child.location.href=target;}},140);
    }else{
      location.href=target;
    }
    setTimeout(()=>btn?.classList.remove('is-opening'),700);
  }

  function setPlannerVisibility(show){
    const goal=document.getElementById('goalChoices');
    const fields=document.querySelector('#step-1 .wm-fields');
    const returns=document.getElementById('wmReturnAssumptions');
    const progress=document.querySelector('.wm-progress');
    if(goal)goal.hidden=!show;
    if(fields)fields.hidden=!show;
    if(returns)returns.hidden=!show;
    if(progress)progress.hidden=!show;
    ['step-2','step-3','step-4','wealth-result'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=!show;});
  }

  function patchHeroLanding(){
    const hero=document.querySelector('.wealth-hero');
    if(!hero)return;
    const h1=hero.querySelector('h1'),p=hero.querySelector('p'),card=hero.querySelector('.wealth-hero-card');
    if(h1)h1.innerHTML='Mulai dari kebutuhan Anda. <span>Pilih jalur yang tepat.</span>';
    if(p)p.textContent='Tiga kondisi awal membutuhkan cara perencanaan yang berbeda. Pilih satu jenis rencana, lalu lanjutkan di planner khusus agar pertanyaan dan perhitungannya tetap fokus.';
    const flow=[...hero.querySelectorAll('.wm-flowline span')];
    flow.forEach((el,i)=>{el.hidden=i>0;});
    if(flow[0])flow[0].textContent='01 Pilih Jenis Rencana';
    if(card){
      const small=card.querySelector('small'),strong=card.querySelector('strong'),cp=card.querySelector('p');
      if(small)small.textContent='WEALTH PLAN SELECTOR';
      if(strong)strong.textContent='Satu pilihan di awal, satu alur yang konsisten.';
      if(cp)cp.textContent='Kejar Target, Dana Sudah Ada, dan Cash Buffer memiliki tujuan, pertanyaan, serta logika proyeksi yang berbeda.';
    }
  }

  function patchLanding(panel){
    document.body.dataset.wealthLanding='true';
    delete document.body.dataset.wealthStandalone;
    patchHeroLanding();
    const head=panel.querySelector('.wm-plan-mode-head');
    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='01 • PILIH JENIS RENCANA';
      if(strong)strong.textContent='Kondisi mana yang paling sesuai dengan dana Anda saat ini?';
      if(p)p.textContent='Setelah dipilih, planner khusus akan terbuka di tab baru dan langsung menggunakan mode tersebut. Anda tidak perlu memilih ulang.';
    }
    [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>{
      const mode=btn.dataset.planMode,c=cardData[mode];
      if(!c)return;
      btn.classList.remove('active');
      btn.title=`Buka ${c.title} di tab baru`;
      btn.setAttribute('aria-label',`${c.title}. Buka planner di tab baru.`);
      if(btn.dataset.v19Card!==mode){
        btn.dataset.v19Card=mode;
        btn.innerHTML=`<span>${c.no}</span><div class="wm-mode-card-copy"><strong>${c.title}</strong><small>${c.desc}</small><div class="wm-mode-benefits">${c.benefits.map(x=>`<em>${x}</em>`).join('')}</div><div class="wm-mode-open">Buka planner khusus <b>↗</b></div></div>`;
      }
    });
    const buffer=document.getElementById('wmBufferSetting');if(buffer)buffer.hidden=true;
    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(small)small.textContent='LANGKAH 01';
      if(h2)h2.textContent='Pilih cara Anda memulai.';
      if(p)p.textContent='Halaman Wealth berhenti di langkah ini. Setelah memilih, Anda akan masuk ke planner khusus dengan pertanyaan dan hasil yang lebih relevan.';
    }
    setPlannerVisibility(false);
    if(step1)step1.hidden=false;
  }

  function patchStandalone(panel){
    const mode=currentMode();
    document.body.dataset.wealthStandalone=mode;
    delete document.body.dataset.wealthLanding;
    setPlannerVisibility(true);

    const grid=panel.querySelector('.wm-plan-mode-grid');if(grid)grid.hidden=true;
    [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>btn.hidden=true);
    const head=panel.querySelector('.wm-plan-mode-head');
    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='JENIS RENCANA TERPILIH';
      if(strong)strong.textContent=routeLabel[mode]||'Wealth Plan';
      if(p)p.textContent=`${routeCopy[mode]||''} Pertanyaan, alokasi, dan proyeksi di halaman ini hanya mengikuti kebutuhan tersebut.`;
      if(!head.querySelector('.wm-mode-back')){
        const back=document.createElement('a');back.className='wm-product-start wm-mode-back';back.href='wealth.html';back.textContent='← Pilih jenis rencana lain';back.style.cssText='display:inline-flex;margin-top:12px';head.appendChild(back);
      }
    }

    const monthly=document.getElementById('wmMonthly');
    if(mode==='lump'&&monthly&&Number(monthly.value)===5000000)monthly.value=0;
    if(mode==='buffer'&&monthly){monthly.value=0;const field=monthly.closest('.wm-field');if(field)field.hidden=true;}

    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(mode==='goal'){
        if(small)small.textContent='01 • TARGET & KONDISI AWAL';if(h2)h2.textContent='Apa target yang ingin Anda capai?';if(p)p.textContent='Masukkan target dana, dana awal, jangka waktu, dan investasi bulanan. Proyeksi akan mengikuti tujuan tersebut.';
      }else if(mode==='lump'){
        if(small)small.textContent='01 • MODAL YANG TERSEDIA';if(h2)h2.textContent='Berapa dana yang siap dialokasikan?';if(p)p.textContent='Masukkan modal yang sudah tersedia dan horizon investasi. Tambahan bulanan hanya digunakan bila memang direncanakan.';
      }else if(mode==='buffer'){
        if(small)small.textContent='01 • STRUKTUR MODAL';if(h2)h2.textContent='Berapa modal yang ingin dipisahkan?';if(p)p.textContent='Masukkan total modal dan porsi cash buffer. Dana likuid dan modal aktif akan dihitung terpisah.';
      }
    }

    const hero=document.querySelector('.wealth-hero');
    if(hero){
      const h1=hero.querySelector('h1'),p=hero.querySelector('p'),flow=[...hero.querySelectorAll('.wm-flowline span')];
      flow.forEach(el=>el.hidden=false);
      if(mode==='goal'){if(h1)h1.innerHTML='Bangun dana secara terukur untuk <span>mencapai target.</span>';if(p)p.textContent='Planner untuk tujuan yang memiliki deadline, investasi berkala, dan kebutuhan dana yang jelas.';}
      if(mode==='lump'){if(h1)h1.innerHTML='Optimalkan modal yang <span>sudah tersedia.</span>';if(p)p.textContent='Planner untuk dana yang sudah tersedia sejak awal dengan fokus pada alokasi, likuiditas, dan ketahanan modal.';}
      if(mode==='buffer'){if(h1)h1.innerHTML='Jaga likuiditas, kelola <span>modal aktif.</span>';if(p)p.textContent='Planner investor/trader yang memisahkan cash buffer dari modal aktif agar fungsi keduanya tidak tercampur.';}
    }

    const products=document.getElementById('wealth-products');if(products)products.hidden=true;
  }

  function patch(){const panel=document.getElementById('wmPlanningMode');if(!panel)return;if(route)patchStandalone(panel);else patchLanding(panel);}

  document.addEventListener('click',event=>{
    if(route)return;
    const btn=event.target.closest('[data-plan-mode]');if(!btn)return;
    event.preventDefault();event.stopImmediatePropagation();
    openPlanner(btn.dataset.planMode,btn);
  },true);

  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch();});});
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function init(){patch();window.ANALISAKU_WEALTH_NAV={version:VERSION,mode:currentMode};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
