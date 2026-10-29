# ntgl.at

One-Pager für die NTGL-Partys im GRNGR (Graz). Zeigt immer die nächste Veranstaltung, nimmt Anmeldungen entgegen und verlinkt Datenschutz und Impressum.

Stack: [Astro 6](https://docs.astro.build) · Tailwind 4 · Vercel (Hobby-Team „Jan's projects“) · Resend für Mails · optional Google Sheets für die Gästeliste.

## Neue Party anlegen (monatlich)

1. Flyer als JPG/PNG (quadratisch, max. ca. 1600 px) nach `public/flyers/JJJJ-MM-TT.jpg` legen.
2. Datei `src/content/events/JJJJ-MM-name.md` anlegen, am einfachsten die letzte kopieren. Felder:

```yaml
---
title: "NTGL Geburtstagsfeier"
subtitle: "Dezember Edition"        # optional
date: 2026-12-18                    # Veranstaltungstag
dateConfirmed: true                 # false = nur "Dezember 2026, Datum folgt"
doors: "22:00"
end: "06:00"                        # optional
location:
  name: "GRNGR (Eule)"
  address: "Josefigasse 47, 8020 Graz"
  mapsUrl: "https://maps.google.com/?q=Josefigasse+47,+8020+Graz"
price: "10 € Musikspende"
flyer: "/flyers/2026-12-18.jpg"
lineup:
  - time: "22:30"
    artist: "TOBI"
    genre: "Happy Bounce / Trance"
    links:
      - label: "SoundCloud"
        url: "https://soundcloud.com/..."
notes:
  - "Nur Bargeld."
registration: open                  # open | soon | closed
published: true
---

Freitext, der im Info-Block erscheint (Markdown).
```

3. Committen und pushen. Vercel baut automatisch; die Startseite wählt die nächste Veranstaltung nach Datum (vergangene gelten bis 12 Uhr des Folgetags als aktuell, danach wird die letzte mit „Anmeldung geschlossen“ gezeigt).

Die Seite ist statisch: „jetzt“ ist der Build-Zeitpunkt. Soll eine ältere Party verschwinden, obwohl keine neue da ist, genügt ein erneutes Deploy (oder `published: false`).

## Anmeldungen

`POST /api/register` (Serverless Function) prüft Name, E-Mail, Einwilligung, Honigtopf und Zeitfalle und speichert dann:

- **Mail über Resend** an `MAIL_TO` plus Bestätigung an die Person (`RESEND_API_KEY`, `MAIL_FROM`).
- **Google Sheet** (optional): hängt eine Zeile `Zeit | Veranstaltung | Name | E-Mail | Newsletter | IP` an (`SHEET_ID`, `SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`).

Ist keines von beiden konfiguriert, bekommt die Person eine ehrliche Fehlermeldung mit der Kontaktadresse. Alle Variablen stehen in `.env.example`; lokal in `.env`, auf Vercel unter Project → Settings → Environment Variables.

### Google Sheet anbinden

1. In der Google Cloud Console ein Projekt anlegen, „Google Sheets API“ aktivieren.
2. Service-Account erstellen, JSON-Schlüssel herunterladen.
3. `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `private_key` → `GOOGLE_PRIVATE_KEY` (Zeilenumbrüche als `\n`).
4. Zieltabelle im NTGL-Drive-Ordner anlegen, Tabellenblatt `Anmeldungen` mit Kopfzeile, und die Tabelle für die Service-Account-Adresse als Bearbeiter freigeben.
5. Tabellen-ID aus der URL → `SHEET_ID`.

### Resend anbinden

1. Domain `ntgl.at` in Resend anlegen, die angezeigten DNS-Einträge (DKIM, SPF/MX für `send.ntgl.at`) beim DNS-Anbieter setzen.
2. API-Key erzeugen → `RESEND_API_KEY`; Absender z. B. `NTGL <anmeldung@ntgl.at>` → `MAIL_FROM`.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # Typen und Astro-Diagnose
npm run build      # Produktions-Build (.vercel/output)
```

Deploy: `vercel deploy --prod --scope jans-projects-147b3091` oder einfach auf `main` pushen.

## Farbschema

| Name   | Hex       | Verwendung                                   |
| ------ | --------- | -------------------------------------------- |
| ink    | `#0b0f10` | Hintergrund (Logo- und Flyer-Schwarz)        |
| fog    | `#8fa9a7` | Nebel-Türkis vom Flyer, Sekundärtext, Flächen |
| signal | `#d7263d` | Buttons und Akzente (modernisiertes Rot der alten Seite) |

Schriften: Bebas Neue (Display), Space Grotesk (Text), beide über Google Fonts.
