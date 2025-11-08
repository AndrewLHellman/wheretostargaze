'use client'

import React, { useState } from 'react'
import { useUserLocation } from '@/lib/useUserLocation'
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import LucideMarker from './LucideMarker'
import { Button } from '@radix-ui/themes'
import { Point } from '@/lib/types'
import { Heading1, Heading2 } from 'lucide-react'
import UserMarker from '@/components/UserMarker'
import chroma from 'chroma-js'

export default function MapWithWaypoints() {
  const [waypoints, setWaypoints] = useState<Point[]>([])
  const [truckRoute, setTruckRoute] = useState<Point[]>([])
  const [droneRoutes, setDroneRoutes] = useState<Point[][]>([])
  const [isLoading, setLoading] = useState(false)

    const { location: userLocation, error: userLocationError } = useUserLocation()

  function ClickHandler() {
    useMapEvents({
      click(e) {
        setWaypoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }])
      },
    })
    return null
  }
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%' }}
        center={[38.9452, -92.3288]}
        zoom={17}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          // url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />

        <ClickHandler />

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
