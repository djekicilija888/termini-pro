const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];
const OWNER_ACTIVE_TAB_KEY='terminiOwnerActiveTab';
const OWNER_VALID_TABS=['dash','appointments','bookinglink','staff','services','hours','settings','logs'];
function getOwnerStartupTab(){
 try{
  const hash=(location.hash||'').replace('#','');
  if(OWNER_VALID_TABS.includes(hash))return hash;
  const saved=localStorage.getItem(OWNER_ACTIVE_TAB_KEY)||'';
  if(OWNER_VALID_TABS.includes(saved))return saved;
 }catch(_e){}
 return 'dash';
}
function rememberOwnerTab(id){try{if(OWNER_VALID_TABS.includes(id))localStorage.setItem(OWNER_ACTIVE_TAB_KEY,id)}catch(_e){}}
function currentOwnerDomTab(){
 try{
  const activeBtn=document.querySelector('.tabs button.active');
  if(activeBtn&&OWNER_VALID_TABS.includes(activeBtn.dataset.tab))return activeBtn.dataset.tab;
  const visible=[...document.querySelectorAll('#app .tab')].find(x=>x&&!x.classList.contains('hidden'));
  if(visible&&OWNER_VALID_TABS.includes(visible.id))return visible.id;
 }catch(_e){}
 return '';
}
function rememberCurrentOwnerDomTab(){
 try{
  const id=currentOwnerDomTab();
  if(id)rememberOwnerTab(id);
 }catch(_e){}
}
window.addEventListener('pagehide', rememberCurrentOwnerDomTab);
window.addEventListener('beforeunload', rememberCurrentOwnerDomTab);
window.addEventListener('visibilitychange',()=>{if(document.hidden)rememberCurrentOwnerDomTab()});
const OWNER_TAB_FAST_TTL=180000;
let ownerTabLoadedAt={};
function markOwnerTabsStale(...ids){try{ids.flat().filter(Boolean).forEach(id=>{ownerTabLoadedAt[id]=0})}catch(_e){}}
function ownerTabCanUseCached(id){try{return !!(ownerTabLoadedAt[id] && Date.now()-ownerTabLoadedAt[id]<OWNER_TAB_FAST_TTL)}catch(_e){return false}}
function ownerMarkTabLoaded(id){try{ownerTabLoadedAt[id]=Date.now()}catch(_e){}}
const TABLET_TOKEN_KEY='terminiTabletDeviceToken';
const TABLET_ADMIN_UNLOCK_KEY='terminiTabletAdminUnlocked';
let tok=()=>localStorage.getItem(T)||localStorage.getItem('token')||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};
function tabletToken(){return localStorage.getItem(TABLET_TOKEN_KEY)||''}
function tabletModeActive(){return !!tabletToken()}
function tabletAdminUnlocked(){return sessionStorage.getItem(TABLET_ADMIN_UNLOCK_KEY)==='1'}
function canOpenOwnerPanel(){return !tabletModeActive()||tabletAdminUnlocked()}
function setCookie(name,value,maxAge){try{document.cookie=name+'='+encodeURIComponent(value||'')+'; path=/; max-age='+(maxAge||31536000)+'; SameSite=Lax'}catch(e){}}
function clearCookie(name){try{document.cookie=name+'=; path=/; max-age=0; SameSite=Lax'}catch(e){}}
function setTabletModeCookie(){setCookie('terminiTabletMode','1');if(tabletToken())setCookie('terminiTabletDevice',tabletToken())}
function clearTabletModeMemory(){
 try{localStorage.removeItem(TABLET_TOKEN_KEY)}catch(e){}
 try{sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY)}catch(e){}
 clearCookie('terminiTabletMode');
 clearCookie('terminiTabletDevice');
 const banner=document.getElementById('tabletAdminBanner');
 if(banner)banner.remove();
 updateTabletOwnerHeader();
}
async function refreshTabletModeAfterLocationChange(){
 if(!tabletModeActive())return false;
 const ok=await validateTabletModeForOwner();
 if(!ok){
  updateTabletOwnerHeader();
  const banner=document.getElementById('tabletAdminBanner');
  if(banner)banner.remove();
 }
 return ok;
}
async function validateTabletModeForOwner(){
 const token=tabletToken();
 if(!token){clearTabletModeMemory();return false;}
 try{
  const r=await fetch('/api/tablet/me',{headers:{'Content-Type':'application/json','X-Device-Token':token},cache:'no-store'});
  if(r.ok){setTabletModeCookie();return true;}
  if([401,403,404,423].includes(r.status)){clearTabletModeMemory();return false;}
  return true;
 }catch(e){return true;}
}
function clearOwnerSession(){localStorage.removeItem(T);localStorage.removeItem('token')}
function updateTabletOwnerHeader(){
 const out=document.getElementById('logout');
 if(out)out.classList.toggle('hidden', tabletModeActive()&&tabletAdminUnlocked());
}
function enterTabletLockedMode(deviceToken){
 if(deviceToken)localStorage.setItem(TABLET_TOKEN_KEY,deviceToken);
 setTabletModeCookie();
 sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY);
 clearOwnerSession();
 location.replace(window.terminiAppPath ? window.terminiAppPath('/tablet') : '/tablet.html');
}
function showTabletAdminLock(){
 const lock=$('#tabletAdminLock');
 if(!lock)return;
 setTabletModeCookie();
 sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY);
 clearOwnerSession();
 lock.classList.remove('hidden');
 if(login)login.classList.add('hidden');
 if(app)app.classList.add('hidden');
}
function enforceTabletOwnerLock(){
 if(tabletModeActive()&&!tabletAdminUnlocked()){
  showTabletAdminLock();
  return true;
 }
 return false;
}
window.addEventListener('pageshow', enforceTabletOwnerLock);
window.addEventListener('focus', enforceTabletOwnerLock);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)enforceTabletOwnerLock()});
window.addEventListener('popstate',()=>setTimeout(enforceTabletOwnerLock,0));
async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();if(tabletAdminUnlocked())h['X-Tablet-Admin-Unlocked']='1';let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}
async function plainApi(u,o={}){let r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Greška');return d}

const UNSAVED_CHANGES_TEXT='Sačuvati izmene?';
let unsavedGuardDirty=false;
let unsavedGuardReady=false;
let unsavedGuardSnapshots=new WeakMap();
let unsavedGuardValueSnapshots=new WeakMap();
let unsavedGuardDirtyScopes=new Set();
function unsavedGuardVisible(el){return !!(el&&el.offsetParent!==null&&!el.closest('.hidden'))}
function unsavedScopeForTarget(el){
 try{
  if(!el||!el.closest)return null;
  const scope=el.closest('#app form,#app #profileLocationForm,#app #hoursForm');
  if(!scope||scope.id==='loginForm'||scope.id==='tabletAdminUnlockForm')return null;
  return scope;
 }catch(_e){return null}
}
function markUnsavedScope(scope){
 if(scope&&unsavedGuardVisible(scope))unsavedGuardDirtyScopes.add(scope);
 else if(scope)unsavedGuardDirtyScopes.add(scope);
 else unsavedGuardDirty=true;
}
function clearUnsavedGuardDirtyFast(){
 unsavedGuardDirty=false;
 try{unsavedGuardDirtyScopes.clear()}catch(_e){}
 unsavedGuardReady=true;
}
function unsavedGuardScopes(){return [...document.querySelectorAll('#app form,#app #profileLocationForm,#app #hoursForm')].filter(el=>el&&el.id!=='loginForm'&&el.id!=='tabletAdminUnlockForm')}
function unsavedGuardVisibleScopes(){
 try{
  const containers=[];
  const active=document.querySelector('#app .tab:not(.hidden)');
  if(active)containers.push(active);
  ['profileLocationModal','locationHoursModal','manualAppointmentPanel','staffModal'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.classList.contains('hidden'))containers.push(el)});
  const out=[];
  containers.forEach(c=>{
   c.querySelectorAll('form,#profileLocationForm,#hoursForm').forEach(sc=>{
    if(sc&&sc.id!=='loginForm'&&sc.id!=='tabletAdminUnlockForm'&&unsavedGuardVisible(sc)&&!out.includes(sc))out.push(sc);
   });
  });
  return out;
 }catch(_e){return unsavedGuardScopes().filter(unsavedGuardVisible)}
}
function unsavedGuardSerialize(scope){
 if(!scope)return '';
 return [...scope.querySelectorAll('input,select,textarea')].filter(el=>!el.disabled&&el.type!=='button'&&el.type!=='submit'&&el.type!=='reset'&&!el.readOnly).map(el=>{
  const key=el.id||el.name||el.placeholder||el.type||el.tagName;
  if(el.type==='checkbox'||el.type==='radio')return key+'='+(el.checked?'1':'0');
  if(el.tagName==='SELECT'&&el.multiple)return key+'='+[...el.selectedOptions].map(o=>o.value).join('|');
  return key+'='+(el.value||'');
 }).join('&');
}
function unsavedGuardControls(scope){
 try{return [...(scope||document).querySelectorAll('input,select,textarea')].filter(el=>!el.disabled&&el.type!=='button'&&el.type!=='submit'&&el.type!=='reset'&&!el.readOnly)}catch(_e){return []}
}
function unsavedGuardTakeValueSnapshot(scope){
 try{
  const controls=unsavedGuardControls(scope);
  unsavedGuardValueSnapshots.set(scope,controls.map(el=>({
   tag:el.tagName,type:el.type,
   value:el.tagName==='SELECT'&&el.multiple?[...el.options].map(o=>!!o.selected):(el.value||''),
   checked:!!el.checked
  })));
 }catch(_e){}
}
function unsavedGuardRestoreValueSnapshot(scope){
 try{
  const snap=unsavedGuardValueSnapshots.get(scope);
  if(!snap)return;
  const controls=unsavedGuardControls(scope);
  controls.forEach((el,i)=>{
   const v=snap[i];
   if(!v)return;
   if(el.type==='checkbox'||el.type==='radio')el.checked=!!v.checked;
   else if(el.tagName==='SELECT'&&el.multiple&&Array.isArray(v.value)){[...el.options].forEach((o,idx)=>{o.selected=!!v.value[idx]})}
   else el.value=v.value==null?'':v.value;
  });
 }catch(_e){}
}
function resetUnsavedGuard(scope){
 try{
  if(scope){
   unsavedGuardDirtyScopes.delete(scope);
   unsavedGuardSnapshots.set(scope,unsavedGuardSerialize(scope));
   unsavedGuardTakeValueSnapshot(scope);
  }else{
   unsavedGuardDirty=false;
   unsavedGuardDirtyScopes.clear();
   const scopes=unsavedGuardScopes();
   scopes.forEach(sc=>{unsavedGuardSnapshots.set(sc,unsavedGuardSerialize(sc));unsavedGuardTakeValueSnapshot(sc);});
  }
  unsavedGuardReady=true;
 }catch(_e){}
}
function resetUnsavedGuardForVisible(){
 try{
  unsavedGuardDirty=false;
  const visible=unsavedGuardVisibleScopes();
  visible.forEach(sc=>{
   unsavedGuardDirtyScopes.delete(sc);
   unsavedGuardSnapshots.set(sc,unsavedGuardSerialize(sc));
   unsavedGuardTakeValueSnapshot(sc);
  });
  unsavedGuardReady=true;
 }catch(_e){resetUnsavedGuard()}
}
function hasUnsavedChanges(){
 if(!unsavedGuardReady)return false;
 if(unsavedGuardDirty)return true;
 try{
  for(const sc of unsavedGuardDirtyScopes){
   if(sc&&unsavedGuardVisible(sc)&&unsavedGuardSerialize(sc)!==unsavedGuardSnapshots.get(sc))return true;
  }
  return false;
 }catch(_e){return false;}
}
function unsavedChangedScopes(){
 try{
  const out=[];
  for(const sc of unsavedGuardDirtyScopes){
   if(sc&&unsavedGuardVisible(sc)&&unsavedGuardSerialize(sc)!==unsavedGuardSnapshots.get(sc)&&!out.includes(sc))out.push(sc);
  }
  return out;
 }catch(_e){return []}
}
function discardUnsavedChanges(){
 try{
  const scopes=unsavedChangedScopes();
  scopes.forEach(sc=>{
   unsavedGuardRestoreValueSnapshot(sc);
   unsavedGuardDirtyScopes.delete(sc);
   unsavedGuardSnapshots.set(sc,unsavedGuardSerialize(sc));
   unsavedGuardTakeValueSnapshot(sc);
  });
  unsavedGuardDirty=false;
  try{ if(typeof refreshProfileAddLocationButton==='function')refreshProfileAddLocationButton(); }catch(_e){}
  try{ if(typeof updateStaffWorkerPinVisibility==='function')updateStaffWorkerPinVisibility(); }catch(_e){}
 }catch(_e){clearUnsavedGuardDirtyFast()}
}
function currentUnsavedScope(){
 const changed=unsavedChangedScopes();
 const modalScope=changed.find(sc=>sc.closest&&sc.closest('#profileLocationModal:not(.hidden),#locationHoursModal:not(.hidden),#manualAppointmentPanel:not(.hidden),#staffModal:not(.hidden)'));
 if(modalScope)return modalScope;
 const active=document.querySelector('#app .tab:not(.hidden)');
 return changed.find(sc=>active&&active.contains(sc))||changed[0]||null;
}
function waitUnsavedSaved(ms=700){
 const start=Date.now();
 return new Promise(resolve=>{
  const check=()=>{
   if(!hasUnsavedChanges())return resolve(true);
   if(Date.now()-start>ms)return resolve(false);
   setTimeout(check,20);
  };
  check();
 });
}
async function saveCurrentUnsavedChanges(){
 const scope=currentUnsavedScope();
 if(!scope){resetUnsavedGuard();return true;}
 try{
  if(scope.id==='settingsForm'&&typeof saveSettingsFormFast==='function')return await saveSettingsFormFast();
  if(scope.id==='profileLocationForm'&&typeof profileModalSaveBtn!=='undefined'&&profileModalSaveBtn){profileModalSaveBtn.click();}
  else if(scope.id==='hoursForm'&&typeof saveHours!=='undefined'&&saveHours){saveHours.click();}
  else if(scope.tagName==='FORM'){
   if(scope.requestSubmit)scope.requestSubmit();
   else scope.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }else{
   const btn=scope.querySelector('button[type="submit"],.btn:not(.ghost)');
   if(btn)btn.click();
   else return false;
  }
  const ok=await waitUnsavedSaved();
  if(!ok){try{msg('Promene nisu sačuvane. Proveri polja i pokušaj ponovo.','err')}catch(_e){};return false;}
  return true;
 }catch(e){try{msg(e.message||'Promene nisu sačuvane.','err')}catch(_e){};return false;}
}
function showUnsavedGuardDialog(){
 return new Promise(resolve=>{
  try{document.getElementById('unsavedGuardModal')?.remove()}catch(_e){}
  const modal=document.createElement('div');
  modal.id='unsavedGuardModal';
  modal.className='app-confirm-modal-v143';
  modal.innerHTML='<div class="app-confirm-box-v143"><h3>Sačuvati izmene?</h3><div class="app-confirm-actions-v143"><button type="button" class="btn ghost" data-act="stay">Ostani</button><button type="button" class="btn ghost danger" data-act="leave">Napusti bez čuvanja</button><button type="button" class="btn" data-act="save">Sačuvaj</button></div></div>';
  const done=v=>{try{modal.remove()}catch(_e){};resolve(v)};
  modal.addEventListener('click',ev=>{if(ev.target===modal)done('stay');const b=ev.target.closest&&ev.target.closest('[data-act]');if(!b)return;done(b.dataset.act)});
  document.body.appendChild(modal);
  setTimeout(()=>{try{modal.querySelector('[data-act="save"]').focus()}catch(_e){}},20);
 });
}
async function confirmDiscardUnsavedChangesAsync(){
 if(!hasUnsavedChanges())return true;
 const act=await showUnsavedGuardDialog();
 if(act==='leave'){discardUnsavedChanges();return true;}
 if(act==='save')return await saveCurrentUnsavedChanges();
 return false;
}
function confirmDiscardUnsavedChanges(){
 if(!hasUnsavedChanges())return true;
 return window.confirm(UNSAVED_CHANGES_TEXT);
}
document.addEventListener('input',ev=>{if(ev.target&&ev.target.closest&&ev.target.closest('#app')&&ev.target.matches('input,select,textarea')&&!ev.target.readOnly){markUnsavedScope(unsavedScopeForTarget(ev.target))}},true);
document.addEventListener('change',ev=>{if(ev.target&&ev.target.closest&&ev.target.closest('#app')&&ev.target.matches('input,select,textarea')&&!ev.target.readOnly){markUnsavedScope(unsavedScopeForTarget(ev.target))}},true);
window.addEventListener('beforeunload',ev=>{if(hasUnsavedChanges()){ev.preventDefault();ev.returnValue='';}});
setTimeout(()=>resetUnsavedGuard(),500);
function msg(t,c=''){om.textContent=t;om.className='msg '+c}
function ensureTabletOwnerBanner(){
 updateTabletOwnerHeader();
 if(!tabletModeActive()||!tabletAdminUnlocked()||document.getElementById('tabletAdminBanner'))return;
 const banner=document.createElement('div');
 banner.id='tabletAdminBanner';
 banner.className='notice warn tablet-admin-banner-v129';
 banner.innerHTML='<b>Admin je privremeno otključan na uređaju koji je povezan kao tablet.</b><p class="muted">Kad završiš podešavanje, zaključaj uređaj i vrati radnički ekran.</p><div class="actions"><button id="tabletRelockNow" class="btn small" type="button">Zaključaj i otvori radnički ekran</button></div>';
 app.insertBefore(banner, app.firstChild);
 const b=document.getElementById('tabletRelockNow');
 if(b)b.onclick=()=>{sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY);clearOwnerSession();location.replace(window.terminiAppPath ? window.terminiAppPath('/tablet') : '/tablet.html')};
}
async function ownerNoRegistrationLogin(buttonEl,msgEl){
 const out=msgEl||document.getElementById('lm')||document.getElementById('tabletAdminUnlockMsg');
 if(out){out.textContent='Ulazim bez registracije...';out.className='msg';}
 if(buttonEl)buttonEl.disabled=true;
 try{
  const d=await plainApi('/api/auth/test-owner-login',{method:'POST'});
  if(!d.user||d.user.role!=='owner')throw Error('Test nalog nije admin nalog firme.');
  localStorage.setItem(T,d.token);
  localStorage.setItem('token',d.token);
  if(tabletModeActive())sessionStorage.setItem(TABLET_ADMIN_UNLOCK_KEY,'1');
  if(out){out.textContent='Ušao si bez registracije.';out.className='msg ok';}
  show();
  tab('dash');
 }catch(er){
  if(buttonEl)buttonEl.disabled=false;
  if(out){out.textContent=er.message||'Neuspešan ulaz bez registracije.';out.className='msg err';}
 }
}
function show(){
 if(!canOpenOwnerPanel())return showTabletAdminLock();
 const lock=$('#tabletAdminLock');if(lock)lock.classList.add('hidden');
 login.classList.add('hidden');app.classList.remove('hidden');ensureTabletOwnerBanner();updateTabletOwnerHeader();
}
function hide(){
 if(!canOpenOwnerPanel())return showTabletAdminLock();
 const lock=$('#tabletAdminLock');if(lock)lock.classList.add('hidden');
 login.classList.remove('hidden');app.classList.add('hidden');updateTabletOwnerHeader()
}
if(typeof ownerNoRegBtn!=='undefined'&&ownerNoRegBtn)ownerNoRegBtn.onclick=()=>ownerNoRegistrationLogin(ownerNoRegBtn,lm);
if(typeof tabletAdminNoRegBtn!=='undefined'&&tabletAdminNoRegBtn)tabletAdminNoRegBtn.onclick=()=>ownerNoRegistrationLogin(tabletAdminNoRegBtn,tabletAdminUnlockMsg);
if(typeof tabletAdminUnlockForm!=='undefined'&&tabletAdminUnlockForm){
 tabletAdminUnlockForm.onsubmit=async e=>{
  e.preventDefault();
  tabletAdminUnlockMsg.textContent='Proveravam admin nalog...';tabletAdminUnlockMsg.className='msg';
  try{
   const d=await plainApi('/api/auth/login',{method:'POST',body:JSON.stringify({email:tabletAdminEmail.value,password:tabletAdminPassword.value})});
   if(!d.user||d.user.role!=='owner')throw Error('Nije admin nalog firme.');
   localStorage.setItem(T,d.token);localStorage.setItem('token',d.token);
   sessionStorage.setItem(TABLET_ADMIN_UNLOCK_KEY,'1');
   tabletAdminUnlockMsg.textContent='Admin je otključan.';tabletAdminUnlockMsg.className='msg ok';
   show();tab('dash');
  }catch(er){tabletAdminUnlockMsg.textContent=er.message||'Neuspešna prijava.';tabletAdminUnlockMsg.className='msg err'}
 };
}
loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);localStorage.setItem('token',d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};
logout.onclick=async()=>{if(!await confirmDiscardUnsavedChangesAsync())return;resetUnsavedGuard();clearOwnerSession();sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY);hide()};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=async()=>{if(b.classList.contains('active'))return;if(!await confirmDiscardUnsavedChangesAsync())return;tab(b.dataset.tab)});
function tab(id){
 if(!canOpenOwnerPanel())return showTabletAdminLock();
 if(!OWNER_VALID_TABS.includes(id))id='dash';
 rememberOwnerTab(id);
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
 document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));
 const panel=$('#'+id);
 if(panel)panel.classList.remove('hidden');
 msg('');
 // Ako je kartica već skoro učitana, nemoj ponovo da zoveš server na svaki klik.
 // Time prelazak između kartica ostaje trenutni, a podaci se osvežavaju posle čuvanja/brisanja.
 if(ownerTabCanUseCached(id)){
  setTimeout(()=>resetUnsavedGuardForVisible(),1);
  return Promise.resolve();
 }
 let loader=({dash:loadDash,bookinglink:loadBookingLink,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,settings:loadSettings,logs:loadLogs}[id]||(()=>{}));
 let res;
 try{res=loader()}catch(e){try{msg(e.message||'Greška pri učitavanju.','err')}catch(_e){}}
 if(res&&typeof res.finally==='function')return res.finally(()=>{ownerMarkTabLoaded(id);setTimeout(()=>resetUnsavedGuardForVisible(),1)});
 ownerMarkTabLoaded(id);
 setTimeout(()=>resetUnsavedGuardForVisible(),1);
 return Promise.resolve();
}
async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent='Osnovna strana';cards.innerHTML=`<div class="item clean-stat"><b>Danas</b><h2>${d.cards.today}</h2><p>zakazanih termina</p></div><div class="item clean-stat"><b>7 dana</b><h2>${d.cards.week}</h2><p>u narednoj nedelji</p></div><div class="item clean-stat"><b>Radnici</b><h2>${d.cards.staff}</h2><p>aktivnih radnika</p></div><div class="item clean-stat"><b>Usluge</b><h2>${d.cards.services}</h2><p>aktivnih usluga</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Lokacija</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.location_name||'-'}</td><td>${a.status}</td></tr>`).join('')}
let ownerServiceCache=[], ownerStaffCache=[];
let manualOptionsLoadedAt=0, manualOptionsStale=true;
const MANUAL_OPTIONS_TTL=180000;
function manualPanelIsOpen(){try{const p=document.getElementById('manualAppointmentPanel');return !!(p&&!p.classList.contains('hidden'))}catch(_e){return false}}
function closeOwnerManualAppointmentModal(opts={}){
  try{
    const panel=document.getElementById('manualAppointmentPanel');
    const btn=document.getElementById('toggleManualAppointment');
    if(opts.reset){
      const name=document.getElementById('manualName');
      const phone=document.getElementById('manualPhone');
      const email=document.getElementById('manualEmail');
      const notes=document.getElementById('manualNotes');
      if(name)name.value='';
      if(phone)phone.value='';
      if(email)email.value='';
      if(notes)notes.value='';
    }
    if(panel){
      panel.classList.add('hidden');
      panel.classList.remove('manual-modal-open');
    }
    document.body.classList.remove('manual-modal-body-open');
    if(btn){
      btn.setAttribute('aria-expanded','false');
      btn.classList.remove('open');
      const plus=btn.querySelector('.manual-plus');
      if(plus)plus.textContent='+';
    }
    if(typeof resetUnsavedGuard==='function')resetUnsavedGuard(document.getElementById('manualForm')||undefined);
  }catch(_e){}
}
function forceCloseOwnerManualAppointmentModalV166(){
  try{
    const panel=document.getElementById('manualAppointmentPanel');
    const btn=document.getElementById('toggleManualAppointment');
    if(panel){
      panel.classList.add('hidden');
      panel.classList.remove('manual-modal-open');
      panel.style.display='';
      panel.style.pointerEvents='';
      panel.setAttribute('aria-hidden','true');
    }
    document.body.classList.remove('manual-modal-body-open');
    document.body.style.overflow='';
    if(btn){
      btn.setAttribute('aria-expanded','false');
      btn.classList.remove('open');
      const plus=btn.querySelector('.manual-plus');
      if(plus)plus.textContent='+';
    }
  }catch(_e){}
}
function markManualOptionsStale(){manualOptionsStale=true;manualOptionsLoadedAt=0;}

function locIdsOf(x){return (x&&Array.isArray(x.location_ids)?x.location_ids:[]).map(String)}
function selectedActiveLocationIds(){return (ownerLocationsCache||[]).filter(l=>l&&l.active!==0).map(l=>String(l.id))}
function locationAllowedForItem(item,locationId){
 const ids=locIdsOf(item);
 if(!locationId || !ids.length)return true;
 return ids.includes(String(locationId));
}
function itemLocationText(item){
 const ids=locIdsOf(item), active=selectedActiveLocationIds();
 if(!ids.length || ids.length===active.length)return 'Sve lokacije';
 const names=(ownerLocationsCache||[]).filter(l=>ids.includes(String(l.id))).map(l=>l.name||l.city||('Lokacija '+l.id));
 return names.length?names.join(', '):'Sve lokacije';
}
function currentManualLocationId(){
 if(typeof manualLocation!=='undefined' && manualLocation && manualLocation.value)return manualLocation.value;
 const first=(ownerLocationsCache||[]).find(l=>l&&l.active!==0);
 return first?String(first.id):'';
}
function renderLocationChecks(boxId,selectedIds){
 const box=document.getElementById(boxId);
 if(!box)return;
 const locs=(ownerLocationsCache||[]).filter(l=>l&&l.active!==0);
 if(locs.length<=1){box.innerHTML='';box.classList.add('hidden');return;}
 box.classList.remove('hidden');
 const ids=(selectedIds&&selectedIds.length?selectedIds:locs.map(l=>l.id)).map(String);
 box.innerHTML=`<p class="muted location-checks-title-v122">Lokacije na kojima je dostupno</p>`+locs.map(l=>`<label class="location-check-v122"><input type="checkbox" value="${htmlEsc(l.id)}" ${ids.includes(String(l.id))?'checked':''}> ${htmlEsc(l.name||l.city||'Lokacija')}</label>`).join('');
 if(boxId==='staffLocationsBox')box.querySelectorAll('input[type="checkbox"]').forEach(ch=>ch.onchange=()=>renderStaffLocationScheduleBox(null,collectLocationChecks('staffLocationsBox')));
}
function collectLocationChecks(boxId){
 const box=document.getElementById(boxId);
 if(!box)return selectedActiveLocationIds().map(Number);
 const checked=[...box.querySelectorAll('input[type="checkbox"]:checked')].map(x=>Number(x.value)).filter(Boolean);
 const all=(ownerLocationsCache||[]).filter(l=>l&&l.active!==0).map(l=>Number(l.id)).filter(Boolean);
 return checked.length?checked:all;
}

function locationNameById(id){
 const l=(ownerLocationsCache||[]).find(x=>String(x.id)===String(id));
 return l?(l.name||l.city||('Lokacija '+l.id)):'Lokacija';
}
function normalizedStaffSchedule(schedule,allowedIds){
 const byDay={};
 (schedule||[]).forEach(r=>{byDay[Number(r.day)]=r});
 const ids=(allowedIds&&allowedIds.length?allowedIds:selectedActiveLocationIds()).map(String);
 const first=ids[0]||'';
 return [0,1,2,3,4,5,6].map(d=>{
  const r=byDay[d];
  if(r)return {day:d,location_id:r.is_working?String(r.location_id||''):'',is_working:!!r.is_working,start_time:r.start_time||'09:00',end_time:r.end_time||'17:00'};
  return {day:d,location_id:first,is_working:!!first,start_time:'09:00',end_time:'17:00'};
 });
}
function locationScheduleOptionTextV179(loc){
 if(!loc)return 'Adresa nije uneta';
 const address=(loc.address||'').trim();
 const name=(loc.name||'').trim();
 const city=(loc.city||'').trim();
 return address||name||city||'Adresa nije uneta';
}

function renderStaffLocationScheduleBox(schedule=null,allowedIds=null){
 const box=document.getElementById('staffLocationScheduleBox');
 if(!box)return;
 const locs=(ownerLocationsCache||[]).filter(l=>l&&l.active!==0);
 // Raspored rada radnika treba da bude vidljiv i kada firma ima samo jednu lokaciju.
 // Ranije se ovde krio za locs.length<=1, pa je raspored nestajao kod firmi sa jednom lokacijom.
 if(!locs.length){box.innerHTML='';box.classList.add('hidden');return;}
 const ids=(allowedIds&&allowedIds.length?allowedIds:collectLocationChecks('staffLocationsBox')).map(String);
 const allowedLocs=locs.filter(l=>ids.includes(String(l.id)));
 if(!allowedLocs.length){box.innerHTML='<p class="muted">Izaberi bar jednu lokaciju za radnika.</p>';box.classList.remove('hidden');return;}
 box.classList.remove('hidden');
 const rows=normalizedStaffSchedule(schedule,ids);
 box.innerHTML=`<div class="staff-schedule-head-v125"><h3>Raspored rada radnika</h3><p class="muted">Odredi kog dana je radnik na kojoj lokaciji. Mušterija vidi radnika samo na lokaciji gde je tog dana podešen.</p></div>`+
  rows.map(r=>`<div class="staff-schedule-day-v125" data-day="${r.day}">
    <div class="staff-schedule-day-title-v179">${day[r.day]}</div>
    <label class="staff-schedule-location-wrap-v179"><span class="staff-schedule-field-label-v179">Lokacija</span><select class="staff-schedule-location-v125" aria-label="Lokacija ${day[r.day]}"><option value="">Ne radi</option>${allowedLocs.map(l=>`<option value="${htmlEsc(l.id)}" ${String(r.location_id)===String(l.id)?'selected':''}>${htmlEsc(locationScheduleOptionTextV179(l))}</option>`).join('')}</select></label>
    <div class="staff-schedule-time-row-v179">
      <input aria-label="Početak rada ${day[r.day]}" class="staff-schedule-start-v125" type="time" value="${htmlEsc(r.start_time||'09:00')}">
      <input aria-label="Kraj rada ${day[r.day]}" class="staff-schedule-end-v125" type="time" value="${htmlEsc(r.end_time||'17:00')}">
    </div>
  </div>`).join('');
}
function collectStaffLocationSchedule(){
 const box=document.getElementById('staffLocationScheduleBox');
 if(!box||box.classList.contains('hidden'))return [];
 return [...box.querySelectorAll('.staff-schedule-day-v125')].map(row=>{
  const lid=row.querySelector('.staff-schedule-location-v125').value;
  return {day:Number(row.dataset.day),location_id:lid?Number(lid):null,is_working:!!lid,start_time:row.querySelector('.staff-schedule-start-v125').value||'09:00',end_time:row.querySelector('.staff-schedule-end-v125').value||'17:00'};
 });
}
function staffScheduleForSelectedDate(item,locationId,dateVal){
 if(!item||!locationId)return true;
 const sched=Array.isArray(item.location_schedule)?item.location_schedule:[];
 if(!sched.length)return true;
 const d=dateVal&&/^\d{4}-\d{2}-\d{2}$/.test(dateVal)?new Date(dateVal+'T12:00:00').getDay():new Date().getDay();
 const r=sched.find(x=>Number(x.day)===d);
 return !!(r&&r.is_working&&String(r.location_id)===String(locationId));
}
function staffScheduleText(item){
 const sched=Array.isArray(item&&item.location_schedule)?item.location_schedule:[];
 if(!sched.length)return 'Raspored po lokacijama nije posebno podešen.';
 return sched.map(r=>`${shortDayName(r.day)} ${r.is_working?locationNameById(r.location_id):'ne radi'}`).join('; ');
}
function populateLocationSelect(select,includeAll=false){
 if(!select)return;
 const old=select.value;
 const locs=(ownerLocationsCache||[]).filter(l=>l&&l.active!==0);
 select.innerHTML=(includeAll?'<option value="">Sve lokacije</option>':'')+locs.map((l,i)=>`<option value="${htmlEsc(l.id)}">${htmlEsc(l.name||('Lokacija '+(i+1)))}</option>`).join('');
 if(old && [...select.options].some(o=>o.value===old))select.value=old;
 else if(includeAll)select.value='';
}
function refreshManualLocationSelects(){
 if(typeof manualLocation!=='undefined'){
  populateLocationSelect(manualLocation,false);
  const wrap=document.getElementById('manualLocationWrap');
  if(wrap)wrap.classList.toggle('hidden',(ownerLocationsCache||[]).filter(l=>l&&l.active!==0).length<=1);
 }
 if(typeof appointmentLocationFilter!=='undefined')populateLocationSelect(appointmentLocationFilter,true);
}
function filterItemsByManualLocation(items,checkSchedule=false){
 const lid=currentManualLocationId();
 const dateVal=(typeof manualDate!=='undefined'&&manualDate.value)?manualDate.value:today();
 return (items||[]).filter(x=>x.active!==0 && locationAllowedForItem(x,lid) && (!checkSchedule || staffScheduleForSelectedDate(x,lid,dateVal)));
}
async function updateManualChoices(){
 const oldService=typeof manualService!=='undefined'?manualService.value:'';
 const oldStaff=typeof manualStaff!=='undefined'?manualStaff.value:'';
 const services=filterItemsByManualLocation(ownerServiceCache,false);
 const staffRows=filterItemsByManualLocation(ownerStaffCache,true);
 if(typeof manualService!=='undefined'){
  manualService.innerHTML=services.map(x=>`<option value="${x.id}">${htmlEsc(x.name)} · ${x.duration} min</option>`).join('');
  if(oldService && services.some(x=>String(x.id)===String(oldService)))manualService.value=oldService;
 }
 if(typeof manualStaff!=='undefined'){
  manualStaff.innerHTML='<option value="">Bilo koji slobodan radnik</option>'+staffRows.map(x=>`<option value="${x.id}">${htmlEsc(x.name)}</option>`).join('');
  if(oldStaff && staffRows.some(x=>String(x.id)===String(oldStaff)))manualStaff.value=oldStaff;
 }
 if(manualPanelIsOpen()) await updateManualSlots();
}

async function loadManualOptions(force=false){
  try{ await ensureOwnerLocationsLoaded(); }catch(_e){}
  const fresh=!force && !manualOptionsStale && ownerServiceCache.length && ownerStaffCache.length && (Date.now()-manualOptionsLoadedAt<MANUAL_OPTIONS_TTL);
  if(!fresh){
    const [services,staff]=await Promise.all([api('/api/owner/services'), api('/api/owner/staff')]);
    ownerServiceCache=services;
    ownerStaffCache=staff;
    manualOptionsLoadedAt=Date.now();
    manualOptionsStale=false;
  }
  refreshManualLocationSelects();
  if(typeof manualDate!=='undefined' && !manualDate.value) manualDate.value = today();
  if(manualPanelIsOpen()) await updateManualChoices();
}

async function updateManualSlots(){
  if(!manualPanelIsOpen()) return;
  if(typeof manualTime==='undefined' || !manualService || !manualDate || !manualDate.value) return;
  if(!manualService.value){manualTime.innerHTML='<option value="">Nema usluga za ovu lokaciju</option>';return;}
  manualTime.innerHTML = '<option value="">Učitavam...</option>';
  try{
    let p = new URLSearchParams({date:manualDate.value,service_id:manualService.value});
    const lid=currentManualLocationId();if(lid)p.set('location_id',lid);
    if(manualStaff.value) p.set('staff_id', manualStaff.value);
    let rows = await api('/api/owner/available-slots?'+p);
    manualTime.innerHTML = rows.length
      ? rows.map(x=>`<option value="${x.start_time}" data-staff="${x.staff_id}">${x.start_time}–${x.end_time} · ${htmlEsc(x.staff_name||'Radnik')}</option>`).join('')
      : '<option value="">Nema slobodnih termina</option>';
  }catch(e){
    manualTime.innerHTML = '<option value="">Greška pri učitavanju</option>';
    msg(e.message,'err');
  }
}

async function loadAppointments(){
  try{ await ensureOwnerLocationsLoaded(); }catch(_e){}
  refreshManualLocationSelects();
  if(typeof manualService!=='undefined' && manualPanelIsOpen()) await loadManualOptions();

  if(!from.value)from.value=today();
  if(!to.value)to.value=add(30);
  let p=new URLSearchParams({from:from.value,to:to.value});
  if(status.value)p.set('status',status.value);
  if(typeof appointmentLocationFilter!=='undefined' && appointmentLocationFilter.value)p.set('location_id',appointmentLocationFilter.value);
  let rows=await api('/api/owner/appointments?'+p);

  appointmentsBody.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Lokacija</th><th>Status</th><th>Promeni</th></tr>'+rows.map(a=>`
    <tr>
      <td>${a.date}</td>
      <td>${a.start_time}-${a.end_time}</td>
      <td>${htmlEsc(a.customer_name)}<br>${htmlEsc(a.phone)}</td>
      <td>${htmlEsc(a.service_name)}</td>
      <td>${htmlEsc(a.staff_name||'-')}</td>
      <td>${htmlEsc(a.location_name||'-')}</td>
      <td>${htmlEsc(a.status)}</td>
      <td>
        <select data-id="${a.id}">
          <option value="booked" ${a.status==='booked'?'selected':''}>booked</option>
          <option value="completed" ${a.status==='completed'?'selected':''}>completed</option>
          <option value="cancelled" ${a.status==='cancelled'?'selected':''}>cancelled</option>
          <option value="no_show" ${a.status==='no_show'?'selected':''}>no_show</option>
        </select>
      </td>
    </tr>`).join('');

  appointmentsBody.querySelectorAll('select').forEach(s=>{
    s.onchange=async()=>{
      await api('/api/owner/appointments/'+s.dataset.id+'/status',{method:'PATCH',body:JSON.stringify({status:s.value})});
      msg('Status promenjen.','ok');
      await loadAppointments();
      setTimeout(()=>resetUnsavedGuard(),80);
    }
  });
}

if(typeof manualLocation!=='undefined') manualLocation.onchange=()=>loadManualOptions().catch(e=>msg(e.message,'err'));
if(typeof manualService!=='undefined') manualService.onchange=updateManualSlots;
if(typeof manualStaff!=='undefined') manualStaff.onchange=updateManualSlots;
if(typeof manualDate!=='undefined') manualDate.onchange=()=>loadManualOptions().catch(e=>msg(e.message,'err'));
if(typeof appointmentLocationFilter!=='undefined') appointmentLocationFilter.onchange=loadAppointments;
if(typeof loadA!=='undefined') loadA.onclick=loadAppointments;
if(typeof manualSlotRefresh!=='undefined') manualSlotRefresh.onclick=updateManualSlots;
const manualCancelBtn=document.getElementById('manualCancel');
if(manualCancelBtn) manualCancelBtn.onclick=()=>closeOwnerManualAppointmentModal({reset:true});
if(typeof manualForm!=='undefined') manualForm.onsubmit=async e=>{
  e.preventDefault();
  let selected = manualTime.options[manualTime.selectedIndex];
  if(!manualTime.value) return msg('Izaberi slobodno vreme.','err');
  await api('/api/owner/appointments',{
    method:'POST',
    body:JSON.stringify({
      customer_name:manualName.value,
      phone:manualPhone.value,
      email:manualEmail.value,
      location_id:currentManualLocationId(),
      service_id:manualService.value,
      staff_id:manualStaff.value || (selected ? selected.dataset.staff : ''),
      date:manualDate.value,
      start_time:manualTime.value,
      notes:manualNotes.value
    })
  });
  msg('Termin je dodat.','ok');
  manualName.value='';manualPhone.value='';manualEmail.value='';manualNotes.value='';
  markOwnerTabsStale('appointments','dash');
  try{ forceCloseOwnerManualAppointmentModalV166(); }catch(_e){ closeOwnerManualAppointmentModal({reset:false}); }
  await loadAppointments();
  ownerMarkTabLoaded('appointments');
  try{ forceCloseOwnerManualAppointmentModalV166(); }catch(_e){ closeOwnerManualAppointmentModal({reset:false}); }
  setTimeout(()=>resetUnsavedGuard(manualForm),80);
};

function splitOwnerPhoneRows(value,max=10){
 let raw;
 if(Array.isArray(value))raw=value;
 else{
  const txt=String(value||'').replace(/\r\n?/g,'\n').trim();
  if(!txt)return [];
  if(txt[0]==='['){try{const arr=JSON.parse(txt);if(Array.isArray(arr))raw=arr;}catch(_e){}}
  if(!raw)raw=txt.split(/[\n,;|]+/);
 }
 const out=[];
 for(const item of raw){
  const p=String(item||'').trim();
  if(p)out.push(p);
  if(out.length>=max)break;
 }
 return out;
}
function splitStaffPhones(value){
 return splitOwnerPhoneRows(value,10);
}
function syncStaffPhoneUi(){
 const box=document.getElementById('staffPhonesBox');
 if(!box)return;
 const rows=[...box.querySelectorAll('.staff-phone-row-v158')];
 const addBtn=box.querySelector('.staff-add-phone-v158');
 const anyFilled=rows.some(row=>{
  const input=row.querySelector('.staff-phone-input-v158');
  return input&&input.value.trim();
 });
 if(addBtn)addBtn.classList.toggle('hidden',!anyFilled);
 rows.forEach(row=>{
  const input=row.querySelector('.staff-phone-input-v158');
  const remove=row.querySelector('.staff-phone-remove-v158');
  if(!input||!remove)return;
  const shouldShow=rows.length>1 || !!input.value.trim();
  remove.classList.toggle('hidden',!shouldShow);
  remove.disabled=!shouldShow;
 });
}
function clearStaffPhoneFixedCenterV169(){
 try{
  document.body.classList.remove('staff-phone-fixed-center-v169');
  document.body.classList.remove('staff-phone-typing-v167');
  const form=document.querySelector('#staffModal .staff-modal-form-v145');
  if(form){
    delete form.dataset.staffPhoneLockScrollTopV174;
    delete form.dataset.staffPhoneLockActiveV174;
    delete form.dataset.staffPhoneLockInputIdV176;
  }
 }catch(_e){}
}
function applyStaffPhoneLockedScrollV174(){
 try{
  const form=document.querySelector('#staffModal .staff-modal-form-v145');
  if(!form || form.dataset.staffPhoneLockActiveV174!=='1')return;
  const top=Number(form.dataset.staffPhoneLockScrollTopV174||'');
  if(Number.isFinite(top))form.scrollTop=top;
 }catch(_e){}
}
function centerStaffPhoneInputOnScreenV167(input, force=false){
 try{
  if(!input)return;
  const row=input.closest('.staff-phone-row-v158') || input;
  const form=document.querySelector('#staffModal .staff-modal-form-v145');
  if(!row || !form)return;

  document.body.classList.add('staff-phone-typing-v167');

  const doCenter=()=>{
    try{
      const vv=window.visualViewport;
      const viewportTop=vv?vv.offsetTop:0;
      const viewportHeight=vv?vv.height:window.innerHeight;
      const wantedCenter=viewportTop+(viewportHeight*0.50);
      const rect=row.getBoundingClientRect();
      const rowCenter=rect.top+(rect.height/2);
      const delta=rowCenter-wantedCenter;
      form.scrollTop += delta;
      form.dataset.staffPhoneLockScrollTopV174=String(form.scrollTop);
      form.dataset.staffPhoneLockActiveV174='1';
    }catch(_e){
      try{
        row.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
        form.dataset.staffPhoneLockScrollTopV174=String(form.scrollTop);
        form.dataset.staffPhoneLockActiveV174='1';
      }catch(_e2){}
    }
  };

  if(force || form.dataset.staffPhoneLockActiveV174!=='1'){
    doCenter();
    clearTimeout(window.__staffPhoneCenterTimerV171);
    window.__staffPhoneCenterTimerV171=setTimeout(doCenter,80);
    setTimeout(doCenter,220);
  }else{
    applyStaffPhoneLockedScrollV174();
  }
 }catch(_e){}
}
function keepStaffPhoneLockedAfterTypingV174(){
 try{
  applyStaffPhoneLockedScrollV174();
  requestAnimationFrame(applyStaffPhoneLockedScrollV174);
  clearTimeout(window.__staffPhoneLockRestoreTimerV174);
  window.__staffPhoneLockRestoreTimerV174=setTimeout(applyStaffPhoneLockedScrollV174,40);
  setTimeout(applyStaffPhoneLockedScrollV174,120);
 }catch(_e){}
}

function scheduleStaffPhoneCenterAfterKeyboardV178(input){
 try{
  if(!input)return;
  // Prvi klik u prazno polje: Android prvo otvara tastaturu i ume da povuče polje gore.
  // Zato centriramo odmah, pa ponovo nakon otvaranja tastature.
  centerStaffPhoneInputOnScreenV167(input,true);
  clearTimeout(window.__staffPhoneKeyboardCenterTimer1V178);
  clearTimeout(window.__staffPhoneKeyboardCenterTimer2V178);
  clearTimeout(window.__staffPhoneKeyboardCenterTimer3V178);
  clearTimeout(window.__staffPhoneKeyboardCenterTimer4V178);
  window.__staffPhoneKeyboardCenterTimer1V178=setTimeout(()=>centerStaffPhoneInputOnScreenV167(input,true),120);
  window.__staffPhoneKeyboardCenterTimer2V178=setTimeout(()=>centerStaffPhoneInputOnScreenV167(input,true),300);
  window.__staffPhoneKeyboardCenterTimer3V178=setTimeout(()=>centerStaffPhoneInputOnScreenV167(input,true),550);
  window.__staffPhoneKeyboardCenterTimer4V178=setTimeout(()=>centerStaffPhoneInputOnScreenV167(input,true),850);
 }catch(_e){}
}
(function installStaffPhoneViewportCenterV178(){
 try{
  if(window.__staffPhoneViewportCenterInstalledV178)return;
  window.__staffPhoneViewportCenterInstalledV178=true;
  const handler=()=>{
    const active=document.activeElement;
    if(active && active.classList && active.classList.contains('staff-phone-input-v158')){
      scheduleStaffPhoneCenterAfterKeyboardV178(active);
    }
  };
  if(window.visualViewport)window.visualViewport.addEventListener('resize',handler);
  window.addEventListener('resize',handler);
 }catch(_e){}
})();
function addStaffPhoneField(value=''){
 const box=document.getElementById('staffPhonesBox');
 if(!box)return null;
 const addBtn=box.querySelector('.staff-add-phone-v158');
 const row=document.createElement('div');
 row.className='staff-phone-row-v158';
 const input=document.createElement('input');
 input.type='tel';
 input.className='staff-phone-input-v158';
 input.placeholder='Broj telefona';
 input.value=value||'';
 input.addEventListener('focus',()=>scheduleStaffPhoneCenterAfterKeyboardV178(input));
 input.addEventListener('click',()=>scheduleStaffPhoneCenterAfterKeyboardV178(input));
 input.addEventListener('input',()=>{
  const addBtnBefore=document.getElementById('staffPhonesBox')?.querySelector('.staff-add-phone-v158');
  const wasHidden=!addBtnBefore || addBtnBefore.classList.contains('hidden');
  syncStaffPhoneUi();
  markUnsavedScope(staffForm);
  const addBtnAfter=document.getElementById('staffPhonesBox')?.querySelector('.staff-add-phone-v158');
  const becameVisible=wasHidden && addBtnAfter && !addBtnAfter.classList.contains('hidden');
  if(becameVisible){
    // Prva cifra: dugme se pojavljuje i centriranje ide ODMAH, bez čekanja,
    // da ne postoji vidljiv trzaj gore pa vraćanje u centar.
    centerStaffPhoneInputOnScreenV167(input,true);
    keepStaffPhoneLockedAfterTypingV174();
    requestAnimationFrame(()=>keepStaffPhoneLockedAfterTypingV174());
    setTimeout(()=>keepStaffPhoneLockedAfterTypingV174(),30);
    setTimeout(()=>keepStaffPhoneLockedAfterTypingV174(),90);
  }else{
    keepStaffPhoneLockedAfterTypingV174();
  }
});
 input.addEventListener('blur',()=>setTimeout(()=>clearStaffPhoneFixedCenterV169(),220));
 const remove=document.createElement('button');
 remove.type='button';
 remove.className='staff-phone-remove-v158';
 remove.setAttribute('aria-label','Ukloni telefon');
 remove.title='Ukloni telefon';
 remove.textContent='×';
 remove.onclick=()=>{
  row.remove();
  if(!box.querySelector('.staff-phone-row-v158'))addStaffPhoneField('');
  syncStaffPhoneUi();
  markUnsavedScope(staffForm);
 };
 row.appendChild(input);
 row.appendChild(remove);
 if(addBtn)box.insertBefore(row,addBtn);else box.appendChild(row);
 syncStaffPhoneUi();
 return input;
}
function renderStaffPhones(value=''){
 const box=document.getElementById('staffPhonesBox');
 if(!box)return;
 box.innerHTML='';
 const rows=splitStaffPhones(value);
 if(!rows.length)rows.push('');
 rows.forEach(v=>addStaffPhoneField(v));
 const add=document.createElement('button');
 add.type='button';
 add.className='staff-add-phone-v158 hidden';
 add.textContent='Dodaj još jedan telefon';
 add.onclick=(ev)=>{
  if(ev)ev.preventDefault();
  const form=document.querySelector('#staffModal .staff-modal-form-v145');
  const oldTop=form?form.scrollTop:0;

  const input=addStaffPhoneField('');
  syncStaffPhoneUi();
  markUnsavedScope(staffForm);

  // Sprečava Android/WebView da pri fokusu prvo povuče ekran gore,
  // pa tek onda da ga naš kod vrati u centar.
  if(form)form.scrollTop=oldTop;
  if(input){
    try{
      input.focus({preventScroll:true});
    }catch(_e){
      input.focus();
      if(form)form.scrollTop=oldTop;
    }
    centerStaffPhoneInputOnScreenV167(input,true);
    keepStaffPhoneLockedAfterTypingV174();
    requestAnimationFrame(()=>keepStaffPhoneLockedAfterTypingV174());
  }
 };
 box.appendChild(add);
 syncStaffPhoneUi();
}
function collectStaffPhones(){
 const box=document.getElementById('staffPhonesBox');
 if(!box)return '';
 return [...box.querySelectorAll('.staff-phone-input-v158')].map(i=>i.value.trim()).filter(Boolean).slice(0,10).join('\n');
}
function staffPhoneListText(value){
 const phones=splitStaffPhones(value);
 return phones.length?phones.join(' / '):'';
}
function resetSt(){
 staffId.value='';staffName.value='';staffTitle.value='';renderStaffPhones('');staffEmail.value='';staffSort.value=0;staffActive.checked=true;
 if(typeof staffWorkerAccess!=='undefined'&&staffWorkerAccess)staffWorkerAccess.checked=false;
 if(typeof staffWorkerPin!=='undefined'&&staffWorkerPin)staffWorkerPin.value='';
 updateStaffWorkerPinVisibility();
 renderLocationChecks('staffLocationsBox',selectedActiveLocationIds());renderStaffLocationScheduleBox([],selectedActiveLocationIds());
}
function updateStaffWorkerPinVisibility(){
 const wrap=document.getElementById('staffWorkerPinWrap');
 if(!wrap)return;
 wrap.classList.toggle('hidden',!(typeof staffWorkerAccess!=='undefined'&&staffWorkerAccess&&staffWorkerAccess.checked));
 const input=document.getElementById('staffWorkerPin');
 if(input)input.placeholder=staffId&&staffId.value?'Ostavi prazno ako ne menjaš PIN':'npr. 1234';
}
function fillStaffForm(x){
 if(!x){resetSt();if(staffModalTitle)staffModalTitle.textContent='Dodaj radnika';return;}
 staffId.value=x.id;
 staffName.value=x.name||'';
 staffTitle.value=x.title||'';
 renderStaffPhones(x.phone||'');
 staffEmail.value=x.email||'';
 staffSort.value=x.sort_order||0;
 staffActive.checked=!!x.active;
 if(typeof staffWorkerAccess!=='undefined'&&staffWorkerAccess)staffWorkerAccess.checked=!!x.worker_access;
 if(typeof staffWorkerPin!=='undefined'&&staffWorkerPin)staffWorkerPin.value='';
 updateStaffWorkerPinVisibility();
 const ids=x.location_ids||selectedActiveLocationIds();
 renderLocationChecks('staffLocationsBox',ids);
 renderStaffLocationScheduleBox(x.location_schedule||[],ids);
 if(staffModalTitle)staffModalTitle.textContent='Izmeni radnika';
}
function openStaffModal(x){
 fillStaffForm(x||null);
 if(typeof staffModal!=='undefined'&&staffModal)staffModal.classList.remove('hidden');
 setTimeout(()=>resetUnsavedGuard(staffForm),60);
 // setTimeout(()=>{try{staffName.focus()}catch(_e){}},80);
}
async function closeStaffModal(force=false){
 if(!force){
  const changed=unsavedChangedScopes().some(sc=>sc===staffForm||staffForm.contains(sc));
  if(changed&&!await confirmDiscardUnsavedChangesAsync())return;
 }
 if(typeof staffModal!=='undefined'&&staffModal)staffModal.classList.add('hidden');
 resetSt();
 clearUnsavedGuardDirtyFast();
 setTimeout(()=>resetUnsavedGuardForVisible(),30);
}
if(typeof staffWorkerAccess!=='undefined'&&staffWorkerAccess)staffWorkerAccess.onchange=updateStaffWorkerPinVisibility;
if(typeof addStaffBtn!=='undefined'&&addStaffBtn)addStaffBtn.onclick=async()=>{if(await confirmDiscardUnsavedChangesAsync()){openStaffModal(null)}};
if(typeof staffModalClose!=='undefined'&&staffModalClose)staffModalClose.onclick=()=>closeStaffModal(false);
if(typeof staffModal!=='undefined'&&staffModal)staffModal.addEventListener('mousedown',e=>{if(e.target===staffModal)closeStaffModal(false)});
if(typeof resetStaff!=='undefined'&&resetStaff)resetStaff.onclick=()=>closeStaffModal(true);
let staffSaveInProgress=false;
staffForm.onsubmit=async e=>{
 e.preventDefault();
 if(staffSaveInProgress)return;
 staffSaveInProgress=true;
 const submitBtn=staffForm.querySelector('button[type="submit"]');
 const oldSubmitText=submitBtn?submitBtn.textContent:'';
 const loadingDone = window.AppLoading ? window.AppLoading.begin('Čuvam radnika...', {immediate:true}) : null;
 if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Čuvam...'}
 try{
  await ensureOwnerLocationsLoaded();
  let id=staffId.value,p={name:staffName.value,title:staffTitle.value,phone:collectStaffPhones(),email:staffEmail.value,sort_order:+staffSort.value,active:staffActive.checked,worker_access:(typeof staffWorkerAccess!=='undefined'&&staffWorkerAccess)?staffWorkerAccess.checked:false,worker_pin:(typeof staffWorkerPin!=='undefined'&&staffWorkerPin)?staffWorkerPin.value:'',location_ids:collectLocationChecks('staffLocationsBox'),location_schedule:collectStaffLocationSchedule()};
  await api(id?'/api/owner/staff/'+id:'/api/owner/staff',{method:id?'PUT':'POST',body:JSON.stringify(p)});
  msg('Radnik sačuvan.','ok');
  markOwnerTabsStale('staff','appointments','bookinglink','dash');
  markManualOptionsStale();
  await closeStaffModal(true);
  await loadStaff();
  ownerMarkTabLoaded('staff');
 }catch(err){
  msg(err.message||'Radnik nije sačuvan.','err');
 }finally{
  staffSaveInProgress=false;
  if(loadingDone)loadingDone();
  if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=oldSubmitText||'Sačuvaj radnika'}
 }
};
async function loadStaff(){
 await ensureOwnerLocationsLoaded();
 let rows=await api('/api/owner/staff');
 if(typeof staffModal==='undefined'||!staffModal||staffModal.classList.contains('hidden')){
  renderLocationChecks('staffLocationsBox',selectedActiveLocationIds());
  renderStaffLocationScheduleBox([],selectedActiveLocationIds());
 }
 staffList.innerHTML=rows.length?rows.map(x=>`<article class="item"><h3>${htmlEsc(x.name)}</h3><p>${htmlEsc(x.title||'')} ${htmlEsc(staffPhoneListText(x.phone))}</p><p class="muted">Lokacije: ${htmlEsc(itemLocationText(x))}</p><p class="muted">Raspored: ${htmlEsc(staffScheduleText(x))}</p><div class="badges"><span>${x.active?'Aktivan':'Ugašen'}</span><span>${x.worker_access?'Ima radnički pristup':'Bez pristupa telefonom'}</span></div><div class="actions"><button class="btn small ghost staff-edit-v136" data-id="${x.id}" type="button">Izmeni</button><button class="btn small staff-qr-v136" data-id="${x.id}" type="button" ${x.worker_access?'':'disabled'}>QR za radnika</button><button class="btn small ghost staff-delete-v157" data-id="${x.id}" type="button">Ukloni</button></div></article>`).join(''):'<p class="muted">Nema dodatih radnika. Klikni + Dodaj radnika.</p>';
 staffList.querySelectorAll('.staff-edit-v136').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);openStaffModal(x)});
 staffList.querySelectorAll('.staff-qr-v136').forEach(b=>b.onclick=()=>showWorkerQr(b.dataset.id));
 staffList.querySelectorAll('.staff-delete-v157').forEach(b=>b.onclick=()=>deleteStaff(b.dataset.id,rows.find(r=>r.id==b.dataset.id)));
}
async function deleteStaff(id,x){
 if(!id)return;
 const name=x&&x.name?x.name:'ovog radnika';
 if(!confirm('Ukloniti radnika „'+name+'”? Radnik se više neće prikazivati mušterijama i izgubiće radnički pristup.'))return;
 try{
  await api('/api/owner/staff/'+encodeURIComponent(id),{method:'DELETE'});
  msg('Radnik uklonjen.','ok');
  markOwnerTabsStale('staff','appointments','bookinglink','dash');
  markManualOptionsStale();
  await loadStaff();
  ownerMarkTabLoaded('staff');
 }catch(e){msg(e.message||'Radnik nije uklonjen.','err')}
}

function closeWorkerQr(){document.getElementById('workerQrModal')?.classList.add('hidden')}
async function showWorkerQr(id){
 const m=document.getElementById('workerQrModal'),img=document.getElementById('workerQrImg'),url=document.getElementById('workerQrUrl'),open=document.getElementById('workerQrOpen'),title=document.getElementById('workerQrTitle'),out=document.getElementById('workerQrMsg');
 if(!m)return;
 if(out){out.textContent='Učitavam QR...';out.className='msg'}
 m.classList.remove('hidden');
 try{
  const d=await api('/api/owner/staff/'+encodeURIComponent(id)+'/access-qr');
  if(title)title.textContent='QR za radnika: '+(d.staff&&d.staff.name?d.staff.name:'');
  if(img)img.src=d.qr;
  if(url)url.value=d.worker_url;
  if(open)open.href=d.worker_url;
  if(out){out.textContent='Radnik skenira QR i unosi svoj PIN.';out.className='msg ok'}
 }catch(e){if(out){out.textContent=e.message||'Ne mogu da učitam QR.';out.className='msg err'}}
}
if(typeof workerQrClose!=='undefined'&&workerQrClose)workerQrClose.onclick=closeWorkerQr;
if(typeof workerQrModal!=='undefined'&&workerQrModal)workerQrModal.addEventListener('mousedown',e=>{if(e.target===workerQrModal)closeWorkerQr()});
if(typeof workerQrCopy!=='undefined'&&workerQrCopy)workerQrCopy.onclick=async()=>{try{await navigator.clipboard.writeText(workerQrUrl.value);workerQrMsg.textContent='Link je kopiran.';workerQrMsg.className='msg ok'}catch(e){workerQrUrl.select();document.execCommand('copy');workerQrMsg.textContent='Link je kopiran.';workerQrMsg.className='msg ok'}};

let workScheduleStaffRows=[];
function renderWorkScheduleForStaff(staffObj){
 const box=document.getElementById('workScheduleRows');
 if(!box)return;
 const locs=(ownerLocationsCache||[]).filter(l=>l&&l.active!==0);
 if(!locs.length){box.innerHTML='<p class="muted">Prvo dodaj lokaciju u Profil firme.</p>';return;}
 if(!staffObj){box.innerHTML='<p class="muted">Izaberi radnika.</p>';return;}
 const allowedIds=(Array.isArray(staffObj.location_ids)&&staffObj.location_ids.length?staffObj.location_ids:locs.map(l=>l.id)).map(String);
 const allowedLocs=locs.filter(l=>allowedIds.includes(String(l.id)));
 const rows=normalizedStaffSchedule(staffObj.location_schedule||[],allowedIds);
 box.innerHTML=rows.map(r=>`<div class="staff-schedule-day-v125 work-schedule-day-v126" data-day="${r.day}">
    <b>${day[r.day]}</b>
    <label>Lokacija<select class="work-schedule-location-v126"><option value="">Ne radi</option>${allowedLocs.map(l=>`<option value="${htmlEsc(l.id)}" ${String(r.location_id)===String(l.id)?'selected':''}>${htmlEsc(l.name||l.city||'Lokacija')}</option>`).join('')}</select></label>
    <label>Od<input class="work-schedule-start-v126" type="time" value="${htmlEsc(r.start_time||'09:00')}"></label>
    <label>Do<input class="work-schedule-end-v126" type="time" value="${htmlEsc(r.end_time||'17:00')}"></label>
  </div>`).join('');
}
function collectWorkScheduleRows(){
 const box=document.getElementById('workScheduleRows');
 if(!box)return [];
 return [...box.querySelectorAll('.work-schedule-day-v126')].map(row=>{
  const lid=row.querySelector('.work-schedule-location-v126').value;
  return {day:Number(row.dataset.day),location_id:lid?Number(lid):null,is_working:!!lid,start_time:row.querySelector('.work-schedule-start-v126').value||'09:00',end_time:row.querySelector('.work-schedule-end-v126').value||'17:00'};
 });
}
async function loadWorkSchedule(){
 await ensureOwnerLocationsLoaded();
 workScheduleStaffRows=await api('/api/owner/staff');
 if(typeof workScheduleStaff==='undefined')return;
 const old=workScheduleStaff.value;
 workScheduleStaff.innerHTML=workScheduleStaffRows.map(x=>`<option value="${htmlEsc(x.id)}">${htmlEsc(x.name)}${x.title?' · '+htmlEsc(x.title):''}</option>`).join('');
 if(old && workScheduleStaffRows.some(x=>String(x.id)===String(old)))workScheduleStaff.value=old;
 const selected=workScheduleStaffRows.find(x=>String(x.id)===String(workScheduleStaff.value))||workScheduleStaffRows[0];
 if(selected)workScheduleStaff.value=String(selected.id);
 renderWorkScheduleForStaff(selected);
 if(typeof workScheduleList!=='undefined')workScheduleList.innerHTML=workScheduleStaffRows.map(x=>`<article class="item"><h3>${htmlEsc(x.name)}</h3><p class="muted">Lokacije: ${htmlEsc(itemLocationText(x))}</p><p class="muted">Raspored: ${htmlEsc(staffScheduleText(x))}</p></article>`).join('')||'<p class="muted">Nema dodatih radnika.</p>';
}
if(typeof workScheduleStaff!=='undefined')workScheduleStaff.onchange=()=>{
 const selected=workScheduleStaffRows.find(x=>String(x.id)===String(workScheduleStaff.value));
 renderWorkScheduleForStaff(selected);
};
if(typeof saveWorkSchedule!=='undefined')saveWorkSchedule.onclick=async()=>{
 if(!workScheduleStaff.value)return msg('Izaberi radnika.','err');
 await api('/api/owner/staff/'+encodeURIComponent(workScheduleStaff.value)+'/location-schedule',{method:'PUT',body:JSON.stringify({location_schedule:collectWorkScheduleRows()})});
 msg('Raspored rada je sačuvan.','ok');
 await loadWorkSchedule();
 setTimeout(()=>resetUnsavedGuard(),80);
};

async function activateTabletForLocation(locationId,locationName){
 if(!locationId)return msg('Prvo sačuvaj lokaciju.','err');
 const name=locationName||'lokaciju';
 if(!confirm('Ovaj uređaj će biti povezan sa lokacijom: '+name+'.\n\nNa radničkom ekranu će se prikazivati samo termini za tu lokaciju.'))return;
 try{
  const d=await api('/api/owner/location-devices',{method:'POST',body:JSON.stringify({location_id:locationId,device_name:'Uređaj '+name})});
  msg('Ovaj uređaj je povezan sa lokacijom '+((d.location&&d.location.name)||name)+'. Otvaram radnički ekran.','ok');
  enterTabletLockedMode(d.device_token);
 }catch(e){msg(e.message||'Ne mogu da povežem uređaj.','err')}
}
async function loadTabletMode(){
 await ensureOwnerLocationsLoaded();
 if(typeof tabletLocationSelect!=='undefined')populateLocationSelect(tabletLocationSelect,false);
 if(typeof tabletDeviceName!=='undefined' && !tabletDeviceName.value){
  const loc=(ownerLocationsCache||[]).find(l=>String(l.id)===String(tabletLocationSelect&&tabletLocationSelect.value))||(ownerLocationsCache||[])[0];
  tabletDeviceName.value='Uređaj '+(loc?(loc.name||'lokacije'):'lokacije');
 }
 await loadTabletDevices();
}
async function loadTabletDevices(){
 if(typeof tabletDevicesList==='undefined')return;
 try{
  const rows=await api('/api/owner/location-devices');
  tabletDevicesList.innerHTML=rows.length?rows.map(x=>`<article class="item tablet-device-row-v126">
    <div><h3>${htmlEsc(x.device_name||'Uređaj')}</h3><p class="muted">${htmlEsc(x.location_name||'Lokacija')} · ${x.active?'aktivan':'deaktiviran'}${x.last_seen_at?' · poslednje viđen: '+htmlEsc(x.last_seen_at):''}</p></div>
    ${x.active?`<button class="btn small danger tablet-deactivate-v126" type="button" data-id="${htmlEsc(x.id)}">Deaktiviraj</button>`:''}
  </article>`).join(''):'<p class="muted">Nema povezanih uređaja.</p>';
  tabletDevicesList.querySelectorAll('.tablet-deactivate-v126').forEach(b=>b.onclick=async()=>{await api('/api/owner/location-devices/'+encodeURIComponent(b.dataset.id),{method:'DELETE'});msg('Uređaj je deaktiviran.','ok');await loadTabletDevices();});
 }catch(e){tabletDevicesList.innerHTML='<p class="muted">Ne mogu da učitam uređaje.</p>';}
}
if(typeof activateTabletDevice!=='undefined')activateTabletDevice.onclick=async()=>{
 if(!tabletLocationSelect.value)return msg('Izaberi lokaciju.','err');
 const d=await api('/api/owner/location-devices',{method:'POST',body:JSON.stringify({location_id:tabletLocationSelect.value,device_name:tabletDeviceName.value})});
 msg('Ovaj uređaj je povezan sa lokacijom '+((d.location&&d.location.name)||'')+'. Otvaram radnički ekran.','ok');
 enterTabletLockedMode(d.device_token);
};
if(typeof tabletLocationSelect!=='undefined')tabletLocationSelect.onchange=()=>{
 const loc=(ownerLocationsCache||[]).find(l=>String(l.id)===String(tabletLocationSelect.value));
 if(typeof tabletDeviceName!=='undefined')tabletDeviceName.value='Uređaj '+(loc?(loc.name||'lokacije'):'lokacije');
};

function resetSv(){
 serviceId.value='';serviceName.value='';serviceDesc.value='';serviceDuration.value=30;servicePrice.value=1000;serviceSort.value=0;serviceActive.checked=true;renderLocationChecks('serviceLocationsBox',selectedActiveLocationIds());
}
resetService.onclick=resetSv;
serviceForm.onsubmit=async e=>{
 e.preventDefault();
 await ensureOwnerLocationsLoaded();
 let id=serviceId.value,p={name:serviceName.value,description:serviceDesc.value,duration:+serviceDuration.value,price:+servicePrice.value,sort_order:+serviceSort.value,active:serviceActive.checked,location_ids:collectLocationChecks('serviceLocationsBox')};
 await api(id?'/api/owner/services/'+id:'/api/owner/services',{method:id?'PUT':'POST',body:JSON.stringify(p)});
 msg('Usluga sačuvana.','ok');markOwnerTabsStale('services','appointments','bookinglink','dash');markManualOptionsStale();resetSv();await loadServices();ownerMarkTabLoaded('services');setTimeout(()=>resetUnsavedGuard(serviceForm),80)
};
async function loadServices(){
 await ensureOwnerLocationsLoaded();
 let rows=await api('/api/owner/services');
 renderLocationChecks('serviceLocationsBox',selectedActiveLocationIds());
 serviceList.innerHTML=rows.map(x=>`<article class="item"><h3>${htmlEsc(x.name)}</h3><p>${x.duration} min · ${x.price} RSD</p><p class="muted">Lokacije: ${htmlEsc(itemLocationText(x))}</p><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');
 serviceList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);serviceId.value=x.id;serviceName.value=x.name;serviceDesc.value=x.description||'';serviceDuration.value=x.duration;servicePrice.value=x.price;serviceSort.value=x.sort_order;serviceActive.checked=!!x.active;renderLocationChecks('serviceLocationsBox',x.location_ids||selectedActiveLocationIds())})
}
let selectedHoursLocationId='', locationHoursCache=[], locationBlockedCache=[];
function normalizeHoursRows(rows){
 const byDay={};
 (rows||[]).forEach(r=>{byDay[Number(r.day)]=r});
 return [0,1,2,3,4,5,6].map(d=>byDay[d]||{day:d,is_open:0,open_time:'09:00',close_time:'17:00',break_start:'',break_end:''});
}
function shortDayName(d){return ['Ned','Pon','Uto','Sre','Čet','Pet','Sub'][Number(d)]||''}
function hourText(h){
 if(!h||!h.is_open)return 'ne radi';
 let base=(h.open_time||'--:--')+'–'+(h.close_time||'--:--');
 if(h.break_start&&h.break_end)base+=' pauza '+h.break_start+'–'+h.break_end;
 return base;
}
function summarizeHours(rows){
 rows=normalizeHoursRows(rows);
 const parts=[];
 let i=0;
 while(i<rows.length){
  const txt=hourText(rows[i]);
  let j=i;
  while(j+1<rows.length && hourText(rows[j+1])===txt)j++;
  parts.push((i===j?shortDayName(i):(shortDayName(i)+'–'+shortDayName(j)))+' '+txt);
  i=j+1;
 }
 return parts.join('; ');
}
function setHoursEditorRows(rows, target){
 rows=normalizeHoursRows(rows);
 const el = target ? (typeof target==='string' ? document.getElementById(target) : target) : hoursForm;
 if(!el) return;
 el.innerHTML=rows.map(x=>`
    <div class="item hour" data-day="${x.day}">
      <b>${day[x.day]}</b>
      <label><input class="open" type="checkbox" ${x.is_open?'checked':''}> Otvoreno</label>
      <label>Otvara<input class="ot" type="time" value="${x.open_time||''}"></label>
      <label>Zatvara<input class="ct" type="time" value="${x.close_time||''}"></label>
      <label>Pauza od<input class="bs" type="time" value="${x.break_start||''}"></label>
      <label>Pauza do<input class="be" type="time" value="${x.break_end||''}"></label>
    </div>`).join('');
}
function collectHoursRows(root){
 const scope = root ? (typeof root==='string' ? document.getElementById(root) : root) : document;
 return [...(scope||document).querySelectorAll('.hour')].map(x=>({
   day:+x.dataset.day,
   is_open:x.querySelector('.open').checked,
   open_time:x.querySelector('.ot').value,
   close_time:x.querySelector('.ct').value,
   break_start:x.querySelector('.bs').value,
   break_end:x.querySelector('.be').value
 }));
}
function openLocationHoursModal(locationId){
 selectedHoursLocationId=String(locationId||'');
 const loc=locationHoursCache.find(x=>String(x.id)===String(selectedHoursLocationId));
 if(!loc) return;
 renderLocationHoursList();
 const modal=document.getElementById('locationHoursModal');
 const title=document.getElementById('locationHoursModalTitle');
 const hint=document.getElementById('locationHoursModalHint');
 const rows=document.getElementById('locationHoursModalRows');
 if(title)title.textContent='Radno vreme: '+(loc.name||'Lokacija');
 if(hint)hint.textContent='Podesi radno vreme za ovu lokaciju i klikni Sačuvaj.';
 setHoursEditorRows(loc.hours||[], rows);
 setupLocationBlockedPanel();
 if(modal){
   modal.classList.remove('hidden');
   modal.classList.add('manual-modal-open');
   document.body.classList.add('manual-modal-body-open');
   setTimeout(()=>{
    const first=modal.querySelector('input,select,textarea,button');
    if(first)try{first.focus({preventScroll:true})}catch(_e){}
   },80);
 }else{
   if(typeof hoursEditorTitle!=='undefined')hoursEditorTitle.textContent='Radno vreme: '+(loc&&loc.name?loc.name:'Lokacija');
   if(typeof hoursEditorHint!=='undefined')hoursEditorHint.textContent='Izmeni radno vreme za izabranu lokaciju i klikni Sačuvaj.';
   if(typeof saveHours!=='undefined')saveHours.textContent='Sačuvaj radno vreme lokacije';
   setHoursEditorRows(loc?loc.hours:[], hoursForm);
 }
}
async function closeLocationHoursModal(force=false){
 if(!force&&!(await confirmDiscardUnsavedChangesAsync()))return;
 const modal=document.getElementById('locationHoursModal');
 if(!modal)return;
 modal.classList.add('hidden');
 modal.classList.remove('manual-modal-open');
 document.body.classList.remove('manual-modal-body-open');
 setTimeout(()=>resetUnsavedGuard(),80);
}
function renderLocationHoursList(){
 if(typeof locationHoursList==='undefined')return;
 const singleLocation=(locationHoursCache||[]).length===1;
 if(typeof locationHoursCard!=='undefined')locationHoursCard.classList.toggle('single-location-hours-card-v120',singleLocation);
 locationHoursList.classList.toggle('single-location-hours-list-v120',singleLocation);
 const help=document.getElementById('locationHoursHelp');
 if(help)help.textContent=singleLocation
  ? 'Ovo je lokacija firme. Klikni Izmeni u pravougaoniku da podesiš radno vreme te lokacije.'
  : 'Ako imaš dodate lokacije, ovde se vidi radno vreme za svaku lokaciju. Klikni Izmeni pored lokacije da promeniš radno vreme.';
 if(!locationHoursCache.length){
  locationHoursList.innerHTML='<p class="muted">Nema dodatih lokacija.</p>';
  return;
 }
 locationHoursList.innerHTML=locationHoursCache.map((l,idx)=>{
  const selected=String(l.id)===String(selectedHoursLocationId);
  const where=[l.city,l.address].map(x=>String(x||'').trim()).filter(Boolean).join(' · ');
  const classes=['item','location-hours-row'];
  if(selected)classes.push('selected-location-hours');
  if(singleLocation)classes.push('single-location-hours-row-v120');
  return `<article class="${classes.join(' ')}" data-id="${htmlEsc(l.id)}">
    <div class="location-hours-main-v120">
      <h3>${htmlEsc(l.name||('Lokacija '+(idx+1)))}</h3>
      <p class="muted">${htmlEsc(where||'Grad i adresa nisu uneti')}</p>
    </div>
    <p class="muted location-hours-summary">${htmlEsc(summarizeHours(l.hours||[]))}</p>
    <button class="btn small ghost edit-location-hours" type="button" data-id="${htmlEsc(l.id)}">Izmeni</button>
  </article>`;
 }).join('');
 locationHoursList.querySelectorAll('.edit-location-hours').forEach(btn=>btn.onclick=async()=>{
  openLocationHoursModal(btn.dataset.id);
 });
}


function locationModeHasMultiple(){
 return (locationHoursCache||[]).length>1;
}
function showMainBlockedCard(){
 if(typeof blockedCard==='undefined')return;
 const hasLocations=(locationHoursCache||[]).length>0;
 blockedCard.classList.toggle('hidden',hasLocations);
}
function setupLocationBlockedPanel(){
 const section=document.getElementById('locationBlockedSection');
 if(!section)return;
 const hasLocation=!!selectedHoursLocationId;
 section.classList.toggle('hidden',!hasLocation);
 if(!hasLocation){
  locationBlockedCache=[];
  if(typeof locationBlockedList!=='undefined')locationBlockedList.innerHTML='';
  return;
 }
 if(typeof locationBlockedDate!=='undefined' && !locationBlockedDate.value)locationBlockedDate.value=today();
 loadLocationBlocked().catch(e=>msg(e.message,'err'));
}
async function loadLocationBlocked(){
 if(!selectedHoursLocationId || typeof locationBlockedList==='undefined')return;
 locationBlockedCache=await api('/api/owner/blocked-dates?location_id='+encodeURIComponent(selectedHoursLocationId));
 locationBlockedList.innerHTML=locationBlockedCache.length ? locationBlockedCache.map(x=>{
  let time=x.start_time&&x.end_time?`${x.start_time}–${x.end_time}`:'Ceo dan';
  let key=encodeURIComponent(x.key||x.id||x.date);
  let scope=x.scope==='global'?'<span class="location-blocked-scope-v119">sve lokacije</span>':'';
  return `<article class="item location-blocked-row-v119">
    <div>
      <b>${htmlEsc(x.date)} · ${htmlEsc(time)} ${scope}</b>
      <p>${htmlEsc(x.reason||'')}</p>
    </div>
    <button data-key="${key}" class="btn small danger" type="button">Obriši</button>
  </article>`;
 }).join('') : '<p class="muted">Nema dodatih neradnih dana ili zauzetih perioda za ovu lokaciju.</p>';
 locationBlockedList.querySelectorAll('button').forEach(b=>b.onclick=async()=>{
  await api('/api/owner/blocked-dates/'+b.dataset.key,{method:'DELETE'});
  await loadLocationBlocked();
  msg('Neradno vreme je obrisano.','ok');
 });
}
async function addLocationBlockedPeriod(){
 if(!selectedHoursLocationId)return;
 await api('/api/owner/blocked-dates',{
  method:'POST',
  body:JSON.stringify({
   location_id:selectedHoursLocationId,
   date:locationBlockedDate.value,
   start_time:locationBlockedStart.value,
   end_time:locationBlockedEnd.value,
   reason:locationBlockedReason.value
  })
 });
 msg('Neradni dan/period je dodat za lokaciju.','ok');
 locationBlockedStart.value='';locationBlockedEnd.value='';locationBlockedReason.value='';
 await loadLocationBlocked();
}

async function loadHours(){
  try{
    locationHoursCache=await api('/api/owner/location-working-hours');
  }catch(_e){
    locationHoursCache=[];
  }
  if(typeof locationHoursCard!=='undefined'){
    locationHoursCard.classList.toggle('hidden',!locationHoursCache.length);
    locationHoursCard.classList.toggle('single-location-hours-card-v120',(locationHoursCache||[]).length===1);
  }
  if(typeof locationHoursList!=='undefined')locationHoursList.classList.toggle('single-location-hours-list-v120',(locationHoursCache||[]).length===1);
  showMainBlockedCard();
  if(locationHoursCache.length){
    if(!selectedHoursLocationId || !locationHoursCache.some(x=>String(x.id)===String(selectedHoursLocationId)))selectedHoursLocationId=String(locationHoursCache[0].id);
    renderLocationHoursList();
    if(typeof hoursEditorCard!=='undefined')hoursEditorCard.classList.add('hidden');
  }else{
    closeLocationHoursModal(true);
    selectedHoursLocationId='';
    if(typeof hoursEditorCard!=='undefined')hoursEditorCard.classList.remove('hidden');
    let rows=await api('/api/owner/working-hours');
    if(typeof hoursEditorTitle!=='undefined')hoursEditorTitle.textContent='Redovno radno vreme i pauze';
    if(typeof hoursEditorHint!=='undefined')hoursEditorHint.textContent='Za svaki dan možeš uneti vreme rada i pauzu, npr. 12:00–13:00.';
    if(typeof saveHours!=='undefined')saveHours.textContent='Sačuvaj radno vreme';
    setHoursEditorRows(rows, hoursForm);
  }
  if(!locationHoursCache.length)await loadBlocked();
}


if(typeof saveHours!=='undefined')saveHours.onclick=async()=>{
  let rows=collectHoursRows(hoursForm);
  if(selectedHoursLocationId){
    await api('/api/owner/location-working-hours/'+encodeURIComponent(selectedHoursLocationId),{method:'PUT',body:JSON.stringify({rows})});
    msg('Radno vreme lokacije je sačuvano.','ok');
    await loadHours();
  }else{
    await api('/api/owner/working-hours',{method:'PUT',body:JSON.stringify({rows})});
    msg('Radno vreme je sačuvano.','ok');
  }
  setTimeout(()=>resetUnsavedGuard(hoursForm),80);
};

(function(){
 function onceReady(fn){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
  else fn();
 }
 function installLocationHoursModal(){
  const modal=document.getElementById('locationHoursModal');
  const form=document.getElementById('locationHoursModalForm');
  const close=document.getElementById('closeLocationHoursModal');
  const cancel=document.getElementById('cancelLocationHoursModal');
  if(!modal || modal.dataset.ready)return;
  modal.dataset.ready='1';
  if(close)close.addEventListener('click', ev=>{ev.preventDefault();closeLocationHoursModal();});
  if(cancel)cancel.addEventListener('click', ev=>{ev.preventDefault();closeLocationHoursModal();});
  if(typeof addLocationBlocked!=='undefined')addLocationBlocked.addEventListener('click', ev=>{ev.preventDefault();addLocationBlockedPeriod().catch(e=>msg(e.message,'err'));});
  modal.addEventListener('mousedown', ev=>{if(ev.target===modal)closeLocationHoursModal();});
  if(form)form.addEventListener('submit', async ev=>{
    ev.preventDefault();
    if(!selectedHoursLocationId)return;
    const rows=collectHoursRows(form);
    await api('/api/owner/location-working-hours/'+encodeURIComponent(selectedHoursLocationId),{method:'PUT',body:JSON.stringify({rows})});
    msg('Radno vreme lokacije je sačuvano.','ok');
    resetUnsavedGuard();
    closeLocationHoursModal(true);
    await loadHours();
  });
 }
 onceReady(installLocationHoursModal);
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const m=document.getElementById('locationHoursModal');if(m&&!m.classList.contains('hidden'))closeLocationHoursModal();}});
})();

blockedForm.onsubmit=async e=>{
  e.preventDefault();
  await api('/api/owner/blocked-dates',{
    method:'POST',
    body:JSON.stringify({
      date:blockedDate.value,
      start_time:blockedStart.value,
      end_time:blockedEnd.value,
      reason:blockedReason.value
    })
  });
  msg('Neradni dan/period je dodat.','ok');
  blockedStart.value='';blockedEnd.value='';blockedReason.value='';
  markOwnerTabsStale('hours','appointments','dash');
  await loadBlocked();
  ownerMarkTabLoaded('hours');
  setTimeout(()=>resetUnsavedGuard(blockedForm),80);
};

async function loadBlocked(){
  let rows=await api('/api/owner/blocked-dates');
  blockedList.innerHTML=rows.length ? rows.map(x=>{
    let time = x.start_time && x.end_time ? `${x.start_time}–${x.end_time}` : 'Ceo dan';
    let key = encodeURIComponent(x.key || x.id || x.date);
    return `<article class="item">
      <b>${htmlEsc(x.date)} · ${htmlEsc(time)}</b>
      <p>${htmlEsc(x.reason||'')}</p>
      <button data-key="${key}" class="btn small danger">Obriši</button>
    </article>`;
  }).join('') : '<p class="muted">Nema dodatih neradnih dana ili zauzetih perioda.</p>';

  blockedList.querySelectorAll('button').forEach(b=>b.onclick=async()=>{
    await api('/api/owner/blocked-dates/'+b.dataset.key,{method:'DELETE'});
    loadBlocked();
  });
}

async function loadSettings(){
 let d=await api('/api/owner/settings'),b=d.business,s=d.settings||{};
 try{ await ensureOwnerLocationsLoaded(); }catch(_e){}
 profileLocationsMode=((ownerLocationsCache||[]).length>1)?'all':'primary';
 const firstLoc=(ownerLocationsCache&&ownerLocationsCache[0])?ownerLocationsCache[0]:{};
 const hasOwnerLocation=(ownerLocationsCache||[]).length>0;
 setName.value=b.name||'';
 setType.value=b.type||'';
 // Lokacije su glavni izvor za grad/adresu/telefon.
 // Ako je ranije obrisana primarna lokacija, ne smeju ostati stari podaci iz tabele firme.
 setCity.value=hasOwnerLocation?(firstLoc.city||b.city||''):(b.city||'');
 setPhone.value=hasOwnerLocation?(firstLoc.phone||b.phone||''):(b.phone||'');
 renderBusinessPhones(setPhone.value);
 setInstagram.value=b.instagram||'';
 setAddress.value=hasOwnerLocation?(firstLoc.address||b.address||''):(b.address||'');
 setWebsite.value=b.website||'';
 setDesc.value=b.description||'';
 setInterval.value=s.interval||15;setMin.value=s.min_notice||2;setMax.value=s.max_days||45;
 nCust.checked=!!s.notify_customer_email;nOwner.checked=!!s.notify_owner_email;nSms.checked=!!s.notify_sms;nViber.checked=!!s.notify_viber;
 if(typeof setMsgBooking!=='undefined')setMsgBooking.value=s.msg_booking||'Hvala, vaš termin je uspešno zakazan.';
 if(typeof setMsgCancel!=='undefined')setMsgCancel.value=s.msg_cancel||'Vaš termin je otkazan.';
 if(typeof setCustomerNote!=='undefined')setCustomerNote.value=s.customer_note||'Molimo vas da dođete 5 minuta ranije.';
 renderProfileExtraLocations();
 refreshProfileAddLocationButton();
 rememberProfileLocationSnapshot();
}
async function saveSettingsFormFast(){
 const loadingDone = window.AppLoading ? window.AppLoading.begin('Čuvam podešavanja...', {immediate:true}) : null;
 try{
 const mustSaveLocations=profileLocationNeedsSave() || ownerHasWrittenLocation() || profileUsingFullLocations();
 await api('/api/owner/settings',{method:'PUT',body:JSON.stringify({
  name:setName.value,type:setType.value,city:setCity.value,phone:syncBusinessPhones(),
  instagram:setInstagram.value,address:setAddress.value,website:setWebsite.value,description:setDesc.value,
  interval:+setInterval.value,min_notice:+setMin.value,max_days:+setMax.value,
  notify_customer_email:nCust.checked,notify_owner_email:nOwner.checked,notify_sms:nSms.checked,notify_viber:nViber.checked,
  msg_booking:typeof setMsgBooking!=='undefined'?setMsgBooking.value:undefined,
  msg_cancel:typeof setMsgCancel!=='undefined'?setMsgCancel.value:undefined,
  customer_note:typeof setCustomerNote!=='undefined'?setCustomerNote.value:undefined
 })});
 if(mustSaveLocations){
  await saveProfileLocations(true);
  markManualOptionsStale();
  markOwnerTabsStale('settings','bookinglink','appointments','staff','services','hours','dash');
 }else{
  rememberProfileLocationSnapshot();
  markOwnerTabsStale('settings','bookinglink','dash');
 }
 ownerMarkTabLoaded('settings');
 if(typeof bookinglink!=='undefined' && bookinglink && !bookinglink.classList.contains('hidden')) setTimeout(()=>{try{loadBookingLink(false);ownerMarkTabLoaded('bookinglink')}catch(_e){}},0);
 msg('Podešavanja sačuvana.','ok');
 resetUnsavedGuard();
 return true;
 }finally{if(loadingDone)loadingDone();}
}
settingsForm.onsubmit=async e=>{e.preventDefault();await saveSettingsFormFast();};async function loadLogs(){let rows=await api('/api/owner/notifications');logList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.channel} · ${x.status}</h3><p>${x.created_at} · ${x.recipient||''}</p><p class="muted">${(x.body||'').slice(0,220)}</p></article>`).join('')||'<p class="muted">Nema logova.</p>'}

function htmlEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ownerPhoneParts(value){
 return splitOwnerPhoneRows(value,10);
}

function ownerPhonePartsLimited(value,max=10){
 return splitOwnerPhoneRows(value,max);
}
function collectMultiPhonesBox(boxId,max=10){
 const box=document.getElementById(boxId);
 if(!box)return '';
 return [...box.querySelectorAll('.multi-phone-input-v159')]
  .map(i=>i.value.trim())
  .filter(Boolean)
  .slice(0,max)
  .join('\n');
}
function getMultiPhoneScrollContainerV181(input){
 try{
  return input?.closest('.location-modal-form-v115') || document.scrollingElement || document.documentElement || document.body;
 }catch(_e){
  return document.scrollingElement || document.documentElement || document.body;
 }
}
function syncMultiPhonesUi(boxId,max=10){
 const box=document.getElementById(boxId);
 if(!box)return;
 const rows=[...box.querySelectorAll('.multi-phone-row-v159')];
 const addBtn=box.querySelector('.multi-add-phone-v159');
 const anyFilled=rows.some(row=>{
  const input=row.querySelector('.multi-phone-input-v159');
  return input && input.value.trim();
 });
 if(addBtn)addBtn.classList.toggle('hidden',!anyFilled || rows.length>=max);
 rows.forEach(row=>{
  const input=row.querySelector('.multi-phone-input-v159');
  const remove=row.querySelector('.multi-phone-remove-v159');
  if(!input||!remove)return;
  const shouldShow=rows.length>1 || !!input.value.trim();
  remove.classList.toggle('hidden',!shouldShow);
  remove.disabled=!shouldShow;
 });
}
function syncMultiPhonesBox(boxId,hiddenId,max=10){
 const hidden=document.getElementById(hiddenId);
 if(hidden)hidden.value=collectMultiPhonesBox(boxId,max);
 syncMultiPhonesUi(boxId,max);
 return hidden?hidden.value:'';
}
function refreshMultiPhonesAddButton(boxId,max=10){
 syncMultiPhonesUi(boxId,max);
}
function clearMultiPhoneFixedCenterV181(){
 try{
  const scroller=document.querySelector('.location-modal-form-v115[data-multi-phone-lock-active-v181="1"]') || getMultiPhoneScrollContainerV181(document.activeElement);
  if(scroller){
   delete scroller.dataset.multiPhoneLockScrollTopV181;
   delete scroller.dataset.multiPhoneLockActiveV181;
  }
 }catch(_e){}
}
function applyMultiPhoneLockedScrollV181(input){
 try{
  const scroller=getMultiPhoneScrollContainerV181(input || document.activeElement);
  if(!scroller || scroller.dataset.multiPhoneLockActiveV181!=='1')return;
  const top=Number(scroller.dataset.multiPhoneLockScrollTopV181||'');
  if(Number.isFinite(top))scroller.scrollTop=top;
 }catch(_e){}
}
function centerMultiPhoneInputOnScreenV181(input, force=false){
 try{
  if(!input)return;
  const row=input.closest('.multi-phone-row-v159') || input;
  const scroller=getMultiPhoneScrollContainerV181(input);
  if(!row || !scroller)return;
  const doCenter=()=>{
    try{
      const vv=window.visualViewport;
      const viewportTop=vv?vv.offsetTop:0;
      const viewportHeight=vv?vv.height:window.innerHeight;
      const wantedCenter=viewportTop+(viewportHeight*0.50);
      const rect=row.getBoundingClientRect();
      const rowCenter=rect.top+(rect.height/2);
      const delta=rowCenter-wantedCenter;
      scroller.scrollTop += delta;
      scroller.dataset.multiPhoneLockScrollTopV181=String(scroller.scrollTop);
      scroller.dataset.multiPhoneLockActiveV181='1';
    }catch(_e){
      try{
        row.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
        scroller.dataset.multiPhoneLockScrollTopV181=String(scroller.scrollTop);
        scroller.dataset.multiPhoneLockActiveV181='1';
      }catch(_e2){}
    }
  };
  if(force || scroller.dataset.multiPhoneLockActiveV181!=='1'){
    doCenter();
    clearTimeout(window.__multiPhoneCenterTimerV181);
    window.__multiPhoneCenterTimerV181=setTimeout(doCenter,80);
    setTimeout(doCenter,220);
  }else{
    applyMultiPhoneLockedScrollV181(input);
  }
 }catch(_e){}
}
function keepMultiPhoneLockedAfterTypingV181(input){
 try{
  applyMultiPhoneLockedScrollV181(input);
  requestAnimationFrame(()=>applyMultiPhoneLockedScrollV181(input));
  clearTimeout(window.__multiPhoneLockRestoreTimerV181);
  window.__multiPhoneLockRestoreTimerV181=setTimeout(()=>applyMultiPhoneLockedScrollV181(input),40);
  setTimeout(()=>applyMultiPhoneLockedScrollV181(input),120);
 }catch(_e){}
}
function scheduleMultiPhoneCenterAfterKeyboardV181(input){
 try{
  if(!input)return;
  centerMultiPhoneInputOnScreenV181(input,true);
  clearTimeout(window.__multiPhoneKeyboardCenterTimer1V181);
  clearTimeout(window.__multiPhoneKeyboardCenterTimer2V181);
  clearTimeout(window.__multiPhoneKeyboardCenterTimer3V181);
  clearTimeout(window.__multiPhoneKeyboardCenterTimer4V181);
  window.__multiPhoneKeyboardCenterTimer1V181=setTimeout(()=>centerMultiPhoneInputOnScreenV181(input,true),120);
  window.__multiPhoneKeyboardCenterTimer2V181=setTimeout(()=>centerMultiPhoneInputOnScreenV181(input,true),300);
  window.__multiPhoneKeyboardCenterTimer3V181=setTimeout(()=>centerMultiPhoneInputOnScreenV181(input,true),550);
  window.__multiPhoneKeyboardCenterTimer4V181=setTimeout(()=>centerMultiPhoneInputOnScreenV181(input,true),850);
 }catch(_e){}
}
(function installMultiPhoneViewportCenterV181(){
 try{
  if(window.__multiPhoneViewportCenterInstalledV181)return;
  window.__multiPhoneViewportCenterInstalledV181=true;
  const handler=()=>{
    const active=document.activeElement;
    if(active && active.classList && active.classList.contains('multi-phone-input-v159')){
      scheduleMultiPhoneCenterAfterKeyboardV181(active);
    }
  };
  if(window.visualViewport)window.visualViewport.addEventListener('resize',handler);
  window.addEventListener('resize',handler);
 }catch(_e){}
})();
function addMultiPhoneField(boxId,hiddenId,max=10,value='',placeholder='Broj telefona',scopeEl=null){
 const box=document.getElementById(boxId);
 if(!box)return null;
 const existing=box.querySelectorAll('.multi-phone-input-v159').length;
 if(existing>=max)return null;
 const addBtn=box.querySelector('.multi-add-phone-v159');
 const row=document.createElement('div');
 row.className='multi-phone-row-v159';
 const input=document.createElement('input');
 input.type='tel';
 input.className='multi-phone-input-v159';
 input.placeholder=placeholder || 'Broj telefona';
 input.value=value||'';
 input.addEventListener('focus',()=>scheduleMultiPhoneCenterAfterKeyboardV181(input));
 input.addEventListener('click',()=>scheduleMultiPhoneCenterAfterKeyboardV181(input));
 input.addEventListener('input',()=>{
  const addBtnBefore=box.querySelector('.multi-add-phone-v159');
  const wasHidden=!addBtnBefore || addBtnBefore.classList.contains('hidden');
  syncMultiPhonesBox(boxId,hiddenId,max);
  if(scopeEl)markUnsavedScope(scopeEl);
  const addBtnAfter=box.querySelector('.multi-add-phone-v159');
  const becameVisible=wasHidden && addBtnAfter && !addBtnAfter.classList.contains('hidden');
  if(becameVisible){
    centerMultiPhoneInputOnScreenV181(input,true);
    keepMultiPhoneLockedAfterTypingV181(input);
    requestAnimationFrame(()=>keepMultiPhoneLockedAfterTypingV181(input));
    setTimeout(()=>keepMultiPhoneLockedAfterTypingV181(input),30);
    setTimeout(()=>keepMultiPhoneLockedAfterTypingV181(input),90);
  }else{
    keepMultiPhoneLockedAfterTypingV181(input);
  }
 });
 input.addEventListener('blur',()=>setTimeout(()=>clearMultiPhoneFixedCenterV181(),220));
 const remove=document.createElement('button');
 remove.type='button';
 remove.className='multi-phone-remove-v159';
 remove.setAttribute('aria-label','Ukloni telefon');
 remove.title='Ukloni telefon';
 remove.textContent='×';
 remove.onclick=()=>{
  row.remove();
  if(!box.querySelector('.multi-phone-row-v159'))addMultiPhoneField(boxId,hiddenId,max,'',placeholder,scopeEl);
  syncMultiPhonesBox(boxId,hiddenId,max);
  if(scopeEl)markUnsavedScope(scopeEl);
 };
 row.appendChild(input);
 row.appendChild(remove);
 if(addBtn)box.insertBefore(row,addBtn);else box.appendChild(row);
 syncMultiPhonesBox(boxId,hiddenId,max);
 return input;
}
function renderMultiPhonesBox(boxId,hiddenId,max=10,value='',placeholder='Broj telefona',scopeEl=null){
 const box=document.getElementById(boxId);
 const hidden=document.getElementById(hiddenId);
 if(!box)return;
 box.innerHTML='';
 const phones=ownerPhonePartsLimited(value,max);
 if(hidden)hidden.value=phones.join('\n');
 if(!phones.length)phones.push('');
 phones.forEach(v=>addMultiPhoneField(boxId,hiddenId,max,v,placeholder,scopeEl));
 const add=document.createElement('button');
 add.type='button';
 add.className='multi-add-phone-v159 hidden';
 add.textContent='Dodaj još jedan telefon';
 add.onclick=(ev)=>{
  if(ev)ev.preventDefault();
  const input=addMultiPhoneField(boxId,hiddenId,max,'',placeholder,scopeEl);
  syncMultiPhonesBox(boxId,hiddenId,max);
  if(scopeEl)markUnsavedScope(scopeEl);
  if(input){
    try{ input.focus({preventScroll:true}); }catch(_e){ input.focus(); }
    scheduleMultiPhoneCenterAfterKeyboardV181(input);
    keepMultiPhoneLockedAfterTypingV181(input);
    requestAnimationFrame(()=>keepMultiPhoneLockedAfterTypingV181(input));
  }
 };
 box.appendChild(add);
 syncMultiPhonesBox(boxId,hiddenId,max);
}
function renderBusinessPhones(value=''){
 renderMultiPhonesBox('businessPhonesBox','setPhone',10,value,'Broj telefona',typeof settingsForm!=='undefined'?settingsForm:null);
}
function renderProfileModalPhones(value=''){
 renderMultiPhonesBox('profileModalPhonesBox','profileModalPhone',4,value,'Broj telefona',typeof profileLocationForm!=='undefined'?profileLocationForm:null);
}
function syncBusinessPhones(){return syncMultiPhonesBox('businessPhonesBox','setPhone',10)}
function syncProfileModalPhones(){return syncMultiPhonesBox('profileModalPhonesBox','profileModalPhone',4)}


let ownerQrObjectUrl='', ownerLocationsCache=[], profileLocationsMode='primary', profileLocationEditIndex=null, profileLocationSaving=false, ownerLocationQrEditIndex=null;
let profileLocationSaveSnapshot='';
function profileLocationSnapshot(){
 try{
  syncBusinessPhones();
  return JSON.stringify({
   mode:profileLocationsMode,
   primary:{city:(typeof setCity!=='undefined'?setCity.value:''),address:(typeof setAddress!=='undefined'?setAddress.value:''),phone:(typeof setPhone!=='undefined'?setPhone.value:'')},
   locations:profileUsingFullLocations()?collectProfileExtraLocations():[]
  });
 }catch(_e){return ''}
}
function rememberProfileLocationSnapshot(){try{profileLocationSaveSnapshot=profileLocationSnapshot()}catch(_e){}}
function profileLocationNeedsSave(){try{return profileLocationSnapshot()!==profileLocationSaveSnapshot}catch(_e){return true}}
function safeFileName(value){return String(value||'lokacija').toLowerCase().replace(/[š]/g,'s').replace(/[đ]/g,'dj').replace(/[čć]/g,'c').replace(/[ž]/g,'z').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'lokacija'}
function ownerLocationTitle(l,idx){return (l&&l.name)||('Lokacija '+((idx||0)+1))}
function ownerLocId(l){return l&&String(l.id||'').startsWith('new-')?'':(l&&l.id?String(l.id):'')}
function ownerPrimaryCityFilled(){return typeof setCity!=='undefined' && !!String(setCity.value||'').trim()}
function ownerPrimaryAddressFilled(){return typeof setAddress!=='undefined' && !!String(setAddress.value||'').trim()}
function ownerHasWrittenLocation(){
 return ownerPrimaryCityFilled() && ownerPrimaryAddressFilled();
}
function profileUsingFullLocations(){
 return profileLocationsMode==='all' || (ownerLocationsCache||[]).length>1;
}
function refreshProfileAddLocationButton(){
 const canAdd=ownerHasWrittenLocation() || profileUsingFullLocations();
 if(typeof profileExtraLocationsWrap!=='undefined')profileExtraLocationsWrap.classList.toggle('hidden', !canAdd);
 const full=profileUsingFullLocations();
 ['primaryCityField','primaryPhoneField','primaryAddressField'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.classList.toggle('primary-location-hidden', full);
 });
 if(typeof profileLocationsList!=='undefined'){
  if(full)renderProfileExtraLocations();
  else profileLocationsList.innerHTML='';
 }
}
function makeEmptyProfileLocation(idx){
 return {id:'new-'+Date.now()+'-'+idx,name:'Lokacija '+idx,city:'',address:'',phone:'',email:'',active:1,sort_order:idx,booking_url:''};
}
function ownerActiveLocationCount(){
 return (ownerLocationsCache||[]).filter(l=>l&&l.active!==0).length;
}
let ownerLocationsCacheLoadedAt=0, ownerLocationsLoadingPromise=null;
function invalidateOwnerLocationsCache(){ownerLocationsCacheLoadedAt=0;}
function refreshOwnerLocationsDependentUi(){
 refreshProfileAddLocationButton();
 refreshManualLocationSelects();
 if(typeof profileLocationsList!=='undefined')renderProfileExtraLocations();
}
async function ensureOwnerLocationsLoaded(force=false){
 if(!force && ownerLocationsCacheLoadedAt && Date.now()-ownerLocationsCacheLoadedAt<15000){
  refreshOwnerLocationsDependentUi();
  return ownerLocationsCache;
 }
 if(ownerLocationsLoadingPromise)return ownerLocationsLoadingPromise;
 ownerLocationsLoadingPromise=api('/api/owner/locations').then(rows=>{
  ownerLocationsCache=rows||[];
  ownerLocationsCacheLoadedAt=Date.now();
  refreshOwnerLocationsDependentUi();
  return ownerLocationsCache;
 }).finally(()=>{ownerLocationsLoadingPromise=null});
 return ownerLocationsLoadingPromise;
}
function ownerAuthHeaders(){
 let h={};
 if(tok())h.Authorization='Bearer '+tok();
 if(typeof tabletAdminUnlocked==='function' && tabletAdminUnlocked())h['X-Tablet-Admin-Unlocked']='1';
 return h;
}
async function fetchOwnerQrDataUrl(locationId=''){
 let h=ownerAuthHeaders();
 let url='/api/owner/qr';
 if(locationId)url+='?location_id='+encodeURIComponent(locationId);
 let r=await fetch(url,{headers:h});
 if(!r.ok)throw Error('Ne mogu da učitam QR kod.');
 let svg=await r.text();
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function ownerIsAndroidWebViewV186(){
 try{
  const ua=navigator.userAgent||'';
  return !!(window.terminiIsNativeApp || (window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()) || (/Android/i.test(ua)&&/wv/i.test(ua)));
 }catch(_e){return false}
}
function ownerOpenBlobSafeV186(url,isPdf,title='Fajl'){
 try{
  if(isPdf && ownerIsAndroidWebViewV186()){
    const w=window.open(url,'_system') || window.open(url,'_blank');
    if(!w){
      msg('Android ne može uvek da otvori PDF pregled u aplikaciji. Klikni Preuzmi, pa otvori fajl iz telefona.', 'ok');
    }else{
      msg('PDF je poslat na otvaranje.', 'ok');
    }
    return;
  }
  const w=window.open(url,'_blank');
  if(!w){
    try{location.href=url}catch(_e){}
    msg('Ako se fajl ne otvori, klikni Preuzmi.', 'ok');
  }
 }catch(e){msg(e.message||'Ne mogu da otvorim fajl.','err')}
}
function showOwnerFileOptionsV185(blob, filename, title, options={}){
 try{
  const kind=options.kind || (String(filename||'').toLowerCase().endsWith('.pdf')?'pdf':'file');
  const isPdf=kind==='pdf' || (blob && blob.type==='application/pdf');
  const isAndroid=ownerIsAndroidWebViewV186();
  const url=URL.createObjectURL(blob);

  try{document.getElementById('ownerFileOptionsModalV185')?.remove()}catch(_e){}

  const modal=document.createElement('div');
  modal.id='ownerFileOptionsModalV185';
  modal.className='owner-file-options-modal-v185';
  modal.innerHTML=`
    <div class="owner-file-options-box-v185">
      <div class="owner-file-options-head-v185">
        <div>
          <p class="eyebrow">QR / PDF</p>
          <h3>${htmlEsc(title||'Fajl je spreman')}</h3>
        </div>
        <button type="button" class="owner-file-options-close-v185" aria-label="Zatvori">×</button>
      </div>
      <p class="muted owner-file-options-note-v185">
        Fajl je napravljen. Izaberi šta želiš da uradiš.
      </p>
      <div class="owner-file-options-preview-v185 ${isPdf&&isAndroid?'owner-file-options-preview-fallback-v186':''}">
        ${
          isPdf && isAndroid
            ? `<div class="owner-pdf-fallback-v186">
                 <strong>PDF je spreman</strong>
                 <span>${htmlEsc(filename||'pdf-fajl.pdf')}</span>
                 <p>Android WebView često ne prikazuje PDF unutar aplikacije, zato ovaj prostor više neće ostati prazan. Koristi dugmad ispod za otvaranje, preuzimanje ili štampu.</p>
               </div>`
            : isPdf
              ? `<iframe title="PDF pregled" src="${url}#toolbar=1&navpanes=0"></iframe>`
              : `<img alt="QR kod" src="${url}">`
        }
      </div>
      <div class="owner-file-options-actions-v185">
        <button type="button" class="btn ghost owner-file-open-v185">Otvori</button>
        <button type="button" class="btn ghost owner-file-download-v185">Preuzmi</button>
        <button type="button" class="btn owner-file-print-v185">Štampaj</button>
      </div>
    </div>`;

  const cleanup=()=>{
    try{modal.remove()}catch(_e){}
    setTimeout(()=>{try{URL.revokeObjectURL(url)}catch(_e){}},60000);
  };

  modal.querySelector('.owner-file-options-close-v185').onclick=cleanup;
  modal.addEventListener('mousedown',ev=>{if(ev.target===modal)cleanup();});

  modal.querySelector('.owner-file-open-v185').onclick=()=>{
    ownerOpenBlobSafeV186(url,isPdf,title||filename||'Fajl');
  };

  modal.querySelector('.owner-file-download-v185').onclick=()=>{
    try{
      const a=document.createElement('a');
      a.href=url;
      a.download=filename||'termini-fajl';
      document.body.appendChild(a);
      a.click();
      a.remove();
      msg('Fajl je poslat na preuzimanje.', 'ok');
    }catch(_e){
      ownerOpenBlobSafeV186(url,isPdf,title||filename||'Fajl');
    }
  };

  modal.querySelector('.owner-file-print-v185').onclick=()=>{
    ownerPrintBlobUrlV185(url,isPdf,title||filename||'Fajl');
  };

  document.body.appendChild(modal);
  msg('Fajl je napravljen. Izaberi: Otvori, Preuzmi ili Štampaj.', 'ok');
 }catch(e){
  msg(e.message||'Ne mogu da prikažem opcije za fajl.','err');
 }
}
function ownerPrintBlobUrlV185(url,isPdf,title='Štampa'){
 try{
  if(isPdf){
    if(ownerIsAndroidWebViewV186()){
      ownerOpenBlobSafeV186(url,true,title);
      msg('Na Androidu se PDF štampa iz PDF pregledača: otvori/preuzmi fajl, pa izaberi Print/Štampaj.', 'ok');
      return;
    }
    const frame=document.createElement('iframe');
    frame.className='owner-print-frame-v185';
    frame.src=url;
    document.body.appendChild(frame);
    frame.onload=()=>{
      setTimeout(()=>{
        try{
          frame.contentWindow.focus();
          frame.contentWindow.print();
          msg('Otvoren je dijalog za štampu.', 'ok');
        }catch(_e){
          const w=window.open(url,'_blank');
          if(!w)msg('Otvori PDF pa izaberi štampu iz pregledača.', 'ok');
        }
      },500);
    };
    setTimeout(()=>{try{frame.remove()}catch(_e){}},90000);
    return;
  }

  const w=window.open('','_blank');
  if(w){
    w.document.open();
    w.document.write(`<!doctype html><html><head><title>${htmlEsc(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff}img{max-width:90vw;max-height:90vh}</style></head><body><img src="${url}" onload="setTimeout(function(){window.focus();window.print()},300)"></body></html>`);
    w.document.close();
    msg('Otvoren je QR za štampu.', 'ok');
  }else{
    msg('Pregledač nije dozvolio novi prozor. Klikni Otvori ili Preuzmi.', 'ok');
  }
 }catch(e){
  msg(e.message||'Ne mogu da otvorim štampu.','err');
 }
}
async function downloadOwnerQrCode(locationArg){
 try{
  await loadBookingLink(false);
  const loc=locationArg&&locationArg.id?locationArg:null;
  const id=ownerLocId(loc);
  let h=ownerAuthHeaders();
  let url='/api/owner/qr'+(id?'?location_id='+encodeURIComponent(id):'');
  let r=await fetch(url,{headers:h});
  if(!r.ok)throw Error('Ne mogu da preuzmem QR kod.');
  let svg=await r.text();
  const blob=new Blob([svg],{type:'image/svg+xml'});
  const filename='qr-kod-'+safeFileName(loc?loc.name:'glavni-link')+'.svg';
  showOwnerFileOptionsV185(blob, filename, 'QR kod '+(loc?ownerLocationTitle(loc,0):'glavnog linka'), {kind:'image'});
 }catch(e){msg(e.message,'err')}
}

function renderProfileExtraLocations(){
 if(typeof profileLocationsList==='undefined')return;
 if(!profileUsingFullLocations()){
  profileLocationsList.innerHTML='';
  return;
 }
 const list=(ownerLocationsCache||[]);
 profileLocationsList.innerHTML=list.map((l,idx)=>{
  const phones=ownerPhoneParts(l.phone||'').slice(0,4);
  const where=[l.city,l.address].map(x=>String(x||'').trim()).filter(Boolean).join(' · ') || 'Grad i adresa nisu uneti';
  const phoneText=phones.length?phones.join(' / '):'Telefoni nisu uneti';
  return `
  <article class="location-row-v115" data-idx="${idx}">
    <div>
      <h4>Lokacija ${idx+1}<span class="location-badge-v115">${l.active!==0?'Aktivna':'Neaktivna'}</span></h4>
      <p>${htmlEsc(where)}</p>
      <p>${htmlEsc(phoneText)}</p>
    </div>
    <div class="location-row-actions-v115">
      <button class="btn small ghost profile-loc-edit" type="button" data-idx="${idx}">Uredi</button>
      <button class="btn small profile-loc-tablet" type="button" data-idx="${idx}" ${ownerLocId(l)?'':'disabled'}>Poveži ovaj uređaj kao tablet za ovu lokaciju</button>
      <a class="btn small ghost" href="/tablet.html" target="_blank">Otvori radnički ekran</a>
      <button class="btn small danger profile-loc-delete" type="button" data-idx="${idx}">Obriši</button>
    </div>
  </article>`}).join('');
 profileLocationsList.querySelectorAll('.profile-loc-edit').forEach(btn=>btn.onclick=()=>openProfileLocationModal(Number(btn.dataset.idx)));
 profileLocationsList.querySelectorAll('.profile-loc-tablet').forEach(btn=>btn.onclick=()=>{const loc=ownerLocationsCache[Number(btn.dataset.idx)];activateTabletForLocation(ownerLocId(loc),ownerLocationTitle(loc,Number(btn.dataset.idx)));});
 profileLocationsList.querySelectorAll('.profile-loc-delete').forEach(btn=>btn.onclick=async()=>{
  const idx=Number(btn.dataset.idx),loc=ownerLocationsCache[idx];
  if(ownerLocationsCache.length<=1)return msg('Mora ostati bar jedna lokacija.','err');
  const keepFullLocationList=profileUsingFullLocations();
  if(String(loc&&loc.id||'').startsWith('new-')){
   ownerLocationsCache.splice(idx,1);
  }else{
   await api('/api/owner/locations/'+loc.id,{method:'DELETE'});
   msg('Lokacija je obrisana.','ok');
   invalidateOwnerLocationsCache();
   await ensureOwnerLocationsLoaded(true);
   await refreshTabletModeAfterLocationChange();
  }
  // Kada posle brisanja ostane samo jedna lokacija, ona postaje glavna lokacija u gornjim poljima.
  // Ne smeju ostati podaci obrisane lokacije u poljima Grad/Adresa/Telefon.
  if((ownerLocationsCache||[]).length===1){
   profileLocationsMode='primary';
   const remaining=(ownerLocationsCache&&ownerLocationsCache[0])?ownerLocationsCache[0]:{};
   if(typeof setCity!=='undefined')setCity.value=remaining.city||'';
   if(typeof setAddress!=='undefined')setAddress.value=remaining.address||'';
   if(typeof setPhone!=='undefined')setPhone.value=remaining.phone||'';
   renderBusinessPhones(typeof setPhone!=='undefined'?setPhone.value:'');
  }else if(keepFullLocationList){
   profileLocationsMode='all';
  }
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
  if(typeof ownerLocationsList!=='undefined')renderOwnerLocations();
 });
}
function collectProfileExtraLocations(){
 if(!profileUsingFullLocations())return [];
 return (ownerLocationsCache||[]).map((l,idx)=>({
  id:l.id||('new-'+(idx+1)),
  name:l.name||('Lokacija '+(idx+1)),
  city:l.city||'',
  address:l.address||'',
  phone:l.phone||'',
  email:l.email||'',
  sort_order:idx+1,
  active:l.active!==0
 }));
}
function profilePrimaryLocationFromFieldsV183(){
 syncBusinessPhones();
 const first=(ownerLocationsCache&&ownerLocationsCache[0])?ownerLocationsCache[0]:makeEmptyProfileLocation(1);
 first.name=first.name||'Lokacija 1';
 first.city=typeof setCity!=='undefined'?setCity.value:'';
 first.address=typeof setAddress!=='undefined'?setAddress.value:'';
 first.phone=typeof setPhone!=='undefined'?setPhone.value:'';
 first.active=1;
 first.sort_order=1;
 return first;
}
function ensureFullLocationModeFromPrimary(){
 syncBusinessPhones();
 if(profileUsingFullLocations())return true;
 if(!ownerHasWrittenLocation())return false;
 const first=profilePrimaryLocationFromFieldsV183();
 ownerLocationsCache=[first];
 profileLocationsMode='all';
 refreshProfileAddLocationButton();
 renderProfileExtraLocations();
 return true;
}
function forceProfileLocationListModeV183(){
 // Kada se dodaje druga lokacija, grad/adresa/telefoni iz glavnih polja moraju da pređu u Lokaciju 1,
 // a nova lokacija onda postaje Lokacija 2. Glavna polja se odmah sakrivaju.
 if(profileUsingFullLocations())return true;
 return ensureFullLocationModeFromPrimary();
}
function openProfileLocationModal(idx=null){
 if(!profileUsingFullLocations()){
  if(!ensureFullLocationModeFromPrimary())return msg('Prvo upiši Grad i Adresu za prvu lokaciju.','err');
 }
 profileLocationEditIndex=idx;
 const loc=idx===null?makeEmptyProfileLocation((ownerLocationsCache||[]).length+1):(ownerLocationsCache[idx]||makeEmptyProfileLocation(idx+1));
 if(typeof profileLocationModalTitle!=='undefined')profileLocationModalTitle.textContent=idx===null?'Dodaj lokaciju':'Uredi lokaciju '+(idx+1);
 if(typeof profileModalSaveBtn!=='undefined')profileModalSaveBtn.textContent=idx===null?'Dodaj u listu':'Sačuvaj u listu';
 if(typeof profileModalCity!=='undefined')profileModalCity.value=loc.city||'';
 if(typeof profileModalAddress!=='undefined')profileModalAddress.value=loc.address||'';
 if(typeof profileModalPhone!=='undefined')profileModalPhone.value=loc.phone||'';
 renderProfileModalPhones(typeof profileModalPhone!=='undefined'?profileModalPhone.value:'');
 if(typeof profileModalActive!=='undefined')profileModalActive.checked=loc.active!==0;
 if(typeof profileLocationModal!=='undefined'){
  profileLocationModal.classList.remove('hidden');
  setTimeout(()=>{try{profileModalCity.focus()}catch(_e){}},50);
 }
}
async function closeProfileLocationModalFn(force=false){
 if(!force&&!(await confirmDiscardUnsavedChangesAsync()))return;
 profileLocationEditIndex=null;
 if(typeof profileLocationModal!=='undefined')profileLocationModal.classList.add('hidden');
 setTimeout(()=>{try{resetUnsavedGuard(profileLocationForm)}catch(_e){}},80);
}
async function saveProfileLocations(silent=false){
 syncBusinessPhones();
 if(!ownerHasWrittenLocation() && !profileUsingFullLocations())return;
 if(profileUsingFullLocations()){
  for(const loc of collectProfileExtraLocations()){
   const body=JSON.stringify(loc);
   if(String(loc.id||'').startsWith('new-'))await api('/api/owner/locations',{method:'POST',body});
   else await api('/api/owner/locations/'+loc.id,{method:'PUT',body});
  }
 }else{
  const first=(ownerLocationsCache&&ownerLocationsCache[0])?ownerLocationsCache[0]:null;
  const firstBody={
   id:first&&first.id?first.id:'',
   name:'Lokacija 1',
   city:setCity.value,
   address:setAddress.value,
   phone:setPhone.value,
   email:first&&first.email?first.email:'',
   sort_order:1,
   active:true
  };
  if(first&&first.id&&!String(first.id).startsWith('new-'))await api('/api/owner/locations/'+first.id,{method:'PUT',body:JSON.stringify(firstBody)});
  else await api('/api/owner/locations',{method:'POST',body:JSON.stringify(firstBody)});
 }
 invalidateOwnerLocationsCache();
 await ensureOwnerLocationsLoaded(true);
 if((ownerLocationsCache||[]).length>1)profileLocationsMode='all';
 rememberProfileLocationSnapshot();
 markOwnerTabsStale('settings','bookinglink','appointments','staff','services','hours','dash');
 markManualOptionsStale();
 renderProfileExtraLocations();
 refreshProfileAddLocationButton();
 if(typeof ownerLocationsList!=='undefined')renderOwnerLocations();
 if(!silent)msg('Lokacije su sačuvane.','ok');
}
function ownerLocationWhere(l){
 return [l&&l.city,l&&l.address].map(x=>String(x||'').trim()).filter(Boolean).join(' · ') || 'Grad i adresa nisu uneti';
}
function ownerLocationPhoneSummary(l){
 const phones=ownerPhoneParts((l&&l.phone)||'').slice(0,4);
 return phones.length?phones.join(' / '):'Telefoni nisu uneti';
}
function setOwnerLocationQrActionsEnabled(enabled){
 ['qrLocCopy','qrLocDownload','qrLocCards','qrLocStickers'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!enabled;});
 const open=document.getElementById('qrLocOpen');
 if(open){open.classList.toggle('disabled-v123',!enabled);open.style.pointerEvents=enabled?'':'none';open.setAttribute('aria-disabled',enabled?'false':'true');}
}
function currentOwnerLocationQrModalLoc(){
 if(ownerLocationQrEditIndex===null || ownerLocationQrEditIndex===undefined)return null;
 return ownerLocationsCache[Number(ownerLocationQrEditIndex)]||null;
}
function openOwnerLocationQrModal(idx=null){
 ownerLocationQrEditIndex=idx===null?null:Number(idx);
 const isNew=idx===null;
 const loc=isNew?makeEmptyProfileLocation((ownerLocationsCache||[]).length+1):(ownerLocationsCache[Number(idx)]||makeEmptyProfileLocation(Number(idx)+1));
 if(typeof ownerLocationQrModalTitle!=='undefined')ownerLocationQrModalTitle.textContent=isNew?'Dodaj lokaciju':'Lokacija: '+ownerLocationTitle(loc,Number(idx)||0);
 if(typeof ownerLocationQrModalHint!=='undefined')ownerLocationQrModalHint.textContent='Podesi podatke lokacije, link i QR materijale u ovom prozoru.';
 if(typeof qrLocName!=='undefined')qrLocName.value=loc.name||('Lokacija '+(isNew?(ownerLocationsCache||[]).length+1:Number(idx)+1));
 if(typeof qrLocCity!=='undefined')qrLocCity.value=loc.city||'';
 if(typeof qrLocAddress!=='undefined')qrLocAddress.value=loc.address||'';
 if(typeof qrLocEmail!=='undefined')qrLocEmail.value=loc.email||'';
 if(typeof qrLocPhone!=='undefined')qrLocPhone.value=loc.phone||'';
 if(typeof qrLocSort!=='undefined')qrLocSort.value=Number(loc.sort_order||((isNew?(ownerLocationsCache||[]).length:Number(idx))+1));
 if(typeof qrLocActive!=='undefined')qrLocActive.checked=loc.active!==0;
 if(typeof qrLocUrl!=='undefined')qrLocUrl.value=loc.booking_url||'Link će se napraviti posle čuvanja lokacije.';
 if(typeof qrLocOpen!=='undefined')qrLocOpen.href=loc.booking_url||'#';
 if(typeof qrLocDelete!=='undefined')qrLocDelete.classList.toggle('hidden',isNew);
 setOwnerLocationQrActionsEnabled(!!ownerLocId(loc)&&!!loc.booking_url);
 const modal=document.getElementById('ownerLocationQrModal');
 if(modal){
  modal.classList.remove('hidden');
  modal.classList.add('manual-modal-open');
  document.body.classList.add('manual-modal-body-open');
  setTimeout(()=>{try{(qrLocName||modal.querySelector('input,textarea,button')).focus({preventScroll:true})}catch(_e){}},60);
 }
}
function closeOwnerLocationQrModalFn(){
 ownerLocationQrEditIndex=null;
 const modal=document.getElementById('ownerLocationQrModal');
 if(modal){
  modal.classList.add('hidden');
  modal.classList.remove('manual-modal-open');
 }
 document.body.classList.remove('manual-modal-body-open');
}
function collectOwnerLocationQrModalPayload(){
 const idx=ownerLocationQrEditIndex===null?(ownerLocationsCache||[]).length:Number(ownerLocationQrEditIndex);
 const existing=ownerLocationQrEditIndex===null?{}:(ownerLocationsCache[idx]||{});
 return {
  id:existing.id||('new-'+Date.now()),
  name:(typeof qrLocName!=='undefined'?qrLocName.value:'')||('Lokacija '+(idx+1)),
  city:typeof qrLocCity!=='undefined'?qrLocCity.value:'',
  address:typeof qrLocAddress!=='undefined'?qrLocAddress.value:'',
  email:typeof qrLocEmail!=='undefined'?qrLocEmail.value:'',
  phone:typeof qrLocPhone!=='undefined'?qrLocPhone.value:'',
  sort_order:Number((typeof qrLocSort!=='undefined'?qrLocSort.value:'')||idx+1),
  active:typeof qrLocActive!=='undefined'?qrLocActive.checked:true
 };
}
async function saveOwnerLocationQrModal(e){
 if(e){e.preventDefault();e.stopPropagation();}
 const isNew=ownerLocationQrEditIndex===null;
 const payload=collectOwnerLocationQrModalPayload();
 try{
  if(isNew || String(payload.id||'').startsWith('new-')){
   await api('/api/owner/locations',{method:'POST',body:JSON.stringify(payload)});
  }else{
   await api('/api/owner/locations/'+encodeURIComponent(payload.id),{method:'PUT',body:JSON.stringify(payload)});
  }
  closeOwnerLocationQrModalFn();
  await loadBookingLink(false);
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
  msg(isNew?'Lokacija je dodata i sačuvana.':'Lokacija je sačuvana.','ok');
 }catch(e){msg(e.message||'Greška pri čuvanju lokacije.','err')}
}
async function deleteOwnerLocationQrModal(){
 const loc=currentOwnerLocationQrModalLoc();
 if(!loc)return;
 if(ownerLocationsCache.length<=1)return msg('Mora ostati bar jedna lokacija.','err');
 if(!confirm('Da li sigurno želiš da obrišeš ovu lokaciju?'))return;
 try{
  await api('/api/owner/locations/'+encodeURIComponent(loc.id),{method:'DELETE'});
  invalidateOwnerLocationsCache();
  closeOwnerLocationQrModalFn();
  await loadBookingLink(false);
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
  msg('Lokacija je obrisana.','ok');
 }catch(e){msg(e.message||'Greška pri brisanju lokacije.','err')}
}
async function copyOwnerLocationQrModalLink(){
 const loc=currentOwnerLocationQrModalLoc();
 if(!loc||!loc.booking_url)return msg('Prvo sačuvaj lokaciju da dobije link.','err');
 await navigator.clipboard.writeText(loc.booking_url||'');
 msg('Link lokacije je kopiran.','ok');
}
function ownerLocationReadyForQr(l){
 return !!(l&&l.booking_url&&ownerLocId(l));
}
async function copyOwnerLocationLink(loc){
 if(!loc||!loc.booking_url)return msg('Lokacija još nema link. Uredi i sačuvaj lokaciju u odeljku Profil firme.','err');
 await navigator.clipboard.writeText(loc.booking_url||'');
 msg('Link lokacije je kopiran.','ok');
}
function requireOwnerLocationQrReady(loc){
 if(ownerLocationReadyForQr(loc))return true;
 msg('Prvo sačuvaj lokaciju u odeljku Profil firme da dobije svoj link i QR kod.','err');
 return false;
}
function renderOwnerLocations(){
 if(typeof ownerLocationsList==='undefined')return;
 const list=(ownerLocationsCache||[]);
 ownerLocationsList.classList.add('location-qr-list-v123');
 if(!list.length){
  ownerLocationsList.innerHTML='<p class="muted">Nema dodatih lokacija. Lokacije se dodaju u odeljku Profil firme.</p>';
  return;
 }
 ownerLocationsList.innerHTML=list.map((l,idx)=>{
  const ready=ownerLocationReadyForQr(l);
  const disabledAttr=ready?'':' disabled';
  const disabledClass=ready?'':' disabled-v123';
  const openHref=ready?htmlEsc(l.booking_url):'#';
  return `
  <article class="item location-qr-row-v123 location-qr-row-v124" data-id="${htmlEsc(l.id||('new-'+idx))}">
    <div class="location-qr-main-v123">
      <h3>${htmlEsc(ownerLocationTitle(l,idx))}<span class="location-badge-v115">${l.active!==0?'Aktivna':'Neaktivna'}</span></h3>
      <p>${htmlEsc(ownerLocationWhere(l))}</p>
      <p class="muted">${htmlEsc(ownerLocationPhoneSummary(l))}</p>
    </div>
    <div class="location-qr-link-v123">
      <b>Link lokacije</b>
      <p class="muted">${htmlEsc(l.booking_url||'Link će se napraviti posle čuvanja lokacije u Profil firme.')}</p>
    </div>
    <div class="location-qr-actions-inline-v124">
      <button class="btn small ghost owner-loc-copy-link" type="button" data-idx="${idx}"${disabledAttr}>Kopiraj link</button>
      <a class="btn small ghost owner-loc-open-link${disabledClass}" target="_blank" href="${openHref}" data-idx="${idx}" aria-disabled="${ready?'false':'true'}">Otvori</a>
      <button class="btn small owner-loc-download-qr" type="button" data-idx="${idx}"${disabledAttr}>Preuzmi samo QR</button>
      <button class="btn small owner-loc-cards-qr" type="button" data-idx="${idx}"${disabledAttr}>Štampaj/preuzmi QR vizit karte</button>
      <button class="btn small owner-loc-stickers-qr" type="button" data-idx="${idx}"${disabledAttr}>Štampaj/preuzmi QR nalepnice</button>
    </div>
  </article>`}).join('');
 ownerLocationsList.querySelectorAll('.owner-loc-copy-link').forEach(btn=>btn.onclick=()=>copyOwnerLocationLink(list[Number(btn.dataset.idx)]).catch(e=>msg(e.message||'Ne mogu da kopiram link.','err')));
 ownerLocationsList.querySelectorAll('.owner-loc-open-link').forEach(a=>a.onclick=ev=>{const loc=list[Number(a.dataset.idx)];if(!requireOwnerLocationQrReady(loc))ev.preventDefault();});
 ownerLocationsList.querySelectorAll('.owner-loc-download-qr').forEach(btn=>btn.onclick=()=>{const loc=list[Number(btn.dataset.idx)];if(requireOwnerLocationQrReady(loc))downloadOwnerQrCode(loc);});
 ownerLocationsList.querySelectorAll('.owner-loc-cards-qr').forEach(btn=>btn.onclick=()=>{const loc=list[Number(btn.dataset.idx)];if(requireOwnerLocationQrReady(loc))printQrPdfList(loc);});
 ownerLocationsList.querySelectorAll('.owner-loc-stickers-qr').forEach(btn=>btn.onclick=()=>{const loc=list[Number(btn.dataset.idx)];if(requireOwnerLocationQrReady(loc))printQrStickerPdf(loc);});
}
function collectOwnerLocations(){
 return (ownerLocationsCache||[]).map((l,idx)=>({
  id:l.id||('new-'+(idx+1)),
  name:l.name||('Lokacija '+(idx+1)),
  city:l.city||'',
  address:l.address||'',
  email:l.email||'',
  phone:l.phone||'',
  sort_order:Number(l.sort_order||idx+1),
  active:l.active!==0
 }));
}

async function saveOwnerLocations(){
 try{
  for(const loc of collectOwnerLocations()){
   const body=JSON.stringify(loc);
   if(String(loc.id||'').startsWith('new-'))await api('/api/owner/locations',{method:'POST',body});
   else await api('/api/owner/locations/'+loc.id,{method:'PUT',body});
  }
  msg('Lokacije su sačuvane.','ok');
  await loadBookingLink(false);
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
 }catch(e){msg(e.message,'err')}
}
async function loadBookingLink(render=true){
 try{
  let d=await api('/api/owner/dashboard');
  window.ownerBusinessForPrint=d.business||{};
  if(typeof bookingUrlInput!=='undefined')bookingUrlInput.value=d.business.booking_url;
  if(typeof openPublicLink!=='undefined')openPublicLink.href=d.business.booking_url;
  if(typeof bookingLinkBusinessName!=='undefined')bookingLinkBusinessName.textContent=d.business.name||'Firma';
  if(typeof ownerQrPreview!=='undefined'){
   ownerQrObjectUrl=await fetchOwnerQrDataUrl();
   ownerQrPreview.src=ownerQrObjectUrl;
  }
  if(typeof ownerLocationsList!=='undefined'){
   await ensureOwnerLocationsLoaded();
   if(render)renderOwnerLocations();
  }else{
   try{ await ensureOwnerLocationsLoaded(); }catch(_e){}
  }
 }catch(e){msg(e.message,'err')}
}
if(typeof addLocationBtn!=='undefined')addLocationBtn.onclick=()=>openOwnerLocationQrModal(null);
if(typeof profileAddLocationBtn!=='undefined')profileAddLocationBtn.onclick=()=>{
 if(!forceProfileLocationListModeV183())return msg('Prvo upiši Grad i Adresu za prvu lokaciju.','err');
 openProfileLocationModal(null);
};
if(typeof setCity!=='undefined')setCity.addEventListener('input',refreshProfileAddLocationButton);
if(typeof setAddress!=='undefined')setAddress.addEventListener('input',refreshProfileAddLocationButton);
if(typeof setPhone!=='undefined')setPhone.addEventListener('input',refreshProfileAddLocationButton);
async function saveProfileLocationFromModal(e){
 if(e){e.preventDefault();e.stopPropagation();}
 if(profileLocationSaving)return;
 const isNew=profileLocationEditIndex===null;
 const editIndex=profileLocationEditIndex;
 const btn=(typeof profileModalSaveBtn!=='undefined')?profileModalSaveBtn:null;
 const oldBtnText=btn?btn.textContent:'';
 profileLocationSaving=true;
 const loadingDone = window.AppLoading ? window.AppLoading.begin('Čuvam lokaciju...', {immediate:true}) : null;
 if(btn){btn.disabled=true;btn.textContent='Čuvam...';}
 try{
  if(isNew && !profileUsingFullLocations()){
   if(!forceProfileLocationListModeV183())throw Error('Prvo upiši Grad i Adresu za prvu lokaciju.');
  }
  const loc=isNew?makeEmptyProfileLocation((ownerLocationsCache||[]).length+1):(ownerLocationsCache[editIndex]||makeEmptyProfileLocation(editIndex+1));
  syncProfileModalPhones();
  loc.city=profileModalCity.value;
  loc.address=profileModalAddress.value;
  loc.phone=profileModalPhone.value;
  loc.active=profileModalActive.checked?1:0;
  loc.name=loc.name||('Lokacija '+((isNew?(ownerLocationsCache||[]).length:editIndex)+1));
  loc.sort_order=isNew?(ownerLocationsCache||[]).length+1:editIndex+1;
  if(isNew)ownerLocationsCache.push(loc);
  else ownerLocationsCache[editIndex]=loc;
  profileLocationsMode='all';
  // Odmah sakrij glavna polja Grad/Adresa/Telefon i prikaži listu lokacija.
  refreshProfileAddLocationButton();
  renderProfileExtraLocations();
  resetUnsavedGuard(profileLocationForm);
  closeProfileLocationModalFn(true);
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
  if(typeof ownerLocationsList!=='undefined')renderOwnerLocations();
  await saveProfileLocations(true);
  if(typeof bookinglink!=='undefined' && bookinglink && !bookinglink.classList.contains('hidden')){
   setTimeout(()=>{try{loadBookingLink(false);ownerMarkTabLoaded('bookinglink')}catch(_e){}},0);
  }
  renderProfileExtraLocations();
  refreshProfileAddLocationButton();
  if(typeof ownerLocationsList!=='undefined')renderOwnerLocations();
  msg(isNew?'Lokacija je dodata i sačuvana.':'Lokacija je sačuvana.','ok');
 }catch(err){
  msg((err&&err.message)||'Greška pri čuvanju lokacije.','err');
 }finally{
  profileLocationSaving=false;
  if(loadingDone)loadingDone();
  if(btn){btn.disabled=false;btn.textContent=oldBtnText||'Dodaj u listu';}
 }
}
if(typeof profileLocationForm!=='undefined')profileLocationForm.addEventListener('submit',saveProfileLocationFromModal);
if(typeof profileModalSaveBtn!=='undefined')profileModalSaveBtn.addEventListener('click',saveProfileLocationFromModal);
if(typeof closeProfileLocationModal!=='undefined')closeProfileLocationModal.onclick=closeProfileLocationModalFn;
if(typeof cancelProfileLocationModal!=='undefined')cancelProfileLocationModal.onclick=closeProfileLocationModalFn;
if(typeof profileLocationModal!=='undefined')profileLocationModal.addEventListener('mousedown',ev=>{
 if(ev.target===profileLocationModal)closeProfileLocationModalFn();
});
if(typeof saveLocationsBtn!=='undefined')saveLocationsBtn.onclick=saveOwnerLocations;
if(typeof copyLinkBtn!=='undefined')copyLinkBtn.onclick=async()=>{
 try{
  await loadBookingLink(false);
  await navigator.clipboard.writeText(bookingUrlInput.value);
  msg('Glavni link je kopiran.','ok');
 }catch(e){msg('Ne mogu da kopiram link. Označi ga ručno.','err')}
};

if(typeof ownerLocationQrModalForm!=='undefined')ownerLocationQrModalForm.addEventListener('submit',saveOwnerLocationQrModal);
if(typeof closeOwnerLocationQrModal!=='undefined')closeOwnerLocationQrModal.onclick=closeOwnerLocationQrModalFn;
if(typeof cancelOwnerLocationQrModal!=='undefined')cancelOwnerLocationQrModal.onclick=closeOwnerLocationQrModalFn;
if(typeof qrLocDelete!=='undefined')qrLocDelete.onclick=deleteOwnerLocationQrModal;
if(typeof qrLocCopy!=='undefined')qrLocCopy.onclick=()=>copyOwnerLocationQrModalLink().catch(e=>msg(e.message||'Ne mogu da kopiram link.','err'));
if(typeof qrLocDownload!=='undefined')qrLocDownload.onclick=()=>{const loc=currentOwnerLocationQrModalLoc();if(loc)downloadOwnerQrCode(loc);else msg('Prvo sačuvaj lokaciju.','err')};
if(typeof qrLocCards!=='undefined')qrLocCards.onclick=()=>{const loc=currentOwnerLocationQrModalLoc();if(loc)printQrPdfList(loc);else msg('Prvo sačuvaj lokaciju.','err')};
if(typeof qrLocStickers!=='undefined')qrLocStickers.onclick=()=>{const loc=currentOwnerLocationQrModalLoc();if(loc)printQrStickerPdf(loc);else msg('Prvo sačuvaj lokaciju.','err')};
if(typeof ownerLocationQrModal!=='undefined')ownerLocationQrModal.addEventListener('mousedown',ev=>{if(ev.target===ownerLocationQrModal)closeOwnerLocationQrModalFn();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const m=document.getElementById('ownerLocationQrModal');if(m&&!m.classList.contains('hidden'))closeOwnerLocationQrModalFn();}});

async function printQrPdfList(locationArg=null){
 const __loadingDone = window.AppLoading ? window.AppLoading.begin('Pravim PDF...', {immediate:true}) : null;
 try{
  await loadBookingLink(false);
  const loc=(locationArg&&locationArg.id)?locationArg:null;
  const locId=ownerLocId(loc);
  const qrSource=locId?await fetchOwnerQrDataUrl(locId):(ownerQrObjectUrl || await fetchOwnerQrDataUrl());
  const b=window.ownerBusinessForPrint||{};
  const businessName=(b.name||'Vaša firma').trim();
  const rawPhoneText=String((loc&&loc.phone)||b.phone||'').trim();
  const phoneList=rawPhoneText
    ? ownerPhonePartsLimited(rawPhoneText,4)
    : ['Telefon nije unet'];
  const locCity=(loc&&loc.city)||b.city||'';
  const locAddress=(loc&&loc.address)||b.address||'';
  const locationText=((locAddress?locAddress.trim():'') + ((locAddress&&locCity)?', ':'') + (locCity?locCity.trim():'')) || 'Lokacija nije uneta';
  const emailText=((loc&&loc.email)||b.email||'Email nije unet').trim();
  const splitWords=(value,maxChars,maxLines=3)=>{
    const words=String(value||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length)return [];
    const lines=[];
    let current='';
    for(const word of words){
      const candidate=current?current+' '+word:word;
      if(candidate.length<=maxChars){
        current=candidate;
      }else if(!current){
        lines.push(word.slice(0,maxChars));
        current=word.slice(maxChars);
      }else{
        lines.push(current);
        current=word;
      }
      if(lines.length>=maxLines)break;
    }
    if(lines.length<maxLines && current)lines.push(current);
    return lines.slice(0,maxLines);
  };

  const loadImage=(src)=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Ne mogu da učitam QR sliku.'));
    img.src=src;
  });

  const qrToRgbImage=async(src)=>{
    const img=await loadImage(src);
    const size=1200;
    const canvas=document.createElement('canvas');
    canvas.width=size;
    canvas.height=size;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,size,size);
    ctx.imageSmoothingEnabled=false;
    ctx.webkitImageSmoothingEnabled=false;
    ctx.mozImageSmoothingEnabled=false;
    ctx.msImageSmoothingEnabled=false;
    ctx.drawImage(img,0,0,size,size);
    const rgba=ctx.getImageData(0,0,size,size).data;
    const bytes=new Uint8Array(size*size*3);
    for(let i=0,j=0;i<rgba.length;i+=4){
      bytes[j++]=rgba[i];
      bytes[j++]=rgba[i+1];
      bytes[j++]=rgba[i+2];
    }
    return {width:size,height:size,bytes};
  };

  const escapePdfText=(value)=>String(value??'')
    .replace(/\\/g,'\\\\')
    .replace(/\(/g,'\\(')
    .replace(/\)/g,'\\)')
    .replace(/[čć]/g,'c')
    .replace(/[ČĆ]/g,'C')
    .replace(/[š]/g,'s')
    .replace(/[Š]/g,'S')
    .replace(/[ž]/g,'z')
    .replace(/[Ž]/g,'Z')
    .replace(/[đ]/g,'dj')
    .replace(/[Đ]/g,'Dj');

  const textMeasureCanvas=document.createElement('canvas');
  const textMeasureCtx=textMeasureCanvas.getContext('2d');

  function pdfTextWidthApprox(value,size,bold){
    textMeasureCtx.font=`${bold?'bold ':''}${size}px Helvetica, Arial, sans-serif`;
    return textMeasureCtx.measureText(String(value||'')).width;
  }
    function wrapTextToWidth(value, size, bold, maxWidth, maxLines=3){
  const words=String(value||'').trim().split(/\s+/).filter(Boolean);
  const lines=[];
  let line='';

  for(const word of words){
    const test=line ? line+' '+word : word;

    if(pdfTextWidthApprox(test,size,bold)<=maxWidth){
      line=test;
    }else{
      if(line) lines.push(line);

      if(pdfTextWidthApprox(word,size,bold)>maxWidth){
        let part='';
        for(const ch of word){
          const testPart=part+ch;
          if(pdfTextWidthApprox(testPart,size,bold)<=maxWidth){
            part=testPart;
          }else{
            if(part) lines.push(part);
            part=ch;
          }
          if(lines.length>=maxLines) break;
        }
        line=part;
      }else{
        line=word;
      }
    }

    if(lines.length>=maxLines) break;
  }

  if(line && lines.length<maxLines) lines.push(line);

  return lines.slice(0,maxLines);
}



  async function makePdf(){
  const ptPerMm = 72 / 25.4;

// A4 papir: 210 x 297 mm
const pageW = 210 * ptPerMm;
const pageH = 297 * ptPerMm;

// Evropska standardna vizit karta: 85 x 55 mm
const cols = 2, rows = 5;
const cardW = 85 * ptPerMm;
const cardH = 55 * ptPerMm;

// Bez razmaka između kartica.
// Kartice su spojene da mogu da se seku po linijama.
const gutterX = 0;
const gutterY = 0;

// Centriraj spojenu mrežu kartica na A4
const marginX = (pageW - cardW * cols) / 2;
const marginY = (pageH - cardH * rows) / 2;

// QR oko 24 mm
const qrSize = 24 * ptPerMm;
    const qrImage=await qrToRgbImage(qrSource);
  const nameFontSize = 11.5;
const phoneFontSize = 7.2;
const phoneLineGap = 8.5;
const locationFontSize = 7.5;
const emailFontSize = 6.7;

const leftTextMaxWidth = cardW * 0.55;

const nameLines = wrapTextToWidth(businessName, nameFontSize, true, leftTextMaxWidth, 3);
const locationLines = wrapTextToWidth(locationText, locationFontSize, false, leftTextMaxWidth, 3);
const phoneLines = phoneList;
const emailLines = wrapTextToWidth(emailText, emailFontSize, false, qrSize + 32, 2);

    const yPdf=(y)=>pageH-y;
    let content='';
    const setFill=(r,g,b)=>{ content += `${r} ${g} ${b} rg\n`; };
    const setStroke=(r,g,b)=>{ content += `${r} ${g} ${b} RG\n`; };
    const line=(x1,y1,x2,y2)=>{ content += `${x1.toFixed(2)} ${yPdf(y1).toFixed(2)} m ${x2.toFixed(2)} ${yPdf(y2).toFixed(2)} l S\n`; };
    const rectStroke=(x,y,w,h)=>{ content += `${x.toFixed(2)} ${yPdf(y+h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`; };
    const text=(x,y,size,bold,value)=>{
      content += `BT /F${bold?2:1} ${size} Tf ${x.toFixed(2)} ${yPdf(y).toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`;
    };
    const centeredText=(x,y,size,bold,value)=>{
      const approxWidth=pdfTextWidthApprox(value,size,bold);
      text(x-approxWidth/2,y,size,bold,value);
    };

    content += '0.8 w\n';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x=marginX+c*(cardW+gutterX);
        const y=marginY+r*(cardH+gutterY);
const dividerX = x + cardW * 0.62;
const qrCenterX = x + cardW * 0.81;
const textX = x + 12;

setStroke(0.82,0.82,0.82);
rectStroke(x,y,cardW,cardH);

setStroke(0.82,0.82,0.82);
line(dividerX,y+14,dividerX,y+cardH-14);

setFill(0,0,0);

// Naziv firme
nameLines.forEach((ln,idx)=>{
  text(textX, y + 19 + idx * 13, nameFontSize, true, ln);
});

// Telefoni
const infoY = y + 72;
phoneLines.forEach((ln,idx)=>{
  text(textX, infoY + idx * phoneLineGap, phoneFontSize, false, ln);
});

// Lokacija
const locationStartY = infoY + phoneLines.length * phoneLineGap + 10;
locationLines.forEach((ln,idx)=>{
  text(textX, locationStartY + idx * 9.5, locationFontSize, false, ln);
});
      

// Tekst iznad QR koda
centeredText(qrCenterX, y + 23, 7, true, 'ZAKAŽITE TERMIN');
centeredText(qrCenterX, y + 33, 7, true, 'ONLINE');

// QR kod
const imgX = qrCenterX - qrSize / 2;
const imgTop = y + 43;
const imgY = pageH - imgTop - qrSize;
content += `q ${qrSize} 0 0 ${qrSize} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm /Im0 Do Q\n`;

// Email ispod QR koda
emailLines.forEach((ln,idx)=>{
  centeredText(qrCenterX, y + 121 + idx * 7.5, emailFontSize, false, ln);
});
      
  }
    }

    const encoder=new TextEncoder();
    const objs=[];
    const add=(body)=>objs.push(typeof body==='string'?encoder.encode(body):body);

    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im0 6 0 R >> >> /Contents 7 0 R >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const imgHeader=encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${qrImage.width} /Height ${qrImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${qrImage.bytes.length} >>\nstream\n`);
    const imgFooter=encoder.encode('\nendstream');
    const imgObj=new Uint8Array(imgHeader.length+qrImage.bytes.length+imgFooter.length);
    imgObj.set(imgHeader,0);
    imgObj.set(qrImage.bytes,imgHeader.length);
    imgObj.set(imgFooter,imgHeader.length+qrImage.bytes.length);
    add(imgObj);

    const contentBytes=encoder.encode(content);
    const contHeader=encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`);
    const contFooter=encoder.encode('\nendstream');
    const contObj=new Uint8Array(contHeader.length+contentBytes.length+contFooter.length);
    contObj.set(contHeader,0);
    contObj.set(contentBytes,contHeader.length);
    contObj.set(contFooter,contHeader.length+contentBytes.length);
    add(contObj);

    let parts=[encoder.encode('%PDF-1.4\n%TerminiPro\n')];
    let offsets=[0];
    let pos=parts[0].length;
    for(let i=0;i<objs.length;i++){
      offsets.push(pos);
      const head=encoder.encode(`${i+1} 0 obj\n`);
      const tail=encoder.encode('\nendobj\n');
      parts.push(head,objs[i],tail);
      pos+=head.length+objs[i].length+tail.length;
    }
    const xrefPos=pos;
    let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    xref+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    parts.push(encoder.encode(xref));

    const total=parts.reduce((s,p)=>s+p.length,0);
    const pdf=new Uint8Array(total);
    let o=0;
    for(const p of parts){pdf.set(p,o);o+=p.length}
    return new Blob([pdf],{type:'application/pdf'});
  }

  const blob=await makePdf();
  const filename='qr-vizit-kartice-'+safeFileName(loc?loc.name:'glavni-link')+'.pdf';
  showOwnerFileOptionsV185(blob, filename, 'QR vizit karte', {kind:'pdf'});
 }catch(e){msg(e.message,'err')}finally{if(__loadingDone)__loadingDone();}
}

if(typeof printQrPdfBtn!=='undefined')printQrPdfBtn.onclick=()=>printQrPdfList(ownerLocationsCache[0]||null);


async function printQrStickerPdf(locationArg=null){
 const __loadingDone = window.AppLoading ? window.AppLoading.begin('Pravim PDF...', {immediate:true}) : null;
 try{
  await loadBookingLink(false);
  const loc=(locationArg&&locationArg.id)?locationArg:null;
  const locId=ownerLocId(loc);
  const qrSource=locId?await fetchOwnerQrDataUrl(locId):(ownerQrObjectUrl || await fetchOwnerQrDataUrl());
  const title=(loc&&loc.name)||((window.ownerBusinessForPrint||{}).name)||'Lokacija';

  const loadImage=(src)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Ne mogu da učitam QR sliku.'));img.src=src;});
  const qrToRgbImage=async(src)=>{const img=await loadImage(src);const size=1200;const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,size,size);const rgba=ctx.getImageData(0,0,size,size).data;const bytes=new Uint8Array(size*size*3);for(let i=0,j=0;i<rgba.length;i+=4){bytes[j++]=rgba[i];bytes[j++]=rgba[i+1];bytes[j++]=rgba[i+2]}return {width:size,height:size,bytes}};
  const escapePdfText=(value)=>String(value??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[čć]/g,'c').replace(/[ČĆ]/g,'C').replace(/[š]/g,'s').replace(/[Š]/g,'S').replace(/[ž]/g,'z').replace(/[Ž]/g,'Z').replace(/[đ]/g,'dj').replace(/[Đ]/g,'Dj');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const wtxt=(v,s,b)=>{ctx.font=`${b?'bold ':''}${s}px Helvetica, Arial, sans-serif`;return ctx.measureText(String(v||'')).width};
  const pageW=595,pageH=842,cols=4,rows=7,marginX=28,marginY=28,gx=10,gy=10;
  const cellW=(pageW-marginX*2-gx*(cols-1))/cols,cellH=(pageH-marginY*2-gy*(rows-1))/rows,qrSize=58;
  const qrImage=await qrToRgbImage(qrSource);
  const yPdf=y=>pageH-y;
  let content='0.7 w\n';
  const text=(x,y,size,bold,value)=>{content+=`BT /F${bold?2:1} ${size} Tf ${x.toFixed(2)} ${yPdf(y).toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`};
  const centeredText=(x,y,size,bold,value)=>text(x-wtxt(value,size,bold)/2,y,size,bold,value);
  const rect=(x,y,w,h)=>{content+=`0.82 0.82 0.82 RG ${x.toFixed(2)} ${yPdf(y+h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`};
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const x=marginX+c*(cellW+gx), y=marginY+r*(cellH+gy), cx=x+cellW/2;
    rect(x,y,cellW,cellH);
    centeredText(cx,y+15,8.5,true,'ZAKAZITE ONLINE');
    const imgX=cx-qrSize/2,imgTop=y+22,imgY=pageH-imgTop-qrSize;
    content+=`q ${qrSize} 0 0 ${qrSize} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm /Im0 Do Q\n`;
    centeredText(cx,y+88,7,false,title.slice(0,26));
  }
  const encoder=new TextEncoder(),objs=[];const add=b=>objs.push(typeof b==='string'?encoder.encode(b):b);
  add('<< /Type /Catalog /Pages 2 0 R >>');add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im0 6 0 R >> >> /Contents 7 0 R >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ih=encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${qrImage.width} /Height ${qrImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${qrImage.bytes.length} >>\nstream\n`),ifoot=encoder.encode('\nendstream'),iobj=new Uint8Array(ih.length+qrImage.bytes.length+ifoot.length);iobj.set(ih,0);iobj.set(qrImage.bytes,ih.length);iobj.set(ifoot,ih.length+qrImage.bytes.length);add(iobj);
  const cb=encoder.encode(content),ch=encoder.encode(`<< /Length ${cb.length} >>\nstream\n`),cf=encoder.encode('\nendstream'),cobj=new Uint8Array(ch.length+cb.length+cf.length);cobj.set(ch,0);cobj.set(cb,ch.length);cobj.set(cf,ch.length+cb.length);add(cobj);
  let parts=[encoder.encode('%PDF-1.4\n%TerminiPro\n')],offsets=[0],pos=parts[0].length;
  for(let i=0;i<objs.length;i++){offsets.push(pos);let head=encoder.encode(`${i+1} 0 obj\n`),tail=encoder.encode('\nendobj\n');parts.push(head,objs[i],tail);pos+=head.length+objs[i].length+tail.length}
  const xrefPos=pos;let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';xref+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(encoder.encode(xref));
  const total=parts.reduce((s,p)=>s+p.length,0),pdf=new Uint8Array(total);let off=0;for(const p of parts){pdf.set(p,off);off+=p.length}
  const blob=new Blob([pdf],{type:'application/pdf'});
  const filename='qr-nalepnice-'+safeFileName(title)+'.pdf';
  showOwnerFileOptionsV185(blob, filename, 'QR nalepnice', {kind:'pdf'});
 }catch(e){msg(e.message,'err')}finally{if(__loadingDone)__loadingDone();}
}

async function printA4DoorPoster(){
 try{
  await loadBookingLink();
  const link=bookingUrlInput.value;
  const b=window.ownerBusinessForPrint||{};
  const name=b.name||'Vaša firma';
  const phones=ownerPhoneParts(b.phone);
  const place=[];
  if(b.city)place.push(b.city);
  if(b.instagram)place.push(b.instagram);
  const footerLines=[];
  if(phones.length)footerLines.push('Telefoni: '+phones.join('  -  '));
  if(place.length)footerLines.push(place.join('  -  '));
  const qrSource=ownerQrObjectUrl || await fetchOwnerQrDataUrl();
  const splitFixed=(value,max)=>{
    const out=[];
    let rest=String(value||'');
    while(rest.length>max){out.push(rest.slice(0,max));rest=rest.slice(max)}
    if(rest.trim())out.push(rest);
    return out;
  };

  const loadImage=(src)=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Ne mogu da učitam QR sliku.'));
    img.src=src;
  });

  const qrToRgbImage=async(src)=>{
    const img=await loadImage(src);
    const size=1200;
    const canvas=document.createElement('canvas');
    canvas.width=size;
    canvas.height=size;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,size,size);
    ctx.imageSmoothingEnabled=false;
    ctx.webkitImageSmoothingEnabled=false;
    ctx.mozImageSmoothingEnabled=false;
    ctx.msImageSmoothingEnabled=false;
    ctx.drawImage(img,0,0,size,size);
    const rgba=ctx.getImageData(0,0,size,size).data;
    const bytes=new Uint8Array(size*size*3);
    for(let i=0,j=0;i<rgba.length;i+=4){
      bytes[j++]=rgba[i];
      bytes[j++]=rgba[i+1];
      bytes[j++]=rgba[i+2];
    }
    return {width:size,height:size,bytes};
  };

  const escapePdfText=(value)=>String(value??'')
    .replace(/\\/g,'\\\\')
    .replace(/\(/g,'\\(')
    .replace(/\)/g,'\\)')
    .replace(/[čć]/g,'c')
    .replace(/[ČĆ]/g,'C')
    .replace(/[š]/g,'s')
    .replace(/[Š]/g,'S')
    .replace(/[ž]/g,'z')
    .replace(/[Ž]/g,'Z')
    .replace(/[đ]/g,'dj')
    .replace(/[Đ]/g,'Dj')
    .replace(/[—–]/g,'-')
    .replace(/•/g,'-');

  const measureCanvas=document.createElement('canvas');
  const measureCtx=measureCanvas.getContext('2d');
  const textWidth=(value,size,bold)=>{
    measureCtx.font=`${bold?'bold ':''}${size}px Helvetica, Arial, sans-serif`;
    return measureCtx.measureText(String(value||'')).width;
  };

  const makePdf=async()=>{
    const pageW=595, pageH=842;
    const yPdf=(y)=>pageH-y;
    const qrImage=await qrToRgbImage(qrSource);
    let content='';

    const setFill=(hex)=>{
      const n=parseInt(hex.replace('#',''),16);
      const r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255;
      content+=`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg\n`;
    };
    const setStroke=(hex)=>{
      const n=parseInt(hex.replace('#',''),16);
      const r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255;
      content+=`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} RG\n`;
    };
    const text=(x,y,size,bold,value)=>{
      content+=`BT /F${bold?2:1} ${size} Tf ${x.toFixed(2)} ${yPdf(y).toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`;
    };
    const centeredText=(x,y,size,bold,value)=>{
      const safe=escapePdfText(value);
      const w=textWidth(safe,size,bold);
      text(x-w/2,y,size,bold,value);
    };
    const roundRect=(x1,y1,x2,y2,r,op)=>{
      const left=x1,right=x2,top=yPdf(y1),bottom=yPdf(y2),k=0.5522847498*r;
      content+=`${(left+r).toFixed(2)} ${bottom.toFixed(2)} m `+
        `${(right-r).toFixed(2)} ${bottom.toFixed(2)} l `+
        `${(right-r+k).toFixed(2)} ${bottom.toFixed(2)} ${(right).toFixed(2)} ${(bottom+r-k).toFixed(2)} ${(right).toFixed(2)} ${(bottom+r).toFixed(2)} c `+
        `${right.toFixed(2)} ${(top-r).toFixed(2)} l `+
        `${right.toFixed(2)} ${(top-r+k).toFixed(2)} ${(right-r+k).toFixed(2)} ${top.toFixed(2)} ${(right-r).toFixed(2)} ${top.toFixed(2)} c `+
        `${(left+r).toFixed(2)} ${top.toFixed(2)} l `+
        `${(left+r-k).toFixed(2)} ${top.toFixed(2)} ${left.toFixed(2)} ${(top-r+k).toFixed(2)} ${left.toFixed(2)} ${(top-r).toFixed(2)} c `+
        `${left.toFixed(2)} ${(bottom+r).toFixed(2)} l `+
        `${left.toFixed(2)} ${(bottom+r-k).toFixed(2)} ${(left+r-k).toFixed(2)} ${bottom.toFixed(2)} ${(left+r).toFixed(2)} ${bottom.toFixed(2)} c h ${op}\n`;
    };

    // Exact A4 coordinate layout, centered like Android: equal left/right margins.
    setFill('#ffffff');
    content+=`0 0 ${pageW} ${pageH} re f\n`;

    setStroke('#111827');
    content+='3 w\n';
    roundRect(28,28,567,814,18,'S');

    setFill('#111827');
    roundRect(46,46,549,155,18,'f');

    setFill('#ffffff');
    centeredText(297.5,93,29,true,'SKENIRAJTE I ZAKAZITE');
    centeredText(297.5,128,25,true,'TERMIN ONLINE');

    setFill('#111827');
    centeredText(297.5,205,27,true,name);

    setFill('#374151');
    centeredText(297.5,233,15,false,'Bez poziva - izaberite uslugu i slobodan termin.');

    setFill('#f9fafb');
    roundRect(105,260,490,645,24,'f');
    setStroke('#d1d5db');
    content+='2 w\n';
    roundRect(105,260,490,645,24,'S');

    const qrX=150, qrTop=298, qrSize=295;
    const qrY=pageH-qrTop-qrSize;
    content+=`q ${qrSize} 0 0 ${qrSize} ${qrX} ${qrY} cm /Im0 Do Q\n`;

    setFill('#111827');
    centeredText(297.5,680,16,true,'Otvorite kameru telefona i skenirajte QR kod');

    setFill('#374151');
    centeredText(297.5,708,11.5,false,'Link za zakazivanje:');
    const lines=splitFixed(link,38).slice(0,3);
    lines.forEach((ln,idx)=>centeredText(297.5,728+idx*14,10.5,false,ln));

    setFill('#111827');
    let footerY=772;
    footerLines.slice(0,3).forEach(line=>{
      splitFixed(line,68).slice(0,2).forEach(safeLine=>{
        centeredText(297.5,footerY,11.5,true,safeLine);
        footerY+=15;
      });
    });

    const encoder=new TextEncoder();
    const objs=[];
    const add=(body)=>objs.push(typeof body==='string'?encoder.encode(body):body);

    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im0 6 0 R >> >> /Contents 7 0 R >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const imgHeader=encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${qrImage.width} /Height ${qrImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${qrImage.bytes.length} >>\nstream\n`);
    const imgFooter=encoder.encode('\nendstream');
    const imgObj=new Uint8Array(imgHeader.length+qrImage.bytes.length+imgFooter.length);
    imgObj.set(imgHeader,0);
    imgObj.set(qrImage.bytes,imgHeader.length);
    imgObj.set(imgFooter,imgHeader.length+qrImage.bytes.length);
    add(imgObj);

    const contentBytes=encoder.encode(content);
    const contHeader=encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`);
    const contFooter=encoder.encode('\nendstream');
    const contObj=new Uint8Array(contHeader.length+contentBytes.length+contFooter.length);
    contObj.set(contHeader,0);
    contObj.set(contentBytes,contHeader.length);
    contObj.set(contFooter,contHeader.length+contentBytes.length);
    add(contObj);

    let parts=[encoder.encode('%PDF-1.4\n%TerminiProPoster\n')];
    let offsets=[0];
    let pos=parts[0].length;
    for(let i=0;i<objs.length;i++){
      offsets.push(pos);
      const head=encoder.encode(`${i+1} 0 obj\n`);
      const tail=encoder.encode('\nendobj\n');
      parts.push(head,objs[i],tail);
      pos+=head.length+objs[i].length+tail.length;
    }
    const xrefPos=pos;
    let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    xref+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    parts.push(encoder.encode(xref));

    const total=parts.reduce((s,p)=>s+p.length,0);
    const pdf=new Uint8Array(total);
    let o=0;
    for(const p of parts){pdf.set(p,o);o+=p.length}
    return new Blob([pdf],{type:'application/pdf'});
  };

  const blob=await makePdf();
  showOwnerFileOptionsV185(blob, 'poster-a4-termini.pdf', 'A4 poster', {kind:'pdf'});
 }catch(e){msg(e.message,'err')}
}
if(typeof printA4PosterBtn!=='undefined')printA4PosterBtn.onclick=async()=>{await loadBookingLink();printA4DoorPoster()};


async function init(){
 document.body.classList.add('owner-booting');
 try{
  if(typeof from!=='undefined'&&from)from.value=today();
  if(typeof to!=='undefined'&&to)to.value=add(30);
  await validateTabletModeForOwner();
  if(!tok()){hide();return;}
  try{
   let me=await api('/api/auth/me');
   window.__ownerAuthMe=me;
   if(me.user.role!=='owner')throw Error();
   const startupTab=getOwnerStartupTab();
   show();
   await tab(startupTab);
  }catch(_e){
   hide();
  }
 }finally{
  setTimeout(()=>document.body.classList.remove('owner-booting'),0);
 }
}
init();


/* Owner Nav Clean Final v72 */
(function(){
 function onceReady(fn){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
  else fn();
 }
 function cleanOwner(){
  const clone=document.getElementById('ownerStableNavClone');
  if(clone) clone.remove();
  document.querySelectorAll('.tabs button').forEach(b=>{
   if((b.textContent||'').trim()==='Profil/poruke') b.textContent='Profil firme';
  });
 }
 onceReady(cleanOwner);
})();



/* Owner Facebook Style Header v74 */
(function(){
  async function ownerApi(path){
    if(path==='/api/auth/me'&&window.__ownerAuthMe)return window.__ownerAuthMe;
    const token = localStorage.getItem('terminiOwnerToken') || localStorage.getItem('token') || '';
    const res = await fetch(path, {headers:{Authorization:'Bearer '+token}});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Greška');
    if(path==='/api/auth/me')window.__ownerAuthMe=data;
    return data;
  }

  function findLogoutButton(){
    return Array.from(document.querySelectorAll('button,a')).find(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      return t === 'odjava' || t === 'logout';
    });
  }

  function findOldHeader(){
    return Array.from(document.querySelectorAll('header,.topbar,.navbar,.app-header,body > div,body > section')).find(el => {
      const text = (el.textContent || '').toLowerCase();
      return text.includes('panel firme') || (text.includes('odjava') && el.querySelector('button,a'));
    });
  }

  let ownerFacebookBusinessNameCache=null;
  async function businessName(){
    if(ownerFacebookBusinessNameCache) return ownerFacebookBusinessNameCache;
    try{
      const data = await ownerApi('/api/auth/me');
      ownerFacebookBusinessNameCache=(data.business && data.business.name) ? data.business.name : 'Firma';
      return ownerFacebookBusinessNameCache;
    }catch(_){
      return ownerFacebookBusinessNameCache||'Firma';
    }
  }

  async function installFixedWideHeader(){
    let header = document.getElementById('ownerFacebookHeader');
    const name = await businessName();

    if(!header){
      header = document.createElement('div');
      header.id = 'ownerFacebookHeader';
      header.className = 'owner-facebook-header';

      const title = document.createElement('div');
      title.className = 'owner-facebook-title';
      title.id = 'ownerFacebookTitle';
      title.textContent = name;

      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'owner-facebook-logout';
      out.textContent = 'Odjava';
      out.addEventListener('click', ev => {
        ev.preventDefault();
        const btn = findLogoutButton();
        if(btn && btn !== out) btn.click();
        else{
          localStorage.removeItem('terminiOwnerToken');
          localStorage.removeItem('token');
          location.href = (window.terminiAppPath ? window.terminiAppPath('/') : '/index.html');
        }
      });

      header.appendChild(title);
      header.appendChild(out);

      const oldHeader = findOldHeader();
      if(oldHeader && oldHeader.parentElement){
        oldHeader.insertAdjacentElement('beforebegin', header);
        oldHeader.classList.add('owner-old-header-hidden-v73');
      }else{
        document.body.insertAdjacentElement('afterbegin', header);
      }
    }else{
      const t = document.getElementById('ownerFacebookTitle');
      if(t) t.textContent = name;
    }

    // Remove old icon/logo headers if they exist from previous cached code.
    document.querySelectorAll('.owner-clean-logo,.owner-clean-brand .owner-clean-logo').forEach(el=>el.remove());

    // Normalize profile label.
    document.querySelectorAll('.tabs button,button,a').forEach(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(t === 'profil/poruke' || t === 'profil i poruke' || t === 'profil') el.textContent = 'Profil firme';
    });

    // Keep duplicate clone removed.
    const clone=document.getElementById('ownerStableNavClone');
    if(clone) clone.remove();
  }

  window.installOwnerFixedWideHeader=installFixedWideHeader;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded', installFixedWideHeader, {once:true});
  else installFixedWideHeader();
})();



/* Owner Remove Duplicate Nonworking v76 */
(function(){
  function onceReady(fn){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }
  function removeDuplicateNonworking(){
    const forms = Array.from(document.querySelectorAll('#blockedForm'));
    forms.slice(1).forEach(form => {
      const card = form.closest('.card, .soft-card, section, article');
      if(card && !card.id) card.remove();
      else form.remove();
    });

    const lists = Array.from(document.querySelectorAll('#blockedList'));
    lists.slice(1).forEach(list => {
      const card = list.closest('.card, .soft-card, section, article');
      if(card && !card.id) card.remove();
      else list.remove();
    });
  }

  onceReady(removeDuplicateNonworking);
})();



/* Owner Manual Appointment Toggle v77 */
(function(){
  function onceReady(fn){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }
  function setupManualAppointmentToggle(){
    const btn = document.getElementById('toggleManualAppointment');
    const panel = document.getElementById('manualAppointmentPanel');
    if(!btn || !panel || btn.dataset.toggleReady) return;

    btn.dataset.toggleReady = '1';
    btn.addEventListener('click', async () => {
      const open = panel.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.classList.toggle('open', open);

      const plus = btn.querySelector('.manual-plus');
      if(plus) plus.textContent = open ? '−' : '+';

      if(open && typeof loadManualOptions === 'function'){
        try{ await loadManualOptions(); }catch(e){}
      }
    });
  }

  onceReady(setupManualAppointmentToggle);
})();



/* Owner Remove Novo Badge v78 */
(function(){
  function onceReady(fn){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }
  function removeNovoBadges(){
    document.querySelectorAll('.novo,.new-badge,.manual-new-badge,.owner-new-badge,.badge-novo,[data-badge="novo"]').forEach(el=>el.remove());
    document.querySelectorAll('span,b,small,em,strong').forEach(el=>{
      if((el.textContent||'').trim().toUpperCase()==='NOVO') el.remove();
    });
  }
  onceReady(removeNovoBadges);
})();



/* Owner Manual Modal Center v79 */
(function(){
  function isOpen(){
    const panel = document.getElementById('manualAppointmentPanel');
    return !!panel && !panel.classList.contains('hidden');
  }

  function openModal(){
    const btn = document.getElementById('toggleManualAppointment');
    const panel = document.getElementById('manualAppointmentPanel');
    if(!btn || !panel) return;

    panel.classList.remove('hidden');
    panel.classList.add('manual-modal-open');
    document.body.classList.add('manual-modal-body-open');
    btn.setAttribute('aria-expanded','true');
    btn.classList.add('open');

    const plus = btn.querySelector('.manual-plus');
    if(plus) plus.textContent = '−';

    // Bez automatskog fokusa: na telefonu tastatura više ne iskače odmah.

    if(typeof loadManualOptions === 'function'){
      try{ loadManualOptions(); }catch(e){}
    }
  }

  async function closeModal(force=false){
    if(!force && typeof confirmDiscardUnsavedChangesAsync==='function' && !(await confirmDiscardUnsavedChangesAsync())) return;
    const btn = document.getElementById('toggleManualAppointment');
    const panel = document.getElementById('manualAppointmentPanel');
    if(!btn || !panel) return;

    panel.classList.add('hidden');
    panel.classList.remove('manual-modal-open');
    document.body.classList.remove('manual-modal-body-open');
    btn.setAttribute('aria-expanded','false');
    btn.classList.remove('open');

    const plus = btn.querySelector('.manual-plus');
    if(plus) plus.textContent = '+';
  }

  function install(){
    const btn = document.getElementById('toggleManualAppointment');
    const panel = document.getElementById('manualAppointmentPanel');
    const close = document.getElementById('closeManualAppointment');
    if(!btn || !panel) return;

    if(!btn.dataset.modalCenterReady){
      btn.dataset.modalCenterReady = '1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if(isOpen()) closeModal();
        else openModal();
      }, true);
    }

    if(close && !close.dataset.modalCenterReady){
      close.dataset.modalCenterReady = '1';
      close.addEventListener('click', function(ev){
        ev.preventDefault();
        closeModal();
      });
    }

    if(!panel.dataset.backdropReady){
      panel.dataset.backdropReady = '1';
      panel.addEventListener('mousedown', function(ev){
        if(ev.target === panel) closeModal();
      });
    }
  }

  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape' && isOpen()) closeModal();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();

// profile location modal escape v115
document.addEventListener('keydown', function(ev){
 if(ev.key==='Escape' && typeof profileLocationModal!=='undefined' && !profileLocationModal.classList.contains('hidden')){
  closeProfileLocationModalFn();
 }
});

/* Owner field placeholders everywhere v162
   Labels beside/above fields are moved into placeholders, while checkbox labels stay visible. */
(function installOwnerFieldPlaceholdersEverywhereV162(){
  if(window.__ownerFieldPlaceholdersEverywhereV162)return;
  window.__ownerFieldPlaceholdersEverywhereV162=true;

  const SKIP_INPUT_TYPES=new Set(['checkbox','radio','hidden','submit','button','reset','file']);

  function cleanText(value){
    return String(value||'').replace(/\s+/g,' ').replace(/[:：]+$/,'').trim();
  }

  function visibleControls(label){
    return Array.from(label.querySelectorAll('input,select,textarea')).filter(ctrl=>{
      if(!ctrl || !ctrl.tagName)return false;
      if(ctrl.tagName.toLowerCase()==='input'){
        const type=String(ctrl.getAttribute('type')||'text').toLowerCase();
        if(SKIP_INPUT_TYPES.has(type))return false;
      }
      return true;
    });
  }

  function hasCheckboxOrRadio(label){
    return !!label.querySelector('input[type="checkbox"],input[type="radio"]');
  }

  function getLabelText(label){
    const clone=label.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,button,script,style').forEach(el=>el.remove());
    return cleanText(clone.textContent);
  }

  function removeDirectLabelText(label){
    Array.from(label.childNodes).forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE){
        node.textContent='';
      }
    });
  }

  function applyToSelect(select,text){
    if(!text)return;
    if(!select.getAttribute('aria-label'))select.setAttribute('aria-label',text);
    select.dataset.placeholder=text;
    const first=select.options && select.options.length ? select.options[0] : null;
    if(first && !String(first.value||'').trim() && !cleanText(first.textContent)){
      first.textContent=text;
    }
  }

  function applyToLabel(label){
    if(!label || label.dataset.placeholderizedV162==='1')return;
    if(hasCheckboxOrRadio(label))return;
    const controls=visibleControls(label);
    if(!controls.length)return;
    const text=label.dataset.fieldLabelText || getLabelText(label);
    if(!text)return;

    label.dataset.fieldLabelText=text;
    label.classList.add('tp-placeholder-label-v162');

    controls.forEach(ctrl=>{
      const tag=ctrl.tagName.toLowerCase();
      if(tag==='input' || tag==='textarea'){
        ctrl.setAttribute('placeholder',text);
        if(!ctrl.getAttribute('aria-label'))ctrl.setAttribute('aria-label',text);
      }else if(tag==='select'){
        applyToSelect(ctrl,text);
      }
    });

    removeDirectLabelText(label);
    label.dataset.placeholderizedV162='1';
  }

  function applyEverywhere(root=document){
    try{
      (root.querySelectorAll ? root : document).querySelectorAll('label').forEach(applyToLabel);
      (root.querySelectorAll ? root : document).querySelectorAll('.staff-phone-title-v158,.multi-phone-title-v159').forEach(el=>{
        el.classList.add('tp-hidden-field-title-v162');
      });
      document.querySelectorAll('select[data-placeholder]').forEach(sel=>{
        const text=sel.dataset.placeholder;
        if(text)applyToSelect(sel,text);
      });
    }catch(_e){}
  }

  function scheduleApply(){
    clearTimeout(window.__ownerPlaceholderTimerV162);
    window.__ownerPlaceholderTimerV162=setTimeout(()=>applyEverywhere(document),30);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>applyEverywhere(document),{once:true});
  }else{
    applyEverywhere(document);
  }

  const obs=new MutationObserver(scheduleApply);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.applyOwnerFieldPlaceholdersEverywhereV162=applyEverywhere;
})();



/* Manual appointment cancel label + close submit fix v166 */
(function(){
  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  ready(function(){
    const cancel=document.getElementById('manualCancel');
    if(cancel)cancel.textContent='Poništi';
  });
})();


/* Staff phone typing no-jitter v168 */


/* Staff phone stable while typing v172 */


/* Staff phone first-digit center fix v173 */


/* Staff phone locked center while typing v174 */


/* Staff phone no first digit jump v175 */


/* Staff active phone row centered v176 */


/* Staff add phone prevent scroll flash v177 */


/* Staff first empty phone click fix v178 */


/* Schedule section restyled like reference v179 */


/* Button labels Poništi v180 */
(function(){
  function ready(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  ready(function(){
    const manualCancel=document.getElementById('manualCancel');
    if(manualCancel)manualCancel.textContent='Poništi';
    const resetStaff=document.getElementById('resetStaff');
    if(resetStaff)resetStaff.textContent='Poništi';
    const staffSave=document.querySelector('#staffModal .staff-modal-actions-v145 button[type="submit"]');
    if(staffSave)staffSave.textContent='Sačuvaj radnika';
  });
})();


/* Profile location primary move fix v183 */


/* QR PDF options modal v185 */


/* QR PDF Android blank preview fix v186 */
