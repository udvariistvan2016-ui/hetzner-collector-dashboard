const SKIP_DETAIL_KEYS = new Set([
  "schema_version",
  "id",
  "updated_at",
  "sample",
  "activity",
]);

function renderSummary(status) {
  const disk = status.disk || {};
  const service = status.service || {};
  const activity = status.activity || {};
  const notes = sanitizeRecord(status.notes || {});
  const unit = activityUnit(activity);
  const stats = [
    ["Állapot", HEALTH_LABEL[healthClass(status.health)]],
    ["Utolsó siker", formatTime(status.last_ok_at)],
    [`24ó (${unit})`, `${formatActivityCounts(activity.ok_24h, activity.fail_24h)} · ${formatRatio(status.ok_last_24h)}`],
    ["Összesen", formatActivityCounts(activity.ok_ever, activity.fail_ever)],
    ["Project", formatMb(disk.project_mb)],
    ["SQLite", formatMb(disk.sqlite_mb)],
    ["Nyers", formatMb(disk.raw_mb)],
    ["Szolgáltatás", `${KIND_LABEL[service.kind] || service.kind || "—"} · ${STATE_LABEL[service.state] || service.state || "—"}`],
  ];
  const noteRows = Object.entries(notes)
    .map(
      ([key, value]) =>
        `<div class="stat"><span>${escapeHtml(labelFor(key))}</span><b>${escapeHtml(formatValue(key, value))}</b></div>`
    )
    .join("");
  $("summary").innerHTML = `
    <div class="stats">
      ${stats
        .map(
          ([label, value]) =>
            `<div class="stat"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
        )
        .join("")}
      ${noteRows}
    </div>
    ${
      status.last_error
        ? `<p class="error">${escapeHtml(status.last_error)}</p>`
        : ""
    }
  `;
}

function isScalar(value) {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function scalarObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(isScalar);
}

function arrayOfObjects(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => item && typeof item === "object" && !Array.isArray(item));
}

function renderDl(obj) {
  const rows = Object.entries(sanitizeRecord(obj))
    .map(
      ([key, value]) =>
        `<dt>${escapeHtml(labelFor(key))}</dt><dd>${escapeHtml(formatValue(key, value))}</dd>`
    )
    .join("");
  return rows ? `<dl class="dl">${rows}</dl>` : "";
}

function columnKeys(rows) {
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (isForbiddenKey(key) || SKIP_DETAIL_KEYS.has(key)) continue;
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

function renderTable(rows) {
  const keys = columnKeys(rows);
  if (!keys.length) return "";
  const numeric = new Set(
    keys.filter((key) =>
      rows.some((row) => typeof row[key] === "number")
    )
  );
  const head = keys
    .map((key) => `<th>${escapeHtml(labelFor(key))}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const cells = keys
        .map((key) => {
          const raw = row[key];
          if (isForbiddenValue(raw)) {
            return `<td>—</td>`;
          }
          const cls = numeric.has(key) ? " class=\"num\"" : "";
          let display = formatValue(key, raw);
          if (key === "status" || key === "ok") {
            const health =
              raw === true || raw === "ok"
                ? "ok"
                : raw === false || raw === "error"
                  ? "down"
                  : raw === "partial"
                    ? "degraded"
                    : "unknown";
            display = HEALTH_LABEL[health] && (key === "status" || typeof raw === "boolean")
              ? (typeof raw === "boolean" ? (raw ? "igen" : "nem") : display)
              : display;
            const pillCls =
              raw === true || raw === "ok"
                ? "ok"
                : raw === false || raw === "error"
                  ? "down"
                  : raw === "partial"
                    ? "degraded"
                    : "";
            if (pillCls && key === "status") {
              return `<td><span class="pill ${pillCls}">${escapeHtml(String(raw))}</span></td>`;
            }
          }
          return `<td${cls}>${escapeHtml(display)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function sectionTitle(key) {
  const titles = {
    counts: "Számok",
    locations: "Helyek",
    sources: "Források",
    runs: "Futások",
    jobs: "Jobok",
    recent_polls: "Utolsó pollok",
  };
  return titles[key] || key.replaceAll("_", " ");
}

function renderJobs(jobs) {
  return Object.entries(jobs)
    .map(([name, data]) => {
      if (!data || typeof data !== "object") return "";
      return `<h3 style="font-size:1rem;margin:0.8rem 0 0.4rem">${escapeHtml(name)}</h3>${renderDl(data)}`;
    })
    .join("");
}

function renderDetail(detail) {
  const blocks = [];
  for (const [key, value] of Object.entries(detail)) {
    if (SKIP_DETAIL_KEYS.has(key) || isForbiddenKey(key)) continue;
    if (key === "timezone" && typeof value === "string") {
      blocks.push(
        `<div class="block"><p class="muted" style="margin:0">Időzóna a gyűjtőben: ${escapeHtml(value)} (a táblák UTC-ből Budapest szerint).</p></div>`
      );
      continue;
    }
    if (key === "jobs" && value && typeof value === "object" && !Array.isArray(value)) {
      blocks.push(`<div class="block"><h2>${escapeHtml(sectionTitle(key))}</h2>${renderJobs(value)}</div>`);
      continue;
    }
    if (arrayOfObjects(value)) {
      const rows = value.map((row) => {
        const clean = {};
        for (const [k, v] of Object.entries(row)) {
          if (isForbiddenKey(k) || isForbiddenValue(v) || (v && typeof v === "object")) continue;
          clean[k] = v;
        }
        return clean;
      });
      blocks.push(
        `<div class="block"><h2>${escapeHtml(sectionTitle(key))}</h2>${renderTable(rows)}</div>`
      );
      continue;
    }
    if (scalarObject(value)) {
      blocks.push(
        `<div class="block"><h2>${escapeHtml(sectionTitle(key))}</h2>${renderDl(value)}</div>`
      );
    }
  }
  $("detail").innerHTML = blocks.join("") || `<p class="muted">Nincs részletező adat.</p>`;
}

async function main() {
  const id = new URLSearchParams(location.search).get("id") || "";
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    showError("Hiányzó vagy hibás project-id.");
    return;
  }
  try {
    const [status, detail, host] = await Promise.all([
      loadJSON(`${id}/status.json`),
      loadJSON(`${id}/detail.json`).catch(() => null),
      loadJSON("host.json").catch(() => ({})),
    ]);
    if (host.sample) {
      showBanner("Mintadat — a VPS még nem tölti a tükröt.");
    }
    const name = status.name || id;
    $("title").textContent = name;
    $("lede").textContent = `Frissítve ${formatTime(status.updated_at)} · ${formatRelative(status.updated_at)}`;
    setTitle(`${name} — gyűjtő`);
    renderSummary(status);
    if (detail) renderDetail(detail);
    else $("detail").innerHTML = `<p class="muted">Nincs detail.json.</p>`;
  } catch (err) {
    showError(`Nem olvasható a project JSON (${err.message}).`);
  }
}

main();
