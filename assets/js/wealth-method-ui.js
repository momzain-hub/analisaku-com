/* Plain-language suitability explainer */
(function(){
  const head=document.querySelector('#risk-profile .wm-section-head');
  const layout=document.querySelector('#risk-profile .risk-layout');
  if(head){
    const h2=head.querySelector('h2');
    const p=head.querySelector('p');
    if(h2)h2.textContent='Cek 3 hal: Kapan, Mampu, Nyaman.';
    if(p)p.innerHTML='Bukan sekadar menjumlahkan skor. Engine melihat <b>kapan dana dibutuhkan</b>, <b>seberapa mampu menanggung kerugian</b>, dan <b>seberapa nyaman menghadapi fluktuasi</b>. Batas risiko mengikuti sisi yang paling membatasi.';
  }
  if(layout&&!document.querySelector('.risk-method-strip')){
    layout.insertAdjacentHTML('beforebegin',`
      <div class="risk-method-strip">
        <article><span>01</span><div><b>KAPAN</b><strong>Waktu & likuiditas</strong><p>Kapan dana dipakai? Apakah harus mudah dicairkan?</p></div></article>
        <article><span>02</span><div><b>MAMPU</b><strong>Kemampuan finansial</strong><p>Dana darurat, cash flow, dan porsi aset menentukan kapasitas risiko.</p></div></article>
        <article><span>03</span><div><b>NYAMAN</b><strong>Toleransi risiko</strong><p>Bagaimana respons saat turun dan seberapa paham produk berisiko?</p></div></article>
        <div class="risk-method-rule"><b>ATURAN UTAMA</b><span>Batas produk = sisi terendah dari KAPAN, MAMPU, dan NYAMAN.</span></div>
      </div>`);
  }

  const methodology=document.querySelector('.wm-methodology');
  if(methodology){
    const h2=methodology.querySelector('h2');
    if(h2)h2.textContent='Metode 3 lensa + Product Fit.';
    const cards=[...methodology.querySelectorAll('.method-grid article')];
    const content=[
      ['KAPAN','Horizon dan kebutuhan likuiditas. Semakin dekat target, semakin kecil ruang untuk risiko besar.'],
      ['MAMPU','Kapasitas finansial: dana darurat, kestabilan surplus, konsentrasi aset, dan fleksibilitas target.'],
      ['NYAMAN','Toleransi psikologis, tujuan pertumbuhan, serta pengalaman memahami volatilitas.'],
      ['PRODUCT FIT','Produk baru lolos bila level risiko, horizon, likuiditas, dan tujuan sama-sama sesuai.']
    ];
    cards.slice(0,4).forEach((card,i)=>{const b=card.querySelector('b'),p=card.querySelector('p');if(b)b.textContent=content[i][0];if(p)p.textContent=content[i][1]});
  }
})();
