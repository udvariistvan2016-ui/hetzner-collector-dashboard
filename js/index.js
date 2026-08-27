function renderHost(host) {
  const used = Number(host.used_pct);
  const mem = host.mem_used_pct == null ? null : Number(host.mem_used_pct);
  const cls = used >= 90 ? "bad" : used >= 75 ? "warn" : "";
  const memCls = mem == null ? "" : mem >= 90 ? "bad" : mem >= 75 ? "warn" : "";
  const extras = [];
  if (host.cpu_pct != null) extras.push(`CPU ${formatPct(host.cpu_pct)}`);
  if (host.load_1 != null) extras.push(`load ${formatLoad(host.load_1)}`);
  if (host.net_rx_mb_24h != null || host.net_tx_mb_24h != null) {
    extras.push(
      `háló 24ó ↓${formatMb(host.net_rx_mb_24h)} ↑${formatMb(host.net_tx_mb_24h)}`
    );
  }
  const ramBlock =
    mem == null
      ? ""
      : `<div class="host-pct">
      <span>RAM</span>
      ${escapeHtml(formatPct(mem))}
    </div>`;
  $("host").innerHTML = `
    <div class="host-pct">
      <span>Lemez</span>
      ${escapeHtml(formatPct(host.used_pct))}
    </div>
    ${ramBlock}
    <div class="host-meta">
      <p>Szabad lemez: <b>${escapeHtml(formatGb(host.avail_gb))}</b></p>
      <div class="meter ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${escapeHtml(String(used || 0))}"
           aria-label="Lemez foglaltság">
        <i style="width: ${Math.min(100, Math.max(0, used || 0))}%"></i>
      </div>
      ${
        mem == null
          ? ""
          : `<div class="meter ${memCls}" style="margin-top:0.45rem" role="meter" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${escapeHtml(String(mem))}"
           aria-label="RAM foglaltság">
        <i style="width: ${Math.min(100, Math.max(0, mem))}%"></i>
      </div>`
      }
      ${
        extras.length
          ? `<p class="host-extras">${escapeHtml(extras.join(" · "))}</p>`
          : ""
      }
      <p style="margin-top:0.55rem">Tükör: ${escapeHtml(formatTime(host.updated_at))}
        · ${escapeHtml(formatRelative(host.updated_at))} · 2 óránként</p>
    </div>
  `;
  $("host").classList.toggle("has-ram", mem != null);
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
