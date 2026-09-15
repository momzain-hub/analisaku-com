/* Analisaku Wealth Management Engine */
(function(){
  const $=id=>document.getElementById(id);
  const rupiah=value=>'Rp '+Math.round(Number(value)||0).toLocaleString('id-ID');
  const pct=value=>`${Math.max(0,Number(value)||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
  let selectedGoal='Pendidikan';
  let riskState=null;

  const riskProfiles=[
    {min:9,max:15,key:'conservative',name:'Konservatif',level:1,copy:'Prioritas utama adalah menjaga nilai dana, likuiditas, dan membatasi fluktuasi.'},
    {min:16,max:21,key:'mod-conservative',name:'Moderat Konservatif',level:2,copy:'Masih mengutamakan stabilitas, tetapi dapat menerima fluktuasi terbatas untuk peluang hasil lebih tinggi.'},
    {min:22,max:27,key:'moderate',name:'Moderat',level:3,copy:'Menerima kombinasi stabilitas dan pertumbuhan dengan volatilitas menengah.'},
    {min:28,max:32,key:'growth',name:'Growth',level:4,copy:'Berorientasi pertumbuhan dan mampu menerima fluktuasi yang lebih besar selama horizon memadai.'},
    {min:33,max:36,key:'aggressive',name:'Agresif',level:5,copy:'Memiliki toleransi dan kapasitas risiko tinggi untuk tujuan jangka panjang, dengan kesiapan menghadapi drawdown besar.'}
  ];

  const allocations={
    conservative:[['Likuid / RDPU',50],['Pendapatan Tetap',40],['Campuran',10],['Saham',0]],
    'mod-conservative':[['Likuid / RDPU',30],['Pendapatan Tetap',45],['Campuran',20],['Saham',5]],
    moderate:[['Likuid / RDPU',15],['Pendapatan Tetap',35],['Campuran',30],['Saham',20]],
    growth:[['Likuid / RDPU',10],['Pendapatan Tetap',25],['Campuran',25],['Saham',40]],
    aggressive:[['Likuid / RDPU',5],['Pendapatan Tetap',15],['Campuran',20],['Saham',60]]
  };

  const productUniverse=[
    {name:'Reksa Dana Pasar Uang',risk:1,minH:1,liq:4,goals:['preserve','income','balanced'],desc:'Fokus likuiditas dan volatilitas relatif rendah. Umumnya lebih sesuai untuk horizon pendek atau dana parkir.'},
    {name:'SBN / Obligasi Berkualitas',risk:2,minH:2,liq:2,goals:['preserve','income','balanced'],desc:'Berorientasi pendapatan dan stabilitas relatif, tetap memiliki risiko harga, suku bunga, dan likuiditas.'},
    {name:'Reksa Dana Pendapatan Tetap',risk:2,minH:2,liq:3,goals:['income','balanced'],desc:'Eksposur utama pada surat utang. Cocok dipertimbangkan untuk horizon menengah dengan toleransi fluktuasi terbatas.'},
    {name:'Reksa Dana Campuran',risk:3,minH:3,liq:3,goals:['balanced','growth'],desc:'Menggabungkan beberapa kelas aset. Risiko dan komposisi dapat berbeda antarproduk.'},
    {name:'Reksa Dana Saham',risk:4,minH:4,liq:3,goals:['growth'],desc:'Berorientasi pertumbuhan jangka panjang dengan volatilitas tinggi dan potensi drawdown yang besar.'},
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

  function profileFor(score){
    return riskProfiles.find(p=>score>=p.min&&score<=p.max)||riskProfiles[0];
  }

  function dimensionLabel(score,max){
    const ratio=score/max;
    if(ratio>=.8)return'Tinggi';
    if(ratio>=.6)return'Menengah-Tinggi';
    if(ratio>=.4)return'Menengah';
    return'Rendah';
  }

  function renderRiskResult(score,answers){
    const profile=profileFor(score);
    const tolerance=(Number(answers.q2)+Number(answers.q3)+Number(answers.q8))/12;
    const capacity=(Number(answers.q5)+Number(answers.q6)+Number(answers.q7)+Number(answers.q9))/16;
    const horizon=(Number(answers.q1)+Number(answers.q4))/8;
    riskState={score,profile,answers,tolerance,capacity,horizon};

    const allocation=(allocations[profile.key]||[]).map(([name,value])=>`
      <div class="allocation-card"><small>${name}</small><b>${value}%</b><div class="allocation-bar"><span style="width:${value}%"></span></div></div>`).join('');

    $('riskResult').innerHTML=`
      <div class="risk-score"><div><small>PROFIL RISIKO INDIKATIF</small><h3>${profile.name}</h3></div><div><b>${score}</b><span>/ 36</span></div></div>
      <p>${profile.copy}</p>
      <div class="risk-dimensions">
        <div><small>Risk Tolerance</small><b>${dimensionLabel(tolerance,1)}</b></div>
        <div><small>Capacity for Loss</small><b>${dimensionLabel(capacity,1)}</b></div>
        <div><small>Horizon / Liquidity</small><b>${dimensionLabel(horizon,1)}</b></div>
        <div><small>Product Risk Limit</small><b>Level ${profile.level} / 5</b></div>
      </div>
      <small>MODEL ALOKASI EDUKATIF</small>
      <div class="allocation-grid">${allocation}</div>
      <p style="margin-top:12px">Model alokasi bukan rekomendasi personal dan tidak mempertimbangkan seluruh kondisi keuangan, pajak, kewajiban, atau portofolio yang sudah dimiliki.</p>`;
  }

  $('riskForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const answers={};
    let score=0;
    for(let i=1;i<=9;i++){
      const checked=document.querySelector(`input[name="q${i}"]:checked`);
      if(!checked){
        $('riskResult').innerHTML='<small>HASIL ANALISIS</small><h3>Belum lengkap</h3><p>Mohon jawab seluruh 9 pertanyaan agar hasil tidak bias.</p>';
        document.querySelector(`[data-q="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      answers[`q${i}`]=Number(checked.value);
      score+=Number(checked.value);
    }
    renderRiskResult(score,answers);
    if($('fitHorizon'))$('fitHorizon').value=String(answers.q1);
    if($('fitLiquidity'))$('fitLiquidity').value=String(answers.q4);
  });

  function renderProductFit(){
    const riskLevel=riskState?.profile?.level||2;
    const horizon=Number($('fitHorizon')?.value||1);
    const liquidity=Number($('fitLiquidity')?.value||1);
    const goal=$('fitGoal')?.value||'preserve';
    const principle=$('fitPrinciple')?.value||'any';

    const ranked=productUniverse.map(product=>{
      let score=0;
      const riskFit=product.risk<=riskLevel;
      const horizonFit=horizon>=product.minH;
      const liquidityFit=liquidity<=2?product.liq>=3:true;
      if(riskFit)score+=3;else score-=4;
      if(horizonFit)score+=3;else score-=3;
      if(liquidityFit)score+=2;else score-=2;
      if(product.goals.includes(goal))score+=2;
      return {...product,score,riskFit,horizonFit,liquidityFit};
    }).sort((a,b)=>b.score-a.score);

    $('fitResults').innerHTML=ranked.map(p=>{
      const fit=p.riskFit&&p.horizonFit&&p.liquidityFit;
      const status=fit?'LAYAK DIPERTIMBANGKAN':'PERLU EVALUASI';
      let reason=[];
      if(!p.riskFit)reason.push('risiko produk di atas profil indikatif');
      if(!p.horizonFit)reason.push('horizon terlalu pendek');
      if(!p.liquidityFit)reason.push('likuiditas kurang sesuai');
      if(principle==='syariah')reason.push('pilih varian Syariah bila tersedia');
      return `<article class="product-card ${fit?'is-fit':'is-limit'}"><div><small>RISK LEVEL ${p.risk}/5</small><strong>${p.name}</strong><p>${p.desc}${reason.length?' Catatan: '+reason.join(', ')+'.':''}</p></div><span class="fit-badge">${status}</span></article>`;
    }).join('');
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
      ?`Dengan asumsi yang dipilih, proyeksi melewati target sekitar ${rupiah(Math.abs(gap))}. Tetap gunakan asumsi return konservatif.`
      :`Masih ada gap sekitar ${rupiah(gap)}. Untuk mengejar target dengan asumsi yang sama, kebutuhan setoran bulanan diperkirakan ${rupiah(required)}.`;
    drawChart(series.values,futureTarget);
  }

  $('fpCalculate')?.addEventListener('click',calculateFinancialPlan);
  window.addEventListener('resize',()=>{if($('fpProjected')?.textContent!=='—')calculateFinancialPlan();});
  calculateFinancialPlan();
})();
