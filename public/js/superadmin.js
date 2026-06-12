const TOKEN_KEY = "terminiPlatformSuperToken";

const superLoginView = document.querySelector("#superLoginView");
const superView = document.querySelector("#superView");
const superLoginForm = document.querySelector("#superLoginForm");
const superLoginMessage = document.querySelector("#superLoginMessage");
const superMessage = document.querySelector("#superMessage");
const superBusinessList = document.querySelector("#superBusinessList");

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function setMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`;
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      showLogin();
    }
    throw new Error(data.error || "Došlo je do greške.");
  }

  return data;
}

function showLogin() {
  superLoginView.classList.remove("hidden");
  superView.classList.add("hidden");
}

function showSuper() {
  superLoginView.classList.add("hidden");
  superView.classList.remove("hidden");
}

superLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(superLoginMessage, "Prijava je u toku...");

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#superEmail").value,
        password: document.querySelector("#superPassword").value
      })
    });

    if (data.user.role !== "superadmin") throw new Error("Ovo nije superadmin nalog.");

    setToken(data.token);
    showSuper();
    await loadBusinesses();
  } catch (error) {
    setMessage(superLoginMessage, error.message, "error");
  }
});

document.querySelector("#superLogoutBtn").addEventListener("click", () => {
  clearToken();
  showLogin();
});

async function loadBusinesses() {
  try {
    const rows = await api("/api/superadmin/businesses");
    superBusinessList.innerHTML = "";

    if (rows.length === 0) {
      superBusinessList.innerHTML = `<article class="item-card"><p class="muted">Nema firmi.</p></article>`;
      return;
    }

    for (const item of rows) {
      const div = document.createElement("article");
      div.className = "item-card";
      div.innerHTML = `
        <p class="eyebrow">${item.type || "Firma"}</p>
        <h3>${item.name}</h3>
        <p class="muted">${[item.city, item.phone].filter(Boolean).join(" · ") || "Bez podataka"}</p>
        <div class="badges">
          <span>Usluge: ${item.services_count}</span>
          <span>Termini: ${item.appointments_count}</span>
          <span>${item.active ? "Aktivna" : "Ugašena"}</span>
        </div>
        <div class="item-actions">
          <a class="btn small" href="${item.booking_url}" target="_blank">Otvori</a>
          <button class="btn small ghost">${item.active ? "Deaktiviraj" : "Aktiviraj"}</button>
        </div>
      `;

      div.querySelector("button").addEventListener("click", () => toggleBusiness(item.id, !item.active));
      superBusinessList.appendChild(div);
    }
  } catch (error) {
    setMessage(superMessage, error.message, "error");
  }
}

async function toggleBusiness(id, active) {
  try {
    const data = await api(`/api/superadmin/businesses/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active })
    });
    setMessage(superMessage, data.message, "success");
    await loadBusinesses();
  } catch (error) {
    setMessage(superMessage, error.message, "error");
  }
}

async function init() {
  if (!token()) return showLogin();

  try {
    const me = await api("/api/auth/me");
    if (me.user.role !== "superadmin") throw new Error("Nije superadmin.");
    showSuper();
    await loadBusinesses();
  } catch {
    showLogin();
  }
}

init();
