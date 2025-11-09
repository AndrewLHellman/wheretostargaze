// UserLocationContext.tsx
import { createContext, useContext, ReactNode } from 'react'
import { useUserLocation } from '@/lib/useUserLocation'

// 1️⃣ Define the shape of your location context
interface UserLocationContextType {
  location: { lat: number; lng: number } | null
  error: string | null
  onLocationChange: (loc: { lat: number; lng: number }) => void
}

// 2️⃣ Create the context with that type (nullable before provider)
const UserLocationContext = createContext<UserLocationContextType | null>(null)

// 3️⃣ Provider that uses your hook once and passes it down
export function UserLocationProvider({ children }: { children: ReactNode }) {
  const locationState = useUserLocation()
  return <UserLocationContext.Provider value={locationState}>{children}</UserLocationContext.Provider>
}

// 4️⃣ Custom hook to consume it safely
export function useSharedUserLocation() {
  const context = useContext(UserLocationContext)
  if (!context) {
    throw new Error('useSharedUserLocation must be used within a UserLocationProvider')
  }
  return context
}
