'use client'

import dynamic from 'next/dynamic'

// Dynamically import the actual Map component (client only)
const MapWithWaypoints = dynamic(() => import('./MapWithWaypoints'), {
  ssr: false,
})

export default function App() {
  return <MapWithWaypoints />
}
