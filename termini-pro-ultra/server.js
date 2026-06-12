require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Moj Salon";

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
}));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "termini-pro.db");
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function callback(err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function callback(err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function nowIso() {
  return new Date().toISOString();
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidDateString(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));
}

function isValidTimeString(time) {
  return /^\d{2}:\d{2}$/.test(String(time || ""));
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDayOfWeek(dateString) {
  return new Date(`${dateString}T12:00:00`).getDay();
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function cleanText(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function cleanPhone(value) {
  return String(value || "").trim().replace(/\s+/g, "").slice(0, 30);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 255);
}

function parseMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      booking_interval_minutes INTEGER NOT NULL DEFAULT 15,
      min_notice_hours INTEGER NOT NULL DEFAULT 2,
      max_booking_days INTEGER NOT NULL DEFAULT 45,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS working_hours (
      day_of_week INTEGER PRIMARY KEY,
      is_open INTEGER NOT NULL,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      break_start TEXT DEFAULT '',
      break_end TEXT DEFAULT ''
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      date TEXT PRIMARY KEY,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      service_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(service_id) REFERENCES services(id)
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)");
  await run("CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)");

  const userCount = await get("SELECT COUNT(*) AS total FROM users");
  if (userCount.total === 0) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12);
    await run(
      "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)",
      [
        process.env.ADMIN_NAME || "Admin",
        normalizeEmail(process.env.ADMIN_EMAIL || "admin@termini.local"),
        passwordHash,
        nowIso()
      ]
    );
  }

  const settingsCount = await get("SELECT COUNT(*) AS total FROM business_settings");
  if (settingsCount.total === 0) {
    await run(
      `
        INSERT INTO business_settings
        (id, business_name, phone, address, booking_interval_minutes, min_notice_hours, max_booking_days, updated_at)
        VALUES (1, ?, '', '', 15, 2, 45, ?)
      `,
      [BUSINESS_NAME, nowIso()]
    );
  }

  const serviceCount = await get("SELECT COUNT(*) AS total FROM services");
  if (serviceCount.total === 0) {
    const services = [
      ["Šišanje", "Klasično muško šišanje.", 30, 1000, 1],
      ["Brijanje", "Uređivanje brade i brijanje.", 20, 700, 2],
      ["Šišanje + brijanje", "Kompletna usluga.", 60, 1600, 3]
    ];

    for (const service of services) {
      await run(
        `
          INSERT INTO services
          (name, description, duration_minutes, price, active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `,
        [service[0], service[1], service[2], service[3], service[4], nowIso(), nowIso()]
      );
    }
  }

  const workingCount = await get("SELECT COUNT(*) AS total FROM working_hours");
  if (workingCount.total === 0) {
    const defaults = [
      [0, 0, "09:00", "17:00", "", ""],
      [1, 1, "09:00", "17:00", "", ""],
      [2, 1, "09:00", "17:00", "", ""],
      [3, 1, "09:00", "17:00", "", ""],
      [4, 1, "09:00", "17:00", "", ""],
      [5, 1, "09:00", "17:00", "", ""],
      [6, 1, "09:00", "14:00", "", ""]
    ];

    for (const row of defaults) {
      await run(
        `
          INSERT INTO working_hours
          (day_of_week, is_open, open_time, close_time, break_start, break_end)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        row
      );
    }
  }
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Moraš biti prijavljen." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Sesija je istekla. Prijavi se ponovo." });
  }
}

async function getSettings() {
  return get("SELECT * FROM business_settings WHERE id = 1");
}

async function getService(id, publicOnly = false) {
  if (publicOnly) {
    return get("SELECT * FROM services WHERE id = ? AND active = 1", [id]);
  }

  return get("SELECT * FROM services WHERE id = ?", [id]);
}

async function isDateBlocked(date) {
  const blocked = await get("SELECT * FROM blocked_dates WHERE date = ?", [date]);
  return blocked || null;
}

async function getBusyAppointments(date) {
  return all(
    `
      SELECT start_time, end_time
      FROM appointments
      WHERE date = ?
      AND status = 'booked'
      ORDER BY start_time ASC
    `,
    [date]
  );
}

function isTooSoon(date, startTime, minNoticeHours) {
  const appointmentDate = new Date(`${date}T${startTime}:00`);
  const minDate = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);
  return appointmentDate < minDate;
}

async function calculateAvailableSlots(date, service) {
  const settings = await getSettings();

  if (!isValidDateString(date)) {
    return [];
  }

  const today = todayString();
  const maxDate = addDays(today, settings.max_booking_days);

  if (date < today || date > maxDate) {
    return [];
  }

  const blocked = await isDateBlocked(date);
  if (blocked) {
    return [];
  }

  const dayOfWeek = getDayOfWeek(date);
  const working = await get("SELECT * FROM working_hours WHERE day_of_week = ?", [dayOfWeek]);

  if (!working || working.is_open !== 1) {
    return [];
  }

  const duration = Number(service.duration_minutes);
  const interval = Number(settings.booking_interval_minutes) || 15;
  const open = timeToMinutes(working.open_time);
  const close = timeToMinutes(working.close_time);
  const busy = await getBusyAppointments(date);

  let breakStart = null;
  let breakEnd = null;

  if (working.break_start && working.break_end) {
    breakStart = timeToMinutes(working.break_start);
    breakEnd = timeToMinutes(working.break_end);
  }

  const slots = [];

  for (let start = open; start + duration <= close; start += interval) {
    const end = start + duration;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);

    if (isTooSoon(date, startTime, settings.min_notice_hours)) {
      continue;
    }

    const hitsBreak = breakStart !== null && overlaps(start, end, breakStart, breakEnd);
    if (hitsBreak) {
      continue;
    }

    const hitsAppointment = busy.some((appointment) => {
      return overlaps(
        start,
        end,
        timeToMinutes(appointment.start_time),
        timeToMinutes(appointment.end_time)
      );
    });

    if (!hitsAppointment) {
      slots.push({ start_time: startTime, end_time: endTime });
    }
  }

  return slots;
}

async function sendCustomerNotification(appointment) {
  const text = `Poštovani ${appointment.customer_name}, vaš termin za "${appointment.service_name}" je zakazan za ${appointment.date} u ${appointment.start_time}.`;

  console.log("---- SMS/VIBER PLACEHOLDER ----");
  console.log("To:", appointment.phone);
  console.log("Message:", text);
  console.log("Ovde se kasnije povezuje SMS/Viber provajder.");
  console.log("--------------------------------");
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "termini-pro" });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Unesi email i lozinku." });
    }

    const user = await get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ error: "Pogrešan email ili lozinka." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: "Pogrešan email ili lozinka." });
    }

    res.json({
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Greška pri prijavi." });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/public/settings", async (req, res) => {
  const settings = await getSettings();
  res.json({
    business_name: settings.business_name,
    phone: settings.phone,
    address: settings.address,
    booking_interval_minutes: settings.booking_interval_minutes,
    min_notice_hours: settings.min_notice_hours,
    max_booking_days: settings.max_booking_days
  });
});

app.get("/api/services", async (req, res) => {
  try {
    const activeOnly = req.query.active === "1";
    const services = await all(
      `
        SELECT id, name, description, duration_minutes, price, active, sort_order
        FROM services
        ${activeOnly ? "WHERE active = 1" : ""}
        ORDER BY sort_order ASC, id ASC
      `
    );
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju usluga." });
  }
});

app.get("/api/available-slots", async (req, res) => {
  try {
    const serviceId = Number(req.query.service_id);
    const date = cleanText(req.query.date, 20);

    if (!Number.isInteger(serviceId) || serviceId <= 0 || !isValidDateString(date)) {
      return res.status(400).json({ error: "Neispravna usluga ili datum." });
    }

    const service = await getService(serviceId, true);
    if (!service) {
      return res.status(404).json({ error: "Usluga nije dostupna." });
    }

    const slots = await calculateAvailableSlots(date, service);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: "Greška pri računanju termina." });
  }
});

app.post("/api/appointments", async (req, res) => {
  try {
    const customerName = cleanText(req.body.customer_name, 120);
    const phone = cleanPhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const notes = cleanText(req.body.notes, 500);
    const serviceId = Number(req.body.service_id);
    const date = cleanText(req.body.date, 20);
    const startTime = cleanText(req.body.start_time, 10);

    if (customerName.length < 2) {
      return res.status(400).json({ error: "Unesi ime i prezime." });
    }

    if (phone.length < 6) {
      return res.status(400).json({ error: "Unesi ispravan broj telefona." });
    }

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ error: "Izaberi uslugu." });
    }

    if (!isValidDateString(date) || !isValidTimeString(startTime)) {
      return res.status(400).json({ error: "Izaberi datum i vreme." });
    }

    const service = await getService(serviceId, true);
    if (!service) {
      return res.status(404).json({ error: "Usluga nije dostupna." });
    }

    const slots = await calculateAvailableSlots(date, service);
    const selectedSlot = slots.find((slot) => slot.start_time === startTime);

    if (!selectedSlot) {
      return res.status(409).json({ error: "Termin više nije slobodan. Izaberi drugi." });
    }

    const result = await run(
      `
        INSERT INTO appointments
        (customer_name, phone, email, service_id, date, start_time, end_time, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?)
      `,
      [
        customerName,
        phone,
        email,
        serviceId,
        date,
        selectedSlot.start_time,
        selectedSlot.end_time,
        notes,
        nowIso(),
        nowIso()
      ]
    );

    const appointment = {
      id: result.lastID,
      customer_name: customerName,
      phone,
      email,
      service_id: serviceId,
      service_name: service.name,
      date,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      status: "booked"
    };

    await sendCustomerNotification(appointment);

    res.status(201).json({
      message: "Termin je uspešno zakazan.",
      appointment
    });
  } catch (error) {
    res.status(500).json({ error: "Greška pri zakazivanju termina." });
  }
});

app.get("/api/admin/dashboard", requireAuth, async (req, res) => {
  try {
    const today = todayString();
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    const todayAppointments = await get(
      "SELECT COUNT(*) AS total FROM appointments WHERE date = ? AND status = 'booked'",
      [today]
    );

    const next7 = await get(
      "SELECT COUNT(*) AS total FROM appointments WHERE date >= ? AND date <= ? AND status = 'booked'",
      [today, nextWeek]
    );

    const cancelled = await get(
      "SELECT COUNT(*) AS total FROM appointments WHERE status = 'cancelled'"
    );

    const services = await get("SELECT COUNT(*) AS total FROM services WHERE active = 1");

    const upcoming = await all(
      `
        SELECT a.*, s.name AS service_name
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.date >= ?
        ORDER BY a.date ASC, a.start_time ASC
        LIMIT 8
      `,
      [today]
    );

    res.json({
      today,
      tomorrow,
      cards: {
        today_appointments: todayAppointments.total,
        next_7_days: next7.total,
        cancelled: cancelled.total,
        active_services: services.total
      },
      upcoming
    });
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju dashboard-a." });
  }
});

app.get("/api/admin/appointments", requireAuth, async (req, res) => {
  try {
    const from = cleanText(req.query.from, 20) || todayString();
    const to = cleanText(req.query.to, 20) || addDays(from, 30);
    const status = cleanText(req.query.status, 30);

    const params = [from, to];
    let where = "WHERE a.date >= ? AND a.date <= ?";

    if (status) {
      where += " AND a.status = ?";
      params.push(status);
    }

    const appointments = await all(
      `
        SELECT
          a.id, a.customer_name, a.phone, a.email, a.date, a.start_time, a.end_time,
          a.status, a.notes, a.created_at, a.updated_at,
          s.name AS service_name, s.duration_minutes, s.price
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        ${where}
        ORDER BY a.date ASC, a.start_time ASC
      `,
      params
    );

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju termina." });
  }
});

app.patch("/api/admin/appointments/:id/status", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = cleanText(req.body.status, 30);
    const allowed = ["booked", "completed", "cancelled", "no_show"];

    if (!Number.isInteger(id) || id <= 0 || !allowed.includes(status)) {
      return res.status(400).json({ error: "Neispravan status." });
    }

    const result = await run(
      "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
      [status, nowIso(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Termin nije pronađen." });
    }

    res.json({ message: "Status termina je promenjen." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri promeni statusa." });
  }
});

app.post("/api/admin/services", requireAuth, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 120);
    const description = cleanText(req.body.description, 500);
    const duration = Number(req.body.duration_minutes);
    const price = parseMoney(req.body.price);
    const sortOrder = Number(req.body.sort_order || 0);

    if (name.length < 2) {
      return res.status(400).json({ error: "Naziv usluge je obavezan." });
    }

    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      return res.status(400).json({ error: "Trajanje mora biti između 5 i 480 minuta." });
    }

    const result = await run(
      `
        INSERT INTO services
        (name, description, duration_minutes, price, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `,
      [name, description, duration, price, sortOrder, nowIso(), nowIso()]
    );

    res.status(201).json({ id: result.lastID, message: "Usluga je dodata." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri dodavanju usluge." });
  }
});

app.put("/api/admin/services/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = cleanText(req.body.name, 120);
    const description = cleanText(req.body.description, 500);
    const duration = Number(req.body.duration_minutes);
    const price = parseMoney(req.body.price);
    const active = req.body.active ? 1 : 0;
    const sortOrder = Number(req.body.sort_order || 0);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Neispravna usluga." });
    }

    if (name.length < 2 || !Number.isInteger(duration) || duration < 5 || duration > 480) {
      return res.status(400).json({ error: "Popuni uslugu ispravno." });
    }

    const result = await run(
      `
        UPDATE services
        SET name = ?, description = ?, duration_minutes = ?, price = ?, active = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `,
      [name, description, duration, price, active, sortOrder, nowIso(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Usluga nije pronađena." });
    }

    res.json({ message: "Usluga je sačuvana." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri izmeni usluge." });
  }
});

app.get("/api/admin/working-hours", requireAuth, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM working_hours ORDER BY day_of_week ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju radnog vremena." });
  }
});

app.put("/api/admin/working-hours", requireAuth, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    if (rows.length !== 7) {
      return res.status(400).json({ error: "Pošalji svih 7 dana." });
    }

    for (const row of rows) {
      const day = Number(row.day_of_week);
      const isOpen = row.is_open ? 1 : 0;
      const open = cleanText(row.open_time, 10) || "09:00";
      const close = cleanText(row.close_time, 10) || "17:00";
      const breakStart = cleanText(row.break_start, 10);
      const breakEnd = cleanText(row.break_end, 10);

      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return res.status(400).json({ error: "Neispravan dan." });
      }

      if (!isValidTimeString(open) || !isValidTimeString(close) || timeToMinutes(open) >= timeToMinutes(close)) {
        return res.status(400).json({ error: "Radno vreme nije ispravno." });
      }

      await run(
        `
          UPDATE working_hours
          SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?
          WHERE day_of_week = ?
        `,
        [isOpen, open, close, breakStart, breakEnd, day]
      );
    }

    res.json({ message: "Radno vreme je sačuvano." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri čuvanju radnog vremena." });
  }
});

app.get("/api/admin/blocked-dates", requireAuth, async (req, res) => {
  try {
    const rows = await all("SELECT * FROM blocked_dates ORDER BY date ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju blokiranih datuma." });
  }
});

app.post("/api/admin/blocked-dates", requireAuth, async (req, res) => {
  try {
    const date = cleanText(req.body.date, 20);
    const reason = cleanText(req.body.reason, 255);

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "Datum nije ispravan." });
    }

    await run(
      "INSERT OR REPLACE INTO blocked_dates (date, reason, created_at) VALUES (?, ?, ?)",
      [date, reason, nowIso()]
    );

    res.status(201).json({ message: "Datum je blokiran." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri blokiranju datuma." });
  }
});

app.delete("/api/admin/blocked-dates/:date", requireAuth, async (req, res) => {
  try {
    const date = cleanText(req.params.date, 20);

    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "Datum nije ispravan." });
    }

    await run("DELETE FROM blocked_dates WHERE date = ?", [date]);
    res.json({ message: "Datum je odblokiran." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri brisanju blokiranog datuma." });
  }
});

app.get("/api/admin/settings", requireAuth, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Greška pri čitanju podešavanja." });
  }
});

app.put("/api/admin/settings", requireAuth, async (req, res) => {
  try {
    const businessName = cleanText(req.body.business_name, 120) || "Moj Salon";
    const phone = cleanText(req.body.phone, 50);
    const address = cleanText(req.body.address, 255);
    const interval = Number(req.body.booking_interval_minutes);
    const minNotice = Number(req.body.min_notice_hours);
    const maxDays = Number(req.body.max_booking_days);

    if (![5, 10, 15, 20, 30, 60].includes(interval)) {
      return res.status(400).json({ error: "Interval mora biti 5, 10, 15, 20, 30 ili 60 minuta." });
    }

    if (!Number.isInteger(minNotice) || minNotice < 0 || minNotice > 168) {
      return res.status(400).json({ error: "Minimalna najava nije ispravna." });
    }

    if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 365) {
      return res.status(400).json({ error: "Maksimalni broj dana nije ispravan." });
    }

    await run(
      `
        UPDATE business_settings
        SET business_name = ?, phone = ?, address = ?, booking_interval_minutes = ?,
            min_notice_hours = ?, max_booking_days = ?, updated_at = ?
        WHERE id = 1
      `,
      [businessName, phone, address, interval, minNotice, maxDays, nowIso()]
    );

    res.json({ message: "Podešavanja su sačuvana." });
  } catch (error) {
    res.status(500).json({ error: "Greška pri čuvanju podešavanja." });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Termini Pro radi na http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    });
  })
  .catch((error) => {
    console.error("Greška pri pokretanju:", error);
    process.exit(1);
  });
