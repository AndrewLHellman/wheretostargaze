'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [showButton, setShowButton] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    // Show button after animation completes (15 seconds) when text is in final position
    setTimeout(() => {
      setShowButton(true)
      setCanScroll(true)
    }, 15000)
  }, [])

  return (
    <div className={`min-h-screen bg-[#1f2230] ${!canScroll ? 'overflow-hidden h-screen' : ''}`}>
      {/* Stars background - always visible */}
      <div className="fixed inset-0 stars z-0"></div>
      
      {/* First viewport - Star Wars animation and intro */}
      <div className="min-h-screen relative z-10">
        {/* Star Wars scroll container */}
        <div className="crawl-container absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="crawl-text">
            <div className="text-yellow-300 text-xl leading-relaxed max-w-3xl mx-auto space-y-12 px-8">
              <p className="text-4xl italic">
                In a galaxy far, far away...
              </p>
              <p className="text-5xl font-semibold">
                Wait, I can't see the galaxy!
              </p>
              <p className="text-3xl">
                Light pollution, clouds, and urban sprawl have made it harder 
                than ever to see the night sky in all its glory.
              </p>
              <p className="text-3xl">
                But fear not! Our app helps you find the perfect dark sky 
                locations near you for optimal stargazing.
              </p>
              <p className="text-3xl">
                Discover pristine viewing spots, check real-time conditions, 
                and never miss a celestial event again.
              </p>
              
              <div className="text-center mt-20">
                <h1 className="text-7xl font-bold text-yellow-400">
                  WHERETOSTARGAZE
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA - Fades in after crawl */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50">
          <Link 
            href="/map"
            className={`px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-bold rounded-lg shadow-lg transition-all hover:scale-105 inline-block ${
              showButton ? 'opacity-80' : 'opacity-0 pointer-events-none'
            }`}
            style={{ transition: 'opacity 2s ease-in' }}
          >
            Find Your Spot
          </Link>
        </div>
      </div>

      {/* Scrollable content section */}
      {canScroll && (
        <div className="relative z-20 bg-[#1f2230]">
          <div className="max-w-4xl mx-auto px-8 py-20 text-white">
            <h2 className="text-5xl font-bold text-purple-400 mb-8">About WhereToStarGaze</h2>
            
            <div className="space-y-8 text-lg leading-relaxed">
              <p>
                WhereToStarGaze is your ultimate companion for discovering the perfect 
                locations to experience the wonders of the night sky. Whether you're an 
                amateur astronomer, a photography enthusiast, or simply someone who 
                appreciates the beauty of the cosmos, we help you find the darkest skies 
                within your reach.
              </p>

              <h3 className="text-3xl font-semibold text-yellow-300 mt-12">How It Works</h3>
              
              <div className="grid md:grid-cols-2 gap-8 mt-6">
                <div className="bg-purple-900/30 p-6 rounded-lg">
                  <h4 className="text-2xl font-semibold text-purple-300 mb-3">🗺️ Smart Location Finding</h4>
                  <p>
                    Enter your location and how far you're willing to travel. Our algorithm 
                    analyzes light pollution data, accessibility, and nearby amenities to 
                    recommend the best spots.
                  </p>
                </div>

                <div className="bg-purple-900/30 p-6 rounded-lg">
                  <h4 className="text-2xl font-semibold text-purple-300 mb-3">🌌 Celestial Body Tracking</h4>
                  <p>
                    Discover which planets, constellations, and deep-sky objects are visible 
                    at your chosen date and time. Plan your observations around the best viewing 
                    windows for specific celestial bodies.
                  </p>
                </div>

                <div className="bg-purple-900/30 p-6 rounded-lg">
                  <h4 className="text-2xl font-semibold text-purple-300 mb-3">📍 Curated Recommendations</h4>
                  <p>
                    Discover parks, campgrounds, and designated dark sky areas that offer 
                    the best viewing experiences, complete with ratings and reviews.
                  </p>
                </div>

                <div className="bg-purple-900/30 p-6 rounded-lg">
                  <h4 className="text-2xl font-semibold text-purple-300 mb-3">🔍 Light Pollution Maps</h4>
                  <p>
                    Visualize light pollution levels with interactive heatmaps to understand 
                    exactly where to find the darkest skies in your area.
                  </p>
                </div>
              </div>

              <h3 className="text-3xl font-semibold text-yellow-300 mt-12">Why Dark Skies Matter</h3>
              <p>
                Over 80% of the world's population lives under light-polluted skies, and 
                one-third of humanity can no longer see the Milky Way from their homes. 
                Dark sky locations offer a window into the beauty of the cosmos, presenting
                a canvas of thousands of stars, nebulae, and galaxies. These pristine viewing 
                areas aren't just about astronomy; they're about reconnecting with nature and 
                experiencing the profound sense of wonder that comes from understanding our 
                place in the universe.
              </p>

              <div className="text-center mt-16 mb-20">
                <Link 
                  href="/map"
                  className="px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white text-2xl font-bold rounded-lg shadow-lg transition-all hover:scale-105 inline-block"
                >
                  Start Exploring →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .stars {
          background: 
            radial-gradient(2px 2px at 20px 30px, white, transparent),
            radial-gradient(2px 2px at 60px 70px, white, transparent),
            radial-gradient(1px 1px at 50px 50px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, white, transparent),
            radial-gradient(2px 2px at 90px 10px, white, transparent),
            radial-gradient(1px 1px at 150px 120px, white, transparent),
            radial-gradient(2px 2px at 180px 40px, white, transparent);
          background-size: 200px 200px;
          animation: twinkle 3s infinite;
        }

        .crawl-container {
          perspective: 600px;
          perspective-origin: 50% 100%;
        }

        .crawl-text {
          transform-origin: 50% 100%;
          animation: crawl 15s linear forwards;
        }

        @keyframes crawl {
          0% {
            transform: rotateX(15deg) translateY(100vh);
          }
          100% {
            transform: rotateX(15deg) translateY(-50vh);
            opacity: 1;
          }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}