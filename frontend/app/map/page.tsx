'use client';

import dynamic from 'next/dynamic';
import SettingsMenu from '@/components/SettingsMenu';
import Tonight from '@/components/Tonight';
// import CalendarPopup from '@/components/CalendarPopup';
import BottomSheet from '@/components/BottomSheet';
import { UserLocationProvider } from '@/components/UserLocationProvider';
import { useState, useEffect } from 'react';
import { SpotResponse } from '@/lib/types';

const MapWithWaypoints = dynamic(() => import('./MapWithWaypoints'), { ssr: false });

const HEADER_H = 56;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  // guard against SSR
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

export default function MapPage() {
  const [data, setData] = useState<SpotResponse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <UserLocationProvider>
      {/* Mobile header */}
      {isMobile && (
        <header
          className="fixed top-0 left-0 right-0 z-[60] bg-gray-950 text-white border-b border-white/10 px-3 flex items-center justify-between"
          style={{ height: HEADER_H }}
        >
          <div className="font-semibold">WhereToStarGaze</div>
          <button
            onClick={() => setSheetOpen(true)}
            className="px-3 py-1.5 rounded bg-purple-600 text-white text-sm hover:bg-purple-500 active:scale-[0.98] transition"
          >
            Filters
          </button>
        </header>
      )}

      {/* Layout */}
      <div
        className="flex"
        style={{ height: isMobile ? '100svh' : '100vh', paddingTop: isMobile ? HEADER_H : 0 }}
      >
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-80 h-full flex-none bg-gray-900 text-white border-r border-gray-800 p-3 flex flex-col z-[30]">
            <SettingsMenu sidebar onResponse={setData} />
            <div className="mt-auto space-y-2">
              <Tonight />
              {/* <CalendarPopup /> */}
            </div>
          </aside>
        )}

        {/* Map */}
        <main className="relative flex-1">
          <div className="absolute inset-0 z-0">
            <MapWithWaypoints data={data} />
          </div>
        </main>
      </div>

      {/* Mobile bottom sheet for Filters */}
      {isMobile && (
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filters"
          height="78svh"
        >
          <div className="space-y-4">
            <SettingsMenu sidebar onResponse={(d) => { setData(d); }} />
            <div className="pt-3 border-t border-white/10">
              <Tonight />
              {/* <CalendarPopup /> */}
            </div>
          </div>
        </BottomSheet>
      )}
    </UserLocationProvider>
  );
}
