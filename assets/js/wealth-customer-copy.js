/* Wealth Management v1.10.0 — clear, professional customer-facing language */
(function(){
  const VERSION='1.10.0';
  let scheduled=false;
  const text=(selector,value,root=document)=>{const el=root?.querySelector?.(selector);if(el&&el.textContent!==value)el.textContent=value;};
  const html=(selector,value,root=document)=>{const el=root?.querySelector?.(selector);if(el&&el.innerHTML!==value)el.innerHTML=value;};
  const mode=()=>document.body.dataset.wealthStandalone||document.body.dataset.wealthMode||window.ANALISAKU_WEALTH_ROUTE?.mode||'goal';

  const COPY={
    goal:{
      progress:['01 Tujuan','02 Jangka Waktu','03 Kondisi Keuangan','04 Risiko & Pengalaman','05 Rencana'],
      chips:['Tujuan','Jangka Waktu','Likuiditas','Kondisi Keuangan','Pengalaman','Risiko'],
      introStrong:'Lengkapi informasi utama untuk menyusun rencana investasi yang lebih sesuai dengan target Anda.',
      intro:'Pertanyaan berikut membantu menilai jangka waktu, kebutuhan likuiditas, kesiapan keuangan, pengalaman, dan kenyamanan Anda terhadap risiko.',
      steps:{
        2:['02 • JANGKA WAKTU & LIKUIDITAS','Kapan dana ini akan dibutuhkan?','Jangka waktu dan fleksibilitas target membantu menentukan seberapa besar fluktuasi yang masih dapat diterima dalam rencana Anda.'],
        3:['03 • KONDISI KEUANGAN','Bagaimana kesiapan keuangan Anda untuk mencapai target ini?','Dana darurat, kestabilan arus kas, dan besarnya target dibanding aset finansial membantu menentukan tingkat risiko yang masih wajar.'],
        4:['04 • RISIKO & PENGALAMAN','Bagaimana Anda menghadapi risiko dan fluktuasi investasi?','Respons saat pasar turun dan pengalaman investasi membantu menggambarkan tingkat risiko yang lebih sesuai untuk rencana Anda.']
      },
      questions:[
        ['JANGKA WAKTU','Kapan dana target ini harus tersedia?','Jangka waktu menjadi acuan utama dalam menentukan komposisi investasi.'],
        ['FLEKSIBILITAS TARGET','Jika pasar belum ideal, apakah waktu target dapat digeser?','Target yang harus tersedia pada tanggal tertentu membutuhkan porsi aset yang lebih stabil.'],
        ['DANA DARURAT','Bagaimana kesiapan dana darurat Anda di luar dana untuk target ini?','Dana darurat yang terpisah membantu menjaga rencana investasi ketika muncul kebutuhan mendadak.'],
        ['INVESTASI BERKALA','Seberapa konsisten Anda dapat berinvestasi setiap bulan hingga target?','Konsistensi investasi membantu membuat kebutuhan bulanan dan proyeksi target lebih realistis.'],
        ['BESAR TARGET','Seberapa besar nilai target ini dibanding aset finansial likuid Anda?','Semakin besar porsinya, semakin penting menjaga risiko agar target tidak terganggu saat dana dibutuhkan.'],
        ['SAAT PASAR TURUN','Jika 1–2 tahun sebelum target nilai investasi turun sekitar 15%, apa yang kemungkinan Anda lakukan?','Skenario ini membantu memahami respons Anda ketika target semakin dekat tetapi pasar sedang berfluktuasi.'],
        ['PENGALAMAN INVESTASI','Instrumen investasi apa yang sudah pernah Anda gunakan dan pahami?','Pengalaman membantu menilai kesiapan Anda menghadapi karakter risiko dari setiap instrumen.']
      ]
    },
    lump:{
      progress:['01 Dana','02 Jangka Waktu','03 Kondisi Keuangan','04 Risiko & Pengalaman','05 Alokasi'],
      chips:['Dana','Jangka Waktu','Likuiditas','Kondisi Keuangan','Pengalaman','Risiko'],
      introStrong:'Kenali kebutuhan dana sebelum menentukan alokasi investasi.',
      intro:'Pertanyaan berikut membantu menilai jangka waktu, kebutuhan pencairan, kesiapan dana, pengalaman, dan tingkat risiko yang dapat diterima.',
      steps:{
        2:['02 • JANGKA WAKTU & LIKUIDITAS','Berapa lama dana ini dapat diinvestasikan?','Jangka waktu dan kebutuhan pencairan membantu menentukan seberapa besar porsi dana yang dapat ditempatkan pada aset berfluktuasi.'],
        3:['03 • KONDISI KEUANGAN','Apakah dana ini siap dialokasikan untuk investasi?','Sumber dana, kebutuhan hidup, dana darurat, dan besarnya dana dibanding aset finansial perlu dipertimbangkan sebelum menentukan alokasi.'],
        4:['04 • RISIKO & PENGALAMAN','Bagaimana Anda menghadapi perubahan nilai investasi?','Respons terhadap penurunan dan pengalaman mengelola investasi membantu menentukan tingkat risiko yang lebih sesuai.']
      },
      questions:[
        ['JANGKA WAKTU','Berapa lama dana ini dapat diinvestasikan sebelum digunakan?','Jangka waktu yang lebih panjang memberi ruang lebih besar untuk aset yang nilainya dapat berfluktuasi.'],
        ['KEBUTUHAN PENCAIRAN','Berapa bagian dana yang mungkin perlu dicairkan dalam 12 bulan?','Semakin besar kebutuhan pencairan, semakin penting menjaga likuiditas dan kestabilan sebagian portofolio.'],
        ['KESIAPAN DANA','Bagaimana kesiapan dana ini untuk diinvestasikan?','Dana investasi sebaiknya berasal dari dana yang tidak dibutuhkan untuk kewajiban jangka pendek.'],
        ['KEBUTUHAN PENGHASILAN','Apakah kebutuhan hidup rutin bergantung pada hasil investasi dari dana ini?','Semakin besar ketergantungan terhadap hasil investasi, semakin terbatas ruang untuk mengambil risiko.'],
        ['PORSI KEKAYAAN','Berapa besar dana ini dibanding aset finansial likuid Anda?','Semakin besar porsinya, semakin besar dampak perubahan nilai investasi terhadap kondisi keuangan secara keseluruhan.'],
        ['SAAT NILAI TURUN','Jika nilai investasi turun 15%–20%, apa respons yang paling mungkin Anda ambil?','Pilih respons yang paling menggambarkan keputusan yang kemungkinan benar-benar Anda lakukan.'],
        ['PENGALAMAN INVESTASI','Seberapa familiar Anda mengelola portofolio investasi?','Yang dipertimbangkan bukan hanya pernah membeli produk, tetapi juga pemahaman terhadap risiko dan proses pengambilan keputusan.']
      ]
    },
    buffer:{
      progress:['01 Modal & Buffer','02 Likuiditas','03 Kondisi Keuangan','04 Risiko & Pengalaman','05 Strategi'],
      chips:['Cadangan Likuid','Modal Aktif','Arus Kas','Konsentrasi','Risiko','Pengalaman'],
      introStrong:'Pisahkan kebutuhan likuiditas dari modal yang digunakan di pasar.',
      intro:'Pertanyaan berikut membantu menilai fungsi cadangan likuid, ketergantungan pada hasil pasar, konsentrasi modal, batas risiko, dan pengalaman investasi atau trading.',
      steps:{
        2:['02 • LIKUIDITAS & MODAL AKTIF','Bagaimana fungsi cadangan likuid dan modal aktif Anda?','Cadangan likuid menjaga fleksibilitas, sedangkan modal aktif dapat mengambil risiko pasar sesuai jangka waktu dan kondisi keuangan Anda.'],
        3:['03 • KONDISI KEUANGAN','Apakah modal aktif terpisah dari kebutuhan utama?','Dana darurat, kebutuhan hidup, dan modal investasi atau trading sebaiknya memiliki fungsi yang jelas dan tidak saling menggantikan.'],
        4:['04 • RISIKO & PENGALAMAN','Bagaimana Anda mengelola risiko investasi atau trading?','Batas kerugian, pengalaman eksekusi, diversifikasi, dan pemahaman fasilitas brokerage membantu menentukan tingkat risiko yang lebih tepat.']
      },
      questions:[
        ['JANGKA WAKTU MODAL AKTIF','Berapa lama modal aktif dapat digunakan tanpa mengganggu kebutuhan lain?','Jangka waktu membantu menentukan seberapa besar porsi modal yang dapat ditempatkan pada aset berfluktuasi.'],
        ['FUNGSI CADANGAN LIKUID','Seberapa sering cadangan likuid kemungkinan akan digunakan?','Semakin sering digunakan, semakin penting menempatkannya pada instrumen yang mudah dicairkan dan relatif stabil.'],
        ['DANA DARURAT','Apakah dana darurat rumah tangga sudah terpisah dari cadangan likuid untuk investasi atau trading?','Cadangan likuid di portofolio sebaiknya bukan satu-satunya sumber dana darurat pribadi.'],
        ['KETERGANTUNGAN PADA HASIL PASAR','Apakah pengeluaran rutin Anda bergantung pada keuntungan investasi atau trading?','Ketergantungan yang tinggi terhadap hasil pasar mengurangi ruang untuk mengambil risiko.'],
        ['PORSI MODAL','Berapa besar total modal investasi atau trading dibanding aset finansial likuid Anda?','Semakin besar porsinya, semakin besar dampak kerugian terhadap kondisi keuangan secara keseluruhan.'],
        ['BATAS RISIKO','Pada tingkat penurunan berapa Anda akan mulai mengurangi risiko?','Pertanyaan ini membantu mengenali batas risiko sebelum kerugian menjadi terlalu besar untuk kondisi keuangan Anda.'],
        ['PENGALAMAN INVESTASI / TRADING','Seberapa familiar Anda dengan aktivitas investasi, trading, dan fasilitas brokerage?','Pengalaman eksekusi dan pemahaman risiko membantu menentukan penggunaan instrumen serta fasilitas yang lebih tepat.']
      ]
    }
  };

  function replaceText(root=document){
    if(!root)return;
    const replacements=[
      ['Product Fit','Pilihan Kelas Aset'],['product fit','pilihan kelas aset'],
      ['financial projection','proyeksi dana'],['Financial projection','Proyeksi dana'],
      ['next action','langkah berikutnya'],['Next Action','Langkah Berikutnya'],
      ['Risk appetite','Kenyamanan terhadap risiko'],['risk appetite','kenyamanan terhadap risiko'],
      ['Lump sum','Dana sekaligus'],['lump sum','dana sekaligus'],
      ['drawdown','penurunan nilai'],['Drawdown','Penurunan nilai'],
      ['exposure','porsi'],['Exposure','Porsi'],
      ['core portfolio','portofolio inti'],['Core Portfolio','Portofolio Inti'],
      ['trading capital','modal investasi/trading'],['Trading capital','Modal investasi/trading'],
      ['position sizing','pengaturan ukuran posisi'],['Position sizing','Pengaturan ukuran posisi'],
      ['weighted average return','rata-rata return portofolio'],['Weighted average return','Rata-rata return portofolio'],
      ['Cash Flow','Arus Kas'],['cash flow','arus kas'],
      ['Deadline','Jangka Waktu'],['deadline','jangka waktu'],
      ['dry powder','cadangan untuk peluang pasar']
    ];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(!node.nodeValue||!node.nodeValue.trim())return;let value=node.nodeValue;replacements.forEach(([a,b])=>{value=value.split(a).join(b)});if(value!==node.nodeValue)node.nodeValue=value;});
  }

  function patchHero(){
    text('.wealth-hero .kicker','WEALTH MANAGEMENT');
    const badge=document.querySelector('.wm-version-badge');
    if(badge&&badge.textContent!==`WEALTH v${VERSION}`)badge.textContent=`WEALTH v${VERSION}`;
    if(document.body.dataset.wealthLanding==='true')return;
    const labels=['Pilih Kebutuhan','Jangka Waktu','Kondisi Keuangan','Risiko & Pengalaman','Rencana'];
    document.querySelectorAll('.wealth-hero .wm-flowline span').forEach((el,i)=>{if(labels[i]&&el.textContent!==labels[i])el.textContent=labels[i];});
  }

  function patchBaseFields(){
    const step=document.getElementById('step-1');if(!step)return;
    const fields=[...step.querySelectorAll('.wm-field')];
    const labels=[
      ['Target dana dalam nilai hari ini','Masukkan perkiraan nilai kebutuhan berdasarkan kondisi saat ini.'],
      ['Dana awal yang tersedia','Dana yang sudah siap digunakan untuk rencana ini.'],
      ['Jangka waktu menuju target','Masukkan perkiraan waktu sampai dana akan digunakan.'],
      ['Rencana investasi bulanan','Dana yang direncanakan untuk ditambahkan secara rutin setiap bulan.'],
      ['Preferensi investasi','Pilih preferensi konvensional, syariah, atau keduanya.'],
      ['Asumsi inflasi / tahun','Digunakan untuk memperkirakan nilai kebutuhan pada masa mendatang.']
    ];
    fields.forEach((field,i)=>{if(!labels[i])return;text('label',labels[i][0],field);text('small',labels[i][1],field);});
    const goals=[
      ['Dana Pendidikan','Sekolah / kuliah anak'],
      ['DP Rumah / Hunian','Rumah pertama atau upgrade hunian'],
      ['Beli Kendaraan','Mobil atau motor'],
      ['Dana Darurat','Cadangan untuk kebutuhan tak terduga'],
      ['Dana Pensiun','Persiapan kebutuhan jangka panjang'],
      ['Rencana Kustom','Target sesuai kebutuhan Anda']
    ];
    step.querySelectorAll('.goal-card').forEach((card,i)=>{if(!goals[i])return;text('strong',goals[i][0],card);text('small',goals[i][1],card);});
  }

  function patchModeQuestionnaire(){
    const cfg=COPY[mode()]||COPY.goal;
    document.querySelectorAll('.wm-progress a').forEach((a,i)=>{if(cfg.progress[i]&&a.textContent!==cfg.progress[i])a.textContent=cfg.progress[i];});
    [2,3,4].forEach(stepNo=>{
      const meta=cfg.steps[stepNo],head=document.querySelector(`#step-${stepNo} .wm-step-head>div:last-child`);if(!meta||!head)return;
      text('small',meta[0],head);text('h2',meta[1],head);text('p',meta[2],head);
    });
    document.querySelectorAll('.wm-mode-questionnaire').forEach(panel=>{
      text('.wm-mode-q-intro strong',cfg.introStrong,panel);
      text('.wm-mode-q-intro p',cfg.intro,panel);
      panel.querySelectorAll('.wm-q-pillars em').forEach((el,i)=>{if(cfg.chips[i]&&el.textContent!==cfg.chips[i])el.textContent=cfg.chips[i];});
      panel.querySelectorAll('.wm-mode-q-card').forEach((card,i)=>{
        const q=cfg.questions[i];if(!q)return;
        text('.wm-mode-q-body small',q[0],card);
        text('.wm-mode-q-body h3',q[1],card);
        text('.wm-mode-q-body p',q[2],card);
      });
    });
    const auto=document.querySelector('#step-4 .wm-auto-card');
    if(auto){text('small','SETELAH SEMUA JAWABAN LENGKAP',auto);text('strong','Lihat ringkasan rencana investasi Anda',auto);text('p','Informasi yang Anda berikan akan dirangkum menjadi profil investasi, pilihan kelas aset, komposisi portofolio, dan proyeksi dana.',auto);text('em','Satu rangkaian jawaban untuk satu rencana yang terhubung',auto);}
    const submit=document.querySelector('#step-4 .wm-submit-wrap');
    if(submit){text('p','Setelah semua pertanyaan dijawab, Anda dapat melihat ringkasan profil investasi, pilihan kelas aset, komposisi portofolio, proyeksi dana, dan mengunduh PDF ringkasan.',submit);text('#wmBuildPlan','Lihat Rencana Investasi Saya →',submit);}
  }

  function patchProductIntro(){
    const section=document.getElementById('wealth-products');if(!section)return;
    text('.wm-products-head .kicker','KENALI PILIHAN INVESTASI',section);
    text('.wm-products-head h2','Pahami pilihan investasi sebelum menyusun portofolio.',section);
    html('.wm-products-head p','Mirae Asset Sekuritas menyediakan akses ke berbagai instrumen pasar modal. Wealth Plan ini berfokus pada <b>Reksa Dana, Obligasi, dan Saham</b> sebagai fondasi perencanaan. ETF dapat digunakan sebagai alternatif diversifikasi, sedangkan fasilitas leverage atau produk berisiko tinggi tidak otomatis dimasukkan ke dalam rencana awal.',section);
    text('.wm-risk-return-map .wm-map-copy small','PETA RISIKO & POTENSI HASIL',section);
    text('.wm-risk-return-map .wm-map-copy strong','Potensi hasil yang lebih tinggi biasanya disertai fluktuasi dan risiko yang lebih besar.',section);
    text('.wm-risk-return-map .wm-map-copy p','Pemilihan instrumen mempertimbangkan tujuan, jangka waktu, kebutuhan likuiditas, kondisi keuangan, pengalaman, dan kenyamanan Anda terhadap risiko—bukan hanya asumsi return.',section);
    const note=section.querySelectorAll('.wm-return-note')[1];
    if(note){text('small','PORSI SAHAM DALAM PORTOFOLIO',note);text('strong','Porsi saham mengikuti jangka waktu dan kemampuan menghadapi risiko.',note);text('span','Untuk horizon yang lebih panjang dan kondisi keuangan yang memadai, porsi ekuitas dapat lebih besar. Sistem tetap mempertimbangkan kebutuhan likuiditas dan batas risiko Anda.',note);}
    text('.wm-products-cta small','SIAP MENYUSUN RENCANA?',section);
    text('.wm-products-cta strong','Pilih kebutuhan yang paling sesuai dengan kondisi dana Anda.',section);
    text('.wm-product-start','Pilih Kebutuhan →',section);
  }

  function patchReturnBox(){
    const box=document.getElementById('wmReturnAssumptions');if(!box)return;
    text('.wm-return-head small','ASUMSI RETURN UNTUK SIMULASI',box);
    text('.wm-return-head strong','Gunakan asumsi standar atau sesuaikan dengan skenario Anda.',box);
    text('.wm-return-head p','Asumsi return digunakan untuk menghitung proyeksi nilai investasi. Angka ini bukan target dan bukan jaminan hasil.',box);
    text('.wm-return-foot span','Hasil investasi aktual dapat lebih tinggi atau lebih rendah dari simulasi dan dapat mengalami kerugian.',box);
    text('.wm-return-reset','Kembalikan ke asumsi standar',box);
  }

  function patchResult(){
    const result=document.getElementById('wealth-result');if(!result)return;
    text('.wm-step-head small','RINGKASAN RENCANA',result);
    text('.wm-step-head h2','Ringkasan rencana investasi Anda',result);
    text('.wm-step-head p','Lihat profil investasi, pilihan kelas aset, komposisi portofolio, proyeksi dana, dan langkah berikutnya berdasarkan informasi yang Anda berikan.',result);
    const cards=[...result.querySelectorAll('.wm-result-card')];
    if(cards[0]){text('small','TUJUAN / KEBUTUHAN',cards[0]);}
    if(cards[1]){
      text('small','PROFIL INVESTASI',cards[1]);
      text('.wm-level span','/ 5 tingkat risiko pada rencana',cards[1]);
      const lenses=[...cards[1].querySelectorAll('.wm-lenses-result>div')];
      if(lenses[0]){text('small','JANGKA WAKTU',lenses[0]);text('span','waktu & kebutuhan likuiditas',lenses[0]);}
      if(lenses[1]){text('small','KONDISI KEUANGAN',lenses[1]);text('span','kesiapan finansial',lenses[1]);}
      if(lenses[2]){text('small','RISIKO & PENGALAMAN',lenses[2]);text('span','toleransi & pengalaman investasi',lenses[2]);}
    }
    if(cards[2]){text('small','PILIHAN KELAS ASET',cards[2]);text('h3','Instrumen yang dapat dipertimbangkan',cards[2]);text('p','Pilihan mempertimbangkan tujuan, jangka waktu, kebutuhan likuiditas, kondisi keuangan, pengalaman, dan tingkat risiko dalam rencana Anda.',cards[2]);}
    if(cards[3]){text('small','KOMPOSISI PORTOFOLIO',cards[3]);text('h3','Ilustrasi komposisi investasi',cards[3]);}
    const profileCopy=document.getElementById('resultProfileCopy');
    if(profileCopy&&profileCopy.textContent.startsWith('Batas risiko mengikuti faktor paling rendah:'))profileCopy.textContent=profileCopy.textContent.replace('Batas risiko mengikuti faktor paling rendah:','Rencana ini mempertimbangkan seluruh jawaban Anda. Faktor yang paling membatasi saat ini:');
    text('.wm-disclaimer:not(#wmFormError)','Simulasi ini merupakan panduan awal dan bukan jaminan hasil investasi maupun pengganti profil risiko resmi. Sebelum bertransaksi, pelajari karakteristik produk, prospektus atau fund fact sheet, biaya, pajak, likuiditas, serta risiko yang berlaku.',result);
    text('#wmEditPlan','Ubah Data & Jawaban',result);
    text('#wmDownloadPdf','Unduh Ringkasan PDF',result);
    text('.wm-next small','LANGKAH BERIKUTNYA',result);
  }

  function patchEquitySleeve(){
    const panel=document.getElementById('wmEquitySleeve');if(!panel)return;
    text('.wm-equity-head small','PENGATURAN PORSI SAHAM',panel);
    text('.wm-equity-head h3','Bagaimana porsi saham ingin dibagi?',panel);
    html('.wm-equity-head p','Total porsi saham sudah ditentukan oleh hasil rencana. Di bagian ini Anda dapat memilih pembagian antara <b>Core/Blue Chip, Dividend/Income, Growth/Second Liner, dan Tactical/Trading</b>.',panel);
    text('.wm-equity-cap small','TOTAL PORSI SAHAM DALAM RENCANA',panel);
    const guard=panel.querySelector('.wm-equity-guardrail');
    if(guard){
      const weight=(panel.querySelector('.wm-equity-cap b')?.textContent||'').trim();
      const value=`<b>Catatan:</b> total porsi saham ${weight||'yang telah ditetapkan'} tidak berubah. Pilihan ini hanya mengatur pembagian di dalam porsi saham. Untuk pilihan Custom, total pembagian harus 100%.`;
      if(guard.innerHTML!==value)guard.innerHTML=value;
    }
  }

  function patchProjection(){
    const panel=document.getElementById('wmFutureValue');if(!panel)return;
    text('.wm-fv-head small','PROYEKSI NILAI INVESTASI',panel);
    text('.wm-fv-head h3','Lihat kontribusi setiap bagian portofolio.',panel);
    text('.wm-fv-head p','Setiap instrumen dihitung berdasarkan dana yang ditempatkan, investasi berkala bila ada, dan asumsi return masing-masing. Nilai akhir merupakan hasil simulasi, bukan jaminan hasil investasi.',panel);
    text('.wm-yearly-head small','PROYEKSI TAHUNAN',panel);
    text('.wm-yearly-head h3','Lihat perkembangan proyeksi dari tahun ke tahun.',panel);
    text('.wm-yearly-head p','Setiap tahun menampilkan dana yang sudah ditempatkan, estimasi hasil, dan proyeksi nilai portofolio berdasarkan asumsi yang digunakan.',panel);
  }

  function patchErrors(){
    const error=document.getElementById('wmFormError');if(!error||error.hidden)return;
    if(error.textContent.includes('KAPAN, MAMPU, dan NYAMAN')||error.textContent.includes('KAPAN'))error.textContent='Lengkapi seluruh pertanyaan tentang jangka waktu, kondisi keuangan, risiko, dan pengalaman agar rencana dapat dihitung dengan konsisten.';
  }

  function apply(){
    scheduled=false;
    patchHero();
    patchBaseFields();
    patchModeQuestionnaire();
    patchProductIntro();
    patchReturnBox();
    patchResult();
    patchEquitySleeve();
    patchProjection();
    patchErrors();
    replaceText(document.querySelector('main'));
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}
  function init(){
    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',event=>{if(event.target.closest('#wmBuildPlan,[data-equity-preset],#wmReturnReset,[data-plan-mode]'))setTimeout(apply,60);});
    window.ANALISAKU_WEALTH_COPY={version:VERSION,apply};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
