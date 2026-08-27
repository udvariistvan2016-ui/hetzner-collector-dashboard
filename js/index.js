function renderHost(host) {
  const used = Number(host.used_pct);
  const cls = used >= 90 ? "bad" : used >= 75 ? "warn" : "";
  $("host").innerHTML = `
    <div class="host-pct">
      <span>Lemez</span>
      ${escapeHtml(formatPct(host.used_pct))}
    </div>
    <div class="host-meta">
      <p>Szabad: <b>${escapeHtml(formatGb(host.avail_gb))}</b></p>
      <div class="meter ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${escapeHtml(String(used || 0))}"
           aria-label="Lemez foglaltság">
        <i style="width: ${Math.min(100, Math.max(0, used || 0))}%"></i>
      </div>
      <p style="margin-top:0.55rem">Tükör: ${escapeHtml(formatTime(host.updated_at))}
        · ${escapeHtml(formatRelative(host.updated_at))}</p>
    </div>
  `;
}

function renderCard(status) {
  const health = healthClass(status.health);
  const notes = sanitizeRecord(status.notes || {});
  const extra = CARD_NOTE_KEYS.filter((key) => notes[key] != null && notes[key] !== "")
    .map((key) => `${labelFor(key)}: ${formatValue(key, notes[key])}`)
    .join(" · ");
  const service = status.service || {};
  return `
    <a class="card health-${escapeHtml(health)}" href="project.html?id=${encodeURIComponent(status.id)}">
      ${pill(health)}
      <h2>${escapeHtml(status.name || status.id)}</h2>
      <dl class="dl">
        <dt>Utolsó siker</dt>
        <dd>${escapeHtml(formatRelative(status.last_ok_at))}</dd>
        <dt>Hely</dt>
        <dd>${escapeHtml(formatMb(status.disk && status.disk.project_mb))}</dd>
        <dt>Szolgáltatás</dt>
        <dd>${escapeHtml(KIND_LABEL[service.kind] || service.kind || "—")}
          · ${escapeHtml(STATE_LABEL[service.state] || service.state || "—")}</dd>
        <dt>Ok 24ó</dt>
        <dd>${escapeHtml(formatRatio(status.ok_last_24h))}</dd>
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
