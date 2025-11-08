'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import LucideMarker from './LucideMarker'
import { FlagTriangleRight } from 'lucide-react'
import { SpotResponse, RecommendedSpot } from '@/lib/types'
import UserMarker from '@/components/UserMarker'
import { useUserLocation } from '@/lib/useUserLocation'
import HeatmapLayer from './HeatmapLayer'
import SpotInformation from '@/components/SpotInformation'

interface Props {
  data: SpotResponse | null
}

export default function MapWithWaypoints({ data }: Props) {
  const { location: userLocation } = useUserLocation()
  const [selectedSpot, setSelectedSpot] = useState<RecommendedSpot | null>(null)

  function RecenterMap({ latlng }: { latlng: [number, number] }) {
    const map = useMap()
    useEffect(() => {
      if (!latlng) return
      map.flyTo(latlng, map.getZoom())
    }, [latlng && latlng.join(',')])
    return null
  }

  // Prepare heatmap points as [lat, lon, intensity]
  const heatmapPoints = data?.heatmap.map(point => [point.lat, point.lon, point.pollution_score]) || []

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%' }}
        center={userLocation ? [userLocation.lat, userLocation.lng] : [38.9452, -92.3288]}
        zoom={13}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />

        {/* Recenter map */}
        {userLocation && <RecenterMap latlng={[userLocation.lat, userLocation.lng]} />}

        {/* Heatmap */}
        {heatmapPoints.length > 0 && <HeatmapLayer points={data?.heatmap || []} />}

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
            onClick={() => setSelectedSpot(spot)}
          >
            <Tooltip direction='top' offset={[0, -10]} opacity={1} permanent={false}>
              {spot.name}
            </Tooltip>
          </LucideMarker>
        ))}
      </MapContainer>

      {selectedSpot && (
      <SpotInformation 
        spot={selectedSpot} 
        onClose={() => setSelectedSpot(null)} 
      />
      )}
    </div>
  )
}
