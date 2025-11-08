'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Show button after animation completes (15 seconds) when text is in final position
    setTimeout(() => setShowButton(true), 15000)
  }, [])

  return (
    <div className="min-h-[300vh] bg-[#1f2230] relative">
      {/* Stars background */}
      <div className="fixed inset-0 stars"></div>
      
      {/* Star Wars scroll container */}
      <div className="crawl-container fixed inset-0 flex items-center justify-center overflow-hidden">
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
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
        <Link 
          href="/map"
          className={`px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold rounded-lg shadow-lg transition-all hover:scale-105 inline-block ${
            showButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ transition: 'opacity 2s ease-in' }}
        >
          Find Your Spot
        </Link>
      </div>

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