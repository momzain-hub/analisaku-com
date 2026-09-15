/* Wealth v1.6 mode navigation — each mode opens as a dedicated planner tab */
(function(){
  const route=window.ANALISAKU_WEALTH_ROUTE?.mode||'';
  const routeFile={goal:'wealth-goal.html',lump:'wealth-capital.html',buffer:'wealth-buffer.html'};
  const routeLabel={goal:'Kejar Target',lump:'Dana Sudah Ada',buffer:'Investor / Trader + Cash Buffer'};

  function openDedicated(mode){
    const file=routeFile[mode];
    if(file)window.open(file,'_blank','noopener');
  }

  function patchSelector(){
    const panel=document.getElementById('wmPlanningMode');
    if(!panel)return;
    const buttons=[...panel.querySelectorAll('[data-plan-mode]')];
    if(!route){
      const head=panel.querySelector('.wm-plan-mode-head');
      if(head){
        const strong=head.querySelector('strong');
        const p=head.querySelector('p');
        if(strong)strong.textContent='Pilih jenis Wealth Plan yang ingin dibuat.';
        if(p)p.textContent='Setiap pilihan memiliki alur, pertanyaan, dan hasil yang berbeda agar perhitungannya tidak tercampur.';
      }
      buttons.forEach(btn=>{
        btn.title='Buka planner khusus di tab baru';
        const small=btn.querySelector('small');
        if(small&&!small.textContent.includes('tab baru'))small.textContent+=' Dibuka sebagai planner terpisah.';
      });
      return;
    }

    panel.innerHTML=`<div class="wm-plan-mode-head"><small>WEALTH PLAN KHUSUS</small><strong>${routeLabel[route]}</strong><p>Planner ini hanya menggunakan pertanyaan dan metode perhitungan yang relevan untuk mode ini. Hasil dari mode lain tidak dicampurkan.</p><a href="wealth.html" class="wm-product-start" style="display:inline-flex;margin-top:12px">← Pilih mode lain</a></div>`;
    document.body.dataset.wealthStandalone=route;

    const monthly=document.getElementById('wmMonthly');
    if((route==='lump'||route==='buffer')&&monthly&&Number(monthly.value)===5000000)monthly.value=0;

    const hero=document.querySelector('.wealth-hero');
    if(hero){
      const h1=hero.querySelector('h1');
      const p=hero.querySelector('p');
      if(route==='goal'){
        if(h1)h1.innerHTML='Susun dana untuk <span>mencapai target.</span>';
        if(p)p.textContent='Hitung kebutuhan dana, setoran berkala, tingkat risiko, komposisi investasi, dan perkembangan nilai dari sekarang sampai target.';
      }else if(route==='lump'){
        if(h1)h1.innerHTML='Alokasikan dana yang <span>sudah tersedia.</span>';
        if(p)p.textContent='Planner ini dirancang untuk dana yang sudah ada di awal. Proyeksi utama menggunakan penempatan dana sekaligus; tambahan bulanan hanya dihitung bila Anda memang mengisinya.';
      }else if(route==='buffer'){
        if(h1)h1.innerHTML='Pisahkan <span>cash buffer</span> dan modal aktif.';
        if(p)p.textContent='Planner ini khusus investor dan trader. Cash buffer dipisahkan dari modal aktif, sehingga simulasi likuiditas tidak tercampur dengan proyeksi investasi bertahap.';
      }
    }
  }

  document.addEventListener('click',event=>{
    if(route)return;
    const btn=event.target.closest('[data-plan-mode]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDedicated(btn.dataset.planMode);
  },true);

  const observer=new MutationObserver(()=>patchSelector());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchSelector,{once:true});else patchSelector();
})();
