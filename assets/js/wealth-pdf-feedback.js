/* Wealth v1.9.3 — reliable PDF download feedback for mobile/desktop */
(function(){
  const VERSION='1.9.3';
  let toastTimer=null;

  function ensureStyles(){
    if(document.getElementById('wmPdfFeedbackStyle'))return;
    const style=document.createElement('style');
    style.id='wmPdfFeedbackStyle';
    style.textContent=`
      .wm-pdf-toast{position:fixed;left:50%;bottom:24px;z-index:10050;transform:translate(-50%,18px);width:min(430px,calc(100vw - 28px));display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid color-mix(in srgb,var(--gold,#f3c95c) 34%,var(--line,#263442));border-radius:15px;background:color-mix(in srgb,var(--surface2,#101e2c) 96%,transparent);box-shadow:0 18px 54px rgba(0,0,0,.34);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;backdrop-filter:blur(14px)}
      .wm-pdf-toast.show{opacity:1;transform:translate(-50%,0)}
      .wm-pdf-toast .wm-pdf-icon{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:10px;background:color-mix(in srgb,#6fcf9d 15%,var(--surface,#0b1723));color:#6fcf9d;font-weight:950;font-size:15px;border:1px solid color-mix(in srgb,#6fcf9d 32%,var(--line,#263442))}
      .wm-pdf-toast strong{display:block;color:var(--text,#f1f5f8);font-size:11px;line-height:1.25}.wm-pdf-toast span{display:block;margin-top:3px;color:var(--muted,#8fa0af);font-size:8.5px;line-height:1.45}
      #wmDownloadPdf.is-preparing{opacity:.82;pointer-events:none}#wmDownloadPdf.is-done{box-shadow:0 0 0 2px color-mix(in srgb,#6fcf9d 28%,transparent)}
      @media(max-width:560px){.wm-pdf-toast{bottom:18px}.wm-pdf-toast strong{font-size:10.5px}.wm-pdf-toast span{font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  function toast(title='Unduhan PDF dimulai',copy='Cek folder Download pada perangkat Anda.'){ 
    ensureStyles();
    let el=document.getElementById('wmPdfToast');
    if(!el){
      el=document.createElement('div');el.id='wmPdfToast';el.className='wm-pdf-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);
    }
    el.innerHTML=`<div class="wm-pdf-icon">✓</div><div><strong>${title}</strong><span>${copy}</span></div>`;
    requestAnimationFrame(()=>el.classList.add('show'));
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200);
  }

  function setButton(state){
    const btn=document.getElementById('wmDownloadPdf');if(!btn)return;
    if(!btn.dataset.pdfDefaultText)btn.dataset.pdfDefaultText=btn.textContent.trim();
    btn.classList.remove('is-preparing','is-done');
    if(state==='preparing'){btn.classList.add('is-preparing');btn.textContent='Menyiapkan PDF…';}
    else if(state==='done'){
      btn.classList.add('is-done');btn.textContent='PDF Diunduh ✓';
      setTimeout(()=>{btn.classList.remove('is-done');btn.textContent=btn.dataset.pdfDefaultText||'Unduh Ringkasan PDF';},2200);
    }else btn.textContent=btn.dataset.pdfDefaultText||'Unduh Ringkasan PDF';
  }

  function patchJsPdf(){
    const API=window.jspdf?.jsPDF?.API;
    if(!API||API.__analisakuSavePatched)return false;
    const original=API.save;
    if(typeof original!=='function')return false;
    API.__analisakuSavePatched=true;
    API.save=function(filename,options){
      let result;
      try{
        result=original.apply(this,arguments);
        setButton('done');
        toast('Unduhan PDF dimulai','File sedang dikirim ke folder Download. Pada Android, notifikasi browser dapat muncul beberapa saat setelah proses dimulai.');
      }catch(error){
        setButton('idle');
        toast('PDF belum berhasil diunduh','Coba sekali lagi. Jika browser meminta izin download, pilih Izinkan.');
        throw error;
      }
      return result;
    };
    return true;
  }

  function bind(){
    ensureStyles();
    patchJsPdf();
    document.addEventListener('click',event=>{
      if(!event.target.closest('#wmDownloadPdf'))return;
      setButton('preparing');
      // Bila jsPDF terlambat termuat, coba patch lagi sebelum handler download berjalan.
      patchJsPdf();
      setTimeout(()=>{
        const btn=document.getElementById('wmDownloadPdf');
        if(btn?.classList.contains('is-preparing'))setButton('idle');
      },5000);
    },true);
    window.ANALISAKU_WEALTH_PDF={version:VERSION,toast,patch:patchJsPdf};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
