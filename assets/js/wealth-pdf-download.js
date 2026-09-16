/* Wealth v1.9.2.5 — polished client-facing PDF report */
(function(){
  const VERSION='1.9.2.5';
  const $=id=>document.getElementById(id);
  let toastTimer=null;

  const COLORS={
    navy:[18,28,43],
    navy2:[28,40,56],
    gold:[230,184,91],
    teal:[66,199,201],
    green:[88,199,151],
    text:[34,44,58],
    muted:[103,114,128],
    line:[224,229,235],
    soft:[246,248,250],
    softGold:[252,248,238],
    white:[255,255,255]
  };

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
      .replace(/[→⇒]/g,' - ')
      .replace(/[–—]/g,'-')
      .replace(/[Σ]/g,'Sum')
      .replace(/\s+/g,' ')
      .trim();
  }
  function text(id){return clean($(id)?.textContent||'');}
  function childText(root,sel){return clean(root?.querySelector(sel)?.textContent||'');}
  function children(root,sel){return root?[...root.querySelectorAll(sel)]:[];}

  function buildPdf(){
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF)throw new Error('Generator PDF belum siap');
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
    const W=210,H=297,M=14,C=W-(M*2);
    let y=14;

    const setFont=(size=8,bold=false,color=COLORS.text)=>{
      doc.setFont('helvetica',bold?'bold':'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const newPage=()=>{doc.addPage();y=14;};
    const pageBreak=(need=12)=>{if(y+need>H-18)newPage();};
    const wrap=(value,width=C)=>doc.splitTextToSize(clean(value),width);
    const write=(value,size=8,bold=false,color=COLORS.text,width=C,lineH=4.1)=>{
      const lines=wrap(value,width);if(!lines.length)return;
      pageBreak((lines.length*lineH)+2);
      setFont(size,bold,color);doc.text(lines,M,y);y+=lines.length*lineH;
    };
    const sectionTitle=(eyebrow,title,subtitle='')=>{
      pageBreak(subtitle?22:16);
      y+=3;
      setFont(6.5,true,COLORS.gold);doc.text(clean(eyebrow).toUpperCase(),M,y);y+=5;
      setFont(13,true,COLORS.text);doc.text(clean(title),M,y);y+=5;
      if(subtitle){setFont(7.2,false,COLORS.muted);const lines=wrap(subtitle,C);doc.text(lines,M,y);y+=(lines.length*3.8)+2;}
      doc.setDrawColor(...COLORS.line);doc.line(M,y,W-M,y);y+=5;
    };
    const roundedBox=(x,yy,w,h,fill=COLORS.soft,stroke=COLORS.line)=>{
      doc.setFillColor(...fill);doc.setDrawColor(...stroke);doc.roundedRect(x,yy,w,h,3,3,'FD');
    };
    const metricCard=(x,yy,w,label,value,note='',accent=COLORS.text)=>{
      roundedBox(x,yy,w,22,COLORS.soft,COLORS.line);
      setFont(5.8,true,COLORS.muted);doc.text(clean(label).toUpperCase(),x+4,yy+5);
      setFont(10.2,true,accent);doc.text(clean(value||'-'),x+4,yy+12,{maxWidth:w-8});
      if(note){setFont(5.8,false,COLORS.muted);doc.text(wrap(note,w-8),x+4,yy+17,{maxWidth:w-8});}
    };
    const labelValue=(x,yy,label,value,w=84)=>{
      setFont(6,false,COLORS.muted);doc.text(clean(label),x,yy);
      setFont(8,true,COLORS.text);doc.text(clean(value||'-'),x+34,yy,{maxWidth:w-34});
    };
    const callout=(title,body,accent=COLORS.gold)=>{
      const lines=wrap(body,C-12);const h=Math.max(20,12+(lines.length*3.8));
      pageBreak(h+4);
      doc.setFillColor(...COLORS.softGold);doc.setDrawColor(...accent);doc.roundedRect(M,y,C,h,3,3,'FD');
      setFont(6.2,true,accent);doc.text(clean(title).toUpperCase(),M+5,y+6);
      setFont(8,true,COLORS.text);doc.text(lines,M+5,y+12,{maxWidth:C-10});
      y+=h+5;
    };

    const mode=document.body.dataset.wealthMode||'wealth';
    const goal=text('resultGoalTitle')||mode.toUpperCase();
    const profile=text('resultProfile')||'-';
    const risk=text('resultRiskLevel')?`Level ${text('resultRiskLevel')}/5`:'-';

    // Header
    doc.setFillColor(...COLORS.navy);doc.roundedRect(M,y,C,31,4,4,'F');
    setFont(18,true,COLORS.white);doc.text('analisaku.com',M+7,y+10);
    setFont(7,false,[210,220,231]);doc.text('WEALTH MANAGEMENT PLAN',M+7,y+16);
    setFont(10,true,COLORS.gold);doc.text(clean(goal),M+7,y+24,{maxWidth:112});
    setFont(6.5,false,[180,190,202]);doc.text(new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}),W-M-7,y+9,{align:'right'});
    y+=39;

    // Executive summary
    sectionTitle('01 • RINGKASAN','Rencana investasi Anda','Satu halaman pertama untuk memahami tujuan, posisi saat ini, batas risiko, dan langkah berikutnya.');

    roundedBox(M,y,C,28,[250,251,252],COLORS.line);
    labelValue(M+5,y+8,'Tujuan / Mode',goal,83);
    labelValue(M+96,y+8,'Profil Investasi',profile,80);
    labelValue(M+5,y+18,'Tingkat Risiko',risk,83);
    labelValue(M+96,y+18,'Horizon',text('resultGoalSub')||text('resultWhen'),80);
    y+=34;

    const target=text('resultFutureTarget');
    const projected=text('resultProjected');
    const funding=text('resultFunding');
    const required=text('resultRequired');
    const gapLike=/kurang|gap|rp/i.test(funding)&&!/%/.test(funding);
    const cardW=(C-6)/2;
    metricCard(M,y,cardW,'Target Dana Masa Depan',target,'Dana yang dibutuhkan pada akhir horizon.',COLORS.text);
    metricCard(M+cardW+6,y,cardW,'Estimasi Nilai Investasi',projected,'Berdasarkan dana awal, setoran, dan asumsi return.',COLORS.teal);
    y+=27;
    metricCard(M,y,cardW,gapLike?'Gap Target':'Tingkat Pencapaian',funding,gapLike?'Selisih terhadap target akhir.':'Perbandingan proyeksi terhadap target.',gapLike?COLORS.gold:COLORS.green);
    metricCard(M+cardW+6,y,cardW,'Kebutuhan Investasi / Bulan',required,'Indikatif untuk mendekati target.',COLORS.gold);
    y+=30;

    setFont(7,true,COLORS.text);doc.text('Tiga faktor yang membentuk batas risiko',M,y);y+=6;
    const lensW=(C-8)/3;
    [['WAKTU',text('resultWhen')],['KEMAMPUAN',text('resultAble')],['KENYAMANAN',text('resultComfort')]].forEach((item,i)=>{
      roundedBox(M+i*(lensW+4),y,lensW,18,[248,250,252],COLORS.line);
      setFont(5.8,true,COLORS.muted);doc.text(item[0],M+i*(lensW+4)+4,y+5);
      setFont(9,true,COLORS.text);doc.text(item[1]||'-',M+i*(lensW+4)+4,y+12,{maxWidth:lensW-8});
    });
    y+=23;

    const profileCopy=text('resultProfileCopy');
    if(profileCopy){setFont(7,false,COLORS.muted);const lines=wrap(profileCopy,C);doc.text(lines,M,y);y+=(lines.length*3.8)+3;}
    const next=text('resultNext');if(next)callout('Langkah Berikutnya',next,COLORS.gold);

    // Products
    const products=$('resultProducts');
    const productRows=children(products,'.wm-product');
    if(productRows.length){
      sectionTitle('02 • PILIHAN PRODUK','Kelas aset yang sesuai','Disusun dari tujuan, horizon, kebutuhan likuiditas, kondisi finansial, dan kenyamanan Anda terhadap risiko.');
      productRows.forEach((row,i)=>{
        const name=childText(row,'strong')||`Produk ${i+1}`;
        const desc=childText(row,'p');
        const status=childText(row,'.fit')||'SESUAI';
        const lines=wrap(desc,C-45);const h=Math.max(15,10+lines.length*3.4);
        pageBreak(h+2);
        roundedBox(M,y,C,h,[250,251,252],COLORS.line);
        doc.setFillColor(...COLORS.navy2);doc.roundedRect(M+4,y+4,8,8,2,2,'F');
        setFont(6,true,COLORS.white);doc.text(String(i+1),M+8,y+9,{align:'center'});
        setFont(8.2,true,COLORS.text);doc.text(name,M+16,y+7,{maxWidth:C-52});
        setFont(6.4,false,COLORS.muted);doc.text(lines,M+16,y+12,{maxWidth:C-45});
        setFont(5.7,true,COLORS.green);doc.text(status,W-M-5,y+7,{align:'right'});
        y+=h+3;
      });
    }

    // Allocation
    const allocation=$('resultAllocation');
    const allocationRows=allocation?[...allocation.children]:[];
    if(allocationRows.length){
      sectionTitle('03 • KOMPOSISI PORTOFOLIO','Contoh komposisi investasi','Bobot berikut adalah ilustrasi alokasi awal dan tetap perlu ditinjau berkala.');
      const items=allocationRows.map(el=>({name:childText(el,'span')||clean(el.textContent),value:childText(el,'b')}));
      const aw=(C-9)/4;
      items.slice(0,4).forEach((it,i)=>{
        roundedBox(M+i*(aw+3),y,aw,23,[248,250,252],COLORS.line);
        setFont(5.6,false,COLORS.muted);doc.text(wrap(it.name,aw-6),M+i*(aw+3)+3,y+6,{maxWidth:aw-6});
        setFont(13,true,i===3?COLORS.teal:COLORS.text);doc.text(it.value||'-',M+i*(aw+3)+3,y+18);
      });
      y+=29;
    }

    // Future value starts cleanly on a new page for readability
    const future=$('wmFutureValue');
    if(future){
      newPage();
      sectionTitle('04 • PROYEKSI NILAI','Future value per instrumen','Dana disetor, estimasi return, dan nilai pasar proyeksi ditampilkan terpisah agar kontribusi setiap aset mudah dibaca.');

      const summary=[...future.querySelectorAll('.wm-fv-summary > div')].map(el=>({
        label:childText(el,'small'),value:childText(el,'b'),note:childText(el,'span')
      }));
      if(summary.length){
        const sw=(C-6)/2;
        summary.slice(0,4).forEach((s,i)=>{
          const xx=M+(i%2)*(sw+6), yy=y+Math.floor(i/2)*27;
          metricCard(xx,yy,sw,s.label,s.value,s.note,(i===1||i===2)?COLORS.green:COLORS.text);
        });
        y+=58;
      }

      callout('Cara Membaca Proyeksi','Asumsi return tahunan adalah tingkat pertumbuhan yang digunakan dalam simulasi. Karena investasi bulanan masuk bertahap, persentase return terhadap dana yang sudah disetor tidak otomatis sama dengan asumsi return tahunan.',COLORS.teal);

      const assets=[...future.querySelectorAll('.wm-fv-asset-card')];
      if(assets.length){
        setFont(8,true,COLORS.text);doc.text('Rincian per instrumen',M,y);y+=6;
        const cardW2=(C-6)/2;
        assets.forEach((asset,i)=>{
          const xx=M+(i%2)*(cardW2+6);
          if(i%2===0)pageBreak(45);
          const yy=y;
          const name=childText(asset,'.wm-fv-asset-head strong');
          const weight=childText(asset,'.wm-fv-asset-head > span');
          const rate=childText(asset,'.wm-fv-asset-rate b');
          const metrics=[...asset.querySelectorAll('.wm-fv-asset-metrics > div')].map(el=>({label:childText(el,'small'),value:childText(el,'b'),extra:childText(el,'em')}));
          roundedBox(xx,yy,cardW2,40,[249,251,252],COLORS.line);
          setFont(7.8,true,COLORS.text);doc.text(name||`Instrumen ${i+1}`,xx+4,yy+6,{maxWidth:cardW2-24});
          setFont(7,true,COLORS.teal);doc.text(weight||'',xx+cardW2-4,yy+6,{align:'right'});
          setFont(5.6,false,COLORS.muted);doc.text(`Asumsi return ${rate||'-'} / tahun`,xx+4,yy+11);
          let my=yy+18;
          metrics.slice(0,3).forEach((m,j)=>{
            setFont(5.2,true,COLORS.muted);doc.text(clean(m.label).toUpperCase(),xx+4,my);
            setFont(7.3,true,j===1?COLORS.green:COLORS.text);doc.text(m.value||'-',xx+4,my+4,{maxWidth:cardW2-8});
            if(m.extra){setFont(5.3,false,j===1?COLORS.green:COLORS.muted);doc.text(m.extra,xx+4,my+8,{maxWidth:cardW2-8});my+=4;}
            my+=9;
          });
          if(i%2===1||i===assets.length-1)y+=45;
        });
      }

      // Yearly projection
      const years=[...future.querySelectorAll('.wm-year-card')];
      if(years.length){
        newPage();
        sectionTitle('05 • RINCIAN TAHUNAN','Perkembangan dari tahun pertama hingga akhir','Setiap kartu menunjukkan dana kumulatif yang sudah disetor, estimasi return, nilai pasar proyeksi, dan posisi setiap instrumen pada akhir periode.');
        callout('Catatan Setoran Bulanan','Setoran yang masuk lebih awal memiliki waktu lebih panjang untuk bertumbuh dibanding setoran yang masuk mendekati akhir tahun. Karena itu, return kumulatif terhadap dana disetor akan berkembang bertahap dari tahun ke tahun.',COLORS.teal);

        years.forEach((yr,index)=>{
          const period=childText(yr,'.wm-year-card-head strong')||`Tahun ${index+1}`;
          const total=childText(yr,'.wm-year-card-head > b');
          const sums=[...yr.querySelectorAll('.wm-year-card-summary > div')].map(el=>({label:childText(el,'small'),value:childText(el,'b'),extra:childText(el,'em')}));
          const assetRows=[...yr.querySelectorAll('.wm-year-assets > div')].map(el=>({name:childText(el,'span'),value:childText(el,'b'),notes:[...el.querySelectorAll('small')].map(x=>clean(x.textContent))}));
          const h=assetRows.length?38:25;
          pageBreak(h+5);
          roundedBox(M,y,C,h,index===years.length-1?COLORS.softGold:[249,251,252],index===years.length-1?COLORS.gold:COLORS.line);
          setFont(5.8,true,index===years.length-1?COLORS.gold:COLORS.muted);doc.text(index===years.length-1?'PERIODE AKHIR':'PROYEKSI TAHUNAN',M+5,y+6);
          setFont(10.5,true,COLORS.text);doc.text(period,M+5,y+13);
          setFont(10.5,true,COLORS.text);doc.text(total||'',W-M-5,y+13,{align:'right'});
          if(sums.length){
            const kw=(C-12)/3;
            sums.slice(0,3).forEach((s,j)=>{
              const xx=M+5+j*(kw+1);
              setFont(5.2,true,COLORS.muted);doc.text(clean(s.label).toUpperCase(),xx,y+19);
              setFont(7.5,true,j===1?COLORS.green:COLORS.text);doc.text(s.value||'-',xx,y+24,{maxWidth:kw-2});
              if(s.extra){setFont(5.1,false,j===1?COLORS.green:COLORS.muted);doc.text(s.extra,xx,y+28,{maxWidth:kw-2});}
            });
          }
          if(assetRows.length){
            const baseY=y+32;const cellW=(C-12)/Math.min(4,assetRows.length);
            assetRows.slice(0,4).forEach((a,j)=>{
              const xx=M+5+j*cellW;
              setFont(5.1,false,COLORS.muted);doc.text(clean(a.name),xx,baseY,{maxWidth:cellW-2});
              setFont(6.4,true,COLORS.text);doc.text(a.value||'-',xx,baseY+4,{maxWidth:cellW-2});
            });
          }
          y+=h+4;
        });
      }
    }

    sectionTitle('06 • CATATAN PENTING','Tentang simulasi ini');
    write('Simulasi ini merupakan panduan awal dan bukan jaminan hasil investasi. Nilai pasar yang ditampilkan merupakan proyeksi berdasarkan asumsi return, bukan harga pasar aktual. Sebelum bertransaksi, pelajari karakteristik produk, prospektus atau fund fact sheet, biaya, pajak, likuiditas, serta risiko yang berlaku.',7,false,COLORS.muted,C,4);

    // Footer + page numbers
    const pageCount=doc.getNumberOfPages();
    for(let p=1;p<=pageCount;p++){
      doc.setPage(p);
      doc.setDrawColor(...COLORS.line);doc.line(M,H-11,W-M,H-11);
      setFont(5.8,false,COLORS.muted);
      doc.text('analisaku.com • Wealth Management Plan',M,H-6);
      doc.text(`Halaman ${p} / ${pageCount}`,W-M,H-6,{align:'right'});
    }
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
    setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},20000);
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
        showToast('PDF ringkasan berhasil dibuat. Format baru lebih ringkas dan mudah dibaca.');
      }catch(error){
        console.error('Wealth PDF failed',error);
        showToast(`PDF belum berhasil dibuat: ${error?.message||'terjadi kesalahan'}.`,true);
      }finally{
        setPreparing(false);
      }
    },true);
    window.ANALISAKU_WEALTH_PDF_DOWNLOAD={version:VERSION,mode:'polished-report'};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
