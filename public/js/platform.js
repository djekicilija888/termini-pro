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

        if (data.role === 'admin') {
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
