/* Wealth product overview — Mirae Asset focus */
(function(){
  function init(){
    const form=document.getElementById('wealth-form');
    if(!form||document.getElementById('wealth-products'))return;

    const section=document.createElement('section');
    section.className='section wm-products-section';
    section.id='wealth-products';
    section.innerHTML=`
      <div class="container">
        <div class="wm-products-head">
          <div>
            <div class="kicker">SEBELUM MEMBUAT WEALTH PLAN</div>
            <h2>Kenali dulu pilihan investasinya.</h2>
            <p>Di Mirae Asset Sekuritas, investor dapat mengakses berbagai instrumen. Untuk alur Wealth Management Analisaku, kita fokus pada tiga kelas utama: <b>Reksa Dana, Obligasi, dan Saham</b>.</p>
          </div>
          <div class="wm-return-note">
            <small>PENTING</small>
            <strong>Return di bawah adalah asumsi perencanaan, bukan janji hasil.</strong>
            <span>Hasil aktual dapat lebih tinggi, lebih rendah, bahkan negatif.</span>
          </div>
        </div>

        <div class="wm-product-main-grid">
          <article class="wm-asset-card mutual-fund">
            <div class="wm-asset-top">
              <div><span class="wm-asset-no">01</span><small>DIKELOLA MANAJER INVESTASI</small><h3>Reksa Dana</h3></div>
              <div class="wm-risk-pill variable">Risiko: Rendah–Tinggi</div>
            </div>
            <p class="wm-asset-copy">Dana dikelola dalam portofolio sesuai jenis Reksa Dana. Risiko dan potensi hasil sangat bergantung pada aset dasarnya.</p>
            <div class="wm-rd-table">
              <div><b>Pasar Uang</b><span>&lt; 1 tahun</span><strong>± 4–6% / tahun</strong><em>Risiko rendah</em></div>
              <div><b>Pendapatan Tetap</b><span>1–3 tahun</span><strong>± 5–8% / tahun</strong><em>Risiko rendah–menengah</em></div>
              <div><b>Campuran</b><span>3–5 tahun</span><strong>± 6–10% / tahun</strong><em>Risiko menengah</em></div>
              <div><b>Saham</b><span>&gt; 5 tahun</span><strong>± 8–12%+ / tahun</strong><em>Risiko tinggi</em></div>
            </div>
            <div class="wm-asset-risk"><b>Risiko utama</b><span>Fluktuasi NAB, risiko pasar, kredit, likuiditas, dan kinerja aset dalam portofolio.</span></div>
          </article>

          <article class="wm-asset-card bond">
            <div class="wm-asset-top">
              <div><span class="wm-asset-no">02</span><small>FIXED INCOME</small><h3>Obligasi</h3></div>
              <div class="wm-risk-pill moderate">Risiko: Rendah–Menengah</div>
            </div>
            <p class="wm-asset-copy">Surat utang pemerintah atau perusahaan yang memberikan kupon. Jika ditahan sampai jatuh tempo, arus kas relatif lebih terukur dibanding saham.</p>
            <div class="wm-return-box">
              <small>ASUMSI RETURN PERENCANAAN</small>
              <strong>± 5–8% <span>/ tahun</span></strong>
              <p>Kupon/yield aktual mengikuti seri, tenor, harga pasar, dan kualitas penerbit.</p>
            </div>
            <div class="wm-asset-points"><span><b>SBN</b> → risiko kredit relatif rendah, didukung pemerintah.</span><span><b>Korporasi</b> → potensi yield lebih tinggi, dengan risiko kredit lebih besar.</span></div>
            <div class="wm-asset-risk"><b>Risiko utama</b><span>Perubahan harga sebelum jatuh tempo, suku bunga, likuiditas, dan gagal bayar pada penerbit korporasi.</span></div>
          </article>

          <article class="wm-asset-card stock">
            <div class="wm-asset-top">
              <div><span class="wm-asset-no">03</span><small>EQUITY</small><h3>Saham</h3></div>
              <div class="wm-risk-pill high">Risiko: Tinggi</div>
            </div>
            <p class="wm-asset-copy">Kepemilikan pada perusahaan terbuka. Potensi hasil berasal dari kenaikan harga dan dividen, tetapi nilainya dapat berfluktuasi tajam.</p>
            <div class="wm-return-box">
              <small>ASUMSI JANGKA PANJANG UNTUK PLANNING</small>
              <strong>± 8–12%+ <span>/ tahun</span></strong>
              <p>Bukan return tahunan tetap. Dalam satu tahun saham bisa menghasilkan return negatif maupun jauh di atas asumsi.</p>
            </div>
            <div class="wm-asset-points"><span><b>Cocok</b> → tujuan jangka panjang dan investor yang mampu menghadapi volatilitas.</span><span><b>Tidak ideal</b> → dana yang dibutuhkan dalam waktu dekat atau tidak siap menghadapi drawdown.</span></div>
            <div class="wm-asset-risk"><b>Risiko utama</b><span>Volatilitas harga, risiko bisnis/emiten, konsentrasi portofolio, dan potensi kehilangan modal.</span></div>
          </article>
        </div>

        <div class="wm-risk-return-map">
          <div class="wm-map-copy"><small>RISK–RETURN MAP</small><strong>Potensi return meningkat → risiko juga meningkat.</strong><p>Jangan memilih produk hanya karena angka return tertinggi. Wealth Planner di bawah akan mencocokkan produk dengan tujuan, waktu, kemampuan finansial, dan kenyamanan risiko.</p></div>
          <div class="wm-map-track" aria-label="Peta risiko dan potensi return">
            <span class="low">RD Pasar Uang</span>
            <span class="low-mid">Obligasi / RDPT</span>
            <span class="mid">RD Campuran</span>
            <span class="mid-high">RD Saham</span>
            <span class="high">Saham</span>
          </div>
        </div>

        <div class="wm-products-source">
          <span>Produk: mengacu pada informasi resmi Mirae Asset Sekuritas. Mirae juga menyediakan ETF dan Structured Warrant; fitur Wealth ini difokuskan pada tiga kelas aset utama di atas.</span>
          <span>Estimasi return: asumsi ilustratif Analisaku untuk perencanaan jangka menengah/panjang, bukan target, bukan jaminan, dan bukan proyeksi resmi Mirae Asset.</span>
        </div>

        <div class="wm-products-cta">
          <div><small>SUDAH PAHAM PILIHANNYA?</small><strong>Sekarang cari kombinasi yang paling sesuai untuk Anda.</strong></div>
          <a href="#wealth-form" class="wm-product-start">Mulai Wealth Plan →</a>
        </div>
      </div>`;

    form.parentNode.insertBefore(section,form);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
