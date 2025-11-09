'use client'

import React, { useEffect, useState } from 'react'
import { SpotResponse } from '@/lib/types'
import { useSharedUserLocation } from './UserLocationProvider'

type LayerKey = 'cloudCoverage' | 'treeDensity' | 'lightPollution'
type LayerPref = { enabled: boolean; weight: number }
type MapPrefs = {
  searchType: 'distance' | 'driveTime'
  driveTime: number
  travelDistance: number
  units: 'km' | 'mi'
  layers: Record<LayerKey, LayerPref>
}

const STORAGE_KEY = 'mapPrefs'

const DEFAULT_PREFS: MapPrefs = {
  searchType: 'driveTime',
  driveTime: 30,
  travelDistance: 50,
  units: 'mi',
  layers: {
    cloudCoverage: { enabled: true, weight: 80 },
    treeDensity: { enabled: true, weight: 40 },
    lightPollution: { enabled: true, weight: 100 },
  },
}

interface SettingsMenuProps {
  sidebar?: boolean
  onResponse: (data: SpotResponse | null) => void
}

export default function SettingsMenu({ sidebar = false, onResponse }: SettingsMenuProps) {
  const [open, setOpen] = useState<boolean>(sidebar)
  const [prefs, setPrefs] = useState<MapPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState<boolean>(false)

  const { location: userLocation } = useSharedUserLocation()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const loaded = JSON.parse(raw)
        const validLayers: Record<LayerKey, LayerPref> = {} as any
        const validKeys: LayerKey[] = ['cloudCoverage', 'treeDensity', 'lightPollution']
        validKeys.forEach(key => {
          if (loaded.layers?.[key]) validLayers[key] = loaded.layers[key]
        })
        setPrefs({
          ...DEFAULT_PREFS,
          ...loaded,
          layers: { ...DEFAULT_PREFS.layers, ...validLayers },
        })
      }
    } catch {}
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
    onResponse(null)
  }

  /** Wait only for the heatmap tiles to finish (HeatmapLayer dispatches `heatmap:ready`). */
  function waitForHeatmapReady(timeoutMs = 8000) {
    return new Promise<void>(resolve => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        window.removeEventListener('heatmap:ready', finish as any)
        resolve()
      }
      window.addEventListener('heatmap:ready', finish, { once: true })
      setTimeout(finish, timeoutMs) // fallback so UI doesn't get stuck
    })
  }

  async function submitSettings() {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          ...(prefs.searchType === 'distance'
            ? {
                radius_miles: prefs.travelDistance,
              }
            : {
                drive_time_minutes: prefs.driveTime,
              }),
          // searchType: prefs.searchType,
          // driveTime: prefs.driveTime,
        }),
      })

      const data: SpotResponse = await response.json()
      onResponse(data)

      // ⏳ wait only for the HEATMAP to finish drawing
      await waitForHeatmapReady()
    } catch (error) {
      console.error('Failed to fetch spots:', error)
    } finally {
      setLoading(false)
    }
  }

  // button base styles with hover/active/focus “haptics”
  const btnBase =
    'px-3 py-2 rounded text-sm font-medium transition-all ' +
    'hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/60'

  const segOn = 'bg-purple-600 text-white'
  const segOff = 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'

  const containerBase = sidebar
    ? 'h-full overflow-auto p-2 flex flex-col bg-gray-900 text-white'
    : 'mt-2 w-80 bg-white/95 dark:bg-black/90 rounded-md shadow-lg border border-gray-200 p-3'

  return (
    <div className={sidebar ? 'h-full w-full' : 'fixed top-4 right-4 z-[1000]'}>
      {!sidebar && (
        <button
          aria-label='Open preferences'
          onClick={() => setOpen(v => !v)}
          className={
            btnBase + ' bg-white/90 dark:bg-black/80 border border-gray-200 text-gray-800 dark:text-gray-100 p-2 rounded-lg'
          }
        >
          {/* gear icon */}
          <svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
            <path d='M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z' stroke='#1f2230ff' strokeWidth='1.2' />
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
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-lg font-semibold'>Where to Stargaze?</h3>
          </div>

          {/* Search Type Toggle */}
          <div className='mb-4 flex gap-2'>
            <button
              className={`${btnBase} flex-1 ${prefs.searchType === 'distance' ? segOn : segOff}`}
              onClick={() => save({ ...prefs, searchType: 'distance' })}
            >
              Distance
            </button>
            <button
              className={`${btnBase} flex-1 ${prefs.searchType === 'driveTime' ? segOn : segOff}`}
              onClick={() => save({ ...prefs, searchType: 'driveTime' })}
            >
              Drive Time
            </button>
          </div>

          <div className={`mb-3 ${prefs.searchType === 'distance' ? '' : 'opacity-40'}`}>
            <label className='text-sm block mb-1'>Max travel distance ({prefs.units})</label>
            <div className='flex items-center gap-2'>
              <input
                type='range'
                min={0}
                max={prefs.units === 'mi' ? 120 : 120}
                value={prefs.travelDistance}
                onChange={e => save({ ...prefs, travelDistance: Number(e.target.value) })}
                disabled={prefs.searchType !== 'distance'}
                className='accent-purple-600'
              />
              <div className='text-sm w-12 text-right'>{prefs.travelDistance}</div>
            </div>
            <div className='flex gap-2 items-center mt-2'>
              <button
                className={`${btnBase} px-2 py-1 ${
                  prefs.units === 'mi' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-300'
                }`}
                onClick={() => save({ ...prefs, units: 'mi' })}
                disabled={prefs.searchType !== 'distance'}
              >
                miles
              </button>
              <button
                className={`${btnBase} px-2 py-1 ${
                  prefs.units === 'km' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-300'
                }`}
                onClick={() => save({ ...prefs, units: 'km' })}
                disabled={prefs.searchType !== 'distance'}
              >
                km
              </button>
            </div>
          </div>

          <div className={`mb-3 ${prefs.searchType === 'driveTime' ? '' : 'opacity-40'}`}>
            <label className='text-sm block mb-1'>Drive Time (minutes)</label>
            <div className='flex items-center gap-2'>
              <input
                type='range'
                min={5}
                max={120}
                step={5}
                value={prefs.driveTime}
                onChange={e => save({ ...prefs, driveTime: Number(e.target.value) })}
                disabled={prefs.searchType !== 'driveTime'}
                className='accent-purple-600'
              />
              <div className='text-sm w-12 text-right'>{prefs.driveTime}</div>
            </div>
          </div>

          <div className='mb-3'>
            <div className='text-sm font-medium mb-1'>Prioritize layers</div>
            {(Object.keys(prefs.layers) as LayerKey[]).map(key => {
              const layer = prefs.layers[key]
              const label = {
                cloudCoverage: 'Cloud Coverage',
                treeDensity: 'Tree Density',
                lightPollution: 'Light Pollution',
              }[key]

              return (
                <div key={key} className='mb-2'>
                  <label className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={layer.enabled}
                        onChange={e => updateLayer(key, { enabled: e.target.checked })}
                        className='accent-purple-600'
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
                    className='accent-purple-600'
                  />
                </div>
              )
            })}
          </div>

          <div className='flex flex-col gap-2'>
            {/* Location warning */}
            {!userLocation && (
              <div className='text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/30'>
                ⚠️ Location access required. Please enable location in your browser.
              </div>
            )}
            
            <div className='flex gap-2 justify-between'>
              {/* Submit with spinner + disabled while loading or no location */}
              <button
                onClick={submitSettings}
                disabled={loading || !userLocation}
                className={
                  btnBase +
                  ' ' +
                  (loading
                    ? 'bg-purple-600/80 text-white cursor-wait'
                    : !userLocation
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                    : 'bg-gray-800 text-gray-100 hover:bg-gray-700') +
                  ' min-w-24 flex items-center justify-center gap-2'
                }
                title={!userLocation ? 'Enable location access to submit' : ''}
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Finding spots…</span>
                  </>
                ) : (
                  'Submit'
                )}
              </button>

              <button
                onClick={resetDefaults}
                className={btnBase + ' bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}
              >
                Reset
              </button>
            </div>
          </div>

          {/* --- Celestial Events trigger (COMMENTED OUT) ---
          <div className="mt-3">
            <button className={btnBase + ' bg-indigo-600 text-white w-full'}>
              📅 Celestial Events
            </button>
          </div>
          */}
        </div>
      )}
    </div>
  )
}

/** tiny loading spinner */
function Spinner() {
  return (
    <svg className='animate-spin h-4 w-4 text-white' viewBox='0 0 24 24' fill='none'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' />
      <path className='opacity-75' d='M4 12a8 8 0 0 1 8-8' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
    </svg>
  )
}
