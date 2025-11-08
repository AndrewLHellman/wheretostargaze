"use client";

import React from "react";
import { Marker } from "react-leaflet";
import * as L from "leaflet";

interface UserMarkerProps {
  position: [number, number];
  color?: string; // fill color of the dot
}

export default function UserMarker({ position, color = "#1e6dff" }: UserMarkerProps) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'>
      <!-- outer ring -->
      <circle cx='12' cy='12' r='10' fill='white'/>
      <!-- inner dot -->
      <circle cx='12' cy='12' r='7.5' fill='${color}'/>
    </svg>
  `;

  const icon = L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14], // center the icon on the coordinate
  });

  return <Marker position={position} icon={icon} />;
}
