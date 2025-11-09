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
  let num = 0, den = 0
  const eps = 1e-5
  for (const p of points) {
    const d = Math.hypot(p.lat - lat, p.lon - lon)
    if (d > maxDistance) continue
    const w = 1 / (d + eps)
    num += w * p.pollution_score
    den += w
  }
  return den === 0 ? 0 : num / den
}

/** Map normalized value [0,1] to RGBA array */
function getColorFromGradient(value: number, gradient: Record<number, string>, opacity: number): number[] {
  const stops = Object.keys(gradient).map(Number).sort((a,b)=>a-b)
  if (value === 0) return [0,0,0,0]
  if (value <= stops[0]) return [...gradient[stops[0]].split(',').map(Number).slice(0,3), 255*opacity]
  if (value >= stops[stops.length-1]) return [...gradient[stops[stops.length-1]].split(',').map(Number).slice(0,3), 255*opacity]
  let lo = stops[0], hi = stops[stops.length-1]
  for (let i=0;i<stops.length-1;i++){
    if (value >= stops[i] && value <= stops[i+1]) { lo = stops[i]; hi = stops[i+1]; break }
  }
  const t = (value - lo) / (hi - lo)
  const ca = gradient[lo].split(',').map(Number).slice(0,3)
  const cb = gradient[hi].split(',').map(Number).slice(0,3)
  const out = ca.map((c,i)=> c + (cb[i]-c)*t)
  return [...out, 255*opacity]
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

    // Ensure a pane above base tiles
    if (!map.getPane('heatmap')) {
      const pane = map.createPane('heatmap')
      pane.style.zIndex = '650'
      pane.style.pointerEvents = 'none'
    }

    const HeatGrid = (L.GridLayer as any).extend({
      createTile: function (coords: any, done: (err: any, tile?: HTMLCanvasElement)=>void) {
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

        const step = 20 // draw blocks for speed

        for (let y = 0; y < size.y; y += step) {
          for (let x = 0; x < size.x; x += step) {
            const lat = nw.lat + ((se.lat - nw.lat) * y) / size.y
            const lon = nw.lng + ((se.lng - nw.lng) * x) / size.x

            const nearest = Math.min(...points.map(p => Math.hypot(p.lat - lat, p.lon - lon)))
            let intensity = 0
            if (nearest <= maxDistance) {
              intensity = interpolateIntensity(lat, lon, points, maxDistance)
              intensity = Math.min(intensity / (maxPollution || 1), 1)
            }
            const color = getColorFromGradient(intensity, gradient, opacity)

            for (let dy = 0; dy < step && y + dy < size.y; dy++) {
              for (let dx = 0; dx < step && x + dx < size.x; dx++) {
                const idx = ((y + dy) * size.x + (x + dx)) * 4
                data[idx]   = color[0]
                data[idx+1] = color[1]
                data[idx+2] = color[2]
                data[idx+3] = color[3]
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

        // Async done to ensure Leaflet emits load reliably
        setTimeout(() => done(null, tile), 0)
        return tile
      },
    })

    const layer = new HeatGrid({ pane: 'heatmap', tileSize: 256, opacity: 1 })
    layer.addTo(map)
    if (layer.setZIndex) layer.setZIndex(650)

    // When GridLayer finishes current batch
    const onLoad = () => window.dispatchEvent(new CustomEvent('heatmap:ready'))
    layer.on('load', onLoad)

    // Safety: if 'load' doesn't fire (all cached), still notify next frame
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('heatmap:ready'))
    })

    return () => {
      cancelAnimationFrame(raf)
      layer.off('load', onLoad)
      map.removeLayer(layer)
    }
  }, [map, points, maxDistance, blur, opacity, gradient])

  return null
}
