'use client'

import React, { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import LucideMarker from './LucideMarker'
import { Button } from '@radix-ui/themes'
import { Point } from '@/lib/types'
import { Heading1, Heading2 } from 'lucide-react'
import TextMarker from '@/components/TextMarker'
import chroma from 'chroma-js'

export default function MapWithWaypoints() {
  const [waypoints, setWaypoints] = useState<Point[]>([])
  const [truckRoute, setTruckRoute] = useState<Point[]>([])
  const [droneRoutes, setDroneRoutes] = useState<Point[][]>([])
  const [isLoading, setLoading] = useState(false)

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
          url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          subdomains='abcd'
        />

        <ClickHandler />
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
