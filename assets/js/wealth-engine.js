/* Analisaku Wealth Management Engine v3 — KAPAN • MAMPU • NYAMAN */
(function(){
  const $=id=>document.getElementById(id);
  const rupiah=value=>'Rp '+Math.round(Number(value)||0).toLocaleString('id-ID');
  const pct=value=>`${Math.max(0,Number(value)||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
  let selectedGoal='Pendidikan';
  let riskState=null;

  const profiles={
    1:{key:'conservative',name:'Konservatif',copy:'Fokus utama menjaga nilai dana dan likuiditas. Fluktuasi perlu dibatasi.'},
    2:{key:'mod-conservative',name:'Moderat Konservatif',copy:'Masih mengutamakan stabilitas, dengan ruang terbatas untuk pertumbuhan.'},
    3:{key:'moderate',name:'Moderat',copy:'Seimbang antara stabilitas dan pertumbuhan dengan volatilitas menengah.'},
    4:{key:'mod-aggressive',name:'Moderat Agresif',copy:'Berorientasi pertumbuhan dan siap menghadapi fluktuasi cukup besar selama horizon memadai.'},
    5:{key:'aggressive',name:'Agresif',copy:'Berorientasi pertumbuhan jangka panjang dan siap menghadapi volatilitas serta drawdown besar.'}
  };

  const allocations={
    conservative:[['Likuid / RDPU',60],['SBN / Pendapatan Tetap',35],['Campuran',5],['Saham',0]],
    'mod-conservative':[['Likuid / RDPU',35],['SBN / Pendapatan Tetap',45],['Campuran',15],['Saham',5]],
    moderate:[['Likuid / RDPU',20],['SBN / Pendapatan Tetap',40],['Campuran',25],['Saham',15]],
    'mod-aggressive':[['Likuid / RDPU',10],['SBN / Pendapatan Tetap',25],['Campuran',25],['Saham',40]],
    aggressive:[['Likuid / RDPU',5],['SBN / Pendapatan Tetap',15],['Campuran',20],['Saham',60]]
  };

  const productUniverse=[
    {name:'Reksa Dana Pasar Uang',risk:1,minH:1,liq:4,goals:['preserve','income','balanced'],desc:'Likuiditas tinggi dan volatilitas relatif rendah. Cocok untuk dana jangka pendek atau kebutuhan kas.'},
    {name:'SBN / Obligasi Berkualitas',risk:2,minH:2,liq:2,goals:['preserve','income','balanced'],desc:'Fokus pendapatan dan stabilitas relatif. Tetap memiliki risiko harga, suku bunga, dan likuiditas.'},
    {name:'Reksa Dana Pendapatan Tetap',risk:2,minH:2,liq:3,goals:['income','balanced'],desc:'Eksposur utama pada surat utang. Umumnya lebih sesuai untuk horizon menengah.'},
    {name:'Reksa Dana Campuran',risk:3,minH:3,liq:3,goals:['balanced','growth'],desc:'Menggabungkan beberapa kelas aset untuk keseimbangan pertumbuhan dan stabilitas.'},
    {name:'Reksa Dana Saham',risk:4,minH:4,liq:3,goals:['growth'],desc:'Berorientasi pertumbuhan jangka panjang dengan volatilitas dan potensi drawdown tinggi.'},
    {name:'Saham',risk:5,minH:4,liq:3,goals:['growth'],desc:'Risiko tinggi dan membutuhkan pemahaman emiten, diversifikasi, serta disiplin pengelolaan risiko.'}
  ];

  document.querySelectorAll('.goal-card').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.goal-card').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      selectedGoal=btn.dataset.goal||'Custom';
      const defaultYears=Number(btn.dataset.defaultYears||0);
      if(defaultYears>0&&$('fpYears'))$('fpYears').value=defaultYears;
      if($('fpGoalName'))$('fpGoalName').textContent=selectedGoal;
    });
  });

  const average=values=>values.reduce((sum,v)=>sum+Number(v||0),0)/values.length;
  function levelFromAverage(value){
    if(value<1.5)return 1;
    if(value<2.2)return 2;
    if(value<2.9)return 3;
    if(value<3.5)return 4;
    return 5;
  }
  function levelTone(level){return level<=2?'LOW':level===3?'BALANCED':'HIGH'}
  function levelCopy(level){
    return ({1:'Sangat terbatas',2:'Terbatas',3:'Seimbang',4:'Cukup tinggi',5:'Tinggi'})[level]||'—';
  }

  function assessRisk(answers){
    const rawScore=Object.values(answers).reduce((sum,v)=>sum+Number(v||0),0);
    const horizonAvg=average([answers.q1,answers.q4,answers.q9]);
    const capacityAvg=average([answers.q5,answers.q6,answers.q7,answers.q9]);
    const toleranceAvg=average([answers.q2,answers.q3,answers.q8]);
    const horizonLevel=levelFromAverage(horizonAvg);
    const capacityLevel=levelFromAverage(capacityAvg);
    const toleranceLevel=levelFromAverage(toleranceAvg);
    const finalLevel=Math.min(horizonLevel,capacityLevel,toleranceLevel);
    const limits=[];
    if(horizonLevel===finalLevel)limits.push('KAPAN');
    if(capacityLevel===finalLevel)limits.push('MAMPU');
    if(toleranceLevel===finalLevel)limits.push('NYAMAN');
    return {
      rawScore,
      finalLevel,
      profile:profiles[finalLevel],
      answers,
      lenses:{
        horizon:{key:'KAPAN',title:'Waktu & Likuiditas',level:horizonLevel,avg:horizonAvg,copy:'Kapan dana dipakai dan seberapa cepat harus bisa dicairkan.'},
        capacity:{key:'MAMPU',title:'Kemampuan Finansial',level:capacityLevel,avg:capacityAvg,copy:'Dana darurat, kestabilan arus kas, dan porsi aset yang berisiko.'},
        tolerance:{key:'NYAMAN',title:'Kenyamanan Risiko',level:toleranceLevel,avg:toleranceAvg,copy:'Respons terhadap penurunan, tujuan, dan pengalaman investasi.'}
      },
      limitingFactors:limits
    };
  }

  function renderRiskResult(answers){
    riskState=assessRisk(answers);
    const {profile,finalLevel,rawScore,lenses,limitingFactors}=riskState;
    const allocation=(allocations[profile.key]||[]).map(([name,value])=>`
      <div class="allocation-card"><small>${name}</small><b>${value}%</b><div class="allocation-bar"><span style="width:${value}%"></span></div></div>`).join('');

    const lensCards=Object.values(lenses).map(lens=>`
      <div class="risk-lens-card" data-lens="${lens.key}" data-tone="${levelTone(lens.level)}">
        <div class="risk-lens-top"><span>${lens.key}</span><b>Level ${lens.level}/5</b></div>
        <strong>${lens.title}</strong>
        <small>${levelCopy(lens.level)}</small>
        <p>${lens.copy}</p>
      </div>`).join('');

    const aligned=lenses.horizon.level===lenses.capacity.level&&lenses.capacity.level===lenses.tolerance.level;
    const quick=aligned
      ?`Ketiga sisi relatif selaras. Batas risiko produk indikatif Anda berada di Level ${finalLevel}/5.`
      :`Batas risiko mengikuti sisi yang paling membatasi: ${limitingFactors.join(' + ')}. Karena itu produk di atas Level ${finalLevel}/5 perlu dievaluasi lebih hati-hati.`;

    $('riskResult').innerHTML=`
      <div class="risk-score risk-score-v3">
        <div><small>HASIL SEKILAS</small><h3>${profile.name}</h3><p>${profile.copy}</p></div>
        <div class="risk-limit-badge"><small>BATAS PRODUK</small><b>Level ${finalLevel}</b><span>/ 5</span></div>
      </div>
      <div class="risk-one-line"><b>${quick}</b><span>Skor jawaban ${rawScore}/36 digunakan sebagai informasi pendukung, bukan satu-satunya penentu.</span></div>
      <div class="risk-lens-grid">${lensCards}</div>
      <div class="risk-dimensions" hidden>
        <div><small>KAPAN</small><b>Level ${lenses.horizon.level}/5</b></div>
        <div><small>MAMPU</small><b>Level ${lenses.capacity.level}/5</b></div>
        <div><small>NYAMAN</small><b>Level ${lenses.tolerance.level}/5</b></div>
        <div><small>Batas Risiko Produk</small><b>Level ${finalLevel}/5</b></div>
      </div>
      <div class="allocation-head"><div><small>MODEL ALOKASI EDUKATIF</small><strong>Contoh komposisi untuk profil ${profile.name}</strong></div><span>Bukan rekomendasi personal</span></div>
      <div class="allocation-grid">${allocation}</div>`;

    window.dispatchEvent(new CustomEvent('analisaku:wealth-risk',{detail:riskState}));
  }

  $('riskForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const answers={};
    for(let i=1;i<=9;i++){
      const checked=document.querySelector(`input[name="q${i}"]:checked`);
      if(!checked){
        $('riskResult').innerHTML='<small>HASIL ANALISIS</small><h3>Belum lengkap</h3><p>Jawab seluruh 9 pertanyaan agar KAPAN, MAMPU, dan NYAMAN dapat dibandingkan dengan benar.</p>';
        document.querySelector(`[data-q="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      answers[`q${i}`]=Number(checked.value);
    }
    renderRiskResult(answers);
    if($('fitHorizon'))$('fitHorizon').value=String(answers.q1);
    if($('fitLiquidity'))$('fitLiquidity').value=String(answers.q4);
  });

  function renderProductFit(){
    const riskLevel=riskState?.finalLevel||2;
    const horizon=Number($('fitHorizon')?.value||1);
    const liquidity=Number($('fitLiquidity')?.value||1);
    const goal=$('fitGoal')?.value||'preserve';
    const principle=$('fitPrinciple')?.value||'any';

    const ranked=productUniverse.map(product=>{
      let score=0;
      const riskFit=product.risk<=riskLevel;
      const horizonFit=horizon>=product.minH;
      const liquidityFit=liquidity<=2?product.liq>=3:true;
      const goalFit=product.goals.includes(goal);
      if(riskFit)score+=4;else score-=6;
      if(horizonFit)score+=3;else score-=4;
      if(liquidityFit)score+=2;else score-=3;
      if(goalFit)score+=2;
      return {...product,score,riskFit,horizonFit,liquidityFit,goalFit};
    }).sort((a,b)=>b.score-a.score);

    const fits=ranked.filter(p=>p.riskFit&&p.horizonFit&&p.liquidityFit);
    const quick=fits.slice(0,3).map(p=>p.name).join(' • ')||'Belum ada kelas produk yang lolos seluruh filter.';
    $('fitResults').innerHTML=`
      <div class="fit-quick-summary"><small>RINGKASAN SEKILAS</small><strong>${fits.length} kelas produk lolos filter</strong><p>${quick}</p><span>Batas risiko saat ini: Level ${riskLevel}/5</span></div>
      ${ranked.map((p,index)=>{
        const fit=p.riskFit&&p.horizonFit&&p.liquidityFit;
        const status=fit?'COCOK':'EVALUASI DULU';
        const reason=[];
        if(!p.riskFit)reason.push('risiko produk melewati batas profil');
        if(!p.horizonFit)reason.push('horizon terlalu pendek');
        if(!p.liquidityFit)reason.push('kebutuhan likuiditas belum cocok');
        if(!p.goalFit)reason.push('bukan prioritas utama untuk tujuan ini');
        if(principle==='syariah')reason.push('gunakan varian Syariah bila tersedia');
        return `<article class="product-card ${fit?'is-fit':'is-limit'}"><div class="product-rank">${String(index+1).padStart(2,'0')}</div><div><small>RISK LEVEL ${p.risk}/5</small><strong>${p.name}</strong><p>${p.desc}${reason.length?' Catatan: '+reason.join(', ')+'.':''}</p></div><span class="fit-badge">${status}</span></article>`;
      }).join('')}`;
    window.dispatchEvent(new CustomEvent('analisaku:wealth-fit'));
  }

  $('fitButton')?.addEventListener('click',renderProductFit);

  function futureValueSeries(initial,monthly,annualRate,months,timing){
    const r=Math.pow(1+annualRate/100,1/12)-1;
    const result=[initial];
    let balance=initial;
    for(let m=1;m<=months;m++){
      if(timing==='begin')balance+=monthly;
      balance*=1+r;
      if(timing==='end')balance+=monthly;
      result.push(balance);
    }
    return {values:result,final:balance,monthlyRate:r};
  }

  function requiredMonthly(target,initial,annualRate,months,timing){
    const r=Math.pow(1+annualRate/100,1/12)-1;
    const growth=Math.pow(1+r,months);
    const futureInitial=initial*growth;
    if(futureInitial>=target)return 0;
    if(Math.abs(r)<1e-12)return (target-initial)/months;
    const factor=((growth-1)/r)*(timing==='begin'?(1+r):1);
    return Math.max(0,(target-futureInitial)/factor);
  }

  function drawChart(values,target){
    const canvas=$('fpChart');
    if(!canvas)return;
    const dpr=window.devicePixelRatio||1;
    const cssW=canvas.clientWidth||760,cssH=canvas.clientHeight||250;
    canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    const w=cssW,h=cssH,pad={l:44,r:14,t:18,b:28};
    const max=Math.max(target,...values,1)*1.08;
    ctx.clearRect(0,0,w,h);
    const styles=getComputedStyle(document.documentElement);
    const line=styles.getPropertyValue('--line').trim()||'rgba(120,120,120,.25)';
    const text=styles.getPropertyValue('--muted2').trim()||'#8894a4';
    const gold=styles.getPropertyValue('--gold').trim()||'#d6a84b';
    ctx.strokeStyle=line;ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad.t+(h-pad.t-pad.b)*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();}
    ctx.fillStyle=text;ctx.font='10px system-ui';ctx.textAlign='right';ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){const value=max*(1-i/4);const y=pad.t+(h-pad.t-pad.b)*i/4;ctx.fillText((value/1e6).toFixed(value>=1e9?0:1)+' jt',pad.l-6,y);}
    ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();
    values.forEach((v,i)=>{const x=pad.l+(w-pad.l-pad.r)*(i/(values.length-1||1));const y=pad.t+(h-pad.t-pad.b)*(1-v/max);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
    const ty=pad.t+(h-pad.t-pad.b)*(1-target/max);ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle=text;ctx.beginPath();ctx.moveTo(pad.l,ty);ctx.lineTo(w-pad.r,ty);ctx.stroke();ctx.restore();
    ctx.fillStyle=text;ctx.textAlign='center';ctx.textBaseline='top';
    ['0','25%','50%','75%','100%'].forEach((label,i)=>{const x=pad.l+(w-pad.l-pad.r)*i/4;ctx.fillText(label,x,h-pad.b+8);});
  }

  function calculateFinancialPlan(){
    const target=Number($('fpTarget')?.value||0);
    const initial=Number($('fpInitial')?.value||0);
    const years=Number($('fpYears')?.value||0);
    const annualReturn=Number($('fpReturn')?.value||0);
    const inflation=Number($('fpInflation')?.value||0);
    const monthly=Number($('fpMonthly')?.value||0);
    const timing=$('fpTiming')?.value||'end';
    if(!(target>0&&years>0&&initial>=0&&Number.isFinite(annualReturn)&&Number.isFinite(inflation)&&monthly>=0))return;

    const months=Math.max(1,Math.round(years*12));
    const futureTarget=target*Math.pow(1+inflation/100,years);
    const series=futureValueSeries(initial,monthly,annualReturn,months,timing);
    const required=requiredMonthly(futureTarget,initial,annualReturn,months,timing);
    const ratio=Math.min(999,series.final/futureTarget*100);

    $('fpFutureTarget').textContent=rupiah(futureTarget);
    $('fpProjected').textContent=rupiah(series.final);
    $('fpRequired').textContent=rupiah(required);
    $('fpFundingRatio').textContent=pct(ratio);
    $('fpBar').style.width=Math.min(100,ratio)+'%';
    $('fpGoalName').textContent=selectedGoal;

    const gap=futureTarget-series.final;
    $('fpNote').textContent=gap<=0
      ?`TARGET ON TRACK — proyeksi melewati target sekitar ${rupiah(Math.abs(gap))}. Tetap gunakan asumsi return konservatif.`
      :`MASIH ADA GAP — sekitar ${rupiah(gap)}. Dengan asumsi yang sama, kebutuhan setoran bulanan diperkirakan ${rupiah(required)}.`;
    drawChart(series.values,futureTarget);
    window.dispatchEvent(new CustomEvent('analisaku:wealth-finance'));
  }

  $('fpCalculate')?.addEventListener('click',calculateFinancialPlan);
  window.addEventListener('resize',()=>{if($('fpProjected')?.textContent!=='—')calculateFinancialPlan();});
  calculateFinancialPlan();

  window.AnalisakuWealth={
    getRiskState:()=>riskState,
    calculateFinancialPlan
  };
})();
