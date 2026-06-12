const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];let tok=()=>localStorage.getItem(T)||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}function msg(t,c=''){om.textContent=t;om.className='msg '+c}function show(){login.classList.add('hidden');app.classList.remove('hidden')}function hide(){login.classList.remove('hidden');app.classList.add('hidden')}loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};logout.onclick=()=>{localStorage.removeItem(T);hide()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));function tab(id){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');msg('');({dash:loadDash,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,blocked:loadBlocked,gallery:loadGallery,settings:loadSettings,logs:loadLogs}[id]||(()=>{}))()}async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent=d.business.name;bookingUrl.value=d.business.booking_url;openLink.href=d.business.booking_url;qr.src='/api/owner/qr?t='+Date.now();cards.innerHTML=`<div class="item"><b>Danas</b><h2>${d.cards.today}</h2></div><div class="item"><b>7 dana</b><h2>${d.cards.week}</h2></div><div class="item"><b>Usluge</b><h2>${d.cards.services}</h2></div><div class="item"><b>Radnici</b><h2>${d.cards.staff}</h2></div><div class="item"><b>Paket</b><h2>${d.business.subscription_plan}</h2><p>${d.business.subscription_status}</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td></tr>`).join('')}copyLink.onclick=async()=>{await navigator.clipboard.writeText(bookingUrl.value);msg('Link kopiran.','ok')};loadA.onclick=loadAppointments;async function loadAppointments(){if(!from.value)from.value=today();if(!to.value)to.value=add(30);let p=new URLSearchParams({from:from.value,to:to.value});if(status.value)p.set('status',status.value);let rows=await api('/api/owner/appointments?'+p);appointmentsBody.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th><th>Promeni</th></tr>'+rows.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}-${a.end_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td><td><select data-id="${a.id}"><option>booked</option><option>completed</option><option>cancelled</option><option>no_show</option></select></td></tr>`).join('');appointmentsBody.querySelectorAll('select').forEach(s=>{s.onchange=async()=>{await api('/api/owner/appointments/'+s.dataset.id+'/status',{method:'PATCH',body:JSON.stringify({status:s.value})});msg('Status promenjen.','ok');loadAppointments()}})}function resetSt(){staffId.value='';staffName.value='';staffTitle.value='';staffPhone.value='';staffEmail.value='';staffSort.value=0;staffActive.checked=true}resetStaff.onclick=resetSt;staffForm.onsubmit=async e=>{e.preventDefault();let id=staffId.value,p={name:staffName.value,title:staffTitle.value,phone:staffPhone.value,email:staffEmail.value,sort_order:+staffSort.value,active:staffActive.checked};await api(id?'/api/owner/staff/'+id:'/api/owner/staff',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Radnik sačuvan.','ok');resetSt();loadStaff()};async function loadStaff(){let rows=await api('/api/owner/staff');staffList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.title||''} ${x.phone||''}</p><div class="badges"><span>${x.active?'Aktivan':'Ugašen'}</span></div><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');staffList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);staffId.value=x.id;staffName.value=x.name;staffTitle.value=x.title||'';staffPhone.value=x.phone||'';staffEmail.value=x.email||'';staffSort.value=x.sort_order;staffActive.checked=!!x.active})}function resetSv(){serviceId.value='';serviceName.value='';serviceDesc.value='';serviceDuration.value=30;servicePrice.value=1000;serviceSort.value=0;serviceActive.checked=true}resetService.onclick=resetSv;serviceForm.onsubmit=async e=>{e.preventDefault();let id=serviceId.value,p={name:serviceName.value,description:serviceDesc.value,duration:+serviceDuration.value,price:+servicePrice.value,sort_order:+serviceSort.value,active:serviceActive.checked};await api(id?'/api/owner/services/'+id:'/api/owner/services',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Usluga sačuvana.','ok');resetSv();loadServices()};async function loadServices(){let rows=await api('/api/owner/services');serviceList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.duration} min · ${x.price} RSD</p><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');serviceList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);serviceId.value=x.id;serviceName.value=x.name;serviceDesc.value=x.description||'';serviceDuration.value=x.duration;servicePrice.value=x.price;serviceSort.value=x.sort_order;serviceActive.checked=!!x.active})}async function loadHours(){let rows=await api('/api/owner/working-hours');hoursForm.innerHTML=rows.map(x=>`<div class="item hour" data-day="${x.day}"><b>${day[x.day]}</b><label><input class="open" type="checkbox" ${x.is_open?'checked':''}> Otvoreno</label><input class="ot" type="time" value="${x.open_time}"><input class="ct" type="time" value="${x.close_time}"><input class="bs" type="time" value="${x.break_start||''}"><input class="be" type="time" value="${x.break_end||''}"></div>`).join('')}saveHours.onclick=async()=>{let rows=[...document.querySelectorAll('.hour')].map(x=>({day:+x.dataset.day,is_open:x.querySelector('.open').checked,open_time:x.querySelector('.ot').value,close_time:x.querySelector('.ct').value,break_start:x.querySelector('.bs').value,break_end:x.querySelector('.be').value}));await api('/api/owner/working-hours',{method:'PUT',body:JSON.stringify({rows})});msg('Radno vreme sačuvano.','ok')};blockedForm.onsubmit=async e=>{e.preventDefault();await api('/api/owner/blocked-dates',{method:'POST',body:JSON.stringify({date:blockedDate.value,reason:blockedReason.value})});msg('Datum blokiran.','ok');loadBlocked()};async function loadBlocked(){let rows=await api('/api/owner/blocked-dates');blockedList.innerHTML=rows.map(x=>`<article class="item"><b>${x.date}</b><p>${x.reason||''}</p><button data-date="${x.date}" class="btn small danger">Obriši</button></article>`).join('');blockedList.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await api('/api/owner/blocked-dates/'+b.dataset.date,{method:'DELETE'});loadBlocked()})}async function loadSettings(){let d=await api('/api/owner/settings'),b=d.business,s=d.settings;setName.value=b.name;setType.value=b.type;setCity.value=b.city;setPhone.value=b.phone;setInstagram.value=b.instagram;setAddress.value=b.address;setWebsite.value=b.website;setLogo.value=b.logo_url;setCover.value=b.cover_url;setDesc.value=b.description;setInterval.value=s.interval;setMin.value=s.min_notice;setMax.value=s.max_days;nCust.checked=!!s.notify_customer_email;nOwner.checked=!!s.notify_owner_email;nSms.checked=!!s.notify_sms;nViber.checked=!!s.notify_viber}settingsForm.onsubmit=async e=>{e.preventDefault();await api('/api/owner/settings',{method:'PUT',body:JSON.stringify({name:setName.value,type:setType.value,city:setCity.value,phone:setPhone.value,instagram:setInstagram.value,address:setAddress.value,website:setWebsite.value,logo_url:setLogo.value,cover_url:setCover.value,description:setDesc.value,interval:+setInterval.value,min_notice:+setMin.value,max_days:+setMax.value,notify_customer_email:nCust.checked,notify_owner_email:nOwner.checked,notify_sms:nSms.checked,notify_viber:nViber.checked})});msg('Podešavanja sačuvana.','ok')};async function loadLogs(){let rows=await api('/api/owner/notifications');logList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.channel} · ${x.status}</h3><p>${x.created_at} · ${x.recipient||''}</p><p class="muted">${(x.body||'').slice(0,220)}</p></article>`).join('')||'<p class="muted">Nema logova.</p>'}
async function apiForm(u,fd){
 let h={};
 if(tok())h.Authorization='Bearer '+tok();
 let r=await fetch(u,{method:'POST',headers:h,body:fd});
 let d=await r.json();
 if(!r.ok)throw Error(d.error||'Greška');
 return d;
}
function resetGallery(){
 if(typeof galleryFile!=='undefined')galleryFile.value='';
 if(typeof galleryTitle!=='undefined')galleryTitle.value='';
 if(typeof gallerySort!=='undefined')gallerySort.value=0;
 if(typeof galleryIsCover!=='undefined')galleryIsCover.checked=false;
}
function paintPreview(b){
 if(typeof avatarPreview!=='undefined'){
  avatarPreview.innerHTML=b&&b.logo_url?`<img src="${b.logo_url}" alt="Profilna slika">`:'<span>Profilna</span>';
 }
 if(typeof coverPreview!=='undefined'){
  coverPreview.innerHTML=b&&b.cover_url?'': '<span>Naslovna slika</span>';
  coverPreview.style.backgroundImage=b&&b.cover_url?`url("${b.cover_url}")`:'';
 }
}
async function refreshBusinessPreview(){
 try{let d=await api('/api/owner/settings');paintPreview(d.business||{});return d.business||{}}catch{return {}}
}
async function uploadPickedImage(kind,file,title='',sort=0,isCover=false){
 if(!file)throw Error('Izaberi sliku sa telefona ili računara.');
 let fd=new FormData();
 fd.append('image',file);
 fd.append('kind',kind);
 fd.append('title',title||'');
 fd.append('sort_order',String(sort||0));
 if(isCover)fd.append('is_cover','true');
 return apiForm('/api/owner/upload-image',fd);
}
if(typeof profileUploadForm!=='undefined')profileUploadForm.onsubmit=async e=>{
 e.preventDefault();
 try{
  let r=await uploadPickedImage('profile',profileFile.files[0]);
  msg(r.message,'ok');
  profileUploadForm.reset();
  await refreshBusinessPreview();
 }catch(err){msg(err.message,'err')}
};
if(typeof coverUploadForm!=='undefined')coverUploadForm.onsubmit=async e=>{
 e.preventDefault();
 try{
  let r=await uploadPickedImage('cover',coverFile.files[0],'Naslovna slika',0,true);
  msg(r.message,'ok');
  coverUploadForm.reset();
  await loadGallery();
 }catch(err){msg(err.message,'err')}
};
if(typeof galleryForm!=='undefined')galleryForm.onsubmit=async e=>{
 e.preventDefault();
 try{
  let r=await uploadPickedImage('gallery',galleryFile.files[0],galleryTitle.value,Number(gallerySort.value||0),galleryIsCover.checked);
  msg(r.message,'ok');
  resetGallery();
  await loadGallery();
 }catch(err){msg(err.message,'err')}
};
if(typeof resetGalleryBtn!=='undefined')resetGalleryBtn.onclick=resetGallery;
async function loadGallery(){
 let b=await refreshBusinessPreview();
 let rows=await api('/api/owner/gallery');
 galleryList.innerHTML=rows.length?'':'<div class="item">Još nema slika u albumu.</div>';
 rows.forEach(img=>{
  let d=document.createElement('div');
  d.className='gallery-admin-card';
  d.innerHTML=`<img src="${img.image_url}" loading="lazy"><div><h3>${img.title||'Slika bez naslova'}</h3><div class="badges">${img.is_cover?'<span>Naslovna</span>':''}<span>Redosled ${img.sort_order}</span></div><p><button class="btn small cover" type="button">Postavi kao naslovnu</button> <button class="btn small danger del" type="button">Obriši</button></p></div>`;
  d.querySelector('.cover').onclick=async()=>{
   let r=await api('/api/owner/gallery/'+img.id+'/cover',{method:'PATCH'});
   msg(r.message,'ok');
   loadGallery();
  };
  d.querySelector('.del').onclick=async()=>{
   if(!confirm('Obrisati sliku?'))return;
   let r=await api('/api/owner/gallery/'+img.id,{method:'DELETE'});
   msg(r.message,'ok');
   loadGallery();
  };
  galleryList.appendChild(d);
 });
}

async function init(){from.value=today();to.value=add(30);if(!tok())return hide();try{let me=await api('/api/auth/me');if(me.user.role!=='owner')throw Error();show();tab('dash')}catch{hide()}}init();