'use client'

import React, { useEffect, useState } from 'react'
import sampleResponse from '@/app/map/response.json'
import { SpotResponse } from '@/lib/types'

type LayerKey = 'cloudCoverage' | 'treeDensity' | 'lightPollution' | 'accessibility'

type LayerPref = {
  enabled: boolean
  weight: number
}

type MapPrefs = {
  travelDistance: number
  units: 'km' | 'mi'
  layers: Record<LayerKey, LayerPref>
}

const STORAGE_KEY = 'mapPrefs'

const DEFAULT_PREFS: MapPrefs = {
  travelDistance: 50,
  units: 'mi',
  layers: {
    cloudCoverage: { enabled: true, weight: 80 },
    treeDensity: { enabled: true, weight: 40 },
    lightPollution: { enabled: true, weight: 100 },
    accessibility: { enabled: false, weight: 30 },
  },
}

interface SettingsMenuProps {
  sidebar?: boolean
  onResponse: (data: SpotResponse) => void
}

export default function SettingsMenu({ sidebar = false, onResponse }: SettingsMenuProps) {
  const [open, setOpen] = useState<boolean>(sidebar)
  const [prefs, setPrefs] = useState<MapPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setPrefs(JSON.parse(raw))
    } catch (e) {}
  }, [])

  function save(next: MapPrefs) {
    setPrefs(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('mapPrefsChanged', { detail: next }))
  }

  function updateLayer(key: LayerKey, patch: Partial<LayerPref>) {
    const next = { ...prefs, layers: { ...prefs.layers, [key]: { ...prefs.layers[key], ...patch } } }
    save(next)
  }

  function resetDefaults() {
    save(DEFAULT_PREFS)
  }

  function submitSettings() {
    onResponse(sampleResponse)
  }

  const btnActive = sidebar ? 'bg-gray-700 text-white' : 'bg-gray-100'
  const btnSecondary = sidebar ? 'bg-gray-800 text-gray-200' : 'bg-gray-100'

  const containerBase = sidebar
    ? 'h-full overflow-auto p-4 flex flex-col bg-gray-900 text-white'
    : 'mt-2 w-80 bg-white/95 dark:bg-black/90 rounded-md shadow-lg border border-gray-200 p-3'

  return (
    <div className={sidebar ? 'h-full w-80' : 'fixed top-4 right-4 z-[1000]'}>
      {!sidebar && (
        <button
          aria-label='Open preferences'
          onClick={() => setOpen(v => !v)}
          className='p-2 bg-white/90 dark:bg-black/80 rounded-lg shadow-md border border-gray-200 hover:opacity-90'
        >
          <svg width='20' height='20' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z' stroke='#333' strokeWidth='1.2' />
            <path
              d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.27 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.66 0 1.25-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.32 3.6A2 2 0 1 1 7.15.77l.06.06c.5.5 1.19.78 1.82.66.51-.1 1.04-.16 1.58-.16h.04c.54 0 1.07.06 1.58.16.63.12 1.32-.16 1.82-.66l.06-.06A2 2 0 1 1 19.68 3.6l-.06.06c-.5.5-.78 1.19-.66 1.82.1.51.16 1.04.16 1.58v.04c0 .54-.06 1.07-.16 1.58-.12.63.16 1.32.66 1.82l.06.06A2 2 0 1 1 19.4 15z'
              stroke='#333'
              strokeWidth='0.6'
            />
          </svg>
        </button>
      )}

      {open && (
        <div className={`${containerBase} ${sidebar ? '' : 'rounded-md shadow-lg border border-gray-200'}`}>
          <h3 className='font-large mb-2'>Map Preferences</h3>

          <div className='mb-3'>
            <label className='text-sm block mb-1'>Max travel distance ({prefs.units})</label>
            <div className='flex items-center gap-2'>
              <input
                type='range'
                min={0}
                max={prefs.units === 'mi' ? 120 : 120}
                value={prefs.travelDistance}
                onChange={e => save({ ...prefs, travelDistance: Number(e.target.value) })}
              />
              <div className='text-sm w-12 text-right'>{prefs.travelDistance}</div>
            </div>
            <div className='flex gap-2 items-center mt-2'>
              <button
                className={`px-2 py-1 rounded text-sm ${prefs.units === 'mi' ? btnActive : ''}`}
                onClick={() => save({ ...prefs, units: 'mi' })}
              >
                miles
              </button>
              <button
                className={`px-2 py-1 rounded text-sm ${prefs.units === 'km' ? btnActive : ''}`}
                onClick={() => save({ ...prefs, units: 'km' })}
              >
                km
              </button>
            </div>
          </div>

          <div className='mb-3'>
            <div className='text-sm font-medium mb-1'>Prioritize layers</div>
            {(Object.keys(prefs.layers) as LayerKey[]).map(key => {
              const layer = prefs.layers[key]
              const label = {
                cloudCoverage: 'Cloud coverage',
                treeDensity: 'Tree density',
                lightPollution: 'Light pollution',
                accessibility: 'Accessibility',
              }[key]

              return (
                <div key={key} className='mb-2'>
                  <label className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={layer.enabled}
                        onChange={e => updateLayer(key, { enabled: e.target.checked })}
                      />
                      <span className='text-sm'>{label}</span>
                    </div>
                    <div className='text-xs'>{layer.weight}</div>
                  </label>
                  <input
                    type='range'
                    min={0}
                    max={100}
                    value={layer.weight}
                    onChange={e => updateLayer(key, { weight: Number(e.target.value) })}
                  />
                </div>
              )
            })}
          </div>

          <div className='flex gap-2 justify-between'>
            <button onClick={submitSettings} className={`px-3 py-1 rounded text-sm ${btnSecondary}`}>
              Submit
            </button>
            <button onClick={resetDefaults} className={`px-3 py-1 rounded text-sm ${btnSecondary}`}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
