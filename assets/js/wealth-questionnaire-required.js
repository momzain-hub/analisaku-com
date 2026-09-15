/* Wealth v1.9.2 — persistent answers + stable validation */
(function(){
  const VERSION='1.9.2';
  const REQUIRED=['qWhen','qLiquidity','qEmergency','qIncome','qExposure','qDrawdown','qExperience'];
  const route=()=>window.ANALISAKU_WEALTH_ROUTE?.mode||window.ANALISAKU_WEALTH_MODE_API?.getState?.().mode||'goal';
  const key=()=>`analisaku_wealth_answers_${route()}_v192`;
  let answers=load();
  let restoring=false;
  let scheduled=false;

  function load(){
    try{
      const raw=JSON.parse(sessionStorage.getItem(key())||'{}');
      return raw&&typeof raw==='object'?raw:{};
    }catch(_){return {};}
  }
  function save(){try{sessionStorage.setItem(key(),JSON.stringify(answers));}catch(_){}}

  function currentValue(name){
    return document.querySelector(`.wm-mode-questionnaire input[name="${name}"]:checked`)?.value||null;
  }

  function captureAnswers(){
    REQUIRED.forEach(name=>{
      const value=currentValue(name);
      if(value!==null)answers[name]=String(value);
    });
    save();
  }

  function restoreAnswers(){
    if(restoring)return;
    restoring=true;
    REQUIRED.forEach(name=>{
      const value=answers[name];
      if(value===undefined)return;
      const input=document.querySelector(`.wm-mode-questionnaire input[name="${name}"][value="${CSS.escape(String(value))}"]`);
      if(input&&!input.checked)input.checked=true;
    });
    restoring=false;
    updateStatus();
  }

  function answeredCount(){return REQUIRED.filter(name=>currentValue(name)!==null).length;}
  function missingName(){return REQUIRED.find(name=>currentValue(name)===null);}

  function ensureStatus(){
    const wrap=document.querySelector('.wm-submit-wrap');
    if(!wrap)return null;
    let status=document.getElementById('wmAnswerStatus');
    if(status)return status;
    status=document.createElement('div');
    status.id='wmAnswerStatus';
    status.className='wm-answer-status';
    wrap.insertBefore(status,wrap.firstChild);
    return status;
  }

  function updateStatus(){
    const status=ensureStatus();
    if(!status)return;
    const count=answeredCount();
    const complete=count===REQUIRED.length;
    status.classList.toggle('is-complete',complete);
    status.innerHTML=`<div><small>KELENGKAPAN JAWABAN</small><strong>${count} dari ${REQUIRED.length} pertanyaan terjawab</strong></div><span>${complete?'Siap melihat rencana':'Lengkapi semua jawaban terlebih dahulu'}</span>`;
  }

  function showError(name){
    restoreAnswers();
    const input=document.querySelector(`.wm-mode-questionnaire input[name="${name}"]`);
    const card=input?.closest('.wm-mode-q-card');
    const box=document.getElementById('wmFormError');
    if(box){
      box.textContent='Masih ada pertanyaan yang belum dijawab. Jawaban yang sudah dipilih tetap tersimpan; silakan lengkapi bagian yang ditandai.';
      box.hidden=false;
    }
    card?.classList.add('wm-q-missing');
    card?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>card?.classList.remove('wm-q-missing'),1800);
  }

  function scheduleRestore(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      restoreAnswers();
    });
  }

  function bind(){
    // Jangan pernah menghapus jawaban ketika hasil dihitung atau DOM dirender ulang.
    answers=load();
    setTimeout(restoreAnswers,50);

    document.addEventListener('change',event=>{
      const input=event.target.closest('.wm-mode-questionnaire input[type="radio"]');
      if(!input)return;
      answers[input.name]=String(input.value);
      save();
      input.closest('.wm-mode-q-card')?.classList.remove('wm-q-missing');
      const box=document.getElementById('wmFormError');
      if(box&&!missingName())box.hidden=true;
      updateStatus();
    });

    document.addEventListener('click',event=>{
      const build=event.target.closest('#wmBuildPlan');
      if(!build)return;
      captureAnswers();
      restoreAnswers();
      const missing=missingName();
      if(!missing)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showError(missing);
    },true);

    const root=document.querySelector('.wm-oneform')||document.body;
    const observer=new MutationObserver(mutations=>{
      const questionnaireChanged=mutations.some(m=>[...m.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.wm-mode-questionnaire,.wm-mode-q-card')||node.querySelector?.('.wm-mode-questionnaire,.wm-mode-q-card'))));
      if(questionnaireChanged)scheduleRestore();
    });
    observer.observe(root,{childList:true,subtree:true});

    window.ANALISAKU_WEALTH_ANSWER_STATE={version:VERSION,capture:captureAnswers,restore:restoreAnswers,clear(){answers={};save();restoreAnswers();}};
    updateStatus();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
