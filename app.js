const STORAGE_KEY = 'disciplineMoneyScriptUrl';
let SCRIPT_URL = localStorage.getItem(STORAGE_KEY) || '';
let DEMO = false;
let DATA = null;
let EDITING_EXPENSE_ID = '';

const DEMO_DATA = () => ({
  success:true,
  today:new Date().toISOString().slice(0,10),
  todaySpent:120,
  todayBudget:310,
  totalSpentToday:120,
  totalSpentMonth:1270,
  totalSpentAll:1270,
  envelopes:[
    {name:'กู้ออมสิน',group:'fixed',budget:6214.34,spent:0,remaining:6214.34,percent:0,locked:true,color:'#ef4444',low:false},
    {name:'ค่างวดรถ',group:'fixed',budget:7375,spent:0,remaining:7375,percent:0,locked:true,color:'#ef4444',low:false},
    {name:'ประกันสังคม',group:'fixed',budget:875,spent:0,remaining:875,percent:0,locked:true,color:'#ef4444',low:false},
    {name:'บัตรกดเงินสด',group:'fixed',budget:1600,spent:0,remaining:1600,percent:0,locked:true,color:'#ef4444',low:false},
    {name:'ค่าอาหาร',group:'variable',budget:2500,spent:850,remaining:1650,percent:34,locked:false,color:'#f59e0b',low:false},
    {name:'ค่าน้ำมัน',group:'variable',budget:1500,spent:300,remaining:1200,percent:20,locked:false,color:'#fb923c',low:false},
    {name:'ความสุข/เที่ยว',group:'variable',budget:2000,spent:0,remaining:2000,percent:0,locked:false,color:'#8b5cf6',low:false},
    {name:'ซื้อของใช้',group:'variable',budget:1000,spent:0,remaining:1000,percent:0,locked:false,color:'#60a5fa',low:false},
    {name:'ซองรายวัน',group:'daily',budget:310,spent:120,remaining:190,percent:39,locked:false,color:'#10b981',low:false},
    {name:'เงินฉุกเฉิน',group:'savings',budget:3200,spent:0,remaining:3200,percent:0,locked:false,color:'#10b981',goal:10000,low:false},
    {name:'ดูแลรถ',group:'savings',budget:1500,spent:0,remaining:1500,percent:0,locked:false,color:'#38bdf8',goal:6000,low:false}
  ],
  recentExpenses:[{id:'demo_exp_1',amount:80,category:'ค่าอาหาร',envelope:'ค่าอาหาร',note:'ข้าวเที่ยง',source:'manual'},{id:'demo_exp_2',amount:40,category:'ค่าอาหาร',envelope:'ค่าอาหาร',note:'กาแฟ',source:'manual'}],
  wishes:[],
  settings:{dailyBudget:310,dailyAutoTransferHour:7,debtMonthsLeft:15,debtTargetMonths:18,debtMonthlyPayment:1600,emergencyCurrent:3200,emergencyGoal:10000,emergencyNextGoal:30000,carFundCurrent:1500,carFundGoal:6000,petHealth:86,petLevel:3,streakDays:90,totalSaved:2400,partnerName:'',partnerContact:''},
  debtHistory:[{},{},{}],
  events:[{message:'แบ่งเงินรอบวันที่ 15 อัตโนมัติแล้ว',amount:5200},{message:'อดใจไม่ซื้อสินค้า เซฟเงินได้',amount:2400}]
});

const FIXED_DEBTS = {
  car:{envelope:'ค่างวดรถ',amount:7375,note:'จ่ายหนี้งวดรถ'},
  gsb:{envelope:'กู้ออมสิน',amount:6214.34,note:'จ่ายหนี้ออมสิน'}
};

function FRESH_DATA(){
  const data=DEMO_DATA();
  data.todaySpent=0;
  data.totalSpentToday=0;
  data.totalSpentMonth=0;
  data.totalSpentAll=0;
  data.recentExpenses=[];
  data.wishes=[];
  data.debtHistory=[];
  data.events=[];
  data.envelopes.forEach(e=>{ e.spent=0; e.remaining=Number(e.budget||0); e.percent=0; e.low=false; });
  Object.assign(data.settings,{debtMonthsLeft:18,streakDays:0,totalSaved:0,emergencyCurrent:0,carFundCurrent:0,petHealth:100,petLevel:1,lastDailyCloseDate:''});
  return data;
}

window.addEventListener('load', () => {
  document.getElementById('todayText').textContent = new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  if (SCRIPT_URL) { document.getElementById('scriptUrl').value = SCRIPT_URL; hideSetup(); loadData(); }
  setInterval(()=>{ if(DATA&&(DATA.wishes||[]).length)renderWishes(); },30000);
});

function hideSetup(){ document.getElementById('setupModal').classList.remove('show'); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>t.classList.remove('show'),2800); }
function fmt(n){ return Number(n||0).toLocaleString('th-TH'); }
function demoExpenseCountsTowardDailyQuota(envelope,source='manual'){
  if(source==='debt')return false;
  const env=DATA.envelopes.find(e=>e.name===envelope);
  if(!env)return true;
  if(env.locked)return false;
  return env.group!=='fixed'&&env.group!=='savings';
}
function applyDemoExpenseTotalDelta(amount,envelope,source='manual'){
  const delta=Number(amount||0);
  if(demoExpenseCountsTowardDailyQuota(envelope,source)){
    DATA.todaySpent=Math.max(0,Number(DATA.todaySpent||0)+delta);
  }
  DATA.totalSpentToday=Math.max(0,Number(DATA.totalSpentToday||0)+delta);
  DATA.totalSpentMonth=Math.max(0,Number(DATA.totalSpentMonth||0)+delta);
  DATA.totalSpentAll=Math.max(0,Number(DATA.totalSpentAll||0)+delta);
}

async function api(payload){
  if (DEMO) return {success:true};
  const res = await fetch(SCRIPT_URL + '?action=' + encodeURIComponent(payload.action), { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload) });
  const json = await res.json();
  if (!json.success && json.error) throw new Error(json.error);
  return json;
}
async function loadData(){
  try{ DATA = DEMO ? DEMO_DATA() : await api({action:'getAll'}); renderAll(); }
  catch(err){ showToast('โหลดข้อมูลไม่ได้: ' + err.message); }
}
async function saveScriptUrl(){
  const url = document.getElementById('scriptUrl').value.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) return showToast('URL ต้องเป็น Google Apps Script Web App');
  SCRIPT_URL=url; localStorage.setItem(STORAGE_KEY,url); hideSetup();
  try{ await api({action:'setupSheets'}); await loadData(); showToast('เชื่อมต่อสำเร็จ'); } catch(err){ showToast('เชื่อมต่อไม่ได้: '+err.message); }
}
function startDemo(){ DEMO=true; hideSetup(); loadData(); showToast('กำลังใช้โหมดทดลอง'); }

function renderAll(){ renderDashboard(); renderEnvelopes(); renderSelects(); renderRecent(); renderWishes(); renderDebt(); renderSavings(); renderEvents(); renderSettingsForm(); }
function renderDashboard(){
  const spent=Number(DATA.todaySpent||0), budget=Number(DATA.todayBudget||310), remain=Math.max(0,budget-spent), pct=budget?Math.max(0,Math.min(100,remain/budget*100)):0;
  const usable = DATA.envelopes.filter(e=>!e.locked && !['savings'].includes(e.group)).reduce((s,e)=>s+Number(e.remaining||0),0);
  document.getElementById('dailyRemain').textContent=fmt(remain); document.getElementById('dailySpent').textContent=fmt(spent); document.getElementById('dailyBudget').textContent=fmt(budget); document.getElementById('realAvailable').textContent=fmt(usable);
  document.getElementById('totalSpentToday').textContent=fmt(DATA.totalSpentToday??spent);
  document.getElementById('totalSpentMonth').textContent=fmt(DATA.totalSpentMonth??DATA.totalSpentToday??spent);
  document.getElementById('totalSpentAll').textContent=fmt(DATA.totalSpentAll??DATA.totalSpentMonth??DATA.totalSpentToday??spent);
  const bar=document.getElementById('dailyBar'); bar.style.width=pct+'%'; bar.style.background=pct>50?'var(--green)':pct>20?'var(--yellow)':'var(--red)';
  const status=document.getElementById('dailyStatus'); status.textContent = remain<=0?'🔴 โควตาหมด':pct<=20?'🟠 ใกล้หมด':'🟢 คุมได้';
  const health=Number(DATA.settings.petHealth||100); const stages=[['🥚','ไข่แห่งความหวัง','เริ่มต้นใหม่ได้เสมอ'],['🐣','ลูกนกวินัย','ต้องดูแลมากขึ้น'],['🐲','มังกรทองแห่งวินัย','ยังแข็งแรงดี คุมงบต่อไป'],['🔥🐲','มังกรไฟแห่งความมั่งคั่ง','วินัยสุดยอดมาก']];
  const idx=health>=90?3:health>=65?2:health>=35?1:0; document.getElementById('petFace').textContent=stages[idx][0]; document.getElementById('petName').textContent=stages[idx][1]; document.getElementById('petMsg').textContent=health<35?'สัตว์เทพเริ่มป่วย เพราะใช้เงินเกินแผน':stages[idx][2]; document.getElementById('petBar').style.width=health+'%';
}
function renderEnvelopes(){
  document.getElementById('envelopes').innerHTML = DATA.envelopes.map(e=>{
    const label = e.locked?'🔒 ': e.low?'🚨 ':''; const status=e.low?'ใกล้หมด':e.locked?'ล็อกไว้':'ใช้ได้';
    const cls='env '+(e.locked?'locked ':'')+(e.low?'low':'');
    return `<div class="${cls}" style="--c:${e.color||'#23d18b'}" onclick="${e.locked?'showToast(\'ซองนี้ถูกล็อกเพื่อกันนำไปใช้ก่อนกำหนด\')':`pickEnvelope('${escapeHtml(e.name)}')`}"><div class="env-name">${label}${escapeHtml(e.name)} · ${status}</div><div class="env-amt">${fmt(e.remaining)} ฿</div><div class="bar"><i style="width:${Math.min(100,e.percent||0)}%;background:${e.percent>85?'var(--red)':e.percent>65?'var(--yellow)':'var(--green)'}"></i></div><div class="env-foot"><span>งบ ${fmt(e.budget)}</span><span>ใช้ ${fmt(e.spent)}</span></div></div>`;
  }).join('');
}
function renderSelects(){
  const usable=DATA.envelopes.filter(e=>!e.locked);
  const daily=usable.find(e=>e.group==='daily'||e.name==='ซองรายวัน');
  const ordered=daily?[daily,...usable.filter(e=>e!==daily)]:usable;
  const select=document.getElementById('expEnvelope');
  const current=select.value;
  select.innerHTML=ordered.map(e=>`<option>${escapeHtml(e.name)}</option>`).join('');
  if(EDITING_EXPENSE_ID&&current)select.value=current;
  else if(daily)select.value=daily.name;
}
function renderRecent(){ document.getElementById('recentList').innerHTML = (DATA.recentExpenses||[]).length ? DATA.recentExpenses.map(e=>{ const editable=!e.source||e.source==='manual', id=escapeJsArg(e.id); return `<div class="item expense-item"><div><strong>${escapeHtml(e.note||e.category||'รายจ่าย')}</strong><em>${escapeHtml(e.envelope||'')} · ${escapeHtml(e.category||'')}</em></div><div class="expense-controls"><div class="amount-red">-${fmt(e.amount)} ฿</div>${editable?`<div class="wish-actions"><button class="mini wait" onclick="editExpense('${id}')">แก้ไข</button><button class="mini no" onclick="deleteExpense('${id}')">ลบ</button></div>`:`<em>รายการอัตโนมัติ</em>`}</div></div>`; }).join('') : '<p class="small">ยังไม่มีรายการ</p>'; }
function renderEvents(){ document.getElementById('eventsList').innerHTML = (DATA.events||[]).length ? DATA.events.map(e=>`<div class="item"><div><strong>${escapeHtml(e.message||'เหตุการณ์')}</strong><em>${fmt(e.amount)} บาท</em></div></div>`).join('') : '<p class="small">ยังไม่มีเหตุการณ์</p>'; }
function renderWishes(){
  document.getElementById('totalSaved').textContent=fmt(DATA.settings.totalSaved||0);
  const wishes=DATA.wishes||[]; document.getElementById('wishList').innerHTML = wishes.length?wishes.map(w=>{
    const now=Date.now(), added=new Date(w.addedAt||now).getTime(), expires=new Date(w.expiresAt).getTime();
    const total=Math.max(1,expires-added||86400000), diff=expires-now, ready=diff<=0;
    const hrs=Math.max(0,Math.floor(diff/3600000)), mins=Math.max(0,Math.floor(diff%3600000/60000));
    const pct=ready?100:Math.max(0,Math.min(100,(diff/total)*100));
    const ringValue=ready?'ครบ':(hrs>0?hrs:mins), ringUnit=ready?'แล้ว':(hrs>0?'ชม.':'นาที');
    const timeText=ready?'ครบเวลาแล้ว':'เหลือ '+hrs+' ชม. '+mins+' นาที';
    const id=escapeJsArg(w.id);
    return `<div class="item wish-item ${ready?'ready':''}"><div class="time-ring ${ready?'ready':''}" style="--p:${pct}%"><div class="ring-inner"><span>${ringValue}</span><small>${ringUnit}</small></div></div><div class="wish-body"><strong>${escapeHtml(w.name)}</strong><em>${fmt(w.price)} บาท · ${timeText}</em><span class="wish-status ${ready?'ready':'waiting'}">${ready?'พร้อมตัดสินใจ':'รอเวลา'}</span></div><div class="wish-actions">${ready?`<button class="mini ok" onclick="updateWish('${id}','approved')">ซื้อ</button><button class="mini no" onclick="updateWish('${id}','cancelled')">ไม่ซื้อ</button>`:`<button class="mini wait" onclick="deleteWish('${id}')">ลบ</button>`}</div></div>`;
  }).join(''):'<p class="small">ยังไม่มีรายการรอตัดสินใจ</p>'; }
function renderDebt(){ const target=Number(DATA.settings.debtTargetMonths||18), left=Number(DATA.settings.debtMonthsLeft||18), paid=target-left; document.getElementById('monthsLeft2').textContent=fmt(left); document.getElementById('debtBar2').style.width=Math.max(0,Math.min(100,paid/target*100))+'%'; document.getElementById('debtDots').innerHTML=Array.from({length:target},(_,i)=>`<span class="dot ${i<paid?'done':i===paid?'now':''}">${i+1}</span>`).join(''); renderBadges(); }
function renderBadges(){ const s=Number(DATA.settings.streakDays||0), e=Number(DATA.settings.emergencyCurrent||0); document.getElementById('badges').innerHTML=[['🛡️ 30 วันไม่กดบัตร',s>=30],['🔥 90 วันติด',s>=90],['🥉 ฉุกเฉิน 10,000',e>=10000],['🏰 ฉุกเฉิน 30,000',e>=30000]].map(b=>`<span class="badge2 ${b[1]?'on':''}">${b[0]}</span>`).join(''); }
function renderSavings(){ const e=Number(DATA.settings.emergencyCurrent||0), eg=Number(DATA.settings.emergencyGoal||10000), c=Number(DATA.settings.carFundCurrent||0), cg=Number(DATA.settings.carFundGoal||6000); document.getElementById('emergencyMoney').textContent=fmt(e); document.getElementById('carMoney').textContent=fmt(c); document.getElementById('emergencyBar').style.width=Math.min(100,e/eg*100)+'%'; document.getElementById('carBar').style.width=Math.min(100,c/cg*100)+'%'; document.getElementById('inputEmergency').value=e||''; document.getElementById('inputCar').value=c||''; document.getElementById('badgeSurvive').classList.toggle('on',e>=10000); document.getElementById('badgeFortress').classList.toggle('on',e>=30000); }
function renderSettingsForm(){ const s=DATA.settings||{}; document.getElementById('setDailyBudget').value=s.dailyBudget||310; document.getElementById('setDailyHour').value=s.dailyAutoTransferHour||7; document.getElementById('setPartnerName').value=s.partnerName||''; document.getElementById('setPartnerContact').value=s.partnerContact||''; }

function showPage(name){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById('page-'+name).classList.add('active'); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.page===name)); window.scrollTo({top:0,behavior:'smooth'}); }
function pickEnvelope(name){ showPage('add'); document.getElementById('expEnvelope').value=name; }
function setAmount(n){ document.getElementById('expAmount').value=n; }
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function escapeJsArg(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

function applyDemoEnvelopeDelta(name,delta){
  const env=DATA.envelopes.find(e=>e.name===name);
  if(!env)return;
  env.spent=Math.max(0,Number(env.spent||0)+Number(delta||0));
  env.remaining=Number(env.budget||0)-env.spent;
  env.percent=env.budget?Math.round(env.spent/env.budget*100):0;
  env.low=env.budget>0&&env.remaining<=env.budget*.2;
}
function clearExpenseForm(){
  EDITING_EXPENSE_ID='';
  document.getElementById('expAmount').value='';
  document.getElementById('expNote').value='';
  document.getElementById('expFormMode').textContent='เพิ่มรายการ';
  document.getElementById('submitExpenseBtn').textContent='💸 บันทึกรายจ่าย';
  document.getElementById('cancelEditExpenseBtn').style.display='none';
}
function cancelEditExpense(){ clearExpenseForm(); showToast('ยกเลิกการแก้ไขแล้ว'); }
function editExpense(id){
  const item=(DATA.recentExpenses||[]).find(e=>e.id===id);
  if(!item)return showToast('ไม่พบรายการ');
  if(item.source&&item.source!=='manual')return showToast('รายการอัตโนมัติแก้ไขจากหน้านี้ไม่ได้');
  EDITING_EXPENSE_ID=id;
  document.getElementById('expAmount').value=item.amount||'';
  document.getElementById('expCategory').value=item.category||'อื่นๆ';
  document.getElementById('expEnvelope').value=item.envelope||'';
  document.getElementById('expNote').value=item.note||'';
  document.getElementById('expFormMode').textContent='กำลังแก้ไข';
  document.getElementById('submitExpenseBtn').textContent='บันทึกการแก้ไข';
  document.getElementById('cancelEditExpenseBtn').style.display='block';
  showPage('add');
}
async function deleteExpense(id){
  const item=(DATA.recentExpenses||[]).find(e=>e.id===id);
  if(!item)return showToast('ไม่พบรายการ');
  if(item.source&&item.source!=='manual')return showToast('รายการอัตโนมัติลบจากหน้านี้ไม่ได้');
  if(!confirm('ลบรายจ่ายรายการนี้?'))return;
  if(DEMO){
    applyDemoEnvelopeDelta(item.envelope,-Number(item.amount||0));
    applyDemoExpenseTotalDelta(-Number(item.amount||0),item.envelope,item.source||'manual');
    DATA.recentExpenses=DATA.recentExpenses.filter(e=>e.id!==id);
    if(EDITING_EXPENSE_ID===id)clearExpenseForm();
    renderAll();
    showToast('ลบรายการแล้ว');
    return;
  }
  try{
    const r=await api({action:'deleteExpense',id});
    DATA=r.data;
    if(EDITING_EXPENSE_ID===id)clearExpenseForm();
    renderAll();
    showToast('ลบรายการแล้ว');
  }catch(err){showToast(err.message)}
}

async function submitExpense(){
  const amount=Number(document.getElementById('expAmount').value||0), category=document.getElementById('expCategory').value, envelope=document.getElementById('expEnvelope').value, note=document.getElementById('expNote').value;
  if(amount<=0)return showToast('กรอกจำนวนเงินก่อน');
  if(DEMO){
    if(EDITING_EXPENSE_ID){
      const item=DATA.recentExpenses.find(e=>e.id===EDITING_EXPENSE_ID);
      if(!item)return showToast('ไม่พบรายการที่จะแก้ไข');
      applyDemoEnvelopeDelta(item.envelope,-Number(item.amount||0));
      applyDemoExpenseTotalDelta(-Number(item.amount||0),item.envelope,item.source||'manual');
      applyDemoEnvelopeDelta(envelope,amount);
      applyDemoExpenseTotalDelta(amount,envelope,'manual');
      Object.assign(item,{amount,category,envelope,note});
      showToast('แก้ไขรายการแล้ว (โหมดทดลอง)');
    } else {
      applyDemoEnvelopeDelta(envelope,amount);
      applyDemoExpenseTotalDelta(amount,envelope,'manual');
      DATA.recentExpenses.unshift({id:'demo_exp_'+Date.now(),amount,category,envelope,note,source:'manual'});
      showToast('บันทึกแล้ว (โหมดทดลอง)');
    }
    clearExpenseForm();
    renderAll();
    showPage('dashboard');
    return;
  }
  try{
    const action=EDITING_EXPENSE_ID?'updateExpense':'addExpense';
    const wasEditing=!!EDITING_EXPENSE_ID;
    const r=await api({action,id:EDITING_EXPENSE_ID,amount,category,envelope,note});
    DATA=r.data||await api({action:'getAll'});
    clearExpenseForm();
    renderAll();
    showPage('dashboard');
    showToast(wasEditing?'แก้ไขรายการแล้ว':'บันทึกแล้ว');
  }catch(err){showToast(err.message)}
}
async function addIncome(round){ const amount=round==='15'?5200:24998; if(DEMO){DATA=DEMO_DATA(); showToast('แบ่งเงินอัตโนมัติแล้ว (ทดลอง)'); renderAll(); return;} try{ const r=await api({action:'addIncome',round,amount,note:round==='15'?'OT รอบวันที่ 15':'เงินเดือนหลักสิ้นเดือน'}); DATA=r.data; renderAll(); showToast('แบ่งเงินเข้าซองแล้ว'); }catch(err){showToast(err.message)} }
async function createEnvelope(){ const name=document.getElementById('newEnvName').value.trim(); if(!name)return showToast('กรอกชื่อซอง'); const budget=Number(document.getElementById('newEnvBudget').value||0), group=document.getElementById('newEnvGroup').value; if(DEMO){DATA.envelopes.push({name,group,budget,spent:0,remaining:budget,percent:0,locked:false,color:'#23d18b'});renderAll();showToast('สร้างซองแล้ว');return;} try{const r=await api({action:'createEnvelope',name,budget,group});DATA=r.data;renderAll();showToast('สร้างซองแล้ว')}catch(err){showToast(err.message)} }
async function addWish(){ const name=document.getElementById('wishName').value.trim(), price=Number(document.getElementById('wishPrice').value||0); if(!name||price<=0)return showToast('กรอกชื่อและราคา'); if(DEMO){const now=new Date();DATA.wishes.push({id:'d'+Date.now(),name,price,addedAt:now,expiresAt:new Date(now.getTime()+86400000)});renderWishes();showToast('เริ่มนับ 24 ชั่วโมงแล้ว');return;} try{await api({action:'addWish',name,price});await loadData();showToast('เริ่มนับ 24 ชั่วโมงแล้ว')}catch(err){showToast(err.message)} }
async function updateWish(id,status){ if(DEMO){const w=DATA.wishes.find(x=>x.id===id); if(status==='cancelled'&&w)DATA.settings.totalSaved+=w.price; DATA.wishes=DATA.wishes.filter(x=>x.id!==id); renderAll(); showToast(status==='cancelled'?'เยี่ยม! เซฟเงินได้':'อนุมัติซื้อแล้ว'); return;} try{const r=await api({action:'updateWish',id,status});DATA=r.data;renderAll();showToast(status==='cancelled'?'เยี่ยม! เซฟเงินได้':'อนุมัติซื้อแล้ว')}catch(err){showToast(err.message)} }
async function deleteWish(id){ if(DEMO){DATA.wishes=DATA.wishes.filter(x=>x.id!==id);renderWishes();return;} try{const r=await api({action:'deleteWish',id});DATA=r.data;renderAll()}catch(err){showToast(err.message)} }
async function payDebt(){ if(DEMO){DATA.settings.debtMonthsLeft=Math.max(0,DATA.settings.debtMonthsLeft-1);DATA.settings.streakDays+=30;renderAll();showToast('จ่ายหนี้เดือนนี้แล้ว');return;} try{const r=await api({action:'payDebt'});DATA=r.data;renderAll();showToast('จ่ายหนี้เดือนนี้แล้ว')}catch(err){showToast(err.message)} }
async function resetDebtPlan(){
  if(!confirm('รีเซ็ตแผนหนี้ 18 เดือนกลับไปเริ่มต้นใหม่? ประวัติเดิมจะไม่ถูกลบ'))return;
  if(DEMO){
    DATA.settings.debtMonthsLeft=DATA.settings.debtTargetMonths||18;
    DATA.settings.streakDays=0;
    renderAll();
    showToast('รีเซ็ตแผนหนี้แล้ว');
    return;
  }
  try{
    const r=await api({action:'resetDebtPlan'});
    DATA=r.data;
    renderAll();
    showToast('รีเซ็ตแผนหนี้แล้ว');
  }catch(err){showToast(err.message)}
}
async function payFixedDebt(type){
  const debt=FIXED_DEBTS[type];
  if(!debt)return showToast('ไม่พบรายการหนี้');
  if(DEMO){
    applyDemoEnvelopeDelta(debt.envelope,debt.amount);
    applyDemoExpenseTotalDelta(debt.amount,debt.envelope,'debt');
    DATA.recentExpenses.unshift({id:'demo_debt_'+type+'_'+Date.now(),amount:debt.amount,category:debt.envelope,envelope:debt.envelope,note:debt.note,source:'debt'});
    renderAll();
    showToast('บันทึก'+debt.note+'แล้ว');
    return;
  }
  try{
    const r=await api({action:'payFixedDebt',debtType:type});
    DATA=r.data;
    renderAll();
    showToast('บันทึก'+debt.note+'แล้ว');
  }catch(err){showToast(err.message)}
}
async function saveSavings(){ const emergencyCurrent=Number(document.getElementById('inputEmergency').value||0), carFundCurrent=Number(document.getElementById('inputCar').value||0); if(DEMO){DATA.settings.emergencyCurrent=emergencyCurrent;DATA.settings.carFundCurrent=carFundCurrent;renderAll();showToast('บันทึกยอดแล้ว');return;} try{await api({action:'saveSettings',emergencyCurrent,carFundCurrent});await loadData();showToast('บันทึกยอดแล้ว')}catch(err){showToast(err.message)} }
async function dailyClose(){ if(DEMO){const save=Math.max(0,DATA.todayBudget-DATA.todaySpent);DATA.settings.emergencyCurrent+=save;renderAll();showToast('ปิดยอดและออม '+fmt(save)+' บาท');return;} try{const r=await api({action:'dailyClose'});DATA=r.data;renderAll();showToast('ปิดยอดและออม '+fmt(r.saved||0)+' บาท')}catch(err){showToast(err.message)} }
function openSettings(){ document.getElementById('settingsModal').classList.add('show'); } function closeSettings(){ document.getElementById('settingsModal').classList.remove('show'); }
async function saveAppSettings(){ const p={action:'saveSettings',dailyBudget:Number(document.getElementById('setDailyBudget').value||310),dailyAutoTransferHour:Number(document.getElementById('setDailyHour').value||7),partnerName:document.getElementById('setPartnerName').value,partnerContact:document.getElementById('setPartnerContact').value}; if(DEMO){Object.assign(DATA.settings,p);DATA.todayBudget=p.dailyBudget;const daily=DATA.envelopes.find(e=>e.group==='daily'||e.name==='ซองรายวัน');if(daily){daily.budget=p.dailyBudget;daily.remaining=Number(daily.budget||0)-Number(daily.spent||0);daily.percent=daily.budget?Math.round(Number(daily.spent||0)/daily.budget*100):0;daily.low=daily.budget>0&&daily.remaining<=daily.budget*.2;}renderAll();closeSettings();showToast('บันทึกตั้งค่าแล้ว');return;} try{await api(p);await loadData();closeSettings();showToast('บันทึกตั้งค่าแล้ว')}catch(err){showToast(err.message)} }
async function resetMonth(){ if(!confirm('รีเซ็ตยอดใช้ทุกซองสำหรับเดือนใหม่?'))return; if(DEMO){DATA=DEMO_DATA();renderAll();showToast('รีเซ็ตแล้ว');return;} try{const r=await api({action:'resetMonth'});DATA=r.data;renderAll();showToast('รีเซ็ตแล้ว')}catch(err){showToast(err.message)} }
async function resetAllData(){
  if(!confirm('รีเซ็ตข้อมูลทั้งหมดเพื่อเริ่มใช้งานจริง? รายจ่าย รายรับ wishlist ประวัติหนี้ event และค่าที่กรอกไว้จะถูกล้าง'))return;
  if(!confirm('ยืนยันอีกครั้ง: ต้องการล้างข้อมูลทั้งหมดจริงหรือไม่?'))return;
  if(DEMO){
    DATA=FRESH_DATA();
    clearExpenseForm();
    renderAll();
    closeSettings();
    showToast('รีเซ็ตข้อมูลทั้งหมดแล้ว');
    return;
  }
  try{
    const r=await api({action:'resetAllData'});
    DATA=r.data;
    clearExpenseForm();
    renderAll();
    closeSettings();
    showToast('รีเซ็ตข้อมูลทั้งหมดแล้ว พร้อมใช้งาน');
  }catch(err){showToast(err.message)}
}
function clearLocalConfig(){ localStorage.removeItem(STORAGE_KEY); location.reload(); }
