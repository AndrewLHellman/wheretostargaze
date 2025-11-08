'use client'

import React from 'react'
import { MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import LucideMarker from './LucideMarker'
import { FlagTriangleRight } from 'lucide-react'
import { SpotResponse } from '@/lib/types'
import UserMarker from '@/components/UserMarker'
import { useUserLocation } from '@/lib/useUserLocation'

interface Props {
  data: SpotResponse | null
}

export default function MapWithWaypoints({ data }: Props) {
  const { location: userLocation } = useUserLocation()

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%' }}
        center={[38.9452, -92.3288]}
        zoom={11}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />

        {/* User location */}
        {userLocation && <UserMarker position={[userLocation.lat, userLocation.lng]} />}

        {/* Recommended spots */}
        {data?.recommended_spots?.map((spot, i) => (
          <LucideMarker
            key={i}
            position={[spot.lat, spot.lon]}
            size={28}
            color='#2563eb'
            align='bottom'
            LucideIcon={FlagTriangleRight}
            onRightClick={() => alert(`Right-clicked: ${spot.name}`)}
          >
            <Tooltip direction='top' offset={[0, -10]} opacity={1} permanent={false}>
              {spot.name}
            </Tooltip>
          </LucideMarker>
        ))}
      </MapContainer>
    </div>
  )
}
