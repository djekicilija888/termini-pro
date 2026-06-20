const TABLET_TOKEN_KEY='terminiTabletDeviceToken';
const OWNER_TOKEN_KEY='terminiOwnerToken';
const TABLET_ADMIN_UNLOCK_KEY='terminiTabletAdminUnlocked';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().split('T')[0];
const tabletToken=()=>localStorage.getItem(TABLET_TOKEN_KEY)||'';
function setCookieTabletV133(name,value,maxAge){try{document.cookie=name+'='+encodeURIComponent(value||'')+'; path=/; max-age='+(maxAge||31536000)+'; SameSite=Lax'}catch(e){}}
function clearTabletModeMemory(){
  try{localStorage.removeItem(TABLET_TOKEN_KEY)}catch(e){}
  try{sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY)}catch(e){}
  try{
    document.cookie='terminiTabletMode=; path=/; max-age=0; SameSite=Lax';
    document.cookie='terminiTabletDevice=; path=/; max-age=0; SameSite=Lax';
  }catch(e){}
}
function prepareLockedTabletHistoryV133(){
  const token=tabletToken();
  if(!token)return;
  setCookieTabletV133('terminiTabletMode','1');
  setCookieTabletV133('terminiTabletDevice',token);
  try{localStorage.removeItem('terminiOwnerToken');localStorage.removeItem('token');sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY)}catch(e){}
  try{
    history.replaceState({tabletLocked:true},'',location.pathname+location.search);
    history.pushState({tabletLocked:true,guard:true},'',location.pathname+location.search);
    window.addEventListener('popstate',()=>{
      try{history.pushState({tabletLocked:true,guard:true},'',location.pathname+location.search)}catch(e){}
    });
  }catch(e){}
}
prepareLockedTabletHistoryV133();
async function plainApi(u,o={}){
  const r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'Greška');
  return d;
}
function tabletAdminMsg(text,type=''){
  const el=document.getElementById('tabletAdminMsg');
  if(!el)return;
  el.textContent=text||'';
  el.className='msg '+(type||'');
}
function openTabletAdminModal(){
  const m=document.getElementById('tabletAdminModal');
  if(!m)return;
  tabletAdminMsg('');
  m.classList.remove('hidden');
  setTimeout(()=>document.getElementById('tabletAdminEmail')?.focus({preventScroll:true}),80);
}
function closeTabletAdminModal(){document.getElementById('tabletAdminModal')?.classList.add('hidden')}
async function unlockTabletAdminWithToken(data){
  if(!data||!data.token)throw Error('Neuspešna prijava.');
  const user=data.user||data;
  if(user.role&&user.role!=='owner')throw Error('Nije admin nalog firme.');
  localStorage.setItem(OWNER_TOKEN_KEY,data.token);
  localStorage.setItem('token',data.token);
  if(tabletToken()){
    setCookieTabletV133('terminiTabletMode','1');
    setCookieTabletV133('terminiTabletDevice',tabletToken());
  }
  sessionStorage.setItem(TABLET_ADMIN_UNLOCK_KEY,'1');
  location.replace('/owner.html');
}
let tabletState={me:null,appointments:[],selected:null,services:[],staff:[]};

const TABLET_UNSAVED_TEXT='Nesačuvano. Napustiti bez čuvanja?';
let tabletUnsavedDirty=false;
function resetTabletUnsaved(){tabletUnsavedDirty=false}
function hasTabletUnsaved(){return !!tabletUnsavedDirty}
function showTabletUnsavedDialog(){
 return new Promise(resolve=>{
  try{document.getElementById('tabletUnsavedModal')?.remove()}catch(_e){}
  const modal=document.createElement('div');
  modal.id='tabletUnsavedModal';
  modal.className='app-confirm-modal-v142';
  modal.innerHTML='<div class="app-confirm-box-v142"><h3>Nesačuvano</h3><p>Imaš izmene koje nisu sačuvane.</p><div class="app-confirm-actions-v142"><button type="button" class="btn ghost" data-act="stay">Ostani</button><button type="button" class="btn" data-act="leave">Napusti bez čuvanja</button></div></div>';
  const done=v=>{try{modal.remove()}catch(_e){};resolve(v)};
  modal.addEventListener('click',ev=>{if(ev.target===modal)done(false);const b=ev.target.closest&&ev.target.closest('[data-act]');if(!b)return;done(b.dataset.act==='leave')});
  document.body.appendChild(modal);
  setTimeout(()=>{try{modal.querySelector('[data-act="stay"]').focus()}catch(_e){}},20);
 });
}
async function confirmTabletDiscardUnsavedAsync(){if(!hasTabletUnsaved())return true;return await showTabletUnsavedDialog()}
function confirmTabletDiscardUnsaved(){if(!hasTabletUnsaved())return true;return window.confirm(TABLET_UNSAVED_TEXT)}
document.addEventListener('input',ev=>{if(ev.target&&ev.target.closest&&ev.target.closest('#tabletManualForm')&&ev.target.matches('input,select,textarea')&&!ev.target.readOnly)tabletUnsavedDirty=true},true);
document.addEventListener('change',ev=>{if(ev.target&&ev.target.closest&&ev.target.closest('#tabletManualForm')&&ev.target.matches('input,select,textarea')&&!ev.target.readOnly)tabletUnsavedDirty=true},true);
window.addEventListener('beforeunload',ev=>{if(hasTabletUnsaved()){ev.preventDefault();ev.returnValue='';}});

const tabletEls={
  locked:$('#tabletLocked'),
  main:$('#tabletMain'),
  title:$('#tabletTitle'),
  sub:$('#tabletSub'),
  msg:$('#tabletMsg'),
  date:$('#tabletDate'),
  status:$('#tabletStatus'),
  load:$('#tabletLoad'),
  refresh:$('#tabletRefresh'),
  appointments:$('#tabletAppointments'),
  statusModal:$('#tabletStatusModal'),
  modalTitle:$('#tabletModalTitle'),
  modalHint:$('#tabletModalHint'),
  modalClose:$('#tabletModalClose'),
  statusReason:$('#tabletStatusReason'),
  toggleManual:$('#tabletToggleManual'),
  manualPanel:$('#tabletManualPanel'),
  closeManual:$('#tabletCloseManual'),
  manualForm:$('#tabletManualForm'),
  manualName:$('#tabletManualName'),
  manualPhone:$('#tabletManualPhone'),
  manualEmail:$('#tabletManualEmail'),
  manualService:$('#tabletManualService'),
  manualStaff:$('#tabletManualStaff'),
  manualDate:$('#tabletManualDate'),
  manualTime:$('#tabletManualTime'),
  manualNotes:$('#tabletManualNotes'),
  manualSlotRefresh:$('#tabletManualSlotRefresh'),
  adminOpen:$('#tabletAdminOpen'),
  adminModal:$('#tabletAdminModal'),
  adminClose:$('#tabletAdminClose'),
  adminForm:$('#tabletAdminForm'),
  adminEmail:$('#tabletAdminEmail'),
  adminPassword:$('#tabletAdminPassword'),
  adminNoReg:$('#tabletAdminNoReg')
};

async function api(u,o={}){
  const h={'Content-Type':'application/json',...(o.headers||{})};
  if(tabletToken())h['X-Device-Token']=tabletToken();
  const r=await fetch(u,{...o,headers:h,cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const er=Error(d.error||'Greška');er.status=r.status;throw er}
  return d;
}
function statusText(s){return {booked:'Zakazan',completed:'Završen',cancelled:'Otkazan',no_show:'Nije došao'}[s]||s||''}
function tmsg(text,type=''){
  if(!tabletEls.msg)return;
  tabletEls.msg.textContent=text||'';
  tabletEls.msg.className='msg '+(type||'');
  if(text)window.setTimeout(()=>{if(tabletEls.msg&&tabletEls.msg.textContent===text)tabletEls.msg.textContent=''},4500);
}
function showLocked(txt){
  tabletEls.main?.classList.add('hidden');
  tabletEls.locked?.classList.remove('hidden');
  const p=tabletEls.locked?.querySelector('.muted');
  if(txt&&p)p.textContent=txt;
}
function goBackToLogin(){
  clearTabletModeMemory();
  location.replace('/');
}
function showMain(){
  tabletEls.locked?.classList.add('hidden');
  tabletEls.main?.classList.remove('hidden');
}
async function loadMe(){
  try{
    const d=await api('/api/tablet/me');
    tabletState.me=d;
    tabletEls.title.textContent=d.location.name||'Lokacija';
    tabletEls.sub.textContent=[d.business.name,d.location.city,d.location.address].filter(Boolean).join(' · ');
    showMain();
    return d;
  }catch(e){
    if([401,403,404,423].includes(Number(e.status||0)))clearTabletModeMemory();
    showLocked(e.message);
    throw e
  }
}

async function loadTabletManualOptions(){
  if(!tabletEls.manualService)return;
  try{
    if(!tabletState.me)await loadMe();
    if(!tabletEls.manualDate.value)tabletEls.manualDate.value=tabletEls.date.value||today();
    const p=new URLSearchParams({date:tabletEls.manualDate.value||today()});
    const data=await api('/api/tablet/options?'+p);
    tabletState.services=data.services||[];
    tabletState.staff=data.staff||[];
    const oldService=tabletEls.manualService.value;
    const oldStaff=tabletEls.manualStaff.value;
    tabletEls.manualService.innerHTML=tabletState.services.length
      ? tabletState.services.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.duration)} min</option>`).join('')
      : '<option value="">Nema usluga za ovu lokaciju</option>';
    if(oldService&&tabletState.services.some(x=>String(x.id)===String(oldService)))tabletEls.manualService.value=oldService;
    tabletEls.manualStaff.innerHTML='<option value="">Bilo koji slobodan radnik</option>'+tabletState.staff.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    if(oldStaff&&tabletState.staff.some(x=>String(x.id)===String(oldStaff)))tabletEls.manualStaff.value=oldStaff;
    await updateTabletManualSlots();
  }catch(e){tmsg(e.message||'Greška pri učitavanju opcija.','err')}
}
async function updateTabletManualSlots(){
  if(!tabletEls.manualTime||!tabletEls.manualService||!tabletEls.manualDate)return;
  if(!tabletEls.manualService.value){tabletEls.manualTime.innerHTML='<option value="">Nema slobodnih termina</option>';return;}
  tabletEls.manualTime.innerHTML='<option value="">Učitavam...</option>';
  try{
    const p=new URLSearchParams({date:tabletEls.manualDate.value||today(),service_id:tabletEls.manualService.value});
    if(tabletEls.manualStaff.value)p.set('staff_id',tabletEls.manualStaff.value);
    const rows=await api('/api/tablet/available-slots?'+p);
    tabletEls.manualTime.innerHTML=rows.length
      ? rows.map(x=>`<option value="${esc(x.start_time)}" data-staff="${esc(x.staff_id)}">${esc(x.start_time)}–${esc(x.end_time)} · ${esc(x.staff_name||'Radnik')}</option>`).join('')
      : '<option value="">Nema slobodnih termina</option>';
  }catch(e){tabletEls.manualTime.innerHTML='<option value="">Greška pri učitavanju</option>';tmsg(e.message||'Greška pri učitavanju slobodnih termina.','err')}
}
function openManualModal(){
  if(!tabletEls.manualPanel)return;
  if(!tabletEls.manualDate.value)tabletEls.manualDate.value=tabletEls.date.value||today();
  tabletEls.manualPanel.classList.remove('hidden');
  tabletEls.manualPanel.classList.add('manual-modal-open');
  document.body.classList.add('manual-modal-body-open');
  tabletEls.toggleManual?.classList.add('open');
  tabletEls.toggleManual?.setAttribute('aria-expanded','true');
  loadTabletManualOptions().then(()=>setTimeout(()=>tabletEls.manualName?.focus({preventScroll:true}),80));
}
async function closeManualModal(force=false){
  if(!force&&!(await confirmTabletDiscardUnsavedAsync()))return;
  if(!tabletEls.manualPanel)return;
  tabletEls.manualPanel.classList.add('hidden');
  tabletEls.manualPanel.classList.remove('manual-modal-open');
  document.body.classList.remove('manual-modal-body-open');
  tabletEls.toggleManual?.classList.remove('open');
  tabletEls.toggleManual?.setAttribute('aria-expanded','false');
  setTimeout(resetTabletUnsaved,80);
}

async function loadAppointments(){
  try{
    if(!tabletState.me)await loadMe();
    const p=new URLSearchParams({date:tabletEls.date.value||today()});
    if(tabletEls.status.value)p.set('status',tabletEls.status.value);
    const rows=await api('/api/tablet/appointments?'+p);
    tabletState.appointments=rows;
    renderAppointments(rows);
  }catch(e){showLocked(e.message)}
}
function renderAppointments(rows){
  tabletEls.appointments.innerHTML='<tr><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th><th>Akcija</th></tr>'+((rows||[]).length?rows.map(a=>`<tr class="tablet-appt-row-v126"><td><b>${esc(a.start_time)}–${esc(a.end_time)}</b></td><td>${esc(a.customer_name)}<br><span class="muted">${esc(a.phone)}</span></td><td>${esc(a.service_name)}</td><td>${esc(a.staff_name||'-')}</td><td><span class="tablet-status-badge-v126">${esc(statusText(a.status))}</span></td><td><button class="btn small ghost tablet-open-status-v126" type="button" data-id="${esc(a.id)}">Otvori</button></td></tr>`).join(''):'<tr><td colspan="6"><p class="muted">Nema termina za izabrani datum.</p></td></tr>');
  tabletEls.appointments.querySelectorAll('.tablet-open-status-v126').forEach(b=>b.onclick=()=>openStatusModal(b.dataset.id));
}
function openStatusModal(id){
  const a=tabletState.appointments.find(x=>String(x.id)===String(id));
  if(!a)return;
  tabletState.selected=a;
  tabletEls.modalTitle.textContent=`${a.start_time} · ${a.customer_name}`;
  tabletEls.modalHint.textContent=`${a.service_name} · ${a.staff_name||'-'} · trenutno: ${statusText(a.status)}`;
  tabletEls.statusReason.value='';
  tabletEls.statusModal.classList.remove('hidden');
}
function closeStatusModal(){tabletEls.statusModal.classList.add('hidden');tabletState.selected=null}
async function changeStatus(status){
  const a=tabletState.selected;
  if(!a)return;
  const extra=status==='cancelled'||status==='no_show';
  if(extra&&!tabletEls.statusReason.value.trim()){tabletEls.statusReason.focus();return alert('Unesi razlog za ovu promenu.')}
  if(!confirm(`Da li sigurno želiš da promeniš status termina u "${statusText(status)}"?`))return;
  await api('/api/tablet/appointments/'+encodeURIComponent(a.id)+'/status',{method:'PATCH',body:JSON.stringify({status,reason:tabletEls.statusReason.value})});
  closeStatusModal();
  tmsg('Status je promenjen.','ok');
  await loadAppointments();
}

async function submitTabletManual(e){
  e.preventDefault();
  const selected=tabletEls.manualTime.options[tabletEls.manualTime.selectedIndex];
  if(!tabletEls.manualTime.value)return tmsg('Izaberi slobodno vreme.','err');
  await api('/api/tablet/appointments',{method:'POST',body:JSON.stringify({
    customer_name:tabletEls.manualName.value,
    phone:tabletEls.manualPhone.value,
    email:tabletEls.manualEmail.value,
    service_id:tabletEls.manualService.value,
    staff_id:tabletEls.manualStaff.value || (selected?selected.dataset.staff:''),
    date:tabletEls.manualDate.value,
    start_time:tabletEls.manualTime.value,
    notes:tabletEls.manualNotes.value
  })});
  tmsg('Termin je dodat.','ok');
  tabletEls.date.value=tabletEls.manualDate.value||tabletEls.date.value||today();
  tabletEls.manualName.value='';
  tabletEls.manualPhone.value='';
  tabletEls.manualEmail.value='';
  tabletEls.manualNotes.value='';
  resetTabletUnsaved();
  closeManualModal(true);
  await loadAppointments();
  await loadTabletManualOptions();
}

if(!tabletEls.date.value)tabletEls.date.value=today();
if(tabletEls.manualDate&&!tabletEls.manualDate.value)tabletEls.manualDate.value=today();
tabletEls.load.onclick=loadAppointments;
tabletEls.refresh.onclick=loadAppointments;
tabletEls.date.onchange=loadAppointments;
tabletEls.status.onchange=loadAppointments;
tabletEls.modalClose.onclick=closeStatusModal;
tabletEls.statusModal.addEventListener('mousedown',e=>{if(e.target===tabletEls.statusModal)closeStatusModal()});
document.querySelectorAll('#tabletStatusModal [data-status]').forEach(b=>b.onclick=()=>changeStatus(b.dataset.status).catch(e=>alert(e.message)));
tabletEls.toggleManual.onclick=openManualModal;
tabletEls.closeManual.onclick=closeManualModal;
tabletEls.manualPanel.addEventListener('mousedown',e=>{if(e.target===tabletEls.manualPanel)closeManualModal()});
tabletEls.manualDate.onchange=loadTabletManualOptions;
tabletEls.manualService.onchange=updateTabletManualSlots;
tabletEls.manualStaff.onchange=updateTabletManualSlots;
tabletEls.manualSlotRefresh.onclick=updateTabletManualSlots;
tabletEls.manualForm.onsubmit=e=>submitTabletManual(e).catch(err=>tmsg(err.message||'Greška pri dodavanju termina.','err'));
document.getElementById('tabletBackLogin')?.addEventListener('click',goBackToLogin);
tabletEls.adminOpen?.addEventListener('click',openTabletAdminModal);
tabletEls.adminClose?.addEventListener('click',closeTabletAdminModal);
tabletEls.adminModal?.addEventListener('mousedown',e=>{if(e.target===tabletEls.adminModal)closeTabletAdminModal()});
tabletEls.adminForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  tabletAdminMsg('Proveravam admin nalog...');
  try{
    const data=await plainApi('/api/auth/login',{method:'POST',body:JSON.stringify({email:tabletEls.adminEmail.value,password:tabletEls.adminPassword.value})});
    await unlockTabletAdminWithToken(data);
  }catch(err){tabletAdminMsg(err.message||'Neuspešna admin prijava.','err')}
});
tabletEls.adminNoReg?.addEventListener('click',async()=>{
  tabletAdminMsg('Ulazim bez registracije...');
  try{
    const data=await plainApi('/api/auth/test-owner-login',{method:'POST'});
    await unlockTabletAdminWithToken(data);
  }catch(err){tabletAdminMsg(err.message||'Neuspešan ulaz bez registracije.','err')}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeStatusModal();closeManualModal();closeTabletAdminModal()}});
loadAppointments().then(()=>loadTabletManualOptions());
