"use client";

import * as React from "react";

type AstroEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  kind: "sun" | "moon" | "planet" | "constellation" | "twilight" | "phase";
};

function useGeo() {
  const [pos, setPos] = React.useState<{ lat: number; lon: number }>({ lat: 38.95, lon: -92.33 });
  React.useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 4000 }
    );
  }, []);
  return pos;
}

export default function Tonight() {
  const pos = useGeo();
  const [events, setEvents] = React.useState<AstroEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = new URL("/api/astro", window.location.origin);
        url.searchParams.set("lat", String(pos.lat));
        url.searchParams.set("lon", String(pos.lon));
        url.searchParams.set("mode", "tonight");
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();
        setEvents(json.events ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [pos.lat, pos.lon]);

  const tt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sunset = events.find(e => e.kind === "sun" && /sunset/i.test(e.title));
  const planetWins = events.filter(e => e.kind === "planet");

  return (
    <div className="mt-auto border-t border-white/10 pt-3">
      <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Tonight</div>

      {loading ? (
        <div className="text-sm opacity-80">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-sm opacity-80">No items for tonight.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {sunset && (
            <li className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex-1 truncate">Sunset</span>
              <span className="opacity-80 w-32 text-left shrink-0">{tt(sunset.start)}</span>
            </li>
          )}

          {planetWins.map(p => (
            <li key={p.id} className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex-1 truncate">{p.title}</span>
              <span className="opacity-80 w-32 text-left shrink-0">
                {tt(p.start)}
                {p.end ? ` – ${tt(p.end)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
