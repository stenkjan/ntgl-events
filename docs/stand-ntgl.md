# Stand NTGL-Relaunch

Stand: 01.11.2026 (Mitgliederbereich auf `main`, Vereinsunterlagen in Drive). Fortgeschrieben von Claude.

## Was steht

- **Seite:** Astro-One-Pager live unter https://ntgl.vercel.app (Vercel-Projekt `ntgl`, Hobby-Team „Jan's projects“). GitHub `stenkjan/ntgl-events`, Branch `main` = Produktion, jeder Push baut neu. Inhalt pro Party in `src/content/events/*.md`, Anleitung in der README. Dezember-Party steht auf Freitag, 18.12.2026 (bestätigt).
- **Domain:** ntgl.at und www.ntgl.at sind am Vercel-Projekt eingetragen, aber die Domain ist noch nicht delegiert (löst nicht auf). Hetzner Console zeigte am 30.10. kein Projekt und keine Domain; Jan hat die Einrichtung vorerst zurückgestellt.
- **Farbschema (3 Farben):** ink `#0b0f10`, fog `#8fa9a7`, signal `#d7263d`. Herleitung: Logo- und Flyer-Schwarz, Türkisgrau des Flyers vom 21.03.2025, modernisiertes Rot `#ab0e0e` der alten Seite.
- **Anmeldung (live getestet):** Formular mit Datenschutz-Häkchen und optionalem Newsletter-Häkchen. `/api/register` schreibt jede Anmeldung in das Google Sheet „NTGL Anmeldungen“ im NTGL-Ordner (Blatt „Anmeldungen“, Spalten Zeit, Veranstaltung, Name, E-Mail, Newsletter, IP). Der Service-Account `hoam-agent-sa@businessai-496311.iam.gserviceaccount.com` ist Bearbeiter des Sheets; Schlüssel liegt lokal als `gcp-service-account.json` (gitignored) und auf Vercel als `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`, dazu `SHEET_ID`, `MAIL_TO`, `MAIL_FROM`. Mailversand über Resend läuft (Absender siehe „Was fehlt“, Punkt 1).
- **Drive:** Ordner „NTGL“ (Roland) ist der Ort für alles Künftige. Unterordner „ntgl alt“ enthält den Altbestand aus Jans privatem Drive: fünf Registrierungslisten (ntgl (2), ntgl (4), ntgl (4) (2), ntgl_2103.xlsx, ntgl (4) (2).xlsx), GRNGR_0303_Registrierungen, GRNGRpt2.csv, NTGL5_Flyer.PNG, GRNGR2 Website Inhalt und rund 40 Screenshots. Daraus ist das Sheet „NTGL Adressliste (bereinigt)“ mit 367 Adressen und Protokoll-Blatt entstanden (eigene Session am 30.10.).

## Mitgliederbereich und Verein (Stand 01.11.2026)

- **Code:** am 01.11.2026 von `verein-mitgliederbereich` nach `main` gemergt, damit live unter `/intern`. Typprüfung ohne Fehler, Build grün. Mitgliederbereich unter `/intern` (Login per Mail-Link, Rollen Obmann/Obfrau, Kassier:in, Schriftführer:in, Mitglied plus Arbeitsbereiche). Module: Übersicht mit Kennzahlen, Vorschlägen und Countdown; Daten; Finanzen (Kassabuch mit Storno, Budget mit Archiv-Vorschlägen, Beiträge, Abendkassa); Galerie aus Drive; Verwaltung (Planung, Line-up, Dienstplan, Rollen & Aufgaben, Equipment, Beschlüsse, Verein, Website, Einstellungen). Details in der README.
- **Website-Steuerung:** „Veröffentlichen“ schreibt eine Freigabe ins Sheet und ruft den Deploy Hook; der Build liest nur die jüngste Freigabe. Täglicher Cron baut neu, wenn das Datum die gezeigte Party ändert. Lokal mit einer Testtabelle durchgetestet (Flyer, Line-up und Galerie kamen auf der Startseite an; nicht freigegebene Bilder 404, Cron ohne Geheimnis 401, fremde Formular-POSTs 403).
- **Daten:** Sheet „NTGL Verein Daten“ im NTGL-Ordner, eingerichtet und mit Startdaten aus dem Ordner befüllt (Team, vier frühere Partys mit Archivzahlen, Dezember-Party, Line-up-Entwurf, Aufgaben, Equipment, Budget-Archiv, Kassabuch-Übertrag 1.310 €, Gründungsfahrplan, 24 Pflichtaufgaben für den 18.12.).
- **Vereinsunterlagen:** elf Google Docs im Ordner NTGL/Verein, Einstieg „00 NTGL Verein – Überblick und Fahrplan“ (verlinkt Statuten, Gründungsversammlung, Errichtungsanzeige, Beitrittserklärung, Funktionen, Steuern und Kassa, Veranstaltungen in Graz, Jahresabschluss, Konto und Werkzeuge, Datenschutz); Unterordner „Recherche“ mit den vier Berichten samt Quellen.
- **Recherche (30.10.2026):** Errichtungsanzeige bis Do 05.11. an die LPD Steiermark (dann besteht der Verein sicher am 18.12.); „NTGL“ allein ist als Vereinsname unzulässig; Party gilt trotz „privat“ als öffentlich (Anzeige bis 06.11. oder Meldung bis 04.12., je nach Status des Lokals); AKM bis 15.12.; „Musikspende“ ist steuerlich Eintritt; alte Adressliste nicht anschreiben; Vercel Hobby erlaubt keine Zahlungsaufforderungen auf der Seite und hat keinen Vertrag zur Auftragsverarbeitung (Vorschlag: mit dem Verein Pro oder ein Anbieter in der EU).
- **Vercel:** seit 31.10.2026 für Production gesetzt, alle als Secret: `INTERN_SHEET_ID`, `INTERN_ADMIN_EMAILS`, `AUTH_SECRET`, `CRON_SECRET`, `DEPLOY_HOOK_URL` (Deploy Hook „mitgliederbereich“ auf `main`). Die Preview hat keine Variablen; dort verbindet `/intern` nicht.
- **Offen im Mitgliederbereich:** erster Login über den Mail-Link; fehlende E-Mail-Adressen im Blatt „Mitglieder“ ergänzen (zwei Einträge); Rollen nach der Gründungsversammlung eintragen; Blatt „Line-up“ an den neuen Flyer angleichen (siehe „Was fehlt“, Punkt 3).

## Was fehlt (Reihenfolge nach Nutzen)

1. **Absender umstellen, sobald ntgl.at läuft:** `RESEND_API_KEY` ist seit 30.10. 15:30 auf Vercel gesetzt. Im Resend-Konto ist nur `hoam.space` verifiziert, darum sendet die Seite vorerst als `NTGL <ntgl@hoam.space>` (Antworten gehen per Reply-To an info.ntgl@proton.me). Nach DNS: ntgl.at in Resend anlegen, DKIM/SPF setzen, dann `MAIL_FROM` auf `NTGL <anmeldung@ntgl.at>` ändern und neu deployen.
2. **Hetzner DNS** (Jan im Browser): entweder Nameserver auf `ns1.vercel-dns.com` / `ns2.vercel-dns.com` oder in der Hetzner-Zone `A @ 216.198.79.1`, `A @ 64.29.17.1`, `CNAME www cname.vercel-dns.com`. Danach `vercel domains verify ntgl.at --scope jans-projects-147b3091`. Dazu die DKIM/SPF-Einträge aus Resend für die Domain ntgl.at.
3. **Dezember-Party:** Flyer und Line-up stehen seit 31.10. auf `main` (PR #1 und #2, Vorlage unter `design/flyer-2026-12-18/`). Offen: Alex und Livko bestätigen. Das Blatt „Line-up“ im Mitgliederbereich führt noch den alten Stand (Alex und Livko „Abgesagt“, Laura fehlt). Vor dem ersten „Veröffentlichen“ angleichen: Leere Felder lassen die Event-Datei stehen, aber sobald dort ein Act „Auf Website“ hat, ersetzt die Freigabe das ganze Line-up.
4. **Impressum und Datenschutz:** Name und Anschrift des Veranstalters eintragen (gelb markierte Platzhalter in `src/pages/impressum.astro` und `src/pages/datenschutz.astro`). Die weiteren Änderungen (Rechtsgrundlage der Gästeliste, Pflicht-Häkchen, Fotos, Empfänger, Google Fonts lokal) stehen in der Unterlage „10 Datenschutz“.
5. **www-Weiterleitung:** www.ntgl.at auf ntgl.at umleiten (Vercel Project → Domains → Redirect), sobald DNS steht.
6. **Newsletter aufbauen:** Die bereinigte Adressliste nicht anschreiben, solange keine Einwilligung nachgewiesen ist; auch eine Mail mit der Frage nach der Einwilligung gilt als Werbung (§ 174 TKG 2021, Unterlage „10 Datenschutz“). Stattdessen das Newsletter-Häkchen mit Double-Opt-in über Resend ergänzen und über Instagram und QR-Code an der Tür werben.

## Entscheidungen

- Astro 6 statt 7, weil Node lokal 22.16 ist (Astro 7 braucht 22.23). Vercel baut mit Node 24.
- Vite 7 als Root-Dependency gepinnt; sonst zieht `@tailwindcss/vite` Vite 8 neben Astros Vite 7 und der Build bricht.
- Seite bleibt statisch; „jetzt“ ist der Build-Zeitpunkt. Monatlicher Wechsel = neue Event-Datei + Push.
- Alte Next.js/Netlify-Seite komplett entfernt (Formkeep-Formular, Netlify-Forms).
- Mitgliederbereich ohne eigene Datenbank: Google Sheet als Speicher, Login ohne Passwort per Mail-Link. Die öffentliche Seite übernimmt Inhalte nur über eine ausdrückliche Freigabe („Veröffentlichen“), nie direkt aus den Arbeitstabellen.
