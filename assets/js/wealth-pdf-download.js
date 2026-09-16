/* Wealth v1.9.2.4 — direct DOM-based PDF generator for reliable mobile download */
(function(){
  const VERSION='1.9.2.4';
  const $=id=>document.getElementById(id);
  let toastTimer=null;

  function ensureToast(){
    let toast=$('wmPdfDownloadToast');
    if(toast)return toast;
    const style=document.createElement('style');
    style.textContent=`
      #wmPdfDownloadToast{position:fixed;left:50%;bottom:20px;z-index:10050;transform:translate(-50%,12px);width:min(460px,calc(100vw - 28px));padding:13px 15px;border:1px solid rgba(111,207,157,.38);border-radius:14px;background:#10202d;color:#f5f8fb;box-shadow:0 18px 52px rgba(0,0,0,.34);opacity:0;pointer-events:none;transition:.2s ease;font-size:12px;font-weight:800;line-height:1.45;text-align:center}
      #wmPdfDownloadToast.show{opacity:1;transform:translate(-50%,0)}
      #wmPdfDownloadToast.error{border-color:rgba(239,124,124,.5)}
      #wmDownloadPdf.is-preparing{opacity:.78;pointer-events:none}
    `;
    document.head.appendChild(style);
    toast=document.createElement('div');
    toast.id='wmPdfDownloadToast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message,isError=false){
    const toast=ensureToast();
    toast.textContent=message;
    toast.classList.toggle('error',isError);
    requestAnimationFrame(()=>toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),5200);
  }

  function setPreparing(on){
    const btn=$('wmDownloadPdf');
    if(!btn)return;
    if(!btn.dataset.defaultLabel)btn.dataset.defaultLabel=btn.textContent.trim();
    btn.classList.toggle('is-preparing',on);
    btn.textContent=on?'Menyiapkan PDF…':btn.dataset.defaultLabel;
  }

  function clean(text){
    return String(text||'')
      .replace(/\u00a0/g,' ')
      .replace(/[•·]/g,' - ')
      .replace(/[→⇒]/g,' -> ')
      .replace(/[–—]/g,'-')
      .replace(/[Σ]/g,'Sum')
      .replace(/[^\x20-\x7E\u00C0-\u017F]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function text(id){return clean($(id)?.textContent||'');}

  function buildPdf(){
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF)throw new Error('Generator PDF belum siap');
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
    const W=210,M=15,C=W-M*2;
    let y=16;

    const pageBreak=(need=12)=>{
      if(y+need>282){doc.addPage();y=16;}
    };
    const write=(value,size=8,bold=false,color=[55,65,78],gap=4.2)=>{
      const s=clean(value);if(!s)return;
      doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);
      const lines=doc.splitTextToSize(s,C);
      pageBreak(lines.length*gap+2);
      doc.text(lines,M,y);y+=lines.length*gap;
    };
    const section=title=>{pageBreak(12);y+=3;write(title,10,true,[28,38,52],5);y+=1;};
    const kv=(label,value)=>{pageBreak(9);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(112,122,135);doc.text(clean(label),M,y);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(28,38,52);doc.text(clean(value||'-'),M+55,y);y+=6;};

    doc.setFillColor(18,28,43);doc.roundedRect(M,y,C,28,4,4,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('analisaku.com',M+7,y+9);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(215,224,235);doc.text('WEALTH MANAGEMENT PLAN',M+7,y+15);
    const mode=document.body.dataset.wealthMode||'wealth';
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(230,184,91);doc.text(clean(text('resultGoalTitle')||mode.toUpperCase()),M+7,y+22);
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(180,190,202);doc.text(new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}),W-M-7,y+9,{align:'right'});
    y+=36;

    section('RINGKASAN RENCANA');
    kv('Tujuan / Mode',text('resultGoalTitle')||mode);
    kv('Profil Investasi',text('resultProfile'));
    kv('Tingkat Risiko',text('resultRiskLevel')?`Level ${text('resultRiskLevel')}/5`:'-');
    kv('Target Masa Depan',text('resultFutureTarget'));
    kv('Proyeksi Dana',text('resultProjected'));
    kv('Tingkat Pencapaian',text('resultFunding'));
    kv('Kebutuhan / Bulan',text('resultRequired'));
    kv('Waktu',text('resultWhen'));
    kv('Kemampuan',text('resultAble'));
    kv('Kenyamanan',text('resultComfort'));

    const profileCopy=text('resultProfileCopy');if(profileCopy){y+=2;write(profileCopy,7.5,false,[88,98,112],4.2);}
    const next=text('resultNext');if(next){section('LANGKAH BERIKUTNYA');write(next,8.5,true,[45,55,66],4.7);}

    const products=$('resultProducts');
    if(products){section('PILIHAN PRODUK');[...products.children].forEach((el,i)=>write(`${i+1}. ${clean(el.textContent)}`,7.5,false,[55,65,78],4.2));}

    const allocation=$('resultAllocation');
    if(allocation){section('KOMPOSISI PORTOFOLIO');[...allocation.children].forEach(el=>write(clean(el.textContent),7.8,true,[55,65,78],4.3));}

    const future=$('wmFutureValue');
    if(future){
      section('FUTURE VALUE & PROYEKSI PER INSTRUMEN');
      const summary=future.querySelector('.wm-fv-summary');
      if(summary){[...summary.children].forEach(el=>write(clean(el.textContent),7.5,false,[55,65,78],4.1));y+=1;}
      const assets=[...future.querySelectorAll('.wm-fv-asset-card')];
      assets.forEach((el,i)=>{pageBreak(18);write(`${i+1}. ${clean(el.textContent)}`,7.2,false,[55,65,78],4);y+=1;});
      const years=[...future.querySelectorAll('.wm-year-card')];
      if(years.length){section('RINCIAN TAHUNAN');years.forEach(el=>{pageBreak(20);write(clean(el.textContent),7,false,[55,65,78],3.9);y+=2;});}
    }

    section('CATATAN');
    write('Simulasi ini merupakan panduan awal dan bukan jaminan hasil investasi. Sebelum bertransaksi, pelajari karakteristik produk, prospektus atau fund fact sheet, biaya, pajak, likuiditas, serta risiko yang berlaku.',6.8,false,[105,112,122],3.7);
    return doc;
  }

  function saveDoc(doc){
    const filename=`Analisaku-Wealth-Plan-${new Date().toISOString().slice(0,10)}.pdf`;
    const blob=doc.output('blob');
    if(!(blob instanceof Blob)||!blob.size)throw new Error('PDF kosong');
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},15000);
  }

  function bind(){
    ensureToast();
    document.addEventListener('click',event=>{
      const btn=event.target.closest('#wmDownloadPdf');
      if(!btn)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPreparing(true);
      try{
        const doc=buildPdf();
        saveDoc(doc);
        showToast('PDF berhasil dibuat dan proses unduh sudah dimulai. Cek folder Download.');
      }catch(error){
        console.error('Direct Wealth PDF failed',error);
        showToast(`PDF belum berhasil dibuat: ${error?.message||'terjadi kesalahan'}.`,true);
      }finally{
        setPreparing(false);
      }
    },true);
    window.ANALISAKU_WEALTH_PDF_DOWNLOAD={version:VERSION,mode:'direct-dom'};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
