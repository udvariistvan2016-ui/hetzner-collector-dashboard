function rangeCells(block) {
  if (!block) return ["—", "—", "—"];
  return [formatPct(block.min), formatPct(block.max), formatPct(block.avg)];
}

function renderRangeTable(series) {
  const h24 = rangeCells(series && series.h24);
  const ever = rangeCells(series && series.ever);
  return `
    <table class="range">
      <thead>
        <tr><th></th><th>min</th><th>max</th><th>átlag</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">24 ó</th><td>${escapeHtml(h24[0])}</td><td>${escapeHtml(h24[1])}</td><td>${escapeHtml(h24[2])}</td></tr>
        <tr><th scope="row">Mérések óta</th><td>${escapeHtml(ever[0])}</td><td>${escapeHtml(ever[1])}</td><td>${escapeHtml(ever[2])}</td></tr>
      </tbody>
    </table>
  `;
}

function renderMeter(pct, label) {
  const n = Number(pct);
  const width = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  return `
    <div class="meter ${meterClass(n)}" role="meter" aria-valuemin="0" aria-valuemax="100"
         aria-valuenow="${escapeHtml(String(Number.isFinite(n) ? n : 0))}"
         aria-label="${escapeHtml(label)}">
      <i style="width: ${width}%"></i>
    </div>
  `;
}

function seriesCaption(series, kind) {
  const src =
    series.source === "hetzner"
      ? "Hetzner hipervizor"
      : series.source === "guest"
        ? "vendég OS"
        : "";
  const step = Number(series.step_s);
  let grain = "";
  if (Number.isFinite(step) && step > 0) {
    grain =
      step < 60
        ? `${step} s-es helyi csúcsfigyelés`
        : `~${Math.round(step / 60)} perces pontok`;
  }
  const last = `utolsó pont ${formatPct(series.last)}`;
  if (kind === "cpu") {
    return [src, grain, last, "1–2 s spike kimaradhat"].filter(Boolean).join(" · ");
  }
  return [src, grain, last].filter(Boolean).join(" · ");
}

function renderHost(host) {
  const cap = host.capacity || {};
  const disk = host.disk || {};
  const cpu = host.cpu_pct || {};
  const mem = host.mem_pct || {};
  const net = host.net || {};
  const since = host.sampled_since
    ? `Mérések kezdete: ${formatTime(host.sampled_since)}`
    : "";
  $("host").innerHTML = `
    <header class="host-cap">
      <h2>Bérelt kapacitás</h2>
      <p class="host-cap-line">
        <b>${escapeHtml(formatNumber(cap.cpu_cores))}</b> vCPU
        <span aria-hidden="true">·</span>
        <b>${escapeHtml(formatGb(cap.ram_gb))}</b> RAM
        <span aria-hidden="true">·</span>
        <b>${escapeHtml(formatGb(cap.disk_gb))}</b> lemez
      </p>
      <p class="muted">Tükör: ${escapeHtml(formatTime(host.updated_at))}
        · ${escapeHtml(formatRelative(host.updated_at))} · 2 óránként
        ${since ? ` · ${escapeHtml(since)}` : ""}</p>
    </header>
    <div class="host-grid">
      <article class="host-panel">
        <h3>Lemez most</h3>
        <p class="host-now">${escapeHtml(formatPct(disk.used_pct))}</p>
        ${renderMeter(disk.used_pct, "Lemez foglaltság")}
        <p class="muted">Szabad ${escapeHtml(formatGb(disk.avail_gb))}
          ${cap.disk_gb != null ? ` / ${escapeHtml(formatGb(cap.disk_gb))} keret` : ""}</p>
      </article>
      <article class="host-panel">
        <h3>CPU</h3>
        <p class="muted">${escapeHtml(seriesCaption(cpu, "cpu"))}</p>
        ${renderRangeTable(cpu)}
      </article>
      <article class="host-panel">
        <h3>RAM</h3>
        <p class="muted">${escapeHtml(seriesCaption(mem, "mem"))}
          ${cap.ram_gb != null ? ` · keret ${escapeHtml(formatGb(cap.ram_gb))}` : ""}</p>
        ${renderRangeTable(mem)}
      </article>
    </div>
    ${
      net.rx_mb_24h != null || net.tx_mb_24h != null
        ? `<p class="host-net">Háló 24 ó · be ${escapeHtml(formatMb(net.rx_mb_24h))} · ki ${escapeHtml(formatMb(net.tx_mb_24h))}</p>`
        : ""
    }
  `;
}

function renderCard(status) {
  const health = healthClass(status.health);
  const notes = sanitizeRecord(status.notes || {});
  const extra = CARD_NOTE_KEYS.filter((key) => notes[key] != null && notes[key] !== "")
    .map((key) => `${labelFor(key)}: ${formatValue(key, notes[key])}`)
    .join(" · ");
  const service = status.service || {};
  const activity = status.activity || {};
  const unit = activityUnit(activity);
  return `
    <a class="card health-${escapeHtml(health)}" href="project.html?id=${encodeURIComponent(status.id)}">
      ${pill(health)}
      <h2>${escapeHtml(status.name || status.id)}</h2>
      <dl class="dl">
        <dt>Utolsó siker</dt>
        <dd>${escapeHtml(formatRelative(status.last_ok_at))}</dd>
        <dt>24ó (${escapeHtml(unit)})</dt>
        <dd>${escapeHtml(formatActivityCounts(activity.ok_24h, activity.fail_24h))}
          · ${escapeHtml(formatRatio(status.ok_last_24h))}</dd>
        <dt>Összesen</dt>
        <dd>${escapeHtml(formatActivityCounts(activity.ok_ever, activity.fail_ever))}</dd>
        <dt>Hely</dt>
        <dd>${escapeHtml(formatMb(status.disk && status.disk.project_mb))}</dd>
        <dt>Szolgáltatás</dt>
        <dd>${escapeHtml(KIND_LABEL[service.kind] || service.kind || "—")}
          · ${escapeHtml(STATE_LABEL[service.state] || service.state || "—")}</dd>
      </dl>
      ${extra ? `<p class="muted" style="margin:0.75rem 0 0;font-size:0.88rem">${escapeHtml(extra)}</p>` : ""}
    </a>
  `;
}

async function main() {
  try {
    const [host, catalog] = await Promise.all([
      loadJSON("host.json"),
      loadJSON("projects.json"),
    ]);
    if (host.sample || catalog.sample) {
      showBanner("Mintadat — a VPS még nem tölti a tükröt. A kártyák a repo példájából épülnek.");
    } else {
      const ageMs = Date.now() - new Date(host.updated_at).getTime();
      if (Number.isFinite(ageMs) && ageMs > 6 * 3600 * 1000) {
        showBanner("A tükör több mint 6 órája nem frissült — a gyűjtő ettől még futhat.");
      }
    }
    renderHost(host);
    const ids = Array.isArray(catalog.projects) ? catalog.projects : [];
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await loadJSON(`${id}/status.json`);
        } catch (err) {
          return {
            schema_version: 1,
            id,
            name: id,
            health: "unknown",
            service: { kind: "cron", name: id, state: "unknown" },
            last_ok_at: null,
            last_error: String(err.message || err),
            ok_last_24h: null,
            activity: { kind: "run", ok_24h: null, fail_24h: null, ok_ever: null, fail_ever: null },
            disk: { project_mb: 0, sqlite_mb: 0, raw_mb: 0 },
            notes: {},
          };
        }
      })
    );
    $("projects").innerHTML = results.map(renderCard).join("");
  } catch (err) {
    showError(
      `A JSON nem tölthető (${err.message}). Nyisd HTTP-n, ne fájlként: python -m http.server 8080`
    );
  }
}

main();
