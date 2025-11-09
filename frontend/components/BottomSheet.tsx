'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  height?: string; // e.g., '75svh'
  children: React.ReactNode;
};

export default function BottomSheet({ open, onClose, title, height = '75svh', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-200 md:hidden z-[70] ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={ref}
        className={`fixed left-0 right-0 bottom-0 bg-gray-900 text-white border-t border-white/10 rounded-t-2xl md:hidden z-[80] transform transition-transform duration-250 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height }}
        aria-hidden={!open}
      >
        <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mt-2" />
        <div className="px-4 pt-2 pb-3 sticky top-0 bg-gray-900 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold opacity-90">{title}</div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-gray-800 text-gray-200 text-xs hover:bg-gray-700 active:scale-[0.98] transition"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-4 py-3 overflow-y-auto h-[calc(100%-48px)]">
          {children}
        </div>
      </div>
    </>
  );
}
