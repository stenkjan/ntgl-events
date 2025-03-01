'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RegistrationForm = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString(),
      });

      if (response.ok) {
        setShowSuccess(true);
        setError(null);
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      setError('Es gab einen Fehler bei der Registrierung. Bitte versuchen Sie es später erneut.');
    }
  };

  return (
    <section id="register" className="max-w-md mx-auto mb-20">
      <Card className="bg-slate-800 border-none shadow-xl">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">Registrierung</h2>

          {showSuccess && (
            <Alert className="mb-4 bg-green-600 text-white">
              <AlertDescription>
                Registrierung erfolgreich!
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 bg-red-600 text-white">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            action="https://formkeep.com/f/5920de988211"
            method="POST"
            className="space-y-4"
          >
            <input type="hidden" name="form-name" value="event-registration" />

            <div>
              <label htmlFor="name" className="block mb-2">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block mb-2">E-Mail</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent"
                name="consent"
                required
                className="mt-1"
              />
              <label htmlFor="consent" className="text-sm">
                Ich habe die <a href="/impressum" className="text-blue-400 hover:underline">Datenschutzerklärung</a> gelesen und stimme dieser zu.
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Registrieren
            </button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
export default RegistrationForm;