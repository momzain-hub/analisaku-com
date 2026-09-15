/* Wealth v1.7 mode navigation — pilih sekali, lanjut di halaman yang sama */
(function(){
  const VERSION='1.7';
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeLabel={goal:'Kejar Target',lump:'Dana Sudah Ada',buffer:'Investor / Trader + Cash Buffer'};
  let selectedThisVisit=Boolean(route);

  function currentMode(){
    return window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode || window.ANALISAKU_WEALTH_MODE?.mode || route || 'goal';
  }

  function patchDynamicFields(mode){
    const monthly=document.getElementById('wmMonthly');
    if(mode==='lump'&&monthly&&Number(monthly.value)===5000000)monthly.value=0;
    if(mode==='buffer'&&monthly){
      monthly.value=0;
      const field=monthly.closest('.wm-field');
      if(field)field.hidden=true;
    }else if(monthly){
      const field=monthly.closest('.wm-field');
      if(field)field.hidden=false;
    }

    const box=document.getElementById('wmReturnAssumptions');
    if(box){
      const items=[...box.querySelectorAll('.wm-return-item')];
      items.forEach(item=>item.hidden=false);
      if(mode==='buffer'){
        const title=box.querySelector('.wm-return-head strong');
        const copy=box.querySelector('.wm-return-head p');
        if(title)title.textContent='Asumsi return untuk cash buffer.';
        if(copy)copy.textContent='Cash Buffer hanya menggunakan asumsi Reksa Dana Pasar Uang dan Obligasi/RD Pendapatan Tetap.';
        items.slice(2).forEach(item=>item.hidden=true);
      }
    }
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

  function patchSelector(){
    const panel=document.getElementById('wmPlanningMode');
    if(!panel)return;
    const mode=currentMode();
    const head=panel.querySelector('.wm-plan-mode-head');
    const buttons=[...panel.querySelectorAll('[data-plan-mode]')];

    if(!selectedThisVisit){
      if(head){
        const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
        if(small)small.textContent='PILIH WEALTH PLAN';
        if(strong)strong.textContent='Pilih jenis rencana yang ingin dibuat.';
        if(p)p.textContent='Pilih satu kali di sini. Setelah itu Anda langsung melanjutkan pertanyaan dan perhitungan di halaman yang sama.';
      }
      buttons.forEach(btn=>{
        btn.classList.remove('active');
        btn.removeAttribute('title');
        const small=btn.querySelector('small');
        if(!small)return;
        if(btn.dataset.planMode==='goal')small.textContent='Untuk tujuan seperti pendidikan, rumah, atau pensiun dengan investasi berkala.';
        if(btn.dataset.planMode==='lump')small.textContent='Untuk dana yang sudah tersedia dan ingin langsung dialokasikan ke instrumen investasi.';
        if(btn.dataset.planMode==='buffer')small.textContent='Untuk investor/trader yang ingin memisahkan cash buffer dari modal aktif.';
      });
      setPlannerVisibility(false);
      const step1=document.getElementById('step-1');
      const head1=step1?.querySelector('.wm-step-head>div:last-child');
      if(head1){
        const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
        if(small)small.textContent='PILIH JENIS RENCANA';
        if(h2)h2.textContent='Mulai dari kebutuhan Anda.';
        if(p)p.textContent='Setelah memilih, seluruh pertanyaan akan menyesuaikan otomatis tanpa meminta Anda memilih ulang.';
      }
      return;
    }

    setPlannerVisibility(true);
    patchDynamicFields(mode);
    buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.planMode===mode));

    if(head){
      const small=head.querySelector('small'),strong=head.querySelector('strong'),p=head.querySelector('p');
      if(small)small.textContent='MODE YANG DIPILIH';
      if(strong)strong.textContent=routeLabel[mode]||'Kejar Target';
      if(p)p.textContent='Pertanyaan dan metode perhitungan di bawah sudah disesuaikan dengan pilihan ini. Anda dapat mengganti mode kapan saja tanpa berpindah halaman.';
    }

    const step1=document.getElementById('step-1');
    const head1=step1?.querySelector('.wm-step-head>div:last-child');
    if(head1){
      const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
      if(mode==='goal'){
        if(small)small.textContent='KEJAR TARGET';
        if(h2)h2.textContent='Apa target yang ingin Anda capai?';
        if(p)p.textContent='Masukkan target, dana awal, jangka waktu, dan investasi bulanan. Seluruh proyeksi akan mengikuti tujuan tersebut.';
      }else if(mode==='lump'){
        if(small)small.textContent='DANA SUDAH ADA';
        if(h2)h2.textContent='Berapa dana yang siap dialokasikan?';
        if(p)p.textContent='Masukkan modal yang sudah tersedia. Proyeksi utama menggunakan dana sekaligus; tambahan bulanan bersifat opsional.';
      }else if(mode==='buffer'){
        if(small)small.textContent='CASH BUFFER';
        if(h2)h2.textContent='Berapa modal yang ingin dipisahkan?';
        if(p)p.textContent='Tentukan total modal dan porsi cash buffer. Buffer akan dihitung terpisah dari modal aktif investasi/trading.';
      }
    }
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-plan-mode]');
    if(!btn)return;
    // Handler asli wealth-planning-mode tetap menyimpan pilihan. Kita hanya membuka alurnya di halaman yang sama.
    selectedThisVisit=true;
    setTimeout(()=>{
      patchSelector();
      const step2=document.getElementById('step-2');
      if(step2)step2.scrollIntoView({behavior:'smooth',block:'start'});
    },60);
  });

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;patchSelector();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function init(){
    patchSelector();
    window.ANALISAKU_WEALTH_NAV={version:VERSION,mode:currentMode};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
