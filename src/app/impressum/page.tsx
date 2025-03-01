export default function Impressum() {
  return (
    <div className="min-h-screen">
      <header className="fixed w-full bg-transparent z-50 p-4">
        <nav className="container mx-auto">
          <a href="/" className="text-2xl font-bold hover:text-red-500">← Zurück</a>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="card max-w-4xl mx-auto">
          {/* { <h1 className="text-3xl font-bold mb-8">Impressum & Datenschutz</h1> }
            
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Impressum</h2>
              { <p className="mb-4">
                [Name des Verantwortlichen]<br />
                [Straße und Hausnummer]<br />
                [PLZ und Ort]<br />
                [Email]
              </p> }
            </section> */}

          <section className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>

            <div>
              <h3 className="text-xl font-bold mb-2">1. Datenerfassung</h3>
              <p>
                Mit Ihrer Anmeldung zur Veranstaltung erfassen wir folgende Daten:
                - Name
                - E-Mail-Adresse
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">2. Zweck der Datenverarbeitung</h3>
              <p>
                Die erfassten Daten werden ausschließlich für die Organisation der Veranstaltung
                und zur Kommunikation mit Ihnen bezüglich der Veranstaltung verwendet.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">3. Speicherdauer</h3>
              <p>
                Ihre Daten werden nur für die Dauer der Veranstaltung und eine angemessene
                Nachbereitungszeit gespeichert und danach gelöscht.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">4. Ihre Rechte</h3>
              <p>
                Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung
                der Verarbeitung Ihrer personenbezogenen Daten.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">4. Haftungsausschluss</h3>
              <p>
                Haftungsausschluss

                1. Inhalt des Onlineangebotes

                Der Autor übernimmt keinerlei Gewähr für die Aktualität, Korrektheit, Vollständigkeit oder Qualität der
                bereitgestellten Informationen. Haftungsansprüche gegen den Autor, welche sich auf Schäden materieller
                oder ideeller Art beziehen, die durch die Nutzung oder Nichtnutzung der dargebotenen Informationen bzw.
                durch die Nutzung fehlerhafter und unvollständiger Informationen verursacht wurden, sind grundsätzlich
                ausgeschlossen, sofern seitens des Autors kein nachweislich vorsätzliches oder grob fahrlässiges
                Verschulden vorliegt.

                2. Verweise und Links
                Bei direkten oder indirekten Verweisen auf fremde Webseiten ("Hyperlinks"), die außerhalb des
                Verantwortungsbereiches des Autors liegen, würde eine Haftungsverpflichtung ausschließlich in dem Fall
                in Kraft treten, in dem der Autor von den Inhalten Kenntnis hat und es ihm technisch möglich und
                zumutbar wäre, die Nutzung im Falle rechtswidriger Inhalte zu verhindern.

                3. Urheber- und Kennzeichenrecht
                Der Autor ist bestrebt, in allen Publikationen die Urheberrechte der verwendeten Grafiken, Tondokumente,
                Videosequenzen und Texte zu beachten, von ihm selbst erstellte Grafiken, Tondokumente, Videosequenzen
                und Texte zu nutzen oder auf lizenzfreie Grafiken, Tondokumente, Videosequenzen und Texte
                zurückzugreifen.
                
                4. Datenschutz
                Sofern innerhalb des Internetangebotes die Möglichkeit zur Eingabe persönlicher oder geschäftlicher
                Daten (Emailadressen, Namen, Anschriften) besteht, so erfolgt die Preisgabe dieser Daten seitens des
                Nutzers auf ausdrücklich freiwilliger Basis. Die Inanspruchnahme und Bezahlung aller angebotenen Dienste
                ist - soweit technisch möglich und zumutbar - auch ohne Angabe solcher Daten bzw. unter Angabe
                anonymisierter Daten oder eines Pseudonyms gestattet.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}