/* Wealth v1.9.2.9 — force Equity Sleeve selections into visible portfolio projections */
(function(){
  const VERSION='1.9.2.9';
  const $=id=>document.getElementById(id);
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=(v,d=1)=>`${Number(v||0).toLocaleString('id-ID',{minimumFractionDigits:0,maximumFractionDigits:d})}%`;
  const signedPct=(v,d=2)=>`${Number(v)>=0?'+':''}${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:d})}%`;
  const signedRp=v=>`${Number(v)>=0?'+':'-'}${rupiah(Math.abs(Number(v)||0))}`;
  const signedPp=v=>`${Number(v)>=0?'+':''}${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:2})} pp`;

  const ASSET_NAMES={
    cash:'Likuid / RDPU',
    bond:'Obligasi / RDPT',
    mixed:'Campuran',
    equity:'Ekuitas (Saham / RD Saham)'
  };
  const DEFAULT_RETURNS={
    [ASSET_NAMES.cash]:5,
    [ASSET_NAMES.bond]:6.5,
    [ASSET_NAMES.mixed]:8,
    [ASSET_NAMES.equity]:10
  };

  function parseNumber(text){
    const n=Number(String(text||'').replace(/[^0-9,.-]/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }
  function allocation(){
    const root=$('resultAllocation');
    if(!root)return [];
    return [...root.children].map(el=>[
      el.querySelector('span')?.textContent?.trim()||'',
      parseNumber(el.querySelector('b')?.textContent||'0')
    ]).filter(([name,weight])=>name&&weight>0);
  }
  function equityReturn(){
    const api=window.ANALISAKU_EQUITY_SLEEVE_API;
    const n=Number(api?.getEquityReturn?.());
    return Number.isFinite(n)&&n>-99?n:DEFAULT_RETURNS[ASSET_NAMES.equity];
  }
  function returns(){
    const custom=Boolean($('wmUseCustomReturns')?.checked);
    const ids={
      [ASSET_NAMES.cash]:'wmReturnCash',
      [ASSET_NAMES.bond]:'wmReturnBond',
      [ASSET_NAMES.mixed]:'wmReturnBalanced'
    };
    const out={};
    Object.entries(ids).forEach(([name,id])=>{
      const n=Number($(id)?.value);
      out[name]=custom&&Number.isFinite(n)?n:DEFAULT_RETURNS[name];
    });
    out[ASSET_NAMES.equity]=equityReturn();
    return out;
  }
  function futureValue(initial,monthly,annualRate,months){
    const safe=Math.max(-99.9,Number(annualRate)||0);
    const r=Math.pow(1+safe/100,1/12)-1;
    const g=Math.pow(1+r,months);
    if(Math.abs(r)<1e-12)return initial+monthly*months;
    return initial*g+monthly*((g-1)/r);
  }
  function snapshot(alloc,rates,initial,monthly,months){
    const assets=alloc.map(([name,weight])=>{
      const rate=Number(rates[name]??0);
      const assetInitial=initial*weight/100;
      const assetMonthly=monthly*weight/100;
      const invested=assetInitial+assetMonthly*months;
      const marketValue=futureValue(assetInitial,assetMonthly,rate,months);
      const estimatedReturn=marketValue-invested;
      const effectiveReturn=invested?estimatedReturn/invested*100:0;
      return {name,weight,rate,invested,marketValue,estimatedReturn,effectiveReturn,returnContribution:weight/100*rate};
    });
    const totalInvested=assets.reduce((s,a)=>s+a.invested,0);
    const totalMarket=assets.reduce((s,a)=>s+a.marketValue,0);
    const totalReturn=totalMarket-totalInvested;
    const totalReturnPct=totalInvested?totalReturn/totalInvested*100:0;
    const weightedReturn=assets.reduce((s,a)=>s+a.returnContribution,0);
    assets.forEach(a=>a.growthShare=Math.abs(totalReturn)>1e-9?a.estimatedReturn/totalReturn*100:null);
    return {assets,totalInvested,totalMarket,totalReturn,totalReturnPct,weightedReturn};
  }
  function requiredMonthly(target,initial,alloc,rates,months){
    const fvInitial=alloc.reduce((s,[name,w])=>s+futureValue(initial*w/100,0,rates[name]??0,months),0);
    if(fvInitial>=target)return 0;
    const factor=alloc.reduce((s,[name,w])=>s+futureValue(0,w/100,rates[name]??0,months),0);
    return factor>0?Math.max(0,(target-fvInitial)/factor):0;
  }
  function findAssetCard(name){
    return [...document.querySelectorAll('.wm-fv-asset-card')].find(card=>
      (card.querySelector('.wm-fv-asset-head strong')?.textContent||'').trim()===name
    );
  }
  function patchAssetCard(asset){
    const card=findAssetCard(asset.name);
    if(!card)return;
    const rate=card.querySelector('.wm-fv-asset-rate b');
    if(rate)rate.textContent=pct(asset.rate,2);
    const metrics=[...card.querySelectorAll('.wm-fv-asset-metrics > div')];
    if(metrics[0]?.querySelector('b'))metrics[0].querySelector('b').textContent=rupiah(asset.invested);
    if(metrics[1]){
      const b=metrics[1].querySelector('b');
      const em=metrics[1].querySelector('em');
      if(b)b.textContent=signedRp(asset.estimatedReturn);
      if(em)em.textContent=`${signedPct(asset.effectiveReturn)} dari dana disetor`;
    }
    if(metrics[2]?.querySelector('b'))metrics[2].querySelector('b').textContent=rupiah(asset.marketValue);
    const foot=[...card.querySelectorAll('.wm-fv-asset-foot span b')];
    if(foot[0])foot[0].textContent=signedPp(asset.returnContribution);
    if(foot[1])foot[1].textContent=asset.growthShare==null?'—':pct(asset.growthShare,1);
  }
  function patchSummary(final){
    const items=[...document.querySelectorAll('#wmFutureValue .wm-fv-summary > div')];
    if(items[0]?.querySelector('b'))items[0].querySelector('b').textContent=rupiah(final.totalInvested);
    if(items[1]){
      const b=items[1].querySelector('b'); const s=items[1].querySelector('span');
      if(b)b.textContent=signedRp(final.totalReturn);
      if(s)s.textContent=`${signedPct(final.totalReturnPct)} dari dana disetor`;
    }
    if(items[2]?.querySelector('b'))items[2].querySelector('b').textContent=rupiah(final.totalMarket);
    if(items[3]?.querySelector('b'))items[3].querySelector('b').textContent=pct(final.weightedReturn,2);
  }
  function patchYearCard(card,point){
    const headValue=card.querySelector('.wm-year-card-head > b');
    if(headValue)headValue.textContent=rupiah(point.totalMarket);
    const sums=[...card.querySelectorAll('.wm-year-card-summary > div')];
    if(sums[0]?.querySelector('b'))sums[0].querySelector('b').textContent=rupiah(point.totalInvested);
    if(sums[1]){
      const b=sums[1].querySelector('b'); const em=sums[1].querySelector('em');
      if(b)b.textContent=signedRp(point.totalReturn);
      if(em)em.textContent=`${signedPct(point.totalReturnPct)} dari dana disetor`;
    }
    if(sums[2]?.querySelector('b'))sums[2].querySelector('b').textContent=rupiah(point.totalMarket);
    const assetBoxes=[...card.querySelectorAll('.wm-year-assets > div')];
    point.assets.forEach((a,i)=>{
      const box=assetBoxes[i]; if(!box)return;
      const b=box.querySelector('b'); if(b)b.textContent=rupiah(a.marketValue);
      const smalls=box.querySelectorAll('small');
      if(smalls[0])smalls[0].innerHTML=`${signedRp(a.estimatedReturn)} return • <strong class="${a.estimatedReturn>=0?'positive':'negative'}">${signedPct(a.effectiveReturn)}</strong>`;
      if(smalls[1])smalls[1].textContent=`Asumsi ${pct(a.rate,2)}/tahun`;
    });
  }
  function patchYearTable(points){
    const rows=[...document.querySelectorAll('.wm-yearly-table tbody tr')];
    points.forEach((point,index)=>{
      const row=rows[index]; if(!row)return;
      const cells=row.querySelectorAll('td');
      if(cells[1])cells[1].textContent=rupiah(point.totalInvested);
      if(cells[2])cells[2].innerHTML=`<b>${signedRp(point.totalReturn)}</b><small>${signedPct(point.totalReturnPct)} dari dana disetor</small>`;
      if(cells[3])cells[3].innerHTML=`<b>${rupiah(point.totalMarket)}</b>`;
      point.assets.forEach((a,i)=>{
        const cell=cells[4+i]; if(!cell)return;
        cell.innerHTML=`<b>${rupiah(a.marketValue)}</b><small>${signedRp(a.estimatedReturn)} • ${signedPct(a.effectiveReturn)}</small><small>Asumsi ${pct(a.rate,2)}/th</small>`;
      });
    });
  }
  function patchTop(final,alloc,rates,years,initial){
    const targetToday=Number($('wmTarget')?.value||0);
    const inflation=Number($('wmInflation')?.value||3);
    const months=Math.max(1,Math.round(years*12));
    const futureTarget=targetToday*Math.pow(1+inflation/100,years);
    const funding=futureTarget>0?Math.min(999,final.totalMarket/futureTarget*100):0;
    const req=requiredMonthly(futureTarget,initial,alloc,rates,months);
    if($('resultProjected'))$('resultProjected').textContent=rupiah(final.totalMarket);
    if($('resultFunding'))$('resultFunding').textContent=pct(funding,1);
    if($('resultRequired'))$('resultRequired').textContent=rupiah(req);
    const eq=alloc.find(([n])=>n===ASSET_NAMES.equity)?.[1]||0;
    if($('resultAssumption'))$('resultAssumption').textContent=`Return ilustratif portofolio ${pct(final.weightedReturn,2)}/tahun • ekuitas ${eq}% • asumsi saham ${pct(rates[ASSET_NAMES.equity],2)}/tahun • inflasi ${pct(inflation,1)}/tahun`;
    if($('resultNext')&&futureTarget>0){
      $('resultNext').textContent=funding<80?`Target belum penuh. Kebutuhan setoran indikatif sekitar ${rupiah(req)} per bulan.`:funding<100?`Target hampir tercapai. Naikkan setoran menuju sekitar ${rupiah(req)} per bulan atau tambah horizon.`:'Rencana berada pada jalur target. Pertahankan disiplin investasi dan lakukan review berkala.';
    }
  }
  function updateModeBadge(){
    const badge=document.querySelector('#wmFutureValue .wm-fv-mode');
    const state=window.ANALISAKU_EQUITY_SLEEVE_API?.getState?.();
    if(badge&&state){
      const label={stable:'STABIL',balanced:'BALANCED',growth:'GROWTH',aggressive:'AGRESIF',custom:'CUSTOM'}[state.mode]||String(state.mode||'').toUpperCase();
      badge.textContent=`GAYA SAHAM ${label} • EKUITAS ${pct(equityReturn(),2)}/TH`;
    }
  }
  function refresh(){
    const panel=$('wmFutureValue');
    if(!panel)return;
    const alloc=allocation();
    if(!alloc.length)return;
    const initial=Number($('wmInitial')?.value||0);
    const monthly=Number($('wmMonthly')?.value||0);
    const years=Number($('wmYears')?.value||0);
    const months=Math.max(1,Math.round(years*12));
    const rates=returns();
    const final=snapshot(alloc,rates,initial,monthly,months);
    final.assets.forEach(patchAssetCard);
    patchSummary(final);

    const points=[];
    for(let m=12;m<months;m+=12)points.push({...snapshot(alloc,rates,initial,monthly,m),months:m});
    points.push({...snapshot(alloc,rates,initial,monthly,months),months});
    const cards=[...document.querySelectorAll('.wm-year-card')];
    points.forEach((point,i)=>{if(cards[i])patchYearCard(cards[i],point);});
    patchYearTable(points);
    patchTop(final,alloc,rates,years,initial);
    updateModeBadge();

    const eqInput=$('wmReturnEquity');
    if(eqInput)eqInput.value=String(Math.round(rates[ASSET_NAMES.equity]*100)/100);
    document.dispatchEvent(new CustomEvent('analisaku:wealth-projection-updated',{detail:{version:VERSION,equityReturn:rates[ASSET_NAMES.equity],weightedReturn:final.weightedReturn,totalMarket:final.totalMarket}}));
  }
  function schedule(){[0,40,120,320,650].forEach(ms=>setTimeout(refresh,ms));}

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-equity-preset]')||event.target.closest('#wmBuildPlan'))schedule();
  });
  document.addEventListener('input',event=>{
    if(event.target.closest('[data-equity-input]'))schedule();
  });
  document.addEventListener('change',event=>{
    if(event.target.closest('[data-equity-input]'))schedule();
  });

  window.ANALISAKU_WEALTH_EQUITY_PROJECTION={version:VERSION,refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,800),{once:true});
  else setTimeout(refresh,800);
})();
