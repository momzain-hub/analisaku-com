/* Analisaku custom select UI — replaces native popup visuals on Technical page. */
(function(){
  if(document.documentElement.dataset.customSelectUiBound==='true')return;
  document.documentElement.dataset.customSelectUiBound='true';

  function ensureStyles(){
    if(document.getElementById('analisakuCustomSelectStyles'))return;
    const s=document.createElement('style');
    s.id='analisakuCustomSelectStyles';
    s.textContent=`
      .analisaku-custom-select{position:relative;display:block;width:100%}
      .analisaku-custom-select>select{position:absolute!important;inset:0!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      .analisaku-select-button{width:100%;min-height:36px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface)!important;color:var(--heading)!important;font:inherit;font-size:10px;text-align:left;cursor:pointer}
      .analisaku-select-button:hover,.analisaku-select-button[aria-expanded="true"]{border-color:color-mix(in srgb,var(--gold) 60%,var(--line));background:color-mix(in srgb,var(--gold) 6%,var(--surface))!important}
      .analisaku-select-button:focus-visible{outline:3px solid color-mix(in srgb,var(--gold) 18%,transparent);outline-offset:2px}
      .analisaku-select-chevron{flex:none;color:var(--gold);font-size:12px;line-height:1}
      .analisaku-select-menu{position:absolute;z-index:10050;left:0;right:0;top:calc(100% + 5px);display:none;max-height:260px;overflow:auto;padding:6px;border:1px solid color-mix(in srgb,var(--gold) 28%,var(--line));border-radius:12px;background:var(--surface2)!important;box-shadow:0 18px 42px rgba(0,0,0,.34)}
      .analisaku-custom-select.open .analisaku-select-menu{display:block}
      .analisaku-select-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:0;border-radius:8px;background:transparent!important;color:var(--heading)!important;font:inherit;font-size:10px;text-align:left;cursor:pointer}
      .analisaku-select-option:hover,.analisaku-select-option.active{background:color-mix(in srgb,var(--gold) 12%,var(--surface3))!important;color:var(--heading)!important}
      .analisaku-select-option.active:after{content:'✓';color:var(--gold);font-weight:900}
      html[data-theme="light"] .analisaku-select-button{background:var(--surface)!important;color:var(--heading)!important}
      html[data-theme="light"] .analisaku-select-menu{background:#fffaf0!important;border-color:rgba(80,53,10,.18)!important;box-shadow:0 16px 36px rgba(84,57,12,.14)}
      html[data-theme="light"] .analisaku-select-option{color:#17120a!important}
      html[data-theme="light"] .analisaku-select-option:hover,html[data-theme="light"] .analisaku-select-option.active{background:#f4ead6!important;color:#17120a!important}
    `;
    document.head.appendChild(s);
  }

  function closeAll(except){
    document.querySelectorAll('.analisaku-custom-select.open').forEach(w=>{if(w!==except){w.classList.remove('open');w.querySelector('.analisaku-select-button')?.setAttribute('aria-expanded','false')}});
  }

  function sync(wrapper,select){
    const btn=wrapper.querySelector('.analisaku-select-button');
    const selected=select.options[select.selectedIndex];
    if(btn)btn.querySelector('.analisaku-select-label').textContent=selected?selected.textContent:'Pilih';
    wrapper.querySelectorAll('.analisaku-select-option').forEach((o,i)=>o.classList.toggle('active',i===select.selectedIndex));
  }

  function build(select){
    if(!select||select.dataset.analisakuCustomSelect==='true'||select.multiple)return;
    select.dataset.analisakuCustomSelect='true';
    const wrapper=document.createElement('div');
    wrapper.className='analisaku-custom-select';
    select.parentNode.insertBefore(wrapper,select);
    wrapper.appendChild(select);

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='analisaku-select-button';
    btn.setAttribute('aria-haspopup','listbox');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span class="analisaku-select-label"></span><span class="analisaku-select-chevron">▾</span>';

    const menu=document.createElement('div');
    menu.className='analisaku-select-menu';
    menu.setAttribute('role','listbox');

    [...select.options].forEach((opt,i)=>{
      const o=document.createElement('button');
      o.type='button';
      o.className='analisaku-select-option';
      o.textContent=opt.textContent;
      o.dataset.index=String(i);
      o.disabled=opt.disabled;
      o.addEventListener('click',()=>{
        if(select.selectedIndex!==i){select.selectedIndex=i;select.dispatchEvent(new Event('change',{bubbles:true}));}
        sync(wrapper,select);wrapper.classList.remove('open');btn.setAttribute('aria-expanded','false');
      });
      menu.appendChild(o);
    });

    wrapper.append(btn,menu);
    sync(wrapper,select);

    btn.addEventListener('click',()=>{
      const willOpen=!wrapper.classList.contains('open');
      closeAll(wrapper);
      wrapper.classList.toggle('open',willOpen);
      btn.setAttribute('aria-expanded',String(willOpen));
    });
    btn.addEventListener('keydown',e=>{
      if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();wrapper.classList.add('open');btn.setAttribute('aria-expanded','true');const active=menu.querySelector('.analisaku-select-option.active')||menu.querySelector('.analisaku-select-option');active?.focus();}
    });
    select.addEventListener('change',()=>sync(wrapper,select));
  }

  function scan(root=document){root.querySelectorAll?.('select').forEach(build)}

  ensureStyles();
  scan();
  document.addEventListener('click',e=>{if(!e.target.closest('.analisaku-custom-select'))closeAll();});
  const observer=new MutationObserver(muts=>{for(const m of muts){m.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('select'))build(n);scan(n);}})}});
  observer.observe(document.body,{childList:true,subtree:true});
})();
