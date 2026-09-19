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
const ACTIVITY_KIND_LABEL = { run: "futás", poll: "lekérés" };

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
  phase: "Fázis",
  route: "Útvonal",
  source: "Forrás",
  chains: "Láncok",
  ok_24h: "Ok 24ó",
  fail_24h: "Hiba 24ó",
  ok_ever: "Ok összesen",
  fail_ever: "Hiba összesen",
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
  total_mb: "Könyvtár összesen",
  data_mb: "Gyűjtött adat",
  project_mb: "Gyűjtött adat",
  projects_gb: "Kártyákon",
  data_gb: "ebből adat",
  other_gb: "A többi",
  sqlite_mb: "SQLite",
  raw_mb: "Nyers",
  fs_gb: "Fájlrendszer",
  used_gb: "Foglalt",
  avail_gb: "Szabad",
  used_pct: "Foglaltság",
  phase: "Fázis",
  route: "Útvonal",
  source: "Forrás",
  chains: "Láncok",
  horizon_days: "Horizont (nap)",
  forras: "Forrás",
  mit: "Mit",
  hol: "Hol",
  nem_ide: "Nem ide",
  status_json: "Status JSON",
  horizon: "Ritmus",
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

function activityUnit(activity) {
  return ACTIVITY_KIND_LABEL[(activity && activity.kind) || ""] || "esemény";
}

function formatActivityCounts(ok, fail) {
  if (ok == null && fail == null) return "—";
  return `${formatNumber(ok || 0)} ok / ${formatNumber(fail || 0)} hiba`;
}

function meterClass(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "";
  if (n >= 90) return "bad";
  if (n >= 75) return "warn";
  return "";
}

function formatValue(key, value) {
  if (value == null || value === "") return "—";
  if (key === "phase") {
    if (value === "planned") return "előkészítés";
    if (value === "setup") return "beüzemelés";
  }
  if (typeof value === "boolean") return value ? "igen" : "nem";
  if (typeof value === "number") {
    if (key === "ok_last_24h") return formatRatio(value);
    if (key.includes("_mb")) return formatMb(value);
    if (key.endsWith("_pct") || key === "last" || key === "min" || key === "max" || key === "avg") {
      return formatPct(value);
    }
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

function filesystemGb(host) {
  const disk = (host && host.disk) || {};
  const stated = Number(disk.fs_gb);
  if (Number.isFinite(stated) && stated > 0) return stated;
  const avail = Number(disk.avail_gb);
  const pct = Number(disk.used_pct);
  if (Number.isFinite(avail) && Number.isFinite(pct) && pct >= 0 && pct < 100) {
    return avail / (1 - pct / 100);
  }
  return null;
}

function dataMb(disk) {
  if (!disk) return null;
  if (disk.data_mb != null) return disk.data_mb;
  return disk.project_mb;
}

function totalMb(disk) {
  if (!disk) return null;
  if (disk.total_mb != null) return disk.total_mb;
  return null;
}

function mbToGb(mb) {
  const n = Number(mb);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1024) * 10) / 10;
}

function distinctTotalMb(disk) {
  const total = totalMb(disk);
  const data = dataMb(disk);
  if (total == null || data == null) return total;
  if (Math.abs(Number(total) - Number(data)) < 1) return null;
  return total;
}

function diskBreakdown(host, statuses) {
  const disk = (host && host.disk) || {};
  const fsGb = filesystemGb(host);
  const usedGb = Number.isFinite(Number(disk.used_gb))
    ? Number(disk.used_gb)
    : fsGb != null && disk.avail_gb != null
      ? fsGb - Number(disk.avail_gb)
      : null;
  let projectsGb = Number(disk.projects_gb);
  let dataGb = Number(disk.data_gb);
  let otherGb = Number(disk.other_gb);
  if (!Number.isFinite(projectsGb) && Array.isArray(statuses)) {
    let dataMbSum = 0;
    let totalMbSum = 0;
    for (const status of statuses) {
      const part = (status && status.disk) || {};
      const data = Number(dataMb(part));
      const total = Number(totalMb(part));
      const dataN = Number.isFinite(data) ? data : 0;
      dataMbSum += dataN;
      totalMbSum += Number.isFinite(total) ? total : dataN;
    }
    projectsGb = mbToGb(totalMbSum);
    dataGb = mbToGb(dataMbSum);
  }
  if (!Number.isFinite(dataGb)) dataGb = projectsGb;
  if (!Number.isFinite(otherGb) && usedGb != null && Number.isFinite(projectsGb)) {
    otherGb = Math.round(Math.max(0, usedGb - projectsGb) * 10) / 10;
  }
  return {
    fsGb,
    usedGb,
    projectsGb: Number.isFinite(projectsGb) ? projectsGb : null,
    dataGb: Number.isFinite(dataGb) ? dataGb : null,
    otherGb: Number.isFinite(otherGb) ? otherGb : null,
  };
}

function isPlanned(status) {
  const notes = (status && status.notes) || {};
  return notes.phase === "planned" || notes.phase === "setup";
}

const CARD_NOTE_KEYS = [
  "last_forecast_status",
  "last_obs_status",
  "n_locations",
  "n_stations",
  "n_vehicles",
  "route",
  "source",
  "chains",
];
