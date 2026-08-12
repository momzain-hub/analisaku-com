const menuBtn=document.getElementById('menuBtn');
const mainNav=document.getElementById('mainNav');
if(menuBtn&&mainNav){menuBtn.addEventListener('click',()=>mainNav.classList.toggle('open'));mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mainNav.classList.remove('open')))}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

function num(id){const el=document.getElementById(id);return el?parseFloat(el.value):NaN}
function show(id,text){const el=document.getElementById(id);if(!el)return;el.textContent=text;el.style.display='block'}
function rupiah(v){return 'Rp '+Math.round(v).toLocaleString('id-ID')}
function validPositive(values){return values.every(v=>Number.isFinite(v)&&v>=0)}

window.calcAverage=function(){
  const p1=num('avgOldPrice'),l1=num('avgOldLot'),p2=num('avgNewPrice'),l2=num('avgNewLot');
  if(!validPositive([p1,l1,p2,l2])||p1<=0||p2<=0||l1<=0||l2<=0)return show('avgResult','Isi seluruh data dengan benar.');
  const totalLot=l1+l2,avg=((p1*l1)+(p2*l2))/totalLot;
  show('avgResult','Average baru '+rupiah(avg)+' • Total posisi '+totalLot.toLocaleString('id-ID')+' lot.');
}

window.calcRR=function(){
  const entry=num('rrEntry'),stop=num('rrStop'),target=num('rrTarget'),capital=num('rrCapital');
  if(!validPositive([entry,stop,target])||entry<=0)return show('rrResult','Isi entry, stop loss, dan target dengan benar.');
  const risk=Math.abs(entry-stop),reward=Math.abs(target-entry);
  if(risk===0)return show('rrResult','Stop loss tidak boleh sama dengan entry.');
  const ratio=reward/risk;
  let text='Risk : Reward = 1 : '+ratio.toFixed(2)+' • Risiko harga '+((risk/entry)*100).toFixed(2)+'% • Potensi '+((reward/entry)*100).toFixed(2)+'%.';
  if(Number.isFinite(capital)&&capital>0){text+=' Estimasi risiko nominal '+rupiah(capital*risk/entry)+' dan potensi reward '+rupiah(capital*reward/entry)+'.'}
  show('rrResult',text);
}

window.calcPosition=function(){
  const capital=num('psCapital'),riskPct=num('psRisk'),entry=num('psEntry'),stop=num('psStop');
  if(!validPositive([capital,riskPct,entry,stop])||capital<=0||riskPct<=0||entry<=0)return show('psResult','Isi seluruh data dengan benar.');
  const riskCash=capital*(riskPct/100),riskPerShare=Math.abs(entry-stop);
  if(riskPerShare===0)return show('psResult','Stop loss tidak boleh sama dengan entry.');
  const lotsByRisk=Math.floor((riskCash/riskPerShare)/100);
  const lotsByCapital=Math.floor(capital/(entry*100));
  const lots=Math.max(0,Math.min(lotsByRisk,lotsByCapital));
  const estValue=lots*100*entry;
  const estRisk=lots*100*riskPerShare;
  show('psResult','Estimasi maksimal '+lots.toLocaleString('id-ID')+' lot • Nilai posisi '+rupiah(estValue)+' • Risiko jika stop tersentuh sekitar '+rupiah(estRisk)+'.');
}

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
}

window.calcGoal=function(){
  const target=num('goalTarget'),initial=num('goalInitial'),rate=num('goalRate'),years=num('goalYears');
  if(!validPositive([target,initial,years])||!Number.isFinite(rate)||target<=0||years<=0)return show('goalResult','Isi seluruh data dengan benar.');
  const months=Math.round(years*12),r=rate/100/12;
  const growth=Math.pow(1+r,months),futureInitial=initial*growth;
  let monthly;
  if(futureInitial>=target)monthly=0;
  else if(r===0)monthly=(target-initial)/months;
  else monthly=(target-futureInitial)*r/(growth-1);
  show('goalResult','Estimasi investasi bulanan '+rupiah(Math.max(0,monthly))+' selama '+months.toLocaleString('id-ID')+' bulan untuk mengejar target '+rupiah(target)+'.');
}

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