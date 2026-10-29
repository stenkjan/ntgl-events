# Stand NTGL-Relaunch

Stand: 30.10.2026, 00:45. Fortgeschrieben von Claude in der Session „NTGL wieder aufnehmen“.

## Was steht

- **Seite:** Astro-One-Pager live unter https://ntgl.vercel.app (Vercel-Projekt `ntgl`, Hobby-Team „Jan's projects“). GitHub `stenkjan/ntgl-events`, Branch `main` = Produktion, jeder Push baut neu. Inhalt pro Party in `src/content/events/*.md`, Anleitung in der README.
- **Domain:** ntgl.at und www.ntgl.at sind am Vercel-Projekt eingetragen, aber die Domain ist noch nicht delegiert (löst nicht auf). Hetzner Console zeigte am 30.10. kein Projekt und keine Domain; Jan hat die Einrichtung vorerst zurückgestellt.
- **Farbschema (3 Farben):** ink `#0b0f10`, fog `#8fa9a7`, signal `#d7263d`. Herleitung: Logo- und Flyer-Schwarz, Türkisgrau des Flyers vom 21.03.2025, modernisiertes Rot `#ab0e0e` der alten Seite.
- **Anmeldung:** Formular mit Datenschutz-Häkchen und optionalem Newsletter-Häkchen. `/api/register` versendet über Resend und schreibt optional in ein Google Sheet. Ohne Umgebungsvariablen antwortet der Endpunkt ehrlich mit Fehler und Kontaktadresse; so ist er derzeit live.
- **Drive:** Ordner „NTGL“ (Roland) ist der Ort für alles Künftige. Unterordner „ntgl alt“ enthält den Altbestand aus Jans privatem Drive: fünf Registrierungslisten (ntgl (2), ntgl (4), ntgl (4) (2), ntgl_2103.xlsx, ntgl (4) (2).xlsx), GRNGR_0303_Registrierungen, GRNGRpt2.csv, NTGL5_Flyer.PNG, GRNGR2 Website Inhalt und rund 40 Screenshots.

## Was fehlt (Reihenfolge nach Nutzen)

1. **Hetzner DNS** (Jan im Browser): entweder Nameserver auf `ns1.vercel-dns.com` / `ns2.vercel-dns.com` oder in der Hetzner-Zone `A @ 216.198.79.1`, `A @ 64.29.17.1`, `CNAME www cname.vercel-dns.com`. Danach `vercel domains verify ntgl.at --scope jans-projects-147b3091`.
2. **Resend** (Jan: Konto anlegen oder einloggen, Chrome war nicht eingeloggt): Domain ntgl.at hinzufügen, die angezeigten DKIM/SPF-Einträge im DNS setzen, API-Key erzeugen. Auf Vercel setzen: `RESEND_API_KEY`, `MAIL_FROM="NTGL <anmeldung@ntgl.at>"`, `MAIL_TO=info.ntgl@proton.me`. Für die Mailings an die alten Listen: Resend Audiences + Broadcasts bringen den Abmelde-Link mit.
3. **Google Sheet für Anmeldungen** (Jan oder Claude mit Freigabe): Service-Account in der Google Cloud Console, Sheets-API aktivieren, Tabelle „Anmeldungen“ im NTGL-Ordner anlegen und für die Service-Account-Adresse freigeben. Auf Vercel: `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`. Derselbe Account kann später Flyer und Todos aus dem Ordner lesen.
4. **Inhalt der Dezember-Party:** Datum (Platzhalter 18.12.2026, `dateConfirmed: false`), neuer Flyer, bestätigtes Line-up (Entwurf aus „NTGL Musik“ als Kommentar in der Event-Datei), Titel/Untertitel.
5. **Impressum und Datenschutz:** Name und Anschrift des Veranstalters eintragen (gelb markierte Platzhalter in `src/pages/impressum.astro` und `src/pages/datenschutz.astro`).
6. **www-Weiterleitung:** www.ntgl.at auf ntgl.at umleiten (Vercel Project → Domains → Redirect), sobald DNS steht.
7. **Alte Listen zusammenführen:** aus den Dateien in „ntgl alt“ eine bereinigte Adressliste bauen (Dubletten, Einwilligung prüfen) für den ersten Mailversand.

## Entscheidungen

- Astro 6 statt 7, weil Node lokal 22.16 ist (Astro 7 braucht 22.23). Vercel baut mit Node 24.
- Vite 7 als Root-Dependency gepinnt; sonst zieht `@tailwindcss/vite` Vite 8 neben Astros Vite 7 und der Build bricht.
- Seite bleibt statisch; „jetzt“ ist der Build-Zeitpunkt. Monatlicher Wechsel = neue Event-Datei + Push.
- Alte Next.js/Netlify-Seite komplett entfernt (Formkeep-Formular, Netlify-Forms).
