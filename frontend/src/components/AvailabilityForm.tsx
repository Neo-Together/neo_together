import { useState } from 'react'
import LocationPicker from './LocationPicker'

interface Location {
  name: string
  address: string
  latitude: number
  longitude: number
  placeId?: string
}

interface AvailabilitySlot {
  id?: number
  location_name: string
  latitude: number
  longitude: number
  radius_meters: number | null
  time_start: string
  time_end: string
  repeat_days: number[]
  is_active?: boolean
}

interface AvailabilityFormProps {
  initialData?: AvailabilitySlot
  onSubmit: (data: Omit<AvailabilitySlot, 'id' | 'is_active'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const DAYS = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

export default function AvailabilityForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AvailabilityFormProps) {
  const [location, setLocation] = useState<Location | null>(
    initialData
      ? {
          name: initialData.location_name,
          address: initialData.location_name,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
        }
      : null
  )
  const [timeStart, setTimeStart] = useState(initialData?.time_start || '09:00')
  const [timeEnd, setTimeEnd] = useState(initialData?.time_end || '17:00')
  const [repeatDays, setRepeatDays] = useState<number[]>(
    initialData?.repeat_days || []
  )
  const [radiusMeters, setRadiusMeters] = useState<number | ''>(
    initialData?.radius_meters || ''
  )
  const [error, setError] = useState('')

  const toggleDay = (day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!location) {
      setError('Please select a location')
      return
    }

    if (repeatDays.length === 0) {
      setError('Please select at least one day')
      return
    }

    if (timeStart >= timeEnd) {
      setError('End time must be after start time')
      return
    }

    try {
      await onSubmit({
        location_name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_meters: radiusMeters || null,
        time_start: timeStart,
        time_end: timeEnd,
        repeat_days: repeatDays.sort((a, b) => a - b),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>
      )}

      {/* Location picker */}
      <div>
        <label className="block text-sm font-medium mb-2">Location</label>
        <LocationPicker
          value={location}
          onChange={setLocation}
          placeholder="Search for a cafe, park, library..."
        />
      </div>

      {/* Optional radius */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Flexibility radius (optional)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={radiusMeters}
            onChange={(e) =>
              setRadiusMeters(e.target.value ? parseInt(e.target.value) : '')
            }
            placeholder="e.g., 500"
            min="100"
            max="5000"
            className="w-32 border rounded-lg p-2"
          />
          <span className="text-gray-500 text-sm">meters</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Allow matches within this distance of the location
        </p>
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
            className="w-full border rounded-lg p-2"
            required
          />
        </div>
      </div>

      {/* Days of week */}
      <div>
        <label className="block text-sm font-medium mb-2">Repeat on</label>
        <div className="flex gap-1">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                repeatDays.includes(day.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  )
}
