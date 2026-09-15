/* Wealth Management v1.4 — mode-specific questionnaires */
(function(){
  const VERSION='1.4';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const CONFIG={
    goal:{
      label:'MODE 1 • KEJAR TARGET',
      progress:['01 Tujuan','02 Deadline','03 Kemampuan','04 Risiko','05 Rencana'],
      steps:{
        2:{small:'MODE 1 • DEADLINE',title:'Kapan target harus tercapai?',copy:'Untuk goal-based planning, yang paling penting bukan hanya return—tetapi kapan uang wajib tersedia dan seberapa fleksibel tanggal targetnya.'},
        3:{small:'MODE 1 • KEMAMPUAN MENABUNG',title:'Seberapa kuat rencana pendanaannya?',copy:'Sistem melihat dana darurat, kestabilan setoran bulanan, dan seberapa besar tujuan ini terhadap kekayaan finansial Anda.'},
        4:{small:'MODE 1 • RISIKO MENUJU TARGET',title:'Apa yang Anda lakukan bila pasar turun?',copy:'Toleransi risiko dinilai dalam konteks tujuan. Semakin dekat target, kemampuan menanggung penurunan biasanya semakin kecil.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'DEADLINE',title:'Berapa lama lagi dana target harus tersedia?',copy:'Ini menjadi batas horizon utama untuk pemilihan produk.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'FLEKSIBILITAS TARGET',title:'Jika kondisi pasar belum ideal, seberapa fleksibel waktu target?',copy:'Target yang tidak boleh mundur membutuhkan alokasi yang lebih defensif.',choices:[[1,'Tidak fleksibel — harus tersedia tepat waktu'],[2,'Bisa mundur kurang dari 6 bulan'],[3,'Bisa mundur 6–18 bulan'],[4,'Sangat fleksibel — bisa mundur lebih dari 18 bulan']]},
        {step:3,name:'qEmergency',eyebrow:'DANA DARURAT',title:'Di luar dana untuk tujuan ini, bagaimana dana darurat Anda?',copy:'Dana darurat yang terpisah mengurangi risiko terpaksa menjual investasi.',choices:[[1,'Belum tersedia'],[2,'Kurang dari 3 bulan pengeluaran'],[3,'Sekitar 3–6 bulan pengeluaran'],[4,'Lebih dari 6 bulan pengeluaran']]},
        {step:3,name:'qIncome',eyebrow:'KONSISTENSI SETORAN',title:'Seberapa konsisten kemampuan investasi bulanan sampai target?',copy:'Goal-based plan sangat bergantung pada kemampuan menjaga setoran rutin.',choices:[[1,'Tidak pasti / sering terhenti'],[2,'Cukup stabil tetapi kadang terhenti'],[3,'Stabil dan realistis dijaga'],[4,'Sangat stabil dan masih bisa dinaikkan']]},
        {step:3,name:'qExposure',eyebrow:'BESAR TUJUAN',title:'Seberapa besar kebutuhan tujuan ini dibanding aset finansial keluarga?',copy:'Semakin dominan tujuan ini terhadap kekayaan, semakin penting menjaga modal.',choices:[[4,'Kurang dari 20%'],[3,'20%–40%'],[2,'Lebih dari 40%–70%'],[1,'Lebih dari 70%']]},
        {step:4,name:'qDrawdown',eyebrow:'MENDEKATI TARGET',title:'Jika 1–2 tahun sebelum target portofolio turun sekitar 15%, apa yang Anda lakukan?',copy:'Jawaban dinilai sebagai toleransi nyata terhadap risiko goal.',choices:[[1,'Cairkan agar target tidak semakin terancam'],[2,'Kurangi aset berisiko secara signifikan'],[3,'Tahan sambil evaluasi dan rebalancing'],[4,'Tambah bertahap bila kondisi finansial masih memungkinkan']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN',title:'Instrumen apa yang sudah pernah Anda gunakan dan pahami?',copy:'Pengalaman membantu menilai kesiapan menghadapi volatilitas.',choices:[[1,'Belum pernah / tabungan-deposito'],[2,'RDPU / instrumen konservatif'],[3,'Obligasi / RDPT / RD Campuran'],[4,'Saham / RD Saham dan memahami volatilitas tinggi']]}
      ]
    },
    lump:{
      label:'MODE 2 • DANA SUDAH ADA',
      progress:['01 Modal','02 Likuiditas','03 Ketahanan','04 Toleransi','05 Alokasi'],
      steps:{
        2:{small:'MODE 2 • HORIZON & LIKUIDITAS',title:'Berapa lama modal ini benar-benar bisa bekerja?',copy:'Karena dana sudah tersedia di awal, fokus utama adalah horizon investasi dan berapa bagian modal yang mungkin perlu dicairkan.'},
        3:{small:'MODE 2 • KETAHANAN MODAL',title:'Seberapa aman dana ini dari kebutuhan lain?',copy:'Mesin menilai apakah modal investasi benar-benar surplus, terpisah dari kebutuhan hidup, dan tidak terlalu terkonsentrasi.'},
        4:{small:'MODE 2 • TOLERANSI NILAI TURUN',title:'Seberapa besar penurunan yang masih dapat Anda tahan?',copy:'Lump sum memberi exposure pasar sejak awal, sehingga kapasitas menanggung drawdown perlu dinilai lebih spesifik.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'HORIZON MODAL',title:'Berapa lama dana ini dapat dibiarkan bekerja tanpa digunakan?',copy:'Semakin panjang horizon, semakin besar ruang untuk aset yang berfluktuasi.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'KEBUTUHAN PENCAIRAN',title:'Berapa porsi modal ini yang mungkin dibutuhkan dalam 12 bulan?',copy:'Kebutuhan pencairan yang besar menurunkan kapasitas mengambil risiko.',choices:[[1,'Lebih dari 50%'],[2,'25%–50%'],[3,'10%–25%'],[4,'Kurang dari 10% / hampir tidak perlu']]},
        {step:3,name:'qEmergency',eyebrow:'DANA DARURAT TERPISAH',title:'Apakah dana darurat sudah terpisah dari modal investasi ini?',copy:'Modal investasi sebaiknya bukan satu-satunya sumber likuiditas keluarga.',choices:[[1,'Belum — dana ini juga untuk kebutuhan darurat'],[2,'Ada sebagian, tetapi belum cukup'],[3,'Ya, sekitar 3–6 bulan pengeluaran'],[4,'Ya, lebih dari 6 bulan pengeluaran']]},
        {step:3,name:'qIncome',eyebrow:'KETERGANTUNGAN CASH FLOW',title:'Seberapa besar kebutuhan hidup Anda bergantung pada modal ini?',copy:'Jika kebutuhan hidup bergantung pada modal, risiko investasi sebaiknya lebih rendah.',choices:[[1,'Sangat bergantung'],[2,'Cukup bergantung'],[3,'Hanya sebagian kecil'],[4,'Tidak bergantung sama sekali']]},
        {step:3,name:'qExposure',eyebrow:'KONSENTRASI KEKAYAAN',title:'Modal ini setara dengan berapa porsi aset finansial likuid Anda?',copy:'Semakin terkonsentrasi, semakin besar dampak penurunan terhadap kondisi keuangan.',choices:[[4,'Kurang dari 20%'],[3,'20%–40%'],[2,'Lebih dari 40%–70%'],[1,'Lebih dari 70%']]},
        {step:4,name:'qDrawdown',eyebrow:'DRAWDOWN LUMP SUM',title:'Jika nilai modal turun 15%–20% setelah diinvestasikan, apa respons Anda?',copy:'Lump sum dapat mengalami fluktuasi penuh sejak awal penempatan.',choices:[[1,'Jual seluruhnya untuk menghentikan kerugian'],[2,'Kurangi sebagian besar posisi'],[3,'Tahan dan evaluasi sesuai rencana'],[4,'Tambah secara bertahap bila fundamental/rencana masih sesuai']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN MENGELOLA MODAL',title:'Seberapa familiar Anda mengelola portofolio dengan nilai yang material?',copy:'Bukan sekadar pernah transaksi, tetapi memahami risiko instrumen yang digunakan.',choices:[[1,'Belum pernah mengelola investasi'],[2,'Pernah RDPU / deposito / instrumen defensif'],[3,'Pernah obligasi / RDPT / campuran'],[4,'Aktif di saham / RD saham dan memahami drawdown']]}
      ]
    },
    buffer:{
      label:'MODE 3 • INVESTOR / TRADER + CASH BUFFER',
      progress:['01 Modal & Buffer','02 Horizon Core','03 Ketahanan','04 Drawdown','05 Strategi'],
      steps:{
        2:{small:'MODE 3 • HORIZON CORE & BUFFER',title:'Mana dana yang bekerja, mana dana yang harus siap?',copy:'Cash buffer memberi fleksibilitas, tetapi porsi investasi tetap perlu memiliki horizon yang jelas. Mesin memisahkan kebutuhan likuid dan modal yang boleh berfluktuasi.'},
        3:{small:'MODE 3 • KETAHANAN TRADER/INVESTOR',title:'Apakah trading capital benar-benar terpisah dari kebutuhan hidup?',copy:'Buffer trading bukan pengganti dana darurat. Ketergantungan pada profit trading dan konsentrasi modal menjadi faktor penting.'},
        4:{small:'MODE 3 • BATAS DRAWDOWN',title:'Seberapa besar kerugian portofolio yang masih dapat diterima?',copy:'Untuk investor/trader, respons terhadap drawdown dan pengalaman mengelola posisi lebih relevan daripada sekadar label agresif.'}
      },
      groups:[
        {step:2,name:'qWhen',eyebrow:'HORIZON CORE PORTFOLIO',title:'Untuk porsi di luar cash buffer, berapa lama modal core bisa dibiarkan bekerja?',copy:'Horizon ini digunakan untuk membatasi total exposure ekuitas.',choices:[[1,'Kurang dari 1 tahun'],[2,'1–3 tahun'],[3,'Lebih dari 3–5 tahun'],[4,'Lebih dari 5 tahun']]},
        {step:2,name:'qLiquidity',eyebrow:'FREKUENSI PAKAI BUFFER',title:'Seberapa sering cash buffer diperkirakan akan digunakan?',copy:'Semakin sering buffer terpakai, semakin penting menjaga porsi investasi tetap likuid.',choices:[[1,'Sering — hampir setiap bulan'],[2,'Beberapa kali dalam setahun'],[3,'Sesekali saat ada peluang / kebutuhan'],[4,'Jarang — hanya untuk kondisi khusus']]},
        {step:3,name:'qEmergency',eyebrow:'DANA DARURAT DI LUAR BUFFER',title:'Apakah dana darurat rumah tangga terpisah dari cash buffer trading?',copy:'Cash buffer untuk peluang pasar sebaiknya tidak merangkap seluruh dana darurat.',choices:[[1,'Tidak — buffer juga menjadi dana darurat'],[2,'Sebagian sudah terpisah'],[3,'Ya, dana darurat 3–6 bulan tersedia'],[4,'Ya, dana darurat lebih dari 6 bulan tersedia']]},
        {step:3,name:'qIncome',eyebrow:'KETERGANTUNGAN PADA PROFIT',title:'Seberapa bergantung pengeluaran rutin pada profit trading/investasi?',copy:'Ketergantungan tinggi terhadap profit pasar menurunkan kapasitas risiko.',choices:[[1,'Profit trading adalah sumber utama kebutuhan hidup'],[2,'Profit trading cukup penting untuk cash flow'],[3,'Hanya sebagai pendapatan tambahan'],[4,'Tidak bergantung pada profit trading']]},
        {step:3,name:'qExposure',eyebrow:'BESAR TRADING CAPITAL',title:'Total modal investasi/trading ini berapa porsi aset finansial Anda?',copy:'Modal yang terlalu dominan terhadap kekayaan meningkatkan risiko konsentrasi.',choices:[[4,'Kurang dari 10%'],[3,'10%–30%'],[2,'Lebih dari 30%–60%'],[1,'Lebih dari 60%']]},
        {step:4,name:'qDrawdown',eyebrow:'MAX DRAWDOWN',title:'Berapa penurunan portofolio yang masih dapat Anda toleransi sebelum wajib mengurangi risiko?',copy:'Ini bukan target rugi, tetapi batas psikologis dan finansial untuk mengukur kapasitas volatilitas.',choices:[[1,'Kurang dari 5%'],[2,'Sekitar 5%–10%'],[3,'Lebih dari 10%–15%'],[4,'Lebih dari 15% dan memahami konsekuensinya']]},
        {step:4,name:'qExperience',eyebrow:'PENGALAMAN PASAR',title:'Seberapa berpengalaman Anda mengelola investasi/trading aktif?',copy:'Pengalaman mencakup position sizing, cut loss, diversifikasi, dan evaluasi portofolio.',choices:[[1,'Baru mulai / belum memahami manajemen risiko'],[2,'Pernah investasi tetapi jarang trading'],[3,'Cukup aktif dan memahami position sizing / stop loss'],[4,'Berpengalaman mengelola saham aktif dan portofolio jangka panjang']]}
      ]
    }
  };

  function mode(){
    return window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode || window.ANALISAKU_WEALTH_MODE?.mode || 'goal';
  }

  function updateBadge(){
    let badge=document.querySelector('.wm-version-badge');
    if(!badge){
      const kicker=document.querySelector('.wealth-hero .kicker');
      if(!kicker)return;
      badge=document.createElement('span');badge.className='wm-version-badge';kicker.appendChild(badge);
    }
    badge.textContent=`ENGINE v${VERSION}`;
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
      <div class="wm-mode-q-options">${q.choices.map(([value,label],i)=>`<label><input type="radio" name="${esc(q.name)}" value="${value}" ${i===2?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></div>
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
    panel.innerHTML=`<div class="wm-mode-q-intro"><span>${esc(cfg.label)}</span><strong>Pertanyaan khusus untuk mode ini</strong><p>Jawaban langsung dipakai oleh mesin KAPAN → MAMPU → NYAMAN. Tidak ada pertanyaan generik yang dipakai ulang dari mode lain.</p></div><div class="wm-mode-q-grid">${groups.map(questionHtml).join('')}</div>`;
  }

  function render(){
    const cfg=CONFIG[mode()]||CONFIG.goal;
    ['qWhen','qLiquidity','qEmergency','qIncome','qExposure','qDrawdown','qExperience'].forEach(name=>document.querySelectorAll(`input[name="${name}"]`).forEach(el=>{el.checked=false;}));
    updateProgress(cfg);
    [2,3,4].forEach(n=>{updateHead(n,cfg);renderStep(n,cfg);});
    updateBadge();
    document.body.dataset.wealthMode=mode();
    window.ANALISAKU_WEALTH_QUESTIONNAIRE={version:VERSION,mode:mode()};
  }

  function bind(){
    render();
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-plan-mode]'))setTimeout(render,20);
    });
    $('wmBuildPlan')?.addEventListener('click',()=>setTimeout(updateBadge,180));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
