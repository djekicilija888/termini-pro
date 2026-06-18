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
function getCookie(name){try{let raw=document.cookie||'';for(const part of raw.split(';')){const p=part.trim();const i=p.indexOf('=');if(i>0&&p.slice(0,i)===name)return decodeURIComponent(p.slice(i+1)||'')}return ''}catch(e){return ''}}
function isTabletModeLocked(){return (!!localStorage.getItem(TABLET_TOKEN_KEY)||getCookie('terminiTabletMode')==='1'||!!getCookie('terminiTabletDevice')) && sessionStorage.getItem(TABLET_ADMIN_UNLOCK_KEY)!=='1'}
function showTabletModeLanding(){
  const panel=document.querySelector('.panel-grid');
  if(!panel)return false;
  panel.innerHTML=`<div class="card"><p class="eyebrow">Radnički ekran</p><h2>Ovaj uređaj je povezan sa lokacijom</h2><p class="muted">Za ovaj računar/tablet je uključen radnički ekran. Glavni panel se otključava samo admin nalogom.</p><div class="actions"><a class="btn" href="/tablet">Otvori radnički ekran</a><a class="btn ghost" href="/owner.html">Admin ulaz</a></div></div>`;
  const hero=document.querySelector('.hero-copy');
  if(hero)hero.querySelector('.card.soft-card')?.remove();
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

document.addEventListener('DOMContentLoaded', () => {
  loadPlatform();
  if (isTabletModeLocked()) {
    showTabletModeLanding();
    return;
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



/* Owner No Registration Test v81 */
function addNoRegistrationTestButton(){
  const loginForm = document.getElementById('loginForm');
  if (!loginForm || document.getElementById('testOwnerLoginBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'testOwnerLoginBtn';
  btn.type = 'button';
  btn.className = 'btn ghost';
  btn.style.marginTop = '10px';
  btn.textContent = 'Uđi bez registracije';

  btn.addEventListener('click', async () => {
    setMsg('loginMsg', 'Ulazim bez registracije...');
    btn.disabled = true;
    try {
      const data = await api('/api/auth/test-owner-login', { method: 'POST' });
      localStorage.setItem('terminiOwnerToken', data.token);
      localStorage.setItem('token', data.token);
      location.href = '/owner.html';
    } catch (err) {
      btn.disabled = false;
      setMsg('loginMsg', err.message || 'Neuspešan test ulaz.');
    }
  });

  loginForm.insertAdjacentElement('afterend', btn);
}
