const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];let tok=()=>localStorage.getItem(T)||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}function msg(t,c=''){om.textContent=t;om.className='msg '+c}function show(){login.classList.add('hidden');app.classList.remove('hidden')}function hide(){login.classList.remove('hidden');app.classList.add('hidden')}loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};logout.onclick=()=>{localStorage.removeItem(T);hide()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));function tab(id){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');msg('');({dash:loadDash,bookinglink:loadBookingLink,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,blocked:loadBlocked,settings:loadSettings,logs:loadLogs}[id]||(()=>{}))()}async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent='Osnovna strana';cards.innerHTML=`<div class="item clean-stat"><b>Danas</b><h2>${d.cards.today}</h2><p>zakazanih termina</p></div><div class="item clean-stat"><b>7 dana</b><h2>${d.cards.week}</h2><p>u narednoj nedelji</p></div><div class="item clean-stat"><b>Radnici</b><h2>${d.cards.staff}</h2><p>aktivnih radnika</p></div><div class="item clean-stat"><b>Usluge</b><h2>${d.cards.services}</h2><p>aktivnih usluga</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td></tr>`).join('')}
async function loadAppointments(){if(!from.value)from.value=today();if(!to.value)to.value=add(30);let p=new URLSearchParams({from:from.value,to:to.value});if(status.value)p.set('status',status.value);let rows=await api('/api/owner/appointments?'+p);appointmentsBody.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th><th>Promeni</th></tr>'+rows.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}-${a.end_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td><td><select data-id="${a.id}"><option>booked</option><option>completed</option><option>cancelled</option><option>no_show</option></select></td></tr>`).join('');appointmentsBody.querySelectorAll('select').forEach(s=>{s.onchange=async()=>{await api('/api/owner/appointments/'+s.dataset.id+'/status',{method:'PATCH',body:JSON.stringify({status:s.value})});msg('Status promenjen.','ok');loadAppointments()}})}function resetSt(){staffId.value='';staffName.value='';staffTitle.value='';staffPhone.value='';staffEmail.value='';staffSort.value=0;staffActive.checked=true}resetStaff.onclick=resetSt;staffForm.onsubmit=async e=>{e.preventDefault();let id=staffId.value,p={name:staffName.value,title:staffTitle.value,phone:staffPhone.value,email:staffEmail.value,sort_order:+staffSort.value,active:staffActive.checked};await api(id?'/api/owner/staff/'+id:'/api/owner/staff',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Radnik sačuvan.','ok');resetSt();loadStaff()};async function loadStaff(){let rows=await api('/api/owner/staff');staffList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.title||''} ${x.phone||''}</p><div class="badges"><span>${x.active?'Aktivan':'Ugašen'}</span></div><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');staffList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);staffId.value=x.id;staffName.value=x.name;staffTitle.value=x.title||'';staffPhone.value=x.phone||'';staffEmail.value=x.email||'';staffSort.value=x.sort_order;staffActive.checked=!!x.active})}function resetSv(){serviceId.value='';serviceName.value='';serviceDesc.value='';serviceDuration.value=30;servicePrice.value=1000;serviceSort.value=0;serviceActive.checked=true}resetService.onclick=resetSv;serviceForm.onsubmit=async e=>{e.preventDefault();let id=serviceId.value,p={name:serviceName.value,description:serviceDesc.value,duration:+serviceDuration.value,price:+servicePrice.value,sort_order:+serviceSort.value,active:serviceActive.checked};await api(id?'/api/owner/services/'+id:'/api/owner/services',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Usluga sačuvana.','ok');resetSv();loadServices()};async function loadServices(){let rows=await api('/api/owner/services');serviceList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.duration} min · ${x.price} RSD</p><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');serviceList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);serviceId.value=x.id;serviceName.value=x.name;serviceDesc.value=x.description||'';serviceDuration.value=x.duration;servicePrice.value=x.price;serviceSort.value=x.sort_order;serviceActive.checked=!!x.active})}async function loadHours(){let rows=await api('/api/owner/working-hours');hoursForm.innerHTML=rows.map(x=>`<div class="item hour" data-day="${x.day}"><b>${day[x.day]}</b><label><input class="open" type="checkbox" ${x.is_open?'checked':''}> Otvoreno</label><input class="ot" type="time" value="${x.open_time}"><input class="ct" type="time" value="${x.close_time}"><input class="bs" type="time" value="${x.break_start||''}"><input class="be" type="time" value="${x.break_end||''}"></div>`).join('')}saveHours.onclick=async()=>{let rows=[...document.querySelectorAll('.hour')].map(x=>({day:+x.dataset.day,is_open:x.querySelector('.open').checked,open_time:x.querySelector('.ot').value,close_time:x.querySelector('.ct').value,break_start:x.querySelector('.bs').value,break_end:x.querySelector('.be').value}));await api('/api/owner/working-hours',{method:'PUT',body:JSON.stringify({rows})});msg('Radno vreme sačuvano.','ok')};blockedForm.onsubmit=async e=>{e.preventDefault();await api('/api/owner/blocked-dates',{method:'POST',body:JSON.stringify({date:blockedDate.value,reason:blockedReason.value})});msg('Datum blokiran.','ok');loadBlocked()};async function loadBlocked(){let rows=await api('/api/owner/blocked-dates');blockedList.innerHTML=rows.map(x=>`<article class="item"><b>${x.date}</b><p>${x.reason||''}</p><button data-date="${x.date}" class="btn small danger">Obriši</button></article>`).join('');blockedList.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await api('/api/owner/blocked-dates/'+b.dataset.date,{method:'DELETE'});loadBlocked()})}async function loadSettings(){
 let d=await api('/api/owner/settings'),b=d.business,s=d.settings||{};
 setName.value=b.name||'';setType.value=b.type||'';setCity.value=b.city||'';setPhone.value=b.phone||'';setInstagram.value=b.instagram||'';setAddress.value=b.address||'';setWebsite.value=b.website||'';setDesc.value=b.description||'';
 setInterval.value=s.interval||15;setMin.value=s.min_notice||2;setMax.value=s.max_days||45;
 nCust.checked=!!s.notify_customer_email;nOwner.checked=!!s.notify_owner_email;nSms.checked=!!s.notify_sms;nViber.checked=!!s.notify_viber;
 if(typeof setMsgBooking!=='undefined')setMsgBooking.value=s.msg_booking||'Hvala, vaš termin je uspešno zakazan.';
 if(typeof setMsgCancel!=='undefined')setMsgCancel.value=s.msg_cancel||'Vaš termin je otkazan.';
 if(typeof setCustomerNote!=='undefined')setCustomerNote.value=s.customer_note||'Molimo vas da dođete 5 minuta ranije.';
}
settingsForm.onsubmit=async e=>{
 e.preventDefault();
 await api('/api/owner/settings',{method:'PUT',body:JSON.stringify({
  name:setName.value,type:setType.value,city:setCity.value,phone:setPhone.value,
  instagram:setInstagram.value,address:setAddress.value,website:setWebsite.value,description:setDesc.value,
  interval:+setInterval.value,min_notice:+setMin.value,max_days:+setMax.value,
  notify_customer_email:nCust.checked,notify_owner_email:nOwner.checked,notify_sms:nSms.checked,notify_viber:nViber.checked,
  msg_booking:typeof setMsgBooking!=='undefined'?setMsgBooking.value:undefined,
  msg_cancel:typeof setMsgCancel!=='undefined'?setMsgCancel.value:undefined,
  customer_note:typeof setCustomerNote!=='undefined'?setCustomerNote.value:undefined
 })});
 msg('Podešavanja sačuvana.','ok')
};async function loadLogs(){let rows=await api('/api/owner/notifications');logList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.channel} · ${x.status}</h3><p>${x.created_at} · ${x.recipient||''}</p><p class="muted">${(x.body||'').slice(0,220)}</p></article>`).join('')||'<p class="muted">Nema logova.</p>'}

function htmlEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ownerPhoneParts(value){
 return String(value||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,10);
}

let ownerQrObjectUrl='';
async function fetchOwnerQrDataUrl(){
 let h={};
 if(tok())h.Authorization='Bearer '+tok();
 let r=await fetch('/api/owner/qr',{headers:h});
 if(!r.ok)throw Error('Ne mogu da učitam QR kod.');
 let svg=await r.text();
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
async function loadBookingLink(){
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
 }catch(e){msg(e.message,'err')}
}
if(typeof copyLinkBtn!=='undefined')copyLinkBtn.onclick=async()=>{
 try{
  await loadBookingLink();
  await navigator.clipboard.writeText(bookingUrlInput.value);
  msg('Link je kopiran.','ok');
 }catch(e){msg('Ne mogu da kopiram link. Označi ga ručno.','err')}
};
async function printQrPdfList(){
 try{
  await loadBookingLink();
  let link=bookingUrlInput.value;
  let qr=ownerQrObjectUrl||await fetchOwnerQrDataUrl();
  let items=Array.from({length:12}).map(()=>`
    <div class="cut-card">
      <div class="card-title">Zakažite termin</div>
      <img src="${qr}" alt="QR kod">
      <div class="link-title">Link za zakazivanje:</div>
      <div class="card-link">${htmlEsc(link)}</div>
    </div>
  `).join('');
  let w=window.open('','_blank');
  if(!w)throw Error('Browser je blokirao prozor za štampanje.');
  w.document.write(`<!doctype html><html lang="sr"><head><meta charset="UTF-8"><title>QR kartice</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:white;color:#111827;font-family:Arial,Helvetica,sans-serif}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm 7mm}
    h1{margin:0 0 4px;text-align:center;font-size:23px;line-height:1.2}
    .top-text{margin:0 0 7mm;text-align:center;font-size:12px;color:#111827}
    .grid{width:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);border-left:1px solid #111827;border-top:1px solid #111827}
    .cut-card{height:63mm;border-right:1px solid #111827;border-bottom:1px solid #111827;padding:4mm 3mm 3mm;text-align:center;overflow:hidden;break-inside:avoid}
    .card-title{font-size:13px;line-height:1.1;font-weight:900;margin-bottom:2mm}
    .cut-card img{width:31mm;height:31mm;display:block;margin:0 auto 2mm}
    .link-title{font-size:10px;font-weight:900;margin-bottom:1mm}
    .card-link{font-size:9.6px;line-height:1.22;word-break:break-all;color:#111827}
    .no-print{position:fixed;right:16px;top:16px;z-index:9}.no-print button{background:#111827;color:white;border:0;padding:12px 18px;font-weight:900;cursor:pointer}
    @page{size:A4;margin:0}@media print{.no-print{display:none}.page{width:210mm;min-height:297mm;margin:0;padding:10mm 7mm}}
  </style></head><body>
    <div class="no-print"><button onclick="window.print()">Štampaj / sačuvaj PDF</button></div>
    <main class="page"><h1>QR kartice za zakazivanje termina</h1><p class="top-text">Odštampajte list, isecite kartice i podelite ih mušterijama.</p><section class="grid">${items}</section></main>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
  </body></html>`);
  w.document.close();
  msg('Otvoren je list za štampanje. U print prozoru možeš izabrati Save as PDF.','ok');
 }catch(e){msg(e.message,'err')}
}
if(typeof printQrPdfBtn!=='undefined')printQrPdfBtn.onclick=printQrPdfList;

function printA4DoorPoster(){
 try{
  let link=bookingUrlInput.value;
  let b=window.ownerBusinessForPrint||{};
  let name=b.name||'Vaša firma';
  let phones=ownerPhoneParts(b.phone);
  let place=[];
  if(b.city)place.push(b.city);
  if(b.instagram)place.push(b.instagram);
  let footerLines=[];
  if(phones.length)footerLines.push('Telefoni: '+phones.join('  •  '));
  if(place.length)footerLines.push(place.join('  •  '));
  let footer=footerLines.join('<br>');
  let qr=ownerQrObjectUrl||ownerQrPreview.src;
  let w=window.open('','_blank');
  if(!w)throw Error('Browser je blokirao prozor za štampanje.');
  w.document.write(`<!doctype html><html lang="sr"><head><meta charset="UTF-8"><title>A4 poster</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:white;color:#111827;font-family:Arial,Helvetica,sans-serif}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 13mm;display:flex;align-items:center;justify-content:center}
    .poster{width:100%;min-height:266mm;border:3px solid #111827;border-radius:18px;padding:18px;text-align:center;display:flex;flex-direction:column}
    .header{background:#111827;color:white;border-radius:18px;padding:22px 16px;margin-bottom:28px}
    .header h1{margin:0;font-size:38px;line-height:1.12;letter-spacing:.5px}
    .business{font-size:31px;line-height:1.2;font-weight:900;margin:0 0 8px}
    .subtitle{font-size:18px;color:#374151;margin:0 0 28px}
    .qr-card{margin:0 auto 22px;width:132mm;min-height:132mm;border:2px solid #d1d5db;border-radius:24px;background:#f9fafb;display:flex;align-items:center;justify-content:center;padding:16px}
    .qr-card img{width:112mm;height:112mm;background:white}.instruction{font-size:21px;font-weight:900;margin:6px 0 20px}
    .link-title{font-size:15px;color:#374151;margin:0 0 8px}.link{max-width:165mm;margin:0 auto;font-size:14px;line-height:1.35;word-break:break-all;color:#374151}
    .footer{margin-top:auto;color:#111827;padding:8px 16px 0;font-size:15px;font-weight:800;word-break:break-word;line-height:1.45}
    .no-print{position:fixed;right:16px;top:16px}.no-print button{background:#111827;color:white;border:0;padding:12px 18px;font-weight:900;cursor:pointer}
    @page{size:A4;margin:0}@media print{.no-print{display:none}.page{width:210mm;min-height:297mm;margin:0;padding:12mm}.poster{min-height:273mm}}
  </style></head><body>
   <div class="no-print"><button onclick="window.print()">Štampaj / sačuvaj PDF</button></div>
   <div class="page"><section class="poster"><div class="header"><h1>SKENIRAJTE I ZAKAŽITE<br>TERMIN ONLINE</h1></div>
   <h2 class="business">${htmlEsc(name)}</h2><p class="subtitle">Bez poziva — izaberite uslugu i slobodan termin.</p>
   <div class="qr-card"><img src="${qr}" alt="QR kod"></div><p class="instruction">Otvorite kameru telefona i skenirajte QR kod</p>
   <p class="link-title">Link za zakazivanje:</p><p class="link">${htmlEsc(link)}</p>${footer?`<div class="footer">${footer}</div>`:''}</section></div>
   <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
  </body></html>`);
  w.document.close();
 }catch(e){msg(e.message,'err')}
}
if(typeof printA4PosterBtn!=='undefined')printA4PosterBtn.onclick=async()=>{await loadBookingLink();printA4DoorPoster()};


async function init(){from.value=today();to.value=add(30);if(!tok())return hide();try{let me=await api('/api/auth/me');if(me.user.role!=='owner')throw Error();show();tab('dash')}catch{hide()}}init();


/* Owner Nav Clean Final v72 */
(function(){
 function cleanOwner(){
  const clone=document.getElementById('ownerStableNavClone');
  if(clone) clone.remove();
  document.querySelectorAll('.tabs button').forEach(b=>{
   if((b.textContent||'').trim()==='Profil/poruke') b.textContent='Profil firme';
  });
 }
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(cleanOwner,100);setTimeout(cleanOwner,800)});
 document.addEventListener('click',()=>setTimeout(cleanOwner,80),true);
})();



/* Owner Fixed Wide Header v73 */
(function(){
  async function ownerApi(path){
    const token = localStorage.getItem('token') || '';
    const res = await fetch(path, {headers:{Authorization:'Bearer '+token}});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Greška');
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

  async function businessName(){
    try{
      const data = await ownerApi('/api/auth/me');
      return (data.business && data.business.name) ? data.business.name : 'Firma';
    }catch(_){
      return 'Firma';
    }
  }

  async function installFixedWideHeader(){
    let header = document.getElementById('ownerFixedWideHeader');
    const name = await businessName();

    if(!header){
      header = document.createElement('div');
      header.id = 'ownerFixedWideHeader';
      header.className = 'owner-fixed-wide-header';

      const title = document.createElement('div');
      title.className = 'owner-fixed-wide-title';
      title.id = 'ownerFixedWideTitle';
      title.textContent = name;

      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'owner-fixed-wide-logout';
      out.textContent = 'Odjava';
      out.addEventListener('click', ev => {
        ev.preventDefault();
        const btn = findLogoutButton();
        if(btn && btn !== out) btn.click();
        else{
          localStorage.removeItem('token');
          location.href = '/';
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
      const t = document.getElementById('ownerFixedWideTitle');
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

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(installFixedWideHeader, 250);
    setTimeout(installFixedWideHeader, 1000);
  });

  document.addEventListener('click', () => {
    setTimeout(installFixedWideHeader, 120);
  }, true);
})();



/* Owner Responsive Header v74 */
(function(){
  function refreshOwnerResponsiveHeader(){
    const h = document.getElementById('ownerFixedWideHeader');
    if(!h) return;
    h.style.width = 'min(1200px, calc(100vw - 32px))';
    h.style.maxWidth = 'none';
  }

  window.addEventListener('resize', refreshOwnerResponsiveHeader);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(refreshOwnerResponsiveHeader, 200);
    setTimeout(refreshOwnerResponsiveHeader, 900);
  });
})();



/* Owner Full Width Header v75 */
(function(){
  function forceFullWidthHeader(){
    const h = document.getElementById('ownerFixedWideHeader');
    if(!h) return;
    h.style.width = '100vw';
    h.style.maxWidth = 'none';
    h.style.marginLeft = 'calc(50% - 50vw)';
    h.style.marginRight = 'calc(50% - 50vw)';
    h.style.borderRadius = '0';
  }

  window.addEventListener('resize', forceFullWidthHeader);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(forceFullWidthHeader, 200);
    setTimeout(forceFullWidthHeader, 900);
    setTimeout(forceFullWidthHeader, 1600);
  });
  document.addEventListener('click', () => setTimeout(forceFullWidthHeader, 120), true);
})();
