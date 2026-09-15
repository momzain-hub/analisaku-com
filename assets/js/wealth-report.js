/* Analisaku Wealth Plan — consolidated summary + PDF export */
(function(){
  const $=id=>document.getElementById(id);
  const qs=(sel,root=document)=>root.querySelector(sel);
  const qsa=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const clean=value=>String(value??'').trim();
  const esc=value=>clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const rupiahValue=id=>clean($(id)?.textContent)||'—';

  function activeGoal(){
    const card=qs('.goal-card.active');
    return {
      title:clean(qs('strong',card)?.textContent)||'Belum dipilih',
      sub:clean(qs('small',card)?.textContent)||'',
      key:card?.dataset.goal||''
    };
  }

  function riskSnapshot(){
    const box=$('riskResult');
    const name=clean(qs('.risk-score h3',box)?.textContent);
    const score=clean(qs('.risk-score b',box)?.textContent);
    const intro=clean(qs('.risk-score + p',box)?.textContent);
    const dimensions=qsa('.risk-dimensions div',box).map(el=>({
      label:clean(qs('small',el)?.textContent),
      value:clean(qs('b',el)?.textContent)
    }));
    const allocations=qsa('.allocation-card',box).map(el=>({
      label:clean(qs('small',el)?.textContent),
      value:clean(qs('b',el)?.textContent)
    }));
    return {ready:Boolean(name),name:name||'Belum dihitung',score:score||'—',intro,dimensions,allocations};
  }

  function fitSnapshot(){
    const cards=qsa('#fitResults .product-card');
    const fit=cards.filter(card=>card.classList.contains('is-fit')).map(card=>({
      name:clean(qs('strong',card)?.textContent),
      risk:clean(qs('small',card)?.textContent),
      description:clean(qs('p',card)?.textContent)
    }));
    return {ready:cards.length>0,fit};
  }

  function financialSnapshot(){
    const target=rupiahValue('fpFutureTarget');
    const projected=rupiahValue('fpProjected');
    const required=rupiahValue('fpRequired');
    const ratio=rupiahValue('fpFundingRatio');
    const ready=target!=='—'&&projected!=='—';
    return {
      ready,
      target,
      projected,
      required,
      ratio,
      note:clean($('fpNote')?.textContent),
      inputs:{
        targetToday:Number($('fpTarget')?.value||0),
        initial:Number($('fpInitial')?.value||0),
        years:Number($('fpYears')?.value||0),
        annualReturn:Number($('fpReturn')?.value||0),
        inflation:Number($('fpInflation')?.value||0),
        monthly:Number($('fpMonthly')?.value||0),
        timing:$('fpTiming')?.value==='begin'?'Awal bulan':'Akhir bulan'
      }
    };
  }

  function reportState(){
    return {goal:activeGoal(),risk:riskSnapshot(),fit:fitSnapshot(),finance:financialSnapshot()};
  }

  function formatMoney(value){
    return 'Rp '+Math.round(Number(value)||0).toLocaleString('id-ID');
  }

  function mini(label,value){return `<div><span>${esc(label)}</span><b>${esc(value||'—')}</b></div>`}

  function renderSummary(){
    const host=$('wealthPlanSummary');
    const status=$('wealthPlanStatus');
    if(!host)return;
    const state=reportState();
    const ready=state.risk.ready&&state.fit.ready&&state.finance.ready;
    if(status){
      status.textContent=ready?'WEALTH PLAN READY':'LENGKAPI ANALISIS';
      status.classList.toggle('is-ready',ready);
    }
    const products=state.fit.fit.length
      ?state.fit.fit.slice(0,5).map(item=>`<span>${esc(item.name)}</span>`).join('')
      :'<span>Belum ada Product Fit</span>';
    const dims=state.risk.dimensions.length
      ?state.risk.dimensions.map(item=>mini(item.label,item.value)).join('')
      :mini('Status','Isi kuesioner profil risiko');

    host.innerHTML=`
      <article class="plan-panel">
        <small>FINANCIAL GOAL</small>
        <strong>${esc(state.goal.title)}</strong>
        <p>${esc(state.goal.sub||'Tujuan investasi aktif.')}</p>
        <div class="plan-mini-grid">
          ${mini('Horizon',`${state.finance.inputs.years||0} tahun`)}
          ${mini('Target hari ini',formatMoney(state.finance.inputs.targetToday))}
        </div>
      </article>
      <article class="plan-panel">
        <small>RISK PROFILE</small>
        <strong>${esc(state.risk.name)}${state.risk.score!=='—'?` • ${esc(state.risk.score)}/36`:''}</strong>
        <p>${esc(state.risk.intro||'Lengkapi 9 pertanyaan untuk mendapatkan profil risiko indikatif.')}</p>
        <div class="plan-mini-grid">${dims}</div>
      </article>
      <article class="plan-panel">
        <small>PRODUCT FIT</small>
        <strong>${state.fit.fit.length?`${state.fit.fit.length} kelas produk sesuai`:'Belum dianalisis'}</strong>
        <p>Kelas produk ditampilkan berdasarkan kecocokan profil risiko, horizon, likuiditas, dan tujuan.</p>
        <div class="plan-product-list">${products}</div>
      </article>
      <article class="plan-panel">
        <small>FINANCIAL PLAN</small>
        <strong>${esc(state.finance.ratio)} funding ratio</strong>
        <p>${esc(state.finance.note||'Hitung rencana finansial untuk melihat gap dan kebutuhan bulanan.')}</p>
        <div class="plan-mini-grid">
          ${mini('Target masa depan',state.finance.target)}
          ${mini('Proyeksi dana',state.finance.projected)}
          ${mini('Kebutuhan / bulan',state.finance.required)}
          ${mini('Setoran rencana',formatMoney(state.finance.inputs.monthly))}
        </div>
      </article>`;
  }

  function canvasImage(){
    const canvas=$('fpChart');
    if(!canvas)return'';
    try{return canvas.toDataURL('image/png',1)}catch(_){return''}
  }

  function pdfMarkup(state){
    const now=new Date();
    const date=now.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
    const dimensions=state.risk.dimensions.length
      ?state.risk.dimensions.map(item=>mini(item.label,item.value)).join('')
      :mini('Status','Belum dihitung');
    const alloc=state.risk.allocations.length
      ?state.risk.allocations.map(item=>`<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b></div>`).join('')
      :'<div><span>Model alokasi</span><b>Belum tersedia</b></div>';
    const products=state.fit.fit.length
      ?state.fit.fit.slice(0,6).map(item=>`<span>${esc(item.name)}</span>`).join('')
      :'<span>Belum dianalisis</span>';
    const img=canvasImage();
    return `
      <div class="pdf-brand">
        <div><h1>analisaku<span>.com</span></h1><p>WEALTH MANAGEMENT PLAN</p></div>
        <div class="pdf-date">Dibuat ${esc(date)}<br>Goal-based planning • suitability • financial projection</div>
      </div>
      <section class="pdf-hero">
        <small>RINGKASAN RENCANA</small>
        <h2>${esc(state.goal.title)}</h2>
        <p>${esc(state.goal.sub||'Tujuan investasi')} • Horizon ${esc(String(state.finance.inputs.years||0))} tahun • Profil risiko ${esc(state.risk.name)}</p>
      </section>
      <div class="pdf-grid">
        <section class="pdf-card">
          <small>01 / FINANCIAL GOAL</small>
          <strong>${esc(state.goal.title)}</strong>
          <p>Target saat ini ${esc(formatMoney(state.finance.inputs.targetToday))}. Setelah memperhitungkan asumsi inflasi ${esc(String(state.finance.inputs.inflation))}% per tahun, target masa depan menjadi ${esc(state.finance.target)}.</p>
          <div class="pdf-kpis">${mini('Dana awal',formatMoney(state.finance.inputs.initial))}${mini('Horizon',`${state.finance.inputs.years} tahun`)}${mini('Return asumsi',`${state.finance.inputs.annualReturn}% / tahun`)}${mini('Setoran',`${formatMoney(state.finance.inputs.monthly)} / bulan`)}</div>
        </section>
        <section class="pdf-card">
          <small>02 / RISK PROFILE</small>
          <strong>${esc(state.risk.name)}${state.risk.score!=='—'?` • ${esc(state.risk.score)}/36`:''}</strong>
          <p>${esc(state.risk.intro||'Profil risiko belum dihitung.')}</p>
          <div class="pdf-kpis">${dimensions}</div>
        </section>
        <section class="pdf-card">
          <small>03 / PRODUCT FIT</small>
          <strong>${state.fit.fit.length?`${state.fit.fit.length} kelas produk layak dipertimbangkan`:'Belum dianalisis'}</strong>
          <div class="pdf-chips">${products}</div>
          <p>Kelas produk disaring secara indikatif berdasarkan profil risiko, horizon, likuiditas, dan tujuan. Bukan rekomendasi produk individual.</p>
        </section>
        <section class="pdf-card">
          <small>04 / FINANCIAL PLAN</small>
          <strong>${esc(state.finance.ratio)} funding ratio</strong>
          <div class="pdf-kpis">${mini('Target masa depan',state.finance.target)}${mini('Proyeksi dana',state.finance.projected)}${mini('Kebutuhan / bulan',state.finance.required)}${mini('Setoran saat ini',formatMoney(state.finance.inputs.monthly))}</div>
          <p>${esc(state.finance.note)}</p>
        </section>
      </div>
      <h3 class="pdf-section-title">MODEL ALOKASI EDUKATIF</h3>
      <div class="pdf-allocation">${alloc}</div>
      ${img?`<h3 class="pdf-section-title">PROYEKSI PERTUMBUHAN</h3><div class="pdf-chart"><img src="${img}" alt="Grafik proyeksi"></div>`:''}
      <div class="pdf-disclaimer">Disclaimer: Wealth Plan ini bersifat ilustratif dan edukatif. Hasil bukan rekomendasi personal, bukan pengganti profil risiko resmi/KYC/suitability assessment, dan tidak menjamin hasil investasi. Keputusan investasi tetap harus mempertimbangkan prospektus, fund fact sheet, kondisi keuangan, risiko produk, biaya, pajak, serta ketentuan pihak berizin yang relevan.</div>`;
  }

  async function downloadPdf(){
    const button=$('downloadWealthPdf');
    if(!button)return;
    const old=button.textContent;
    button.disabled=true;
    button.textContent='Menyiapkan PDF…';
    try{
      renderSummary();
      const state=reportState();
      const report=document.createElement('div');
      report.className='wealth-pdf-report';
      report.id='wealthPdfReport';
      report.innerHTML=pdfMarkup(state);
      document.body.appendChild(report);
      if(typeof window.html2pdf==='function'){
        const filename=`Analisaku-Wealth-Plan-${(state.goal.key||'Plan').replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.pdf`;
        await window.html2pdf().set({
          margin:[8,8,8,8],
          filename,
          image:{type:'jpeg',quality:.96},
          html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
          jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
          pagebreak:{mode:['avoid-all','css','legacy']}
        }).from(report).save();
      }else{
        alert('Generator PDF belum termuat. Silakan refresh halaman lalu coba kembali.');
      }
      report.remove();
    }catch(error){
      console.error('Wealth PDF error',error);
      alert('PDF belum berhasil dibuat. Silakan coba kembali.');
      document.getElementById('wealthPdfReport')?.remove();
    }finally{
      button.disabled=false;
      button.textContent=old;
    }
  }

  function bind(){
    qsa('.goal-card').forEach(el=>el.addEventListener('click',()=>setTimeout(renderSummary,30)));
    $('riskForm')?.addEventListener('submit',()=>setTimeout(renderSummary,60));
    $('fitButton')?.addEventListener('click',()=>setTimeout(renderSummary,60));
    $('fpCalculate')?.addEventListener('click',()=>setTimeout(renderSummary,60));
    $('downloadWealthPdf')?.addEventListener('click',downloadPdf);
    $('downloadWealthPdfMini')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('wealth-plan')?.scrollIntoView({behavior:'smooth'});});
    renderSummary();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,80));
  else setTimeout(bind,80);
})();
