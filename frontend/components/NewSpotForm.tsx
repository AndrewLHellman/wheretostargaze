import { Button, Dialog, Spinner, TextField, VisuallyHidden } from '@radix-ui/themes'
import { FormEvent, useState } from 'react'
import { useSharedUserLocation } from './UserLocationProvider'

const btnBase =
  'px-4 py-2 rounded text-sm font-medium transition-all ' +
  'hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/60'

const NewSpotForm: React.FC = () => {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const { location: userLocation } = useSharedUserLocation()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userLocation?.lat,
          lon: userLocation?.lng,
        }),
      })
    } catch (error) {
      console.error('Failed to fetch spots:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='flex justify-between items-center gap-2' onSubmit={handleSubmit}>
      <input
        type='text'
        placeholder='Side path'
        className='
        w-full
        px-3 py-1
        text-white
        bg-gray-900
        border border-gray-600
        rounded-md
        focus:border-gray-400 focus:ring-1 focus:ring-gray-400
        placeholder-gray-500
        outline-none
        transition
        duration-150
        ease-in-out
      '
        onChange={e => setName(e.target.value)}
      />

      <button
        disabled={loading}
        type='submit'
        className={
          btnBase +
          ' ' +
          (loading ? 'bg-purple-600/80 text-white cursor-wait' : 'bg-gray-800 text-gray-100 hover:bg-gray-700') +
          'flex items-center justify-center gap-2'
        }
      >
        {loading ? (
          <>
            <Spinner />
            <span>Add Spot</span>
          </>
        ) : (
          'Submit'
        )}
      </button>
    </form>
  )
}

export default NewSpotForm
