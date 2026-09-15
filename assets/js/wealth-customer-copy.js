/* Wealth Management v1.5 — customer-facing copy polish */
(function(){
  const VERSION='1.5';
  let scheduled=false;

  function text(selector,value,root=document){
    const el=root.querySelector(selector);
    if(el&&el.textContent!==value)el.textContent=value;
  }
  function html(selector,value,root=document){
    const el=root.querySelector(selector);
    if(el&&el.innerHTML!==value)el.innerHTML=value;
  }

  function replaceText(root=document){
    if(!root)return;
    const replacements=[
      ['Product Fit','kesesuaian produk'],
      ['product fit','kesesuaian produk'],
      ['financial projection','proyeksi dana'],
      ['next action','langkah berikutnya'],
      ['Risk appetite','Kenyamanan terhadap risiko'],
      ['risk appetite','kenyamanan terhadap risiko'],
      ['Lump sum','Dana sekaligus'],
      ['lump sum','dana sekaligus'],
      ['drawdown','penurunan'],
      ['Drawdown','Penurunan'],
      ['exposure','porsi'],
      ['Exposure','Porsi'],
      ['core portfolio','portofolio inti'],
      ['Core Portfolio','Portofolio Inti'],
      ['trading capital','modal investasi/trading'],
      ['Trading capital','Modal investasi/trading'],
      ['position sizing','pengaturan ukuran posisi'],
      ['Position sizing','Pengaturan ukuran posisi'],
      ['suitability','kesesuaian'],
      ['weighted average return','rata-rata return portofolio'],
      ['Weighted average return','Rata-rata return portofolio']
    ];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(!node.nodeValue||!node.nodeValue.trim())return;
      let value=node.nodeValue;
      replacements.forEach(([from,to])=>{value=value.split(from).join(to);});
      if(value!==node.nodeValue)node.nodeValue=value;
    });
  }

  function patchHero(){
    text('.wealth-hero .kicker','WEALTH MANAGEMENT');
    const badge=document.querySelector('.wm-version-badge');
    if(badge&&badge.textContent!==`ENGINE v${VERSION}`)badge.textContent=`ENGINE v${VERSION}`;
  }

  function patchProductIntro(){
    const section=document.getElementById('wealth-products');
    if(!section)return;
    text('.wm-products-head .kicker','KENALI PILIHAN INVESTASI',section);
    text('.wm-products-head h2','Pahami karakter setiap instrumen sebelum menyusun rencana.',section);
    html('.wm-products-head p','Mirae Asset Sekuritas menyediakan berbagai instrumen investasi. Dalam Wealth Plan ini, fokus utama berada pada <b>Reksa Dana, Obligasi, dan Saham</b> agar Anda dapat melihat perbedaan potensi hasil, risiko, dan jangka waktunya.',section);
    text('.wm-risk-return-map .wm-map-copy small','PETA RISIKO & POTENSI HASIL',section);
    text('.wm-risk-return-map .wm-map-copy strong','Semakin tinggi potensi hasil, semakin besar pula risiko pergerakan nilainya.',section);
    text('.wm-risk-return-map .wm-map-copy p','Pilih investasi berdasarkan tujuan, jangka waktu, kebutuhan dana, kondisi keuangan, dan kenyamanan Anda terhadap risiko, bukan hanya angka return.',section);
    const note=section.querySelectorAll('.wm-return-note')[1];
    if(note){
      text('small','PORSI SAHAM DALAM PORTOFOLIO',note);
      text('strong','Porsi saham dapat lebih besar untuk profil dengan horizon panjang dan kemampuan menghadapi fluktuasi yang lebih tinggi.',note);
      text('span','Besarnya porsi saham tetap menyesuaikan hasil rencana Anda, termasuk jangka waktu dan kebutuhan likuiditas. Pada kondisi tertentu, porsi ekuitas dapat mencapai sekitar 70% untuk profil Growth dan hingga 90% untuk profil Agresif.',note);
    }
    text('.wm-products-cta small','SIAP MENYUSUN RENCANA?',section);
    text('.wm-products-cta strong','Lanjutkan untuk melihat kombinasi yang lebih sesuai dengan kondisi Anda.',section);
    text('.wm-product-start','Mulai Rencana Investasi →',section);
  }

  function patchPlanningMode(){
    const panel=document.getElementById('wmPlanningMode');
    if(!panel)return;
    text('.wm-plan-mode-head small','PILIH CARA MEMULAI',panel);
    text('.wm-plan-mode-head strong','Pilih kondisi yang paling sesuai dengan dana Anda saat ini.',panel);
    text('.wm-plan-mode-head p','Setiap orang memiliki kondisi awal yang berbeda. Pilihan ini akan menyesuaikan pertanyaan dan perhitungan agar rencana lebih relevan untuk Anda.',panel);

    const copies={
      goal:{title:'Kejar Target',copy:'Untuk tujuan seperti pendidikan, rumah, atau pensiun dengan dana awal dan investasi berkala.'},
      lump:{title:'Dana Sudah Ada',copy:'Untuk dana yang sudah tersedia dan ingin langsung dialokasikan ke beberapa instrumen investasi.'},
      buffer:{title:'Investor / Trader dengan Cash Buffer',copy:'Untuk Anda yang ingin menjaga sebagian modal tetap likuid dan menginvestasikan sisanya.'}
    };
    panel.querySelectorAll('[data-plan-mode]').forEach(btn=>{
      const c=copies[btn.dataset.planMode];
      if(!c)return;
      text('strong',c.title,btn);text('small',c.copy,btn);
    });

    const buffer=document.getElementById('wmBufferSetting');
    if(buffer){
      const info=buffer.firstElementChild;
      if(info){
        text('small','CASH BUFFER',info);
        text('strong','Sisihkan dana likuid untuk fleksibilitas.',info);
        text('p','Bagian ini tetap tersedia sebagai kas. Dana di luar buffer akan digunakan sebagai dasar penyusunan komposisi investasi.',info);
      }
      text('label>span','Porsi cash buffer dari total modal',buffer);
    }
  }

  function patchQuestionnaire(){
    document.querySelectorAll('.wm-mode-questionnaire').forEach(panel=>{
      text('.wm-mode-q-intro strong','Jawab sesuai kondisi Anda',panel);
      text('.wm-mode-q-intro p','Pertanyaan berikut disesuaikan dengan cara Anda memulai rencana. Jawaban akan membantu menyusun tingkat risiko dan komposisi investasi yang lebih relevan.',panel);
    });

    document.querySelectorAll('#step-2 .wm-step-head p,#step-3 .wm-step-head p,#step-4 .wm-step-head p').forEach(p=>{
      const next=p.textContent
        .replace('Mesin menilai','Jawaban Anda membantu menilai')
        .replace('Mesin memisahkan','Rencana ini memisahkan')
        .replace('menjadi faktor penting','ikut dipertimbangkan dalam rencana')
        .replace('perlu dinilai lebih spesifik','perlu dipahami dengan lebih jelas');
      if(next!==p.textContent)p.textContent=next;
    });
  }

  function patchReturnBox(){
    const box=document.getElementById('wmReturnAssumptions');
    if(!box)return;
    text('.wm-return-head small','ASUMSI RETURN',box);
    text('.wm-return-head strong','Gunakan asumsi standar atau sesuaikan dengan perkiraan Anda.',box);
    text('.wm-return-head p','Asumsi return digunakan untuk menghitung proyeksi nilai investasi, pertumbuhan tiap instrumen, dan kebutuhan investasi berkala.',box);
    text('.wm-return-foot span','Angka return merupakan asumsi simulasi dan bukan jaminan hasil investasi.',box);
    text('.wm-return-reset','Kembalikan ke asumsi standar',box);
  }

  function patchResult(){
    const result=document.getElementById('wealth-result');
    if(!result)return;
    text('.wm-step-head small','RINGKASAN RENCANA',result);
    text('.wm-step-head h2','Rencana investasi Anda.',result);
    text('.wm-step-head p','Ringkasan berikut disusun dari jawaban dan asumsi yang Anda masukkan.',result);

    const cards=[...result.querySelectorAll('.wm-result-card')];
    if(cards[1]){
      text('small','PROFIL INVESTASI',cards[1]);
      text('.wm-level span','/ 5 tingkat risiko yang sesuai',cards[1]);
    }
    if(cards[2]){
      text('small','PILIHAN PRODUK',cards[2]);
      text('h3','Kelas aset yang sesuai',cards[2]);
      text('p','Pilihan berikut mempertimbangkan tujuan, jangka waktu, kebutuhan likuiditas, kondisi keuangan, dan kenyamanan Anda terhadap risiko.',cards[2]);
    }
    if(cards[3]){
      text('small','KOMPOSISI PORTOFOLIO',cards[3]);
      text('h3','Contoh komposisi investasi',cards[3]);
    }
    const profileCopy=document.getElementById('resultProfileCopy');
    if(profileCopy&&profileCopy.textContent.startsWith('Batas risiko mengikuti faktor paling rendah:')){
      profileCopy.textContent=profileCopy.textContent.replace('Batas risiko mengikuti faktor paling rendah:','Profil ini mempertimbangkan seluruh jawaban Anda. Faktor yang paling membatasi saat ini:');
    }
    text('.wm-disclaimer:not(#wmFormError)','Simulasi ini merupakan panduan awal dan bukan jaminan hasil investasi. Sebelum bertransaksi, pastikan produk sesuai dengan profil risiko resmi Anda dan pelajari prospektus atau fund fact sheet, biaya, pajak, serta risiko masing-masing produk.',result);
    text('#wmDownloadPdf','Unduh Ringkasan PDF',result);
    text('.wm-next small','LANGKAH BERIKUTNYA',result);
  }

  function patchEquitySleeve(){
    const panel=document.getElementById('wmEquitySleeve');
    if(!panel)return;
    text('.wm-equity-head small',`PENGATURAN PORSI SAHAM • v${VERSION}`,panel);
    text('.wm-equity-head h3','Bagaimana Anda ingin membagi porsi saham?',panel);
    html('.wm-equity-head p','Porsi saham mengikuti hasil rencana Anda. Di bagian ini, Anda dapat memilih bagaimana porsi tersebut dibagi antara <b>Blue Chip, Dividend, Growth/Second Liner, dan Trading</b>.',panel);
    text('.wm-equity-cap small','PORSI SAHAM DALAM RENCANA',panel);
    const guard=panel.querySelector('.wm-equity-guardrail');
    if(guard){
      const weight=(panel.querySelector('.wm-equity-cap b')?.textContent||'').trim();
      const value=`<b>Catatan:</b> porsi saham ${weight||'yang telah ditetapkan'} tetap sama. Pilihan di atas hanya mengatur pembagian di dalam porsi saham. Untuk pilihan Custom, total pembagian harus 100%.`;
      if(guard.innerHTML!==value)guard.innerHTML=value;
    }
  }

  function patchProjection(){
    const panel=document.getElementById('wmFutureValue');
    if(!panel)return;
    text('.wm-fv-head small','PROYEKSI PER INSTRUMEN',panel);
    text('.wm-fv-head h3','Lihat perkembangan setiap bagian portofolio.',panel);
    text('.wm-fv-head p','Setiap instrumen dihitung berdasarkan dana yang ditempatkan, investasi bulanan, dan asumsi return masing-masing. Nilai akhir menunjukkan proyeksi, bukan harga pasar yang dijamin.',panel);
    text('.wm-yearly-head small','PROYEKSI TAHUNAN',panel);
    text('.wm-yearly-head h3','Perkembangan dari tahun pertama hingga akhir.',panel);
    text('.wm-yearly-head p','Lihat perkembangan dana yang sudah ditempatkan, estimasi hasil, dan proyeksi nilai portofolio pada setiap tahun.',panel);
  }

  function apply(){
    scheduled=false;
    patchHero();
    patchProductIntro();
    patchPlanningMode();
    patchQuestionnaire();
    patchReturnBox();
    patchResult();
    patchEquitySleeve();
    patchProjection();
    replaceText(document.querySelector('main'));
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  function init(){
    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-plan-mode],#wmBuildPlan,[data-equity-preset],#wmReturnReset'))setTimeout(apply,40);
    });
    window.ANALISAKU_WEALTH_COPY={version:VERSION,apply};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
