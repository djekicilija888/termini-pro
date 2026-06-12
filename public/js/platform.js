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

        localStorage.setItem('token', data.token);

        if (data.role === 'admin') {
          location.href = '/superadmin.html';
        } else {
          location.href = '/owner.html';
        }
      } catch (err) {
        setMsg('loginMsg', err.message || 'Neuspešna prijava.');
      }
    });
  }
});
