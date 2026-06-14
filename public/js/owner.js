const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];let tok=()=>localStorage.getItem(T)||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}function msg(t,c=''){om.textContent=t;om.className='msg '+c}function show(){login.classList.add('hidden');app.classList.remove('hidden')}function hide(){login.classList.remove('hidden');app.classList.add('hidden')}loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};logout.onclick=()=>{localStorage.removeItem(T);hide()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));function tab(id){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');msg('');({dash:loadDash,bookinglink:loadBookingLink,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,blocked:loadBlocked,settings:loadSettings,logs:loadLogs}[id]||(()=>{}))()}async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent='Osnovna strana';cards.innerHTML=`<div class="item clean-stat"><b>Danas</b><h2>${d.cards.today}</h2><p>zakazanih termina</p></div><div class="item clean-stat"><b>7 dana</b><h2>${d.cards.week}</h2><p>u narednoj nedelji</p></div><div class="item clean-stat"><b>Radnici</b><h2>${d.cards.staff}</h2><p>aktivnih radnika</p></div><div class="item clean-stat"><b>Usluge</b><h2>${d.cards.services}</h2><p>aktivnih usluga</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td></tr>`).join('')}
async function loadAppointments(){if(!from.value)from.value=today();if(!to.value)to.value=add(30);let p=new URLSearchParams({from:from.value,to:to.value});if(status.value)p.set('status',status.value);let rows=await api('/api/owner/appointments?'+p);appointmentsBody.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th><th>Promeni</th></tr>'+rows.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}-${a.end_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td><td><select data-id="${a.id}"><option>booked</option><option>completed</option><option>cancelled</option><option>no_show</option></select></td></tr>`).join('');appointmentsBody.querySelectorAll('select').forEach(s=>{s.onchange=async()=>{await api('/api/owner/appointments/'+s.dataset.id+'/status',{method:'PATCH',body:JSON.stringify({status:s.value})});msg('Status promenjen.','ok');loadAppointments()}})}function resetSt(){staffId.value='';staffName.value='';staffTitle.value='';staffPhone.value='';staffEmail.value='';staffSort.value=0;staffActive.checked=true}resetStaff.onclick=resetSt;staffForm.onsubmit=async e=>{e.preventDefault();let id=staffId.value,p={name:staffName.value,title:staffTitle.value,phone:staffPhone.value,email:staffEmail.value,sort_order:+staffSort.value,active:staffActive.checked};await api(id?'/api/owner/staff/'+id:'/api/owner/staff',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Radnik sačuvan.','ok');resetSt();loadStaff()};async function loadStaff(){let rows=await api('/api/owner/staff');staffList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.title||''} ${x.phone||''}</p><div class="badges"><span>${x.active?'Aktivan':'Ugašen'}</span></div><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');staffList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);staffId.value=x.id;staffName.value=x.name;staffTitle.value=x.title||'';staffPhone.value=x.phone||'';staffEmail.value=x.email||'';staffSort.value=x.sort_order;staffActive.checked=!!x.active})}function resetSv(){serviceId.value='';serviceName.value='';serviceDesc.value='';serviceDuration.value=30;servicePrice.value=1000;serviceSort.value=0;serviceActive.checked=true}resetService.onclick=resetSv;serviceForm.onsubmit=async e=>{e.preventDefault();let id=serviceId.value,p={name:serviceName.value,description:serviceDesc.value,duration:+serviceDuration.value,price:+servicePrice.value,sort_order:+serviceSort.value,active:serviceActive.checked};await api(id?'/api/owner/services/'+id:'/api/owner/services',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Usluga sačuvana.','ok');resetSv();loadServices()};async function loadServices(){let rows=await api('/api/owner/services');serviceList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.duration} min · ${x.price} RSD</p><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');serviceList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);serviceId.value=x.id;serviceName.value=x.name;serviceDesc.value=x.description||'';serviceDuration.value=x.duration;servicePrice.value=x.price;serviceSort.value=x.sort_order;serviceActive.checked=!!x.active})}async function loadHours(){let rows=await api('/api/owner/working-hours');hoursForm.innerHTML=rows.map(x=>`<div class="item hour" data-day="${x.day}"><b>${day[x.day]}</b><label><input class="open" type="checkbox" ${x.is_open?'checked':''}> Otvoreno</label><input class="ot" type="time" value="${x.open_time}"><input class="ct" type="time" value="${x.close_time}"><input class="bs" type="time" value="${x.break_start||''}"><input class="be" type="time" value="${x.break_end||''}"></div>`).join('')}saveHours.onclick=async()=>{let rows=[...document.querySelectorAll('.hour')].map(x=>({day:+x.dataset.day,is_open:x.querySelector('.open').checked,open_time:x.querySelector('.ot').value,close_time:x.querySelector('.ct').value,break_start:x.querySelector('.bs').value,break_end:x.querySelector('.be').value}));await api('/api/owner/working-hours',{method:'PUT',body:JSON.stringify({rows})});msg('Radno vreme sačuvano.','ok')};blockedForm.onsubmit=async e=>{e.preventDefault();await api('/api/owner/blocked-dates',{method:'POST',body:JSON.stringify({date:blockedDate.value,reason:blockedReason.value})});msg('Datum blokiran.','ok');loadBlocked()};async function loadBlocked(){let rows=await api('/api/owner/blocked-dates');blockedList.innerHTML=rows.map(x=>`<article class="item"><b>${x.date}</b><p>${x.reason||''}</p><button data-date="${x.date}" class="btn small danger">Obriši</button></article>`).join('');blockedList.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await api('/api/owner/blocked-dates/'+b.dataset.date,{method:'DELETE'});loadBlocked()})}async function loadSettings(){let d=await api('/api/owner/settings'),b=d.business,s=d.settings;setName.value=b.name;setType.value=b.type;setCity.value=b.city;setPhone.value=b.phone;setInstagram.value=b.instagram;setAddress.value=b.address;setWebsite.value=b.website;setDesc.value=b.description;setInterval.value=s.interval;setMin.value=s.min_notice;setMax.value=s.max_days;nCust.checked=!!s.notify_customer_email;nOwner.checked=!!s.notify_owner_email;nSms.checked=!!s.notify_sms;nViber.checked=!!s.notify_viber}settingsForm.onsubmit=async e=>{e.preventDefault();await api('/api/owner/settings',{method:'PUT',body:JSON.stringify({name:setName.value,type:setType.value,city:setCity.value,phone:setPhone.value,instagram:setInstagram.value,address:setAddress.value,website:setWebsite.value,description:setDesc.value,interval:+setInterval.value,min_notice:+setMin.value,max_days:+setMax.value,notify_customer_email:nCust.checked,notify_owner_email:nOwner.checked,notify_sms:nSms.checked,notify_viber:nViber.checked})});msg('Podešavanja sačuvana.','ok')};async function loadLogs(){let rows=await api('/api/owner/notifications');logList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.channel} · ${x.status}</h3><p>${x.created_at} · ${x.recipient||''}</p><p class="muted">${(x.body||'').slice(0,220)}</p></article>`).join('')||'<p class="muted">Nema logova.</p>'}
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
  let name=bookingLinkBusinessName.textContent||'Firma';
  let qr=ownerQrObjectUrl||await fetchOwnerQrDataUrl();
  let items=Array.from({length:12}).map(()=>`
    <div class="cut-card">
      <img src="${qr}" alt="QR kod">
      <strong>Zakazivanje termina</strong>
      <small>${link}</small>
    </div>
  `).join('');
  let w=window.open('','_blank');
  if(!w)throw Error('Browser je blokirao prozor za štampanje.');
  w.document.write(`<!doctype html><html lang="sr"><head><meta charset="UTF-8"><title>QR kodovi - ${name}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;margin:0;padding:16px;color:#111827}
    h1{font-size:20px;margin:0 0 4px}
    p{margin:0 0 14px;color:#475569}
    .sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .cut-card{border:1px dashed #94a3b8;border-radius:12px;padding:10px;text-align:center;min-height:230px;display:grid;align-content:center;gap:6px;page-break-inside:avoid}
    .cut-card img{width:130px;height:130px;margin:0 auto}
    .cut-card strong{font-size:14px}
    .cut-card small{font-size:10px;word-break:break-all;color:#334155;line-height:1.25}
    @page{size:A4;margin:10mm}
    @media print{body{padding:0}.cut-card{min-height:225px}}
  </style></head><body>
    <h1>${name}</h1>
    <p>Iseci kartice i podeli mušterijama. Ispod svakog QR koda stoji link za zakazivanje termina.</p>
    <div class="sheet">${items}</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
  </body></html>`);
  w.document.close();
  msg('Otvoren je list za štampanje. U print prozoru možeš izabrati Save as PDF.','ok');
 }catch(e){msg(e.message,'err')}
}
if(typeof printQrPdfBtn!=='undefined')printQrPdfBtn.onclick=printQrPdfList;

async function init(){from.value=today();to.value=add(30);if(!tok())return hide();try{let me=await api('/api/auth/me');if(me.user.role!=='owner')throw Error();show();tab('dash')}catch{hide()}}init();


/* Desktop Like Android v60 */
(function(){
  function token(){ return localStorage.getItem('token') || ''; }
  async function api(path, opts={}){
    const res = await fetch(path,{
      headers:{'Content-Type':'application/json', Authorization:'Bearer '+token(), ...(opts.headers||{})},
      ...opts
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Greška.');
    return data;
  }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.from(document.querySelectorAll(s)); }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function setMsg(el, text, ok=false){
    if(!el) return;
    el.textContent = text || '';
    el.className = ok ? 'msg ok' : 'msg';
  }
  function findMain(){
    return q('#content') || q('#app') || q('main') || document.body;
  }
  function renameMenus(){
    qa('button,a').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(t==='Profil / poruke' || t==='Profil i poruke' || t==='Profil') el.textContent='Profil firme';
      if(t==='Štampaj PDF list' || t==='Preuzmi QR list' || t==='Preuzmi PDF list') el.textContent='Štampaj / preuzmi QR list';
    });
  }
  function bookingUrlFromBusiness(b){
    if(!b) return '';
    return b.booking_url || b.public_url || (location.origin + '/b/' + (b.slug||''));
  }


  function normalizePhones(value){
    return String(value||'')
      .split(/[\n,;]+/)
      .map(x=>x.trim())
      .filter(Boolean)
      .filter((x,i,a)=>a.indexOf(x)===i)
      .slice(0,10)
      .join('\n');
  }
  function phoneParts(value){
    return normalizePhones(value).split('\n').filter(Boolean).slice(0,10);
  }

  function qrUrl(value, size=240){
    return 'https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+encodeURIComponent(value);
  }

  async function openPublicPage(){
    try{
      const data = await api('/api/auth/me');
      const url = bookingUrlFromBusiness(data.business);
      if(url) window.open(url, '_blank');
    }catch(e){ alert(e.message); }
  }

  function printQrList(url, businessName='Zakazivanje termina'){
    const w = window.open('', '_blank');
    if(!w){ alert('Browser je blokirao novi prozor. Dozvolite popup pa pokušajte ponovo.'); return; }

    const qr = qrUrl(url, 180);
    const cards = Array.from({length:12}).map(()=>`
      <div class="cut-card">
        <div class="card-title">Zakažite termin</div>
        <img src="${qr}" alt="QR kod">
        <div class="link-title">Link za zakazivanje:</div>
        <div class="card-link">${esc(url)}</div>
      </div>
    `).join('');

    w.document.write(`<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<title>QR kartice za zakazivanje</title>
<style>
  *{box-sizing:border-box}
  body{
    margin:0;
    background:white;
    color:#111827;
    font-family:Arial,Helvetica,sans-serif;
  }
  .page{
    width:210mm;
    min-height:297mm;
    margin:0 auto;
    padding:10mm 7mm;
  }
  h1{
    margin:0 0 4px;
    text-align:center;
    font-size:23px;
    line-height:1.2;
  }
  .top-text{
    margin:0 0 7mm;
    text-align:center;
    font-size:12px;
    color:#111827;
  }
  .grid{
    width:100%;
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    grid-template-rows:repeat(4, 1fr);
    border-left:1px solid #111827;
    border-top:1px solid #111827;
  }
  .cut-card{
    height:63mm;
    border-right:1px solid #111827;
    border-bottom:1px solid #111827;
    padding:4mm 3mm 3mm;
    text-align:center;
    overflow:hidden;
    break-inside:avoid;
  }
  .card-title{
    font-size:13px;
    line-height:1.1;
    font-weight:900;
    margin-bottom:2mm;
  }
  .cut-card img{
    width:31mm;
    height:31mm;
    display:block;
    margin:0 auto 2mm;
  }
  .link-title{
    font-size:10px;
    font-weight:900;
    margin-bottom:1mm;
  }
  .card-link{
    font-size:9.6px;
    line-height:1.22;
    word-break:break-all;
    color:#111827;
  }
  .no-print{
    position:fixed;
    right:16px;
    top:16px;
    z-index:9;
  }
  .no-print button{
    background:#111827;
    color:white;
    border:0;
    padding:12px 18px;
    font-weight:900;
    cursor:pointer;
  }
  @media print{
    @page{size:A4;margin:0}
    .no-print{display:none}
    .page{width:210mm;min-height:297mm;margin:0;padding:10mm 7mm}
  }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Štampaj / sačuvaj PDF</button></div>
  <main class="page">
    <h1>QR kartice za zakazivanje termina</h1>
    <p class="top-text">Odštampajte list, isecite kartice i podelite ih mušterijama.</p>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>`);
    w.document.close();
  }

  function printA4DoorPoster(url, business={}){
    const w = window.open('', '_blank');
    if(!w){ alert('Browser je blokirao novi prozor. Dozvolite popup pa pokušajte ponovo.'); return; }

    const name = business.name || 'Vaša firma';
    const phone = business.phone || '';
    const city = business.city || '';
    const instagram = business.instagram || '';
    const phones = phoneParts(phone);
    const footerLines = [];
    if(phones.length) footerLines.push('Telefoni: ' + phones.join('  •  '));
    const placeParts = [];
    if(city) placeParts.push(city);
    if(instagram) placeParts.push(instagram);
    if(placeParts.length) footerLines.push(placeParts.join('  •  '));
    const footer = footerLines.join('<br>');
    const qr = qrUrl(url, 430);

    w.document.write(`<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<title>A4 poster za vrata</title>
<style>
  *{box-sizing:border-box}
  body{
    margin:0;
    background:white;
    color:#111827;
    font-family:Arial,Helvetica,sans-serif;
  }
  .page{
    width:210mm;
    min-height:297mm;
    margin:0 auto;
    padding:14mm 13mm;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .poster{
    width:100%;
    min-height:266mm;
    border:3px solid #111827;
    border-radius:18px;
    padding:18px;
    text-align:center;
    display:flex;
    flex-direction:column;
  }
  .header{
    background:#111827;
    color:white;
    border-radius:18px;
    padding:22px 16px;
    margin-bottom:28px;
  }
  .header h1{
    margin:0;
    font-size:38px;
    line-height:1.12;
    letter-spacing:.5px;
  }
  .business{
    font-size:31px;
    line-height:1.2;
    font-weight:900;
    margin:0 0 8px;
  }
  .subtitle{
    font-size:18px;
    color:#374151;
    margin:0 0 28px;
  }
  .qr-card{
    margin:0 auto 22px;
    width:132mm;
    min-height:132mm;
    border:2px solid #d1d5db;
    border-radius:24px;
    background:#f9fafb;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
  }
  .qr-card img{
    width:112mm;
    height:112mm;
    background:white;
  }
  .instruction{
    font-size:21px;
    font-weight:900;
    margin:6px 0 20px;
  }
  .link-title{
    font-size:15px;
    color:#374151;
    margin:0 0 8px;
  }
  .link{
    max-width:165mm;
    margin:0 auto;
    font-size:14px;
    line-height:1.35;
    word-break:break-all;
    color:#374151;
  }
  .footer{
    margin-top:auto;
    color:#111827;
    padding:8px 16px 0;
    font-size:15px;
    font-weight:800;
    word-break:break-word;
    line-height:1.45;
  }
  .no-print{
    position:fixed;
    right:16px;
    top:16px;
  }
  .no-print button{
    background:#111827;
    color:white;
    border:0;
    padding:12px 18px;
    font-weight:900;
    cursor:pointer;
  }
  @media print{
    @page{size:A4;margin:0}
    .no-print{display:none}
    .page{width:210mm;min-height:297mm;margin:0;padding:12mm}
    .poster{min-height:273mm}
  }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Štampaj / sačuvaj PDF</button></div>
  <div class="page">
    <section class="poster">
      <div class="header">
        <h1>SKENIRAJTE I ZAKAŽITE<br>TERMIN ONLINE</h1>
      </div>

      <h2 class="business">${esc(name)}</h2>
      <p class="subtitle">Bez poziva — izaberite uslugu, radnika i slobodan termin.</p>

      <div class="qr-card">
        <img src="${qr}" alt="QR kod">
      </div>

      <p class="instruction">Otvorite kameru telefona i skenirajte QR kod</p>

      <p class="link-title">Link za zakazivanje:</p>
      <p class="link">${esc(url)}</p>

      ${footer ? `<div class="footer">${footer}</div>` : ``}
    </section>
  </div>
</body>
</html>`);
    w.document.close();
  }

  async function renderLinkLikeAndroid(){
    const main = findMain();
    try{
      const data = await api('/api/auth/me');
      const b = data.business || {};
      const url = bookingUrlFromBusiness(b);
      main.innerHTML = `<section class="card">
        <p class="eyebrow">LINK</p>
        <h1>Link za zakazivanje</h1>
        <p class="muted">Ovaj link šaljete mušterijama preko SMS-a, Vibera, WhatsApp-a, Instagrama ili QR koda.</p>
        <div class="link-box">${esc(url || 'Link nije pronađen.')}</div>
        ${url ? `<div class="qr-wrap"><img alt="QR kod" src="${qrUrl(url,260)}"></div>` : ''}
        <div class="actions">
          <button class="btn" id="copyPublicLink">Kopiraj link</button>
          ${url ? `<button class="btn secondary" id="printQrList">Štampaj / preuzmi QR list</button>` : ''}
          ${url ? `<button class="btn secondary" id="printA4Poster">Štampaj / preuzmi A4 poster</button>` : ''}
        </div>
        <p class="muted">QR list je za više manjih kartica. A4 poster je za vrata, izlog ili zid.</p>
        <p class="muted">Ako imate povezan štampač, možete odmah štampati. Ako nemate, sačuvajte PDF i odštampajte kasnije.</p>
      </section>`;
      q('#copyPublicLink')?.addEventListener('click', async()=>{
        await navigator.clipboard.writeText(url);
        alert('Link je kopiran.');
      });
      q('#printQrList')?.addEventListener('click', ()=>printQrList(url,b.name||'Zakazivanje termina'));
      q('#printA4Poster')?.addEventListener('click', ()=>printA4DoorPoster(url,b));
    }catch(e){
      main.innerHTML = `<section class="card"><h1>Link</h1><p class="msg">${esc(e.message)}</p></section>`;
    }
  }

  async function renderProfileLikeAndroid(){
    const main = findMain();
    main.innerHTML = `<section class="card"><h1>Podešavanje profila firme</h1><p class="muted">Učitavam...</p></section>`;
    try{
      const data = await api('/api/owner/settings');
      const b = data.business || {};
      const s = data.settings || {};
      const url = bookingUrlFromBusiness(b);
      main.innerHTML = `
        <section class="card">
          <p class="eyebrow">PROFIL FIRME</p>
          <h1>Podešavanje profila firme</h1>
          <p class="muted">Podaci koje mušterije vide na javnoj stranici.</p>
        </section>

        <section class="card">
          <h2>Podaci firme</h2>
          <div class="form-grid">
            <label>Naziv firme<input id="pfName" value="${esc(b.name||'')}"></label>
            <label>Grad<input id="pfCity" value="${esc(b.city||'')}"></label>
            <label>Telefoni firme, najviše 10 brojeva<textarea id="pfPhone" rows="5" placeholder="Svaki broj u novi red">${esc(b.phone||'')}</textarea></label>
            <label>Instagram/Facebook link<input id="pfInstagram" value="${esc(b.instagram||'')}"></label>
          </div>
          <label>Opis firme<textarea id="pfDescription" rows="4">${esc(b.description||'')}</textarea></label>
          <div class="actions">
            <button class="btn secondary" id="openPublicPageBtn">Otvori javnu stranicu</button>
          </div>
        </section>

        <section class="card">
          <h2>Automatske poruke za mušterije</h2>
          <label>Poruka posle zakazivanja<textarea id="pfMsgBooking" rows="3">${esc(s.msg_booking||'Hvala, vaš termin je uspešno zakazan.')}</textarea></label>
          <label>Poruka kod otkazivanja<textarea id="pfMsgCancel" rows="3">${esc(s.msg_cancel||'Vaš termin je otkazan.')}</textarea></label>
          <label>Napomena za mušterije<textarea id="pfCustomerNote" rows="3">${esc(s.customer_note||'Molimo vas da dođete 5 minuta ranije.')}</textarea></label>
          <button class="btn" id="saveProfileFirm">Sačuvajte profil firme</button>
          <p id="profileFirmMsg" class="msg"></p>
        </section>
      `;
      q('#openPublicPageBtn')?.addEventListener('click', ()=>window.open(url,'_blank'));
      q('#saveProfileFirm')?.addEventListener('click', async()=>{
        const msg=q('#profileFirmMsg');
        setMsg(msg,'Čuvam...',true);
        try{
          const payload = {
            name:q('#pfName').value.trim(),
            type:b.type||'',
            city:q('#pfCity').value.trim(),
            phone:normalizePhones(q('#pfPhone').value),
            instagram:q('#pfInstagram').value.trim(),
            address:b.address||'',
            website:b.website||'',
            logo_url:b.logo_url||'',
            cover_url:b.cover_url||'',
            description:q('#pfDescription').value.trim(),
            interval:s.interval||15,
            min_notice:s.min_notice||2,
            max_days:s.max_days||45,
            notify_customer_email:!!s.notify_customer_email,
            notify_owner_email:!!s.notify_owner_email,
            notify_sms:!!s.notify_sms,
            notify_viber:!!s.notify_viber,
            msg_booking:q('#pfMsgBooking').value.trim(),
            msg_cancel:q('#pfMsgCancel').value.trim(),
            customer_note:q('#pfCustomerNote').value.trim()
          };
          const out = await api('/api/owner/settings',{method:'PUT',body:JSON.stringify(payload)});
          setMsg(msg,out.message||'Profil firme je sačuvan.',true);
        }catch(e){ setMsg(msg,e.message); }
      });
    }catch(e){
      main.innerHTML = `<section class="card"><h1>Podešavanje profila firme</h1><p class="msg">${esc(e.message)}</p></section>`;
    }
  }

  function installDesktopLikeAndroid(){
    renameMenus();

    qa('button,a').forEach(el=>{
      const txt=(el.textContent||'').trim().toLowerCase();
      const target=(el.dataset.tab||el.dataset.page||el.getAttribute('href')||'').toLowerCase();
      if(txt==='profil firme' || target.includes('profile') || target.includes('settings')){
        el.addEventListener('click', (ev)=>{
          ev.preventDefault();
          setTimeout(renderProfileLikeAndroid, 0);
        }, true);
      }
      if(txt==='link' || target.includes('link') || target.includes('qr')){
        el.addEventListener('click', (ev)=>{
          ev.preventDefault();
          setTimeout(renderLinkLikeAndroid, 0);
        }, true);
      }
    });

    window.renderProfileLikeAndroid = renderProfileLikeAndroid;
    window.renderLinkLikeAndroid = renderLinkLikeAndroid;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(installDesktopLikeAndroid, 600);
    setTimeout(renameMenus, 1200);
  });
})();



/* Owner Stable Navigation v69 */
(function(){
  const navItems = [
    {label:'Dashboard', keys:['dashboard','osnovna','pregled']},
    {label:'Termini', keys:['termini','appointments']},
    {label:'Link / QR kod', keys:['link','qr']},
    {label:'Radnici', keys:['radnici','staff']},
    {label:'Usluge', keys:['usluge','services']},
    {label:'Radno vreme', keys:['radno vreme','working','hours']},
    {label:'Blokirani', keys:['blokirani','blocked']},
    {label:'Profil firme', keys:['profil','profile','settings','poruke']},
    {label:'Log poruka', keys:['log poruka','notifications','log']}
  ];

  function getText(el){
    return (el && el.textContent ? el.textContent : '').trim().toLowerCase();
  }

  function findOriginalButton(item){
    return Array.from(document.querySelectorAll('button,a')).find(el => {
      if(el.closest('#ownerStableNavClone')) return false;
      const t = getText(el);
      return item.keys.some(k => t.includes(k));
    });
  }

  function findOwnerNav(){
    const groups = Array.from(document.querySelectorAll('nav,.tabs,.pills,.actions,header,main,body'));
    let best = null;
    let bestCount = 0;

    for(const g of groups){
      const count = Array.from(g.querySelectorAll('button,a')).filter(el => {
        if(el.closest('#ownerStableNavClone')) return false;
        const t = getText(el);
        return navItems.some(item => item.keys.some(k => t.includes(k)));
      }).length;

      if(count > bestCount){
        best = g;
        bestCount = count;
      }
    }
    return bestCount >= 3 ? best : null;
  }

  function renameOldLabels(){
    Array.from(document.querySelectorAll('button,a')).forEach(el => {
      if(el.closest('#ownerStableNavClone')) return;
      const t = getText(el);
      if(t === 'profil/poruke' || t === 'profil i poruke' || t === 'profil') el.textContent = 'Profil firme';
      el.style.display = '';
      el.style.visibility = 'visible';
    });
  }

  function installStableNav(){
    renameOldLabels();

    let clone = document.getElementById('ownerStableNavClone');
    if(clone) return;

    const originalNav = findOwnerNav();
    if(!originalNav) return;

    clone = document.createElement('div');
    clone.id = 'ownerStableNavClone';
    clone.className = 'owner-stable-nav-clone';

    navItems.forEach(item => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.label;
      b.addEventListener('click', ev => {
        ev.preventDefault();
        const original = findOriginalButton(item);
        if(original){
          original.click();
          setTimeout(renameOldLabels, 80);
          setTimeout(installStableNav, 160);
        }
      });
      clone.appendChild(b);
    });

    originalNav.insertAdjacentElement('afterend', clone);
    originalNav.classList.add('owner-original-nav-kept');
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(installStableNav, 500);
    setTimeout(installStableNav, 1200);
  });

  document.addEventListener('click', () => {
    setTimeout(renameOldLabels, 80);
    setTimeout(installStableNav, 160);
  }, true);
})();



/* Owner Clean Header v70 */
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

  function getLogoLetter(name){
    const clean = String(name || '').trim();
    return clean ? clean[0].toUpperCase() : 'T';
  }

  function findOldHeader(){
    const candidates = Array.from(document.querySelectorAll('header,.topbar,.navbar,.app-header,body > div,body > section'));
    return candidates.find(el => {
      const text = (el.textContent || '').toLowerCase();
      return text.includes('panel firme') || (text.includes('odjava') && el.querySelector('button,a'));
    });
  }

  async function installCleanHeader(){
    if(document.getElementById('ownerCleanHeader')) return;

    let businessName = '';
    try{
      const data = await ownerApi('/api/auth/me');
      businessName = (data.business && data.business.name) ? data.business.name : '';
    }catch(_){
      businessName = '';
    }

    const logout = findLogoutButton();
    const oldHeader = findOldHeader();

    const header = document.createElement('div');
    header.id = 'ownerCleanHeader';
    header.className = 'owner-clean-header';

    const brand = document.createElement('div');
    brand.className = 'owner-clean-brand';

    const logo = document.createElement('div');
    logo.className = 'owner-clean-logo';
    logo.textContent = getLogoLetter(businessName);

    const title = document.createElement('div');
    title.className = 'owner-clean-title';
    title.textContent = businessName || 'Firma';

    brand.appendChild(logo);
    brand.appendChild(title);

    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'owner-clean-logout';
    out.textContent = 'Odjava';
    out.addEventListener('click', ev => {
      ev.preventDefault();
      const btn = findLogoutButton();
      if(btn && btn !== out) btn.click();
      else {
        localStorage.removeItem('token');
        location.href = '/';
      }
    });

    header.appendChild(brand);
    header.appendChild(out);

    if(oldHeader && oldHeader.parentElement){
      oldHeader.insertAdjacentElement('beforebegin', header);
      oldHeader.classList.add('owner-old-header-hidden');
    }else{
      document.body.insertAdjacentElement('afterbegin', header);
    }

    // Rename old profile label wherever it remains.
    Array.from(document.querySelectorAll('button,a')).forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if(t === 'profil/poruke' || t === 'profil i poruke' || t === 'profil') el.textContent = 'Profil firme';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(installCleanHeader, 400);
    setTimeout(installCleanHeader, 1200);
  });
})();



/* Owner Desktop Header Menu v71 */
(function(){
  function cleanTopHeader(){
    const header = document.getElementById('ownerCleanHeader');
    if(header){
      header.classList.add('owner-desktop-v71-header');
      const logo = header.querySelector('.owner-clean-logo');
      if(logo) logo.remove();

      const title = header.querySelector('.owner-clean-title');
      if(title){
        title.classList.add('owner-desktop-v71-title');
      }

      const out = header.querySelector('.owner-clean-logout');
      if(out){
        out.classList.add('owner-desktop-v71-logout');
      }
    }

    // Ako stari header nekad ostane vidljiv, sakrij "Panel firme".
    Array.from(document.querySelectorAll('h1,h2,h3,b,strong,span,div')).forEach(el=>{
      if((el.textContent||'').trim() === 'Panel firme'){
        const box = el.closest('header,.topbar,.navbar,.app-header,div');
        if(box && box.id !== 'ownerCleanHeader') box.style.display = 'none';
      }
    });
  }

  function normalizeMenuButtons(){
    const clone = document.getElementById('ownerStableNavClone');
    const nav = clone || document.querySelector('.owner-stable-nav-clone') || document.querySelector('nav') || document.querySelector('.tabs');

    if(!nav) return;

    nav.classList.add('owner-desktop-v71-menu');

    const buttons = Array.from(nav.querySelectorAll('button,a'));
    buttons.forEach(btn=>{
      btn.classList.add('owner-desktop-v71-menu-btn');

      const t = (btn.textContent || '').trim().toLowerCase();
      if(t === 'profil/poruke' || t === 'profil i poruke' || t === 'profil'){
        btn.textContent = 'Profil firme';
      }

      btn.addEventListener('click', ()=>{
        setTimeout(()=>setActiveMenu(btn.textContent || ''), 80);
      });
    });

    setActiveMenuFromContent();
  }

  function setActiveMenu(label){
    const navs = Array.from(document.querySelectorAll('#ownerStableNavClone,.owner-stable-nav-clone,nav,.tabs'));
    const wanted = String(label||'').trim().toLowerCase();

    navs.forEach(nav=>{
      Array.from(nav.querySelectorAll('button,a')).forEach(btn=>{
        const t = (btn.textContent||'').trim().toLowerCase();
        btn.classList.toggle('owner-desktop-v71-active', wanted && t === wanted);
      });
    });
  }

  function setActiveMenuFromContent(){
    const bodyText = (document.body.textContent || '').toLowerCase();

    const rules = [
      ['dashboard', ['osnovna strana','pregled']],
      ['termini', ['najbliži termini','mušterija']],
      ['link / qr kod', ['link za zakazivanje','qr kod']],
      ['radnici', ['dodaj radnika','aktivnih radnika']],
      ['usluge', ['dodaj uslugu','aktivnih usluga']],
      ['radno vreme', ['radno vreme']],
      ['blokirani', ['blokirani']],
      ['profil firme', ['podešavanje profila firme','podaci firme','automatske poruke']],
      ['log poruka', ['log poruka']]
    ];

    for(const [label, keys] of rules){
      if(keys.some(k=>bodyText.includes(k))){
        setActiveMenu(label);
        return;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(cleanTopHeader, 500);
    setTimeout(normalizeMenuButtons, 700);
    setTimeout(cleanTopHeader, 1300);
    setTimeout(normalizeMenuButtons, 1500);
  });

  document.addEventListener('click', ()=>{
    setTimeout(cleanTopHeader, 100);
    setTimeout(normalizeMenuButtons, 180);
  }, true);
})();
