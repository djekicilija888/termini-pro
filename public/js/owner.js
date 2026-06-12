const TOKEN_KEY = "terminiPlatformOwnerToken";

const loginView = document.querySelector("#loginView");
const ownerView = document.querySelector("#ownerView");
const ownerLoginForm = document.querySelector("#ownerLoginForm");
const ownerLoginMessage = document.querySelector("#ownerLoginMessage");
const ownerMessage = document.querySelector("#ownerMessage");

const dayNames = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function money(value) {
  return `${Number(value || 0).toLocaleString("sr-RS")} RSD`;
}

function statusLabel(status) {
  const map = {
    booked: "Zakazan",
    completed: "Završen",
    cancelled: "Otkazan",
    no_show: "Nije došao"
  };
  return map[status] || status;
}

function setMessage(text, type = "") {
  ownerMessage.textContent = text;
  ownerMessage.className = `message ${type}`;
}

function setLoginMessage(text, type = "") {
  ownerLoginMessage.textContent = text;
  ownerLoginMessage.className = `message ${type}`;
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
  loginView.classList.remove("hidden");
  ownerView.classList.add("hidden");
}

function showOwner() {
  loginView.classList.add("hidden");
  ownerView.classList.remove("hidden");
}

ownerLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("Prijava je u toku...");

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#ownerEmail").value,
        password: document.querySelector("#ownerPassword").value
      })
    });

    if (data.user.role !== "owner") throw new Error("Ovo nije nalog firme.");

    setToken(data.token);
    showOwner();
    activateTab("dashboard");
  } catch (error) {
    setLoginMessage(error.message, "error");
  }
});

document.querySelector("#logoutBtn").addEventListener("click", () => {
  clearToken();
  showLogin();
});

document.querySelectorAll(".side-nav button").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

function activateTab(name) {
  document.querySelectorAll(".side-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  document.querySelector(`#tab-${name}`).classList.remove("hidden");

  const titles = {
    dashboard: "Dashboard",
    appointments: "Termini",
    services: "Usluge",
    hours: "Radno vreme",
    blocked: "Blokirani datumi",
    settings: "Podešavanja"
  };

  document.querySelector("#dashboardTitle").textContent = titles[name];
  setMessage("");

  if (name === "dashboard") loadDashboard();
  if (name === "appointments") loadAppointments();
  if (name === "services") loadServices();
  if (name === "hours") loadHours();
  if (name === "blocked") loadBlocked();
  if (name === "settings") loadSettings();
}

async function loadDashboard() {
  try {
    const data = await api("/api/owner/dashboard");

    document.querySelector("#ownerBusinessName").textContent = data.business.name;
    document.querySelector("#bookingUrlInput").value = data.business.booking_url;
    document.querySelector("#openPublicLink").href = data.business.booking_url;

    document.querySelector("#dashboardCards").innerHTML = `
      <div class="stat-card"><span>Danas</span><strong>${data.cards.today}</strong></div>
      <div class="stat-card"><span>Narednih 7 dana</span><strong>${data.cards.next_7_days}</strong></div>
      <div class="stat-card"><span>Aktivne usluge</span><strong>${data.cards.active_services}</strong></div>
    `;

    const body = document.querySelector("#upcomingBody");
    body.innerHTML = "";

    if (data.upcoming.length === 0) {
      body.innerHTML = `<tr><td colspan="6">Nema budućih termina.</td></tr>`;
      return;
    }

    for (const item of data.upcoming) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.start_time} - ${item.end_time}</td>
        <td>${item.customer_name}</td>
        <td>${item.phone}</td>
        <td>${item.service_name}</td>
        <td><span class="status ${item.status}">${statusLabel(item.status)}</span></td>
      `;
      body.appendChild(tr);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

document.querySelector("#copyLinkBtn").addEventListener("click", async () => {
  const input = document.querySelector("#bookingUrlInput");
  await navigator.clipboard.writeText(input.value);
  setMessage("Link je kopiran. Možeš ga staviti na Instagram.", "success");
});

const appointmentsFrom = document.querySelector("#appointmentsFrom");
const appointmentsTo = document.querySelector("#appointmentsTo");
const appointmentsStatus = document.querySelector("#appointmentsStatus");

document.querySelector("#loadAppointmentsBtn").addEventListener("click", loadAppointments);

async function loadAppointments() {
  if (!appointmentsFrom.value) appointmentsFrom.value = todayString();
  if (!appointmentsTo.value) appointmentsTo.value = addDays(30);

  const params = new URLSearchParams({ from: appointmentsFrom.value, to: appointmentsTo.value });
  if (appointmentsStatus.value) params.set("status", appointmentsStatus.value);

  try {
    const rows = await api(`/api/owner/appointments?${params.toString()}`);
    const body = document.querySelector("#appointmentsBody");
    body.innerHTML = "";

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="7">Nema termina.</td></tr>`;
      return;
    }

    for (const item of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.start_time} - ${item.end_time}</td>
        <td>${item.customer_name}<br><small>${item.email || ""}</small></td>
        <td>${item.phone}</td>
        <td>${item.service_name}<br><small>${money(item.price)}</small></td>
        <td><span class="status ${item.status}">${statusLabel(item.status)}</span></td>
        <td>
          <select>
            <option value="booked">Zakazan</option>
            <option value="completed">Završen</option>
            <option value="cancelled">Otkazan</option>
            <option value="no_show">Nije došao</option>
          </select>
        </td>
      `;

      const select = tr.querySelector("select");
      select.value = item.status;
      select.addEventListener("change", () => updateStatus(item.id, select.value));
      body.appendChild(tr);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function updateStatus(id, status) {
  try {
    const data = await api(`/api/owner/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    setMessage(data.message, "success");
    await loadAppointments();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function resetServiceForm() {
  document.querySelector("#serviceId").value = "";
  document.querySelector("#serviceName").value = "";
  document.querySelector("#serviceDescription").value = "";
  document.querySelector("#serviceDuration").value = 30;
  document.querySelector("#servicePrice").value = 1000;
  document.querySelector("#serviceSort").value = 0;
  document.querySelector("#serviceActive").checked = true;
}

document.querySelector("#resetServiceBtn").addEventListener("click", resetServiceForm);

document.querySelector("#serviceForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.querySelector("#serviceId").value;
  const payload = {
    name: document.querySelector("#serviceName").value,
    description: document.querySelector("#serviceDescription").value,
    duration_minutes: Number(document.querySelector("#serviceDuration").value),
    price: Number(document.querySelector("#servicePrice").value),
    sort_order: Number(document.querySelector("#serviceSort").value),
    active: document.querySelector("#serviceActive").checked
  };

  try {
    const data = await api(id ? `/api/owner/services/${id}` : "/api/owner/services", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    setMessage(data.message, "success");
    resetServiceForm();
    await loadServices();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

async function loadServices() {
  try {
    const rows = await api("/api/owner/services");
    const list = document.querySelector("#servicesList");
    list.innerHTML = "";

    for (const service of rows) {
      const div = document.createElement("article");
      div.className = "item-card";
      div.innerHTML = `
        <h3>${service.name}</h3>
        <p class="muted">${service.description || "Bez opisa"}</p>
        <div class="badges">
          <span>${service.duration_minutes} min</span>
          <span>${money(service.price)}</span>
          <span>${service.active ? "Aktivna" : "Ugašena"}</span>
        </div>
        <div class="item-actions">
          <button class="btn small ghost" type="button">Izmeni</button>
        </div>
      `;

      div.querySelector("button").addEventListener("click", () => {
        document.querySelector("#serviceId").value = service.id;
        document.querySelector("#serviceName").value = service.name;
        document.querySelector("#serviceDescription").value = service.description || "";
        document.querySelector("#serviceDuration").value = service.duration_minutes;
        document.querySelector("#servicePrice").value = service.price;
        document.querySelector("#serviceSort").value = service.sort_order;
        document.querySelector("#serviceActive").checked = Boolean(service.active);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      list.appendChild(div);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function loadHours() {
  try {
    const rows = await api("/api/owner/working-hours");
    const form = document.querySelector("#hoursForm");
    form.innerHTML = "";

    for (const row of rows) {
      const div = document.createElement("div");
      div.className = "hour-row";
      div.dataset.day = row.day_of_week;
      div.innerHTML = `
        <strong>${dayNames[row.day_of_week]}</strong>
        <label class="check-row"><input data-field="is_open" type="checkbox" ${row.is_open ? "checked" : ""}> Otvoreno</label>
        <label>Od<input data-field="open_time" type="time" value="${row.open_time}"></label>
        <label>Do<input data-field="close_time" type="time" value="${row.close_time}"></label>
        <label>Pauza od<input data-field="break_start" type="time" value="${row.break_start || ""}"></label>
        <label>Pauza do<input data-field="break_end" type="time" value="${row.break_end || ""}"></label>
      `;
      form.appendChild(div);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

document.querySelector("#saveHoursBtn").addEventListener("click", async () => {
  const rows = [...document.querySelectorAll(".hour-row")].map((row) => ({
    day_of_week: Number(row.dataset.day),
    is_open: row.querySelector('[data-field="is_open"]').checked,
    open_time: row.querySelector('[data-field="open_time"]').value,
    close_time: row.querySelector('[data-field="close_time"]').value,
    break_start: row.querySelector('[data-field="break_start"]').value,
    break_end: row.querySelector('[data-field="break_end"]').value
  }));

  try {
    const data = await api("/api/owner/working-hours", {
      method: "PUT",
      body: JSON.stringify({ rows })
    });
    setMessage(data.message, "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

document.querySelector("#blockedForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/owner/blocked-dates", {
      method: "POST",
      body: JSON.stringify({
        date: document.querySelector("#blockedDate").value,
        reason: document.querySelector("#blockedReason").value
      })
    });

    setMessage(data.message, "success");
    event.target.reset();
    await loadBlocked();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

async function loadBlocked() {
  try {
    const rows = await api("/api/owner/blocked-dates");
    const list = document.querySelector("#blockedList");
    list.innerHTML = "";

    if (rows.length === 0) {
      list.innerHTML = `<article class="item-card"><p class="muted">Nema blokiranih datuma.</p></article>`;
      return;
    }

    for (const item of rows) {
      const div = document.createElement("article");
      div.className = "item-card";
      div.innerHTML = `
        <h3>${item.date}</h3>
        <p class="muted">${item.reason || "Bez razloga"}</p>
        <div class="item-actions">
          <button class="btn small danger" type="button">Odblokiraj</button>
        </div>
      `;

      div.querySelector("button").addEventListener("click", () => deleteBlocked(item.date));
      list.appendChild(div);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function deleteBlocked(date) {
  try {
    const data = await api(`/api/owner/blocked-dates/${date}`, { method: "DELETE" });
    setMessage(data.message, "success");
    await loadBlocked();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function loadSettings() {
  try {
    const data = await api("/api/owner/settings");
    const b = data.business;
    const s = data.settings;

    document.querySelector("#settingsName").value = b.name || "";
    document.querySelector("#settingsType").value = b.type || "";
    document.querySelector("#settingsCity").value = b.city || "";
    document.querySelector("#settingsPhone").value = b.phone || "";
    document.querySelector("#settingsInstagram").value = b.instagram || "";
    document.querySelector("#settingsAddress").value = b.address || "";
    document.querySelector("#settingsDescription").value = b.description || "";
    document.querySelector("#settingsInterval").value = s.booking_interval_minutes;
    document.querySelector("#settingsMinNotice").value = s.min_notice_hours;
    document.querySelector("#settingsMaxDays").value = s.max_booking_days;
  } catch (error) {
    setMessage(error.message, "error");
  }
}

document.querySelector("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await api("/api/owner/settings", {
      method: "PUT",
      body: JSON.stringify({
        name: document.querySelector("#settingsName").value,
        type: document.querySelector("#settingsType").value,
        city: document.querySelector("#settingsCity").value,
        phone: document.querySelector("#settingsPhone").value,
        instagram: document.querySelector("#settingsInstagram").value,
        address: document.querySelector("#settingsAddress").value,
        description: document.querySelector("#settingsDescription").value,
        booking_interval_minutes: Number(document.querySelector("#settingsInterval").value),
        min_notice_hours: Number(document.querySelector("#settingsMinNotice").value),
        max_booking_days: Number(document.querySelector("#settingsMaxDays").value)
      })
    });

    setMessage(data.message, "success");
    await loadDashboard();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

async function init() {
  appointmentsFrom.value = todayString();
  appointmentsTo.value = addDays(30);

  if (!token()) return showLogin();

  try {
    const me = await api("/api/auth/me");
    if (me.user.role !== "owner") throw new Error("Nije owner nalog.");
    showOwner();
    activateTab("dashboard");
  } catch {
    showLogin();
  }
}

init();
