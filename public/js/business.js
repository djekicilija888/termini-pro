
function publicPhoneList(value){
  return String(value||'')
    .split(/[\n,;]+/)
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
  if(count <= 1 && state.staff && state.staff.length === 1){
    staff.value = String(state.staff[0].id);
  }
}


function hideStaffPublicSectionIfNeeded(count){
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,p,div,section'));
  const title = headings.find(el => (el.textContent||'').trim() === 'Radnici');
  if(!title) return;

  let section = title.closest('section') || title.closest('.card') || title.parentElement;
  while(section && section !== document.body){
    const txt = (section.textContent||'').trim();
    if(txt.includes('Radnici') && (txt.includes('TIM') || txt.includes('Majstor') || txt.includes('radnik') || txt.length < 500)){
      break;
    }
    section = section.parentElement;
  }

  if(section && section !== document.body){
    section.style.display = count <= 1 ? 'none' : '';
  }
}

const slug=location.pathname.split('/').filter(Boolean).pop();const $=s=>document.querySelector(s);let state={};async function api(u,o={}){let r=await fetch(u,o),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}const money=v=>Number(v||0).toLocaleString('sr-RS')+' RSD',today=()=>new Date().toISOString().split('T')[0],addDays=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]},fd=d=>d?d.split('-').reverse().join('.')+'.':'';function note(t,txt,c=''){notice.className='notice '+c;notice.innerHTML=`<b>${t}</b><br><span>${txt}</span>`}function suggestions(arr){if(!arr?.length)return '';return `<div class="suggestions">${arr.map(x=>`<button type="button" data-date="${x.date}" data-time="${x.start_time}" data-staff="${x.staff_id}">${fd(x.date)} ${x.start_time} · ${x.staff_name}</button>`).join('')}</div>`}async function load(){let d=await api('/api/businesses/'+slug);state=d;let b=d.business;document.title=b.name;headName.textContent=b.name;bizName.textContent=b.name;bizType.textContent=b.type||'Firma';desc.textContent=b.description||'';desc.style.display=(b.description&&b.description.trim())?'':'none';badges.innerHTML=[b.city?`<span>${esc(b.city)}</span>`:'', phoneChips(b.phone), b.instagram?`<span>${esc(b.instagram)}</span>`:'', b.website?`<a href="${esc(b.website)}" target="_blank">Website</a>`:''].filter(Boolean).join('');service.innerHTML='';d.services.forEach(s=>{let o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} · ${s.duration} min · ${money(s.price)}`;service.appendChild(o);services.insertAdjacentHTML('beforeend',`<article class="item"><h3>${s.name}</h3><p class="muted">${s.description||''}</p><div class="badges"><span>${s.duration} min</span><span>${money(s.price)}</span></div></article>`)});d.staff.forEach(p=>{let o=document.createElement('option');setStaffVisibility((state.staff||[]).length);hideStaffPublicSectionIfNeeded((state.staff||[]).length);o.value=p.id;o.textContent=p.name+(p.title?' · '+p.title:'');staff.appendChild(o);staffGrid.insertAdjacentHTML('beforeend',`<article class="item"><h3>${p.name}</h3><p class="muted">${p.title||'Radnik'}</p></article>`)});date.min=today();date.max=addDays(d.settings.max_days||45);date.value=today();if(!d.booking_enabled){form.classList.add('hidden');note('Zakazivanje nije aktivno',d.booking_disabled_reason,'err');return}await loadSlots()}async function loadSlots(pref=''){slot.innerHTML='<option>Učitavanje...</option>';note('Provera','Proveravam zauzetost...');try{let p=new URLSearchParams({service_id:service.value,date:date.value});if(staff.value)p.set('staff_id',staff.value);let rows=await api(`/api/businesses/${slug}/available-slots?${p}`);if(!rows.length){slot.innerHTML='<option value="">Nema termina</option>';let n=await api(`/api/businesses/${slug}/next-available?${p}&from_date=${date.value}`);if(n.first_available){notice.className='notice warn';notice.innerHTML=`<b>Taj dan je zauzet</b><br><span>Najbliži slobodan termin je ${fd(n.first_available.date)} u ${n.first_available.start_time} kod ${n.first_available.staff_name}.</span>${suggestions(n.suggestions)}`;notice.querySelectorAll('button').forEach(b=>b.onclick=async()=>{date.value=b.dataset.date;staff.value=b.dataset.staff;await loadSlots(b.dataset.time)});}else note('Nema termina','Nema slobodnih termina u narednim danima.','err');return}slot.innerHTML='';rows.forEach(x=>{let o=document.createElement('option');o.value=x.start_time;o.dataset.staffId=x.staff_id;o.textContent=`${x.start_time} - ${x.end_time} · ${x.staff_name}`;slot.appendChild(o)});if(pref)slot.value=pref;note('Termin je dostupan',`Prvi slobodan termin je ${rows[0].start_time} kod ${rows[0].staff_name}.`,'ok')}catch(e){note('Greška',e.message,'err')}}form.onsubmit=async e=>{e.preventDefault();try{let opt=slot.options[slot.selectedIndex];let d=await api(`/api/businesses/${slug}/appointments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:+service.value,staff_id:staff.value?+staff.value:+opt.dataset.staffId,date:date.value,start_time:slot.value,customer_name:name.value,phone:phone.value,email:email.value,notes:notes.value})});m.textContent=d.customer_note?`${d.message} ${d.customer_note}`:d.message;m.className='msg ok';manage.classList.remove('hidden');manage.innerHTML=`<b>Link za promenu/otkazivanje</b><p class="muted">Sačuvaj ovaj link.</p><a class="btn small" href="${d.manage_url}">Otvori moj termin</a><button id="copyM" type="button" class="btn small ghost">Kopiraj</button>`;copyM.onclick=async()=>{await navigator.clipboard.writeText(d.manage_url);copyM.textContent='Kopirano'};await loadSlots()}catch(e){m.textContent=e.message;m.className='msg err';await loadSlots()}};[service,staff,date].forEach(x=>x.onchange=()=>loadSlots());load().catch(e=>document.body.innerHTML=e.message);