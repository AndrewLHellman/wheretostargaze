import { useEffect, useState } from 'react'

export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('userLocation')
    if (stored) {
      try {
        setLocation(JSON.parse(stored))
      } catch {
        // ignore parse error
      }
    }
    if (!location) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            console.log('pos', pos)
            const coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }
            setLocation(coords)
            localStorage.setItem('userLocation', JSON.stringify(coords))
          },
          err => {
            console.log('err', err)
            setError(err.message)
          },
        )
      } else {
        setError('Geolocation not supported')
      }
    }
  }, [])

  return { location, error }
}
