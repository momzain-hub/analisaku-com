/* Wealth v1.10.0 mode navigation — clearer professional customer language */
(function(){
  const VERSION='1.10.0';
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeLabel={
    goal:'Kejar Target',
    lump:'Alokasi Dana yang Sudah Tersedia',
    buffer:'Investasi + Cadangan Likuid'
  };
  const routeCopy={
    goal:'Untuk tujuan yang ingin dicapai dalam jangka waktu tertentu melalui dana awal dan investasi berkala.',
    lump:'Untuk dana yang sudah tersedia saat ini dan ingin dialokasikan sesuai jangka waktu, kebutuhan likuiditas, dan tingkat risiko.',
    buffer:'Untuk investor atau trader yang ingin memisahkan cadangan likuid dari modal aktif agar fungsi masing-masing dana tetap jelas.'
  };
  const cardData={
    goal:{
      no:'01',
      title:'Kejar Target',
      desc:'Untuk pendidikan, rumah, kendaraan, pensiun, atau kebutuhan lain yang ingin dicapai dalam jangka waktu tertentu.',
      benefits:['Tentukan target dan jangka waktu','Hitung kebutuhan investasi berkala','Lihat proyeksi hingga tahun target'],
      cta:'Susun Rencana Target'
    },
    lump:{
      no:'02',
      title:'Alokasikan Dana yang Sudah Tersedia',
      desc:'Untuk dana yang sudah tersedia saat ini dan ingin dibagi ke beberapa instrumen sesuai kebutuhan Anda.',
      benefits:['Susun alokasi dana yang tersedia','Sesuaikan dengan horizon dan kebutuhan pencairan','Lihat proyeksi pertumbuhan portofolio'],
      cta:'Susun Alokasi Dana'
    },
    buffer:{
      no:'03',
      title:'Investasi + Cadangan Likuid',
      desc:'Untuk investor atau trader yang ingin menjaga sebagian dana tetap likuid dan memisahkannya dari modal aktif di pasar.',
      benefits:['Pisahkan cadangan likuid dan modal aktif','Jaga fleksibilitas tanpa mencampur fungsi dana','Susun porsi modal aktif sesuai risiko'],
      cta:'Atur Portofolio & Cash Buffer'
    }
  };

  function currentMode(){return route||window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode||window.ANALISAKU_WEALTH_MODE?.mode||'goal';}

  function writeLoadingTab(win,mode){
    const label=routeLabel[mode]||'Wealth Plan';
    try{
      win.document.open();
      win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} | Analisaku.com</title><style>html,body{margin:0;background:#07111b;color:#eef3f7;font-family:Arial,sans-serif;height:100%}.w{height:100%;display:grid;place-items:center;padding:24px;box-sizing:border-box}.c{text-align:center;max-width:440px}.s{width:40px;height:40px;border:3px solid #394451;border-top-color:#f3c95c;border-radius:50%;margin:0 auto 18px;animation:r .7s linear infinite}.k{font-size:11px;letter-spacing:1.2px;color:#f3c95c;font-weight:800}.t{font-size:24px;font-weight:800;margin-top:8px}.p{font-size:13px;line-height:1.6;color:#91a0ad;margin-top:8px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div class="w"><div class="c"><div class="s"></div><div class="k">ANALISAKU WEALTH</div><div class="t">${label}</div><div class="p">Menyiapkan rencana berdasarkan kebutuhan yang Anda pilih.</div></div></div></body></html>`);
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
    if(h1)h1.innerHTML='Mulai dari kondisi Anda. Susun <span>rencana investasi yang lebih terarah.</span>';
    if(p)p.textContent='Pilih kebutuhan yang paling sesuai dengan kondisi dana Anda saat ini. Setiap rencana akan mempertimbangkan jangka waktu, kondisi keuangan, kebutuhan likuiditas, pengalaman, dan kenyamanan Anda terhadap risiko.';
    const flow=[...hero.querySelectorAll('.wm-flowline span')];
    flow.forEach((el,i)=>{el.hidden=i>0;});
    if(flow[0])flow[0].textContent='01 Pilih Kebutuhan';
    if(card){
      const small=card.querySelector('small'),strong=card.querySelector('strong'),cp=card.querySelector('p');
      if(small)small.textContent='ANALISAKU WEALTH';
      if(strong)strong.textContent='Mulai sesuai kondisi dana Anda';
      if(cp)cp.textContent='Pilih apakah Anda sedang membangun dana untuk sebuah target, mengalokasikan dana yang sudah tersedia, atau menyiapkan portofolio investasi dengan cadangan likuid untuk kebutuhan investor maupun trader.';
    }
  }

  function patchLanding(panel){
    document.body.dataset.wealthLanding='true';
    delete document.body.dataset.wealthStandalone;
    patchHeroLanding();
    const head=panel.querySelector('.wm-plan-mode-head');
    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='01 • PILIH KEBUTUHAN';
      if(strong)strong.textContent='Kondisi mana yang paling sesuai dengan dana Anda saat ini?';
      if(p)p.textContent='Pilih satu jenis rencana. Setelah itu Anda akan masuk langsung ke planner yang sesuai, tanpa perlu memilih ulang.';
    }
    [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>{
      const mode=btn.dataset.planMode,c=cardData[mode];
      if(!c)return;
      btn.classList.remove('active');
      btn.title=`Buka ${c.title}`;
      btn.setAttribute('aria-label',`${c.title}. Buka rencana investasi.`);
      if(btn.dataset.v110Card!==mode){
        btn.dataset.v110Card=mode;
        btn.innerHTML=`<span>${c.no}</span><div class="wm-mode-card-copy"><strong>${c.title}</strong><small>${c.desc}</small><div class="wm-mode-benefits">${c.benefits.map(x=>`<em>${x}</em>`).join('')}</div><div class="wm-mode-open">${c.cta} <b>↗</b></div></div>`;
      }
    });
    const buffer=document.getElementById('wmBufferSetting');if(buffer)buffer.hidden=true;
    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(small)small.textContent='LANGKAH 01';
      if(h2)h2.textContent='Pilih kebutuhan investasi Anda.';
      if(p)p.textContent='Setiap pilihan menggunakan pertanyaan dan perhitungan yang disesuaikan dengan kondisi dana Anda.';
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
      if(p)p.textContent=routeCopy[mode]||'';
      if(!head.querySelector('.wm-mode-back')){
        const back=document.createElement('a');back.className='wm-product-start wm-mode-back';back.href='wealth.html';back.textContent='← Pilih kebutuhan lain';back.style.cssText='display:inline-flex;margin-top:12px';head.appendChild(back);
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
        if(small)small.textContent='01 • TUJUAN & KONDISI AWAL';
        if(h2)h2.textContent='Apa tujuan utama investasi Anda?';
        if(p)p.textContent='Tentukan tujuan, target dana, dana awal, jangka waktu, dan investasi bulanan. Informasi ini menjadi dasar penyusunan rencana investasi Anda.';
      }else if(mode==='lump'){
        if(small)small.textContent='01 • DANA YANG TERSEDIA';
        if(h2)h2.textContent='Berapa dana yang siap Anda alokasikan?';
        if(p)p.textContent='Masukkan dana yang sudah tersedia dan jangka waktu investasinya. Tambahan bulanan hanya digunakan bila memang direncanakan.';
      }else if(mode==='buffer'){
        if(small)small.textContent='01 • MODAL & CADANGAN LIKUID';
        if(h2)h2.textContent='Bagaimana dana Anda ingin dibagi?';
        if(p)p.textContent='Tentukan total modal dan bagian yang ingin dijaga tetap likuid. Cadangan likuid dan modal aktif akan dihitung sesuai fungsi masing-masing.';
      }
    }

    const hero=document.querySelector('.wealth-hero');
    if(hero){
      const h1=hero.querySelector('h1'),p=hero.querySelector('p'),flow=[...hero.querySelectorAll('.wm-flowline span')];
      flow.forEach(el=>el.hidden=false);
      if(mode==='goal'){
        if(h1)h1.innerHTML='Susun langkah investasi untuk <span>mencapai target.</span>';
        if(p)p.textContent='Rencana untuk tujuan yang memiliki target dana dan jangka waktu yang jelas, dengan investasi awal maupun berkala.';
      }
      if(mode==='lump'){
        if(h1)h1.innerHTML='Susun alokasi untuk dana yang <span>sudah tersedia.</span>';
        if(p)p.textContent='Rencana untuk dana yang sudah tersedia saat ini dengan fokus pada alokasi, likuiditas, dan tingkat risiko.';
      }
      if(mode==='buffer'){
        if(h1)h1.innerHTML='Pisahkan cadangan likuid dari <span>modal aktif.</span>';
        if(p)p.textContent='Rencana untuk investor atau trader yang ingin menjaga likuiditas sambil tetap mengelola modal aktif di pasar.';
      }
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
