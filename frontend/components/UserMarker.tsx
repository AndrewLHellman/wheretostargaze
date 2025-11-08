"use client"

import React from 'react'
import { Marker } from 'react-leaflet'
import * as L from 'leaflet'

interface UserMarkerProps {
  position: [number, number]
  color?: string
}

export default function UserMarker({ position, color = '#1e6dffff' }: UserMarkerProps) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'>
      <g transform='rotate(180 12 12)'>
        <polygon points='12,2 22,20 12,16 2,20' fill='${color}' stroke='white' stroke-width='1.6' stroke-linejoin='round' />
      </g>
    </svg>
  `

  const icon = L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [36, 36],
    iconAnchor: [18, 28],
  })

  return <Marker position={position} icon={icon} />
}
