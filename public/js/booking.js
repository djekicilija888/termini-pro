const state = {
  services: [],
  settings: null
};

const serviceSelect = document.querySelector("#service");
const dateInput = document.querySelector("#date");
const slotSelect = document.querySelector("#slot");
const bookingForm = document.querySelector("#bookingForm");
const messageEl = document.querySelector("#message");
const servicesGrid = document.querySelector("#servicesGrid");
const businessNameEl = document.querySelector("#businessName");
const businessContactEl = document.querySelector("#businessContact");

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("sr-RS")} RSD`;
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Došlo je do greške.");
  }

  return data;
}

async function loadSettings() {
  state.settings = await getJson("/api/public/settings");
  businessNameEl.textContent = state.settings.business_name || "Termini Pro";

  const contact = [];
  if (state.settings.phone) contact.push(state.settings.phone);
  if (state.settings.address) contact.push(state.settings.address);

  businessContactEl.textContent = contact.length ? contact.join(" · ") : "Kontakt podaci nisu podešeni.";
  dateInput.min = todayString();
  dateInput.max = addDays(Number(state.settings.max_booking_days || 45));
  dateInput.value = todayString();
}

async function loadServices() {
  state.services = await getJson("/api/services?active=1");

  servicesGrid.innerHTML = "";
  serviceSelect.innerHTML = "";

  if (state.services.length === 0) {
    servicesGrid.innerHTML = `<p class="muted">Trenutno nema dostupnih usluga.</p>`;
    serviceSelect.innerHTML = `<option value="">Nema dostupnih usluga</option>`;
    return;
  }

  for (const service of state.services) {
    const card = document.createElement("article");
    card.className = "service-card";
    card.innerHTML = `
      <h3>${service.name}</h3>
      <p class="muted">${service.description || "Usluga bez opisa."}</p>
      <div class="service-meta">
        <span class="pill">${service.duration_minutes} min</span>
        <span class="pill">${money(service.price)}</span>
      </div>
    `;
    servicesGrid.appendChild(card);

    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = `${service.name} · ${service.duration_minutes} min · ${money(service.price)}`;
    serviceSelect.appendChild(option);
  }
}

async function loadSlots() {
  const serviceId = serviceSelect.value;
  const date = dateInput.value;

  if (!serviceId || !date) {
    slotSelect.innerHTML = `<option value="">Prvo izaberi uslugu i datum</option>`;
    return;
  }

  slotSelect.innerHTML = `<option value="">Učitavanje...</option>`;

  try {
    const slots = await getJson(`/api/available-slots?service_id=${serviceId}&date=${date}`);

    if (slots.length === 0) {
      slotSelect.innerHTML = `<option value="">Nema slobodnih termina</option>`;
      return;
    }

    slotSelect.innerHTML = "";
    for (const slot of slots) {
      const option = document.createElement("option");
      option.value = slot.start_time;
      option.textContent = `${slot.start_time} - ${slot.end_time}`;
      slotSelect.appendChild(option);
    }
  } catch (error) {
    slotSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    setMessage(error.message, "error");
  }
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage("Zakazivanje je u toku...");

  const payload = {
    service_id: Number(serviceSelect.value),
    date: dateInput.value,
    start_time: slotSelect.value,
    customer_name: document.querySelector("#customerName").value,
    phone: document.querySelector("#phone").value,
    email: document.querySelector("#email").value,
    notes: document.querySelector("#notes").value
  };

  try {
    const data = await getJson("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    setMessage(data.message, "success");
    bookingForm.reset();
    dateInput.value = todayString();
    await loadSlots();
  } catch (error) {
    setMessage(error.message, "error");
    await loadSlots();
  }
});

serviceSelect.addEventListener("change", loadSlots);
dateInput.addEventListener("change", loadSlots);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}

async function init() {
  document.querySelector("#year").textContent = new Date().getFullYear();

  try {
    await loadSettings();
    await loadServices();
    await loadSlots();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

init();
