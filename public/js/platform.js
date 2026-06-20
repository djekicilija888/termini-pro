async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Greška.');
  return data;
}

function setMsg(id, text, ok = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  el.className = ok ? 'msg ok' : 'msg';
}

const TABLET_TOKEN_KEY = 'terminiTabletDeviceToken';
const TABLET_ADMIN_UNLOCK_KEY = 'terminiTabletAdminUnlocked';
function clearTabletModeMemory(){
  try{localStorage.removeItem(TABLET_TOKEN_KEY)}catch(e){}
  try{sessionStorage.removeItem(TABLET_ADMIN_UNLOCK_KEY)}catch(e){}
  try{
    document.cookie='terminiTabletMode=; path=/; max-age=0; SameSite=Lax';
    document.cookie='terminiTabletDevice=; path=/; max-age=0; SameSite=Lax';
  }catch(e){}
}
function isTabletModeLocked(){return !!localStorage.getItem(TABLET_TOKEN_KEY) && sessionStorage.getItem(TABLET_ADMIN_UNLOCK_KEY)!=='1'}
async function validateStoredTabletMode(){
  const token=localStorage.getItem(TABLET_TOKEN_KEY)||'';
  if(!token){clearTabletModeMemory();return false}
  try{
    const r=await fetch('/api/tablet/me',{headers:{'Content-Type':'application/json','X-Device-Token':token},cache:'no-store'});
    if(r.ok)return true;
    if([401,403,404,423].includes(r.status)){clearTabletModeMemory();return false}
    return false;
  }catch(e){return false}
}
function showTabletModeLanding(){
  const panel=document.querySelector('.panel-grid');
  if(!panel)return false;
  panel.innerHTML=`<div class="card"><p class="eyebrow">Radnički ekran</p><h2>Ovaj uređaj je povezan sa lokacijom</h2><p class="muted">Za ovaj računar/tablet je uključen radnički ekran. Glavni panel se otključava samo admin nalogom.</p><div class="actions"><a class="btn" href="/tablet">Otvori radnički ekran</a></div><p class="muted small-note">Admin se prijavljuje preko dugmeta „Admin prijava” na radničkom ekranu.</p><p id="tabletLandingMsg" class="msg"></p></div>`;
  const hero=document.querySelector('.hero-copy');
  if(hero)hero.querySelector('.card.soft-card')?.remove();
  attachTabletNoRegistrationButton();
  return true;
}

async function loadPlatform() {
  try {
    const data = await api('/api/platform');
    const name = data?.name || 'Termini';
    document.querySelectorAll('#platformName').forEach(el => el.textContent = name);
    document.title = name;
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  loadPlatform();
  if (isTabletModeLocked()) {
    const validTablet = await validateStoredTabletMode();
    if (validTablet && isTabletModeLocked()) {
      location.replace('/tablet');
      return;
    }
  }
  addNoRegistrationTestButton();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg('loginMsg', 'Proveravam...');
      try {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPass').value
          })
        });

        if (data.role === 'admin' || (data.user && data.user.role === 'superadmin')) {
          localStorage.removeItem('terminiOwnerToken');
          localStorage.setItem('token', data.token);
          location.href = '/superadmin.html';
        } else {
          localStorage.setItem('terminiOwnerToken', data.token);
          localStorage.setItem('token', data.token);
          location.href = '/owner.html';
        }
      } catch (err) {
        setMsg('loginMsg', err.message || 'Neuspešna prijava.');
      }
    });
  }
});



/* Owner No Registration Test v132 */
async function noRegistrationLogin(btn, msgId) {
  const msgEl = msgId ? document.getElementById(msgId) : null;
  if (msgEl) {
    msgEl.textContent = 'Ulazim bez registracije...';
    msgEl.className = 'msg';
  } else {
    setMsg('loginMsg', 'Ulazim bez registracije...');
  }
  if (btn) btn.disabled = true;
  try {
    const data = await api('/api/auth/test-owner-login', { method: 'POST' });
    localStorage.setItem('terminiOwnerToken', data.token);
    localStorage.setItem('token', data.token);
    if (isTabletModeLocked()) sessionStorage.setItem(TABLET_ADMIN_UNLOCK_KEY, '1');
    location.href = '/owner.html';
  } catch (err) {
    if (btn) btn.disabled = false;
    const text = err.message || 'Neuspešan test ulaz.';
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.className = 'msg err';
    } else {
      setMsg('loginMsg', text);
    }
  }
}
function attachTabletNoRegistrationButton() {
  const btn = document.getElementById('tabletNoRegistrationBtn');
  if (!btn) return;
  btn.addEventListener('click', () => noRegistrationLogin(btn, 'tabletLandingMsg'));
}
function addNoRegistrationTestButton(){
  const loginForm = document.getElementById('loginForm');
  if (!loginForm || document.getElementById('testOwnerLoginBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'testOwnerLoginBtn';
  btn.type = 'button';
  btn.className = 'btn ghost';
  btn.style.marginTop = '10px';
  btn.textContent = 'Uđi bez registracije';

  btn.addEventListener('click', () => noRegistrationLogin(btn, 'loginMsg'));

  loginForm.insertAdjacentElement('afterend', btn);
}
