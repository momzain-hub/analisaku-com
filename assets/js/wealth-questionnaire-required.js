/* Wealth v1.4 — require explicit answers for mode-specific questionnaire */
(function(){
  function clearModeAnswers(){
    document.querySelectorAll('.wm-mode-questionnaire input[type="radio"]').forEach(input=>{input.checked=false;});
  }
  function bind(){
    setTimeout(clearModeAnswers,30);
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-plan-mode]'))setTimeout(clearModeAnswers,60);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
