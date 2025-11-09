'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Star, Navigation, Telescope } from 'lucide-react';
import { RecommendedSpot } from '@/lib/types';

interface SpotInformationProps {
  spot: RecommendedSpot;
  onClose: () => void;
}

interface CelestialBody {
  altitude: number;
  azimuth: number;
  constellation: string;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

export default function SpotInformation({ spot, onClose }: SpotInformationProps) {
  const [celestialBodies, setCelestialBodies] = useState<Record<string, CelestialBody>>({});
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAstronomy = async () => {
      try {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = '20:00:00'; // 8 PM
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/astronomy?latitude=${spot.lat}&longitude=${spot.lon}&date=${date}&time=${time}`
        );
        const data = await response.json();
        setCelestialBodies(data.celestial_bodies || {});
      } catch (error) {
        console.error('Error fetching astronomy data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAstronomy();
  }, [spot.lat, spot.lon]);

  // Desktop drawer layout (old behavior)
  const Desktop = (
    <div className="fixed top-0 right-0 z-[1000] bg-[#1f2230] shadow-2xl p-6 w-96 h-screen overflow-y-auto border-l border-purple-500/30">
      <Header title={spot.name} onClose={onClose} />
      <Content spot={spot} loading={loading} celestialBodies={celestialBodies} />
    </div>
  );

  // Mobile bottom sheet layout
  const Mobile = (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-[1000] bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* sheet */}
      <div className="fixed left-0 right-0 bottom-0 z-[1001] rounded-t-2xl bg-[#1f2230] border-t border-white/10 shadow-2xl">
        {/* grabber */}
        <div className="flex justify-center pt-2">
          <div className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>

        <div className="p-4 max-h-[78svh] overflow-y-auto">
          <Header title={spot.name} onClose={onClose} compact />
          <Content spot={spot} loading={loading} celestialBodies={celestialBodies} />
        </div>
      </div>
    </>
  );

  return isMobile ? Mobile : Desktop;
}

function Header({ title, onClose, compact = false }: { title: string; onClose: () => void; compact?: boolean }) {
  return (
    <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-4'}`}>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={22} />
      </button>
    </div>
  );
}

function Content({
  spot,
  loading,
  celestialBodies
}: {
  spot: RecommendedSpot;
  loading: boolean;
  celestialBodies: Record<string, CelestialBody>;
}) {
  return (
    <div className="space-y-3 text-white">
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
          <span className="text-sm text-gray-300">{spot.rating.toFixed(1)} / 5</span>
        </div>
      )}

      {/* Address */}
      {spot.address && (
        <div className="flex items-start gap-2">
          <Navigation size={18} className="text-blue-400 mt-0.5" />
          <span className="text-sm text-gray-300">{spot.address}</span>
        </div>
      )}

      {/* Light Pollution */}
      <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/20">
        <p className="text-xs text-gray-400 mb-1">Light Pollution Score</p>
        <p className="text-2xl font-bold text-purple-400">
          {spot.pollution_score.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 mt-1">Lower is better for stargazing</p>
      </div>

      {/* Tree Density */}
      {spot.tree_density_score != null && (
        <div className="mt-4 p-3 bg-green-900/30 rounded-lg border border-green-500/20">
          <p className="text-xs text-gray-400 mb-1">Tree Density Score</p>
          <p className="text-2xl font-bold text-green-400">
            {spot.tree_density_score.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {spot.tree_density_score < 0.3 ? 'Open sky' : spot.tree_density_score < 0.6 ? 'Moderate cover' : 'Dense forest'}
          </p>
        </div>
      )}

      {/* Cloud Coverage */}
      <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/20">
        <p className="text-xs text-gray-400 mb-1">Cloud Coverage</p>
        <p className="text-2xl font-bold text-blue-400">
          {spot.cloud_cover != null ? `${(spot.cloud_cover).toFixed(0)}%` : 'N/A'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {spot.cloud_cover != null
            ? (spot.cloud_cover < 0.3 ? 'Clear skies' : spot.cloud_cover < 0.6 ? 'Partly cloudy' : 'Mostly cloudy')
            : 'Data not available'}
        </p>
      </div>

      {/* Overall score */}
      <div className="mt-4 p-4 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-lg border-2 border-purple-400/40 shadow-lg">
        <p className="text-xs text-gray-300 mb-1 font-semibold">Overall Stargazing Score</p>
        <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          {spot.stargazing_score.toFixed(3)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {spot.stargazing_score >= 0.8 ? '⭐ Excellent' :
           spot.stargazing_score >= 0.6 ? '✨ Very Good' :
           spot.stargazing_score >= 0.4 ? '🌟 Good' :
           spot.stargazing_score >= 0.2 ? '☁️ Fair' : '🌫️ Poor'}
        </p>
        <p className="text-[10px] text-gray-500 mt-2">
          Based on light pollution, clouds, and tree cover
        </p>
      </div>

      {/* Coordinates */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Coordinates</p>
        <p className="text-sm font-mono text-gray-300">
          {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
        </p>
      </div>

      {/* Visible Tonight */}
      <div className="mt-4 p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Telescope size={18} className="text-indigo-400" />
          <p className="text-xs text-gray-400">Visible Tonight (8 PM)</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading celestial data...</p>
        ) : Object.keys(celestialBodies).length > 0 ? (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(celestialBodies).slice(0, 5).map(([name, details]) => (
              <div key={name} className="text-xs">
                <div className="text-gray-300">
                  <span className="font-semibold text-indigo-300">{name}</span>
                  <span className="text-gray-400"> in {details.constellation}</span>
                </div>
                <div className="text-gray-500 text-[10px] ml-1">
                  Alt: {details.altitude.toFixed(1)}° • Az: {details.azimuth.toFixed(1)}°
                </div>
              </div>
            ))}
            {Object.keys(celestialBodies).length > 5 && (
              <p className="text-xs text-gray-500 italic mt-1">
                +{Object.keys(celestialBodies).length - 5} more visible
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No celestial data available</p>
        )}
      </div>

      {/* Google Maps link */}
      <div className="mt-4">
        {spot.google_place_id ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}&query_place_id=${spot.google_place_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
          >
            Open in Google Maps
          </a>
        ) : (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
          >
            View on Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
