import React from 'react'
import { X, MapPin, Star, Navigation } from 'lucide-react'
import { RecommendedSpot } from '@/lib/types'

interface SpotInformationProps {
  spot: RecommendedSpot
  onClose: () => void
}

export default function SpotInformation({ spot, onClose }: SpotInformationProps) {
  return (
    <div className="fixed top-20 right-4 z-[1000] bg-[#1f2230] rounded-lg shadow-2xl p-6 max-w-sm border border-purple-500/30">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white">{spot.name}</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {/* Type */}
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-purple-400" />
          <span className="text-sm text-gray-300 capitalize">
            {spot.place_type.replace('_', ' ')}
          </span>
        </div>

        {/* Rating */}
        {spot.rating && (
          <div className="flex items-center gap-2">
            <Star size={18} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-gray-300">
              {spot.rating.toFixed(1)} / 5
            </span>
          </div>
        )}

        {/* Address */}
        {spot.address && (
          <div className="flex items-start gap-2">
            <Navigation size={18} className="text-blue-400 mt-0.5" />
            <span className="text-sm text-gray-300">{spot.address}</span>
          </div>
        )}

        {/* Light Pollution Score */}
        <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/20">
          <p className="text-xs text-gray-400 mb-1">Light Pollution Score</p>
          <p className="text-2xl font-bold text-purple-400">
            {spot.pollution_score.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lower is better for stargazing</p>
        </div>

        {/* Coordinates */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Coordinates</p>
          <p className="text-sm font-mono text-gray-300">
            {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Google Maps Link */}
      {spot.google_place_id ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}&query_place_id=${spot.google_place_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
        >
          Open in Google Maps
        </a>
      ) : (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
        >
          View on Google Maps
        </a>
      )}
    </div>
  )
}
