/* Wealth Management v1.9 — brokerage-oriented, mode-specific questionnaires */
(function(){
  const VERSION='1.9';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const CONFIG={
    goal:{
      label:'KEJAR TARGET',
      intro:'Fokus pada kapan dana harus tersedia, kemampuan menjaga investasi berkala, kebutuhan likuiditas, pengalaman, dan kenyamanan menghadapi fluktuasi.',
      chips:['Tujuan','Deadline','Likuiditas','Kapasitas','Pengalaman','Risiko'],
      progress:['01 Tujuan','02 Waktu','03 Kapasitas','04 Preferensi Risiko','05 Rencana'],
      steps:{
        2:{small:'02 • WAKTU & KEPASTIAN TARGET',title:'Kapan dana harus tersedia?',copy:'Jangka waktu dan fleksibilitas target menjadi batas utama. Semakin dekat dan semakin tidak fleksibel targetnya, semakin penting menjaga kestabilan nilai.'},
        3:{small:'03 • KAPASITAS FINANSIAL',title:'Seberapa kuat target ini dibiayai?',copy:'Rencana yang sehat mempertimbangkan dana darurat, kestabilan arus kas, dan seberapa besar target ini dibanding aset finansial yang Anda miliki.'},
        4:{small:'04 • PREFERENSI & PENGALAMAN',title:'Bagaimana Anda menghadapi perubahan nilai?',copy:'Kenyamanan terhadap risiko dinilai bersama pengalaman investasi. Untuk tujuan yang mendekati jatuh tempo, kemampuan menanggung penurunan biasanya ikut mengecil.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'JANGKA WAKTU',title:'Berapa lama lagi dana target harus tersedia?',copy:'Digunakan sebagai horizon utama dalam menentukan kelas aset.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'FLEKSIBILITAS TARGET',title:'Jika kondisi pasar belum ideal, seberapa fleksibel waktu target?',copy:'Target yang wajib tersedia pada tanggal tertentu membutuhkan pendekatan yang lebih defensif.',choices:[[1,'Tidak fleksibel — harus tersedia tepat waktu'],[2,'Bisa mundur kurang dari 6 bulan'],[3,'Bisa mundur sekitar 6–18 bulan'],[4,'Sangat fleksibel — dapat mundur lebih dari 18 bulan']]},
        {step:3,name:'qEmergency',eyebrow:'DANA DARURAT',title:'Di luar dana untuk target ini, bagaimana dana darurat Anda?',copy:'Dana darurat yang terpisah membantu menghindari penjualan investasi karena kebutuhan mendadak.',choices:[[1,'Belum tersedia'],[2,'Kurang dari 3 bulan pengeluaran'],[3,'Sekitar 3–6 bulan pengeluaran'],[4,'Lebih dari 6 bulan pengeluaran']]},
        {step:3,name:'qIncome',eyebrow:'KONSISTENSI INVESTASI',title:'Seberapa konsisten Anda dapat menjaga investasi bulanan sampai target?',copy:'Kemampuan menjaga arus investasi lebih penting daripada mengejar asumsi return yang terlalu tinggi.',choices:[[1,'Tidak pasti / sering berpotensi terhenti'],[2,'Cukup stabil tetapi masih dapat terhenti'],[3,'Stabil dan realistis untuk dijaga'],[4,'Sangat stabil dan masih memiliki ruang untuk dinaikkan']]},
        {step:3,name:'qExposure',eyebrow:'MATERIALITAS TARGET',title:'Seberapa besar kebutuhan target ini dibanding aset finansial likuid Anda?',copy:'Semakin besar porsinya, semakin besar dampak jika nilai investasi turun saat dana dibutuhkan.',choices:[[4,'Kurang dari 20%'],[3,'20%–40%'],[2,'Lebih dari 40%–70%'],[1,'Lebih dari 70%']]},
        {step:4,name:'qDrawdown',eyebrow:'SAAT PASAR TURUN',title:'Jika 1–2 tahun sebelum target nilai portofolio turun sekitar 15%, apa yang paling mungkin Anda lakukan?',copy:'Skenario ini membantu mengukur kenyamanan risiko dalam konteks target yang semakin dekat.',choices:[[1,'Mengamankan sebagian besar dana agar target tidak terancam'],[2,'Mengurangi aset berisiko secara signifikan'],[3,'Menahan sambil mengevaluasi dan melakukan rebalancing'],[4,'Menambah bertahap bila target dan kondisi finansial masih aman']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN PRODUK',title:'Instrumen mana yang sudah pernah Anda gunakan dan benar-benar pahami?',copy:'Pengalaman produk membantu menilai kesiapan menghadapi karakter risiko yang berbeda.',choices:[[1,'Belum pernah / hanya tabungan atau deposito'],[2,'Reksa Dana Pasar Uang / instrumen defensif'],[3,'Obligasi, RD Pendapatan Tetap, RD Campuran, atau ETF'],[4,'Saham langsung / RD Saham dan memahami volatilitas, diversifikasi, serta eksekusi transaksi']]}
      ]
    },
    lump:{
      label:'DANA SUDAH ADA',
      intro:'Fokus pada kualitas dana yang akan diinvestasikan, horizon, kebutuhan pencairan, konsentrasi kekayaan, pengalaman pasar, dan kemampuan menanggung penurunan sejak awal.',
      chips:['Modal','Likuiditas','Sumber Dana','Konsentrasi','Pengalaman','Risiko'],
      progress:['01 Modal','02 Likuiditas','03 Ketahanan Modal','04 Preferensi Risiko','05 Alokasi'],
      steps:{
        2:{small:'02 • HORIZON & LIKUIDITAS',title:'Berapa lama modal ini dapat bekerja?',copy:'Karena dana tersedia sejak awal, seluruh modal dapat langsung terpapar pergerakan pasar. Horizon dan kebutuhan pencairan perlu dinilai terlebih dahulu.'},
        3:{small:'03 • KETAHANAN MODAL',title:'Apakah dana ini benar-benar siap diinvestasikan?',copy:'Penilaian mempertimbangkan apakah dana berasal dari surplus, apakah kebutuhan darurat sudah terpisah, dan seberapa besar modal ini dibanding aset finansial Anda.'},
        4:{small:'04 • PREFERENSI & PENGALAMAN',title:'Seberapa besar fluktuasi yang dapat Anda terima?',copy:'Dana sekaligus dapat mengalami perubahan nilai penuh sejak awal. Respons terhadap penurunan dan pengalaman produk perlu dibaca bersama.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'HORIZON INVESTASI',title:'Berapa lama dana ini dapat dibiarkan bekerja tanpa digunakan?',copy:'Horizon yang lebih panjang memberi ruang lebih besar untuk aset yang berfluktuasi.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'KEBUTUHAN PENCAIRAN',title:'Berapa porsi dana ini yang mungkin dibutuhkan dalam 12 bulan?',copy:'Semakin besar kebutuhan pencairan, semakin penting menjaga likuiditas dan kestabilan.',choices:[[1,'Lebih dari 50%'],[2,'25%–50%'],[3,'10%–25%'],[4,'Kurang dari 10% / hampir tidak diperlukan']]},
        {step:3,name:'qEmergency',eyebrow:'KESIAPAN DANA',title:'Mana yang paling menggambarkan sumber dan kesiapan dana ini?',copy:'Dana investasi idealnya berasal dari dana sendiri yang tidak dibutuhkan untuk kewajiban jangka pendek.',choices:[[1,'Sebagian berasal dari pinjaman / dana yang akan segera dibutuhkan'],[2,'Dana sendiri, tetapi masih bercampur dengan kebutuhan darurat'],[3,'Dana sendiri dan dana darurat sekitar 3–6 bulan sudah terpisah'],[4,'Dana surplus; dana darurat lebih dari 6 bulan dan kewajiban jangka pendek sudah terpisah']]},
        {step:3,name:'qIncome',eyebrow:'KETERGANTUNGAN PENGHASILAN',title:'Seberapa besar kebutuhan hidup rutin bergantung pada hasil dari modal ini?',copy:'Jika kebutuhan hidup bergantung pada hasil investasi, kapasitas mengambil risiko menjadi lebih terbatas.',choices:[[1,'Sangat bergantung'],[2,'Cukup bergantung'],[3,'Hanya sebagian kecil'],[4,'Tidak bergantung sama sekali']]},
        {step:3,name:'qExposure',eyebrow:'KONSENTRASI KEKAYAAN',title:'Modal ini setara dengan berapa porsi aset finansial likuid Anda?',copy:'Semakin terkonsentrasi, semakin besar dampak penurunan terhadap kondisi finansial keseluruhan.',choices:[[4,'Kurang dari 20%'],[3,'20%–40%'],[2,'Lebih dari 40%–70%'],[1,'Lebih dari 70%']]},
        {step:4,name:'qDrawdown',eyebrow:'SKENARIO PENURUNAN',title:'Jika nilai modal turun 15%–20% setelah diinvestasikan, apa respons yang paling mungkin?',copy:'Tidak ada jawaban benar atau salah; pilih respons yang paling mencerminkan perilaku Anda.',choices:[[1,'Mengamankan mayoritas dana untuk menghentikan penurunan'],[2,'Mengurangi sebagian besar aset berisiko'],[3,'Menahan dan mengevaluasi sesuai rencana'],[4,'Menambah bertahap bila kondisi finansial dan tesis investasi masih mendukung']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN PASAR',title:'Seberapa familiar Anda mengelola portofolio dengan nilai yang material?',copy:'Yang dinilai bukan sekadar pernah membeli, tetapi pemahaman terhadap risiko dan proses pengambilan keputusan.',choices:[[1,'Belum pernah mengelola investasi'],[2,'Terbiasa dengan RDPU / deposito / instrumen defensif'],[3,'Terbiasa dengan obligasi, ETF, RDPT, atau RD Campuran'],[4,'Terbiasa dengan saham langsung / RD Saham dan memahami volatilitas, diversifikasi, serta eksekusi transaksi']]}
      ]
    },
    buffer:{
      label:'INVESTOR / TRADER + CASH BUFFER',
      intro:'Fokus pada pemisahan likuiditas dan modal aktif, ketergantungan pada profit pasar, konsentrasi modal, batas kerugian, serta pengalaman menggunakan fasilitas brokerage.',
      chips:['Buffer','Modal Aktif','Cash Flow','Konsentrasi','Batas Rugi','Pengalaman'],
      progress:['01 Modal & Buffer','02 Likuiditas','03 Ketahanan Modal','04 Risiko Trading','05 Strategi'],
      steps:{
        2:{small:'02 • LIKUIDITAS & MODAL AKTIF',title:'Mana dana yang harus selalu siap?',copy:'Cash buffer berfungsi menjaga fleksibilitas. Modal aktif di luar buffer baru dapat mengambil risiko pasar sesuai horizon dan kondisi finansial Anda.'},
        3:{small:'03 • KETAHANAN INVESTOR / TRADER',title:'Apakah modal aktif benar-benar terpisah dari kebutuhan hidup?',copy:'Trading buffer bukan pengganti dana darurat. Ketergantungan pada profit pasar dan konsentrasi modal menjadi pembatas penting.'},
        4:{small:'04 • RISIKO & PENGALAMAN BROKERAGE',title:'Seberapa besar risiko yang dapat dikelola secara disiplin?',copy:'Untuk investor/trader aktif, batas kerugian, pengalaman eksekusi, diversifikasi, dan pemahaman fasilitas leverage lebih relevan daripada sekadar label agresif.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'HORIZON MODAL AKTIF',title:'Untuk porsi di luar cash buffer, berapa lama modal utama dapat dibiarkan bekerja?',copy:'Horizon ini membatasi seberapa besar porsi aset berfluktuasi dapat digunakan.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'FUNGSI CASH BUFFER',title:'Seberapa sering cash buffer kemungkinan digunakan?',copy:'Semakin sering digunakan, semakin besar kebutuhan instrumen yang cepat dicairkan dan stabil.',choices:[[1,'Sering — untuk kebutuhan bulanan / sangat dekat'],[2,'Beberapa kali dalam setahun'],[3,'Sesekali untuk peluang pasar atau kebutuhan tak terduga'],[4,'Jarang — hanya untuk kondisi khusus / dry powder']]},
        {step:3,name:'qEmergency',eyebrow:'DANA DARURAT TERPISAH',title:'Apakah dana darurat rumah tangga sudah terpisah dari cash buffer investasi/trading?',copy:'Cash buffer pasar sebaiknya tidak menjadi satu-satunya sumber dana darurat pribadi.',choices:[[1,'Belum — buffer juga menjadi dana darurat utama'],[2,'Sebagian sudah terpisah, tetapi belum memadai'],[3,'Ya, sekitar 3–6 bulan pengeluaran sudah terpisah'],[4,'Ya, lebih dari 6 bulan pengeluaran sudah terpisah']]},
        {step:3,name:'qIncome',eyebrow:'KETERGANTUNGAN PADA PROFIT',title:'Seberapa besar pengeluaran rutin bergantung pada profit trading/investasi?',copy:'Ketergantungan tinggi terhadap profit pasar menurunkan kapasitas mengambil risiko.',choices:[[1,'Profit pasar adalah sumber utama kebutuhan hidup'],[2,'Profit pasar cukup penting untuk cash flow rutin'],[3,'Profit pasar hanya pendapatan tambahan'],[4,'Tidak bergantung pada profit pasar']]},
        {step:3,name:'qExposure',eyebrow:'KONSENTRASI MODAL',title:'Total modal investasi/trading ini berapa porsi aset finansial likuid Anda?',copy:'Porsi yang terlalu dominan meningkatkan dampak kerugian terhadap kondisi keuangan keseluruhan.',choices:[[4,'Kurang dari 10%'],[3,'10%–30%'],[2,'Lebih dari 30%–60%'],[1,'Lebih dari 60%']]},
        {step:4,name:'qDrawdown',eyebrow:'BATAS PENURUNAN',title:'Pada penurunan portofolio berapa Anda akan mulai mengurangi risiko secara disiplin?',copy:'Ini bukan target rugi. Pertanyaan ini mengukur batas finansial dan psikologis sebelum posisi perlu dikurangi.',choices:[[1,'Sebelum mencapai 5%'],[2,'Sekitar 5%–10%'],[3,'Lebih dari 10%–15%'],[4,'Lebih dari 15% dan memahami konsekuensi volatilitasnya']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN BROKERAGE',title:'Mana yang paling menggambarkan pengalaman Anda di pasar modal?',copy:'Pengalaman mencakup pemahaman order, ukuran posisi, diversifikasi, batas risiko, dan bila relevan risiko leverage.',choices:[[1,'Baru mulai / belum terbiasa dengan transaksi saham'],[2,'Pernah membeli saham secara tunai tetapi masih pasif'],[3,'Aktif di saham/ETF dan memahami order, ukuran posisi, diversifikasi, serta batas risiko'],[4,'Berpengalaman mengelola portofolio aktif dan memahami risiko margin/leverage atau produk berisiko tinggi meski tidak selalu menggunakannya']]}
      ]
    }
  };

  function mode(){
    return window.ANALISAKU_WEALTH_ROUTE?.mode || window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode || window.ANALISAKU_WEALTH_MODE?.mode || 'goal';
  }

  function updateBadge(){
    let badge=document.querySelector('.wm-version-badge');
    if(!badge){
      const kicker=document.querySelector('.wealth-hero .kicker');
      if(!kicker)return;
      badge=document.createElement('span');badge.className='wm-version-badge';kicker.appendChild(badge);
    }
    badge.textContent=`WEALTH v${VERSION}`;
  }

  function updateProgress(cfg){
    document.querySelectorAll('.wm-progress a').forEach((a,i)=>{if(cfg.progress[i])a.textContent=cfg.progress[i];});
  }

  function updateHead(stepNo,cfg){
    const step=$(`step-${stepNo}`);
    const head=step?.querySelector('.wm-step-head>div:last-child');
    const meta=cfg.steps[stepNo];
    if(!head||!meta)return;
    const small=head.querySelector('small'),h2=head.querySelector('h2'),p=head.querySelector('p');
    if(small)small.textContent=meta.small;
    if(h2)h2.textContent=meta.title;
    if(p)p.textContent=meta.copy;
  }

  function questionHtml(q,index){
    return `<article class="wm-mode-q-card">
      <div class="wm-mode-q-no">${String(index+1).padStart(2,'0')}</div>
      <div class="wm-mode-q-body"><small>${esc(q.eyebrow)}</small><h3>${esc(q.title)}</h3><p>${esc(q.copy)}</p>
      <div class="wm-mode-q-options">${q.choices.map(([value,label])=>`<label><input type="radio" name="${esc(q.name)}" value="${value}"><span>${esc(label)}</span></label>`).join('')}</div></div>
    </article>`;
  }

  function renderStep(stepNo,cfg){
    const step=$(`step-${stepNo}`);
    const body=step?.querySelector('.wm-step-body');
    if(!body)return;
    const original=body.querySelector('.wm-lens');
    if(original)original.hidden=true;
    let panel=body.querySelector('.wm-mode-questionnaire');
    if(!panel){panel=document.createElement('section');panel.className='wm-mode-questionnaire';body.insertBefore(panel,body.firstChild);}
    const groups=cfg.groups.filter(q=>q.step===stepNo);
    panel.innerHTML=`<div class="wm-mode-q-intro"><span>${esc(cfg.label)}</span><strong>Kenali kondisi Anda sebelum menentukan komposisi investasi.</strong><p>${esc(cfg.intro)}</p><div class="wm-q-pillars">${cfg.chips.map(c=>`<em>${esc(c)}</em>`).join('')}</div></div><div class="wm-mode-q-grid">${groups.map(questionHtml).join('')}</div>`;
  }

  function render(){
    const cfg=CONFIG[mode()]||CONFIG.goal;
    ['qWhen','qLiquidity','qEmergency','qIncome','qExposure','qDrawdown','qExperience'].forEach(name=>document.querySelectorAll(`input[name="${name}"]`).forEach(el=>{el.checked=false;}));
    updateProgress(cfg);
    [2,3,4].forEach(n=>{updateHead(n,cfg);renderStep(n,cfg);});
    updateBadge();
    document.body.dataset.wealthMode=mode();
    window.ANALISAKU_WEALTH_QUESTIONNAIRE={version:VERSION,mode:mode(),basis:'brokerage-suitability'};
  }

  function bind(){
    render();
    document.addEventListener('click',event=>{if(event.target.closest('[data-plan-mode]'))setTimeout(render,20);});
    $('wmBuildPlan')?.addEventListener('click',()=>setTimeout(updateBadge,180));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
