const pathParts = window.location.pathname.split("/").filter(Boolean);
const slug = pathParts[pathParts.length - 1];

const state = {
  business: null,
  services: [],
  settings: null
};

const serviceSelect = document.querySelector("#service");
const dateInput = document.querySelector("#date");
const slotSelect = document.querySelector("#slot");
const bookingForm = document.querySelector("#bookingForm");
const message = document.querySelector("#message");

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

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Došlo je do greške.");
  return data;
}

async function loadBusiness() {
  const data = await api(`/api/businesses/${slug}`);
  state.business = data.business;
  state.services = data.services;
  state.settings = data.settings;

  document.title = `${state.business.name} - Zakazivanje`;
  document.querySelector("#businessNameHeader").textContent = state.business.name;
  document.querySelector("#businessName").textContent = state.business.name;
  document.querySelector("#businessType").textContent = state.business.type || "Firma";
  document.querySelector("#businessDescription").textContent =
    state.business.description || "Izaberi uslugu, datum i slobodno vreme.";

  const badges = [];
  if (state.business.city) badges.push(state.business.city);
  if (state.business.phone) badges.push(state.business.phone);
  if (state.business.instagram) badges.push(state.business.instagram);
  document.querySelector("#businessBadges").innerHTML = badges.map((x) => `<span>${x}</span>`).join("");

  serviceSelect.innerHTML = "";
  document.querySelector("#servicesGrid").innerHTML = "";

  if (state.services.length === 0) {
    serviceSelect.innerHTML = `<option value="">Nema dostupnih usluga</option>`;
    document.querySelector("#servicesGrid").innerHTML = `<p class="muted">Firma još nije dodala usluge.</p>`;
    return;
  }

  for (const service of state.services) {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = `${service.name} · ${service.duration_minutes} min · ${money(service.price)}`;
    serviceSelect.appendChild(option);

    const card = document.createElement("article");
    card.className = "service-card";
    card.innerHTML = `
      <h3>${service.name}</h3>
      <p>${service.description || "Bez opisa."}</p>
      <div class="service-meta">
        <span class="pill">${service.duration_minutes} min</span>
        <span class="pill">${money(service.price)}</span>
      </div>
    `;
    document.querySelector("#servicesGrid").appendChild(card);
  }

  dateInput.min = todayString();
  dateInput.max = addDays(Number(state.settings.max_booking_days || 45));
  dateInput.value = todayString();

  await loadSlots();
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
    const slots = await api(`/api/businesses/${slug}/available-slots?service_id=${serviceId}&date=${date}`);

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
    slotSelect.innerHTML = `<option value="">Greška</option>`;
    setMessage(error.message, "error");
  }
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Zakazivanje je u toku...");

  try {
    const data = await api(`/api/businesses/${slug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: Number(serviceSelect.value),
        date: dateInput.value,
        start_time: slotSelect.value,
        customer_name: document.querySelector("#customerName").value,
        phone: document.querySelector("#phone").value,
        email: document.querySelector("#email").value,
        notes: document.querySelector("#notes").value
      })
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

loadBusiness().catch((error) => {
  document.querySelector(".main-stack").innerHTML = `<section class="card"><h1>Greška</h1><p class="muted">${error.message}</p></section>`;
});
