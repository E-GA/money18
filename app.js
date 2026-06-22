const STORAGE_KEY = 'disciplineMoneyScriptUrl';
const DAILY_BUDGET_DEFAULT = 180;
let SCRIPT_URL = localStorage.getItem(STORAGE_KEY) || '';
let DEMO = false;
let DATA = null;
let EDITING_EXPENSE_ID = '';
let EDITING_ENVELOPE_NAME = '';

const DEMO_DATA = () => ({
  success:true,
  today:new Date().toISOString().slice(0,10),
  todaySpent:120,
  todayBudget:DAILY_BUDGET_DEFAULT,
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
    {name:'ซองรายวัน',group:'daily',budget:DAILY_BUDGET_DEFAULT,spent:120,remaining:60,percent:67,locked:false,color:'#10b981',low:false},
    {name:'เงินฉุกเฉิน',group:'savings',budget:3200,spent:0,remaining:3200,percent:0,locked:false,color:'#10b981',goal:10000,low:false},
    {name:'ดูแลรถ',group:'savings',budget:1500,spent:0,remaining:1500,percent:0,locked:false,color:'#38bdf8',goal:6000,low:false}
  ],
  recentExpenses:[{id:'demo_exp_1',amount:80,category:'ค่าอาหาร',envelope:'ค่าอาหาร',note:'ข้าวเที่ยง',source:'manual'},{id:'demo_exp_2',amount:40,category:'ค่าอาหาร',envelope:'ค่าอาหาร',note:'กาแฟ',source:'manual'}],
  incomeHistory:[
    {id:'demo_inc_1',date:new Date().toISOString(),amount:30198,round:'month',note:'เงินเดือน + OT'}
  ],
  wishes:[],
  settings:{dailyBudget:DAILY_BUDGET_DEFAULT,dailyAutoTransferHour:7,debtMonthsLeft:15,debtTargetMonths:18,debtMonthlyPayment:1600,emergencyCurrent:3200,emergencyGoal:10000,emergencyNextGoal:30000,carFundCurrent:1500,carFundGoal:6000,petHealth:86,petLevel:3,streakDays:90,totalSaved:2400,partnerName:'',partnerContact:''},
  debtHistory:[{},{},{}],
  debtItems:[
    {id:'debt_car',name:'หนี้งวดรถ',amount:7375,status:'due',note:'ค่างวดรถ',envelope:'ค่างวดรถ',active:true},
    {id:'debt_gsb',name:'หนี้ออมสิน',amount:6214.34,status:'due',note:'กู้ออมสิน',envelope:'กู้ออมสิน',active:true},
    {id:'debt_credit',name:'หนี้บัตรเครดิต',amount:1600,status:'due',note:'บัตรเครดิต/บัตรกดเงินสด',envelope:'บัตรกดเงินสด',active:true}
  ],
  debtPaymentHistory:[],
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
  data.incomeHistory=[];
  data.wishes=[];
  data.debtHistory=[];
  data.debtItems=[];
  data.debtPaymentHistory=[];
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
function normalizeDailyBudgetData(data){
  if(!data)return;
  data.settings=data.settings||{};
  const incoming=Number(data.todayBudget||data.settings.dailyBudget||0);
  if(!incoming||incoming===310){
    data.todayBudget=DAILY_BUDGET_DEFAULT;
    data.settings.dailyBudget=DAILY_BUDGET_DEFAULT;
  }
  const daily=(data.envelopes||[]).find(e=>e.group==='daily'||e.name==='ซองรายวัน');
  if(daily&&(!Number(daily.budget||0)||Number(daily.budget||0)===310)){
    daily.budget=DAILY_BUDGET_DEFAULT;
    daily.remaining=Number(daily.budget||0)-Number(daily.spent||0);
    daily.percent=daily.budget?Math.round(Number(daily.spent||0)/daily.budget*100):0;
    daily.low=daily.budget>0&&daily.remaining<=daily.budget*.2;
  }
}
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

function renderAll(){ normalizeDailyBudgetData(DATA); renderDashboard(); renderIncomePage(); renderEnvelopes(); renderSelects(); renderRecent(); renderWishes(); renderDebt(); renderSavings(); renderEvents(); renderSettingsForm(); }
function renderDashboard(){
  const spent=Number(DATA.todaySpent||0), budget=Number(DATA.todayBudget||DAILY_BUDGET_DEFAULT), remain=Math.max(0,budget-spent), pct=budget?Math.max(0,Math.min(100,remain/budget*100)):0;
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
function renderIncomePage(){
  const envs=DATA.envelopes||[];
  const totalBudget=envs.reduce((s,e)=>s+Number(e.budget||0),0);
  const totalSpent=envs.reduce((s,e)=>s+Number(e.spent||0),0);
  const envelopeRemaining=envs.reduce((s,e)=>s+Number(e.remaining||0),0);
  const totalIncome=(DATA.incomeHistory||[]).reduce((s,e)=>s+Number(e.amount||0),0);
  const allSpent=Number(DATA.totalSpentAll??totalSpent);
  const totalRemaining=totalIncome?totalIncome-allSpent:envelopeRemaining;
  const circleBase=totalIncome||totalBudget;
  const pct=circleBase?Math.max(0,Math.min(100,totalRemaining/circleBase*100)):0;
  document.getElementById('incomeRemainingTotal').textContent=fmt(totalRemaining);
  document.getElementById('incomeRemainCircle').style.setProperty('--p',pct+'%');
  document.getElementById('incomeTotalSpent').textContent=fmt(allSpent);
  document.getElementById('incomeUsableRemaining').textContent=fmt(totalIncome);
  document.getElementById('incomeReservedMoney').textContent=fmt(envelopeRemaining);
  renderIncomeHistory();
  renderIncomeEnvelopes();
}
function renderIncomeHistory(){
  const list=document.getElementById('incomeHistoryList');
  const rows=(DATA.incomeHistory||[]).slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  if(!rows.length){list.innerHTML='<p class="small">ยังไม่มีประวัติรายรับ</p>';return;}
  const groups=rows.reduce((out,row)=>{
    const key=incomeMonthKey(row.date);
    (out[key]||(out[key]=[])).push(row);
    return out;
  },{});
  list.innerHTML=Object.keys(groups).sort().reverse().map(key=>{
    const items=groups[key];
    const total=items.reduce((s,x)=>s+Number(x.amount||0),0);
    return `<div class="income-month"><div class="income-month-head"><strong>${escapeHtml(incomeMonthLabel(key))}</strong><span>${fmt(total)} ฿</span></div>${items.map(item=>`<div class="income-row"><div><strong>${escapeHtml(incomeRoundLabel(item.round))}</strong><em>${escapeHtml(incomeDateText(item.date))}${item.note?' · '+escapeHtml(item.note):''}</em></div><b class="amount-green">+${fmt(item.amount)} ฿</b></div>`).join('')}</div>`;
  }).join('');
}
function renderIncomeEnvelopes(){
  const list=document.getElementById('incomeEnvelopeList');
  const envs=(DATA.envelopes||[]).slice().sort((a,b)=>{
    const order={daily:0,variable:1,fixed:2,savings:3,custom:4};
    return (order[a.group]??9)-(order[b.group]??9)||String(a.name).localeCompare(String(b.name),'th');
  });
  list.innerHTML=envs.length?envs.map(e=>{
    const pct=e.budget?Math.max(0,Math.min(100,Number(e.spent||0)/Number(e.budget||0)*100)):0;
    const status=e.locked?'ล็อก':e.group==='savings'?'ออม':'ใช้ได้';
    const name=escapeHtml(escapeJsArg(e.name));
    return `<div class="income-envelope-row" style="--c:${e.color||'#23d18b'}"><div><strong>${escapeHtml(e.name)}</strong><em>${escapeHtml(status)} · งบ ${fmt(e.budget)} · ใช้ ${fmt(e.spent)}</em><div class="bar"><i style="width:${pct}%;background:${pct>85?'var(--red)':pct>65?'var(--yellow)':'var(--green)'}"></i></div></div><div class="income-envelope-side"><b>${fmt(e.remaining)} ฿</b><div class="income-envelope-actions"><button class="mini ok" onclick="openEnvelopeEditor('${name}')">แก้ไข</button><button class="mini wait" onclick="resetEnvelopeSpent('${name}')">ล้างใช้</button><button class="mini no" onclick="deleteEnvelope('${name}')">ลบ</button></div></div></div>`;
  }).join(''):'<p class="small">ยังไม่มีซองเงิน</p>';
}
function incomeMonthKey(value){
  const d=new Date(value||Date.now());
  if(isNaN(d.getTime()))return 'ไม่ทราบเดือน';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function incomeMonthLabel(key){
  if(key==='ไม่ทราบเดือน')return key;
  const parts=key.split('-');
  return new Date(Number(parts[0]),Number(parts[1])-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
}
function incomeDateText(value){
  const d=new Date(value||Date.now());
  return isNaN(d.getTime())?'ไม่ทราบวันที่':d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
}
function incomeRoundLabel(round){ return round==='month'?'รายรับเดือนนี้':round==='15'?'OT วันที่ 15':round==='end'?'เงินเดือนสิ้นเดือน':'รายรับ'; }
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
function renderDebt(){
  const debts=(DATA.debtItems||[]).filter(d=>String(d.active)!=='false');
  const payments=DATA.debtPaymentHistory||[];
  const monthKey=incomeMonthKey(new Date());
  const thisMonth=payments.filter(p=>incomeMonthKey(p.date)===monthKey);
  const paidIds=new Set(thisMonth.filter(p=>p.status==='paid').map(p=>String(p.debtId)));
  const totalDue=debts.reduce((s,d)=>s+Number(d.amount||0),0);
  const paidTotal=thisMonth.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount||0),0);
  document.getElementById('debtMonthLabel').textContent=incomeMonthLabel(monthKey);
  document.getElementById('debtTotalDue').textContent=fmt(totalDue);
  document.getElementById('debtPaidThisMonth').textContent=fmt(paidTotal);
  document.getElementById('debtUnpaidCount').textContent=fmt(debts.filter(d=>!paidIds.has(String(d.id))).length);
  renderDebtEnvelopeSelect();
  renderDebtItems(debts,paidIds,thisMonth);
  renderDebtPaymentHistory();
}
function renderDebtEnvelopeSelect(){
  const select=document.getElementById('debtEnvelope');
  const options=(DATA.envelopes||[]).map(e=>`<option>${escapeHtml(e.name)}</option>`).join('');
  select.innerHTML='<option value="">ไม่หักซอง</option>'+options;
}
function renderDebtItems(debts,paidIds,thisMonth){
  const list=document.getElementById('debtItemsList');
  if(!debts.length){list.innerHTML='<p class="small">ยังไม่มีรายการหนี้</p>';return;}
  list.innerHTML=debts.map(d=>{
    const id=escapeHtml(escapeJsArg(d.id));
    const paid=paidIds.has(String(d.id));
    const last=thisMonth.find(p=>String(p.debtId)===String(d.id));
    const status=paid?'จ่ายแล้ว':last&&last.status==='unpaid'?'ค้างจ่าย':debtStatusText(d.status);
    return `<div class="debt-item"><div class="debt-main"><strong>${escapeHtml(d.name)}</strong><em>${escapeHtml(d.envelope||'ไม่หักซอง')} · ${escapeHtml(d.note||'')}</em><span class="debt-status ${paid?'paid':last&&last.status==='unpaid'?'unpaid':'due'}">${status}</span></div><div class="debt-side"><b class="amount-red">${fmt(d.amount)} ฿</b><div class="income-envelope-actions"><button class="mini ok" onclick="recordDebtPayment('${id}','paid')">จ่าย</button><button class="mini wait" onclick="recordDebtPayment('${id}','unpaid')">ค้าง</button><button class="mini no" onclick="deleteDebtItem('${id}')">ลบ</button></div></div></div>`;
  }).join('');
}
function renderDebtPaymentHistory(){
  const list=document.getElementById('debtPaymentHistoryList');
  const rows=(DATA.debtPaymentHistory||[]).slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  if(!rows.length){list.innerHTML='<p class="small">ยังไม่มีประวัติการจ่ายหนี้</p>';return;}
  const groups=rows.reduce((out,row)=>{const key=incomeMonthKey(row.date);(out[key]||(out[key]=[])).push(row);return out;},{});
  list.innerHTML=Object.keys(groups).sort().reverse().map(key=>{
    const items=groups[key], total=items.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0);
    return `<div class="income-month"><div class="income-month-head"><strong>${escapeHtml(incomeMonthLabel(key))}</strong><span>${fmt(total)} ฿</span></div>${items.map(item=>`<div class="income-row"><div><strong>${escapeHtml(item.debtName||'หนี้')}</strong><em>${escapeHtml(debtStatusText(item.status))}${item.note?' · '+escapeHtml(item.note):''}</em></div><b class="${item.status==='paid'?'amount-red':'amount-green'}">${item.status==='paid'?'-':''}${fmt(item.amount)} ฿</b></div>`).join('')}</div>`;
  }).join('');
}
function debtStatusText(status){ return status==='paid'?'จ่ายแล้ว':status==='unpaid'?'ค้างจ่าย':status==='paused'?'พักไว้':'ยังไม่จ่าย'; }
function renderBadges(){ const s=Number(DATA.settings.streakDays||0), e=Number(DATA.settings.emergencyCurrent||0); document.getElementById('badges').innerHTML=[['🛡️ 30 วันไม่กดบัตร',s>=30],['🔥 90 วันติด',s>=90],['🥉 ฉุกเฉิน 10,000',e>=10000],['🏰 ฉุกเฉิน 30,000',e>=30000]].map(b=>`<span class="badge2 ${b[1]?'on':''}">${b[0]}</span>`).join(''); }
function renderSavings(){ const e=Number(DATA.settings.emergencyCurrent||0), eg=Number(DATA.settings.emergencyGoal||10000), c=Number(DATA.settings.carFundCurrent||0), cg=Number(DATA.settings.carFundGoal||6000); document.getElementById('emergencyMoney').textContent=fmt(e); document.getElementById('carMoney').textContent=fmt(c); document.getElementById('emergencyBar').style.width=Math.min(100,e/eg*100)+'%'; document.getElementById('carBar').style.width=Math.min(100,c/cg*100)+'%'; document.getElementById('inputEmergency').value=e||''; document.getElementById('inputCar').value=c||''; document.getElementById('badgeSurvive').classList.toggle('on',e>=10000); document.getElementById('badgeFortress').classList.toggle('on',e>=30000); }
function renderSettingsForm(){ const s=DATA.settings||{}; document.getElementById('setDailyBudget').value=s.dailyBudget||DAILY_BUDGET_DEFAULT; document.getElementById('setDailyHour').value=s.dailyAutoTransferHour||7; document.getElementById('setPartnerName').value=s.partnerName||''; document.getElementById('setPartnerContact').value=s.partnerContact||''; }

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
function applyDemoIncomeAllocation(amount,source){
  const allocations=[['กู้ออมสิน',6214.34],['ค่างวดรถ',7375],['ประกันสังคม',875],['บัตรกดเงินสด',1600],['ค่าอาหาร',2500],['ค่าน้ำมัน',1500],['เงินฉุกเฉิน',1200],['ความสุข/เที่ยว',2000],['ซื้อของใช้',1000],['ดูแลรถ',500],['ซองรายวัน',DATA.todayBudget||DAILY_BUDGET_DEFAULT]];
  allocations.forEach(([name,budget])=>{
    const env=DATA.envelopes.find(e=>e.name===name);
    if(env){env.budget=budget;env.spent=0;env.remaining=budget;env.percent=0;env.low=false;}
  });
  DATA.incomeHistory=DATA.incomeHistory||[];
  DATA.incomeHistory.unshift({id:'demo_inc_'+Date.now(),date:new Date().toISOString(),amount,round:'month',note:source||'รายรับเดือนนี้'});
  DATA.events=DATA.events||[];
  DATA.events.unshift({message:'แบ่งรายรับเดือนนี้อัตโนมัติแล้ว',amount});
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
async function addIncome(){
  const amount=Number(document.getElementById('incomeAmount').value||0);
  const source=document.getElementById('incomeSource').value.trim();
  if(amount<=0)return showToast('กรอกยอดเงินก่อน');
  if(DEMO){applyDemoIncomeAllocation(amount,source);document.getElementById('incomeAmount').value='';document.getElementById('incomeSource').value='';renderAll();showToast('แบ่งเงินอัตโนมัติแล้ว (ทดลอง)');return;}
  try{ const r=await api({action:'addIncome',round:'month',amount,note:source||'รายรับเดือนนี้'}); DATA=r.data; document.getElementById('incomeAmount').value=''; document.getElementById('incomeSource').value=''; renderAll(); showToast('แบ่งเงินเข้าซองแล้ว'); }catch(err){showToast(err.message)} }
async function addDebtItem(){
  const name=document.getElementById('debtName').value.trim();
  const amount=Number(document.getElementById('debtAmount').value||0);
  const envelope=document.getElementById('debtEnvelope').value;
  const status=document.getElementById('debtStatus').value;
  const note=document.getElementById('debtNote').value.trim();
  if(!name)return showToast('กรอกชื่อหนี้ก่อน');
  if(amount<=0)return showToast('กรอกยอดหนี้ก่อน');
  if(DEMO){
    DATA.debtItems=DATA.debtItems||[];
    DATA.debtItems.unshift({id:'demo_debt_'+Date.now(),name,amount,status,note,envelope,active:true});
    clearDebtForm();renderAll();showToast('เพิ่มรายการหนี้แล้ว');return;
  }
  try{const r=await api({action:'addDebtItem',name,amount,status,note,envelope});DATA=r.data;clearDebtForm();renderAll();showToast('เพิ่มรายการหนี้แล้ว')}catch(err){showToast(err.message)}
}
function clearDebtForm(){
  document.getElementById('debtName').value='';
  document.getElementById('debtAmount').value='';
  document.getElementById('debtStatus').value='due';
  document.getElementById('debtNote').value='';
}
async function recordDebtPayment(id,status){
  const debt=(DATA.debtItems||[]).find(d=>String(d.id)===String(id));
  if(!debt)return showToast('ไม่พบรายการหนี้');
  const amount=status==='paid'?Number(prompt('ยอดที่จ่ายจริง', debt.amount)||0):0;
  if(status==='paid'&&amount<=0)return showToast('กรอกยอดที่จ่ายก่อน');
  const note=status==='paid'?'จ่ายหนี้เดือนนี้':'บันทึกค้างจ่ายเดือนนี้';
  if(DEMO){
    DATA.debtPaymentHistory=DATA.debtPaymentHistory||[];
    DATA.debtPaymentHistory.unshift({id:'demo_pay_'+Date.now(),debtId:id,debtName:debt.name,monthLabel:incomeMonthLabel(incomeMonthKey(new Date())),amount,status,date:new Date().toISOString(),note});
    debt.status=status;
    if(status==='paid'&&debt.envelope){applyDemoEnvelopeDelta(debt.envelope,amount);applyDemoExpenseTotalDelta(amount,debt.envelope,'debt');DATA.recentExpenses.unshift({id:'demo_debt_pay_'+Date.now(),amount,category:debt.name,envelope:debt.envelope,note,source:'debt'});}
    renderAll();showToast(status==='paid'?'บันทึกจ่ายหนี้แล้ว':'บันทึกค้างจ่ายแล้ว');return;
  }
  try{const r=await api({action:'recordDebtPayment',id,amount,status,note});DATA=r.data;renderAll();showToast(status==='paid'?'บันทึกจ่ายหนี้แล้ว':'บันทึกค้างจ่ายแล้ว')}catch(err){showToast(err.message)}
}
async function deleteDebtItem(id){
  const debt=(DATA.debtItems||[]).find(d=>String(d.id)===String(id));
  if(!debt)return showToast('ไม่พบรายการหนี้');
  if(!confirm('ลบรายการหนี้ '+debt.name+'? ประวัติการจ่ายเดิมจะยังเก็บไว้'))return;
  if(DEMO){DATA.debtItems=DATA.debtItems.filter(d=>String(d.id)!==String(id));renderAll();showToast('ลบรายการหนี้แล้ว');return;}
  try{const r=await api({action:'deleteDebtItem',id});DATA=r.data;renderAll();showToast('ลบรายการหนี้แล้ว')}catch(err){showToast(err.message)}
}
async function createEnvelope(){ const name=document.getElementById('newEnvName').value.trim(); if(!name)return showToast('กรอกชื่อซอง'); const budget=Number(document.getElementById('newEnvBudget').value||0), group=document.getElementById('newEnvGroup').value; if(DEMO){if(DATA.envelopes.some(e=>e.name===name))return showToast('มีซองนี้แล้ว');DATA.envelopes.push({name,group,budget,spent:0,remaining:budget,percent:0,locked:false,color:'#23d18b'});document.getElementById('newEnvName').value='';document.getElementById('newEnvBudget').value='';renderAll();showToast('สร้างซองแล้ว');return;} try{const r=await api({action:'createEnvelope',name,budget,group});DATA=r.data;document.getElementById('newEnvName').value='';document.getElementById('newEnvBudget').value='';renderAll();showToast('สร้างซองแล้ว')}catch(err){showToast(err.message)} }
function recalcEnvelope(env){
  env.budget=Number(env.budget||0);
  env.spent=Math.max(0,Number(env.spent||0));
  env.remaining=env.budget-env.spent;
  env.percent=env.budget?Math.round(env.spent/env.budget*100):0;
  env.low=env.budget>0&&env.remaining<=env.budget*.2;
}
function openEnvelopeEditor(name){
  const env=(DATA.envelopes||[]).find(e=>e.name===name);
  if(!env)return showToast('ไม่พบซอง');
  EDITING_ENVELOPE_NAME=name;
  document.getElementById('editEnvOriginalName').value=name;
  document.getElementById('editEnvName').value=name;
  document.getElementById('editEnvBudget').value=Number(env.remaining||0);
  document.getElementById('editEnvSpent').value=Number(env.spent||0);
  document.getElementById('editEnvGroup').value=env.group||'custom';
  document.getElementById('editEnvGoal').value=Number(env.goal||0)||'';
  document.getElementById('editEnvLocked').checked=!!env.locked;
  document.getElementById('deleteEnvelopeBtn').disabled=name==='ซองรายวัน';
  document.getElementById('envelopeModal').classList.add('show');
}
function closeEnvelopeEditor(){
  EDITING_ENVELOPE_NAME='';
  document.getElementById('envelopeModal').classList.remove('show');
}
async function saveEnvelopeEditor(){
  const name=document.getElementById('editEnvOriginalName').value;
  if(!name)return showToast('ไม่พบซองที่จะแก้ไข');
  const remaining=Number(document.getElementById('editEnvBudget').value||0);
  const spent=Number(document.getElementById('editEnvSpent').value||0);
  const payload={action:'updateEnvelope',name,budget:remaining+spent,spent,group:document.getElementById('editEnvGroup').value,goal:Number(document.getElementById('editEnvGoal').value||0),locked:document.getElementById('editEnvLocked').checked?'true':'false'};
  if(DEMO){
    const env=DATA.envelopes.find(e=>e.name===name);
    if(!env)return showToast('ไม่พบซอง');
    Object.assign(env,{budget:payload.budget,spent:payload.spent,group:payload.group,goal:payload.goal,locked:payload.locked==='true'});
    recalcEnvelope(env);
    if(name==='ซองรายวัน'){DATA.todayBudget=payload.budget;DATA.settings.dailyBudget=payload.budget;}
    closeEnvelopeEditor();renderAll();showToast('บันทึกซองแล้ว');return;
  }
  try{const r=await api(payload);DATA=r.data;closeEnvelopeEditor();renderAll();showToast('บันทึกซองแล้ว')}catch(err){showToast(err.message)}
}
async function resetEnvelopeSpent(name){
  if(!confirm('ล้างยอดใช้ของซอง '+name+' เป็น 0?'))return;
  if(DEMO){
    const env=DATA.envelopes.find(e=>e.name===name);
    if(!env)return showToast('ไม่พบซอง');
    env.spent=0;recalcEnvelope(env);renderAll();showToast('ล้างยอดใช้แล้ว');return true;
  }
  try{const r=await api({action:'updateEnvelope',name,spent:0});DATA=r.data;renderAll();showToast('ล้างยอดใช้แล้ว');return true}catch(err){showToast(err.message);return false}
}
async function resetEnvelopeSpentFromEditor(){
  const name=document.getElementById('editEnvOriginalName').value;
  if(!name)return showToast('ไม่พบซอง');
  const ok=await resetEnvelopeSpent(name);
  if(ok){
    const env=(DATA.envelopes||[]).find(e=>e.name===name);
    if(env){
      document.getElementById('editEnvBudget').value=Number(env.remaining||0);
      document.getElementById('editEnvSpent').value=Number(env.spent||0);
    }
  }
}
async function deleteEnvelope(name){
  if(name==='ซองรายวัน')return showToast('ซองรายวันเป็นซองหลัก ลบไม่ได้');
  if(!confirm('ลบซอง '+name+'? ถ้ามีประวัติรายจ่ายอยู่ ระบบจะไม่ให้ลบ'))return;
  if(DEMO){
    if((DATA.recentExpenses||[]).some(e=>e.envelope===name))return showToast('ซองนี้มีประวัติรายจ่าย ลบไม่ได้');
    DATA.envelopes=DATA.envelopes.filter(e=>e.name!==name);
    if(EDITING_ENVELOPE_NAME===name)closeEnvelopeEditor();
    renderAll();showToast('ลบซองแล้ว');return;
  }
  try{const r=await api({action:'deleteEnvelope',name});DATA=r.data;if(EDITING_ENVELOPE_NAME===name)closeEnvelopeEditor();renderAll();showToast('ลบซองแล้ว')}catch(err){showToast(err.message)}
}
function deleteEnvelopeFromEditor(){
  const name=document.getElementById('editEnvOriginalName').value;
  if(!name)return showToast('ไม่พบซอง');
  deleteEnvelope(name);
}
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
async function saveAppSettings(){ const p={action:'saveSettings',dailyBudget:Number(document.getElementById('setDailyBudget').value||DAILY_BUDGET_DEFAULT),dailyAutoTransferHour:Number(document.getElementById('setDailyHour').value||7),partnerName:document.getElementById('setPartnerName').value,partnerContact:document.getElementById('setPartnerContact').value}; if(DEMO){Object.assign(DATA.settings,p);DATA.todayBudget=p.dailyBudget;const daily=DATA.envelopes.find(e=>e.group==='daily'||e.name==='ซองรายวัน');if(daily){daily.budget=p.dailyBudget;daily.remaining=Number(daily.budget||0)-Number(daily.spent||0);daily.percent=daily.budget?Math.round(Number(daily.spent||0)/daily.budget*100):0;daily.low=daily.budget>0&&daily.remaining<=daily.budget*.2;}renderAll();closeSettings();showToast('บันทึกตั้งค่าแล้ว');return;} try{await api(p);await loadData();closeSettings();showToast('บันทึกตั้งค่าแล้ว')}catch(err){showToast(err.message)} }
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
