/* Wealth v1.9.2.6 — keep displayed instruments consistent with portfolio allocation */
(function(){
  const VERSION='1.9.2.6';
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
    `;
    document.head.appendChild(style);
  }

  function rowHtml(index,name,desc,status,statusClass,note=''){
    return `<div class="wm-product allocation-synced">
      <div class="rank">${index}</div>
      <div>
        <strong>${esc(name)}</strong>
        <p>${esc(desc)}</p>
        ${note?`<span class="allocation-note">${esc(note)}</span>`:''}
      </div>
      <span class="fit ${statusClass}">${esc(status)}</span>
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
    const principleNote=principle==='syariah'?'Pilih instrumen/varian Syariah yang tersedia dan sesuai ketentuan produk.':'';

    const rows=[];
    let i=1;

    if(cash>0){
      rows.push(rowHtml(i++,'Reksa Dana Pasar Uang',
        'Bagian likuiditas portofolio untuk menjaga akses dana dan meredam fluktuasi.',
        `PORSI ${cash}%`,'plan-share',principleNote));
    }

    if(bond>0){
      rows.push(rowHtml(i++,'SBN / Obligasi Berkualitas',
        'Dapat digunakan sebagai bagian pendapatan tetap untuk stabilitas dan potensi pendapatan berkala.',
        `PORSI RDPT ${bond}%`,'plan-share',
        `Porsi ${bond}% adalah total sleeve obligasi/RDPT; dapat dibagi dengan Reksa Dana Pendapatan Tetap.${principleNote?' '+principleNote:''}`));
      rows.push(rowHtml(i++,'Reksa Dana Pendapatan Tetap',
        'Alternatif pengelolaan eksposur surat utang untuk bagian pendapatan tetap portofolio.',
        `PORSI RDPT ${bond}%`,'plan-share',
        `Berbagi total porsi obligasi/RDPT ${bond}% dengan obligasi/SBN, bukan masing-masing ${bond}%.${principleNote?' '+principleNote:''}`));
    }

    if(mixed>0){
      rows.push(rowHtml(i++,'Reksa Dana Campuran',
        'Menggabungkan beberapa kelas aset untuk membantu menyeimbangkan stabilitas dan pertumbuhan.',
        `PORSI ${mixed}%`,'plan-share',principleNote));
    }

    if(equity>0){
      const statusClass=riskLevel<=3?'limited-share':'plan-share';
      const status=riskLevel<=3?`PORSI TERBATAS ${equity}%`:`PORSI EKUITAS ${equity}%`;
      rows.push(rowHtml(i++,'Saham Langsung / Reksa Dana Saham',
        'Bagian pertumbuhan portofolio. Dapat menggunakan saham langsung, Reksa Dana Saham, atau kombinasi keduanya.',
        status,statusClass,
        `Total eksposur ekuitas dalam rencana ini ${equity}%; angka tersebut merupakan batas gabungan, bukan ${equity}% untuk masing-masing instrumen.${principleNote?' '+principleNote:''}`));
    }

    products.innerHTML=rows.length?rows.join(''):'<p>Belum ada instrumen yang dapat dipetakan dari komposisi rencana.</p>';

    const card=products.closest('.wm-result-card');
    if(card){
      const small=card.querySelector(':scope > small');
      const h3=card.querySelector(':scope > h3');
      const p=card.querySelector(':scope > p');
      if(small)small.textContent='PILIHAN KELAS ASET';
      if(h3)h3.textContent='Instrumen yang sesuai untuk dipertimbangkan';
      if(p)p.textContent='Daftar ini mengikuti komposisi portofolio di samping. Instrumen berisiko lebih tinggi dapat muncul sebagai porsi terbatas bila memang terdapat alokasi pada kelas aset tersebut.';
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
