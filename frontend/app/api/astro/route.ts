import { NextRequest, NextResponse } from "next/server";
import {
  Body,
  Constellation,
  Equator,
  Horizon,
  MoonPhase,
  Observer,
  MakeTime,
  SiderealTime,
} from "astronomy-engine";

/* ---------- Types ---------- */
type Event = {
  id: string;
  title: string;
  start: string;  // ISO
  end?: string;   // ISO
  kind: "sun" | "moon" | "planet" | "constellation" | "twilight" | "phase";
  meta?: Record<string, any>;
};
type AnyJson = Record<string, any>;

/* ---------- Helpers ---------- */
const iso = (d: Date) => d.toISOString();

function floorTo5Min(d: Date) {
  const n = new Date(d);
  n.setSeconds(0, 0);
  n.setMinutes(n.getMinutes() - (n.getMinutes() % 5));
  return n;
}

async function usnoOneDay(lat: number, lon: number, dateISO: string) {
  const url = `https://aa.usno.navy.mil/api/rstt/oneday?date=${dateISO}&coords=${lat},${lon}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`USNO ${res.status}`);
  return (await res.json()) as AnyJson;
}

// USNO returns UTC times "HH:MM[:SS]" (tz:0). Convert to ISO (UTC).
function toISO_utc(dateISO: string, hhmm?: string) {
  if (!hhmm || hhmm.includes("--")) return undefined;
  const m = hhmm.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return undefined;
  const [_, H, M, S] = m;
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCHours(Number(H), Number(M), S ? Number(S) : 0, 0);
  return d.toISOString();
}

/** Night window = [end of civil twilight today → begin of civil twilight tomorrow] (UTC ISO). */
async function civilNightWindow(lat: number, lon: number, localDate: Date) {
  const dayISO = localDate.toISOString().slice(0, 10);
  const next = new Date(localDate);
  next.setDate(next.getDate() + 1);
  const nextISO = next.toISOString().slice(0, 10);

  const [today, tomorrow] = await Promise.all([
    usnoOneDay(lat, lon, dayISO),
    usnoOneDay(lat, lon, nextISO),
  ]);

  const sundataToday = today?.properties?.data?.sundata ?? [];
  const sundataTomorrow = tomorrow?.properties?.data?.sundata ?? [];

  const endCivilToday = toISO_utc(
    dayISO,
    sundataToday.find((x: any) => x.phen === "End Civil Twilight")?.time
  );
  const beginCivilTomorrow = toISO_utc(
    nextISO,
    sundataTomorrow.find((x: any) => x.phen === "Begin Civil Twilight")?.time
  );

  // Fallback: sunset/sunrise if civil twilight absent
  const sunset = toISO_utc(dayISO, sundataToday.find((x: any) => x.phen === "Set")?.time);
  const sunrise = toISO_utc(nextISO, sundataTomorrow.find((x: any) => x.phen === "Rise")?.time);

  return {
    startISO: endCivilToday ?? sunset,
    endISO: beginCivilTomorrow ?? sunrise,
    todayJSON: today,
  };
}

/** Planet visibility during [startISO, endISO] when Sun alt ≤ -12° and planet alt ≥ minAltDeg. */
function planetWindows(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  minAltDeg = 20,
  stepMinutes = 5
): Event[] {
  const obs = new Observer(lat, lon, 0);
  const bodies: Body[] = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];

  const start = new Date(startISO);
  const end = new Date(endISO);
  const events: Event[] = [];

  for (const body of bodies) {
    let open: Date | null = null;

    for (let t = floorTo5Min(new Date(start)); t <= end; t = new Date(t.getTime() + stepMinutes * 60000)) {
      const time = MakeTime(t);

      // Sun altitude
      const sunEq = Equator(Body.Sun, time, obs, true, true); // ra (hours), dec (deg)
      const sunH = Horizon(time, obs, sunEq.ra, sunEq.dec, "normal").altitude;

      // Planet altitude
      const beq = Equator(body, time, obs, true, true);
      const bH = Horizon(time, obs, beq.ra, beq.dec, "normal").altitude;

      const visible = sunH <= -12 && bH >= minAltDeg;

      if (visible && !open) open = new Date(t);
      if (!visible && open) {
        events.push({
          id: `${Body[body]}-${open.toISOString()}`,
          title: `${Body[body]} visible`,
          start: iso(open),
          end: iso(t),
          kind: "planet",
          meta: { minAltDeg },
        });
        open = null;
      }
    }
    if (open) {
      events.push({
        id: `${Body[body]}-${open.toISOString()}-tail`,
        title: `${Body[body]} visible`,
        start: iso(open),
        end: endISO,
        kind: "planet",
        meta: { minAltDeg },
      });
    }
  }
  return events;
}

/** Constellation near zenith each hour between start and end (rough “what’s overhead”). */
function zenithConstellations(lat: number, _lon: number, startISO: string, endISO: string): Event[] {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const hours = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 3600000));
  const events: Event[] = [];

  for (let i = 0; i <= hours; i++) {
    const t = new Date(start.getTime() + i * 3600000);
    const time = MakeTime(t);

    // Zenith approx: RA ≈ local sidereal time (hours), Dec ≈ latitude (deg)
    const lstHours = SiderealTime(time);  // RA in hours
    const raHours = lstHours;
    const decDeg = lat;                   // declination ~ latitude (deg)
    const info = Constellation(raHours, decDeg);
    events.push({
      id: `zenith-${t.toISOString()}`,
      title: `Overhead: ${info.name}`,
      start: iso(t),
      kind: "constellation",
      meta: { code: info.symbol },
    });
  }
  return events;
}

/* ---------- Route ---------- */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat") ?? 38.95);
    const lon = Number(searchParams.get("lon") ?? -92.33);
    const mode = (searchParams.get("mode") ?? "tonight") as "tonight" | "future";
    const days = Math.min(Number(searchParams.get("days") ?? (mode === "future" ? 60 : 2)), 60);

    if (mode === "tonight") {
      const now = new Date();

      // night window (end civil twilight → begin civil twilight)
      const { startISO, endISO, todayJSON } = await civilNightWindow(lat, lon, now);
      const events: Event[] = [];

      if (!startISO || !endISO) {
        return NextResponse.json({ events }); // graceful empty
      }

      // Sunset (single item)
      const sundataToday = todayJSON?.properties?.data?.sundata ?? [];
      const sunsetISO = toISO_utc(
        now.toISOString().slice(0, 10),
        sundataToday.find((x: any) => x.phen === "Set")?.time
      );
      if (sunsetISO) events.push({ id: `sunset-${sunsetISO}`, title: "Sunset", start: sunsetISO, kind: "sun" });

      // Planet windows during darkness
      events.push(...planetWindows(lat, lon, startISO, endISO, 20, 5));

      // Overhead constellations hourly
      events.push(...zenithConstellations(lat, lon, startISO, endISO));

      return NextResponse.json({ events });
    }

    // FUTURE: principal moon phases over next N days (local compute)
    const start = new Date();
    const events: Event[] = [];
    for (let i = 0; i < days; i++) {
      const t = new Date(start);
      t.setDate(t.getDate() + i);
      const phaseDeg = MoonPhase(MakeTime(t)); // 0=new, 90=1st qtr, 180=full, 270=last qtr
      const phases = [
        { deg: 0, name: "New Moon" },
        { deg: 90, name: "First Quarter" },
        { deg: 180, name: "Full Moon" },
        { deg: 270, name: "Last Quarter" },
      ];
      for (const p of phases) {
        const diff = Math.min(Math.abs(phaseDeg - p.deg), 360 - Math.abs(phaseDeg - p.deg));
        if (diff <= 1.5) {
          events.push({ id: `phase-${p.name}-${t.toISOString()}`, title: p.name, start: iso(t), kind: "phase" });
        }
      }
    }
    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
