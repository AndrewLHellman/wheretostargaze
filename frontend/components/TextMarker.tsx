import { Marker } from 'react-leaflet'
import * as L from 'leaflet'

interface TextMarkerProps {
  position: [number, number]
  text: string
}

export default function TextMarker({ position, text }: TextMarkerProps) {
  // Create a divIcon with your text
  const icon = L.divIcon({
    className: 'text-marker', // optional CSS class
    html: `<div style="color: black;">${text}</div>`,
    iconSize: [50, 20], // width, height
    iconAnchor: [0, 0], // where the icon points
  })

  return <Marker position={position} icon={icon} />
}
