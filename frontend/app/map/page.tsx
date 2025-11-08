'use client'

import dynamic from 'next/dynamic'
import SettingsMenu from '@/components/SettingsMenu'

// Dynamically import the actual Map component (client only)
const MapWithWaypoints = dynamic(() => import('./MapWithWaypoints'), {
  ssr: false,
})

export default function App() {
  return (
    <div className="flex h-screen">
      {/* Left sidebar (minimal, dark) */}
      <div className="w-80 h-screen flex-none bg-gray-900 text-white border-r border-gray-800">
        <SettingsMenu sidebar />
      </div>

      {/* Right: map */}
      <div className="flex-1">
        <MapWithWaypoints />
      </div>
    </div>
  )
}
