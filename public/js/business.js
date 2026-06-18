
function esc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[m]));
}
window.esc=window.esc||esc;

function publicPhoneList(value){
  return String(value||'')
    .split(/[\n,;|/]+/)
    .map(x=>x.trim())
    .filter(Boolean)
    .filter((x,i,a)=>a.indexOf(x)===i)
    .slice(0,10);
}
function phoneChips(value){
  const nums = publicPhoneList(value);
  if(!nums.length) return '';
  return `<div class="public-phone-list">${nums.map(n=>`<a class="public-phone-chip" href="tel:${n.replace(/[^0-9+]/g,'')}">${esc(n)}</a>`).join('')}</div>`;
}

function fieldWrap(el){
  if(!el) return null;
  let p = el.parentElement;
  while(p && p !== document.body){
    const tag = (p.tagName||'').toLowerCase();
    if(tag === 'label' || p.classList.contains('field') || p.classList.contains('form-row') || p.classList.contains('input-group')) return p;
    p = p.parentElement;
  }
  return el;
}
function setStaffVisibility(count){
  const box = fieldWrap(staff);
  if(!box) return;
  box.style.display = count <= 1 ? 'none' : '';
  const visibleStaff = (typeof filteredStaff === 'function') ? filteredStaff() : (state.staff || []);
  if(count <= 1 && visibleStaff.length === 1){
    staff.value = String(visibleStaff[0].id);
  }
}
function hideStaffPublicSectionIfNeeded(count){
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,p,div,section'));
  const title = headings.find(el => (el.textContent||'').trim() === 'Radnici');
  if(!title) return;
  let section = title.closest('section') || title.closest('.card') || title.parentElement;
  while(section && section !== document.body){
    const txt = (section.textContent||'').trim();
    if(txt.includes('Radnici') && (txt.includes('TIM') || txt.includes('Majstor') || txt.includes('radnik') || txt.length < 500)) break;
    section = section.parentElement;
  }
  if(section && section !== document.body) section.style.display = count <= 1 ? 'none' : '';
}

const slug=location.pathname.split('/').filter(Boolean).pop();
const $=s=>document.querySelector(s);
let state={};
async function api(u,o={}){let r=await fetch(u,o),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}
const money=v=>Number(v||0).toLocaleString('sr-RS')+' RSD',today=()=>new Date().toISOString().split('T')[0],addDays=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]},fd=d=>d?d.split('-').reverse().join('.')+'.':'';
function note(t,txt,c=''){notice.className='notice '+c;notice.innerHTML=`<b>${t}</b><br><span>${txt}</span>`}
function suggestions(arr){if(!arr?.length)return '';return `<div class="suggestions">${arr.map(x=>`<button type="button" data-date="${x.date}" data-time="${x.start_time}" data-staff="${x.staff_id}">${fd(x.date)} ${x.start_time} · ${x.staff_name}</button>`).join('')}</div>`}
function currentLocation(){
  const locs=state.locations||[];
  if(!locs.length)return null;
  const val=(typeof businessLocation!=='undefined'&&businessLocation)?businessLocation.value:'';
  return locs.find(l=>String(l.id)===String(val)) || locs[0];
}
function allowedAtCurrentLocation(item){
  const loc=currentLocation();
  if(!loc||!loc.id)return true;
  const ids=Array.isArray(item.location_ids)?item.location_ids.map(String):[];
  return !ids.length || ids.includes(String(loc.id));
}
function selectedDateValue(){return (typeof date!=='undefined'&&date&&date.value)?date.value:today()}
function staffScheduledAtCurrentLocation(item){
  const loc=currentLocation();
  if(!loc||!loc.id)return true;
  const sched=Array.isArray(item.location_schedule)?item.location_schedule:[];
  if(!sched.length)return true;
  const val=selectedDateValue();
  const d=/^\d{4}-\d{2}-\d{2}$/.test(val)?new Date(val+'T12:00:00').getDay():new Date().getDay();
  const r=sched.find(x=>Number(x.day)===d);
  return !!(r&&r.is_working&&String(r.location_id)===String(loc.id));
}
function filteredServices(){return (state.services||[]).filter(x=>allowedAtCurrentLocation(x))}
function filteredStaff(){return (state.staff||[]).filter(x=>allowedAtCurrentLocation(x)&&staffScheduledAtCurrentLocation(x))}
function renderBookingChoices(){
  const oldService=service.value,oldStaff=staff.value;
  const ss=filteredServices(), st=filteredStaff();
  service.innerHTML='';services.innerHTML='';staff.innerHTML='<option value="">Bilo koji slobodan radnik</option>';staffGrid.innerHTML='';
  ss.forEach(s=>{let o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} · ${s.duration} min · ${money(s.price)}`;service.appendChild(o);services.insertAdjacentHTML('beforeend',`<article class="item"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.description||'')}</p><div class="badges"><span>${s.duration} min</span><span>${money(s.price)}</span></div></article>`)});
  if(oldService && ss.some(x=>String(x.id)===String(oldService)))service.value=oldService;
  st.forEach(p=>{let o=document.createElement('option');o.value=p.id;o.textContent=p.name+(p.title?' · '+p.title:'');staff.appendChild(o);staffGrid.insertAdjacentHTML('beforeend',`<article class="item"><h3>${esc(p.name)}</h3><p class="muted">${esc(p.title||'Radnik')}</p></article>`)});
  if(oldStaff && st.some(x=>String(x.id)===String(oldStaff)))staff.value=oldStaff;
  setStaffVisibility(st.length);hideStaffPublicSectionIfNeeded(st.length);
  if(!ss.length){slot.innerHTML='<option value="">Nema usluga za ovu lokaciju</option>';note('Nema usluga','Za izabranu lokaciju trenutno nema dostupnih usluga.','err')}
}
function updateLocationInfo(){
  const b=state.business||{}, l=currentLocation();
  const showLoc=(state.locations||[]).length>1;
  if(typeof businessLocationWrap!=='undefined')businessLocationWrap.classList.toggle('hidden',!showLoc);
  const city=(l&&l.city)||b.city||'';
  const address=(l&&l.address)||b.address||'';
  const phone=(l&&l.phone)||b.phone||'';
  const locName=showLoc&&l?`<span>${esc(l.name||'Lokacija')}</span>`:'';
  badges.innerHTML=[locName,city?`<span>${esc(city)}</span>`:'',address?`<span>${esc(address)}</span>`:'',phoneChips(phone),b.instagram?`<span>${esc(b.instagram)}</span>`:'',b.website?`<a href="${esc(b.website)}" target="_blank">Website</a>`:''].filter(Boolean).join('');
}
async function load(){
  let d=await api('/api/businesses/'+slug);state=d;let b=d.business;
  document.title=b.name;headName.textContent=b.name;bizName.textContent=b.name;bizType.textContent=b.type||'Firma';desc.textContent=b.description||'';desc.style.display=(b.description&&b.description.trim())?'':'none';
  if(typeof businessLocation!=='undefined'){
    const locs=d.locations||[];
    businessLocation.innerHTML=locs.map((l,i)=>`<option value="${l.id}">${esc(l.name||('Lokacija '+(i+1)))}</option>`).join('');
    const wanted=new URLSearchParams(window.location.search).get('loc');
    if(wanted && locs.some(l=>String(l.id)===String(wanted)))businessLocation.value=wanted;
    businessLocation.onchange=()=>{updateLocationInfo();renderBookingChoices();loadSlots()};
  }
  date.min=today();date.max=addDays(d.settings.max_days||45);if(!date.value)date.value=today();
  updateLocationInfo();
  renderBookingChoices();
  if(!d.booking_enabled){form.classList.add('hidden');note('Zakazivanje nije aktivno',d.booking_disabled_reason,'err');return}
  await loadSlots();
}
async function loadSlots(pref=''){
  if(!service.value){slot.innerHTML='<option value="">Nema usluga</option>';return;}
  slot.innerHTML='<option>Učitavanje...</option>';note('Provera','Proveravam zauzetost...');
  try{let p=new URLSearchParams({service_id:service.value,date:date.value});if(staff.value)p.set('staff_id',staff.value);let loc=currentLocation();if(loc&&loc.id)p.set('location_id',loc.id);let rows=await api(`/api/businesses/${slug}/available-slots?${p}`);if(!rows.length){slot.innerHTML='<option value="">Nema termina</option>';let n=await api(`/api/businesses/${slug}/next-available?${p}&from_date=${date.value}`);if(n.first_available){notice.className='notice warn';notice.innerHTML=`<b>Taj dan je zauzet</b><br><span>Najbliži slobodan termin je ${fd(n.first_available.date)} u ${n.first_available.start_time} kod ${n.first_available.staff_name}.</span>${suggestions(n.suggestions)}`;notice.querySelectorAll('button').forEach(b=>b.onclick=async()=>{date.value=b.dataset.date;staff.value=b.dataset.staff;await loadSlots(b.dataset.time)});}else note('Nema termina','Nema slobodnih termina u narednim danima.','err');return}slot.innerHTML='';rows.forEach(x=>{let o=document.createElement('option');o.value=x.start_time;o.dataset.staffId=x.staff_id;o.textContent=`${x.start_time} - ${x.end_time} · ${x.staff_name}`;slot.appendChild(o)});if(pref)slot.value=pref;note('Termin je dostupan',`Prvi slobodan termin je ${rows[0].start_time} kod ${rows[0].staff_name}.`,'ok')}catch(e){note('Greška',e.message,'err')}
}
form.onsubmit=async e=>{e.preventDefault();try{let opt=slot.options[slot.selectedIndex];let loc=currentLocation();let d=await api(`/api/businesses/${slug}/appointments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location_id:loc?loc.id:'',service_id:+service.value,staff_id:staff.value?+staff.value:+opt.dataset.staffId,date:date.value,start_time:slot.value,customer_name:name.value,phone:phone.value,email:email.value,notes:notes.value})});m.textContent=d.customer_note?`${d.message} ${d.customer_note}`:d.message;m.className='msg ok';manage.classList.remove('hidden');manage.innerHTML=`<b>Link za promenu/otkazivanje</b><p class="muted">Sačuvaj ovaj link.</p><a class="btn small" href="${d.manage_url}">Otvori moj termin</a><button id="copyM" type="button" class="btn small ghost">Kopiraj</button>`;copyM.onclick=async()=>{await navigator.clipboard.writeText(d.manage_url);copyM.textContent='Kopirano'};await loadSlots()}catch(e){m.textContent=e.message;m.className='msg err';await loadSlots()}};
service.onchange=()=>loadSlots();staff.onchange=()=>loadSlots();date.onchange=()=>{renderBookingChoices();loadSlots();};
load().catch(e=>document.body.innerHTML=e.message);
