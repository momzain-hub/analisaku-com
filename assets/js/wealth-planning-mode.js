/* Wealth Management v1.3 — 3 planning modes: goal, lump sum, cash buffer */
(function(){
  const VERSION='1.3';
  const $=id=>document.getElementById(id);
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=v=>`${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
  const STORAGE_KEY='analisaku_wealth_mode_v13';

  let state=loadState();

  function loadState(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(raw&&['goal','lump','buffer'].includes(raw.mode))return {...raw};
    }catch(_){ }
    return {mode:'goal',bufferPct:20,totalCapital:500000000};
  }
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){ }}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function parseRp(text){
    const cleaned=String(text||'').replace(/[^0-9,-]/g,'').replace(',','.');
    const n=Number(cleaned);return Number.isFinite(n)?n:0;
  }
  function modeLabel(){return state.mode==='goal'?'Kejar Target':state.mode==='lump'?'Dana Sudah Ada':'Cash Buffer';}

  function ensureUI(){
    if($('wmPlanningMode'))return;
    const step=$('step-1');
    const body=step?.querySelector('.wm-step-body');
    if(!body)return;

    const head=step.querySelector('.wm-step-head>div:last-child');
    if(head){
      const small=head.querySelector('small'),h2=head.querySelector('h2'),p=head.querySelector('p');
      if(small)small.textContent='MODE WEALTH PLAN';
      if(h2)h2.textContent='Mulai dari kondisi Anda.';
      if(p)p.textContent='Tidak semua nasabah mulai dari titik yang sama. Pilih apakah ingin mengejar target, mengalokasikan dana yang sudah tersedia, atau menjaga cash buffer untuk investasi/trading.';
    }

    const selector=document.createElement('section');
    selector.id='wmPlanningMode';
    selector.className='wm-plan-mode';
    selector.innerHTML=`
      <div class="wm-plan-mode-head"><small>PILIH 1 DARI 3</small><strong>Bagaimana dana Anda tersedia hari ini?</strong><p>Pilihan ini mengubah cara kalkulator membaca target, dana awal, dan kebutuhan likuiditas—profil risiko tetap dihitung dari KAPAN, MAMPU, dan NYAMAN.</p></div>
      <div class="wm-plan-mode-grid">
        <button type="button" data-plan-mode="goal"><span>01</span><div><strong>Kejar Target</strong><small>Contoh: pendidikan, rumah, pensiun. Dana dibangun dari dana awal + investasi bulanan.</small></div></button>
        <button type="button" data-plan-mode="lump"><span>02</span><div><strong>Dana Sudah Ada</strong><small>Sudah punya cash, misalnya Rp500 juta, dan ingin langsung dibagi ke instrumen investasi.</small></div></button>
        <button type="button" data-plan-mode="buffer"><span>03</span><div><strong>Investor / Trader + Cash Buffer</strong><small>Sebagian modal tetap likuid sebagai buffer; sisanya diinvestasikan sesuai profil.</small></div></button>
      </div>
      <div class="wm-buffer-setting" id="wmBufferSetting" hidden>
        <div><small>CASH BUFFER</small><strong>Sisihkan modal yang tidak ikut masuk pasar.</strong><p>Buffer dipertahankan sebagai kas likuid. Mesin hanya mengalokasikan sisa modal ke RDPU, obligasi/RDPT, campuran, dan saham.</p></div>
        <label><span>Buffer dari total modal</span><div><input id="wmBufferPct" type="number" min="0" max="80" step="1" value="20"><b>%</b></div><small id="wmBufferPreview">—</small></label>
      </div>`;
    body.insertBefore(selector,body.firstChild);

    selector.addEventListener('click',event=>{
      const btn=event.target.closest('[data-plan-mode]');
      if(!btn)return;
      captureCurrent();
      state.mode=btn.dataset.planMode;
      saveState();
      applyModeUI();
    });
    $('wmBufferPct')?.addEventListener('input',()=>{
      state.bufferPct=Math.max(0,Math.min(80,num($('wmBufferPct').value)));
      saveState();
      updateBufferPreview();
    });
  }

  function fields(){
    return {
      target:$('wmTarget')?.closest('.wm-field'),
      initial:$('wmInitial')?.closest('.wm-field'),
      years:$('wmYears')?.closest('.wm-field'),
      monthly:$('wmMonthly')?.closest('.wm-field'),
      principle:$('wmPrinciple')?.closest('.wm-field'),
      inflation:$('wmInflation')?.closest('.wm-field')
    };
  }
  function setField(field,label,copy,hidden=false){
    if(!field)return;
    field.hidden=hidden;
    const l=field.querySelector('label'),s=field.querySelector('small');
    if(l)l.textContent=label;
    if(s)s.textContent=copy;
  }
  function goalGrid(){return $('goalChoices');}
  function clickCustomGoal(){
    const custom=document.querySelector('.goal-card[data-goal="Custom"]');
    if(custom&&!custom.classList.contains('active'))custom.click();
  }
  function captureCurrent(){
    if(state.mode==='buffer'){
      state.totalCapital=num($('wmTarget')?.value)||state.totalCapital||500000000;
      state.bufferPct=Math.max(0,Math.min(80,num($('wmBufferPct')?.value)||20));
    }
  }

  function applyModeUI(){
    ensureUI();
    document.querySelectorAll('[data-plan-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.planMode===state.mode));
    const f=fields();
    const grid=goalGrid();
    const buffer=$('wmBufferSetting');

    if(state.mode==='goal'){
      if(grid)grid.hidden=false;
      if(buffer)buffer.hidden=true;
      setField(f.target,'Target dana hari ini','Nominal kebutuhan dalam rupiah saat ini. Sistem akan menaikkannya dengan inflasi.');
      setField(f.initial,'Dana awal tersedia','Dana yang sudah siap untuk tujuan ini.');
      setField(f.years,'Waktu menuju target','Dalam tahun.');
      setField(f.monthly,'Investasi bulanan','Dana yang akan diinvestasikan rutin setiap bulan.');
      setField(f.inflation,'Asumsi inflasi','Dipakai untuk menghitung kebutuhan dana pada tahun target.');
    }else if(state.mode==='lump'){
      if(grid)grid.hidden=true;
      if(buffer)buffer.hidden=true;
      clickCustomGoal();
      setField(f.target,'Target internal kalkulator','Tidak perlu diisi pada mode ini.',true);
      setField(f.initial,'Dana investasi tersedia sekarang','Contoh: Rp500 juta cash yang siap langsung dialokasikan.');
      setField(f.years,'Horizon investasi','Berapa lama dana dapat dibiarkan bekerja.');
      setField(f.monthly,'Tambahan investasi bulanan (opsional)','Isi 0 bila hanya ingin menghitung dana lump sum.');
      setField(f.inflation,'Inflasi','Tidak dipakai pada mode alokasi dana.',true);
    }else{
      if(grid)grid.hidden=true;
      if(buffer)buffer.hidden=false;
      clickCustomGoal();
      setField(f.target,'Total modal tersedia','Seluruh cash yang dimiliki untuk strategi investasi/trading, sebelum buffer dipisahkan.');
      setField(f.initial,'Dana yang masuk investasi','Dihitung otomatis setelah cash buffer dipisahkan.',true);
      setField(f.years,'Horizon pengelolaan','Dipakai untuk menentukan batas risiko dan proyeksi.');
      setField(f.monthly,'Tambahan modal bulanan (opsional)','Isi 0 bila tidak ada tambahan modal rutin.');
      setField(f.inflation,'Inflasi','Tidak dipakai pada mode cash buffer.',true);
      if($('wmBufferPct'))$('wmBufferPct').value=state.bufferPct??20;
      if(state.totalCapital&&!num($('wmTarget')?.value))$('wmTarget').value=state.totalCapital;
      updateBufferPreview();
    }
    updateVersionBadge();
    window.ANALISAKU_WEALTH_MODE={version:VERSION,mode:state.mode,label:modeLabel(),bufferPct:state.bufferPct||0};
  }

  function updateBufferPreview(){
    if(state.mode!=='buffer')return;
    const total=num($('wmTarget')?.value)||state.totalCapital||0;
    const bp=Math.max(0,Math.min(80,num($('wmBufferPct')?.value)||0));
    const cash=total*bp/100,invested=total-cash;
    const preview=$('wmBufferPreview');
    if(preview)preview.textContent=`${rupiah(cash)} buffer • ${rupiah(invested)} siap diinvestasikan`;
  }

  function updateVersionBadge(){
    let badge=document.querySelector('.wm-version-badge');
    if(!badge){
      const kicker=document.querySelector('.wealth-hero .kicker');
      if(!kicker)return;
      badge=document.createElement('span');badge.className='wm-version-badge';kicker.appendChild(badge);
    }
    badge.textContent=`ENGINE v${VERSION}`;
  }

  function prepareBeforeBuild(){
    captureCurrent();
    if(state.mode==='goal')return;
    clickCustomGoal();
    const initial=$('wmInitial'),target=$('wmTarget'),inflation=$('wmInflation');
    if(state.mode==='lump'){
      const capital=num(initial?.value);
      state.totalCapital=capital;
      state.originalTarget=num(target?.value);
      if(target)target.value=Math.max(1,capital);
      if(inflation)inflation.value=0;
    }else if(state.mode==='buffer'){
      const total=num(target?.value)||state.totalCapital||0;
      const bp=Math.max(0,Math.min(80,num($('wmBufferPct')?.value)||20));
      const bufferCash=total*bp/100;
      const invested=total-bufferCash;
      state.totalCapital=total;state.bufferPct=bp;state.bufferCash=bufferCash;state.investedInitial=invested;
      if(initial)initial.value=Math.max(0,invested);
      state.originalTarget=total;
      if(target)target.value=Math.max(1,invested);
      if(inflation)inflation.value=0;
    }
    saveState();
  }

  function setCell(cell,label,value,sub=''){
    if(!cell)return;
    const span=cell.querySelector('span'),b=cell.querySelector('b');
    if(span)span.textContent=label;
    if(b)b.textContent=value;
    let small=cell.querySelector('small.wm-mode-sub');
    if(sub){
      if(!small){small=document.createElement('small');small.className='wm-mode-sub';cell.appendChild(small);}
      small.textContent=sub;
    }else if(small)small.remove();
  }
  function weightedReturn(){
    const match=($('resultAssumption')?.textContent||'').match(/portofolio\s+([\d,.]+)%/i);
    return match?match[1]+'%/tahun':'—';
  }
  function resultCells(){return [...document.querySelectorAll('#wealth-result .wm-glance>div')];}

  function applyGoalResult(cells){
    const years=num($('wmYears')?.value),targetToday=num($('wmTarget')?.value),inflation=num($('wmInflation')?.value);
    const target=targetToday*Math.pow(1+inflation/100,years);
    const projected=parseRp($('resultProjected')?.textContent);
    const gap=target-projected;
    const funding=target>0?projected/target*100:0;
    setCell(cells[0],`Target dana di tahun ${years}`,rupiah(target),'Kebutuhan setelah inflasi');
    setCell(cells[1],`Estimasi nilai investasi di tahun ${years}`,rupiah(projected),'Berdasarkan dana awal + investasi bulanan');
    setCell(cells[2],'Gap target',gap>0?`${rupiah(gap)} kurang`:`${rupiah(Math.abs(gap))} surplus`,`Funding ratio ${pct(funding)}`);
    // cell 4 remains required/month from core
  }

  function applyLumpResult(cells){
    const years=num($('wmYears')?.value),initial=num($('wmInitial')?.value),monthly=num($('wmMonthly')?.value);
    const projected=parseRp($('resultProjected')?.textContent);
    const totalIn=initial+(monthly*Math.round(years*12));
    const growth=projected-totalIn;
    setCell(cells[0],'Dana investasi awal',rupiah(initial),'Cash yang langsung dialokasikan');
    setCell(cells[1],`Estimasi nilai investasi akhir`,rupiah(projected),`Horizon ${years} tahun`);
    setCell(cells[2],'Estimasi pertumbuhan',`${growth>=0?'+':''}${rupiah(growth)}`,totalIn>0?`${pct(growth/totalIn*100)} dari total dana masuk`:'');
    setCell(cells[3],'Asumsi return portofolio',weightedReturn(),monthly>0?`Top up ${rupiah(monthly)}/bulan`:'Tanpa top up bulanan');
    if($('resultGoalTitle'))$('resultGoalTitle').textContent='Alokasi Dana Investasi';
    if($('resultGoalSub'))$('resultGoalSub').textContent=`Dana sudah tersedia • horizon ${years} tahun`;
    if($('resultNext'))$('resultNext').textContent=`Alokasikan ${rupiah(initial)} sesuai batas risiko dan model aset. ${monthly>0?`Tambahkan ${rupiah(monthly)} per bulan sesuai rencana.`:'Tidak ada kewajiban setoran bulanan pada mode ini.'}`;
  }

  function applyBufferResult(cells){
    const years=num($('wmYears')?.value),monthly=num($('wmMonthly')?.value);
    const total=state.totalCapital||0,bufferCash=state.bufferCash||0,invested=state.investedInitial||0;
    const projected=parseRp($('resultProjected')?.textContent);
    const totalFuture=projected+bufferCash;
    setCell(cells[0],'Total modal tersedia',rupiah(total),'Sebelum cash buffer dipisahkan');
    setCell(cells[1],`Cash buffer ${pct(state.bufferPct||0)}`,rupiah(bufferCash),'Tetap likuid / tidak masuk proyeksi investasi');
    setCell(cells[2],'Dana masuk investasi',rupiah(invested),`${pct(100-(state.bufferPct||0))} dari total modal`);
    setCell(cells[3],'Estimasi total portofolio akhir',rupiah(totalFuture),`Investasi ${rupiah(projected)} + buffer ${rupiah(bufferCash)}`);
    if($('resultGoalTitle'))$('resultGoalTitle').textContent='Investor / Trader Cash Buffer';
    if($('resultGoalSub'))$('resultGoalSub').textContent=`Buffer ${pct(state.bufferPct||0)} • horizon ${years} tahun`;
    if($('resultNext'))$('resultNext').textContent=`Pertahankan ${rupiah(bufferCash)} sebagai cash buffer. Dana ${rupiah(invested)} dialokasikan sesuai profil; ${monthly>0?`tambahan ${rupiah(monthly)}/bulan tetap dapat diarahkan ke portofolio.`:'tidak ada top up bulanan.'}`;
    addBufferNote(projected,totalFuture);
  }

  function addBufferNote(projected,totalFuture){
    const panel=$('wmFutureValue');
    if(!panel)return;
    let note=$('wmModeBufferNote');
    if(!note){note=document.createElement('div');note.id='wmModeBufferNote';note.className='wm-mode-buffer-note';panel.appendChild(note);}
    note.innerHTML=`<div><small>CASH BUFFER DI LUAR INVESTASI</small><strong>${rupiah(state.bufferCash||0)}</strong><span>${pct(state.bufferPct||0)} dari modal tetap likuid</span></div><div><small>PROYEKSI INVESTASI</small><strong>${rupiah(projected)}</strong><span>Tidak termasuk buffer</span></div><div><small>TOTAL PROYEKSI + BUFFER</small><strong>${rupiah(totalFuture)}</strong><span>Dengan asumsi buffer tidak bertumbuh</span></div>`;
  }

  function restoreVisibleInputs(){
    if(state.mode==='lump'){
      if($('wmTarget'))$('wmTarget').value=state.originalTarget||state.totalCapital||1;
    }else if(state.mode==='buffer'){
      if($('wmTarget'))$('wmTarget').value=state.totalCapital||0;
      updateBufferPreview();
    }
  }

  function applyModeResult(){
    const cells=resultCells();
    if(cells.length<4)return;
    if(state.mode==='goal')applyGoalResult(cells);
    else if(state.mode==='lump')applyLumpResult(cells);
    else applyBufferResult(cells);
    restoreVisibleInputs();
    updateVersionBadge();
  }

  function bind(){
    ensureUI();
    applyModeUI();
    $('wmTarget')?.addEventListener('input',updateBufferPreview);
    $('wmBuildPlan')?.addEventListener('click',()=>{
      prepareBeforeBuild();
      setTimeout(applyModeResult,80);
    });
  }

  window.ANALISAKU_WEALTH_MODE_API={
    version:VERSION,
    getState:()=>({...state}),
    apply:applyModeUI
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
