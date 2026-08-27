# Status JSON kontrakt — `schema_version`: 1

A publikus GitHub Pages dashboard **csak JSON-t** olvas. A gyűjtők HTML-t nem adnak ide. A Hetzner később a `data/` fájlokat tölti; ez a repo a UI, a séma és a mintadat.

Minden időbélyeg **ISO-8601 UTC**, `Z` végződéssel (példa: `2026-08-27T08:20:00Z`). A böngésző Budapest szerint formáz.

## Könyvtár a Pagesen

```
data/
  host.json              gépösszesítő (lemez)
  projects.json          ismert project-id-k listája
  <id>/status.json       közös kártya-kontrakt
  <id>/detail.json       project-specifikus al-lap
```

`<id>`: kisbetű, szám, kötőjel (`^[a-z0-9-]+$`). Első kettő: `weather`, `bubi`.

## Tilos a publikus JSON-ban

Ezek **se** `status.json`-ban, **se** `detail.json`-ban, **se** `host.json`-ban:

- hostnév, IP, SSH alias, OS user
- abszolút útvonal (`/opt/...`, `C:\...`)
- titok, token, `.env`, connection string
- nyers SQLite / dump
- teljes térkép- vagy állomáslista (darabszám rendben)
- nyers log; a `last_error` rövid, emberi összefoglaló (irányadó max. ~200 karakter)

## `data/host.json`

| Mező | Típus | Kötelező | Jelentés |
|---|---|---|---|
| `schema_version` | `1` | igen | kontrakt verzió |
| `updated_at` | string (UTC) | igen | mikor készült a tükör |
| `used_pct` | number | igen | gyökér- (vagy adat-) kötet foglaltsága, 0–100 |
| `avail_gb` | number | igen | szabad hely, GiB |
| `mem_used_pct` | number | nem | RAM foglaltság 0–100 (`MemAvailable` alapján) |
| `load_1` | number | nem | 1 perces load average |
| `cpu_pct` | number | nem | CPU foglaltság 0–100, a mintavétel környékén |
| `net_rx_mb_24h` | number | nem | bejövő forgalom, MB / 24 ó |
| `net_tx_mb_24h` | number | nem | kimenő forgalom, MB / 24 ó |
| `sample` | boolean | nem | `true`: mintadat, még nem a VPS |

Sem hostnév, sem IP. A CPU, a RAM és a sáv **gépszintű** (nem projectenként). A tükör **2 óránként** frissül; a 24 órás forgalomhoz az aggregátornak kell egy kis helyi állapotfájl a VPS-en (számláló-különbség), ez nem megy a Pagesre.

## `data/projects.json`

| Mező | Típus | Kötelező | Jelentés |
|---|---|---|---|
| `schema_version` | `1` | igen | |
| `updated_at` | string (UTC) | igen | |
| `projects` | string[] | igen | id-k, kártyasorrend |
| `sample` | boolean | nem | mintadat |

Az emberi név a `status.json` `name` mezőjéből jön. Új gyűjtő: új id a listában + `data/<id>/`.

## Közös `status.json`

Minden gyűjtő ugyanezt a vázat írja. Gép-specifikus mező (`service.state`) jöhet a gyűjtőtől `unknown`-nal; a host-aggregátor felülírhatja systemd/cron alapján.

| Mező | Típus | Kötelező |
|---|---|---|
| `schema_version` | `1` | igen |
| `id` | string | igen, egyezzen a mappa nevével |
| `name` | string | igen, kártyacím |
| `updated_at` | string (UTC) | igen |
| `health` | `ok` \| `degraded` \| `down` \| `unknown` | igen |
| `service` | object | igen |
| `last_ok_at` | string (UTC) \| `null` | igen |
| `last_error` | string \| `null` | igen |
| `ok_last_24h` | number 0–1 \| `null` | igen |
| `activity` | object | igen |
| `disk` | object | igen |
| `notes` | object | igen, lehet `{}` |

### `service`

| Mező | Típus | Értékek |
|---|---|---|
| `kind` | string | `systemd` \| `cron` |
| `name` | string | unit vagy cron-job rövid neve (nem útvonal) |
| `state` | string | `active` \| `inactive` \| `unknown` |

Cronos gyűjtőnél a `state` gyakran `unknown`, amíg az aggregátor nem ellenőrzi a crontabot. Systemd-nél az aggregátor tipikusan `active` / `inactive`.

### `activity`

A kártya „rendben fut-e” száma. Nem adat-sor, hanem **esemény**: weather = ingest futás (`run`), Bubi = poll (`poll`). `partial` / `error` → `fail_*`.

| Mező | Típus | Jelentés |
|---|---|---|
| `kind` | `run` \| `poll` | mi a számolt egység |
| `ok_24h` | integer \| `null` | sikeres esemény az elmúlt 24 órában |
| `fail_24h` | integer \| `null` | hibás / részleges az elmúlt 24 órában |
| `ok_ever` | integer \| `null` | sikeres esemény a tárolt történetben |
| `fail_ever` | integer \| `null` | hibás / részleges összesen |

Az `ok_last_24h` arány: `ok_24h / (ok_24h + fail_24h)`, ha van nevező. A `health` a **mostani** állapotról szól (last_ok ablak); a 24 órás számok ettől eltérhetnek (volt egy esti partial, de az utolsó forecast+obs már ok).

### `disk`

Számok **megabyte**-ban (nem bájt). Hiányzó rész legyen `0`, ne `null`.

| Mező | Jelentés |
|---|---|
| `project_mb` | a project adatkönyvtára összesen (sqlite + nyers + egyéb) |
| `sqlite_mb` | adatbázis fájl(ok) |
| `raw_mb` | nyers mentés (gzip JSON stb.) |

### `health` (ajánlás a gyűjtőknek)

A dashboard **nem** számolja újra, csak megjeleníti.

| Érték | Mikor |
|---|---|
| `ok` | a szokásos ablakban volt sikeres futás |
| `degraded` | részleges siker, keverék, vagy a késés a „még épp tűrhető” sávban |
| `down` | a szokásos ablakon túl nincs siker, vagy az utolsó releváns futás hibás |
| `unknown` | nincs elég adat |

Weather (cron, forecast ~12 ó, obs naponta): last forecast+obs mind `ok` → `ok`; partial/keverék → `degraded`; error, vagy forecast régebbi mint ~20 óra → `down`.

Bubi (folytonos poll): ok poll ~10 percen belül → `ok`; 10–30 perc vagy közeli fail → `degraded`; >30 perc nincs ok → `down`.

### `notes`

Kicsi, kártyára való skalárok: number, string, boolean vagy `null`. Nincs mélyen ágyazott objektum, nincs tömb. A főoldal néhány ismert kulcsot kiemel; a többi az al-lapon látszik.

**Weather** (példa kulcsok):

| Kulcs | Jelentés |
|---|---|
| `n_locations` | helyek száma |
| `forecast_n` | forecast sorok |
| `obs_n` | megfigyelés-sorok |
| `last_forecast` | utolsó forecast idő (UTC) |
| `last_obs` | utolsó megfigyelés idő (UTC) |
| `last_forecast_status` | `ok` \| `partial` \| `error` \| `running` |
| `last_obs_status` | ugyanaz |

**Bubi** (példa kulcsok):

| Kulcs | Jelentés |
|---|---|
| `n_stations` | utolsó sikeres állomás-poll |
| `n_vehicles` | utolsó `vehicle_5min` |
| `last_station_at` | UTC |
| `last_vehicle_at` | UTC |

Új gyűjtő új kulcsokat hozhat; a dashboard ismeretlen skalárt az al-lapon kulcs–értéknek rajzol.

## `detail.json`

Az al-lap forrása. Nem helyettesíti a `status.json`-t.

Kötelező: `schema_version` (`1`), `id`, `updated_at`. A többi project-specifikus.

A UI:

- objektum, csupa skalár mezővel → definíciós lista
- objektumok tömbje → táblázat (az uniózott kulcsok a fejléc)
- ismert blokkok (lent) saját címmel

Ne tegyél ide tiltott mezőt. Koordináta, teljes GBFS dump, ingest log nem kell.

### Weather — ajánlott blokkok

`counts` (skalárok), `locations[]`, `sources[]`, `runs[]` (utolsó ~40 ingest, sanitizálva).

`locations[]` mezők: `id`, `name`, `kind` (`interest` \| `station`), `last_forecast`, `last_obs`, `forecast_rows`, `obs_rows`, `last_error` (rövid vagy `null`). Nincs lat/lon, nincs abszolút path.

`runs[]` mezők: `started_at`, `finished_at`, `kind`, `slot`, `status`, `duration_s`, `ok_n`, `error_n`, `error` (rövid vagy `null`).

### Bubi — ajánlott blokkok

`jobs` objektum kulcsonként (`station_1min`, `vehicle_5min`): `last_ok_at`, `ok_last_24h`, `fail_last_24h`, plusz `n_stations` / `n_vehicles` ha van.

`recent_polls[]`: `job`, `fetched_at`, `ok`, `n_stations`, `n_vehicles`, `duration_ms`, `error`. Rövid lista, nem a teljes nap.

## Gép és UI

| Fájl | Ki írja | Ki olvassa |
|---|---|---|
| `status.json` / `detail.json` | a gyűjtő (weathercollect, bubi-collector, …) | dashboard `fetch` |
| `host.json`, `projects.json` | host-aggregátor a VPS-en | dashboard `fetch` |
| HTML/CSS/JS | ez a repo | GitHub Pages |

A böngésző ugyanarról az originről tölti a JSON-t (`fetch`, `cache: no-store`). A szerver nem generál HTML-t.

Mintadat: `sample: true` a `host.json`-ban (és opcionálisan a `projects.json`-ban). A UI ekkor „mintadat” szalagot mutat.

Lásd még: [hetzner-aggregator.md](hetzner-aggregator.md).
