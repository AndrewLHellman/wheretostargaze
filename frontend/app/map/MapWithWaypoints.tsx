'use client'

import React, { useState, useEffect } from 'react'
import { useUserLocation } from '@/lib/useUserLocation'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import UserMarker from '@/components/UserMarker'
import { SpotResponse } from '@/lib/types'

interface Props {
  data: SpotResponse | null
}

export default function MapWithWaypoints({ data }: Props) {
  const { location: userLocation, error: userLocationError } = useUserLocation()
  console.log(data)

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
        center={userLocation ? [userLocation.lat, userLocation.lng] : [38.9452, -92.3288]}
        zoom={17}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          // url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />

  {/* Recenter map whenever userLocation updates */}
  {userLocation && <RecenterMap latlng={[userLocation.lat, userLocation.lng]} />}

          {/* User location marker */}
          {userLocation && (
            <UserMarker position={[userLocation.lat, userLocation.lng]} />
          )}
      </MapContainer>

      {/* <Button
        className='absolute bottom-5 right-5 p-2 bg-blue-500 text-white !z-[100000] cursor-pointer rounded-md'
        loading={isLoading}
      >
        Generate Route
      </Button> */}
    </div>
  )
}
