/* Wealth v1.9 — explicit answers + professional validation */
(function(){
  const REQUIRED=['qWhen','qLiquidity','qEmergency','qIncome','qExposure','qDrawdown','qExperience'];
  function clearModeAnswers(){document.querySelectorAll('.wm-mode-questionnaire input[type="radio"]').forEach(input=>{input.checked=false;});}
  function missingName(){return REQUIRED.find(name=>!document.querySelector(`.wm-mode-questionnaire input[name="${name}"]:checked`));}
  function showError(name){
    const input=document.querySelector(`.wm-mode-questionnaire input[name="${name}"]`);
    const card=input?.closest('.wm-mode-q-card');
    const box=document.getElementById('wmFormError');
    if(box){box.textContent='Masih ada pertanyaan yang belum dijawab. Lengkapi seluruh bagian agar hasil rencana dapat dihitung dengan konsisten.';box.hidden=false;}
    card?.classList.add('wm-q-missing');
    card?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>card?.classList.remove('wm-q-missing'),1800);
  }
  function bind(){
    setTimeout(clearModeAnswers,30);
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-plan-mode]'))setTimeout(clearModeAnswers,60);
      const build=event.target.closest('#wmBuildPlan');
      if(!build)return;
      const missing=missingName();
      if(!missing)return;
      event.preventDefault();event.stopImmediatePropagation();showError(missing);
    },true);
    document.addEventListener('change',event=>{
      if(!event.target.matches('.wm-mode-questionnaire input[type="radio"]'))return;
      event.target.closest('.wm-mode-q-card')?.classList.remove('wm-q-missing');
      const box=document.getElementById('wmFormError');if(box&&!missingName())box.hidden=true;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
