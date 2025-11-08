'use client'

<<<<<<< HEAD
import React from 'react'
import { MapContainer, TileLayer, Tooltip } from 'react-leaflet'
=======
import React, { useState, useEffect } from 'react'
import { useUserLocation } from '@/lib/useUserLocation'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
>>>>>>> 4261d37ddc3bd9aebfeb34218c14887294fec034
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

  function RecenterMap({ latlng }: { latlng: [number, number] }) {
    const map = useMap()
    useEffect(() => {
      if (!latlng) return
      // animate to the user's location and keep current zoom
      map.flyTo(latlng, map.getZoom())
    }, [latlng && latlng.join(',')])
    return null
  }
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%' }}
<<<<<<< HEAD
        center={[38.9452, -92.3288]}
        zoom={11}
=======
        center={userLocation ? [userLocation.lat, userLocation.lng] : [38.9452, -92.3288]}
        zoom={17}
>>>>>>> 4261d37ddc3bd9aebfeb34218c14887294fec034
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />
<<<<<<< HEAD
=======

  {/* Recenter map whenever userLocation updates */}
  {userLocation && <RecenterMap latlng={[userLocation.lat, userLocation.lng]} />}

          {/* User location marker */}
          {userLocation && (
            <UserMarker position={[userLocation.lat, userLocation.lng]} />
          )}
      </MapContainer>
>>>>>>> 4261d37ddc3bd9aebfeb34218c14887294fec034

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
