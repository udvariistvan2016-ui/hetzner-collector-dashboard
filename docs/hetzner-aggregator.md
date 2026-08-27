# Host-aggregátor (VPS) — váz

Ez a dashboard repo **nem** futtatja a gyűjtőket, és **nem** clone-olja a collect-repókat. A Hetzneren egy külön, ritkán futó folyamat (15–30 perc) összeszedi a kész JSON-t, és a `data/` alá pusholja.

A forrásútvonalak, OS user, hostnév, IP, SSH alias **ne** kerüljenek ebbe a publikus repóba. Az aggregátor configja maradjon a szerveren.

## Mit csinál

1. Lemez: `used_pct`, `avail_gb` → `data/host.json`. Nincs hostnév, nincs IP.
   Opcionális: `load_1`, `cpu_pct` (rövid `/proc/stat` mintavétel), `net_rx_mb_24h` / `net_tx_mb_24h` (helyi számláló-állapot a VPS-en, nem gitben). Projectenkénti CPU/sáv nem kell az első körben.
2. Ismert projectek (szerveroldali lista, pl. `weather`, `bubi`):
   - bemásolja a gyűjtő `status.json` és `detail.json` fájlját → `data/<id>/`
   - opcionálisan felülírja a `service.state` mezőt (systemd: `active` / `inactive`; cron: ha van ellenőrzés, különben `unknown`)
3. Frissíti a `data/projects.json` id-listáját.
4. Szűrés: kidob minden tiltott kulcsot / értéket (útvonal, IP, hostnév) — lásd [status-schema.md](status-schema.md).
5. Git: csak `data/` változik. Ha nincs diff, nincs commit. Push a `main`re (Pages Actions újraépít).

Ne percenként commitolj. 15–30 perc elég opsra.

## Mit nem csinál

- Nem generál HTML-t (a site statikus ebben a repóban).
- Nem másolja a Bubi `viz/index.html` térképet, sem a weather `data/dashboard.html` futásnaplót.
- Nem tölti fel a SQLite-ot, nyers gzip feedet, teljes `map_data.json`-t.
- Nem nyúl a collect-repók kódjához.

## Szerveroldali config (példa, ne commitold)

```json
{
  "interval_minutes": 20,
  "projects": [
    { "id": "weather", "status_dir": "<a gyűjtő status könyvtára>" },
    { "id": "bubi", "status_dir": "<a gyűjtő status könyvtára>" }
  ],
  "units": {
    "bubi": "bubi-collector"
  }
}
```

A `status_dir` értéke csak a VPS-en él. A gyűjtők a saját sessionjeikben írják a JSON-t (weather: collect/dashboard után; Bubi: olcsó, a loopot nem lassító írás).

## Git push

- Deploy key vagy finomhangolt token **csak a szerveren**, write a dashboard repóra. Nem a weathercollect kulcsa.
- `git add data && git diff --quiet --cached || git commit -m "..."`
- Commit üzenet: rövid, pl. `status: tükör YYYY-MM-DD HH:MM UTC`
- Force-push nem kell, ha csak a JSON cserélődik. A történet szándékosan ritka.

## Health vs. service.state

A `health`-et a gyűjtő számolja a saját adataiból. Az aggregátor a `service.state`-et töltheti (systemd `is-active`). A kettő szándékosan külön: a unit futhat, miközben a last_ok régi (`degraded` / `down`).

## Következő lépés

Ha a séma ebben a repóban stabil: weathercollect és bubi-collector JSON-írás, aztán az aggregátor implementáció a VPS-en. Ez a fájl csak a szerződés.
