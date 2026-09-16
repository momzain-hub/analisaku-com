/* Wealth v1.9.2.2 — robust PDF download for Android/mobile browsers */
(function(){
  const VERSION='1.9.2.2';
  let toastTimer=null;

  function ensureToast(){
    let toast=document.getElementById('wmPdfDownloadToast');
    if(toast)return toast;
    const style=document.createElement('style');
    style.textContent=`
      #wmPdfDownloadToast{position:fixed;left:50%;bottom:20px;z-index:10050;transform:translate(-50%,12px);width:min(430px,calc(100vw - 28px));padding:13px 15px;border:1px solid rgba(111,207,157,.38);border-radius:14px;background:#10202d;color:#f5f8fb;box-shadow:0 18px 52px rgba(0,0,0,.34);opacity:0;pointer-events:none;transition:.2s ease;font-size:12px;font-weight:800;line-height:1.45;text-align:center}
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
    toastTimer=setTimeout(()=>toast.classList.remove('show'),4200);
  }

  function setPreparing(on){
    const btn=document.getElementById('wmDownloadPdf');
    if(!btn)return;
    if(!btn.dataset.defaultLabel)btn.dataset.defaultLabel=btn.textContent.trim();
    btn.classList.toggle('is-preparing',on);
    btn.textContent=on?'Menyiapkan PDF…':btn.dataset.defaultLabel;
  }

  function forceBlobDownload(blob,filename){
    const safeName=filename||`Analisaku-Wealth-Plan-${new Date().toISOString().slice(0,10)}.pdf`;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=safeName;
    a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      a.remove();
      URL.revokeObjectURL(url);
    },8000);
  }

  function patchJsPdf(){
    const jsPDF=window.jspdf?.jsPDF;
    const API=jsPDF?.API;
    if(!API||API.__analisakuMobileDownloadPatched)return false;
    const originalSave=API.save;
    if(typeof originalSave!=='function')return false;

    API.__analisakuMobileDownloadPatched=true;
    API.save=function(filename,options){
      try{
        const blob=this.output('blob');
        if(!(blob instanceof Blob)||blob.size===0)throw new Error('Blob PDF kosong');
        forceBlobDownload(blob,filename);
        setPreparing(false);
        showToast('PDF berhasil dibuat. Cek folder Download pada perangkat Anda.');
        return this;
      }catch(error){
        try{
          const result=originalSave.apply(this,arguments);
          setPreparing(false);
          showToast('PDF sedang diunduh. Cek folder Download pada perangkat Anda.');
          return result;
        }catch(fallbackError){
          setPreparing(false);
          showToast('PDF belum berhasil diunduh. Coba refresh halaman lalu unduh kembali.',true);
          console.error('Wealth PDF download failed',fallbackError||error);
          throw fallbackError;
        }
      }
    };
    return true;
  }

  function bind(){
    ensureToast();
    patchJsPdf();
    document.addEventListener('click',event=>{
      if(!event.target.closest('#wmDownloadPdf'))return;
      setPreparing(true);
      if(!patchJsPdf()&&!window.jspdf?.jsPDF){
        setPreparing(false);
        showToast('Generator PDF belum siap. Refresh halaman lalu coba kembali.',true);
      }
      setTimeout(()=>{
        const btn=document.getElementById('wmDownloadPdf');
        if(btn?.classList.contains('is-preparing'))setPreparing(false);
      },7000);
    },true);
    window.ANALISAKU_WEALTH_PDF_DOWNLOAD={version:VERSION,patch:patchJsPdf};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
