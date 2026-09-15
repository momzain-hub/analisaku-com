/* Wealth Management v1.9 — professional customer-facing copy */
(function(){
  const VERSION='1.9';
  let scheduled=false;
  function text(selector,value,root=document){const el=root.querySelector(selector);if(el&&el.textContent!==value)el.textContent=value;}
  function html(selector,value,root=document){const el=root.querySelector(selector);if(el&&el.innerHTML!==value)el.innerHTML=value;}

  function replaceText(root=document){
    if(!root)return;
    const replacements=[
      ['Product Fit','Kesesuaian Produk'],['product fit','kesesuaian produk'],
      ['financial projection','proyeksi dana'],['next action','langkah berikutnya'],
      ['Risk appetite','Kenyamanan terhadap risiko'],['risk appetite','kenyamanan terhadap risiko'],
      ['Lump sum','Dana sekaligus'],['lump sum','dana sekaligus'],
      ['drawdown','penurunan nilai'],['Drawdown','Penurunan nilai'],
      ['exposure','porsi'],['Exposure','Porsi'],
      ['core portfolio','portofolio inti'],['Core Portfolio','Portofolio Inti'],
      ['trading capital','modal investasi/trading'],['Trading capital','Modal investasi/trading'],
      ['position sizing','pengaturan ukuran posisi'],['Position sizing','Pengaturan ukuran posisi'],
      ['weighted average return','rata-rata return portofolio'],['Weighted average return','Rata-rata return portofolio']
    ];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(!node.nodeValue||!node.nodeValue.trim())return;let value=node.nodeValue;replacements.forEach(([a,b])=>{value=value.split(a).join(b)});if(value!==node.nodeValue)node.nodeValue=value;});
  }

  function patchHero(){
    text('.wealth-hero .kicker','WEALTH MANAGEMENT');
    const badge=document.querySelector('.wm-version-badge');
    if(badge&&badge.textContent!==`WEALTH v${VERSION}`)badge.textContent=`WEALTH v${VERSION}`;
  }

  function patchProductIntro(){
    const section=document.getElementById('wealth-products');if(!section)return;
    text('.wm-products-head .kicker','KENALI PILIHAN INVESTASI',section);
    text('.wm-products-head h2','Pahami peran setiap instrumen sebelum menyusun portofolio.',section);
    html('.wm-products-head p','Mirae Asset Sekuritas menyediakan akses ke berbagai instrumen pasar modal. Wealth Plan ini berfokus pada <b>Reksa Dana, Obligasi, dan Saham</b> sebagai fondasi perencanaan. ETF dapat digunakan sebagai alternatif diversifikasi, sedangkan fasilitas leverage atau produk berisiko tinggi tidak otomatis dimasukkan ke dalam rekomendasi awal.',section);
    text('.wm-risk-return-map .wm-map-copy small','PETA RISIKO & POTENSI HASIL',section);
    text('.wm-risk-return-map .wm-map-copy strong','Potensi hasil yang lebih tinggi biasanya disertai fluktuasi dan risiko yang lebih besar.',section);
    text('.wm-risk-return-map .wm-map-copy p','Pemilihan instrumen sebaiknya mempertimbangkan tujuan, jangka waktu, kebutuhan likuiditas, kondisi keuangan, pengalaman, dan kenyamanan terhadap risiko—bukan hanya estimasi return.',section);
    const note=section.querySelectorAll('.wm-return-note')[1];
    if(note){text('small','PORSI SAHAM DALAM PORTOFOLIO',note);text('strong','Porsi saham mengikuti kemampuan menanggung risiko dan horizon investasi.',note);text('span','Untuk horizon panjang dan kapasitas risiko yang memadai, porsi ekuitas dapat menjadi dominan. Sistem tetap membatasi porsi saham berdasarkan waktu, likuiditas, dan kondisi finansial.',note);}
    text('.wm-products-cta small','SIAP MENYUSUN RENCANA?',section);
    text('.wm-products-cta strong','Pilih jenis Wealth Plan yang paling sesuai dengan kondisi dana Anda.',section);
    text('.wm-product-start','Pilih Jenis Rencana →',section);
  }

  function patchReturnBox(){
    const box=document.getElementById('wmReturnAssumptions');if(!box)return;
    text('.wm-return-head small','ASUMSI RETURN',box);
    text('.wm-return-head strong','Gunakan asumsi standar atau sesuaikan dengan skenario Anda.',box);
    text('.wm-return-head p','Asumsi return hanya digunakan untuk simulasi proyeksi nilai investasi. Angka ini bukan target dan bukan jaminan hasil.',box);
    text('.wm-return-foot span','Return merupakan asumsi simulasi. Hasil aktual dapat lebih tinggi atau lebih rendah dan dapat mengalami kerugian.',box);
    text('.wm-return-reset','Kembalikan ke asumsi standar',box);
  }

  function patchResult(){
    const result=document.getElementById('wealth-result');if(!result)return;
    text('.wm-step-head small','RINGKASAN RENCANA',result);
    text('.wm-step-head h2','Ringkasan Wealth Plan Anda.',result);
    text('.wm-step-head p','Hasil berikut disusun dari informasi yang Anda berikan dan asumsi simulasi yang digunakan.',result);
    const cards=[...result.querySelectorAll('.wm-result-card')];
    if(cards[1]){text('small','PROFIL INVESTASI',cards[1]);text('.wm-level span','/ 5 tingkat risiko yang sesuai',cards[1]);}
    if(cards[2]){text('small','PILIHAN KELAS ASET',cards[2]);text('h3','Instrumen yang sesuai untuk dipertimbangkan',cards[2]);text('p','Kesesuaian mempertimbangkan tujuan, horizon, kebutuhan likuiditas, kondisi keuangan, pengalaman, dan kenyamanan Anda terhadap risiko.',cards[2]);}
    if(cards[3]){text('small','KOMPOSISI PORTOFOLIO',cards[3]);text('h3','Ilustrasi komposisi investasi',cards[3]);}
    const profileCopy=document.getElementById('resultProfileCopy');
    if(profileCopy&&profileCopy.textContent.startsWith('Batas risiko mengikuti faktor paling rendah:'))profileCopy.textContent=profileCopy.textContent.replace('Batas risiko mengikuti faktor paling rendah:','Rencana ini mempertimbangkan seluruh jawaban Anda. Faktor yang paling membatasi saat ini:');
    text('.wm-disclaimer:not(#wmFormError)','Simulasi ini merupakan panduan awal dan bukan jaminan hasil investasi maupun pengganti profil risiko resmi. Sebelum bertransaksi, pelajari karakteristik produk, prospektus atau fund fact sheet, biaya, pajak, likuiditas, serta risiko yang berlaku.',result);
    text('#wmDownloadPdf','Unduh Ringkasan PDF',result);text('.wm-next small','LANGKAH BERIKUTNYA',result);
  }

  function patchEquitySleeve(){
    const panel=document.getElementById('wmEquitySleeve');if(!panel)return;
    text('.wm-equity-head small','PENGATURAN PORSI SAHAM',panel);
    text('.wm-equity-head h3','Bagaimana Anda ingin membagi porsi saham?',panel);
    html('.wm-equity-head p','Total porsi saham sudah ditentukan oleh hasil rencana. Di bagian ini Anda hanya memilih bagaimana porsi tersebut dibagi antara <b>Core/Blue Chip, Dividend/Income, Growth/Second Liner, dan Tactical/Trading</b>.',panel);
    text('.wm-equity-cap small','TOTAL PORSI SAHAM DALAM RENCANA',panel);
    const guard=panel.querySelector('.wm-equity-guardrail');
    if(guard){
      const weight=(panel.querySelector('.wm-equity-cap b')?.textContent||'').trim();
      const value=`<b>Catatan:</b> total porsi saham ${weight||'yang telah ditetapkan'} tidak berubah. Pilihan ini hanya mengatur pembagian di dalam porsi saham. Untuk Custom, total pembagian harus 100%.`;
      if(guard.innerHTML!==value)guard.innerHTML=value;
    }
  }

  function patchProjection(){
    const panel=document.getElementById('wmFutureValue');if(!panel)return;
    text('.wm-fv-head small','PROYEKSI PER INSTRUMEN',panel);text('.wm-fv-head h3','Lihat kontribusi setiap bagian portofolio.',panel);text('.wm-fv-head p','Setiap instrumen dihitung berdasarkan dana yang ditempatkan, investasi berkala bila ada, dan asumsi return masing-masing. Nilai akhir adalah proyeksi, bukan nilai pasar yang dijamin.',panel);
    text('.wm-yearly-head small','PROYEKSI TAHUNAN',panel);text('.wm-yearly-head h3','Perkembangan dari tahun pertama hingga akhir.',panel);text('.wm-yearly-head p','Lihat dana yang sudah ditempatkan, estimasi hasil, dan proyeksi nilai portofolio pada setiap tahun.',panel);
  }

  function patchErrors(){
    const error=document.getElementById('wmFormError');if(!error||error.hidden)return;
    if(error.textContent.includes('KAPAN, MAMPU, dan NYAMAN'))error.textContent='Lengkapi seluruh pertanyaan tentang waktu, kemampuan finansial, dan kenyamanan risiko.';
  }

  function apply(){scheduled=false;patchHero();patchProductIntro();patchReturnBox();patchResult();patchEquitySleeve();patchProjection();patchErrors();replaceText(document.querySelector('main'));}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}
  function init(){apply();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});document.addEventListener('click',event=>{if(event.target.closest('#wmBuildPlan,[data-equity-preset],#wmReturnReset'))setTimeout(apply,40);});window.ANALISAKU_WEALTH_COPY={version:VERSION,apply};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
