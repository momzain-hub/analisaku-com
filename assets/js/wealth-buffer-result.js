/* Wealth v1.6 — dedicated Investor/Trader Cash Buffer result */
(function(){
  const VERSION='1.6';
  const $=id=>document.getElementById(id);
  const rupiah=v=>'Rp '+Math.round(Number(v)||0).toLocaleString('id-ID');
  const pct=v=>`${Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`;

  function isBuffer(){return window.ANALISAKU_WEALTH_ROUTE?.mode==='buffer';}
  function n(id,fallback=0){const v=Number($(id)?.value);return Number.isFinite(v)?v:fallback;}
  function answer(name){const el=document.querySelector(`input[name="${name}"]:checked`);return el?Number(el.value):null;}
  function state(){return window.ANALISAKU_WEALTH_MODE_API?.getState?.()||{};}

  function bufferSplit(){
    const liquidity=answer('qLiquidity')||3;
    if(liquidity<=1)return {rdpu:100,rdpt:0,label:'Likuiditas Maksimum'};
    if(liquidity===2)return {rdpu:80,rdpt:20,label:'Sangat Likuid'};
    if(liquidity===3)return {rdpu:65,rdpt:35,label:'Seimbang'};
    return {rdpu:50,rdpt:50,label:'Yield + Likuiditas'};
  }

  function assumptions(){
    const custom=Boolean($('wmUseCustomReturns')?.checked);
    const rdpu=custom?n('wmReturnCash',5):5;
    const rdpt=custom?n('wmReturnBond',6.5):6.5;
    return {custom,rdpu,rdpt};
  }

  function calc(){
    const s=state();
    const total=Number(s.totalCapital)||n('wmTarget',0)+0;
    const bufferPct=Math.max(0,Math.min(80,Number(s.bufferPct)||n('wmBufferPct',20)));
    const buffer=Number(s.bufferCash)||total*bufferPct/100;
    const active=Number(s.investedInitial)||Math.max(0,total-buffer);
    const split=bufferSplit();
    const ret=assumptions();
    const rdpuAmount=buffer*split.rdpu/100;
    const rdptAmount=buffer*split.rdpt/100;
    const weighted=(split.rdpu/100)*ret.rdpu+(split.rdpt/100)*ret.rdpt;
    const est1y=buffer*weighted/100;
    const end1y=buffer+est1y;
    return {total,bufferPct,buffer,active,split,ret,rdpuAmount,rdptAmount,weighted,est1y,end1y};
  }

  function hideGeneric(){
    const productCard=$('resultProducts')?.closest('.wm-result-card');
    const allocationCard=$('resultAllocation')?.closest('.wm-result-card');
    const row=productCard?.parentElement;
    if(row)row.hidden=true;
    if(productCard)productCard.hidden=true;
    if(allocationCard)allocationCard.hidden=true;
    const equity=$('wmEquitySleeve');if(equity)equity.hidden=true;
    const fv=$('wmFutureValue');if(fv)fv.hidden=true;
  }

  function ensurePanel(){
    let panel=$('wmDedicatedBufferResult');
    if(panel)return panel;
    const result=$('wealth-result')?.querySelector('.wm-step-body');
    const actions=result?.querySelector('.wm-result-actions');
    if(!result)return null;
    panel=document.createElement('section');
    panel.id='wmDedicatedBufferResult';
    panel.className='wm-buffer-result';
    if(actions)result.insertBefore(panel,actions);else result.appendChild(panel);
    return panel;
  }

  function render(){
    if(!isBuffer())return;
    hideGeneric();
    const c=calc();
    const panel=ensurePanel();
    if(!panel)return;
    panel.innerHTML=`
      <div class="wm-buffer-result-head">
        <div><small>RENCANA CASH BUFFER • v${VERSION}</small><h3>Pisahkan likuiditas dan modal aktif.</h3><p>Mode ini tidak memakai proyeksi investasi bulanan dan tidak mencampurkan RD Campuran atau Saham ke dalam cash buffer. Buffer hanya ditempatkan pada instrumen likuid/defensif; modal aktif dihitung terpisah.</p></div>
        <span>${c.split.label}</span>
      </div>
      <div class="wm-buffer-kpis">
        <article><small>TOTAL MODAL</small><b>${rupiah(c.total)}</b><span>100% modal tersedia</span></article>
        <article><small>CASH BUFFER</small><b>${rupiah(c.buffer)}</b><span>${pct(c.bufferPct)} dari total modal</span></article>
        <article><small>MODAL AKTIF</small><b>${rupiah(c.active)}</b><span>${pct(100-c.bufferPct)} untuk investasi/trading</span></article>
        <article><small>EST. RETURN BUFFER</small><b>${pct(c.weighted)}/tahun</b><span>Asumsi tertimbang RDPU + RDPT</span></article>
      </div>
      <div class="wm-buffer-buckets">
        <article>
          <div><small>BUFFER 01</small><strong>Reksa Dana Pasar Uang</strong><em>${pct(c.split.rdpu)}</em></div>
          <b>${rupiah(c.rdpuAmount)}</b>
          <p>Untuk kebutuhan likuiditas yang lebih tinggi. Asumsi return ${pct(c.ret.rdpu)}/tahun.</p>
        </article>
        <article>
          <div><small>BUFFER 02</small><strong>Obligasi / RD Pendapatan Tetap</strong><em>${pct(c.split.rdpt)}</em></div>
          <b>${rupiah(c.rdptAmount)}</b>
          <p>Untuk bagian buffer yang tidak perlu dicairkan segera. Asumsi return ${pct(c.ret.rdpt)}/tahun dan tetap memiliki risiko harga.</p>
        </article>
      </div>
      <div class="wm-buffer-one-year">
        <div><small>SIMULASI BUFFER 12 BULAN</small><strong>${rupiah(c.buffer)} → ${rupiah(c.end1y)}</strong><span>Estimasi hasil +${rupiah(c.est1y)} berdasarkan asumsi return. Bukan jaminan hasil.</span></div>
        <div><small>MODAL AKTIF</small><strong>${rupiah(c.active)}</strong><span>Tidak diberi proyeksi return otomatis karena hasil investasi/trading tidak tetap. Gunakan modal aktif untuk strategi saham secara terpisah.</span></div>
      </div>
      <div class="wm-buffer-logic"><b>Kenapa tidak ada Tahun 1–5?</b> Cash Buffer adalah pengaturan struktur modal, bukan goal-based investing. Karena modal sudah tersedia sejak awal, buffer dihitung sebagai penempatan dana sekaligus. Proyeksi investasi bertahap dan setoran bulanan sengaja tidak digunakan di mode ini.</div>`;

    const resultHead=$('wealth-result')?.querySelector('.wm-step-head');
    if(resultHead){
      const h2=resultHead.querySelector('h2');const p=resultHead.querySelector('p');
      if(h2)h2.textContent='Rencana cash buffer Anda.';
      if(p)p.textContent='Ringkasan ini memisahkan dana likuid dan modal aktif agar fungsi keduanya tidak tercampur.';
    }

    const dl=$('wmDownloadPdf');if(dl)dl.textContent='Unduh Ringkasan Buffer PDF';
  }

  function downloadPdf(event){
    if(!isBuffer())return;
    event.preventDefault();event.stopImmediatePropagation();
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF){alert('Generator PDF belum siap. Refresh halaman lalu coba kembali.');return;}
    const c=calc();
    const doc=new jsPDF({unit:'mm',format:'a4'});let y=18;const M=16,W=210,C=W-M*2;
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('analisaku.com',M,y);y+=8;
    doc.setFontSize(13);doc.text('Rencana Cash Buffer',M,y);y+=8;
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Investor / Trader — Wealth v1.6',M,y);y+=12;
    const rows=[['Total modal',rupiah(c.total)],['Cash buffer',`${rupiah(c.buffer)} (${pct(c.bufferPct)})`],['Modal aktif',`${rupiah(c.active)} (${pct(100-c.bufferPct)})`],['RDPU',`${rupiah(c.rdpuAmount)} (${pct(c.split.rdpu)})`],['Obligasi / RDPT',`${rupiah(c.rdptAmount)} (${pct(c.split.rdpt)})`],['Estimasi return buffer',`${pct(c.weighted)}/tahun`],['Estimasi nilai buffer 12 bulan',rupiah(c.end1y)]];
    rows.forEach(([a,b])=>{doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(a,M,y);doc.setFont('helvetica','bold');doc.text(b,W-M,y,{align:'right'});doc.line(M,y+2,W-M,y+2);y+=10;});
    y+=6;doc.setFont('helvetica','bold');doc.text('Catatan',M,y);y+=6;doc.setFont('helvetica','normal');doc.setFontSize(8);const note='Cash buffer diproyeksikan terpisah dari modal aktif. Mode ini tidak menggunakan setoran bulanan atau proyeksi Tahun 1-5. Return merupakan asumsi ilustratif dan bukan jaminan hasil. RD Pendapatan Tetap tetap memiliki risiko harga dan likuiditas.';doc.text(doc.splitTextToSize(note,C),M,y);
    doc.save(`Analisaku-Cash-Buffer-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function bind(){
    if(!isBuffer())return;
    $('wmBuildPlan')?.addEventListener('click',()=>setTimeout(render,180));
    document.addEventListener('click',event=>{if(event.target.closest('#wmDownloadPdf'))downloadPdf(event);},true);
    const observer=new MutationObserver(()=>{if(document.body.classList.contains('wealth-result-ready'))render();});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
