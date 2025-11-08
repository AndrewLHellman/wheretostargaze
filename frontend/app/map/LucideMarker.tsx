'use client'

import { Marker } from 'react-leaflet'
import L, { LatLngExpression, PointTuple } from 'leaflet'
import React, { PropsWithChildren, useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FlagTriangleRight, LucideProps } from 'lucide-react'

type Align = 'center' | 'bottom' | 'bottom-left' | 'bottom-right' | 'top' | 'top-left' | 'top-right' | 'left' | 'right'

type Props = {
  position: LatLngExpression
  size?: number
  color?: string
  align?: Align
  anchor?: PointTuple
  onRightClick?: () => void
  onClick?: () => void
  LucideIcon?: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>
}

export default function LucideMarker({
  position,
  size = 24,
  color = 'red',
  align = 'center',
  anchor,
  onRightClick,
  onClick,
  LucideIcon = FlagTriangleRight,
  children,
}: PropsWithChildren<Props>) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    // Convert React icon to HTML for Leaflet
    const html = renderToStaticMarkup(<LucideIcon size={size} color={color} />)

    // Map alignment strings to iconAnchor coordinates
    const anchors: Record<Align, [number, number]> = {
      center: [size / 2, size / 2],
      bottom: [size / 2, size],
      top: [size / 2, 0],
      left: [0, size / 2],
      right: [size, size / 2],
      'bottom-left': [0, size],
      'bottom-right': [size, size],
      'top-left': [0, 0],
      'top-right': [size, 0],
    }

    const leafletIcon = L.divIcon({
      html,
      className: '', // remove default styles
      iconSize: [size, size],
      iconAnchor: anchor ? (anchor.map(it => it * size) as PointTuple) : anchors[align],
    })

    setIcon(leafletIcon)
  }, [align, anchor, size, color])

  if (!icon) return null

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        contextmenu: e => {
          e.originalEvent.preventDefault() // prevent browser menu
          onRightClick?.()
        },
        click: () => {
          onClick?.()
        }
      }}
    >
      {children}
    </Marker>
  )
}
