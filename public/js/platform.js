const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const registerMessage = document.querySelector("#registerMessage");
const loginMessage = document.querySelector("#loginMessage");
const businessList = document.querySelector("#businessList");
const searchInput = document.querySelector("#searchInput");
const searchBtn = document.querySelector("#searchBtn");

const TOKEN_KEY = "terminiPlatformOwnerToken";

function setMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Došlo je do greške.");
  return data;
}

async function loadPlatformName() {
  try {
    const data = await api("/api/platform");
    document.querySelector("#platformName").textContent = data.name;
  } catch {}
}

function businessCard(item) {
  const div = document.createElement("article");
  div.className = "business-card";
  div.innerHTML = `
    <p class="eyebrow">${item.type || "Firma"}</p>
    <h3>${item.name}</h3>
    <p>${[item.city, item.address].filter(Boolean).join(" · ") || "Lokacija nije upisana."}</p>
    <div class="badges">
      ${item.phone ? `<span>${item.phone}</span>` : ""}
      ${item.instagram ? `<span>${item.instagram}</span>` : ""}
    </div>
    <div class="business-actions">
      <a class="btn small" href="/b/${item.slug}">Zakaži termin</a>
      <button class="btn small ghost" type="button">Kopiraj link</button>
    </div>
  `;

  div.querySelector("button").addEventListener("click", async () => {
    await navigator.clipboard.writeText(item.booking_url);
    div.querySelector("button").textContent = "Kopirano";
  });

  return div;
}

async function loadBusinesses() {
  const q = searchInput.value.trim();
  const rows = await api(`/api/businesses${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  businessList.innerHTML = "";

  if (rows.length === 0) {
    businessList.innerHTML = `<div class="card"><p class="muted">Nema firmi za prikaz.</p></div>`;
    return;
  }

  for (const item of rows) {
    businessList.appendChild(businessCard(item));
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(registerMessage, "Registracija je u toku...");

  try {
    const data = await api("/api/auth/register-business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: document.querySelector("#regBusinessName").value,
        type: document.querySelector("#regType").value,
        city: document.querySelector("#regCity").value,
        phone: document.querySelector("#regPhone").value,
        owner_name: document.querySelector("#regOwnerName").value,
        email: document.querySelector("#regEmail").value,
        password: document.querySelector("#regPassword").value
      })
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    setMessage(registerMessage, `Firma je registrovana. Link: ${data.booking_url}`, "success");
    await loadBusinesses();
    setTimeout(() => window.location.href = "/owner.html", 900);
  } catch (error) {
    setMessage(registerMessage, error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "Prijava je u toku...");

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#loginEmail").value,
        password: document.querySelector("#loginPassword").value
      })
    });

    if (data.user.role !== "owner") {
      throw new Error("Ovo nije nalog firme.");
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    window.location.href = "/owner.html";
  } catch (error) {
    setMessage(loginMessage, error.message, "error");
  }
});

searchBtn.addEventListener("click", loadBusinesses);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadBusinesses();
});

loadPlatformName();
loadBusinesses().catch(() => {
  businessList.innerHTML = `<div class="card"><p class="muted">Ne mogu da učitam firme.</p></div>`;
});
