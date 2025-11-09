declare module 'react-leaflet-arrowheads'
declare module 'react-leaflet-heatmap-layer'

export type Point = { lat: number; lng: number }

export interface HeatmapPoint {
  lat: number
  lon: number
  pollution_score: number
  cloud_cover: number
  stargazing_score: number
}

export interface RecommendedSpot {
  name: string
  lat: number
  lon: number
  pollution_score: number
  place_type: string
  rating?: number
  address?: string
  google_place_id?: string
}

export interface SearchArea {
  center: {
    lat: number
    lon: number
  }
  radius_miles?: number
  drive_time_minutes?: number
}

export interface SpotResponse {
  heatmap: LightPollutionPoint[]
  recommended_spots: RecommendedSpot[]
  search_area?: SearchArea
}
