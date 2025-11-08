import { useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.heat'

interface HeatmapProps {
  points: [number, number, number][] // [lat, lon, intensity]
}

export default function HeatmapLayer({ points }: HeatmapProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return

    // @ts-expect-error next-line
    const heat = L.heatLayer(points, {
      radius: 50,
      blur: 0,
      max: 5,
      gradient: {
        0.2: 'rgba(0,0,255,1.0)',
        0.4: 'rgba(0,255,0,1.0)',
        0.6: 'rgba(255,255,0,1.0)',
        1.0: 'rgba(255,0,0,1.0)',
      },
    }).addTo(map)

    return () => {
      heat.remove()
    }
  }, [map, points])

  return null
}
