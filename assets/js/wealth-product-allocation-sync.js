/* Wealth v1.9.2.7 — group instruments by portfolio sleeve so displayed weights total 100% */
(function(){
  const VERSION='1.9.2.7';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function parsePct(text){
    const n=Number(String(text||'').replace(/[^0-9,.-]/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }

  function allocationMap(){
    const root=$('resultAllocation');
    const map={};
    if(!root)return map;
    [...root.children].forEach(item=>{
      const name=item.querySelector('span')?.textContent?.trim()||'';
      const weight=parsePct(item.querySelector('b')?.textContent||item.textContent);
      if(name)map[name]=weight;
    });
    return map;
  }

  function addStyle(){
    if(document.getElementById('wmProductAllocationSyncStyle'))return;
    const style=document.createElement('style');
    style.id='wmProductAllocationSyncStyle';
    style.textContent=`
      .wm-product .fit.plan-share{color:var(--wm-teal);border-color:color-mix(in srgb,var(--wm-teal) 42%,var(--line));background:color-mix(in srgb,var(--wm-teal) 5%,transparent)}
      .wm-product .fit.limited-share{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 46%,var(--line));background:color-mix(in srgb,var(--gold) 6%,transparent)}
      .wm-product .allocation-note{display:block;margin-top:4px;font-size:7px;color:var(--muted2);line-height:1.45}
      .wm-product .instrument-list{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
      .wm-product .instrument-chip{display:inline-flex;align-items:center;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--surface3) 70%,transparent);font-size:7px;color:var(--muted)}
      .wm-products-total{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:9px;padding:9px 11px;border:1px solid color-mix(in srgb,var(--wm-green) 36%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--wm-green) 4%,var(--surface));font-size:8px;color:var(--muted2)}
      .wm-products-total b{font-size:11px;color:var(--wm-green)}
    `;
    document.head.appendChild(style);
  }

  function rowHtml(index,name,desc,weight,instruments,statusClass='plan-share',note=''){
    const chips=(instruments||[]).map(item=>`<span class="instrument-chip">${esc(item)}</span>`).join('');
    return `<div class="wm-product allocation-synced">
      <div class="rank">${index}</div>
      <div>
        <strong>${esc(name)}</strong>
        <p>${esc(desc)}</p>
        ${chips?`<div class="instrument-list">${chips}</div>`:''}
        ${note?`<span class="allocation-note">${esc(note)}</span>`:''}
      </div>
      <span class="fit ${statusClass}">PORSI ${weight}%</span>
    </div>`;
  }

  function sync(){
    const products=$('resultProducts');
    const allocation=$('resultAllocation');
    if(!products||!allocation||!allocation.children.length)return;

    const map=allocationMap();
    const cash=map['Likuid / RDPU']||0;
    const bond=map['Obligasi / RDPT']||0;
    const mixed=map['Campuran']||0;
    const equity=map['Ekuitas (Saham / RD Saham)']||0;
    const riskLevel=parsePct($('resultRiskLevel')?.textContent||0);
    const principle=$('wmPrinciple')?.value||'any';
    const principleNote=principle==='syariah'?'Gunakan varian/instrumen Syariah yang tersedia dan sesuai ketentuan produk.':'';

    const rows=[];
    let i=1;

    if(cash>0){
      rows.push(rowHtml(i++,'Likuiditas / Pasar Uang',
        'Bagian portofolio yang berfungsi menjaga akses dana dan membantu meredam fluktuasi.',
        cash,['Reksa Dana Pasar Uang'],'plan-share',principleNote));
    }

    if(bond>0){
      rows.push(rowHtml(i++,'Pendapatan Tetap',
        'Satu porsi pendapatan tetap yang dapat dibagi di antara instrumen obligasi sesuai kebutuhan dan ketersediaan produk.',
        bond,['SBN / Obligasi Berkualitas','Reksa Dana Pendapatan Tetap'],'plan-share',
        `Angka ${bond}% adalah total untuk seluruh kelompok Pendapatan Tetap, bukan ${bond}% untuk setiap instrumen.${principleNote?' '+principleNote:''}`));
    }

    if(mixed>0){
      rows.push(rowHtml(i++,'Campuran',
        'Bagian portofolio yang menggabungkan beberapa kelas aset untuk menyeimbangkan stabilitas dan pertumbuhan.',
        mixed,['Reksa Dana Campuran'],'plan-share',principleNote));
    }

    if(equity>0){
      const statusClass=riskLevel<=3?'limited-share':'plan-share';
      rows.push(rowHtml(i++,'Ekuitas',
        'Bagian pertumbuhan portofolio. Porsi ini dapat diisi saham langsung, Reksa Dana Saham, atau kombinasi keduanya.',
        equity,['Saham Langsung','Reksa Dana Saham'],statusClass,
        `Total eksposur ekuitas tetap ${equity}%. Jika memakai dua instrumen, keduanya berbagi porsi ini; bukan masing-masing ${equity}%.${principleNote?' '+principleNote:''}`));
    }

    const total=cash+bond+mixed+equity;
    products.innerHTML=rows.length?rows.join(''):'<p>Belum ada instrumen yang dapat dipetakan dari komposisi rencana.</p>';
    if(rows.length){
      products.insertAdjacentHTML('beforeend',`<div class="wm-products-total"><span>Total seluruh kelas aset pada rencana</span><b>${total}%</b></div>`);
    }

    const card=products.closest('.wm-result-card');
    if(card){
      const small=card.querySelector(':scope > small');
      const h3=card.querySelector(':scope > h3');
      const p=card.querySelector(':scope > p');
      if(small)small.textContent='KELAS ASET & INSTRUMEN';
      if(h3)h3.textContent='Instrumen yang dapat mengisi komposisi portofolio';
      if(p)p.textContent='Persentase di bawah adalah bobot per kelas aset dan totalnya selalu 100%. Beberapa instrumen dapat menjadi pilihan di dalam kelas aset yang sama, sehingga porsinya tidak dihitung dua kali.';
    }
  }

  function bind(){
    addStyle();
    document.addEventListener('click',event=>{
      if(!event.target.closest('#wmBuildPlan'))return;
      setTimeout(sync,0);
      setTimeout(sync,120);
    },false);
    if(document.body.classList.contains('wealth-result-ready'))setTimeout(sync,0);
    window.ANALISAKU_WEALTH_PRODUCT_SYNC={version:VERSION,sync};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
