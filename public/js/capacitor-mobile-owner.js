/* =========================================================
   Capacitor Android mobilni UI za owner.html
   Pravi tamni gornji header, donji meni i ekran "Još"
   kao u Android verziji, bez menjanja backend logike.
========================================================= */
(function(){
  const META={
    dash:{title:'Početak',subtitle:'Pregled poslovanja',nav:'home'},
    appointments:{title:'Termini',subtitle:'Zakazivanja i lista termina',nav:'appointments'},
    staff:{title:'Radnici',subtitle:'Radnici, telefoni i pristup',nav:'staff'},
    bookinglink:{title:'QR/PDF',subtitle:'QR kodovi i štampa',nav:'qr'},
    services:{title:'Usluge',subtitle:'Usluge koje firma nudi',nav:'more'},
    hours:{title:'Radno vreme',subtitle:'Radno vreme i neradni dani',nav:'more'},
    settings:{title:'Profil firme',subtitle:'Podaci firme, lokacije i poruke',nav:'more'},
    logs:{title:'Log poruka',subtitle:'Poruke i obaveštenja',nav:'more'},
    more:{title:'Još',subtitle:'Ostale funkcije',nav:'more'},
    device:{title:'Radnički uređaj',subtitle:'Zaključavanje uređaja za jednu lokaciju',nav:'more'},
    subscription:{title:'Pretplata',subtitle:'Plan i status naloga',nav:'more'},
    reset:{title:'Reset podataka',subtitle:'Brisanje test podataka',nav:'more'}
  };

  let customScreen='';
  let updating=false;

  function $(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function mobile(){return window.matchMedia && window.matchMedia('(max-width: 820px)').matches}

  function ready(fn){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }

  function labelForLocation(l){
    const address=String((l&&l.address)||'').trim();
    if(address)return address;
    const name=String((l&&l.name)||'').trim();
    if(name && !/^lokacija\s*\d*$/i.test(name))return name;
    const city=String((l&&l.city)||'').trim();
    if(city)return city;
    return 'Adresa nije uneta';
  }

  function addFieldClasses(){
    const instagram=$('setInstagram');
    const website=$('setWebsite');
    const desc=$('setDesc');
    if(instagram&&instagram.closest('label'))instagram.closest('label').classList.add('cap-field-instagram');
    if(website&&website.closest('label'))website.closest('label').classList.add('cap-field-website');
    if(desc&&desc.closest('label'))desc.closest('label').classList.add('cap-field-description');
    document.querySelectorAll('.multi-phone-title-v159').forEach(el=>{
      if(el.textContent.toLowerCase().includes('telefoni firme'))el.textContent='Telefoni firme';
      if(el.textContent.toLowerCase().includes('telefoni lokacije'))el.textContent='Telefoni lokacije';
    });
  }

  function ensureChrome(){
    if(!$('capMobileOwnerHeader')){
      const header=document.createElement('div');
      header.id='capMobileOwnerHeader';
      header.className='cap-mobile-owner-header';
      header.innerHTML='<div id="capMobileOwnerTitle" class="cap-mobile-owner-title">Početak</div><div id="capMobileOwnerSubtitle" class="cap-mobile-owner-subtitle">Pregled poslovanja</div>';
      document.body.insertAdjacentElement('afterbegin',header);
    }

    if(!$('capMobileBottomNav')){
      const nav=document.createElement('nav');
      nav.id='capMobileBottomNav';
      nav.className='cap-mobile-bottom-nav';
      nav.innerHTML=`
        <button type="button" data-mobile-nav="home">Početak</button>
        <button type="button" data-mobile-nav="appointments">Termini</button>
        <button type="button" data-mobile-nav="staff">Radnici</button>
        <button type="button" data-mobile-nav="qr">QR/PDF</button>
        <button type="button" data-mobile-nav="more">Još</button>`;
      document.body.appendChild(nav);
      nav.querySelector('[data-mobile-nav="home"]').onclick=()=>openTab('dash');
      nav.querySelector('[data-mobile-nav="appointments"]').onclick=()=>openTab('appointments');
      nav.querySelector('[data-mobile-nav="staff"]').onclick=()=>openTab('staff');
      nav.querySelector('[data-mobile-nav="qr"]').onclick=()=>openTab('bookinglink');
      nav.querySelector('[data-mobile-nav="more"]').onclick=()=>showMore();
    }
  }

  function ensureScreens(){
    const app=$('app');
    if(!app)return;

    if(!$('capMobileMoreScreen')){
      const more=document.createElement('section');
      more.id='capMobileMoreScreen';
      more.className='cap-mobile-screen hidden';
      more.innerHTML=`
        <div class="cap-mobile-more-list">
          <button class="cap-mobile-more-button" type="button" data-more-tab="services">Usluge</button>
          <button class="cap-mobile-more-button" type="button" data-more-tab="hours">Radno vreme</button>
          <button class="cap-mobile-more-button" type="button" data-more-tab="settings">Profil firme</button>
          <button class="cap-mobile-more-button" type="button" data-more-tab="bookinglink">QR kodovi i štampa</button>
          <button class="cap-mobile-more-button" type="button" data-more-custom="device">Radnički uređaj</button>
          <button class="cap-mobile-more-button" type="button" data-more-tab="logs">Log poruka</button>
          <button class="cap-mobile-more-button" type="button" data-more-custom="subscription">Pretplata</button>
          <button class="cap-mobile-more-button" type="button" data-more-custom="reset">Reset podataka</button>
          <button class="cap-mobile-more-button" type="button" data-more-action="logout">Odjava</button>
        </div>`;
      app.appendChild(more);
      more.querySelectorAll('[data-more-tab]').forEach(btn=>btn.onclick=()=>openTab(btn.dataset.moreTab,true));
      more.querySelectorAll('[data-more-custom]').forEach(btn=>btn.onclick=()=>showCustom(btn.dataset.moreCustom));
      const logout=more.querySelector('[data-more-action="logout"]');
      if(logout)logout.onclick=()=>{
        const old=$('logout') || Array.from(document.querySelectorAll('button,a')).find(el=>(el.textContent||'').trim().toLowerCase()==='odjava');
        if(old)old.click();
      };
    }

    if(!$('capMobileDeviceScreen')){
      const dev=document.createElement('section');
      dev.id='capMobileDeviceScreen';
      dev.className='cap-mobile-screen hidden';
      dev.innerHTML=`
        <div class="cap-device-stack">
          <div class="cap-device-card">
            <h2>Zaključaj uređaj za lokaciju</h2>
            <p>Kao u desktop verziji: ovaj telefon će se vezati za izabranu lokaciju i prikazivaće radnički ekran samo za tu lokaciju.</p>
          </div>
          <div class="cap-device-card">
            <h3>Izaberi lokaciju</h3>
            <div class="cap-device-form">
              <label class="cap-device-select-wrap"><select id="capTabletLocation"></select></label>
              <label>Naziv uređaja<input id="capTabletDeviceName" placeholder="Uređaj"></label>
              <button id="capTabletActivate" class="cap-device-primary" type="button">Zaključaj uređaj i otvori radnički ekran</button>
              <p id="capTabletMsg" class="msg"></p>
            </div>
          </div>
          <div class="cap-device-card">
            <h3>Povezani uređaji</h3>
            <div id="capTabletDevicesList" class="cap-device-empty">Učitavam...</div>
          </div>
        </div>`;
      app.appendChild(dev);
      const sel=dev.querySelector('#capTabletLocation');
      if(sel)sel.onchange=syncDeviceName;
      const btn=dev.querySelector('#capTabletActivate');
      if(btn)btn.onclick=activateDevice;
    }

    if(!$('capMobileSubscriptionScreen')){
      const sub=document.createElement('section');
      sub.id='capMobileSubscriptionScreen';
      sub.className='cap-mobile-screen hidden';
      sub.innerHTML=`<div class="cap-device-stack"><div class="cap-device-card"><h2>Pretplata</h2><p>Ovaj ekran je spreman za Android/Google Play pretplatu. Backend već ostaje isti; ovde se kasnije povezuje kupovina iz aplikacije.</p></div></div>`;
      app.appendChild(sub);
    }

    if(!$('capMobileResetScreen')){
      const reset=document.createElement('section');
      reset.id='capMobileResetScreen';
      reset.className='cap-mobile-screen hidden';
      reset.innerHTML=`<div class="cap-device-stack"><div class="cap-device-card"><h2>Reset podataka</h2><p>Ovaj ekran je ostavljen za test reset. Namerno nije povezan sa brisanjem podataka dok ne potvrdiš tačno šta sme da se briše.</p></div></div>`;
      app.appendChild(reset);
    }
  }

  function hideCustomScreens(){
    ['capMobileMoreScreen','capMobileDeviceScreen','capMobileSubscriptionScreen','capMobileResetScreen'].forEach(id=>$(id)?.classList.add('hidden'));
    customScreen='';
  }

  function hideOwnerTabs(){
    document.querySelectorAll('#app > .tab').forEach(el=>el.classList.add('hidden'));
    document.querySelectorAll('#app > .tabs button').forEach(btn=>btn.classList.remove('active'));
  }

  function activeOriginalTab(){
    const b=document.querySelector('#app > .tabs button.active');
    return b ? b.dataset.tab : 'dash';
  }

  function currentKey(){
    return customScreen || activeOriginalTab();
  }

  function updateHeader(){
    const key=currentKey();
    const data=META[key]||META.dash;
    const title=$('capMobileOwnerTitle');
    const sub=$('capMobileOwnerSubtitle');
    if(title)title.textContent=data.title;
    if(sub)sub.textContent=data.subtitle;
    document.querySelectorAll('#capMobileBottomNav button').forEach(btn=>{
      btn.classList.toggle('cap-active',btn.dataset.mobileNav===data.nav);
    });
    addFieldClasses();
  }

  function showMore(){
    ensureChrome();ensureScreens();
    updating=true;
    hideOwnerTabs();
    hideCustomScreens();
    customScreen='more';
    $('capMobileMoreScreen')?.classList.remove('hidden');
    updateHeader();
    updating=false;
    window.scrollTo({top:0,behavior:'auto'});
  }

  function showCustom(name){
    ensureChrome();ensureScreens();
    updating=true;
    hideOwnerTabs();
    hideCustomScreens();
    customScreen=name;
    const map={device:'capMobileDeviceScreen',subscription:'capMobileSubscriptionScreen',reset:'capMobileResetScreen'};
    $(map[name])?.classList.remove('hidden');
    updateHeader();
    updating=false;
    window.scrollTo({top:0,behavior:'auto'});
    if(name==='device')loadDeviceScreen();
  }

  function openTab(tabId){
    ensureChrome();ensureScreens();
    hideCustomScreens();
    const btn=document.querySelector(`#app > .tabs button[data-tab="${tabId}"]`);
    if(btn){
      btn.click();
      setTimeout(()=>{customScreen='';updateHeader();window.scrollTo({top:0,behavior:'auto'});},60);
    }
  }

  async function getLocations(){
    if(typeof ensureOwnerLocationsLoaded==='function')return await ensureOwnerLocationsLoaded(true);
    if(typeof api==='function')return await api('/api/owner/locations');
    return [];
  }

  async function loadDeviceScreen(){
    const sel=$('capTabletLocation');
    const msg=$('capTabletMsg');
    if(msg){msg.textContent='';msg.className='msg';}
    try{
      const rows=await getLocations();
      if(sel){
        sel.innerHTML=(rows||[]).filter(l=>l&&l.active!==0).map(l=>`<option value="${esc(l.id)}">${esc(labelForLocation(l))}</option>`).join('') || '<option value="">Nema lokacija</option>';
        syncDeviceName();
      }
    }catch(e){
      if(sel)sel.innerHTML='<option value="">Ne mogu da učitam lokacije</option>';
    }
    await loadDeviceList();
  }

  function syncDeviceName(){
    const sel=$('capTabletLocation');
    const input=$('capTabletDeviceName');
    if(!sel||!input)return;
    const text=sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : 'lokacije';
    input.value='Uređaj '+text;
  }

  async function activateDevice(){
    const sel=$('capTabletLocation');
    const msg=$('capTabletMsg');
    if(!sel||!sel.value){if(msg){msg.textContent='Izaberi lokaciju.';msg.className='msg err';}return;}
    const text=sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : 'lokaciju';
    try{
      if(typeof activateTabletForLocation==='function'){
        activateTabletForLocation(sel.value,text);
        return;
      }
      if(typeof api==='function'){
        const d=await api('/api/owner/location-devices',{method:'POST',body:JSON.stringify({location_id:sel.value,device_name:($('capTabletDeviceName')||{}).value||('Uređaj '+text)})});
        if(typeof enterTabletLockedMode==='function')enterTabletLockedMode(d.device_token);
      }
    }catch(e){
      if(msg){msg.textContent=e.message||'Ne mogu da povežem uređaj.';msg.className='msg err';}
    }
  }

  async function loadDeviceList(){
    const box=$('capTabletDevicesList');
    if(!box)return;
    try{
      if(typeof api!=='function')throw new Error('API nije spreman');
      const rows=await api('/api/owner/location-devices');
      if(!rows.length){box.innerHTML='<p class="cap-device-empty">Nema povezanih uređaja.</p>';return;}
      box.innerHTML=rows.map(x=>`<article class="item tablet-device-row-v126"><div><h3>${esc(x.device_name||'Uređaj')}</h3><p class="muted">${esc(x.location_name||'Lokacija')} · ${x.active?'aktivan':'deaktiviran'}${x.last_seen_at?' · poslednje viđen: '+esc(x.last_seen_at):''}</p></div>${x.active?`<button class="btn small danger cap-device-remove" type="button" data-id="${esc(x.id)}">Deaktiviraj</button>`:''}</article>`).join('');
      box.querySelectorAll('.cap-device-remove').forEach(btn=>btn.onclick=async()=>{
        await api('/api/owner/location-devices/'+encodeURIComponent(btn.dataset.id),{method:'DELETE'});
        await loadDeviceList();
      });
    }catch(_e){
      box.innerHTML='<p class="cap-device-empty">Ne mogu da učitam povezane uređaje.</p>';
    }
  }


  function syncAppVisibility(){
    const app=$('app');
    const visible=!!(app && !app.classList.contains('hidden'));
    document.body.classList.toggle('cap-owner-app-visible',visible);
  }

  function observeTabs(){
    const tabs=document.querySelector('#app > .tabs');
    if(!tabs)return;
    const mo=new MutationObserver(()=>{
      if(updating||customScreen)return;
      updateHeader();
    });
    tabs.querySelectorAll('button').forEach(btn=>mo.observe(btn,{attributes:true,attributeFilter:['class']}));
  }

  function install(){
    document.body.classList.add('cap-mobile-owner-ready');
    ensureChrome();
    ensureScreens();
    addFieldClasses();
    syncAppVisibility();
    const app=$('app');
    if(app){
      new MutationObserver(()=>{syncAppVisibility();setTimeout(updateHeader,40);}).observe(app,{attributes:true,attributeFilter:['class']});
    }
    observeTabs();
    updateHeader();
  }

  ready(()=>{
    install();
    setTimeout(updateHeader,200);
    setTimeout(updateHeader,800);
  });
})();

;(()=>{try{if(document.getElementById('cap-force-small-js-style'))return;const s=document.createElement('style');s.id='cap-force-small-js-style';s.textContent='\n/* =========================================================\n   FORCE COMPACT ANDROID - v99\n   Ako se ovo učita, izgled MORA biti sitan. Namerno je poslednje.\n========================================================= */\n@media (max-width: 1400px){\n  html, body{font-size:10px !important;-webkit-text-size-adjust:100% !important;text-size-adjust:100% !important;}\n  body.cap-mobile-owner-ready{padding-top:calc(48px + env(safe-area-inset-top,0px)) !important;padding-bottom:calc(39px + env(safe-area-inset-bottom,0px)) !important;background:#f4f6fb !important;}\n  body.cap-mobile-owner-ready #app.shell{padding:0 5px calc(43px + env(safe-area-inset-bottom,0px)) !important;margin:0 !important;max-width:100% !important;width:100% !important;gap:0 !important;overflow-x:hidden !important;}\n  body.cap-mobile-owner-ready #app,body.cap-mobile-owner-ready #app *{box-sizing:border-box !important;max-width:100% !important;}\n  .cap-mobile-owner-header{min-height:calc(48px + env(safe-area-inset-top,0px)) !important;padding:calc(3px + env(safe-area-inset-top,0px)) 8px 4px !important;gap:1px !important;}\n  .cap-mobile-owner-title{font-size:13px !important;line-height:1 !important;letter-spacing:-.02em !important;margin:0 !important;}\n  .cap-mobile-owner-subtitle{font-size:8px !important;line-height:1.02 !important;margin:0 !important;font-weight:750 !important;}\n  .cap-mobile-bottom-nav{height:calc(37px + env(safe-area-inset-bottom,0px)) !important;padding:3px 4px calc(3px + env(safe-area-inset-bottom,0px)) !important;gap:3px !important;}\n  .cap-mobile-bottom-nav button{height:31px !important;min-height:31px !important;border-radius:7px !important;font-size:7.8px !important;line-height:1 !important;padding:0 !important;font-weight:850 !important;box-shadow:0 1px 2px rgba(17,24,39,.10) !important;}\n  body.cap-mobile-owner-ready #app > .tab,body.cap-mobile-owner-ready #app > section.tab.card,body.cap-mobile-owner-ready #app > .cap-mobile-screen{padding:0 !important;margin:0 !important;border:0 !important;box-shadow:none !important;background:transparent !important;}\n  body.cap-mobile-owner-ready .stack{gap:4px !important;padding:4px 0 !important;}\n  body.cap-mobile-owner-ready .card,body.cap-mobile-owner-ready .item,body.cap-mobile-owner-ready .soft-card,body.cap-mobile-owner-ready .box,body.cap-mobile-owner-ready .notice{padding:6px !important;border-radius:7px !important;box-shadow:none !important;}\n  body.cap-mobile-owner-ready h1{font-size:14px !important;line-height:1 !important;margin:0 0 3px !important;}\n  body.cap-mobile-owner-ready h2{font-size:13px !important;line-height:1.02 !important;margin:0 0 3px !important;}\n  body.cap-mobile-owner-ready h3{font-size:12px !important;line-height:1.03 !important;margin:0 0 3px !important;}\n  body.cap-mobile-owner-ready h4{font-size:11px !important;line-height:1.04 !important;margin:0 0 2px !important;}\n  body.cap-mobile-owner-ready p,body.cap-mobile-owner-ready .muted,body.cap-mobile-owner-ready p.muted,body.cap-mobile-owner-ready label,body.cap-mobile-owner-ready span,body.cap-mobile-owner-ready strong,body.cap-mobile-owner-ready b,body.cap-mobile-owner-ready td,body.cap-mobile-owner-ready th{font-size:9.2px !important;line-height:1.08 !important;}\n  body.cap-mobile-owner-ready form,body.cap-mobile-owner-ready .formgrid{gap:5px !important;margin-top:4px !important;}\n  body.cap-mobile-owner-ready input,body.cap-mobile-owner-ready select,body.cap-mobile-owner-ready textarea{min-height:28px !important;height:auto !important;border-radius:6px !important;font-size:9.8px !important;line-height:1.05 !important;padding:4px 6px !important;font-weight:750 !important;}\n  body.cap-mobile-owner-ready textarea{min-height:42px !important;}\n  body.cap-mobile-owner-ready .btn,body.cap-mobile-owner-ready button.btn,body.cap-mobile-owner-ready a.btn,body.cap-mobile-owner-ready button,body.cap-mobile-owner-ready a.btn.small,body.cap-mobile-owner-ready .btn.small{min-height:28px !important;border-radius:6px !important;font-size:9.4px !important;line-height:1.02 !important;padding:3px 5px !important;white-space:normal !important;overflow:hidden !important;text-overflow:ellipsis !important;}\n  .cap-mobile-more-list{gap:4px !important;padding:4px 0 !important;}\n  .cap-mobile-more-button{min-height:30px !important;border-radius:7px !important;font-size:10px !important;padding:2px 4px !important;}\n  body.cap-mobile-owner-ready #settingsForm{padding:4px 0 !important;gap:5px !important;}\n  body.cap-mobile-owner-ready #settingsForm .card.soft-card{padding:7px !important;}\n  body.cap-mobile-owner-ready #settingsForm .card.soft-card h3{margin:0 0 5px !important;font-size:12px !important;}\n  body.cap-mobile-owner-ready #settingsForm .formgrid{gap:5px !important;}\n  body.cap-mobile-owner-ready .multi-phone-title-v159{font-size:11px !important;margin:0 0 3px !important;}\n  body.cap-mobile-owner-ready .multi-phones-box-v159,body.cap-mobile-owner-ready .multi-phone-row-v159{gap:3px !important;}\n  body.cap-mobile-owner-ready .multi-phone-remove-v159{width:26px !important;height:26px !important;flex-basis:26px !important;border-radius:6px !important;font-size:12px !important;}\n  body.cap-mobile-owner-ready #addStaffBtn{min-height:30px !important;border-radius:7px !important;font-size:10px !important;}\n  body.cap-mobile-owner-ready #staffList{gap:4px !important;padding:0 0 4px !important;}\n  body.cap-mobile-owner-ready #staffList .item{padding:7px !important;}\n  body.cap-mobile-owner-ready #staffList .item h3{font-size:12px !important;margin:0 0 2px !important;}\n  body.cap-mobile-owner-ready #staffList .item p:not(.muted),body.cap-mobile-owner-ready #staffList .badges span{font-size:9.2px !important;line-height:1.05 !important;margin:0 0 1px !important;}\n  body.cap-mobile-owner-ready #staffList .actions{margin-top:3px !important;border-radius:6px !important;}\n  body.cap-mobile-owner-ready #staffList .actions .btn{min-height:26px !important;font-size:9.2px !important;}\n  body.cap-mobile-owner-ready #bookinglink{padding-top:2px !important;overflow-x:hidden !important;}\n  body.cap-mobile-owner-ready #bookinglink .link-qr-layout{display:grid !important;grid-template-columns:1fr !important;gap:4px !important;margin:0 0 4px !important;}\n  body.cap-mobile-owner-ready #bookinglink .booking-link-card,body.cap-mobile-owner-ready #bookinglink .qr-card,body.cap-mobile-owner-ready #bookinglink .card.soft-card{padding:6px !important;border-radius:7px !important;gap:4px !important;}\n  body.cap-mobile-owner-ready #bookinglink .booking-link-card strong,body.cap-mobile-owner-ready #bookinglink .qr-card strong{font-size:10px !important;line-height:1.03 !important;}\n  body.cap-mobile-owner-ready #bookinglink .link-actions,body.cap-mobile-owner-ready #bookinglink .location-qr-actions-inline-v124{display:grid !important;grid-template-columns:1fr !important;gap:2px !important;margin-top:2px !important;}\n  body.cap-mobile-owner-ready #bookingUrlInput{min-height:25px !important;font-size:8.8px !important;padding:3px 5px !important;}\n  body.cap-mobile-owner-ready .qr-preview-box{padding:3px !important;min-height:0 !important;}\n  body.cap-mobile-owner-ready .qr-preview-box img,body.cap-mobile-owner-ready img.qr,body.cap-mobile-owner-ready .qr{width:68px !important;height:68px !important;padding:2px !important;border-radius:6px !important;}\n  body.cap-mobile-owner-ready #ownerLocationsList,body.cap-mobile-owner-ready .location-qr-list-v123{gap:3px !important;padding-top:2px !important;}\n  body.cap-mobile-owner-ready .location-qr-row-v123,body.cap-mobile-owner-ready .location-qr-row-v124{display:grid !important;grid-template-columns:1fr !important;gap:3px !important;padding:5px !important;border-radius:7px !important;width:100% !important;overflow:hidden !important;}\n  body.cap-mobile-owner-ready .location-qr-main-v123 h3{font-size:11px !important;line-height:1 !important;margin:0 0 1px !important;}\n  body.cap-mobile-owner-ready .location-badge-v115{font-size:6.8px !important;padding:1px 3px !important;margin-left:2px !important;}\n  body.cap-mobile-owner-ready .location-qr-main-v123 p,body.cap-mobile-owner-ready .location-qr-link-v123 p{font-size:8.5px !important;line-height:1.04 !important;margin:0 !important;overflow-wrap:anywhere !important;word-break:break-word !important;}\n  body.cap-mobile-owner-ready .location-qr-link-v123 b{display:block !important;font-size:9.5px !important;line-height:1.02 !important;margin:0 0 1px !important;}\n  body.cap-mobile-owner-ready .location-qr-actions-inline-v124 .btn,body.cap-mobile-owner-ready .location-qr-actions-inline-v124 a.btn,body.cap-mobile-owner-ready #bookinglink .link-actions .btn,body.cap-mobile-owner-ready #bookinglink .link-actions a.btn{width:100% !important;min-height:26px !important;border-radius:6px !important;font-size:8.8px !important;line-height:1.01 !important;padding:3px 4px !important;}\n  .cap-device-stack{gap:4px !important;padding:4px 0 !important;}\n  .cap-device-card{padding:7px !important;border-radius:7px !important;}\n  .cap-device-card h2,.cap-device-card h3{font-size:11px !important;margin:0 0 3px !important;}\n  .cap-device-card p,.cap-device-empty{font-size:9px !important;line-height:1.08 !important;}\n  .cap-device-form{gap:5px !important;margin-top:5px !important;}\n  .cap-device-primary{min-height:30px !important;border-radius:7px !important;font-size:9.5px !important;padding:3px 5px !important;}\n}\n';document.head.appendChild(s);}catch(e){}})();



;(()=>{try{
  if(document.getElementById('profile-scroll-final-v196'))return;
  const s=document.createElement('style');
  s.id='profile-scroll-final-v196';
  s.textContent=`
  /* Profil firme scroll do dna v196 - mora biti posle force-small JS stila */
  @media (max-width:1400px){
    html body.cap-mobile-owner-ready #settings:not(.hidden){
      display:block !important;
      overflow:visible !important;
      padding-bottom:calc(230px + env(safe-area-inset-bottom,0px)) !important;
      margin-bottom:0 !important;
      min-height:auto !important;
    }
    html body.cap-mobile-owner-ready #settings:not(.hidden) #settingsForm{
      display:flex !important;
      flex-direction:column !important;
      overflow:visible !important;
      padding-bottom:calc(230px + env(safe-area-inset-bottom,0px)) !important;
      margin-bottom:0 !important;
    }
    html body.cap-mobile-owner-ready #settings:not(.hidden) #settingsForm::after{
      content:"" !important;
      display:block !important;
      flex:0 0 calc(170px + env(safe-area-inset-bottom,0px)) !important;
      height:calc(170px + env(safe-area-inset-bottom,0px)) !important;
      min-height:calc(170px + env(safe-area-inset-bottom,0px)) !important;
      width:100% !important;
    }
    html body.cap-mobile-owner-ready #settings:not(.hidden) #settingsForm > button.btn,
    html body.cap-mobile-owner-ready #settings:not(.hidden) #settingsForm > button[type="submit"]{
      flex:0 0 auto !important;
      margin-bottom:calc(24px + env(safe-area-inset-bottom,0px)) !important;
    }
    html body.cap-mobile-owner-ready #app.shell{
      overflow-x:hidden !important;
      overflow-y:visible !important;
    }
  }`;
  document.head.appendChild(s);
}catch(e){}})();

