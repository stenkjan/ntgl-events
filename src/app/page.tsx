import React from 'react';
import EventFlyer, { LineupItem, EventDetails } from '@/components/custom/EventFlyer';
import RegistrationForm from '@/components/custom/RegistrationForm';

export default function Home() {
  // You can customize the event details and lineup here if needed
  const eventDetails: EventDetails = {
    title: "NEXT EVENT < 21.03.2025 >",
    subtitle: "NTGL @ GRNGR",
    date: "Fr. 21.03.2025",
    location: "📍 GERINGER (EULE), 🛖Josefigasse 47, 8020 Graz",
    additionalInfo: [
      "🎟️ Musikspende: 10€",
      "✅ Registrierung verpflichtend"
    ]
  };

  const lineup: LineupItem[] = [
    {
      time: "23:00 - 00:30",
      artist: "LUCID DREAMER B2B CRUMBLE",
      genre: "DnB",
      videoLinks: [
        { url: "https://www.youtube.com/embed/xfLsoZd9fKw" },
        { url: "https://www.youtube.com/embed/0E28wZu020I" },
        { url: "https://www.youtube.com/embed/thzJPm8KwEU" }
      ]
    },
    {
      time: "00:30 - 02:30",
      artist: "ALEX AGE",
      genre: "Hard Techno",
      videoLinks: [
        { url: "https://www.youtube.com/embed/7VzOnhmRBWQ" },
        { url: "https://www.youtube.com/embed/T4q9chUDsxY" },
        { url: "https://www.youtube.com/embed/LLih9wNlNCU" }
      ]
    },
    {
      time: "02:30 - 04:00",
      artist: "KONSTI B2B ITEC",
      genre: "Techno/Trance",
      videoLinks: [
        { url: "https://www.youtube.com/embed/TPiXZBrf4hI" },
        { url: "https://www.youtube.com/embed/fkySGB_cxA8" },
        { url: "https://www.youtube.com/embed/ykY-5DZS_Ok" }
      ]
    },
    {
      time: "04:00 - 05:30",
      artist: "RAINER GENUSS",
      genre: "Techno/Techhouse",
      videoLinks: [
        { url: "https://www.youtube.com/embed/kwZcROGLXpw" },
        { url: "https://www.youtube.com/embed/gZluu2Ezwjs" },
        { url: "https://www.youtube.com/embed/Koz8cKPqmxU" }
      ]
    }
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
            <img src="/ntgl_logo.png" alt="NTGL Logo" className="h-10" />
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