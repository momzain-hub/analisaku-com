/* Wealth v7 — per-asset market value + yearly breakdown */
(function(){
  const $=id=>document.getElementById(id);
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=v=>`${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
  const signedRp=v=>`${Number(v)>=0?'+':'-'}${rupiah(Math.abs(Number(v)||0))}`;
  const signedPp=v=>`${Number(v)>=0?'+':''}${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:2})} pp`;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const defaults={
    'Likuid / RDPU':5,
    'Obligasi / RDPT':6.5,
    'Campuran':8,
    'Ekuitas (Saham / RD Saham)':10
  };
  const returnInputs={
    'Likuid / RDPU':'wmReturnCash',
    'Obligasi / RDPT':'wmReturnBond',
    'Campuran':'wmReturnBalanced',
    'Ekuitas (Saham / RD Saham)':'wmReturnEquity'
  };
  const shortName={
    'Likuid / RDPU':'RDPU',
    'Obligasi / RDPT':'Obligasi / RDPT',
    'Campuran':'Campuran',
    'Ekuitas (Saham / RD Saham)':'Saham / Ekuitas'
  };

  function parseNumber(text){
    const n=Number(String(text||'').replace(/[^0-9,.-]/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }

  function readAllocation(){
    const root=$('resultAllocation');
    if(!root)return [];
    return [...root.children].map(item=>{
      const name=item.querySelector('span')?.textContent?.trim()||'';
      const weight=parseNumber(item.querySelector('b')?.textContent);
      return [name,weight];
    }).filter(([name,weight])=>name&&weight>0);
  }

  function readReturns(){
    const custom=Boolean($('wmUseCustomReturns')?.checked);
    const values={};
    Object.entries(defaults).forEach(([name,def])=>{
      const n=Number($(returnInputs[name])?.value);
      values[name]=custom&&Number.isFinite(n)?n:def;
    });
    return {custom,values};
  }

  function futureValue(initial,monthly,annualRate,months){
    const safeRate=Math.max(-99.9,Number(annualRate)||0);
    const r=Math.pow(1+safeRate/100,1/12)-1;
    const growth=Math.pow(1+r,months);
    if(Math.abs(r)<1e-12)return initial+(monthly*months);
    return (initial*growth)+(monthly*((growth-1)/r));
  }

  function snapshot(allocation,returns,initial,monthly,months){
    const assets=allocation.map(([name,weight])=>{
      const rate=Number(returns[name]??0);
      const assetInitial=initial*weight/100;
      const assetMonthly=monthly*weight/100;
      const invested=assetInitial+(assetMonthly*months);
      const marketValue=futureValue(assetInitial,assetMonthly,rate,months);
      const estimatedReturn=marketValue-invested;
      return {
        name,weight,rate,assetInitial,assetMonthly,invested,marketValue,estimatedReturn,
        returnContribution:(weight/100)*rate
      };
    });
    const totalInvested=assets.reduce((s,a)=>s+a.invested,0);
    const totalMarket=assets.reduce((s,a)=>s+a.marketValue,0);
    const totalReturn=totalMarket-totalInvested;
    const weightedReturn=assets.reduce((s,a)=>s+a.returnContribution,0);
    assets.forEach(a=>{a.growthShare=Math.abs(totalReturn)>1e-9?(a.estimatedReturn/totalReturn)*100:null;});
    return {assets,totalInvested,totalMarket,totalReturn,weightedReturn};
  }

  function buildTimeline(allocation,returns,initial,monthly,totalMonths){
    const points=[];
    for(let m=12;m<totalMonths;m+=12){
      points.push({months:m,label:`Tahun ${m/12}`,...snapshot(allocation,returns,initial,monthly,m)});
    }
    const finalYears=totalMonths/12;
    let label;
    if(totalMonths%12===0)label=`Tahun ${finalYears}`;
    else if(totalMonths<12)label=`Akhir (${totalMonths} bulan)`;
    else label=`Akhir (${finalYears.toLocaleString('id-ID',{maximumFractionDigits:1})} tahun)`;
    points.push({months:totalMonths,label,...snapshot(allocation,returns,initial,monthly,totalMonths),final:true});
    return points;
  }

  function assetCardHtml(asset){
    const share=asset.growthShare===null?'—':pct(asset.growthShare);
    const growthClass=asset.estimatedReturn>=0?'positive':'negative';
    return `<article class="wm-fv-asset-card">
      <div class="wm-fv-asset-head">
        <div><small>INSTRUMEN</small><strong>${esc(asset.name)}</strong></div>
        <span>${asset.weight}%</span>
      </div>
      <div class="wm-fv-asset-rate"><span>Asumsi return / tahun</span><b>${pct(asset.rate)}</b></div>
      <div class="wm-fv-asset-metrics">
        <div><small>DANA DISETOR</small><b>${rupiah(asset.invested)}</b></div>
        <div><small>ESTIMASI RETURN</small><b class="${growthClass}">${signedRp(asset.estimatedReturn)}</b></div>
        <div class="market"><small>NILAI PASAR PROYEKSI</small><b>${rupiah(asset.marketValue)}</b></div>
      </div>
      <div class="wm-fv-asset-foot">
        <span>Kontribusi ke return portofolio <b>${signedPp(asset.returnContribution)}</b></span>
        <span>Kontribusi ke pertumbuhan rupiah <b>${share}</b></span>
      </div>
    </article>`;
  }

  function yearlyMobileCardsHtml(timeline){
    return `<div class="wm-yearly-cards">${timeline.map(point=>`
      <article class="wm-year-card ${point.final?'final':''}">
        <div class="wm-year-card-head"><div><small>${point.final?'PERIODE AKHIR':'PROYEKSI TAHUNAN'}</small><strong>${esc(point.label)}</strong></div><b>${rupiah(point.totalMarket)}</b></div>
        <div class="wm-year-card-summary">
          <div><small>DANA DISETOR</small><b>${rupiah(point.totalInvested)}</b></div>
          <div><small>EST. RETURN</small><b class="${point.totalReturn>=0?'positive':'negative'}">${signedRp(point.totalReturn)}</b></div>
          <div><small>NILAI PASAR</small><b>${rupiah(point.totalMarket)}</b></div>
        </div>
        <div class="wm-year-assets">${point.assets.map(a=>`<div><span>${esc(shortName[a.name]||a.name)}</span><b>${rupiah(a.marketValue)}</b><small>${signedRp(a.estimatedReturn)} return</small></div>`).join('')}</div>
      </article>`).join('')}</div>`;
  }

  function yearlyTableHtml(timeline,assets){
    const assetHeads=assets.map(a=>`<th>${esc(shortName[a.name]||a.name)}</th>`).join('');
    const rows=timeline.map(point=>{
      const assetCells=point.assets.map(a=>`<td><b>${rupiah(a.marketValue)}</b><small>${signedRp(a.estimatedReturn)} return</small></td>`).join('');
      return `<tr class="${point.final?'final':''}">
        <td><b>${esc(point.label)}</b>${point.final?'<small>Periode akhir</small>':''}</td>
        <td>${rupiah(point.totalInvested)}</td>
        <td class="${point.totalReturn>=0?'positive':'negative'}"><b>${signedRp(point.totalReturn)}</b></td>
        <td class="market-value"><b>${rupiah(point.totalMarket)}</b></td>
        ${assetCells}
      </tr>`;
    }).join('');
    return `<section class="wm-yearly-section">
      <div class="wm-yearly-head">
        <div><small>RINCIAN TAHUNAN</small><h3>Dari tahun pertama sampai akhir.</h3><p>Nilai pasar proyeksi diperbarui setiap tahun berdasarkan setoran kumulatif dan return masing-masing instrumen.</p></div>
      </div>
      <div class="wm-yearly-table-wrap">
        <table class="wm-yearly-table">
          <thead><tr><th>PERIODE</th><th>DANA DISETOR</th><th>EST. RETURN</th><th>NILAI PASAR</th>${assetHeads}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${yearlyMobileCardsHtml(timeline)}
      <div class="wm-fv-note"><b>Catatan:</b> angka “Nilai Pasar” adalah nilai proyeksi berdasarkan asumsi return yang dipilih, bukan harga pasar aktual atau jaminan hasil investasi.</div>
    </section>`;
  }

  function renderEnhancedBreakdown(){
    const panel=$('wmFutureValue');
    if(!panel)return;
    const allocation=readAllocation();
    if(!allocation.length)return;
    const initial=Number($('wmInitial')?.value||0);
    const monthly=Number($('wmMonthly')?.value||0);
    const years=Number($('wmYears')?.value||0);
    const months=Math.max(1,Math.round(years*12));
    const returnSet=readReturns();
    const final=snapshot(allocation,returnSet.values,initial,monthly,months);
    const timeline=buildTimeline(allocation,returnSet.values,initial,monthly,months);
    const mode=returnSet.custom?'RETURN CUSTOM':'ASUMSI STANDAR';

    panel.innerHTML=`
      <div class="wm-fv-head">
        <div><small>FUTURE VALUE & NILAI PASAR PER INSTRUMEN</small><h3>Dana disetor, return, dan nilai pasar terlihat terpisah.</h3><p>Setiap instrumen dihitung sendiri. Dengan begitu terlihat berapa modal yang masuk, berapa estimasi return yang terbentuk, dan berapa nilai pasar proyeksinya pada akhir periode.</p></div>
        <span class="wm-fv-mode">${mode}</span>
      </div>
      <div class="wm-fv-summary">
        <div><small>TOTAL DANA DISETOR</small><b>${rupiah(final.totalInvested)}</b><span>Modal awal + setoran bulanan</span></div>
        <div><small>ESTIMASI RETURN TOTAL</small><b class="${final.totalReturn>=0?'positive':'negative'}">${signedRp(final.totalReturn)}</b><span>Nilai pasar dikurangi dana disetor</span></div>
        <div><small>NILAI PASAR PROYEKSI</small><b>${rupiah(final.totalMarket)}</b><span>Akhir ${years.toLocaleString('id-ID',{maximumFractionDigits:1})} tahun</span></div>
        <div><small>WEIGHTED AVG RETURN</small><b>${pct(final.weightedReturn)}</b><span>Σ bobot × return aset</span></div>
      </div>
      <div class="wm-fv-assets">${final.assets.map(assetCardHtml).join('')}</div>
      <div class="wm-fv-note"><b>Cara baca:</b> “Estimasi Return” adalah keuntungan/kerugian rupiah dari instrumen tersebut. “Nilai Pasar Proyeksi” = dana yang telah disetor + estimasi return. Kontribusi return menunjukkan dampak asumsi return aset terhadap expected return portofolio.</div>
      ${yearlyTableHtml(timeline,final.assets)}`;
  }

  function bind(){
    const build=$('wmBuildPlan');
    if(build)build.addEventListener('click',()=>setTimeout(renderEnhancedBreakdown,0));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
