const WORKER_TOKEN_KEY='terminiWorkerToken';
const WORKER_ACCESS_KEY='terminiWorkerAccessToken';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().split('T')[0];
let state={me:null,locations:[],appointments:[],selected:null,services:[],staff:[]};
function accessFromUrl(){
 const p=new URLSearchParams(location.search);
 let tok=p.get('token')||p.get('kod')||'';
 const m=location.pathname.match(/^\/w\/([^\/\?]+)/);
 if(m)tok=decodeURIComponent(m[1]);
 return tok;
}
function normalizeAccess(v){
 v=String(v||'').trim();
 try{let u=new URL(v);let m=u.pathname.match(/^\/w\/([^\/\?]+)/);if(m)return decodeURIComponent(m[1]);let q=u.searchParams.get('token')||u.searchParams.get('kod');if(q)return q;}catch(e){}
 return v.replace(/^.*\/w\//,'').trim();
}
async function plainApi(u,o={}){const r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Greška');return d}
async function api(u,o={}){const h={'Content-Type':'application/json',...(o.headers||{})};const t=localStorage.getItem(WORKER_TOKEN_KEY);if(t)h.Authorization='Bearer '+t;const r=await fetch(u,{...o,headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Greška');return d}
function msg(el,text,type=''){if(!el)return;el.textContent=text||'';el.className='msg '+type}
function showLogin(){workerLogin.classList.remove('hidden');workerApp.classList.add('hidden');workerLogout.classList.add('hidden')}
function showApp(){workerLogin.classList.add('hidden');workerApp.classList.remove('hidden');workerLogout.classList.remove('hidden')}
function statusText(s){return {booked:'Zakazan',completed:'Završen',cancelled:'Otkazan',no_show:'Nije došao'}[s]||s||''}
async function loadMe(){
 const d=await api('/api/worker/me');
 state.me=d;state.locations=d.locations||[];
 workerTitle.textContent=d.business.name+' · '+d.worker.name;
 workerSub.textContent=d.worker.title||'Radnički pristup preko telefona';
 showApp();
 return d;
}
async function refreshLocationsForDate(){
 const date=workerDate.value||today();
 const d=await api('/api/worker/locations-for-date?'+new URLSearchParams({date}));
 const old=workerLocation.value;
 const locs=d.locations||[];
 workerLocation.innerHTML=locs.length?locs.map(l=>`<option value="${esc(l.id)}">${esc(l.name||'Lokacija')} ${l.city?('· '+esc(l.city)):''}</option>`).join(''):'<option value="">Ne radiš tog dana</option>';
 if(old&&locs.some(l=>String(l.id)===String(old)))workerLocation.value=old;
 if(workerManualLocation){
  const oldm=workerManualLocation.value;
  workerManualLocation.innerHTML=workerLocation.innerHTML;
  if(oldm&&locs.some(l=>String(l.id)===String(oldm)))workerManualLocation.value=oldm;
 }
 return locs;
}
async function loadAppointments(){
 try{
  if(!state.me)await loadMe();
  await refreshLocationsForDate();
  const p=new URLSearchParams({date:workerDate.value||today()});
  if(workerLocation.value)p.set('location_id',workerLocation.value);
  if(workerStatus.value)p.set('status',workerStatus.value);
  const rows=await api('/api/worker/appointments?'+p);
  state.appointments=rows;
  renderAppointments(rows);
 }catch(e){msg(workerMsg,e.message||'Greška','err')}
}
function renderAppointments(rows){
 workerAppointments.innerHTML='<tr><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Lokacija</th><th>Status</th><th>Akcija</th></tr>'+((rows||[]).length?rows.map(a=>`<tr class="tablet-appt-row-v126"><td><b>${esc(a.start_time)}–${esc(a.end_time)}</b></td><td>${esc(a.customer_name)}<br><span class="muted">${esc(a.phone)}</span></td><td>${esc(a.service_name)}</td><td>${esc(a.staff_name||'-')}</td><td>${esc(a.location_name||'-')}</td><td><span class="tablet-status-badge-v126">${esc(statusText(a.status))}</span></td><td><button class="btn small ghost worker-open-status-v136" type="button" data-id="${esc(a.id)}">Otvori</button></td></tr>`).join(''):'<tr><td colspan="7"><p class="muted">Nema termina za izabrani datum.</p></td></tr>');
 workerAppointments.querySelectorAll('.worker-open-status-v136').forEach(b=>b.onclick=()=>openStatusModal(b.dataset.id));
}
function openStatusModal(id){const a=state.appointments.find(x=>String(x.id)===String(id));if(!a)return;state.selected=a;workerModalTitle.textContent=`${a.start_time} · ${a.customer_name}`;workerModalHint.textContent=`${a.service_name} · ${a.staff_name||'-'} · ${a.location_name||''} · trenutno: ${statusText(a.status)}`;workerStatusReason.value='';workerStatusModal.classList.remove('hidden')}
function closeStatusModal(){workerStatusModal.classList.add('hidden');state.selected=null}
async function changeStatus(status){const a=state.selected;if(!a)return;const extra=status==='cancelled'||status==='no_show';if(extra&&!workerStatusReason.value.trim()){workerStatusReason.focus();return alert('Unesi razlog za ovu promenu.')}if(!confirm(`Da li sigurno želiš da promeniš status termina u "${statusText(status)}"?`))return;await api('/api/worker/appointments/'+encodeURIComponent(a.id)+'/status',{method:'PATCH',body:JSON.stringify({status,reason:workerStatusReason.value})});closeStatusModal();msg(workerMsg,'Status je promenjen.','ok');await loadAppointments()}
async function loadManualOptions(){
 await refreshLocationsForDate();
 if(!workerManualDate.value)workerManualDate.value=workerDate.value||today();
 if(workerManualLocation&&workerLocation.value&&!workerManualLocation.value)workerManualLocation.value=workerLocation.value;
 if(!workerManualLocation.value){workerManualService.innerHTML='<option value="">Ne radiš tog dana</option>';workerManualTime.innerHTML='<option value="">Nema slobodnih termina</option>';return;}
 const p=new URLSearchParams({date:workerManualDate.value||today(),location_id:workerManualLocation.value});
 const d=await api('/api/worker/options?'+p);
 state.services=d.services||[];state.staff=d.staff||[];
 const oldS=workerManualService.value,oldSt=workerManualStaff.value;
 workerManualService.innerHTML=state.services.length?state.services.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.duration)} min</option>`).join(''):'<option value="">Nema usluga</option>';
 if(oldS&&state.services.some(x=>String(x.id)===String(oldS)))workerManualService.value=oldS;
 workerManualStaff.innerHTML='<option value="">Bilo koji slobodan radnik</option>'+state.staff.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 if(oldSt&&state.staff.some(x=>String(x.id)===String(oldSt)))workerManualStaff.value=oldSt;
 await updateManualSlots();
}
async function updateManualSlots(){
 if(!workerManualService.value||!workerManualLocation.value){workerManualTime.innerHTML='<option value="">Nema slobodnih termina</option>';return;}
 workerManualTime.innerHTML='<option value="">Učitavam...</option>';
 try{
  const p=new URLSearchParams({date:workerManualDate.value||today(),location_id:workerManualLocation.value,service_id:workerManualService.value});
  if(workerManualStaff.value)p.set('staff_id',workerManualStaff.value);
  const rows=await api('/api/worker/available-slots?'+p);
  workerManualTime.innerHTML=rows.length?rows.map(x=>`<option value="${esc(x.start_time)}" data-staff="${esc(x.staff_id)}">${esc(x.start_time)}–${esc(x.end_time)} · ${esc(x.staff_name||'Radnik')}</option>`).join(''):'<option value="">Nema slobodnih termina</option>';
 }catch(e){workerManualTime.innerHTML='<option value="">Greška</option>';msg(workerMsg,e.message||'Greška','err')}
}
function openManual(){workerManualPanel.classList.remove('hidden');workerManualPanel.classList.add('manual-modal-open');document.body.classList.add('manual-modal-body-open');workerToggleManual.classList.add('open');workerToggleManual.setAttribute('aria-expanded','true');workerManualDate.value=workerDate.value||today();loadManualOptions().then(()=>setTimeout(()=>workerManualName.focus({preventScroll:true}),80)).catch(e=>msg(workerMsg,e.message||'Greška','err'))}
function closeManual(){workerManualPanel.classList.add('hidden');workerManualPanel.classList.remove('manual-modal-open');document.body.classList.remove('manual-modal-body-open');workerToggleManual.classList.remove('open');workerToggleManual.setAttribute('aria-expanded','false')}
async function submitManual(e){
 e.preventDefault();
 const selected=workerManualTime.options[workerManualTime.selectedIndex];
 if(!workerManualTime.value)return msg(workerMsg,'Izaberi slobodno vreme.','err');
 await api('/api/worker/appointments',{method:'POST',body:JSON.stringify({customer_name:workerManualName.value,phone:workerManualPhone.value,email:workerManualEmail.value,location_id:workerManualLocation.value,service_id:workerManualService.value,staff_id:workerManualStaff.value||(selected?selected.dataset.staff:''),date:workerManualDate.value,start_time:workerManualTime.value,notes:workerManualNotes.value})});
 msg(workerMsg,'Termin je dodat.','ok');workerDate.value=workerManualDate.value||workerDate.value||today();workerManualName.value='';workerManualPhone.value='';workerManualEmail.value='';workerManualNotes.value='';closeManual();await loadAppointments();await loadManualOptions();
}
workerLoginForm.onsubmit=async e=>{e.preventDefault();msg(workerLoginMsg,'Proveravam...');try{const access=normalizeAccess(workerAccessToken.value||localStorage.getItem(WORKER_ACCESS_KEY)||accessFromUrl());const d=await plainApi('/api/worker/login',{method:'POST',body:JSON.stringify({access_token:access,pin:workerPin.value})});localStorage.setItem(WORKER_TOKEN_KEY,d.token);localStorage.setItem(WORKER_ACCESS_KEY,access);workerPin.value='';msg(workerLoginMsg,'Uspesna prijava.','ok');await loadMe();await loadAppointments()}catch(err){msg(workerLoginMsg,err.message||'Neuspešna prijava.','err')}};
workerLogout.onclick=()=>{localStorage.removeItem(WORKER_TOKEN_KEY);showLogin()};
workerLoad.onclick=loadAppointments;workerDate.onchange=()=>loadAppointments().then(()=>loadManualOptions()).catch(()=>{});workerLocation.onchange=loadAppointments;workerStatus.onchange=loadAppointments;workerToggleManual.onclick=openManual;workerCloseManual.onclick=closeManual;workerManualPanel.addEventListener('mousedown',e=>{if(e.target===workerManualPanel)closeManual()});workerManualDate.onchange=loadManualOptions;workerManualLocation.onchange=loadManualOptions;workerManualService.onchange=updateManualSlots;workerManualStaff.onchange=updateManualSlots;workerManualSlotRefresh.onclick=updateManualSlots;workerManualForm.onsubmit=e=>submitManual(e).catch(err=>msg(workerMsg,err.message||'Greška pri dodavanju termina.','err'));
workerModalClose.onclick=closeStatusModal;workerStatusModal.addEventListener('mousedown',e=>{if(e.target===workerStatusModal)closeStatusModal()});document.querySelectorAll('#workerStatusModal [data-status]').forEach(b=>b.onclick=()=>changeStatus(b.dataset.status).catch(e=>alert(e.message)));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeStatusModal();closeManual()}});
if(!workerDate.value)workerDate.value=today();if(!workerManualDate.value)workerManualDate.value=today();
const fromUrl=accessFromUrl();if(fromUrl){workerAccessToken.value=fromUrl;localStorage.setItem(WORKER_ACCESS_KEY,fromUrl);workerAccessWrap.classList.add('hidden');}
if(localStorage.getItem(WORKER_TOKEN_KEY)){loadMe().then(loadAppointments).catch(()=>{localStorage.removeItem(WORKER_TOKEN_KEY);showLogin()})}else showLogin();
