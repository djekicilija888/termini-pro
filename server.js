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
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const PLATFORM_NAME = process.env.PLATFORM_NAME || "Termini Platforma";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "termini-platforma.db");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false
}));

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function cb(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function cb(err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function cb(err, rows) {
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

function cleanText(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 255);
}

function cleanPhone(value) {
  return String(value || "").trim().replace(/\s+/g, "").slice(0, 40);
}

function isValidDateString(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));
}

function isValidTimeString(time) {
  return /^\d{2}:\d{2}$/.test(String(time || ""));
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getDayOfWeek(dateString) {
  return new Date(`${dateString}T12:00:00`).getDay();
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function toSlug(text) {
  const map = {
    "š": "s", "đ": "dj", "č": "c", "ć": "c", "ž": "z",
    "Š": "s", "Đ": "dj", "Č": "c", "Ć": "c", "Ž": "z"
  };

  return String(text || "")
    .replace(/[šđčćžŠĐČĆŽ]/g, (ch) => map[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "firma";
}

async function uniqueSlug(baseName) {
  const base = toSlug(baseName);
  let slug = base;
  let i = 2;

  while (await get("SELECT id FROM businesses WHERE slug = ?", [slug])) {
    slug = `${base}-${i}`;
    i++;
  }

  return slug;
}

function publicBusiness(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    city: row.city,
    phone: row.phone,
    instagram: row.instagram,
    address: row.address,
    description: row.description,
    active: row.active
  };
}

function bookingUrl(req, slug) {
  return `${req.protocol}://${req.get("host")}/b/${slug}`;
}

function signToken(user) {
  return jwt.sign({
    id: user.id,
    business_id: user.business_id,
    name: user.name,
    email: user.email,
    role: user.role
  }, JWT_SECRET, { expiresIn: "12h" });
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
  } catch {
    return res.status(401).json({ error: "Sesija je istekla. Prijavi se ponovo." });
  }
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "owner" || !req.user.business_id) {
    return res.status(403).json({ error: "Nemaš dozvolu za owner panel." });
  }

  next();
}

function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Nemaš dozvolu za superadmin panel." });
  }

  next();
}

async function createDefaultWorkingHours(businessId) {
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
        (business_id, day_of_week, is_open, open_time, close_time, break_start, break_end)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [businessId, ...row]
    );
  }
}

async function createDefaultSettings(businessId) {
  await run(
    `
      INSERT INTO business_settings
      (business_id, booking_interval_minutes, min_notice_hours, max_booking_days, updated_at)
      VALUES (?, 15, 2, 45, ?)
    `,
    [businessId, nowIso()]
  );
}

async function createDefaultServices(businessId) {
  const now = nowIso();

  await run(
    `
      INSERT INTO services
      (business_id, name, description, duration_minutes, price, active, sort_order, created_at, updated_at)
      VALUES (?, 'Osnovna usluga', 'Promeni naziv i cenu u svom panelu.', 30, 1000, 1, 1, ?, ?)
    `,
    [businessId, now, now]
  );
}

async function getBusinessBySlug(slug) {
  return get("SELECT * FROM businesses WHERE slug = ? AND active = 1", [slug]);
}

async function getBusinessSettings(businessId) {
  return get("SELECT * FROM business_settings WHERE business_id = ?", [businessId]);
}

async function getServiceForBusiness(businessId, serviceId, activeOnly = false) {
  return get(
    `SELECT * FROM services WHERE business_id = ? AND id = ? ${activeOnly ? "AND active = 1" : ""}`,
    [businessId, serviceId]
  );
}

async function getBusyAppointments(businessId, date) {
  return all(
    `
      SELECT start_time, end_time
      FROM appointments
      WHERE business_id = ?
      AND date = ?
      AND status = 'booked'
      ORDER BY start_time ASC
    `,
    [businessId, date]
  );
}

async function calculateAvailableSlots(businessId, date, service) {
  const settings = await getBusinessSettings(businessId);
  const today = todayString();
  const maxDate = addDays(today, Number(settings.max_booking_days || 45));

  if (!isValidDateString(date) || date < today || date > maxDate) {
    return [];
  }

  const blocked = await get("SELECT * FROM blocked_dates WHERE business_id = ? AND date = ?", [businessId, date]);
  if (blocked) return [];

  const day = getDayOfWeek(date);
  const working = await get(
    "SELECT * FROM working_hours WHERE business_id = ? AND day_of_week = ?",
    [businessId, day]
  );

  if (!working || working.is_open !== 1) return [];

  const duration = Number(service.duration_minutes);
  const interval = Number(settings.booking_interval_minutes || 15);
  const open = timeToMinutes(working.open_time);
  const close = timeToMinutes(working.close_time);
  const busy = await getBusyAppointments(businessId, date);
  const slots = [];

  let breakStart = null;
  let breakEnd = null;

  if (working.break_start && working.break_end) {
    breakStart = timeToMinutes(working.break_start);
    breakEnd = timeToMinutes(working.break_end);
  }

  const minDate = new Date(Date.now() + Number(settings.min_notice_hours || 0) * 60 * 60 * 1000);

  for (let start = open; start + duration <= close; start += interval) {
    const end = start + duration;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);
    const appointmentDate = new Date(`${date}T${startTime}:00`);

    if (appointmentDate < minDate) continue;

    if (breakStart !== null && overlaps(start, end, breakStart, breakEnd)) {
      continue;
    }

    const conflict = busy.some((item) => {
      return overlaps(start, end, timeToMinutes(item.start_time), timeToMinutes(item.end_time));
    });

    if (!conflict) {
      slots.push({ start_time: startTime, end_time: endTime });
    }
  }

  return slots;
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT '',
      city TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      address TEXT DEFAULT '',
      description TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      business_id INTEGER PRIMARY KEY,
      booking_interval_minutes INTEGER NOT NULL DEFAULT 15,
      min_notice_hours INTEGER NOT NULL DEFAULT 2,
      max_booking_days INTEGER NOT NULL DEFAULT 45,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS working_hours (
      business_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      is_open INTEGER NOT NULL,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      break_start TEXT DEFAULT '',
      break_end TEXT DEFAULT '',
      PRIMARY KEY (business_id, day_of_week),
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      business_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      PRIMARY KEY (business_id, date),
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(business_id) REFERENCES businesses(id),
      FOREIGN KEY(service_id) REFERENCES services(id)
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug)");
  await run("CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, date)");
  await run("CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id)");

  const superEmail = normalizeEmail(process.env.SUPERADMIN_EMAIL || "admin@platform.local");
  const existingSuper = await get("SELECT id FROM users WHERE email = ?", [superEmail]);

  if (!existingSuper) {
    const hash = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || "platform123", 12);
    await run(
      `
        INSERT INTO users (business_id, name, email, password_hash, role, created_at)
        VALUES (NULL, ?, ?, ?, 'superadmin', ?)
      `,
      [process.env.SUPERADMIN_NAME || "Super Admin", superEmail, hash, nowIso()]
    );
  }
}

app.get("/b/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "business.html"));
});

app.get("/owner", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "owner.html"));
});

app.get("/superadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "superadmin.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "termini-platforma" });
});

app.get("/api/platform", (req, res) => {
  res.json({ name: PLATFORM_NAME });
});

app.post("/api/auth/register-business", async (req, res) => {
  try {
    const businessName = cleanText(req.body.business_name, 120);
    const type = cleanText(req.body.type, 80);
    const city = cleanText(req.body.city, 80);
    const phone = cleanPhone(req.body.phone);
    const ownerName = cleanText(req.body.owner_name || businessName, 120);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (businessName.length < 2) return res.status(400).json({ error: "Naziv firme je obavezan." });
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Email nije ispravan." });
    if (password.length < 6) return res.status(400).json({ error: "Lozinka mora imati bar 6 karaktera." });

    const emailExists = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (emailExists) return res.status(409).json({ error: "Ovaj email već postoji." });

    const slug = await uniqueSlug(businessName);
    const now = nowIso();

    const businessResult = await run(
      `
        INSERT INTO businesses
        (name, slug, type, city, phone, instagram, address, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', '', '', 1, ?, ?)
      `,
      [businessName, slug, type, city, phone, now, now]
    );

    const businessId = businessResult.lastID;
    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await run(
      `
        INSERT INTO users
        (business_id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, 'owner', ?)
      `,
      [businessId, ownerName, email, passwordHash, now]
    );

    await createDefaultSettings(businessId);
    await createDefaultWorkingHours(businessId);
    await createDefaultServices(businessId);

    const user = {
      id: userResult.lastID,
      business_id: businessId,
      name: ownerName,
      email,
      role: "owner"
    };

    res.status(201).json({
      token: signToken(user),
      user,
      business: { id: businessId, name: businessName, slug },
      booking_url: bookingUrl(req, slug),
      message: "Firma je registrovana."
    });
  } catch (error) {
    res.status(500).json({ error: "Greška pri registraciji firme." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: "Pogrešan email ili lozinka." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Pogrešan email ili lozinka." });

    res.json({
      token: signToken(user),
      user: {
        id: user.id,
        business_id: user.business_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ error: "Greška pri prijavi." });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  let business = null;

  if (req.user.business_id) {
    business = await get("SELECT * FROM businesses WHERE id = ?", [req.user.business_id]);
  }

  res.json({
    user: req.user,
    business: business ? {
      ...publicBusiness(business),
      booking_url: bookingUrl(req, business.slug)
    } : null
  });
});

app.get("/api/businesses", async (req, res) => {
  try {
    const q = cleanText(req.query.q, 120).toLowerCase();
    const params = [];
    let where = "WHERE active = 1";

    if (q) {
      where += " AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(type) LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const rows = await all(
      `
        SELECT *
        FROM businesses
        ${where}
        ORDER BY created_at DESC
        LIMIT 100
      `,
      params
    );

    res.json(rows.map((row) => ({
      ...publicBusiness(row),
      booking_url: bookingUrl(req, row.slug)
    })));
  } catch {
    res.status(500).json({ error: "Greška pri čitanju firmi." });
  }
});

app.get("/api/businesses/:slug", async (req, res) => {
  try {
    const business = await getBusinessBySlug(cleanText(req.params.slug, 100));
    if (!business) return res.status(404).json({ error: "Firma nije pronađena." });

    const services = await all(
      `
        SELECT id, name, description, duration_minutes, price, active, sort_order
        FROM services
        WHERE business_id = ? AND active = 1
        ORDER BY sort_order ASC, id ASC
      `,
      [business.id]
    );

    const settings = await getBusinessSettings(business.id);

    res.json({
      business: {
        ...publicBusiness(business),
        booking_url: bookingUrl(req, business.slug)
      },
      services,
      settings: {
        booking_interval_minutes: settings.booking_interval_minutes,
        min_notice_hours: settings.min_notice_hours,
        max_booking_days: settings.max_booking_days
      }
    });
  } catch {
    res.status(500).json({ error: "Greška pri čitanju firme." });
  }
});

app.get("/api/businesses/:slug/available-slots", async (req, res) => {
  try {
    const business = await getBusinessBySlug(cleanText(req.params.slug, 100));
    if (!business) return res.status(404).json({ error: "Firma nije pronađena." });

    const serviceId = Number(req.query.service_id);
    const date = cleanText(req.query.date, 20);

    if (!Number.isInteger(serviceId) || serviceId <= 0 || !isValidDateString(date)) {
      return res.status(400).json({ error: "Neispravna usluga ili datum." });
    }

    const service = await getServiceForBusiness(business.id, serviceId, true);
    if (!service) return res.status(404).json({ error: "Usluga nije dostupna." });

    const slots = await calculateAvailableSlots(business.id, date, service);
    res.json(slots);
  } catch {
    res.status(500).json({ error: "Greška pri računanju termina." });
  }
});

app.post("/api/businesses/:slug/appointments", async (req, res) => {
  try {
    const business = await getBusinessBySlug(cleanText(req.params.slug, 100));
    if (!business) return res.status(404).json({ error: "Firma nije pronađena." });

    const serviceId = Number(req.body.service_id);
    const customerName = cleanText(req.body.customer_name, 120);
    const phone = cleanPhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const date = cleanText(req.body.date, 20);
    const startTime = cleanText(req.body.start_time, 10);
    const notes = cleanText(req.body.notes, 500);

    if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ error: "Izaberi uslugu." });
    if (customerName.length < 2) return res.status(400).json({ error: "Unesi ime i prezime." });
    if (phone.length < 6) return res.status(400).json({ error: "Unesi ispravan telefon." });
    if (!isValidDateString(date) || !isValidTimeString(startTime)) return res.status(400).json({ error: "Izaberi datum i vreme." });

    const service = await getServiceForBusiness(business.id, serviceId, true);
    if (!service) return res.status(404).json({ error: "Usluga nije dostupna." });

    const slots = await calculateAvailableSlots(business.id, date, service);
    const selected = slots.find((slot) => slot.start_time === startTime);

    if (!selected) {
      return res.status(409).json({ error: "Termin više nije slobodan. Izaberi drugi." });
    }

    const now = nowIso();
    const result = await run(
      `
        INSERT INTO appointments
        (business_id, service_id, customer_name, phone, email, date, start_time, end_time, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?)
      `,
      [business.id, serviceId, customerName, phone, email, date, selected.start_time, selected.end_time, notes, now, now]
    );

    console.log("Nova rezervacija:", {
      business: business.name,
      customerName,
      phone,
      service: service.name,
      date,
      start: selected.start_time
    });

    res.status(201).json({
      message: "Termin je uspešno zakazan.",
      appointment: {
        id: result.lastID,
        business_name: business.name,
        service_name: service.name,
        customer_name: customerName,
        phone,
        date,
        start_time: selected.start_time,
        end_time: selected.end_time,
        status: "booked"
      }
    });
  } catch {
    res.status(500).json({ error: "Greška pri zakazivanju termina." });
  }
});

app.get("/api/owner/dashboard", requireAuth, requireOwner, async (req, res) => {
  try {
    const businessId = req.user.business_id;
    const today = todayString();
    const week = addDays(today, 7);

    const business = await get("SELECT * FROM businesses WHERE id = ?", [businessId]);
    const todayCount = await get(
      "SELECT COUNT(*) AS total FROM appointments WHERE business_id = ? AND date = ? AND status = 'booked'",
      [businessId, today]
    );
    const weekCount = await get(
      "SELECT COUNT(*) AS total FROM appointments WHERE business_id = ? AND date >= ? AND date <= ? AND status = 'booked'",
      [businessId, today, week]
    );
    const servicesCount = await get(
      "SELECT COUNT(*) AS total FROM services WHERE business_id = ? AND active = 1",
      [businessId]
    );
    const upcoming = await all(
      `
        SELECT a.*, s.name AS service_name, s.price
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.business_id = ?
        AND a.date >= ?
        ORDER BY a.date ASC, a.start_time ASC
        LIMIT 8
      `,
      [businessId, today]
    );

    res.json({
      business: { ...publicBusiness(business), booking_url: bookingUrl(req, business.slug) },
      cards: {
        today: todayCount.total,
        next_7_days: weekCount.total,
        active_services: servicesCount.total
      },
      upcoming
    });
  } catch {
    res.status(500).json({ error: "Greška pri čitanju dashboard-a." });
  }
});

app.get("/api/owner/appointments", requireAuth, requireOwner, async (req, res) => {
  try {
    const businessId = req.user.business_id;
    const from = cleanText(req.query.from, 20) || todayString();
    const to = cleanText(req.query.to, 20) || addDays(from, 30);
    const status = cleanText(req.query.status, 30);

    const params = [businessId, from, to];
    let where = "WHERE a.business_id = ? AND a.date >= ? AND a.date <= ?";

    if (status) {
      where += " AND a.status = ?";
      params.push(status);
    }

    const rows = await all(
      `
        SELECT a.*, s.name AS service_name, s.price
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        ${where}
        ORDER BY a.date ASC, a.start_time ASC
      `,
      params
    );

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Greška pri čitanju termina." });
  }
});

app.patch("/api/owner/appointments/:id/status", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = cleanText(req.body.status, 30);
    const allowed = ["booked", "completed", "cancelled", "no_show"];

    if (!Number.isInteger(id) || id <= 0 || !allowed.includes(status)) {
      return res.status(400).json({ error: "Neispravan status." });
    }

    const result = await run(
      "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ? AND business_id = ?",
      [status, nowIso(), id, req.user.business_id]
    );

    if (result.changes === 0) return res.status(404).json({ error: "Termin nije pronađen." });

    res.json({ message: "Status je promenjen." });
  } catch {
    res.status(500).json({ error: "Greška pri promeni statusa." });
  }
});

app.get("/api/owner/services", requireAuth, requireOwner, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT *
        FROM services
        WHERE business_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [req.user.business_id]
    );

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Greška pri čitanju usluga." });
  }
});

app.post("/api/owner/services", requireAuth, requireOwner, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 120);
    const description = cleanText(req.body.description, 500);
    const duration = Number(req.body.duration_minutes);
    const price = Math.max(0, Math.round(Number(req.body.price || 0)));
    const sort = Number(req.body.sort_order || 0);

    if (name.length < 2) return res.status(400).json({ error: "Naziv usluge je obavezan." });
    if (!Number.isInteger(duration) || duration < 5 || duration > 600) return res.status(400).json({ error: "Trajanje nije ispravno." });

    const now = nowIso();
    const result = await run(
      `
        INSERT INTO services
        (business_id, name, description, duration_minutes, price, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `,
      [req.user.business_id, name, description, duration, price, sort, now, now]
    );

    res.status(201).json({ id: result.lastID, message: "Usluga je dodata." });
  } catch {
    res.status(500).json({ error: "Greška pri dodavanju usluge." });
  }
});

app.put("/api/owner/services/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = cleanText(req.body.name, 120);
    const description = cleanText(req.body.description, 500);
    const duration = Number(req.body.duration_minutes);
    const price = Math.max(0, Math.round(Number(req.body.price || 0)));
    const sort = Number(req.body.sort_order || 0);
    const active = req.body.active ? 1 : 0;

    if (name.length < 2) return res.status(400).json({ error: "Naziv usluge je obavezan." });
    if (!Number.isInteger(duration) || duration < 5 || duration > 600) return res.status(400).json({ error: "Trajanje nije ispravno." });

    const result = await run(
      `
        UPDATE services
        SET name = ?, description = ?, duration_minutes = ?, price = ?, active = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND business_id = ?
      `,
      [name, description, duration, price, active, sort, nowIso(), id, req.user.business_id]
    );

    if (result.changes === 0) return res.status(404).json({ error: "Usluga nije pronađena." });
    res.json({ message: "Usluga je sačuvana." });
  } catch {
    res.status(500).json({ error: "Greška pri čuvanju usluge." });
  }
});

app.get("/api/owner/working-hours", requireAuth, requireOwner, async (req, res) => {
  const rows = await all(
    "SELECT * FROM working_hours WHERE business_id = ? ORDER BY day_of_week ASC",
    [req.user.business_id]
  );
  res.json(rows);
});

app.put("/api/owner/working-hours", requireAuth, requireOwner, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length !== 7) return res.status(400).json({ error: "Pošalji svih 7 dana." });

    for (const row of rows) {
      const day = Number(row.day_of_week);
      const isOpen = row.is_open ? 1 : 0;
      const open = cleanText(row.open_time, 10) || "09:00";
      const close = cleanText(row.close_time, 10) || "17:00";
      const breakStart = cleanText(row.break_start, 10);
      const breakEnd = cleanText(row.break_end, 10);

      if (!Number.isInteger(day) || day < 0 || day > 6) return res.status(400).json({ error: "Neispravan dan." });
      if (!isValidTimeString(open) || !isValidTimeString(close) || timeToMinutes(open) >= timeToMinutes(close)) {
        return res.status(400).json({ error: "Radno vreme nije ispravno." });
      }

      await run(
        `
          UPDATE working_hours
          SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?
          WHERE business_id = ? AND day_of_week = ?
        `,
        [isOpen, open, close, breakStart, breakEnd, req.user.business_id, day]
      );
    }

    res.json({ message: "Radno vreme je sačuvano." });
  } catch {
    res.status(500).json({ error: "Greška pri čuvanju radnog vremena." });
  }
});

app.get("/api/owner/blocked-dates", requireAuth, requireOwner, async (req, res) => {
  const rows = await all(
    "SELECT * FROM blocked_dates WHERE business_id = ? ORDER BY date ASC",
    [req.user.business_id]
  );
  res.json(rows);
});

app.post("/api/owner/blocked-dates", requireAuth, requireOwner, async (req, res) => {
  try {
    const date = cleanText(req.body.date, 20);
    const reason = cleanText(req.body.reason, 255);

    if (!isValidDateString(date)) return res.status(400).json({ error: "Datum nije ispravan." });

    await run(
      `
        INSERT OR REPLACE INTO blocked_dates
        (business_id, date, reason, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [req.user.business_id, date, reason, nowIso()]
    );

    res.status(201).json({ message: "Datum je blokiran." });
  } catch {
    res.status(500).json({ error: "Greška pri blokiranju datuma." });
  }
});

app.delete("/api/owner/blocked-dates/:date", requireAuth, requireOwner, async (req, res) => {
  const date = cleanText(req.params.date, 20);
  await run("DELETE FROM blocked_dates WHERE business_id = ? AND date = ?", [req.user.business_id, date]);
  res.json({ message: "Datum je odblokiran." });
});

app.get("/api/owner/settings", requireAuth, requireOwner, async (req, res) => {
  const business = await get("SELECT * FROM businesses WHERE id = ?", [req.user.business_id]);
  const settings = await getBusinessSettings(req.user.business_id);
  res.json({ business: { ...publicBusiness(business), booking_url: bookingUrl(req, business.slug) }, settings });
});

app.put("/api/owner/settings", requireAuth, requireOwner, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 120);
    const type = cleanText(req.body.type, 80);
    const city = cleanText(req.body.city, 80);
    const phone = cleanPhone(req.body.phone);
    const instagram = cleanText(req.body.instagram, 120);
    const address = cleanText(req.body.address, 255);
    const description = cleanText(req.body.description, 800);
    const interval = Number(req.body.booking_interval_minutes);
    const minNotice = Number(req.body.min_notice_hours);
    const maxDays = Number(req.body.max_booking_days);

    if (name.length < 2) return res.status(400).json({ error: "Naziv firme je obavezan." });
    if (![5, 10, 15, 20, 30, 60].includes(interval)) return res.status(400).json({ error: "Interval nije ispravan." });
    if (!Number.isInteger(minNotice) || minNotice < 0 || minNotice > 168) return res.status(400).json({ error: "Minimalna najava nije ispravna." });
    if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 365) return res.status(400).json({ error: "Maksimalni broj dana nije ispravan." });

    await run(
      `
        UPDATE businesses
        SET name = ?, type = ?, city = ?, phone = ?, instagram = ?, address = ?, description = ?, updated_at = ?
        WHERE id = ?
      `,
      [name, type, city, phone, instagram, address, description, nowIso(), req.user.business_id]
    );

    await run(
      `
        UPDATE business_settings
        SET booking_interval_minutes = ?, min_notice_hours = ?, max_booking_days = ?, updated_at = ?
        WHERE business_id = ?
      `,
      [interval, minNotice, maxDays, nowIso(), req.user.business_id]
    );

    res.json({ message: "Podešavanja su sačuvana." });
  } catch {
    res.status(500).json({ error: "Greška pri čuvanju podešavanja." });
  }
});

app.get("/api/superadmin/businesses", requireAuth, requireSuperadmin, async (req, res) => {
  const rows = await all(
    `
      SELECT b.*,
        (SELECT COUNT(*) FROM appointments a WHERE a.business_id = b.id) AS appointments_count,
        (SELECT COUNT(*) FROM services s WHERE s.business_id = b.id) AS services_count
      FROM businesses b
      ORDER BY b.created_at DESC
      LIMIT 300
    `
  );

  res.json(rows.map((row) => ({
    ...publicBusiness(row),
    appointments_count: row.appointments_count,
    services_count: row.services_count,
    booking_url: bookingUrl(req, row.slug)
  })));
});

app.patch("/api/superadmin/businesses/:id/active", requireAuth, requireSuperadmin, async (req, res) => {
  const id = Number(req.params.id);
  const active = req.body.active ? 1 : 0;

  await run("UPDATE businesses SET active = ?, updated_at = ? WHERE id = ?", [active, nowIso(), id]);
  res.json({ message: active ? "Firma je aktivirana." : "Firma je deaktivirana." });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Termini Platforma radi na http://localhost:${PORT}`);
      console.log(`Owner panel: http://localhost:${PORT}/owner.html`);
      console.log(`Superadmin panel: http://localhost:${PORT}/superadmin.html`);
    });
  })
  .catch((error) => {
    console.error("Greška pri pokretanju:", error);
    process.exit(1);
  });
