const T='terminiOwnerToken',$=s=>document.querySelector(s),day=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];let tok=()=>localStorage.getItem(T)||localStorage.getItem('token')||'',today=()=>new Date().toISOString().split('T')[0],add=n=>{let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};async function api(u,o={}){let h={'Content-Type':'application/json',...(o.headers||{})};if(tok())h.Authorization='Bearer '+tok();let r=await fetch(u,{...o,headers:h}),d=await r.json();if(!r.ok)throw Error(d.error||'Greška');return d}function msg(t,c=''){om.textContent=t;om.className='msg '+c}function show(){login.classList.add('hidden');app.classList.remove('hidden')}function hide(){login.classList.remove('hidden');app.classList.add('hidden')}loginForm.onsubmit=async e=>{e.preventDefault();try{let d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:em.value,password:pw.value})});if(d.user.role!=='owner')throw Error('Nije nalog firme.');localStorage.setItem(T,d.token);localStorage.setItem('token',d.token);show();tab('dash')}catch(er){lm.textContent=er.message;lm.className='msg err'}};logout.onclick=()=>{localStorage.removeItem(T);localStorage.removeItem('token');hide()};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));function tab(id){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('#'+id).classList.remove('hidden');msg('');({dash:loadDash,bookinglink:loadBookingLink,appointments:loadAppointments,staff:loadStaff,services:loadServices,hours:loadHours,settings:loadSettings,logs:loadLogs}[id]||(()=>{}))()}async function loadDash(){let d=await api('/api/owner/dashboard');bn.textContent='Osnovna strana';cards.innerHTML=`<div class="item clean-stat"><b>Danas</b><h2>${d.cards.today}</h2><p>zakazanih termina</p></div><div class="item clean-stat"><b>7 dana</b><h2>${d.cards.week}</h2><p>u narednoj nedelji</p></div><div class="item clean-stat"><b>Radnici</b><h2>${d.cards.staff}</h2><p>aktivnih radnika</p></div><div class="item clean-stat"><b>Usluge</b><h2>${d.cards.services}</h2><p>aktivnih usluga</p></div>`;upcoming.innerHTML='<tr><th>Datum</th><th>Vreme</th><th>Mušterija</th><th>Usluga</th><th>Radnik</th><th>Status</th></tr>'+d.upcoming.map(a=>`<tr><td>${a.date}</td><td>${a.start_time}</td><td>${a.customer_name}<br>${a.phone}</td><td>${a.service_name}</td><td>${a.staff_name||'-'}</td><td>${a.status}</td></tr>`).join('')}
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
  const qrSource=ownerQrObjectUrl || await fetchOwnerQrDataUrl();
  const b=window.ownerBusinessForPrint||{};
  const businessName=(b.name||'Vaša firma').trim();
const phones=ownerPhoneParts(b.phone);
const phoneList=(phones.length?phones:['Telefon nije unet'])
  .map(p=>String(p).trim())
  .filter(Boolean)
  .slice(0,4);
const locationText=((b.address?b.address.trim():'') + ((b.address&&b.city)?', ':'') + (b.city?b.city.trim():'')) || 'Lokacija nije uneta';
const emailText=(b.email||'Email nije unet').trim();
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
    const pageW=595, pageH=842;
    const cols=2, rows=5;
    const marginX=28, marginY=28;
    const gutterX=14, gutterY=10;
    const cardW=(pageW-marginX*2-gutterX)/cols;
    const cardH=(pageH-marginY*2-gutterY*(rows-1))/rows;
    const qrSize=78;
    const qrImage=await qrToRgbImage(qrSource);
   const nameFontSize=14.5;
const nameMaxWidth=cardW*0.60-40;
const nameLines=wrapTextToWidth(businessName,nameFontSize,true,nameMaxWidth,3);
const locationLines=splitWords(locationText,36,3);
const phoneFontSize=7;
const phoneLineGap=10;
const phoneLines=phoneList;
const emailLines=splitWords(emailText,24,2);

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
        const dividerX=x+cardW*0.60;
        const qrCenterX=x+cardW*0.80;

        setStroke(0.72,0.72,0.72);
        rectStroke(x,y,cardW,cardH);

        setStroke(0.82,0.82,0.82);
        line(dividerX,y+18,dividerX,y+cardH-18);

        setFill(0,0,0);
        nameLines.forEach((ln,idx)=>{
        text(x+15,y+24+idx*16,nameFontSize,true,ln);
        });

        const infoY=y+82;
        phoneLines.forEach((ln,idx)=>{
        text(x+15,infoY+idx*phoneLineGap,phoneFontSize,false,ln);
        });

        const locationStartY=infoY+phoneLines.length*phoneLineGap+15;
        locationLines.forEach((ln,idx)=>{
        text(x+15,locationStartY+idx*11,9.4,false,ln);
        });
        
        centeredText(qrCenterX,y+28,8,true,'ZAKAŽITE TERMIN');
        centeredText(qrCenterX,y+39,8,true,'ONLINE');

        const imgX=qrCenterX-qrSize/2;
        const imgTop=y+48;
        const imgY=pageH-imgTop-qrSize;
        content += `q ${qrSize} 0 0 ${qrSize} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm /Im0 Do Q\n`;

        emailLines.forEach((ln,idx)=>centeredText(qrCenterX,y+135+idx*8,8.2,false,ln));
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
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='qr-vizit-kartice.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const w=window.open(url,'_blank');
  if(!w){
    msg('PDF je preuzet kao fajl qr-vizit-kartice.pdf. Otvori ga i štampaj.', 'ok');
  }else{
    msg('Napravljen je PDF fajl sa QR vizit karticama.', 'ok');
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
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='poster-a4-termini.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  const w=window.open(url,'_blank');
  if(!w)msg('A4 poster je preuzet kao PDF fajl.', 'ok');
  else msg('Napravljen je A4 poster PDF.', 'ok');
  setTimeout(()=>URL.revokeObjectURL(url),60000);
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



/* Owner Facebook Style Header v74 */
(function(){
  async function ownerApi(path){
    const token = localStorage.getItem('terminiOwnerToken') || localStorage.getItem('token') || '';
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
          localStorage.removeItem('terminiOwnerToken');
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
