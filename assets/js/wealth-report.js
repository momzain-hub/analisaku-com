/* Analisaku Wealth Plan v3 — at-a-glance summary + native jsPDF export */
(function(){
  const $=id=>document.getElementById(id);
  const qs=(sel,root=document)=>root?.querySelector(sel)||null;
  const qsa=(sel,root=document)=>root?[...root.querySelectorAll(sel)]:[];
  const clean=value=>String(value??'').trim();
  const esc=value=>clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const money=value=>'Rp '+Math.round(Number(value)||0).toLocaleString('id-ID');

  function ensureUi(){
    qsa('.wealth-flow span').forEach((span,index)=>{
      span.dataset.step=String(index+1);
      span.textContent=clean(span.textContent).replace(/^\d+\.\s*/, '');
    });

    const heroCard=qs('.wealth-hero-card');
    if(heroCard&&!qs('.wm-engine-points',heroCard)){
      heroCard.insertAdjacentHTML('beforeend',`
        <div class="wm-engine-points">
          <div><b>1. Tujuan</b><span>Untuk apa dan kapan?</span></div>
          <div><b>2. Kesesuaian</b><span>KAPAN • MAMPU • NYAMAN</span></div>
          <div><b>3. Rencana</b><span>Produk + kebutuhan dana</span></div>
        </div>`);
    }

    const jump=qs('.wealth-jump-inner');
    if(jump&&!$('downloadWealthPdfMini')){
      jump.insertAdjacentHTML('beforeend',`<a href="#wealth-plan">Wealth Plan</a><a href="#wealth-plan" class="wealth-download-mini" id="downloadWealthPdfMini">PDF</a>`);
    }

    if(!$('wealth-plan')){
      const methodology=qs('.wm-methodology')?.closest('section');
      const section=document.createElement('section');
      section.className='section';
      section.id='wealth-plan';
      section.innerHTML=`
        <div class="container">
          <div class="wm-section-head">
            <div><div class="kicker">05 / YOUR WEALTH PLAN</div><h2>Sekali lihat, langsung tahu rencananya.</h2></div>
            <p>Ringkasan akhir menjawab empat hal: target Anda apa, batas risiko berapa, produk apa yang lolos filter, dan apakah target dana sudah on track.</p>
          </div>
          <div class="wealth-plan-shell">
            <div class="wealth-plan-top">
              <div><div class="kicker">PERSONAL WEALTH SNAPSHOT</div><h3>Rencana investasi Anda</h3><p>Goal → KAPAN/MAMPU/NYAMAN → Product Fit → Funding Plan.</p></div>
              <span class="wealth-plan-status" id="wealthPlanStatus">LENGKAPI ANALISIS</span>
            </div>
            <div class="plan-glance" id="wealthPlanGlance"></div>
            <div class="wealth-plan-grid" id="wealthPlanSummary"></div>
            <div class="wealth-plan-actions">
              <p>PDF dibuat dengan native PDF engine di browser, bukan screenshot halaman. Hasil lebih stabil dan tetap berisi walau tema website sedang gelap.</p>
              <button type="button" class="wm-download" id="downloadWealthPdf">Unduh Wealth Plan PDF</button>
            </div>
          </div>
        </div>`;
      if(methodology)methodology.before(section);else qs('main')?.appendChild(section);
    }
  }

  function activeGoal(){
    const card=qs('.goal-card.active');
    return {title:clean(qs('strong',card)?.textContent)||'Belum dipilih',sub:clean(qs('small',card)?.textContent)||'',key:card?.dataset.goal||'Plan'};
  }

  function riskSnapshot(){
    const box=$('riskResult');
    const name=clean(qs('.risk-score-v3 h3',box)?.textContent)||clean(qs('.risk-score h3',box)?.textContent);
    const limit=clean(qs('.risk-limit-badge b',box)?.textContent)||clean(qsa('.risk-dimensions b',box).at(-1)?.textContent);
    const quick=clean(qs('.risk-one-line b',box)?.textContent)||clean(qs('.risk-score + p',box)?.textContent);
    const lenses=qsa('.risk-lens-card',box).map(el=>({
      key:clean(qs('.risk-lens-top span',el)?.textContent),
      level:clean(qs('.risk-lens-top b',el)?.textContent),
      title:clean(qs(':scope > strong',el)?.textContent),
      state:clean(qs(':scope > small',el)?.textContent)
    }));
    const allocations=qsa('.allocation-card',box).map(el=>({label:clean(qs('small',el)?.textContent),value:clean(qs('b',el)?.textContent)}));
    return {ready:Boolean(name&&name!=='Lengkapi 9 pertanyaan'&&name!=='Belum lengkap'),name:name||'Belum dihitung',limit:limit||'—',quick,lenses,allocations};
  }

  function fitSnapshot(){
    const cards=qsa('#fitResults .product-card');
    const fit=cards.filter(card=>card.classList.contains('is-fit')).map(card=>({name:clean(qs('strong',card)?.textContent),risk:clean(qs('small',card)?.textContent),description:clean(qs('p',card)?.textContent)}));
    return {ready:cards.length>0,fit,total:cards.length};
  }

  function financialSnapshot(){
    const text=id=>clean($(id)?.textContent)||'—';
    const target=text('fpFutureTarget'),projected=text('fpProjected'),required=text('fpRequired'),ratio=text('fpFundingRatio');
    return {
      ready:target!=='—'&&projected!=='—',target,projected,required,ratio,note:clean($('fpNote')?.textContent),
      inputs:{targetToday:Number($('fpTarget')?.value||0),initial:Number($('fpInitial')?.value||0),years:Number($('fpYears')?.value||0),annualReturn:Number($('fpReturn')?.value||0),inflation:Number($('fpInflation')?.value||0),monthly:Number($('fpMonthly')?.value||0),timing:$('fpTiming')?.value==='begin'?'Awal bulan':'Akhir bulan'}
    };
  }

  function state(){return {goal:activeGoal(),risk:riskSnapshot(),fit:fitSnapshot(),finance:financialSnapshot()}}
  const mini=(label,value)=>`<div><span>${esc(label)}</span><b>${esc(value||'—')}</b></div>`;

  function fundingNumber(value){const n=parseFloat(String(value||'').replace(/[^0-9,.-]/g,'').replace(',','.'));return Number.isFinite(n)?n:0}

  function renderSummary(){
    const host=$('wealthPlanSummary'),glance=$('wealthPlanGlance'),status=$('wealthPlanStatus');
    if(!host||!glance)return;
    const s=state();
    const ready=s.risk.ready&&s.fit.ready&&s.finance.ready;
    if(status){status.textContent=ready?'WEALTH PLAN READY':'LENGKAPI ANALISIS';status.classList.toggle('is-ready',ready)}

    const ratio=fundingNumber(s.finance.ratio);
    let next='Lengkapi profil risiko untuk menentukan batas produk.';
    if(s.risk.ready&&!s.fit.ready)next='Lanjutkan ke Product Fit untuk melihat kelas produk yang lolos filter.';
    else if(s.fit.ready&&s.finance.ready&&ratio<100)next=`Target belum penuh. Fokus pada kebutuhan setoran sekitar ${s.finance.required} per bulan.`;
    else if(s.fit.ready&&s.finance.ready&&ratio>=100)next='Target berada dalam jalur asumsi. Jaga disiplin setoran dan review berkala.';

    glance.innerHTML=`
      <div><small>TUJUAN</small><strong>${esc(s.goal.title)}</strong><span>${s.finance.inputs.years||0} tahun</span></div>
      <div><small>BATAS RISIKO</small><strong>${esc(s.risk.name)}</strong><span>${esc(s.risk.limit)}</span></div>
      <div><small>PRODUCT FIT</small><strong>${s.fit.ready?`${s.fit.fit.length} cocok`:'Belum dicek'}</strong><span>dari ${s.fit.total||6} kelas produk</span></div>
      <div><small>FUNDING</small><strong>${esc(s.finance.ratio)}</strong><span>${ratio>=100?'On track':'Perlu ditutup gap'}</span></div>
      <div class="plan-next"><small>NEXT ACTION</small><strong>${esc(next)}</strong></div>`;

    const products=s.fit.fit.length?s.fit.fit.slice(0,5).map(item=>`<span>${esc(item.name)}</span>`).join(''):'<span>Belum ada Product Fit</span>';
    const lenses=s.risk.lenses.length?s.risk.lenses.map(item=>mini(item.key,`${item.level} • ${item.state}`)).join(''):mini('Status','Isi kuesioner');

    host.innerHTML=`
      <article class="plan-panel"><small>01 / GOAL</small><strong>${esc(s.goal.title)}</strong><p>${esc(s.goal.sub||'Tujuan investasi aktif.')}</p><div class="plan-mini-grid">${mini('Target hari ini',money(s.finance.inputs.targetToday))}${mini('Horizon',`${s.finance.inputs.years||0} tahun`)}</div></article>
      <article class="plan-panel"><small>02 / KAPAN • MAMPU • NYAMAN</small><strong>${esc(s.risk.name)} • ${esc(s.risk.limit)}</strong><p>${esc(s.risk.quick||'Lengkapi profil risiko untuk mendapatkan batas produk.')}</p><div class="plan-mini-grid">${lenses}</div></article>
      <article class="plan-panel"><small>03 / PRODUCT FIT</small><strong>${s.fit.ready?`${s.fit.fit.length} kelas produk cocok`:'Belum dianalisis'}</strong><p>Produk hanya lolos bila sesuai batas risiko, horizon, dan kebutuhan likuiditas.</p><div class="plan-product-list">${products}</div></article>
      <article class="plan-panel"><small>04 / FUNDING PLAN</small><strong>${esc(s.finance.ratio)} funding ratio</strong><p>${esc(s.finance.note||'Hitung rencana finansial untuk melihat gap.')}</p><div class="plan-mini-grid">${mini('Target masa depan',s.finance.target)}${mini('Proyeksi dana',s.finance.projected)}${mini('Kebutuhan / bulan',s.finance.required)}${mini('Setoran rencana',money(s.finance.inputs.monthly))}</div></article>`;
  }

  function chartImage(){const canvas=$('fpChart');if(!canvas)return'';try{return canvas.toDataURL('image/png',1)}catch(_){return''}}

  function downloadPdf(){
    const button=$('downloadWealthPdf');
    if(!button)return;
    const old=button.textContent;
    button.disabled=true;button.textContent='Menyiapkan PDF…';
    try{
      renderSummary();
      if(!window.jspdf?.jsPDF)throw new Error('jsPDF belum termuat');
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
      const s=state();
      const pageW=210,pageH=297,margin=14,contentW=pageW-margin*2;
      const C={navy:[15,26,43],gold:[211,166,74],teal:[34,181,184],green:[44,153,108],text:[28,38,55],muted:[101,112,130],line:[224,228,234],soft:[247,249,251],white:[255,255,255]};
      let y=14;

      const setText=(size=10,color=C.text,style='normal')=>{doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...color)};
      const ensure=need=>{if(y+need>pageH-16){doc.addPage();y=16;return true}return false};
      const paragraph=(text,x,width,size=9,color=C.muted,line=4.5)=>{setText(size,color,'normal');const lines=doc.splitTextToSize(String(text||'—'),width);doc.text(lines,x,y);y+=lines.length*line;return lines.length};
      const sectionTitle=(num,title)=>{ensure(14);setText(7,C.gold,'bold');doc.text(num,margin,y);setText(12,C.text,'bold');doc.text(title,margin,y+5);y+=12;};
      const kv=(label,value,x,w)=>{doc.setFillColor(...C.soft);doc.roundedRect(x,y,w,14,2,2,'F');setText(6.5,C.muted,'bold');doc.text(label.toUpperCase(),x+3,y+4.5);setText(9,C.text,'bold');const lines=doc.splitTextToSize(String(value||'—'),w-6).slice(0,2);doc.text(lines,x+3,y+9);};
      const footerPages=()=>{const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);doc.setDrawColor(...C.line);doc.line(margin,pageH-11,pageW-margin,pageH-11);setText(6.5,C.muted,'normal');doc.text('Analisaku.com • Wealth Plan edukatif • bukan rekomendasi personal',margin,pageH-7);doc.text(`${i}/${total}`,pageW-margin,pageH-7,{align:'right'});}};

      doc.setFillColor(...C.navy);doc.roundedRect(margin,y,contentW,42,4,4,'F');
      setText(8,C.gold,'bold');doc.text('ANALISAKU.COM  /  WEALTH MANAGEMENT PLAN',margin+7,y+8);
      setText(22,C.white,'bold');doc.text(s.goal.title,margin+7,y+20);
      setText(9,[205,214,226],'normal');doc.text(`Horizon ${s.finance.inputs.years||0} tahun  •  Profil ${s.risk.name}  •  ${s.risk.limit}`,margin+7,y+28);
      const date=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
      setText(7,[205,214,226],'normal');doc.text(`Dibuat ${date}`,margin+7,y+35);
      y+=49;

      sectionTitle('RINGKASAN','Sekali lihat: posisi Anda sekarang');
      const gap=3,w=(contentW-gap*3)/4;
      kv('Goal',s.goal.title,margin,w);kv('Risk Limit',`${s.risk.name} • ${s.risk.limit}`,margin+w+gap,w);kv('Product Fit',s.fit.ready?`${s.fit.fit.length} kelas cocok`:'Belum dicek',margin+(w+gap)*2,w);kv('Funding',s.finance.ratio,margin+(w+gap)*3,w);y+=20;

      const ratio=fundingNumber(s.finance.ratio);
      let action='Lengkapi KAPAN, MAMPU, dan NYAMAN sebelum memilih kelas produk.';
      if(s.risk.ready&&!s.fit.ready)action='Lanjutkan Product Fit untuk menyaring kelas produk berdasarkan batas risiko, horizon, dan likuiditas.';
      else if(s.fit.ready&&s.finance.ready&&ratio<100)action=`Target belum penuh. Kebutuhan setoran indikatif sekitar ${s.finance.required} per bulan.`;
      else if(s.fit.ready&&s.finance.ready&&ratio>=100)action='Target berada dalam jalur asumsi. Pertahankan disiplin setoran dan review berkala.';
      doc.setFillColor(252,247,236);doc.roundedRect(margin,y,contentW,18,3,3,'F');setText(7,C.gold,'bold');doc.text('NEXT ACTION',margin+4,y+5);setText(9,C.text,'bold');doc.text(doc.splitTextToSize(action,contentW-8).slice(0,2),margin+4,y+10);y+=24;

      sectionTitle('01','KAPAN • MAMPU • NYAMAN');
      paragraph(s.risk.quick||'Profil risiko belum dihitung.',margin,contentW,9,C.muted,4.4);
      y+=2;
      const lensW=(contentW-6)/3;
      const lensData=s.risk.lenses.length?s.risk.lenses:[{key:'KAPAN',level:'—',state:'Belum dihitung'},{key:'MAMPU',level:'—',state:'Belum dihitung'},{key:'NYAMAN',level:'—',state:'Belum dihitung'}];
      lensData.slice(0,3).forEach((lens,i)=>{const x=margin+i*(lensW+3);doc.setDrawColor(...C.line);doc.setFillColor(...C.soft);doc.roundedRect(x,y,lensW,22,3,3,'FD');setText(7,C.teal,'bold');doc.text(lens.key,x+4,y+5);setText(11,C.text,'bold');doc.text(lens.level||'—',x+4,y+12);setText(7,C.muted,'normal');doc.text(doc.splitTextToSize(lens.state||'',lensW-8).slice(0,1),x+4,y+17);});y+=28;

      sectionTitle('02','Product Fit');
      if(s.fit.fit.length){
        s.fit.fit.slice(0,6).forEach((p,i)=>{ensure(12);doc.setFillColor(...C.soft);doc.roundedRect(margin,y,contentW,10,2,2,'F');setText(8,C.text,'bold');doc.text(`${i+1}. ${p.name}`,margin+4,y+6.2);setText(6.5,C.green,'bold');doc.text(p.risk||'COCOK',pageW-margin-4,y+6.2,{align:'right'});y+=12;});
      }else{paragraph('Belum ada hasil Product Fit. Jalankan analisis Product Fit setelah profil risiko selesai.',margin,contentW);y+=3;}

      sectionTitle('03','Financial Plan');
      const fin=[['Target hari ini',money(s.finance.inputs.targetToday)],['Target masa depan',s.finance.target],['Dana awal',money(s.finance.inputs.initial)],['Proyeksi dana',s.finance.projected],['Setoran rencana',`${money(s.finance.inputs.monthly)} / bulan`],['Kebutuhan indikatif',`${s.finance.required} / bulan`],['Return asumsi',`${s.finance.inputs.annualReturn}% / tahun`],['Inflasi asumsi',`${s.finance.inputs.inflation}% / tahun`]];
      for(let i=0;i<fin.length;i+=2){ensure(18);kv(fin[i][0],fin[i][1],margin,(contentW-3)/2);kv(fin[i+1][0],fin[i+1][1],margin+(contentW-3)/2+3,(contentW-3)/2);y+=17;}
      y+=2;paragraph(s.finance.note||'Belum ada proyeksi finansial.',margin,contentW,8.5,C.muted,4.2);y+=3;

      if(s.risk.allocations.length){
        sectionTitle('04','Model Alokasi Edukatif');
        const aw=(contentW-9)/4;
        s.risk.allocations.slice(0,4).forEach((a,i)=>{const x=margin+i*(aw+3);doc.setFillColor(...C.soft);doc.roundedRect(x,y,aw,18,2,2,'F');setText(6.5,C.muted,'bold');doc.text(doc.splitTextToSize(a.label,aw-6).slice(0,2),x+3,y+5);setText(12,C.text,'bold');doc.text(a.value,x+3,y+14);});y+=24;
      }

      const img=chartImage();
      if(img){ensure(75);sectionTitle('05','Proyeksi Pertumbuhan');try{doc.addImage(img,'PNG',margin,y,contentW,58,undefined,'FAST');y+=64}catch(_){}}

      ensure(36);doc.setFillColor(248,249,251);doc.roundedRect(margin,y,contentW,28,3,3,'F');setText(7,C.muted,'bold');doc.text('CATATAN PENTING',margin+4,y+6);paragraph('Wealth Plan ini bersifat ilustratif dan edukatif. Bukan rekomendasi personal, bukan pengganti KYC/profil risiko/suitability resmi, dan tidak menjamin hasil investasi. Pertimbangkan dokumen produk, biaya, pajak, kondisi keuangan, serta ketentuan pihak berizin sebelum mengambil keputusan.',margin+4,contentW-8,7.3,C.muted,3.7);

      footerPages();
      const filename=`Analisaku-Wealth-Plan-${String(s.goal.key||'Plan').replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
    }catch(error){
      console.error('Wealth PDF error',error);
      alert('PDF belum berhasil dibuat. Refresh halaman lalu coba kembali.');
    }finally{button.disabled=false;button.textContent=old;}
  }

  function bind(){
    ensureUi();
    qsa('.goal-card').forEach(el=>el.addEventListener('click',()=>setTimeout(renderSummary,30)));
    $('riskForm')?.addEventListener('submit',()=>setTimeout(renderSummary,80));
    $('fitButton')?.addEventListener('click',()=>setTimeout(renderSummary,80));
    $('fpCalculate')?.addEventListener('click',()=>setTimeout(renderSummary,80));
    ['analisaku:wealth-risk','analisaku:wealth-fit','analisaku:wealth-finance'].forEach(name=>window.addEventListener(name,()=>setTimeout(renderSummary,20)));
    $('downloadWealthPdf')?.addEventListener('click',downloadPdf);
    $('downloadWealthPdfMini')?.addEventListener('click',event=>{event.preventDefault();$('wealth-plan')?.scrollIntoView({behavior:'smooth'});});
    renderSummary();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,80));else setTimeout(bind,80);
})();
