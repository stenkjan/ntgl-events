import React from 'react';
import EventFlyer from '@/components/custom/EventFlyer';
import RegistrationForm from '@/components/custom/RegistrationForm';

export default function Home() {
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
        <EventFlyer />
        <RegistrationForm />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-6">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>© 2025 NTGL. Alle Rechte vorbehalten.</p>
          <p className="mt-2">
            <a href="https://www.instagram.com/ntgl.at/" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
              <img src="/instagram_icon.png" alt="Instagram Icon" className="inline h-5 w-5 mr-2" />
              @ntgl.at
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}