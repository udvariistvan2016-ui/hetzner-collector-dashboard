# Host-aggregátor (VPS) — váz

Ez a dashboard repo **nem** futtatja a gyűjtőket, és **nem** clone-olja a collect-repókat. A Hetzneren egy külön folyamat **2 óránként** összeszedi a kész JSON-t, és a `data/` alá pusholja.

A forrásútvonalak, OS user, hostnév, IP, SSH alias **ne** kerüljenek ebbe a publikus repóba. Az aggregátor configja maradjon a szerveren.

## Mit csinál

1. Gép → `data/host.json`. Nincs hostnév, IP, load average, API token, szerver-id.
   - `capacity`: vCPU / RAM GiB / lemez GiB
   - `disk`: pillanatnyi foglaltság a **push** idején (vendég `df`; a Hetzner metrics nem fájlrendszer-telítettség)
   - **CPU 24ó/ever:** Hetzner `GET /servers/{id}/metrics?type=cpu` (~60 s). Ne 5 percenként mintázzunk a vendégben.
   - **RAM:** a Hetzner API **nem** adja. Nincs syslog-történet. Vagy (a) mostani `MemAvailable` + cgroup `memory.peak` az `ever.max`-hoz, vagy (b) 10–15 s-es helyi ciklus, ami **csak** futó min/max/összeg/db-ot tart (nem idősort). 5 perc RAM-maxnak hazugság.
   - `net`: Hetzner `network` metrics (24 ó integrálható) vagy `/proc/net/dev` helyi számláló
   - `sampled_since`: RAM-minta vagy peak-figyelés kezdete; CPU-nál a metrics-lekérés ablakáé
2. Ismert projectek (szerveroldali lista, pl. `weather`, `bubi`):
   - bemásolja a gyűjtő `status.json` és `detail.json` fájlját → `data/<id>/`
   - opcionálisan felülírja a `service.state` mezőt (systemd: `active` / `inactive`; cron: ha van ellenőrzés, különben `unknown`)
3. Frissíti a `data/projects.json` id-listáját.
4. Szűrés: kidob minden tiltott kulcsot / értéket (útvonal, IP, hostnév) — lásd [status-schema.md](status-schema.md).
5. Git: csak `data/` változik. Ha nincs diff, nincs commit. Push a `main`re (Pages Actions újraépít).

Ne percenként commitolj. **2 óra** a tükör ritmusa.

## Mit nem csinál

- Nem generál HTML-t (a site statikus ebben a repóban).
- Nem másolja a Bubi `viz/index.html` térképet, sem a weather `data/dashboard.html` futásnaplót.
- Nem tölti fel a SQLite-ot, nyers gzip feedet, teljes `map_data.json`-t.
- Nem nyúl a collect-repók kódjához.

## Szerveroldali config (példa, ne commitold)

```json
{
  "interval_minutes": 120,
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
