const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];let tok=()=>localStorage.getItem(T)||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}function msg(t,c=''){om.textContent=t;om.className='msg '+c}function show(){login.classList.add('hidden');app.classList.remove('hidden')}function hide(){login.classList.remove('hidden');app.classList.add('hidden')}loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};logout.onclick=()=>{localStorage.removeItem(T);hide()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));function tab(id){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');msg('');({dash:loadDash,bookinglink:loadBookingLink,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,settings:loadSettings,logs:loadLogs}[id]||(()=>{}))()}async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent='Osnovna strana';cards.innerHTML=`<div class="item clean-stat"><b>Danas</b><h2>${d.cards.today}</h2><p>zakazanih termina</p></div><div class="item clean-stat"><b>7 dana</b><h2>${d.cards.week}</h2><p>u narednoj nedelji</p></div><div class="item clean-stat"><b>Radnici</b><h2>${d.cards.staff}</h2><p>aktivnih radnika</p></div><div class="item clean-stat"><b>Usluge</b><h2>${d.cards.services}</h2><p>aktivnih usluga</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td></tr>`).join('')}
let ownerServiceCache=[], ownerStaffCache=[];

async function loadManualOptions(){
  ownerServiceCache = await api('/api/owner/services');
  ownerStaffCache = await api('/api/owner/staff');

  if(typeof manualService!=='undefined'){
    let activeServices = ownerServiceCache.filter(x=>x.active!==0);
    manualService.innerHTML = activeServices.map(x=>`<option value="${x.id}">${htmlEsc(x.name)} · ${x.duration} min</option>`).join('');
  }

  if(typeof manualStaff!=='undefined'){
    let activeStaff = ownerStaffCache.filter(x=>x.active!==0);
    manualStaff.innerHTML = '<option value="">Bilo koji slobodan radnik</option>' + activeStaff.map(x=>`<option value="${x.id}">${htmlEsc(x.name)}</option>`).join('');
  }

  if(typeof manualDate!=='undefined' && !manualDate.value) manualDate.value = today();
  await updateManualSlots();
}

async function updateManualSlots(){
  if(typeof manualTime==='undefined' || !manualService || !manualService.value || !manualDate || !manualDate.value) return;
  manualTime.innerHTML = '<option value="">Učitavam...</option>';
  try{
    let p = new URLSearchParams({date:manualDate.value,service_id:manualService.value});
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
  if(typeof manualService!=='undefined') await loadManualOptions();

  if(!from.value)from.value=today();
  if(!to.value)to.value=add(30);
  let p=new URLSearchParams({from:from.value,to:to.value});
  if(status.value)p.set('status',status.value);
  let rows=await api('/api/owner/appointments?'+p);

  appointmentsBody.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th><th>Promeni</th></tr>'+rows.map(a=>`
    <tr>
      <td>${a.date}</td>
      <td>${a.start_time}-${a.end_time}</td>
      <td>${htmlEsc(a.customer_name)}<br>${htmlEsc(a.phone)}</td>
      <td>${htmlEsc(a.service_name)}</td>
      <td>${htmlEsc(a.staff_name||'-')}</td>
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
      loadAppointments();
    }
  });
}

if(typeof manualService!=='undefined') manualService.onchange=updateManualSlots;
if(typeof manualStaff!=='undefined') manualStaff.onchange=updateManualSlots;
if(typeof manualDate!=='undefined') manualDate.onchange=updateManualSlots;
if(typeof manualSlotRefresh!=='undefined') manualSlotRefresh.onclick=updateManualSlots;
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
      service_id:manualService.value,
      staff_id:manualStaff.value || (selected ? selected.dataset.staff : ''),
      date:manualDate.value,
      start_time:manualTime.value,
      notes:manualNotes.value
    })
  });
  msg('Termin je dodat.','ok');
  manualName.value='';manualPhone.value='';manualEmail.value='';manualNotes.value='';
  await updateManualSlots();
  await loadAppointments();
};

function resetSt(){staffId.value='';staffName.value='';staffTitle.value='';staffPhone.value='';staffEmail.value='';staffSort.value=0;staffActive.checked=true}resetStaff.onclick=resetSt;staffForm.onsubmit=async e=>{e.preventDefault();let id=staffId.value,p={name:staffName.value,title:staffTitle.value,phone:staffPhone.value,email:staffEmail.value,sort_order:+staffSort.value,active:staffActive.checked};await api(id?'/api/owner/staff/'+id:'/api/owner/staff',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Radnik sačuvan.','ok');resetSt();loadStaff()};async function loadStaff(){let rows=await api('/api/owner/staff');staffList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.title||''} ${x.phone||''}</p><div class="badges"><span>${x.active?'Aktivan':'Ugašen'}</span></div><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');staffList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);staffId.value=x.id;staffName.value=x.name;staffTitle.value=x.title||'';staffPhone.value=x.phone||'';staffEmail.value=x.email||'';staffSort.value=x.sort_order;staffActive.checked=!!x.active})}function resetSv(){serviceId.value='';serviceName.value='';serviceDesc.value='';serviceDuration.value=30;servicePrice.value=1000;serviceSort.value=0;serviceActive.checked=true}resetService.onclick=resetSv;serviceForm.onsubmit=async e=>{e.preventDefault();let id=serviceId.value,p={name:serviceName.value,description:serviceDesc.value,duration:+serviceDuration.value,price:+servicePrice.value,sort_order:+serviceSort.value,active:serviceActive.checked};await api(id?'/api/owner/services/'+id:'/api/owner/services',{method:id?'PUT':'POST',body:JSON.stringify(p)});msg('Usluga sačuvana.','ok');resetSv();loadServices()};async function loadServices(){let rows=await api('/api/owner/services');serviceList.innerHTML=rows.map(x=>`<article class="item"><h3>${x.name}</h3><p>${x.duration} min · ${x.price} RSD</p><button class="btn small ghost" data-id="${x.id}">Izmeni</button></article>`).join('');serviceList.querySelectorAll('button').forEach(b=>b.onclick=()=>{let x=rows.find(r=>r.id==b.dataset.id);serviceId.value=x.id;serviceName.value=x.name;serviceDesc.value=x.description||'';serviceDuration.value=x.duration;servicePrice.value=x.price;serviceSort.value=x.sort_order;serviceActive.checked=!!x.active})}async function loadHours(){
  let rows=await api('/api/owner/working-hours');
  hoursForm.innerHTML=rows.map(x=>`
    <div class="item hour" data-day="${x.day}">
      <b>${day[x.day]}</b>
      <label><input class="open" type="checkbox" ${x.is_open?'checked':''}> Otvoreno</label>
      <label>Otvara<input class="ot" type="time" value="${x.open_time||''}"></label>
      <label>Zatvara<input class="ct" type="time" value="${x.close_time||''}"></label>
      <label>Pauza od<input class="bs" type="time" value="${x.break_start||''}"></label>
      <label>Pauza do<input class="be" type="time" value="${x.break_end||''}"></label>
    </div>`).join('');
  await loadBlocked();
}

saveHours.onclick=async()=>{
  let rows=[...document.querySelectorAll('.hour')].map(x=>({
    day:+x.dataset.day,
    is_open:x.querySelector('.open').checked,
    open_time:x.querySelector('.ot').value,
    close_time:x.querySelector('.ct').value,
    break_start:x.querySelector('.bs').value,
    break_end:x.querySelector('.be').value
  }));
  await api('/api/owner/working-hours',{method:'PUT',body:JSON.stringify({rows})});
  msg('Radno vreme je sačuvano.','ok');
};

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
  loadBlocked();
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
  const link=bookingUrlInput.value;
  const qrSource=ownerQrObjectUrl || await fetchOwnerQrDataUrl();

  const splitFixed=(text,max)=>{
    const out=[];
    let rest=String(text||'');
    while(rest.length>max){
      out.push(rest.slice(0,max));
      rest=rest.slice(max);
    }
    if(rest.trim())out.push(rest);
    return out;
  };

  const loadImage=(src)=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Ne mogu da učitam QR sliku.'));
    img.src=src;
  });

  const qrToPngBytes=async(src)=>{
    const img=await loadImage(src);
    const canvas=document.createElement('canvas');
    canvas.width=300;
    canvas.height=300;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,300,300);
    ctx.drawImage(img,0,0,300,300);
    const dataUrl=canvas.toDataURL('image/png');
    const b64=dataUrl.split(',')[1];
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return bytes;
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

  function pdfTextWidthApprox(value,size,bold){
    return String(value||'').length*size*(bold?0.56:0.50);
  }

  async function makePdf(){
    const pageW=595, pageH=842;
    const cols=3, rows=4;
    const startX=35, startY=82, cardW=175, cardH=181;
    const qrSize=88;
    const qrPngBytes=await qrToPngBytes(qrSource);
    const linkLines=splitFixed(link,25).slice(0,3);

    const yPdf=(y)=>pageH-y;

    let content='';
    const line=(x1,y1,x2,y2)=>{ content += `${x1} ${yPdf(y1)} m ${x2} ${yPdf(y2)} l S\n`; };
    const text=(x,y,size,bold,value)=>{
      content += `BT /F${bold?2:1} ${size} Tf ${x.toFixed(2)} ${yPdf(y).toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`;
    };
    const centeredText=(x,y,size,bold,value)=>{
      const txt=escapePdfText(value);
      const approxWidth=pdfTextWidthApprox(txt,size,bold);
      text(x-approxWidth/2,y,size,bold,value);
    };

    content += '0.9 w\n0 0 0 RG\n0 0 0 rg\n';
    centeredText(297.5,35,23,true,'QR kartice za zakazivanje termina');
    centeredText(297.5,58,12,false,'Odstampajte list, isecite kartice i podelite ih musterijama.');

    for(let i=0;i<=cols;i++){
      const x=startX+i*cardW;
      line(x,startY,x,startY+rows*cardH);
    }
    for(let i=0;i<=rows;i++){
      const y=startY+i*cardH;
      line(startX,y,startX+cols*cardW,y);
    }

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x=startX+c*cardW;
        const y=startY+r*cardH;
        const cx=x+cardW/2;
        centeredText(cx,y+21,14.5,true,'Zakazite termin');
        const imgX=x+(cardW-qrSize)/2;
        const imgTop=y+32;
        const imgY=pageH-imgTop-qrSize;
        content += `q ${qrSize} 0 0 ${qrSize} ${imgX} ${imgY} cm /Im0 Do Q\n`;
        centeredText(cx,y+132,10.8,true,'Link za zakazivanje:');
        linkLines.forEach((ln,idx)=>centeredText(cx,y+147+idx*12,10.4,false,ln));
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

    const imgHeader=encoder.encode(`<< /Type /XObject /Subtype /Image /Width 300 /Height 300 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${qrPngBytes.length} >>\nstream\n`);
    const imgFooter=encoder.encode('\nendstream');
    const imgObj=new Uint8Array(imgHeader.length+qrPngBytes.length+imgFooter.length);
    imgObj.set(imgHeader,0);
    imgObj.set(qrPngBytes,imgHeader.length);
    imgObj.set(imgFooter,imgHeader.length+qrPngBytes.length);
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
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='qr-kartice-termini.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const w=window.open(url,'_blank');
  if(!w){
    msg('PDF je preuzet kao fajl qr-kartice-termini.pdf. Otvori ga i štampaj.', 'ok');
  }else{
    msg('Napravljen je PDF fajl. Otvori ga i štampaj/sacuvaj.', 'ok');
  }
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){msg(e.message,'err')}
}
if(typeof printQrPdfBtn!=='undefined')printQrPdfBtn.onclick=printQrPdfList;

async function printA4DoorPoster(){
 try{
  await loadBookingLink();
  const link=bookingUrlInput.value;
  const b=window.ownerBusinessForPrint||{};
  const name=b.name||'Vaša firma';
  const qrSource=ownerQrObjectUrl||ownerQrPreview.src||await fetchOwnerQrDataUrl();

  const staffCount=(typeof currentStaffCount!=='undefined'&&currentStaffCount)?currentStaffCount:1;
  const subtitle=staffCount>1
   ?'Bez poziva — izaberite uslugu, radnika i slobodan termin.'
   :'Bez poziva — izaberite uslugu i slobodan termin.';

  const splitFixed=(text,max)=>{
   const out=[];
   let rest=String(text||'');
   while(rest.length>max){
    out.push(rest.slice(0,max));
    rest=rest.slice(max);
   }
   if(rest.trim())out.push(rest);
   return out;
  };

  const loadImage=(src)=>new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(new Error('Ne mogu da učitam QR sliku.'));
   img.src=src;
  });

  const jpegBytesFromDataUrl=(dataUrl)=>{
   const b64=String(dataUrl).split(',')[1]||'';
   const bin=atob(b64);
   const bytes=new Uint8Array(bin.length);
   for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
   return bytes;
  };

  const makePosterJpegBytes=async()=>{
   const img=await loadImage(qrSource);
   const canvas=document.createElement('canvas');
   canvas.width=1190;
   canvas.height=1684;
   const ctx=canvas.getContext('2d');
   const S=2;

   function roundRect(x,y,w,h,r,fill,stroke,lineWidth){
    x*=S;y*=S;w*=S;h*=S;r*=S;
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=(lineWidth||1)*S;ctx.stroke();}
   }

   function fitText(text,maxWidth,baseSize,bold){
    let size=baseSize*S;
    ctx.font=(bold?'900 ':'400 ')+size+'px Arial, Helvetica, sans-serif';
    while(ctx.measureText(text).width>maxWidth*S && size>12*S){
     size-=S;
     ctx.font=(bold?'900 ':'400 ')+size+'px Arial, Helvetica, sans-serif';
    }
    return size/S;
   }

   function centered(text,x,y,size,color,bold){
    ctx.fillStyle=color||'#111827';
    ctx.textAlign='center';
    ctx.textBaseline='alphabetic';
    ctx.font=(bold?'900 ':'400 ')+(size*S)+'px Arial, Helvetica, sans-serif';
    ctx.fillText(String(text||''),x*S,y*S);
   }

   // Android poster koordinate: A4 595x842, samo x2 zbog oštrine
   ctx.fillStyle='#ffffff';
   ctx.fillRect(0,0,canvas.width,canvas.height);

   roundRect(28,28,539,786,18,'#ffffff','#111827',3);
   roundRect(46,46,503,109,18,'#111827',null,0);

   centered('SKENIRAJTE I ZAKAŽITE',297.5,93,29,'#ffffff',true);
   centered('TERMIN ONLINE',297.5,128,25,'#ffffff',true);

   const nameSize=fitText(name,460,27,true);
   centered(name,297.5,205,nameSize,'#111827',true);

   const subSize=fitText(subtitle,500,15,false);
   centered(subtitle,297.5,233,subSize,'#374151',false);

   roundRect(105,260,385,385,24,'#f9fafb','#d1d5db',2);

   // QR belo polje kao Android
   ctx.fillStyle='#ffffff';
   ctx.fillRect(150*S,298*S,295*S,295*S);
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(img,150*S,298*S,295*S,295*S);
   ctx.imageSmoothingEnabled=true;

   centered('Otvorite kameru telefona i skenirajte QR kod',297.5,680,16,'#111827',true);
   centered('Link za zakazivanje:',297.5,708,11.5,'#374151',false);

   const lines=splitFixed(link,38).slice(0,3);
   let y=728;
   for(const line of lines){
    centered(line,297.5,y,10.5,'#374151',false);
    y+=14;
   }

   return jpegBytesFromDataUrl(canvas.toDataURL('image/jpeg',0.98));
  };

  function makeImagePdf(jpegBytes){
   const enc=new TextEncoder();
   const objs=[];
   const add=(body)=>objs.push(typeof body==='string'?enc.encode(body):body);

   add('<< /Type /Catalog /Pages 2 0 R >>');
   add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
   add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>');

   const imgHeader=enc.encode(`<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
   const imgFooter=enc.encode('\nendstream');
   const imgObj=new Uint8Array(imgHeader.length+jpegBytes.length+imgFooter.length);
   imgObj.set(imgHeader,0);
   imgObj.set(jpegBytes,imgHeader.length);
   imgObj.set(imgFooter,imgHeader.length+jpegBytes.length);
   add(imgObj);

   const content='q 595 0 0 842 0 0 cm /Poster Do Q\n';
   const contentBytes=enc.encode(content);
   const cHead=enc.encode(`<< /Length ${contentBytes.length} >>\nstream\n`);
   const cFoot=enc.encode('\nendstream');
   const cObj=new Uint8Array(cHead.length+contentBytes.length+cFoot.length);
   cObj.set(cHead,0);
   cObj.set(contentBytes,cHead.length);
   cObj.set(cFoot,cHead.length+contentBytes.length);
   add(cObj);

   let parts=[enc.encode('%PDF-1.4\n%TerminiPro\n')];
   let offsets=[0];
   let pos=parts[0].length;
   for(let i=0;i<objs.length;i++){
    offsets.push(pos);
    const head=enc.encode(`${i+1} 0 obj\n`);
    const tail=enc.encode('\nendobj\n');
    parts.push(head,objs[i],tail);
    pos+=head.length+objs[i].length+tail.length;
   }
   const xrefPos=pos;
   let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
   for(let i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
   xref+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
   parts.push(enc.encode(xref));
   const total=parts.reduce((s,p)=>s+p.length,0);
   const pdf=new Uint8Array(total);
   let o=0;
   for(const p of parts){pdf.set(p,o);o+=p.length}
   return new Blob([pdf],{type:'application/pdf'});
  }

  const jpegBytes=await makePosterJpegBytes();
  const blob=makeImagePdf(jpegBytes);
  const url=URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download='poster-a4-termini.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const w=window.open(url,'_blank');
  if(!w)msg('PDF je preuzet kao fajl poster-a4-termini.pdf. Otvori ga i štampaj.', 'ok');
  else msg('Napravljen je A4 poster PDF isti kao Android raspored.', 'ok');

  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){msg(e.message,'err')}
}
if(typeof printA4PosterBtn!=='undefined')printA4PosterBtn.onclick=printA4DoorPoster;


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



/* Owner Facebook Style Header v74 */
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

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(installFixedWideHeader, 250);
    setTimeout(installFixedWideHeader, 1000);
  });

  document.addEventListener('click', () => {
    setTimeout(installFixedWideHeader, 120);
  }, true);
})();



/* Owner Remove Duplicate Nonworking v76 */
(function(){
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

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(removeDuplicateNonworking, 200);
    setTimeout(removeDuplicateNonworking, 1000);
  });
  document.addEventListener('click', () => setTimeout(removeDuplicateNonworking, 100), true);
})();



/* Owner Manual Appointment Toggle v77 */
(function(){
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

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupManualAppointmentToggle, 200);
    setTimeout(setupManualAppointmentToggle, 1000);
  });
  document.addEventListener('click', () => setTimeout(setupManualAppointmentToggle, 80), true);
})();



/* Owner Remove Novo Badge v78 */
(function(){
  function removeNovoBadges(){
    document.querySelectorAll('.novo,.new-badge,.manual-new-badge,.owner-new-badge,.badge-novo,[data-badge="novo"]').forEach(el=>el.remove());
    document.querySelectorAll('span,b,small,em,strong').forEach(el=>{
      if((el.textContent||'').trim().toUpperCase()==='NOVO') el.remove();
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(removeNovoBadges,100);setTimeout(removeNovoBadges,800)});
  document.addEventListener('click',()=>setTimeout(removeNovoBadges,80),true);
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

    setTimeout(() => {
      const first = document.getElementById('manualName');
      if(first) first.focus({preventScroll:true});
    }, 120);

    if(typeof loadManualOptions === 'function'){
      try{ loadManualOptions(); }catch(e){}
    }
  }

  function closeModal(){
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

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(install, 200);
    setTimeout(install, 1000);
  });

  document.addEventListener('click', function(){
    setTimeout(install, 80);
  }, true);
})();
