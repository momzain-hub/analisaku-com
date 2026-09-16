/* Wealth v1.9.2.3 — Android/mobile PDF download + viewer fallback */
(function(){
  const VERSION='1.9.2.3';
  let toastTimer=null;
  let pendingViewer=null;

  function ensureToast(){
    let toast=document.getElementById('wmPdfDownloadToast');
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
    const btn=document.getElementById('wmDownloadPdf');
    if(!btn)return;
    if(!btn.dataset.defaultLabel)btn.dataset.defaultLabel=btn.textContent.trim();
    btn.classList.toggle('is-preparing',on);
    btn.textContent=on?'Menyiapkan PDF…':btn.dataset.defaultLabel;
  }

  function openLoadingViewer(){
    try{
      const win=window.open('about:blank','_blank');
      if(!win)return null;
      win.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menyiapkan PDF…</title><style>body{margin:0;background:#07111b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}div{text-align:center;padding:24px}b{display:block;font-size:20px;margin-bottom:8px}span{color:#9eafc3;font-size:13px}</style></head><body><div><b>Menyiapkan Ringkasan PDF…</b><span>PDF akan terbuka di tab ini.</span></div></body></html>');
      win.document.close();
      return win;
    }catch(_){return null;}
  }

  function triggerDownload(blob,filename){
    const safeName=filename||`Analisaku-Wealth-Plan-${new Date().toISOString().slice(0,10)}.pdf`;
    const url=URL.createObjectURL(blob);
    let clicked=false;
    try{
      const a=document.createElement('a');
      a.href=url;
      a.download=safeName;
      a.rel='noopener';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      clicked=true;
      setTimeout(()=>a.remove(),1000);
    }catch(_){clicked=false;}

    if(pendingViewer&&!pendingViewer.closed){
      try{pendingViewer.location.replace(url);}catch(_){try{pendingViewer.location.href=url;}catch(__){}}
    }else{
      try{
        const viewer=window.open(url,'_blank');
        if(!viewer)showToast('PDF sudah dibuat, tetapi browser memblokir tab PDF. Aktifkan pop-up untuk situs ini lalu coba lagi.',true);
      }catch(_){ }
    }

    setTimeout(()=>URL.revokeObjectURL(url),60000);
    return clicked;
  }

  function patchJsPdf(){
    const jsPDF=window.jspdf?.jsPDF;
    const API=jsPDF?.API;
    if(!API||API.__analisakuMobileDownloadPatchedV193)return false;
    const originalSave=API.save;
    if(typeof originalSave!=='function')return false;

    API.__analisakuMobileDownloadPatchedV193=true;
    API.save=function(filename,options){
      try{
        const blob=this.output('blob');
        if(!(blob instanceof Blob)||blob.size===0)throw new Error('Blob PDF kosong');
        triggerDownload(blob,filename);
        setPreparing(false);
        showToast('PDF sudah dibuat. Jika tidak otomatis tersimpan, PDF juga dibuka di tab baru — tekan ikon Download di viewer PDF.');
        pendingViewer=null;
        return this;
      }catch(error){
        try{
          const result=originalSave.apply(this,arguments);
          setPreparing(false);
          showToast('PDF sedang diproses. Jika file tidak muncul, gunakan tab PDF yang terbuka untuk menyimpan manual.');
          pendingViewer=null;
          return result;
        }catch(fallbackError){
          setPreparing(false);
          if(pendingViewer&&!pendingViewer.closed){try{pendingViewer.close();}catch(_){}}
          pendingViewer=null;
          showToast('PDF belum berhasil dibuat. Refresh halaman lalu coba kembali.',true);
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
      if(!pendingViewer||pendingViewer.closed)pendingViewer=openLoadingViewer();
      if(!patchJsPdf()&&!window.jspdf?.jsPDF){
        setPreparing(false);
        if(pendingViewer&&!pendingViewer.closed){try{pendingViewer.close();}catch(_){}}
        pendingViewer=null;
        showToast('Generator PDF belum siap. Refresh halaman lalu coba kembali.',true);
      }
      setTimeout(()=>{
        const btn=document.getElementById('wmDownloadPdf');
        if(btn?.classList.contains('is-preparing')){
          setPreparing(false);
          showToast('Proses PDF terlalu lama. Refresh halaman lalu coba lagi.',true);
        }
      },10000);
    },true);
    window.ANALISAKU_WEALTH_PDF_DOWNLOAD={version:VERSION,patch:patchJsPdf};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
