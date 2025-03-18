'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface VideoLink {
  url: string;
}

export interface LineupItem {
  time: string;
  artist: string;
  genre?: string;
  videoLinks?: VideoLink[];
}

export interface EventDetails {
  title: string;
  subtitle: string;
  date: string;
  location: string;
  dresscode?: string;
  additionalInfo?: string[];
  price?: string;
}

const EventFlyer: React.FC = () => {
  // Define event details and lineup directly within the component
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
      artist: "TURBOTHURNER",
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
      artist: "THOMMY COCONUT",
      genre: "Tribal Techno",
      videoLinks: [
        { url: "https://www.youtube.com/embed/YZ-7GpS7ZYo" },
        { url: "https://www.youtube.com/embed/fFHvc9aZ6PA" },
        { url: "https://www.youtube.com/embed/RbwJuHcVCyk" }
      ]
    },
    {
      time: "04:30 Uhr",
      artist: "MAD AND EVIL",
      genre: "Deep Hypnotic Hardgroove",
      videoLinks: [
        { url: "https://www.youtube.com/embed/yzMTGEKI2b8" },
        { url: "https://www.youtube.com/embed/pEmBsLNpnJo" },
        { url: "https://www.youtube.com/embed/JWjk-wMvOoM" }
      ]
    },
  ];

  // State to track which artist's videos are expanded
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);

  const toggleVideos = (artist: string) => {
    if (expandedArtist === artist) {
      setExpandedArtist(null);
    } else {
      setExpandedArtist(artist);
    }
  };

  return (
    <section className="mb-12 pt-8">
      <Card className="bg-slate-800 border-none shadow-xl lg:scale-90 xl:scale-70">
        <CardContent className="p-6">
          <div className="relative w-full aspect-w-1 aspect-h-1 bg-slate-700 rounded-lg mb-8 overflow-hidden">
            <img
              src="/flyer.jpeg"
              alt="Event Flyer"
              className="absolute top-0 left-0 w-full h-full object-fit rounded-lg"
            />
          </div>

          {/* Event Details */}
          <div className="text-white space-y-2 mb-8">
            <h1 className="text-3xl font-bold mb-4">{eventDetails.title}</h1>
            <p>{eventDetails.subtitle}</p>
            <p>{eventDetails.date}</p>
            <p>{eventDetails.location}</p>
          </div>

          {/* Lineup Section inside flyer */}
          <div className="text-white space-y-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Lineup</h2>
            <div className="space-y-8 font-mono">
              {lineup.map((item, index) => (
                <div key={index} className="lineup-item">
                  <div
                    className="flex justify-between items-start cursor-pointer hover:bg-slate-700 p-2 rounded transition-colors"
                    onClick={() => item.videoLinks && toggleVideos(item.artist)}
                  >
                    <div className="flex flex-col">
                      <p className="text-lg">{item.time}</p>
                      <p className="text-lg font-bold">{item.artist}</p>
                      {item.genre && <p className="text-lg">{item.genre}</p>}
                    </div>
                    {item.videoLinks && (
                      <span className="text-blue-400 ml-4">
                        {expandedArtist === item.artist ? '▲ Hide Preview' : '▼ Show Preview'}
                      </span>
                    )}
                  </div>

                  {/* Video links section */}
                  {item.videoLinks && expandedArtist === item.artist && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 ease-in-out">
                      {item.videoLinks.map((video, vidIndex) => (
                        <div key={vidIndex} className="aspect-video w-full">
                          <iframe
                            src={video.url}
                            title={`${item.artist} video ${vidIndex + 1}`}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tanzpalast Info */}
          {eventDetails.additionalInfo && eventDetails.additionalInfo.length > 0 && (
            <div className="text-white space-y-2 mb-8">
              <h2 className="text-2xl font-bold mb-4">Info</h2>
              {eventDetails.additionalInfo.map((info, index) => (
                <p key={index}>{info}</p>
              ))}
            </div>
          )}

          {/* Dresscode */}
          {eventDetails.dresscode && (
            <div className="text-white space-y-2 mb-8">
              <h2 className="text-2xl font-bold mb-4">Dresscode</h2>
              <p>{eventDetails.dresscode}</p>
            </div>
          )}

          {/* Price Info */}
          {eventDetails.price && (
            <div className="text-white space-y-2 mb-8">
              <p>{eventDetails.price}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default EventFlyer;