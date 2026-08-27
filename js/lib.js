const TZ = "Europe/Budapest";
const FORBIDDEN_KEY = /^(host(name)?|ip|ssh|path|cwd|home|user|username|opt|env|token|secret|password|key)$/i;
const FORBIDDEN_VALUE = /(\b\d{1,3}(\.\d{1,3}){3}\b)|(\/opt\/)|(^[A-Za-z]:\\)/i;

const HEALTH_LABEL = {
  ok: "Rendben",
  degraded: "Csökkent",
  down: "Leállt",
  unknown: "Ismeretlen",
};

const KIND_LABEL = { systemd: "systemd", cron: "cron" };
const STATE_LABEL = { active: "fut", inactive: "áll", unknown: "ismeretlen" };

const NOTE_LABEL = {
  n_locations: "Helyek",
  forecast_n: "Forecast sor",
  obs_n: "Megfigyelés",
  last_forecast: "Utolsó forecast",
  last_obs: "Utolsó tény",
  last_forecast_status: "Forecast",
  last_obs_status: "Tény",
  n_stations: "Állomások",
  n_vehicles: "Járművek",
  last_station_at: "Állomás poll",
  last_vehicle_at: "Jármű poll",
};

const FIELD_LABEL = {
  id: "Id",
  name: "Név",
  kind: "Réteg",
  last_forecast: "Utolsó forecast",
  last_obs: "Utolsó tény",
  forecast_rows: "Fc sor",
  obs_rows: "Órás sor",
  last_error: "Hiba",
  provider: "Forrás",
  label: "Név",
  products: "Termékek",
  rows: "Sorok",
  last_issued: "Utolsó adat",
  started_at: "Kezdés",
  finished_at: "Vége",
  slot: "Slot",
  status: "Státusz",
  duration_s: "Idő (s)",
  duration_ms: "Idő (ms)",
  ok_n: "Ok",
  error_n: "Hiba db",
  error: "Hiba",
  job: "Job",
  fetched_at: "Idő",
  ok: "Ok",
  n_stations: "Állomás",
  n_vehicles: "Jármű",
  last_ok_at: "Utolsó siker",
  ok_last_24h: "Ok 24ó",
  fail_last_24h: "Fail 24ó",
  forecast_n: "Forecast",
  obs_n: "Megfigyelés",
  daily_n: "Napi aggregátum",
  n_locations: "Helyek",
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadJSON(path) {
  const res = await fetch(`data/${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${path} (${res.status})`);
  }
  return res.json();
}

function isForbiddenKey(key) {
  return FORBIDDEN_KEY.test(String(key));
}

function isForbiddenValue(value) {
  if (value == null) return false;
  if (typeof value === "number" || typeof value === "boolean") return false;
  return FORBIDDEN_VALUE.test(String(value));
}

function sanitizeRecord(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isForbiddenKey(key) || isForbiddenValue(value)) continue;
    if (value && typeof value === "object") continue;
    out[key] = value;
  }
  return out;
}

function formatTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  if (sec < 45) return "épp most";
  if (sec < 3600) return `${Math.round(sec / 60)} perce`;
  if (sec < 86400) return `${Math.round(sec / 3600)} órája`;
  const days = Math.round(sec / 86400);
  return days === 1 ? "1 napja" : `${days} napja`;
}

function formatMb(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const value = Number(n);
  const digits = value < 10 ? 1 : 0;
  return `${new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)} MB`;
}

function formatPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(n)}%`;
}

function formatRatio(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("hu-HU", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatGb(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(n)} GB`;
}

function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("hu-HU").format(n);
}

function formatValue(key, value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "igen" : "nem";
  if (typeof value === "number") {
    if (key === "ok_last_24h") return formatRatio(value);
    if (key.endsWith("_mb")) return formatMb(value);
    if (key.endsWith("_pct")) return formatPct(value);
    return formatNumber(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatTime(value);
  }
  if (HEALTH_LABEL[value]) return HEALTH_LABEL[value];
  return String(value);
}

function healthClass(health) {
  return HEALTH_LABEL[health] ? health : "unknown";
}

function pill(health) {
  const cls = healthClass(health);
  return `<span class="pill ${escapeHtml(cls)}">${escapeHtml(HEALTH_LABEL[cls])}</span>`;
}

function showError(message) {
  const el = $("error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
}

function showBanner(text) {
  const el = $("banner");
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
}

function setTitle(title) {
  document.title = title;
}

function labelFor(key) {
  return NOTE_LABEL[key] || FIELD_LABEL[key] || key.replaceAll("_", " ");
}

const CARD_NOTE_KEYS = [
  "last_forecast_status",
  "last_obs_status",
  "n_locations",
  "n_stations",
  "n_vehicles",
];
