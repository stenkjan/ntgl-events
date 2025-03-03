import React from 'react';
import EventFlyer, { LineupItem, EventDetails } from '@/components/custom/EventFlyer';
import RegistrationForm from '@/components/custom/RegistrationForm';

export default function Home() {
  // You can customize the event details and lineup here if needed
  const eventDetails: EventDetails = {
    title: "NEXT EVENT < 21.03.2025 >",
    subtitle: "NTGL @ GRNGR",
    date: "Fr. 21.03.2025",
    location: "📍Josefigasse 47, 8020 Graz",
    additionalInfo: [
      "🎟️ Musikspende: 10€",
      "✅ Registrierung verpflichtend"
    ]
  };

  const lineup: LineupItem[] = [
    { 
      time: "22:00 Uhr", 
      artist: "MICHI K [ZSTRAD]", 
      genre: "italo house EBM",
      videoLinks: [
        { url: "https://www.youtube.com/embed/T6ic2YgNZAw" },
        { url: "https://www.youtube.com/embed/BsKbVeRc76g" },
        { url: "https://www.youtube.com/embed/hjjusf1KgCg" }
      ]
    },
    { 
      time: "00:00 Uhr", 
      artist: "RAINER GENUSS", 
      genre: "Psytechno",
      videoLinks: [
        { url: "https://www.youtube.com/embed/kwZcROGLXpw" },
        { url: "https://www.youtube.com/embed/gZluu2Ezwjs" },
        { url: "https://www.youtube.com/embed/Koz8cKPqmxU" }
      ]
    },
    { 
      time: "01:30 Uhr", 
      artist: "CI_RED", 
      genre: "Peak Time Techno",
      videoLinks: [
        { url: "https://www.youtube.com/embed/fDLBmtgGMEY" },
        { url: "https://www.youtube.com/embed/kYDiOm5aVNc" },
        { url: "https://www.youtube.com/embed/Z8onIruTiIM" }
      ]
    },
    { 
      time: "03:00 Uhr", 
      artist: "ALEX AGE", 
      genre: "Peak Time/Hard Techno",
      videoLinks: [
        { url: "https://www.youtube.com/embed/7VzOnhmRBWQ" },
        { url: "https://www.youtube.com/embed/T4q9chUDsxY" },
        { url: "https://www.youtube.com/embed/LLih9wNlNCU" }
      ]
    },
    { 
      time: "04:30 Uhr", 
      artist: "MAD AND EVIL", 
      genre: "Melodic Techno" 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Static form for Netlify to detect - hidden from view */}
      <form name="event-registration" data-netlify="true" netlify-honeypot="bot-field" hidden>
        <input type="text" name="name" />
        <input type="email" name="email" />
        <input type="checkbox" name="consent" />
      </form>

      {/* Header */}
      <header className="fixed w-full bg-transparent backdrop-blur-sm z-50 p-4">
        <nav className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/ntgl_logo.png" alt="NTGL Logo" className="h-10 w-full filter invert" />
            <h1 className="text-2xl font-bold">NTGL</h1>
          </div>
          <div className="space-x-4">
            <a href="#register" className="hover:text-blue-400">Registrieren</a>
            <a href="/impressum" className="hover:text-blue-400">Datenschutzerklärung</a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-20">
        <EventFlyer
          imageUrl="/flyer.PNG"
          lineup={lineup}
          eventDetails={eventDetails}
        />
        <RegistrationForm />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-6">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>© 2025 NTGL. Alle Rechte vorbehalten.</p>
          <p className="mt-2">
            <a href="https://www.instagram.com/ntgl.at/" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
              @ntgl.at
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}