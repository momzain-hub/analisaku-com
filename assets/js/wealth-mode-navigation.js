/* Wealth v1.6 mode navigation — each mode opens as a dedicated planner tab */
(function(){
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeFile={goal:'wealth-goal.html',lump:'wealth-capital.html',buffer:'wealth-buffer.html'};
  const routeLabel={goal:'Kejar Target',lump:'Dana Sudah Ada',buffer:'Investor / Trader + Cash Buffer'};

  function openDedicated(mode){
    const file=routeFile[mode];
    if(file)window.open(file,'_blank','noopener');
  }

  function patchDynamicFields(){
    if(!route)return;
    const monthly=document.getElementById('wmMonthly');
    if(route==='lump'&&monthly&&Number(monthly.value)===5000000)monthly.value=0;
    if(route==='buffer'&&monthly){
      monthly.value=0;
      const field=monthly.closest('.wm-field');
      if(field)field.hidden=true;
    }

    if(route==='buffer'){
      const box=document.getElementById('wmReturnAssumptions');
      if(box&&!box.dataset.bufferPatched){
        box.dataset.bufferPatched='true';
        const title=box.querySelector('.wm-return-head strong');
        const copy=box.querySelector('.wm-return-head p');
        if(title)title.textContent='Asumsi return untuk cash buffer.';
        if(copy)copy.textContent='Mode Cash Buffer hanya menggunakan asumsi Reksa Dana Pasar Uang dan Obligasi/RD Pendapatan Tetap.';
        const items=[...box.querySelectorAll('.wm-return-item')];
        items.slice(2).forEach(item=>item.hidden=true);
      }
    }
  }

  function patchSelector(){
    const panel=document.getElementById('wmPlanningMode');
    if(!panel){patchDynamicFields();return;}

    if(!route){
      if(panel.dataset.routePatched!=='landing'){
        panel.dataset.routePatched='landing';
        const head=panel.querySelector('.wm-plan-mode-head');
        if(head){
          const small=head.querySelector('small');
          const strong=head.querySelector('strong');
          const p=head.querySelector('p');
          if(small)small.textContent='PILIH WEALTH PLAN';
          if(strong)strong.textContent='Pilih jenis rencana yang ingin dibuat.';
          if(p)p.textContent='Kejar Target, Dana Sudah Ada, dan Cash Buffer memakai alur perhitungan yang berbeda. Klik salah satu untuk membuka planner khusus di tab baru.';
        }
        [...panel.querySelectorAll('[data-plan-mode]')].forEach(btn=>{
          btn.title='Buka planner khusus di tab baru';
          const small=btn.querySelector('small');
          if(small&&!small.textContent.includes('planner terpisah'))small.textContent+=' Dibuka sebagai planner terpisah.';
        });
        const step1=document.getElementById('step-1');
        const head1=step1?.querySelector('.wm-step-head>div:last-child');
        if(head1){
          const small=head1.querySelector('small'),h2=head1.querySelector('h2'),p=head1.querySelector('p');
          if(small)small.textContent='PILIH JENIS RENCANA';
          if(h2)h2.textContent='Mulai dari kebutuhan Anda.';
          if(p)p.textContent='Pilih satu mode. Form dan hasil perhitungan akan dibuka pada halaman khusus agar metode tidak saling tercampur.';
        }
      }
      const goal=document.getElementById('goalChoices');if(goal)goal.hidden=true;
      const fields=document.querySelector('#step-1 .wm-fields');if(fields)fields.hidden=true;
      const returns=document.getElementById('wmReturnAssumptions');if(returns)returns.hidden=true;
      ['step-2','step-3','step-4','wealth-result'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
      const progress=document.querySelector('.wm-progress');if(progress)progress.hidden=true;
      return;
    }

    if(panel.dataset.routePatched!==route){
      panel.dataset.routePatched=route;
      panel.innerHTML=`<div class="wm-plan-mode-head"><small>WEALTH PLAN KHUSUS</small><strong>${routeLabel[route]}</strong><p>Planner ini hanya menggunakan pertanyaan dan metode perhitungan yang relevan untuk mode ini. Hasil dari mode lain tidak dicampurkan.</p><a href="wealth.html" class="wm-product-start" style="display:inline-flex;margin-top:12px">← Pilih mode lain</a></div>`;
      document.body.dataset.wealthStandalone=route;

      const hero=document.querySelector('.wealth-hero');
      if(hero){
        const h1=hero.querySelector('h1');
        const p=hero.querySelector('p');
        if(route==='goal'){
          if(h1)h1.innerHTML='Susun dana untuk <span>mencapai target.</span>';
          if(p)p.textContent='Hitung kebutuhan dana, investasi berkala, tingkat risiko, komposisi investasi, dan perkembangan nilai dari sekarang sampai target.';
        }else if(route==='lump'){
          if(h1)h1.innerHTML='Alokasikan dana yang <span>sudah tersedia.</span>';
          if(p)p.textContent='Planner ini dirancang untuk dana yang sudah ada di awal. Proyeksi menggunakan penempatan dana sekaligus; tambahan bulanan hanya dihitung jika Anda memang menambahkannya.';
        }else if(route==='buffer'){
          if(h1)h1.innerHTML='Pisahkan <span>cash buffer</span> dan modal aktif.';
          if(p)p.textContent='Planner ini khusus investor dan trader. Cash buffer dipisahkan dari modal aktif, sehingga likuiditas tidak tercampur dengan proyeksi investasi bertahap.';
        }
      }
    }
    patchDynamicFields();
  }

  document.addEventListener('click',event=>{
    if(route)return;
    const btn=event.target.closest('[data-plan-mode]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDedicated(btn.dataset.planMode);
  },true);

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;patchSelector();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchSelector,{once:true});else patchSelector();
})();
