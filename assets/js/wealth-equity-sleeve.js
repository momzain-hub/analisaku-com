/* Wealth Management v1.2.1 — Equity Sleeve / Stock Style Mix + projection sync */
(function(){
  const VERSION='1.2.1';
  const $=id=>document.getElementById(id);
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=v=>`${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:2})}%`;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

  const STORAGE_KEY='analisaku_wealth_equity_sleeve_v12';

  /* Planning assumptions for each stock sleeve. These are illustrative return assumptions,
     not forecasts or guarantees. The blended result becomes the equity return assumption. */
  const SLEEVE_RETURNS={core:9,dividend:8,growth:13,tactical:15};

  const PRESETS={
    stable:{label:'Stabil',copy:'Core dan dividend menjadi fondasi utama.',mix:{core:60,dividend:30,growth:10,tactical:0}},
    balanced:{label:'Balanced',copy:'Seimbang antara kualitas, income, dan pertumbuhan.',mix:{core:50,dividend:20,growth:25,tactical:5}},
    growth:{label:'Growth',copy:'Porsi growth/second liner lebih besar, tetap ada core.',mix:{core:40,dividend:15,growth:35,tactical:10}},
    aggressive:{label:'Agresif',copy:'Growth dan tactical lebih dominan dengan volatilitas tinggi.',mix:{core:30,dividend:10,growth:45,tactical:15}}
  };
  const SLEEVES=[
    {key:'core',label:'Core / Blue Chip',role:'Fondasi portofolio',copy:'Emiten likuid, bisnis mapan, kualitas neraca dan tata kelola menjadi prioritas.',risk:'Relatif lebih stabil'},
    {key:'dividend',label:'Dividend / Income',role:'Cash-flow sleeve',copy:'Fokus pada konsistensi laba, kemampuan membayar dividen, dan yield yang sehat.',risk:'Income + defensif'},
    {key:'growth',label:'Growth / Second Liner',role:'Pertumbuhan',copy:'Perusahaan dengan potensi ekspansi lebih tinggi; volatilitas dan risiko eksekusi juga lebih besar.',risk:'Growth lebih tinggi'},
    {key:'tactical',label:'Tactical / Trading',role:'Opportunistic',copy:'Momentum, event-driven, swing, atau trading aktif. Porsinya dijaga agar tidak mengambil alih fungsi core.',risk:'Paling aktif'}
  ];

  let state=loadState();
  let internalRebuild=false;

  function cloneMix(mix){return {core:Number(mix.core)||0,dividend:Number(mix.dividend)||0,growth:Number(mix.growth)||0,tactical:Number(mix.tactical)||0};}
  function loadState(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(raw&&raw.mode&&raw.mix)return {mode:raw.mode,mix:cloneMix(raw.mix)};
    }catch(_){ }
    return {mode:'balanced',mix:cloneMix(PRESETS.balanced.mix)};
  }
  function saveState(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){ }
    window.ANALISAKU_EQUITY_SLEEVE={version:VERSION,mode:state.mode,mix:cloneMix(state.mix),equityReturn:blendedEquityReturn(currentMix())};
  }
  function parseNumber(text){
    const cleaned=String(text||'').replace(/[^0-9,.-]/g,'').replace(',','.');
    const n=Number(cleaned);
    return Number.isFinite(n)?n:0;
  }
  function readEquityWeight(){
    const root=$('resultAllocation');
    if(!root)return 0;
    const item=[...root.children].find(el=>(el.querySelector('span')?.textContent||'').trim().toLowerCase().startsWith('ekuitas'));
    return item?parseNumber(item.querySelector('b')?.textContent):0;
  }
  function totalMix(mix=state.mix){return SLEEVES.reduce((sum,s)=>sum+(Number(mix[s.key])||0),0);}
  function currentMix(){
    if(state.mode!=='custom'&&PRESETS[state.mode])return cloneMix(PRESETS[state.mode].mix);
    return cloneMix(state.mix);
  }
  function blendedEquityReturn(mix=currentMix()){
    const total=totalMix(mix);
    if(total<=0)return 10;
    return SLEEVES.reduce((sum,s)=>sum+((Number(mix[s.key])||0)/total)*(SLEEVE_RETURNS[s.key]||0),0);
  }
  function updateVersionBadge(){
    let badge=document.querySelector('.wm-version-badge');
    if(!badge){
      const kicker=document.querySelector('.wealth-hero .kicker');
      if(!kicker)return;
      badge=document.createElement('span');
      badge.className='wm-version-badge';
      kicker.appendChild(badge);
    }
    badge.textContent='WEALTH v1.9.2.8';
  }
  function ensurePanel(){
    let panel=$('wmEquitySleeve');
    if(panel)return panel;
    const anchor=$('resultAllocation')?.closest('.wm-result-card');
    if(!anchor)return null;
    panel=document.createElement('article');
    panel.id='wmEquitySleeve';
    panel.className='wm-equity-sleeve';
    anchor.insertAdjacentElement('afterend',panel);
    bindPanel(panel);
    return panel;
  }
  function mixBarHtml(mix){
    return `<div class="wm-equity-bar" aria-label="Komposisi porsi saham">${SLEEVES.filter(s=>mix[s.key]>0).map(s=>`<span class="${s.key}" style="width:${mix[s.key]}%" title="${esc(s.label)} ${mix[s.key]}%"></span>`).join('')}</div>`;
  }
  function presetButtonsHtml(){
    return `<div class="wm-equity-presets">
      ${Object.entries(PRESETS).map(([key,p])=>`<button type="button" data-equity-preset="${key}" class="${state.mode===key?'active':''}"><strong>${p.label}</strong><small>${p.copy}</small></button>`).join('')}
      <button type="button" data-equity-preset="custom" class="${state.mode==='custom'?'active':''}"><strong>Custom</strong><small>Atur kombinasi sendiri, total harus 100%.</small></button>
    </div>`;
  }
  function customInputsHtml(mix){
    const custom=state.mode==='custom';
    return `<div class="wm-equity-custom ${custom?'show':''}">
      <div class="wm-equity-custom-head"><div><small>KOMBINASI CUSTOM</small><strong>Atur isi porsi saham</strong></div><div class="wm-equity-total ${Math.abs(totalMix(mix)-100)<0.01?'ok':'warn'}">TOTAL <b>${pct(totalMix(mix))}</b></div></div>
      <div class="wm-equity-custom-grid">${SLEEVES.map(s=>`<label><span>${esc(s.label)}</span><div><input type="number" min="0" max="100" step="1" data-equity-input="${s.key}" value="${mix[s.key]}" ${custom?'':'disabled'}><b>%</b></div></label>`).join('')}</div>
      <div class="wm-equity-custom-note ${Math.abs(totalMix(mix)-100)<0.01?'ok':'warn'}">${Math.abs(totalMix(mix)-100)<0.01?'Komposisi valid. Total porsi saham = 100%.':'Total komposisi harus tepat 100% agar pembagian dapat digunakan.'}</div>
    </div>`;
  }
  function sleeveRowsHtml(mix,equityWeight){
    const monthly=Number($('wmMonthly')?.value||0);
    const initial=Number($('wmInitial')?.value||0);
    return SLEEVES.map(s=>{
      const sleeve=Number(mix[s.key])||0;
      const totalWeight=equityWeight*sleeve/100;
      const monthlyRp=monthly*totalWeight/100;
      const initialRp=initial*totalWeight/100;
      return `<article class="wm-equity-row ${s.key}">
        <div class="wm-equity-row-top"><div><small>${esc(s.role)}</small><strong>${esc(s.label)}</strong></div><b>${pct(sleeve)} <em>dari saham</em></b></div>
        <p>${esc(s.copy)}</p>
        <div class="wm-equity-row-metrics">
          <span><small>DARI TOTAL PORTOFOLIO</small><b>${pct(totalWeight)}</b></span>
          <span><small>SETORAN BULANAN</small><b>${rupiah(monthlyRp)}</b></span>
          <span><small>ALOKASI DANA AWAL</small><b>${rupiah(initialRp)}</b></span>
        </div>
        <div class="wm-equity-risk">${esc(s.risk)} • asumsi ${pct(SLEEVE_RETURNS[s.key])}/tahun</div>
      </article>`;
    }).join('');
  }
  function renderPanel(){
    updateVersionBadge();
    const panel=ensurePanel();
    if(!panel)return;
    const equityWeight=readEquityWeight();
    if(equityWeight<=0){panel.hidden=true;return;}
    panel.hidden=false;
    const mix=currentMix();
    if(state.mode!=='custom')state.mix=cloneMix(mix);
    saveState();
    const valid=Math.abs(totalMix(mix)-100)<0.01;
    const equityMonthly=Number($('wmMonthly')?.value||0)*equityWeight/100;
    const equityReturn=blendedEquityReturn(mix);
    panel.innerHTML=`
      <div class="wm-equity-head">
        <div><small>PENGATURAN PORSI SAHAM • v${VERSION}</small><h3>Bagaimana Anda ingin membagi porsi saham?</h3><p>Total porsi ekuitas tetap mengikuti hasil rencana Anda. Pilihan di bawah hanya membagi <b>isi porsi saham</b> dan sekaligus menyesuaikan asumsi return ekuitas pada proyeksi.</p></div>
        <div class="wm-equity-cap"><small>PORSI EKUITAS DALAM RENCANA</small><b>${pct(equityWeight)}</b><span>${rupiah(equityMonthly)}/bulan diarahkan ke ekuitas</span></div>
      </div>
      ${presetButtonsHtml()}
      ${customInputsHtml(mix)}
      <div class="wm-equity-visual"><div><small>KOMPOSISI PILIHAN</small><strong>${state.mode==='custom'?'Custom':PRESETS[state.mode]?.label||'Balanced'}</strong><span style="display:block;margin-top:4px;color:var(--muted2);font-size:8px">Asumsi return ekuitas gabungan: <b style="color:var(--wm-green)">${pct(equityReturn)}/tahun</b></span></div>${mixBarHtml(mix)}</div>
      <div class="wm-equity-rows ${valid?'':'invalid'}">${sleeveRowsHtml(mix,equityWeight)}</div>
      <div class="wm-equity-guardrail"><b>Catatan:</b> total ekuitas <b>${pct(equityWeight)}</b> tetap sama. Pilihan gaya saham hanya mengubah pembagian di dalam porsi ekuitas dan asumsi return ekuitas untuk simulasi. Return bersifat ilustratif, bukan jaminan hasil.</div>`;
  }

  function syncEquityReturnAndRebuild(){
    const mix=currentMix();
    if(Math.abs(totalMix(mix)-100)>=0.01)return;
    const equityReturn=blendedEquityReturn(mix);
    const toggle=$('wmUseCustomReturns');
    const equityInput=$('wmReturnEquity');
    if(!toggle||!equityInput)return;

    /* Turn on custom assumptions so the core engine and yearly projection both read this equity rate.
       Other asset inputs remain at their current values, so existing user custom assumptions are preserved. */
    toggle.checked=true;
    toggle.dispatchEvent(new Event('change',{bubbles:true}));
    equityInput.value=String(Math.round(equityReturn*100)/100);
    equityInput.dispatchEvent(new Event('input',{bubbles:true}));
    equityInput.dispatchEvent(new Event('change',{bubbles:true}));

    const build=$('wmBuildPlan');
    if(!build||internalRebuild)return;
    internalRebuild=true;
    const scrollTop=window.scrollY;
    build.click();
    /* buildPlan re-renders the result and the yearly module listens to the same click.
       Restore the user's reading position so changing a stock style feels instant rather than jumping around. */
    [0,80,220,420].forEach(delay=>setTimeout(()=>window.scrollTo({top:scrollTop,left:0,behavior:'auto'}),delay));
    setTimeout(()=>{internalRebuild=false;renderPanel();window.ANALISAKU_WEALTH_PRODUCT_SYNC?.sync?.();},460);
  }

  function applySelection(){
    saveState();
    renderPanel();
    syncEquityReturnAndRebuild();
  }

  function bindPanel(panel){
    panel.addEventListener('click',event=>{
      const btn=event.target.closest('[data-equity-preset]');
      if(!btn)return;
      const mode=btn.dataset.equityPreset;
      if(mode==='custom'){
        state.mode='custom';
      }else if(PRESETS[mode]){
        state.mode=mode;
        state.mix=cloneMix(PRESETS[mode].mix);
      }
      applySelection();
    });
    panel.addEventListener('input',event=>{
      const input=event.target.closest('[data-equity-input]');
      if(!input||state.mode!=='custom')return;
      const key=input.dataset.equityInput;
      const value=Math.max(0,Math.min(100,Number(input.value)||0));
      state.mix[key]=value;
      saveState();
      renderPanel();
      const next=panel.querySelector(`[data-equity-input="${key}"]`);
      if(next){next.focus();next.setSelectionRange?.(String(value).length,String(value).length);}
      if(Math.abs(totalMix(state.mix)-100)<0.01)syncEquityReturnAndRebuild();
    });
  }
  function bind(){
    updateVersionBadge();
    const build=$('wmBuildPlan');
    if(build)build.addEventListener('click',()=>setTimeout(renderPanel,0));
    if(document.body.classList.contains('wealth-result-ready'))setTimeout(renderPanel,0);
  }

  window.ANALISAKU_EQUITY_SLEEVE_API={
    version:VERSION,
    getState:()=>({mode:state.mode,mix:cloneMix(currentMix()),equityReturn:blendedEquityReturn(currentMix())}),
    getEquityReturn:()=>blendedEquityReturn(currentMix()),
    render:renderPanel,
    apply:applySelection
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
