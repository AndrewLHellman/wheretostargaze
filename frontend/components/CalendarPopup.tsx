"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

type AstroEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  kind: "sun" | "moon" | "planet" | "constellation" | "twilight" | "phase";
};

async function fetchFuture(lat: number, lon: number, days = 90) {
  const url = new URL("/api/astro", window.location.origin);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("mode", "future");
  url.searchParams.set("days", String(days));
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  return (json.events ?? []) as AstroEvent[];
}

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

export default function CalendarPopup() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [events, setEvents] = React.useState<AstroEvent[]>([]);
  const pos = useGeo();

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const evs = await fetchFuture(pos.lat, pos.lon, 90);
        setEvents(evs);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, pos]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, AstroEvent[]>();
    for (const ev of events) {
      const day = new Date(ev.start).toDateString();
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(ev);
    }
    return Array.from(m.entries());
  }, [events]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="w-full btn btn--accent">📅 Celestial Events</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[2000]" />
        <Dialog.Content className="glass fixed left-1/2 top-1/2 z-[2001] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 p-4">
          <div className="flex items-center justify-between mb-2">
            <Dialog.Title className="text-lg font-semibold">Upcoming Celestial Events</Dialog.Title>
            <Dialog.Close className="btn">Close</Dialog.Close>
          </div>

          <div className="text-sm opacity-80 mb-3">
            Location: <b>{pos.lat.toFixed(3)}, {pos.lon.toFixed(3)}</b>
          </div>

          {loading ? (
            <div className="opacity-80">Loading…</div>
          ) : grouped.length === 0 ? (
            <div className="opacity-80">No upcoming events.</div>
          ) : (
            <div className="grid gap-3 max-h-[70vh] overflow-auto">
              {grouped.map(([day, evs]) => (
                <div key={day} className="glass p-2">
                  <div className="text-xs opacity-70 mb-1">{day}</div>
                  <ul className="flex flex-wrap gap-2">
                    {evs.map(ev => (
                      <li key={ev.id} className="chip">{ev.title}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
