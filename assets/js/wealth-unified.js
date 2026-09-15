/* Analisaku Wealth v5 — connected one-form engine with equity-forward allocation */
(function(){
  const $=id=>document.getElementById(id);
  const qs=(sel,root=document)=>root.querySelector(sel);
  const qsa=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=v=>`${Math.max(0,Number(v)||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

  let selectedGoal='Pendidikan';
  let latestPlan=null;

  const goalMeta={
    Pendidikan:{label:'Dana Pendidikan',sub:'Sekolah / kuliah anak',goal:'balanced',defaultYears:5},
    Rumah:{label:'DP Rumah / Hunian',sub:'Rumah pertama / upgrade',goal:'balanced',defaultYears:7},
    Kendaraan:{label:'Beli Kendaraan',sub:'Mobil / motor',goal:'preserve',defaultYears:3},
    'Dana Darurat':{label:'Dana Darurat',sub:'Likuiditas & proteksi',goal:'preserve',defaultYears:1},
    Pensiun:{label:'Dana Pensiun',sub:'Tujuan jangka panjang',goal:'growth',defaultYears:15},
    Custom:{label:'Rencana Kustom',sub:'Target sesuai kebutuhan',goal:'balanced',defaultYears:5}
  };

  const profileNames=['','Konservatif','Moderat Konservatif','Moderat','Growth','Agresif'];
  const profileCopy={
    1:'Fokus utama menjaga nilai dana dan likuiditas.',
    2:'Mengutamakan stabilitas dengan ruang pertumbuhan terbatas.',
    3:'Menyeimbangkan stabilitas dan pertumbuhan.',
    4:'Berorientasi pertumbuhan dengan porsi ekuitas dominan dan siap menghadapi fluktuasi besar.',
    5:'Berorientasi pertumbuhan jangka panjang dengan porsi ekuitas sangat tinggi dan toleransi volatilitas tinggi.'
  };

  /*
    Equity-forward model.
    Maximum strategic equity exposure is 90% for the highest-risk profile,
    leaving a 10% stabilizer. The actual equity weight is still capped by
    time horizon and liquidity need.
  */
  const baseAllocations={
    1:[['Likuid / RDPU',55],['Obligasi / RDPT',40],['Campuran',5],['Ekuitas (Saham / RD Saham)',0]],
    2:[['Likuid / RDPU',35],['Obligasi / RDPT',45],['Campuran',15],['Ekuitas (Saham / RD Saham)',5]],
    3:[['Likuid / RDPU',20],['Obligasi / RDPT',35],['Campuran',25],['Ekuitas (Saham / RD Saham)',20]],
    4:[['Likuid / RDPU',10],['Obligasi / RDPT',15],['Campuran',5],['Ekuitas (Saham / RD Saham)',70]],
    5:[['Likuid / RDPU',5],['Obligasi / RDPT',5],['Campuran',0],['Ekuitas (Saham / RD Saham)',90]]
  };

  const assetReturnAssumptions={
    'Likuid / RDPU':5,
    'Obligasi / RDPT':6.5,
    'Campuran':8,
    'Ekuitas (Saham / RD Saham)':10
  };

  const products=[
    {name:'Reksa Dana Pasar Uang',risk:1,minH:1,liq:4,goals:['preserve','income','balanced'],desc:'Likuiditas tinggi dan fluktuasi relatif rendah.'},
    {name:'SBN / Obligasi Berkualitas',risk:2,minH:2,liq:2,goals:['preserve','income','balanced'],desc:'Pendapatan relatif stabil, tetap memiliki risiko harga dan likuiditas.'},
    {name:'Reksa Dana Pendapatan Tetap',risk:2,minH:2,liq:3,goals:['income','balanced'],desc:'Eksposur utama pada surat utang untuk horizon menengah.'},
    {name:'Reksa Dana Campuran',risk:3,minH:3,liq:3,goals:['balanced','growth'],desc:'Kombinasi beberapa kelas aset dengan risiko menengah.'},
    {name:'Reksa Dana Saham',risk:4,minH:4,liq:3,goals:['growth'],desc:'Pertumbuhan jangka panjang dengan volatilitas tinggi.'},
    {name:'Saham Langsung',risk:4,minH:4,liq:3,goals:['growth'],desc:'Eksposur saham melalui rekening brokerage; membutuhkan diversifikasi, disiplin risiko, dan review berkala.'}
  ];

  function answer(name){
    const checked=qs(`input[name="${name}"]:checked`);
    return checked?Number(checked.value):null;
  }
  function lensLevel(values){
    const avg=values.reduce((a,b)=>a+b,0)/values.length;
    return Math.max(1,Math.min(5,Math.round(1+((avg-1)/3)*4)));
  }
  function labelLevel(level){return `Level ${level}/5`;}
  function horizonBucket(years){
    if(years<1)return 1;
    if(years<=3)return 2;
    if(years<=5)return 3;
    return 4;
  }
  function liquidityNeedFromAnswer(v){return Number(v)||1;}
  function horizonEquityCap(years){
    if(years<1)return 0;
    if(years<=3)return 10;
    if(years<=5)return 35;
    if(years<=10)return 70;
    return 90;
  }
  function liquidityEquityCap(liq){
    if(liq<=1)return 10;
    if(liq===2)return 35;
    if(liq===3)return 70;
    return 90;
  }
  function buildAllocation(level,years,liq){
    const allocation=(baseAllocations[level]||baseAllocations[1]).map(([name,val])=>[name,val]);
    const equityIndex=allocation.findIndex(([name])=>name.startsWith('Ekuitas'));
    if(equityIndex<0)return allocation;
    const strategic=allocation[equityIndex][1];
    const cap=Math.min(strategic,horizonEquityCap(years),liquidityEquityCap(liq));
    const reduction=Math.max(0,strategic-cap);
    allocation[equityIndex][1]=cap;
    if(reduction>0){
      const fixedIndex=allocation.findIndex(([name])=>name==='Obligasi / RDPT');
      if(fixedIndex>=0)allocation[fixedIndex][1]+=reduction;
    }
    return allocation;
  }
  function expectedPortfolioReturn(allocation){
    const weighted=allocation.reduce((sum,[name,val])=>sum+((assetReturnAssumptions[name]||0)*val/100),0);
    return Math.round(weighted*10)/10;
  }
  function requiredMonthly(target,initial,annualRate,months){
    const r=Math.pow(1+annualRate/100,1/12)-1;
    const growth=Math.pow(1+r,months);
    const fvInitial=initial*growth;
    if(fvInitial>=target)return 0;
    if(Math.abs(r)<1e-12)return Math.max(0,(target-initial)/months);
    const factor=(growth-1)/r;
    return Math.max(0,(target-fvInitial)/factor);
  }
  function futureValue(initial,monthly,annualRate,months){
    const r=Math.pow(1+annualRate/100,1/12)-1;
    const growth=Math.pow(1+r,months);
    if(Math.abs(r)<1e-12)return initial+monthly*months;
    return initial*growth+monthly*((growth-1)/r);
  }

  function selectedGoalData(){return goalMeta[selectedGoal]||goalMeta.Custom;}

  function validate(){
    const requiredNames=['qWhen','qLiquidity','qEmergency','qIncome','qExposure','qDrawdown','qExperience'];
    const missing=requiredNames.find(name=>answer(name)===null);
    if(missing){
      const el=qs(`input[name="${missing}"]`);
      el?.closest('.wm-lens-card')?.scrollIntoView({behavior:'smooth',block:'center'});
      return 'Lengkapi seluruh pertanyaan KAPAN, MAMPU, dan NYAMAN.';
    }
    const target=Number($('wmTarget')?.value||0),initial=Number($('wmInitial')?.value||0),years=Number($('wmYears')?.value||0),monthly=Number($('wmMonthly')?.value||0);
    if(!(target>0&&initial>=0&&years>0&&monthly>=0))return 'Lengkapi target dana, dana awal, horizon, dan setoran bulanan dengan benar.';
    return '';
  }

  function buildPlan(){
    const error=validate();
    if(error){
      const box=$('wmFormError');
      if(box){box.textContent=error;box.hidden=false;}
      return null;
    }
    if($('wmFormError'))$('wmFormError').hidden=true;

    const years=Number($('wmYears').value),targetToday=Number($('wmTarget').value),initial=Number($('wmInitial').value),monthly=Number($('wmMonthly').value);
    const inflation=Number($('wmInflation')?.value||3);
    const principle=$('wmPrinciple')?.value||'any';
    const when=lensLevel([answer('qWhen'),answer('qLiquidity')]);
    const able=lensLevel([answer('qEmergency'),answer('qIncome'),answer('qExposure')]);
    const comfortable=lensLevel([answer('qDrawdown'),answer('qExperience')]);
    const riskLimit=Math.min(when,able,comfortable);
    const styleLevel=Math.max(1,Math.min(5,Math.round((when+able+comfortable)/3)));
    const liq=liquidityNeedFromAnswer(answer('qLiquidity'));
    const allocation=buildAllocation(riskLimit,years,liq);
    const returnRate=expectedPortfolioReturn(allocation);
    const months=Math.max(1,Math.round(years*12));
    const futureTarget=targetToday*Math.pow(1+inflation/100,years);
    const projected=futureValue(initial,monthly,returnRate,months);
    const required=requiredMonthly(futureTarget,initial,returnRate,months);
    const fundingRatio=Math.min(999,(projected/futureTarget)*100);
    const goal=selectedGoalData();
    const hBucket=horizonBucket(years);

    const ranked=products.map(p=>{
      let score=0;
      const riskFit=p.risk<=riskLimit;
      const horizonFit=hBucket>=p.minH;
      const liquidityFit=liq<=2?p.liq>=3:true;
      if(riskFit)score+=4;else score-=6;
      if(horizonFit)score+=3;else score-=4;
      if(liquidityFit)score+=2;else score-=3;
      if(p.goals.includes(goal.goal))score+=2;
      if(p.name==='Saham Langsung'&&riskLimit>=4&&goal.goal==='growth')score+=1;
      return {...p,score,riskFit,horizonFit,liquidityFit,fit:riskFit&&horizonFit&&liquidityFit};
    }).sort((a,b)=>b.score-a.score);
    const fitProducts=ranked.filter(p=>p.fit).slice(0,4);

    let limiter='ketiga aspek relatif seimbang';
    const min=Math.min(when,able,comfortable);
    const lows=[];
    if(when===min)lows.push('waktu & likuiditas');
    if(able===min)lows.push('kemampuan finansial');
    if(comfortable===min)lows.push('kenyamanan terhadap risiko');
    if(lows.length)limiter=lows.join(' dan ');

    const equityWeight=allocation.find(([name])=>name.startsWith('Ekuitas'))?.[1]||0;
    let nextAction='Rencana sudah cukup sehat. Pertahankan disiplin setoran dan review berkala.';
    if(fundingRatio<80)nextAction=`Target belum penuh. Kebutuhan setoran indikatif sekitar ${rupiah(required)} per bulan.`;
    else if(fundingRatio<100)nextAction=`Target hampir tercapai. Naikkan setoran menuju sekitar ${rupiah(required)} per bulan atau tambah horizon.`;
    else if(riskLimit<=2)nextAction='Target terdanai, tetapi batas risiko rendah. Utamakan produk yang sesuai level risiko dan kebutuhan likuiditas.';
    else if(equityWeight>=70)nextAction=`Porsi ekuitas ${equityWeight}% sesuai batas model untuk profil dan horizon ini. Gunakan diversifikasi saham, rebalancing, dan disiplin risiko.`;

    return {
      goal,years,targetToday,initial,monthly,inflation,principle,
      when,able,comfortable,riskLimit,styleLevel,returnRate,futureTarget,projected,required,fundingRatio,
      fitProducts,ranked,limiter,nextAction,allocation,equityWeight
    };
  }

  function productHtml(p,i){
    const principleNote=latestPlan?.principle==='syariah'?' • pilih varian Syariah bila tersedia':'';
    return `<div class="wm-product"><div class="rank">${i+1}</div><div><strong>${esc(p.name)}</strong><p>${esc(p.desc)}${esc(principleNote)}</p></div><span class="fit">SESUAI</span></div>`;
  }

  function render(plan){
    latestPlan=plan;
    document.body.classList.add('wealth-result-ready');
    const goalTitle=$('resultGoalTitle'),goalSub=$('resultGoalSub');
    if(goalTitle)goalTitle.textContent=plan.goal.label;
    if(goalSub)goalSub.textContent=`${plan.goal.sub} • ${plan.years} tahun`;
    $('resultProfile').textContent=profileNames[plan.riskLimit];
    $('resultProfileCopy').textContent=`Batas risiko mengikuti faktor paling rendah: ${plan.limiter}. ${profileCopy[plan.riskLimit]}`;
    $('resultRiskLevel').textContent=String(plan.riskLimit);
    $('resultWhen').textContent=labelLevel(plan.when);
    $('resultAble').textContent=labelLevel(plan.able);
    $('resultComfort').textContent=labelLevel(plan.comfortable);
    $('resultFutureTarget').textContent=rupiah(plan.futureTarget);
    $('resultProjected').textContent=rupiah(plan.projected);
    $('resultRequired').textContent=rupiah(plan.required);
    $('resultFunding').textContent=pct(plan.fundingRatio);
    $('resultAssumption').textContent=`Return ilustratif portofolio ${plan.returnRate}%/tahun • ekuitas ${plan.equityWeight}% • inflasi ${plan.inflation}%/tahun`;
    $('resultProducts').innerHTML=plan.fitProducts.length?plan.fitProducts.map(productHtml).join(''):'<p>Belum ada kelas produk yang lolos seluruh batas. Prioritaskan likuiditas atau tambah horizon.</p>';
    $('resultAllocation').innerHTML=plan.allocation.map(([name,val])=>`<div><span>${esc(name)}</span><b>${val}%</b></div>`).join('');
    $('resultNext').textContent=plan.nextAction;
    $('wealth-result').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function addPdfText(doc,text,x,y,maxWidth,lineHeight=5){
    const lines=doc.splitTextToSize(String(text||''),maxWidth);
    doc.text(lines,x,y);
    return y+lines.length*lineHeight;
  }

  function downloadPdf(){
    const plan=latestPlan||buildPlan();
    if(!plan){return;}
    if(!latestPlan)render(plan);
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF){alert('Generator PDF belum siap. Refresh halaman lalu coba kembali.');return;}
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
    const W=210,M=15,C=W-M*2;
    let y=16;
    doc.setFillColor(18,28,43);doc.roundedRect(M,y,C,30,4,4,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('analisaku.com',M+7,y+9);
    doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(215,224,235);doc.text('WEALTH MANAGEMENT PLAN',M+7,y+15);
    doc.setFontSize(10);doc.setTextColor(230,184,91);doc.text(plan.goal.label,M+7,y+23);
    doc.setTextColor(95,105,120);doc.setFontSize(7);doc.text(new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}),W-M-7,y+9,{align:'right'});
    y+=38;

    doc.setTextColor(30,40,55);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('RINGKASAN SEKALI LIHAT',M,y);
    y+=6;
    const cards=[['Tujuan',`${plan.goal.label} • ${plan.years} th`],['Batas Risiko',`${profileNames[plan.riskLimit]} • L${plan.riskLimit}/5`],['Funding',pct(plan.fundingRatio)],['Kebutuhan/Bulan',rupiah(plan.required)]];
    cards.forEach((c,i)=>{const x=M+(i%2)*(C/2+2),yy=y+Math.floor(i/2)*19,w=C/2-2;doc.setFillColor(246,248,250);doc.roundedRect(x,yy,w,15,2,2,'F');doc.setTextColor(110,120,132);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(c[0],x+4,yy+5);doc.setTextColor(30,40,55);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(String(c[1]),x+4,yy+11);});
    y+=42;

    doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(30,40,55);doc.text('PROFIL RISIKO',M,y);y+=6;
    doc.setFontSize(9);doc.text(`${profileNames[plan.riskLimit]} — batas produk Level ${plan.riskLimit}/5`,M,y);y+=5;
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(95,105,120);y=addPdfText(doc,`KAPAN ${labelLevel(plan.when)} • MAMPU ${labelLevel(plan.able)} • NYAMAN ${labelLevel(plan.comfortable)}. Faktor pembatas: ${plan.limiter}.`,M,y,C,4.5)+2;

    doc.setTextColor(30,40,55);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('PRODUCT FIT',M,y);y+=6;
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(70,80,95);
    (plan.fitProducts.length?plan.fitProducts:[{name:'Tidak ada kelas produk yang lolos seluruh batas.'}]).forEach((p,i)=>{doc.text(`${i+1}. ${p.name}`,M,y);y+=5;});
    y+=2;

    doc.setTextColor(30,40,55);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('FINANCIAL PLAN',M,y);y+=6;
    const fin=[['Target masa depan',rupiah(plan.futureTarget)],['Proyeksi dana',rupiah(plan.projected)],['Funding ratio',pct(plan.fundingRatio)],['Setoran saat ini',rupiah(plan.monthly)],['Kebutuhan / bulan',rupiah(plan.required)],['Asumsi',`${plan.returnRate}% return • ${plan.inflation}% inflasi`]];
    fin.forEach((f,i)=>{const x=M+(i%2)*(C/2+2),yy=y+Math.floor(i/2)*15,w=C/2-2;doc.setDrawColor(225,229,235);doc.roundedRect(x,yy,w,12,2,2,'S');doc.setTextColor(110,120,132);doc.setFontSize(6.5);doc.setFont('helvetica','normal');doc.text(f[0],x+3,yy+4);doc.setTextColor(30,40,55);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text(String(f[1]),x+3,yy+9);});
    y+=48;

    doc.setTextColor(30,40,55);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('MODEL ALOKASI EDUKATIF',M,y);y+=6;
    const colCount=plan.allocation.length;
    plan.allocation.forEach(([name,val],i)=>{const x=M+i*(C/colCount);doc.setTextColor(95,105,120);doc.setFontSize(6.3);doc.setFont('helvetica','normal');doc.text(name,x,y,{maxWidth:(C/colCount)-2});doc.setTextColor(30,40,55);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text(`${val}%`,x,y+8);});
    y+=17;
    doc.setFillColor(252,248,238);doc.roundedRect(M,y,C,20,3,3,'F');doc.setTextColor(173,121,28);doc.setFontSize(7);doc.setFont('helvetica','bold');doc.text('NEXT ACTION',M+5,y+6);doc.setTextColor(60,60,60);doc.setFont('helvetica','normal');doc.setFontSize(8);addPdfText(doc,plan.nextAction,M+5,y+12,C-10,4.3);
    y+=27;
    doc.setTextColor(120,125,135);doc.setFontSize(6.5);doc.setFont('helvetica','normal');addPdfText(doc,'Disclaimer: hasil bersifat ilustratif dan edukatif, bukan rekomendasi personal. Profil risiko resmi, KYC, suitability, dokumen produk, biaya, pajak, dan kondisi aktual tetap perlu dipertimbangkan sebelum transaksi.',M,y,C,3.5);
    doc.save(`Analisaku-Wealth-Plan-${selectedGoal.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function bindGoal(){
    qsa('.goal-card').forEach(card=>card.addEventListener('click',()=>{
      qsa('.goal-card').forEach(x=>x.classList.remove('active'));
      card.classList.add('active');
      selectedGoal=card.dataset.goal||'Custom';
      const meta=selectedGoalData();
      if($('wmYears'))$('wmYears').value=meta.defaultYears;
    }));
  }

  function updateProgress(){
    const links=qsa('.wm-progress a');
    const steps=qsa('.wm-step');
    const y=window.scrollY+150;
    let active=0;
    steps.forEach((s,i)=>{if(s.offsetTop<=y)active=i;});
    links.forEach((a,i)=>a.classList.toggle('active',i===active));
  }

  function bind(){
    bindGoal();
    $('wmBuildPlan')?.addEventListener('click',()=>{const plan=buildPlan();if(plan)render(plan);});
    $('wmDownloadPdf')?.addEventListener('click',downloadPdf);
    $('wmEditPlan')?.addEventListener('click',()=>document.getElementById('wealth-form')?.scrollIntoView({behavior:'smooth'}));
    window.addEventListener('scroll',updateProgress,{passive:true});
    updateProgress();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
