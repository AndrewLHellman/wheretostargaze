import { useEffect, useState } from 'react'
import { LeafletTrackingMarker } from 'react-leaflet-tracking-marker'
import L, { Popup } from 'leaflet'

import airplaneIcon from './airplane.png'

const icon = L.icon({
  iconSize: [45, 45],
  popupAnchor: [2, -20],
  iconUrl: 'https://mysql-backup-base.s3.amazonaws.com/New%20Project%20%281%29.png',
})

export default function AirplaneMarker({ data }) {
  const { lat, lng } = data
  const [prevPos, setPrevPos] = useState([lat, lng])

  useEffect(() => {
    if (prevPos[1] !== lng && prevPos[0] !== lat) setPrevPos([lat, lng])
  }, [lat, lng, prevPos])

  return (
    <>
      <LeafletTrackingMarker
        icon={icon}
        position={[lat, lng]}
        previousPosition={prevPos}
        duration={1000}
        keepAtCenter={true}
      ></LeafletTrackingMarker>
    </>
  )
}
