# Gyűjtő állapot — publikus dashboard

Statikus GitHub Pages site: a hobbi adatgyűjtők (először időjárás és MOL Bubi) **státusz JSON-ját** mutatja. A gyűjtő-repók kódja nem itt van. A VPS később csak a `data/` fájlokat tölti.

Böngészőből, SSH nélkül: él-e a gyűjtő, mennyi a hely, mikor volt az utolsó sikeres futás.

## Mit nézz

- Főoldal: gép (lemez%) + kártyák (health, last_ok, project MB)
- Al-lap: `project.html?id=weather` és `id=bubi`, a `detail.json`-ból
- Kontrakt: [docs/status-schema.md](docs/status-schema.md)
- Aggregátor váz (Hetzner, később): [docs/hetzner-aggregator.md](docs/hetzner-aggregator.md)

A mostani `data/` **mintadat** (`sample: true`). Nem a szerver tükre.

## Helyi próba

A `fetch` nem megy `file://` alól.

```bash
python -m http.server 8080
```

Nyisd: `http://127.0.0.1:8080/`

## Pages

A `main` push GitHub Actions-szel tölti a Pages-t (workflow: `.github/workflows/pages.yml`). A publikált site-on nincs `docs/`, nincs `.github/`.

A JSON-ban nincs hostnév, IP, `/opt` útvonal, SQLite, térkép-dump.

## Új gyűjtő

1. A gyűjtő kiírja a közös `status.json`-t (+ `detail.json`)
2. Az aggregátor berakja `data/<id>/` alá és felveszi a `projects.json` listára
3. A UI-hoz nem kell HTML-t írni
