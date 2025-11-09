'use client'

import dynamic from 'next/dynamic'
import SettingsMenu from '@/components/SettingsMenu'
import { useState } from 'react'
import { SpotResponse } from '@/lib/types'

// ⬇️ your new components (you said you named them like this)
import Tonight from '@/components/Tonight'
import CalendarPopup from '@/components/CalendarPopup'
import { UserLocationProvider } from '@/components/UserLocationProvider'

// Dynamically import the actual Map component (client only)
const MapWithWaypoints = dynamic(() => import('./MapWithWaypoints'), { ssr: false })

export default function App() {
  const [data, setData] = useState<SpotResponse | null>(null)

  return (
    <UserLocationProvider>
      <div className='flex h-screen'>
        {/* Left sidebar */}
        <div className='w-80 h-screen flex-none bg-gray-900 text-white border-r border-gray-800 p-3 flex flex-col'>
          <SettingsMenu sidebar onResponse={setData} />

          {/* Bottom section: Tonight strip + Calendar button */}
          <div className='mt-auto space-y-2'>
            <Tonight />
            <CalendarPopup />
          </div>
        </div>

        {/* Right: map */}
        <div className='flex-1'>
          <MapWithWaypoints data={data} />
        </div>
      </div>
    </UserLocationProvider>
  )
}
