/* Wealth v1.10.1 — consultation CTA to WhatsApp */
(function(){
  const VERSION='1.10.1';
  const WHATSAPP_NUMBER='6285218797877';

  function clean(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function buildMessage(){
    const goal=clean(document.getElementById('resultGoalTitle')?.textContent);
    const profile=clean(document.getElementById('resultProfile')?.textContent);
    const risk=clean(document.getElementById('resultRiskLevel')?.textContent);
    const projected=clean(document.getElementById('resultProjected')?.textContent);

    const lines=[
      'Halo, saya ingin berkonsultasi mengenai hasil Wealth Plan Analisaku.com saya.'
    ];
    if(goal&&goal!=='—')lines.push(`Tujuan/kebutuhan: ${goal}`);
    if(profile&&profile!=='—')lines.push(`Profil investasi: ${profile}`);
    if(risk&&risk!=='—')lines.push(`Tingkat risiko rencana: ${risk}`);
    if(projected&&projected!=='—')lines.push(`Proyeksi dana: ${projected}`);
    lines.push('Mohon bantu saya memahami pilihan instrumen yang dapat dipertimbangkan sesuai kebutuhan investasi saya.');
    return lines.join('\n');
  }

  function whatsappUrl(){
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
  }

  function ensureCta(){
    const result=document.getElementById('wealth-result');
    if(!result)return;
    const body=result.querySelector('.wm-step-body');
    const actions=result.querySelector('.wm-result-actions');
    const disclaimer=result.querySelector('.wm-disclaimer:not(#wmFormError)');
    if(!body||!actions||!disclaimer)return;

    let card=result.querySelector('.wm-consult-card');
    if(!card){
      card=document.createElement('section');
      card.className='wm-consult-card';
      card.innerHTML=`
        <div class="wm-consult-copy">
          <small>LANJUTKAN RENCANA ANDA</small>
          <h3>Lanjutkan rencana Anda</h3>
          <p>Konsultasikan hasil Wealth Plan dan pilihan instrumen yang dapat dipertimbangkan sesuai kebutuhan investasi Anda.</p>
        </div>
        <a class="wm-consult-button" href="#" target="_blank" rel="noopener noreferrer" aria-label="Konsultasikan Rencana Saya melalui WhatsApp">
          <span>Konsultasikan Rencana Saya</span><b>→</b>
        </a>`;
      body.insertBefore(card,disclaimer);
    }

    const link=card.querySelector('.wm-consult-button');
    if(link){
      link.href=whatsappUrl();
      link.onclick=function(){ this.href=whatsappUrl(); };
    }
  }

  function init(){
    ensureCta();
    const observer=new MutationObserver(()=>ensureCta());
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',event=>{
      if(event.target.closest('#wmBuildPlan,#wmEditPlan,[data-equity-preset],#wmReturnReset'))setTimeout(ensureCta,80);
    });
    window.ANALISAKU_WEALTH_CONSULTATION={version:VERSION,number:WHATSAPP_NUMBER,refresh:ensureCta};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
