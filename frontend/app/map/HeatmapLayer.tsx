'use client'

import { useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import { LightPollutionPoint } from '@/lib/types'

interface LeafletHeatOverlayProps {
  points: LightPollutionPoint[]
  maxDistance?: number
  blur?: number
  opacity?: number
  gradient?: Record<number, string>
}

/** Simple inverse distance weighting */
function interpolateIntensity(lat: number, lon: number, points: LightPollutionPoint[], maxDistance = 0.05) {
  let numerator = 0
  let denominator = 0
  const epsilon = 0.00001

  points.forEach(p => {
    const dist = Math.sqrt((p.lat - lat) ** 2 + (p.lon - lon) ** 2)
    if (dist > maxDistance) return
    const weight = 1 / (dist + epsilon)
    numerator += weight * p.pollution_score
    denominator += weight
  })

  if (denominator === 0) return 0
  return numerator / denominator
}

/** Map normalized value [0,1] to RGBA array using smooth interpolation */
function getColorFromGradient(value: number, gradient: Record<number, string>, opacity: number): number[] {
  const stops = Object.keys(gradient)
    .map(Number)
    .sort((a, b) => a - b)

  // Clamp
  if (value === 0) return [0, 0, 0, 0] // fully transparent
  if (value <= stops[0]) return [...gradient[stops[0]].split(',').map(Number).slice(0, 3), 255 * opacity]
  if (value >= stops[stops.length - 1])
    return [...gradient[stops[stops.length - 1]].split(',').map(Number).slice(0, 3), 255 * opacity]

  // Find surrounding stops
  let lower = stops[0]
  let upper = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i] && value <= stops[i + 1]) {
      lower = stops[i]
      upper = stops[i + 1]
      break
    }
  }

  const t = (value - lower) / (upper - lower)
  const colorA = gradient[lower].split(',').map(Number).slice(0, 3)
  const colorB = gradient[upper].split(',').map(Number).slice(0, 3)

  return colorA.map((c, idx) => c + (colorB[idx] - c) * t).concat(255 * opacity)
}

export default function HeatmapLayer({
  points,
  maxDistance = 0.02,
  blur = 15,
  opacity = 0.4,
  gradient = {
    0: '0,0,255',
    0.25: '0,255,0',
    0.5: '255,255,0',
    0.75: '255,128,0',
    1: '255,0,0',
  },
}: LeafletHeatOverlayProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return

    const HeatGrid = L.GridLayer.extend({
      createTile: function (coords: any) {
        const tile = document.createElement('canvas')
        const size = this.getTileSize()
        tile.width = size.x
        tile.height = size.y
        const ctx = tile.getContext('2d')!

        const bounds = this._tileCoordsToBounds(coords)
        const nw = bounds.getNorthWest()
        const se = bounds.getSouthEast()

        const maxPollution = Math.max(...points.map(p => p.pollution_score))
        const image = ctx.createImageData(size.x, size.y)
        const data = image.data

        const step = 20 // pixels per iteration

        for (let y = 0; y < size.y; y += step) {
          for (let x = 0; x < size.x; x += step) {
            const lat = nw.lat + ((se.lat - nw.lat) * y) / size.y
            const lon = nw.lng + ((se.lng - nw.lng) * x) / size.x

            // Compute distance to nearest point
            const nearestDist = Math.min(...points.map(p => Math.sqrt((p.lat - lat) ** 2 + (p.lon - lon) ** 2)))
            let intensity
            if (nearestDist > maxDistance) {
              intensity = 0 // fully transparent
            } else {
              intensity = interpolateIntensity(lat, lon, points, maxDistance)
              intensity = Math.min(intensity / maxPollution, 1)
            }
            const color = getColorFromGradient(intensity, gradient, opacity)

            // Fill the step block
            for (let dy = 0; dy < step && y + dy < size.y; dy++) {
              for (let dx = 0; dx < step && x + dx < size.x; dx++) {
                const idx = ((y + dy) * size.x + (x + dx)) * 4
                data[idx] = color[0]
                data[idx + 1] = color[1]
                data[idx + 2] = color[2]
                data[idx + 3] = color[3]
              }
            }
          }
        }

        ctx.putImageData(image, 0, 0)
        if (blur > 0) {
          ctx.filter = `blur(${blur}px)`
          ctx.drawImage(tile, 0, 0)
          ctx.filter = 'none'
        }

        return tile
      },
    })

    const layer = new HeatGrid()
    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [map, points, maxDistance, blur, opacity, gradient])

  return null
}
