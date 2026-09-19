# Gyűjtő állapot — publikus dashboard

Statikus GitHub Pages site a **Hetzner** VPS hobbi gyűjtőiről (időjárás, MOL Bubi, Aldi vs Lidl, előkészített repjegy). A gyűjtő-repók kódja nem itt van. A VPS a `data/` fájlokat tölti.

Böngészőből, SSH nélkül: él-e a gyűjtő, mennyi a hely, mikor volt az utolsó sikeres futás, hány lekérés/futás volt 24 órában és összesen.

Site: https://udvariistvan2016-ui.github.io/hetzner-collector-dashboard/

## Mit nézz

- Főoldal: bérelt kapacitás; lemez a fájlrendszeren (% + GB) és külön a 40 GB keret; CPU/RAM 24ó és mérések óta; gyűjtő-kártyák (project total / adat)
- Al-lap: `project.html?id=weather`, `bubi`, `aldi-lidl`, `flights`
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
