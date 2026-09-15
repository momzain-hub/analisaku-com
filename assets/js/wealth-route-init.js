/* Wealth v1.6 route init — separate planner modes by URL */
(function(){
  const params=new URLSearchParams(location.search);
  const raw=(params.get('mode')||'').toLowerCase();
  const map={goal:'goal',target:'goal',capital:'lump',lump:'lump',buffer:'buffer'};
  const mode=map[raw]||'';
  if(!mode)return;
  try{
    const key='analisaku_wealth_mode_v13';
    const current=JSON.parse(localStorage.getItem(key)||'{}');
    localStorage.setItem(key,JSON.stringify({...current,mode}));
  }catch(_){ }
  document.documentElement.dataset.wealthRoute=mode;
  window.ANALISAKU_WEALTH_ROUTE={version:'1.6',mode,standalone:true};
})();
