/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { Point } from '@/lib/types'

interface ArrowheadPolylineProps {
  positions: Point[]
  color?: string
  arrowSize?: number
}

export default function ArrowheadPolyline({ positions, color = 'blue', arrowSize = 10 }: ArrowheadPolylineProps) {
  const map = useMap()

  useEffect(() => {
    if (!positions.length) return

    // Dynamically import the plugin and attach to L
    // @ts-ignore
    import('leaflet-polylinedecorator').then(() => {
      console.log(L.polylineDecorator)
      const Symbol = (L as any).PolylineDecorator.Symbol
      const polylineDecorator = (L as any).polylineDecorator

      const latlngs = positions.map(p => [p.lat, p.lng] as [number, number])
      const polyline = L.polyline(latlngs, { color, weight: 3 }).addTo(map)

      const decorator = polylineDecorator(polyline, {
        patterns: [
          {
            offset: '100%',
            repeat: 0,
            symbol: Symbol.arrowHead({
              pixelSize: arrowSize,
              polygon: true,
              pathOptions: { color, weight: 2 },
            }),
          },
        ],
      }).addTo(map)

      return () => {
        map.removeLayer(polyline)
        map.removeLayer(decorator)
      }
    })
  }, [positions, color, arrowSize, map])

  return null
}
