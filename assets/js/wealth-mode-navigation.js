/* Wealth v1.8 mode navigation — landing hanya pilih mode, planner terbuka di tab baru dengan mode terkunci */
(function(){
  const VERSION='1.8';
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeLabel={goal:'Kejar Target',lump:'Dana Sudah Ada',buffer:'Investor / Trader + Cash Buffer'};
  const routeCopy={
    goal:'Untuk tujuan seperti pendidikan, rumah, kendaraan, atau pensiun dengan dana awal dan investasi berkala.',
    lump:'Untuk dana yang sudah tersedia sekarang dan ingin langsung dialokasikan ke beberapa instrumen investasi.',
    buffer:'Untuk investor/trader yang ingin memisahkan dana likuid dari modal aktif investasi atau trading.'
  };

  function openPlanner(mode){
    if(!['goal','lump','buffer'].includes(mode))return;
    window.open(`wealth.html?mode=${encodeURIComponent(mode)}&standalone=1`,'_blank','noopener');
  }

  function currentMode(){
    return route || window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode || window.ANALISAKU_WEALTH_MODE?.mode || 'goal';
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
    ['step-2','step-3','step-4','wealth-result'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.hidden=!show;
    });
  }

  function patchLanding(panel){
    document.body.dataset.wealthLanding='true';
    const head=panel.querySelector('.wm-plan-mode-head');
    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='PILIH WEALTH PLAN';
      if(strong)strong.textContent='Pilih kebutuhan yang ingin Anda rencanakan.';
      if(p)p.textContent='Setiap pilihan menggunakan pertanyaan dan cara perhitungan yang berbeda. Setelah dipilih, planner khusus akan terbuka di tab baru dengan mode tersebut langsung aktif.';
    }
    const copies={
      goal:['Kejar Target','Untuk pendidikan, rumah, kendaraan, pensiun, atau tujuan lain dengan investasi berkala.'],
      lump:['Dana Sudah Ada','Untuk modal yang sudah tersedia dan ingin langsung dialokasikan ke instrumen investasi.'],
      buffer:['Investor / Trader dengan Cash Buffer','Untuk memisahkan dana likuid dan modal aktif investasi/trading.']
    };
    [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>{
      btn.classList.remove('active');
      const c=copies[btn.dataset.planMode];
      if(!c)return;
      const strong=btn.querySelector('strong'),small=btn.querySelector('small');
      if(strong)strong.textContent=c[0];
      if(small)small.textContent=c[1];
      btn.title='Buka planner khusus di tab baru';
    });
    const buffer=document.getElementById('wmBufferSetting');if(buffer)buffer.hidden=true;

    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(small)small.textContent='01 • PILIH JENIS RENCANA';
      if(h2)h2.textContent='Mulai dari kebutuhan Anda.';
      if(p)p.textContent='Di halaman ini Anda hanya perlu memilih satu jenis Wealth Plan. Isian berikutnya dilakukan di planner khusus agar alurnya lebih jelas dan tidak tercampur.';
    }
    setPlannerVisibility(false);
    if(step1)step1.hidden=false;
  }

  function patchStandalone(panel){
    document.body.dataset.wealthStandalone=route;
    setPlannerVisibility(true);
    const mode=currentMode();

    const grid=panel.querySelector('.wm-plan-mode-grid');
    if(grid)grid.hidden=true;

    const head=panel.querySelector('.wm-plan-mode-head');
    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='MODE TERPILIH';
      if(strong)strong.textContent=routeLabel[mode]||'Wealth Plan';
      if(p)p.textContent=`${routeCopy[mode]||''} Pertanyaan dan hasil di bawah hanya menggunakan metode untuk mode ini.`;
      if(!head.querySelector('.wm-mode-back')){
        const back=document.createElement('a');
        back.className='wm-product-start wm-mode-back';
        back.href='wealth.html';
        back.textContent='← Pilih mode lain';
        back.style.cssText='display:inline-flex;margin-top:12px';
        head.appendChild(back);
      }
    }

    [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>btn.hidden=true);

    const monthly=document.getElementById('wmMonthly');
    if(mode==='lump'&&monthly&&Number(monthly.value)===5000000)monthly.value=0;
    if(mode==='buffer'&&monthly){
      monthly.value=0;
      const field=monthly.closest('.wm-field');
      if(field)field.hidden=true;
    }

    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(mode==='goal'){
        if(small)small.textContent='01 • TARGET & KONDISI AWAL';
        if(h2)h2.textContent='Apa target yang ingin Anda capai?';
        if(p)p.textContent='Masukkan target dana, dana awal, jangka waktu, dan investasi bulanan. Proyeksi akan mengikuti tujuan tersebut.';
      }else if(mode==='lump'){
        if(small)small.textContent='01 • MODAL YANG TERSEDIA';
        if(h2)h2.textContent='Berapa dana yang siap dialokasikan?';
        if(p)p.textContent='Masukkan dana yang sudah tersedia saat ini dan horizon investasinya. Tambahan bulanan hanya digunakan bila Anda memang ingin menambah modal rutin.';
      }else if(mode==='buffer'){
        if(small)small.textContent='01 • STRUKTUR MODAL';
        if(h2)h2.textContent='Berapa modal yang ingin dipisahkan?';
        if(p)p.textContent='Masukkan total modal dan tentukan porsi cash buffer. Dana likuid dan modal aktif akan dihitung terpisah.';
      }
    }

    const hero=document.querySelector('.wealth-hero');
    if(hero){
      const h1=hero.querySelector('h1'),p=hero.querySelector('p');
      if(mode==='goal'){
        if(h1)h1.innerHTML='Susun dana untuk <span>mencapai target.</span>';
        if(p)p.textContent='Planner khusus untuk membangun dana secara bertahap sampai tujuan yang Anda tentukan.';
      }else if(mode==='lump'){
        if(h1)h1.innerHTML='Alokasikan dana yang <span>sudah tersedia.</span>';
        if(p)p.textContent='Planner khusus untuk modal yang sudah ada di awal, sehingga proyeksi tidak tercampur dengan metode kejar target.';
      }else if(mode==='buffer'){
        if(h1)h1.innerHTML='Pisahkan <span>cash buffer</span> dan modal aktif.';
        if(p)p.textContent='Planner khusus investor/trader untuk menjaga likuiditas sambil memisahkan modal aktif investasi atau trading.';
      }
    }
  }

  function patch(){
    const panel=document.getElementById('wmPlanningMode');
    if(!panel)return;
    if(route)patchStandalone(panel);else patchLanding(panel);
  }

  document.addEventListener('click',event=>{
    if(route)return;
    const btn=event.target.closest('[data-plan-mode]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPlanner(btn.dataset.planMode);
  },true);

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;patch();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function init(){patch();window.ANALISAKU_WEALTH_NAV={version:VERSION,mode:currentMode};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
