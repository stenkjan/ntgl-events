# Stand NTGL-Relaunch

Stand: 30.10.2026, 15:10. Fortgeschrieben von Claude in der Session „NTGL wieder aufnehmen“.

## Was steht

- **Seite:** Astro-One-Pager live unter https://ntgl.vercel.app (Vercel-Projekt `ntgl`, Hobby-Team „Jan's projects“). GitHub `stenkjan/ntgl-events`, Branch `main` = Produktion, jeder Push baut neu. Inhalt pro Party in `src/content/events/*.md`, Anleitung in der README. Dezember-Party steht auf Freitag, 18.12.2026 (bestätigt).
- **Domain:** ntgl.at und www.ntgl.at sind am Vercel-Projekt eingetragen, aber die Domain ist noch nicht delegiert (löst nicht auf). Hetzner Console zeigte am 30.10. kein Projekt und keine Domain; Jan hat die Einrichtung vorerst zurückgestellt.
- **Farbschema (3 Farben):** ink `#0b0f10`, fog `#8fa9a7`, signal `#d7263d`. Herleitung: Logo- und Flyer-Schwarz, Türkisgrau des Flyers vom 21.03.2025, modernisiertes Rot `#ab0e0e` der alten Seite.
- **Anmeldung (live getestet):** Formular mit Datenschutz-Häkchen und optionalem Newsletter-Häkchen. `/api/register` schreibt jede Anmeldung in das Google Sheet „NTGL Anmeldungen“ im NTGL-Ordner (Blatt „Anmeldungen“, Spalten Zeit, Veranstaltung, Name, E-Mail, Newsletter, IP). Der Service-Account `hoam-agent-sa@businessai-496311.iam.gserviceaccount.com` ist Bearbeiter des Sheets; Schlüssel liegt lokal als `gcp-service-account.json` (gitignored) und auf Vercel als `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`, dazu `SHEET_ID`, `MAIL_TO`, `MAIL_FROM`. Mailversand fehlt noch, weil `RESEND_API_KEY` nicht gesetzt ist.
- **Drive:** Ordner „NTGL“ (Roland) ist der Ort für alles Künftige. Unterordner „ntgl alt“ enthält den Altbestand aus Jans privatem Drive: fünf Registrierungslisten (ntgl (2), ntgl (4), ntgl (4) (2), ntgl_2103.xlsx, ntgl (4) (2).xlsx), GRNGR_0303_Registrierungen, GRNGRpt2.csv, NTGL5_Flyer.PNG, GRNGR2 Website Inhalt und rund 40 Screenshots. Daraus ist das Sheet „NTGL Adressliste (bereinigt)“ mit 367 Adressen und Protokoll-Blatt entstanden (eigene Session am 30.10.).

## Was fehlt (Reihenfolge nach Nutzen)

1. **Absender umstellen, sobald ntgl.at läuft:** `RESEND_API_KEY` ist seit 30.10. 15:30 auf Vercel gesetzt. Im Resend-Konto ist nur `hoam.space` verifiziert, darum sendet die Seite vorerst als `NTGL <ntgl@hoam.space>` (Antworten gehen per Reply-To an info.ntgl@proton.me). Nach DNS: ntgl.at in Resend anlegen, DKIM/SPF setzen, dann `MAIL_FROM` auf `NTGL <anmeldung@ntgl.at>` ändern und neu deployen.
2. **Hetzner DNS** (Jan im Browser): entweder Nameserver auf `ns1.vercel-dns.com` / `ns2.vercel-dns.com` oder in der Hetzner-Zone `A @ 216.198.79.1`, `A @ 64.29.17.1`, `CNAME www cname.vercel-dns.com`. Danach `vercel domains verify ntgl.at --scope jans-projects-147b3091`. Dazu die DKIM/SPF-Einträge aus Resend für die Domain ntgl.at.
3. **Inhalt der Dezember-Party:** neuer Flyer, bestätigtes Line-up (Entwurf aus „NTGL Musik“ als Kommentar in der Event-Datei), Titel/Untertitel.
4. **Impressum und Datenschutz:** Name und Anschrift des Veranstalters eintragen (gelb markierte Platzhalter in `src/pages/impressum.astro` und `src/pages/datenschutz.astro`).
5. **www-Weiterleitung:** www.ntgl.at auf ntgl.at umleiten (Vercel Project → Domains → Redirect), sobald DNS steht.
6. **Erster Mailversand** an die bereinigte Adressliste: Resend Audience anlegen, Liste importieren (nur Adressen mit Einwilligung), Broadcast mit Abmelde-Link.

## Entscheidungen

- Astro 6 statt 7, weil Node lokal 22.16 ist (Astro 7 braucht 22.23). Vercel baut mit Node 24.
- Vite 7 als Root-Dependency gepinnt; sonst zieht `@tailwindcss/vite` Vite 8 neben Astros Vite 7 und der Build bricht.
- Seite bleibt statisch; „jetzt“ ist der Build-Zeitpunkt. Monatlicher Wechsel = neue Event-Datei + Push.
- Alte Next.js/Netlify-Seite komplett entfernt (Formkeep-Formular, Netlify-Forms).
