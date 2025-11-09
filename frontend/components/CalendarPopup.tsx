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

/* ---------- Calendar helpers ---------- */
type DayCell = { date: Date; inMonth: boolean; key: string };

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameYMD(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Build a 6x7 grid for a month (starts on Sunday).
function buildMonthGrid(anchor: Date): DayCell[] {
  const first = startOfMonth(anchor);
  const last  = endOfMonth(anchor);

  const startIdx = first.getDay(); // 0..6, Sunday=0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startIdx);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === anchor.getMonth(),
      key: d.toISOString().slice(0,10) + "-" + i
    });
  }
  return cells;
}

function monthName(d: Date) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function groupEventsByDay(events: AstroEvent[]) {
  const map = new Map<string, AstroEvent[]>();
  for (const ev of events) {
    const dayKey = new Date(ev.start).toISOString().slice(0,10);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(ev);
  }
  return map;
}

/* ---------- Component ---------- */
export default function CalendarPopup({ showTrigger = false }: { showTrigger?: boolean }) {
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
        // Optional: sort by start
        evs.sort((a, b) => +new Date(a.start) - +new Date(b.start));
        setEvents(evs);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, pos]);

  // Build two months: current + next
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const byDay = React.useMemo(() => groupEventsByDay(events), [events]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <Dialog.Trigger asChild>
          <button className="w-full btn btn--accent" type="button" aria-haspopup="dialog">
            📅 Celestial Events
          </button>
        </Dialog.Trigger>
      )}
      {/* If you want to force-hide without prop, you can comment out trigger entirely: */}
      {/*
      <Dialog.Trigger asChild>
        <button className="hidden">📅 Celestial Events</button>
      </Dialog.Trigger>
      */}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[2000]" />
        <Dialog.Content
          className="glass fixed left-1/2 top-1/2 z-[2001] w-[min(96vw,1000px)] max-h-[85vh] overflow-auto -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg border border-white/10"
        >
          <div className="flex items-center justify-between mb-3">
            <Dialog.Title className="text-lg font-semibold">Upcoming Celestial Events</Dialog.Title>
            <Dialog.Close className="btn">Close</Dialog.Close>
          </div>

          <div className="text-sm opacity-80 mb-4">
            Location: <b>{pos.lat.toFixed(3)}, {pos.lon.toFixed(3)}</b>
          </div>

          {loading ? (
            <div className="opacity-80">Loading…</div>
          ) : events.length === 0 ? (
            <div className="opacity-80">No upcoming events.</div>
          ) : (
            <div className="space-y-6">
              {/* Month 1 */}
              <MonthGrid anchor={thisMonth} byDay={byDay} />
              {/* Month 2 */}
              <MonthGrid anchor={nextMonth} byDay={byDay} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- Month grid UI ---------- */
function MonthGrid({ anchor, byDay }: { anchor: Date; byDay: Map<string, AstroEvent[]> }) {
  const cells = React.useMemo(() => buildMonthGrid(anchor), [anchor]);
  const today = new Date();

  return (
    <div>
      <div className="mb-2 text-base font-semibold">{monthName(anchor)}</div>

      <div className="grid grid-cols-7 text-xs opacity-70 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          const key = cell.date.toISOString().slice(0,10);
          const dayEvents = byDay.get(key) ?? [];
          const isToday = sameYMD(cell.date, today);

          return (
            <div
              key={cell.key}
              className={
                "rounded border p-2 min-h-[90px] " +
                (cell.inMonth ? "border-white/10" : "border-white/5 opacity-60") +
                (isToday ? " ring-1 ring-purple-500/60" : "")
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs opacity-70">
                  {cell.date.getDate()}
                </span>
                {isToday && <span className="text-[10px] px-1 py-0.5 rounded bg-purple-600 text-white">Today</span>}
              </div>

              <ul className="space-y-1">
                {dayEvents.slice(0, 4).map(ev => (
                  <li key={ev.id} className="truncate text-[11px]">
                    <span className={pillClass(ev.kind)}>{labelForKind(ev.kind)}</span>{" "}
                    <span className="opacity-90">{ev.title}</span>
                  </li>
                ))}
                {dayEvents.length > 4 && (
                  <li className="text-[11px] opacity-70">+{dayEvents.length - 4} more…</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- styling helpers ---------- */
function pillClass(kind: AstroEvent["kind"]) {
  const base = "inline-block px-1.5 py-0.5 rounded text-[10px] mr-1";
  switch (kind) {
    case "sun":           return base + " bg-amber-500/20 text-amber-300";
    case "moon":          return base + " bg-indigo-500/20 text-indigo-300";
    case "planet":        return base + " bg-emerald-500/20 text-emerald-300";
    case "constellation": return base + " bg-cyan-500/20 text-cyan-300";
    case "twilight":      return base + " bg-sky-500/20 text-sky-300";
    case "phase":         return base + " bg-fuchsia-500/20 text-fuchsia-300";
    default:              return base + " bg-gray-500/20 text-gray-300";
  }
}

function labelForKind(kind: AstroEvent["kind"]) {
  switch (kind) {
    case "sun": return "Sun";
    case "moon": return "Moon";
    case "planet": return "Planet";
    case "constellation": return "Const";
    case "twilight": return "Twilight";
    case "phase": return "Phase";
    default: return "Event";
  }
}
