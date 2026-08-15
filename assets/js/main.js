/* =========================================================
   ANALISAKU GLOBAL JS
   Theme + adaptive brand + mobile nav + calculators + filters
   + homepage market context + technical readiness tools
   ========================================================= */

const activeScript=document.currentScript;
const assetUrl=(relative,fallback)=>activeScript?new URL(relative,activeScript.src).href:fallback;
const themeCssUrl=assetUrl('../css/theme.css','assets/css/theme.css');
const functionalCssUrl=assetUrl('../css/functional.css','assets/css/functional.css');
const darkLogoUrl=assetUrl('../img/logo-analisaku.svg','assets/img/logo-analisaku.svg');
const lightLogoUrl=assetUrl('../img/logo-analisaku-light.svg','assets/img/logo-analisaku-light.svg');

/* Load global visual layers last so they cleanly override legacy page CSS. */
if(!document.querySelector('link[data-analisaku-theme],link[href$="theme.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=themeCssUrl;
  link.dataset.analisakuTheme='true';
  document.head.appendChild(link);
}
if(!document.querySelector('link[data-analisaku-functional],link[href$="functional.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=functionalCssUrl;
  link.dataset.analisakuFunctional='true';
  document.head.appendChild(link);
}

const THEME_KEY='analisaku-theme';
const mediaQuery=window.matchMedia?window.matchMedia('(prefers-color-scheme: light)'):null;
const systemTheme=()=>mediaQuery&&mediaQuery.matches?'light':'dark';
const storedTheme=()=>{
  try{
    const value=localStorage.getItem(THEME_KEY);
    return value==='light'||value==='dark'?value:null;
  }catch(e){return null}
};

function ensureBrandLogos(){
  document.querySelectorAll('.brand').forEach(brand=>{
    let img=brand.querySelector('img');
    if(!img){
      brand.textContent='';
      img=document.createElement('img');
      img.alt='analisaku.com';
      brand.appendChild(img);
    }
    brand.classList.add('brand-logo');
    img.dataset.themeLogo='true';
    img.decoding='async';
  });
}

function updateThemeLogo(theme){
  ensureBrandLogos();
  document.querySelectorAll('img[data-theme-logo],img[src*="logo-analisaku"]').forEach(img=>{
    img.dataset.themeLogo='true';
    img.src=theme==='light'?lightLogoUrl:darkLogoUrl;
  });
}

function updateThemeMeta(theme){
  let meta=document.querySelector('meta[name="theme-color"]');
  if(!meta){
    meta=document.createElement('meta');
    meta.name='theme-color';
    document.head.appendChild(meta);
  }
  meta.content=theme==='light'?'#fbf7ef':'#06111d';
}

function themeIcon(theme){
  return theme==='dark'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
}

let themeToggle=null;
function applyTheme(theme,{persist=false}={}){
  const safeTheme=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=safeTheme;
  if(persist){try{localStorage.setItem(THEME_KEY,safeTheme)}catch(e){}}
  updateThemeMeta(safeTheme);
  updateThemeLogo(safeTheme);
  if(themeToggle){
    const isDark=safeTheme==='dark';
    themeToggle.innerHTML=themeIcon(safeTheme);
    themeToggle.setAttribute('aria-label',isDark?'Ganti ke mode terang':'Ganti ke mode gelap');
    themeToggle.title=isDark?'Mode terang':'Mode gelap';
  }
}

applyTheme(storedTheme()||systemTheme());

const menuBtn=document.getElementById('menuBtn');
const mainNav=document.getElementById('mainNav');
if(menuBtn&&mainNav){
  menuBtn.addEventListener('click',()=>{
    const open=mainNav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded',String(open));
  });
  mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mainNav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded','false');
  }));
}

const navWrap=document.querySelector('.nav-wrap');
if(navWrap){
  themeToggle=navWrap.querySelector('.theme-toggle');
  if(!themeToggle){
    themeToggle=document.createElement('button');
    themeToggle.type='button';
    themeToggle.className='theme-toggle';
    themeToggle.setAttribute('aria-live','polite');
    navWrap.insertBefore(themeToggle,menuBtn||null);
  }
  themeToggle.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    applyTheme(next,{persist:true});
  });
  applyTheme(document.documentElement.dataset.theme||storedTheme()||systemTheme());
}

if(mediaQuery){
  const onSystemChange=()=>{if(!storedTheme())applyTheme(systemTheme())};
  if(mediaQuery.addEventListener)mediaQuery.addEventListener('change',onSystemChange);
}

const year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();

/* ---------- Investment calculators ---------- */
function num(id){const el=document.getElementById(id);return el?parseFloat(el.value):NaN}
function show(id,text){const el=document.getElementById(id);if(!el)return;el.textContent=text;el.style.display='block'}
function rupiah(v){return 'Rp '+Math.round(v).toLocaleString('id-ID')}
function validPositive(values){return values.every(v=>Number.isFinite(v)&&v>=0)}

window.calcAverage=function(){
  const p1=num('avgOldPrice'),l1=num('avgOldLot'),p2=num('avgNewPrice'),l2=num('avgNewLot');
  if(!validPositive([p1,l1,p2,l2])||p1<=0||p2<=0||l1<=0||l2<=0)return show('avgResult','Isi seluruh data dengan benar.');
  const totalLot=l1+l2,avg=((p1*l1)+(p2*l2))/totalLot;
  show('avgResult','Average baru '+rupiah(avg)+' • Total posisi '+totalLot.toLocaleString('id-ID')+' lot.');
};

window.calcRR=function(){
  const entry=num('rrEntry'),stop=num('rrStop'),target=num('rrTarget'),capital=num('rrCapital');
  if(!validPositive([entry,stop,target])||entry<=0)return show('rrResult','Isi entry, stop loss, dan target dengan benar.');
  const risk=Math.abs(entry-stop),reward=Math.abs(target-entry);
  if(risk===0)return show('rrResult','Stop loss tidak boleh sama dengan entry.');
  const ratio=reward/risk;
  let text='Risk : Reward = 1 : '+ratio.toFixed(2)+' • Risiko harga '+((risk/entry)*100).toFixed(2)+'% • Potensi '+((reward/entry)*100).toFixed(2)+'%.';
  if(Number.isFinite(capital)&&capital>0)text+=' Estimasi risiko nominal '+rupiah(capital*risk/entry)+' dan potensi reward '+rupiah(capital*reward/entry)+'.';
  show('rrResult',text);
};

window.calcPosition=function(){
  const capital=num('psCapital'),riskPct=num('psRisk'),entry=num('psEntry'),stop=num('psStop');
  if(!validPositive([capital,riskPct,entry,stop])||capital<=0||riskPct<=0||entry<=0)return show('psResult','Isi seluruh data dengan benar.');
  const riskCash=capital*(riskPct/100),riskPerShare=Math.abs(entry-stop);
  if(riskPerShare===0)return show('psResult','Stop loss tidak boleh sama dengan entry.');
  const lotsByRisk=Math.floor((riskCash/riskPerShare)/100);
  const lotsByCapital=Math.floor(capital/(entry*100));
  const lots=Math.max(0,Math.min(lotsByRisk,lotsByCapital));
  const estValue=lots*100*entry,estRisk=lots*100*riskPerShare;
  show('psResult','Estimasi maksimal '+lots.toLocaleString('id-ID')+' lot • Nilai posisi '+rupiah(estValue)+' • Risiko jika stop tersentuh sekitar '+rupiah(estRisk)+'.');
};

window.calcCompound=function(){
  const initial=num('cpInitial'),rate=num('cpRate'),years=num('cpYears'),annualRaw=num('cpAnnual');
  const annual=Number.isFinite(annualRaw)?annualRaw:0;
  if(!validPositive([initial,years,annual])||!Number.isFinite(rate)||years<0)return show('cpResult','Isi seluruh data dengan benar.');
  const r=rate/100;
  let final;
  if(r===0)final=initial+(annual*years);
  else final=initial*Math.pow(1+r,years)+annual*((Math.pow(1+r,years)-1)/r);
  const contributed=initial+(annual*years);
  show('cpResult','Estimasi nilai akhir '+rupiah(final)+' • Total modal disetor '+rupiah(contributed)+' • Selisih pertumbuhan '+rupiah(final-contributed)+'.');
};

window.calcGoal=function(){
  const target=num('goalTarget'),initial=num('goalInitial'),rate=num('goalRate'),years=num('goalYears');
  if(!validPositive([target,initial,years])||!Number.isFinite(rate)||target<=0||years<=0)return show('goalResult','Isi seluruh data dengan benar.');
  const months=Math.round(years*12),r=rate/100/12,growth=Math.pow(1+r,months),futureInitial=initial*growth;
  let monthly;
  if(futureInitial>=target)monthly=0;
  else if(r===0)monthly=(target-initial)/months;
  else monthly=(target-futureInitial)*r/(growth-1);
  show('goalResult','Estimasi investasi bulanan '+rupiah(Math.max(0,monthly))+' selama '+months.toLocaleString('id-ID')+' bulan untuk mengejar target '+rupiah(target)+'.');
};

/* ---------- Article search / filter ---------- */
const articleSearch=document.getElementById('articleSearch');
const filterChips=[...document.querySelectorAll('[data-filter]')];
const stories=[...document.querySelectorAll('[data-story]')];
let activeFilter='all';
function applyArticleFilter(){
  if(!stories.length)return;
  const q=(articleSearch?.value||'').toLowerCase().trim();
  stories.forEach(card=>{
    const category=(card.dataset.category||'').toLowerCase();
    const text=(card.textContent||'').toLowerCase();
    const categoryMatch=activeFilter==='all'||category===activeFilter;
    const textMatch=!q||text.includes(q);
    card.classList.toggle('hidden',!(categoryMatch&&textMatch));
  });
}
if(articleSearch)articleSearch.addEventListener('input',applyArticleFilter);
filterChips.forEach(chip=>chip.addEventListener('click',()=>{
  activeFilter=chip.dataset.filter||'all';
  filterChips.forEach(c=>c.classList.toggle('active',c===chip));
  applyArticleFilter();
}));

/* ---------- Homepage: Market Context Builder ---------- */
const contextGroups=[...document.querySelectorAll('[data-context-group]')];
const contextTitle=document.getElementById('contextResultTitle');
const contextCopy=document.getElementById('contextResultCopy');
const contextScore=document.getElementById('contextScore');
const contextMeter=document.getElementById('contextMeterFill');

function updateMarketContext(){
  if(!contextGroups.length)return;
  let score=0;
  contextGroups.forEach(group=>{
    const active=group.querySelector('.context-btn.active');
    if(active)score+=Number(active.dataset.score||0);
  });
  let title='Neutral / Selective';
  let copy='Belum ada dominasi faktor yang kuat. Prioritaskan kualitas setup dan tunggu konfirmasi tambahan.';
  if(score>=3){title='Constructive';copy='Mayoritas faktor mendukung risk appetite. Tetap gunakan entry, invalidation, dan position sizing yang terukur.'}
  else if(score>=1){title='Selective Positive';copy='Konteks cukup mendukung, tetapi belum sepenuhnya kuat. Fokus pada saham dengan struktur dan momentum terbaik.'}
  else if(score<=-3){title='Defensive';copy='Beberapa faktor menekan risk appetite. Kurangi agresivitas, jaga cash, dan utamakan perlindungan modal.'}
  else if(score<=-1){title='Cautious / Selective';copy='Konteks cenderung hati-hati. Hindari memaksakan transaksi dan tunggu risk/reward yang lebih menarik.'}
  if(contextTitle)contextTitle.textContent=title;
  if(contextCopy)contextCopy.textContent=copy;
  if(contextScore)contextScore.textContent=(score>0?'+':'')+score+' / 4';
  if(contextMeter)contextMeter.style.width=Math.max(0,Math.min(100,((score+4)/8)*100))+'%';
}

contextGroups.forEach(group=>{
  group.querySelectorAll('.context-btn').forEach(btn=>btn.addEventListener('click',()=>{
    group.querySelectorAll('.context-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateMarketContext();
  }));
});
updateMarketContext();

/* ---------- Technical page: Readiness Checklist ---------- */
const techChecks=[...document.querySelectorAll('[data-tech-check]')];
const techProgressCount=document.getElementById('techProgressCount');
const techProgressBar=document.getElementById('techProgressBar');
const techCheckMessage=document.getElementById('techCheckMessage');

function updateTechReadiness(){
  if(!techChecks.length)return;
  const done=techChecks.filter(btn=>btn.classList.contains('active')).length;
  const total=techChecks.length;
  const pct=Math.round((done/total)*100);
  if(techProgressCount)techProgressCount.textContent=done+' / '+total;
  if(techProgressBar)techProgressBar.style.width=pct+'%';
  let message='Mulai dari trend dan area harga. Jangan buru-buru mencari sinyal.';
  if(done>=2)message='Fondasi mulai terbentuk. Lanjutkan dengan trigger dan konfirmasi.';
  if(done>=4)message='Setup sudah lebih terstruktur. Pastikan invalidation dan risk/reward jelas.';
  if(done===total)message='Checklist lengkap. Fokus berikutnya adalah disiplin eksekusi dan review.';
  if(techCheckMessage)techCheckMessage.textContent=message;
}
techChecks.forEach(btn=>btn.addEventListener('click',()=>{
  btn.classList.toggle('active');
  btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
  updateTechReadiness();
}));
updateTechReadiness();

/* ---------- Technical page: TradingView + Signal Monitor V2 ---------- */
if(document.querySelector('.technical-hero')){
  const VERSION='20260816-0100';

  const tvModule=document.createElement('script');
  tvModule.src=assetUrl('tradingview.js','assets/js/tradingview.js')+'?v='+VERSION;
  tvModule.async=true;
  document.body.appendChild(tvModule);

  const monitorLoader=document.createElement('script');
  monitorLoader.src=assetUrl('signal-monitor-v2-loader.js','assets/js/signal-monitor-v2-loader.js')+'?v='+VERSION;
  monitorLoader.async=true;
  monitorLoader.dataset.analisakuMonitorDirect='true';
  document.body.appendChild(monitorLoader);
}
