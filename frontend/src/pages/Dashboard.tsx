import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { useAuthStore } from '../stores/auth'

const libraries: ('places')[] = ['places']

interface Interest {
  id: number
  name: string
  category: string | null
}

interface User {
  id: string
  first_name: string
  birth_year: number
  gender: string
  is_available: boolean
  interests: Interest[]
}

interface AvailabilitySlot {
  id: number
  location_name: string
  latitude: number
  longitude: number
  radius_meters: number | null
  time_start: string
  time_end: string
  repeat_days: number[]
  is_active: boolean
}

interface LocationWithPeople {
  availability: AvailabilitySlot
  people_count: number
}

interface PersonAtLocation {
  user: User
  availability: AvailabilitySlot
  shared_interests: string[]
  times_overlap: boolean
  overlapping_times: { days: number[]; start: string; end: string }[] | null
}

interface Match {
  id: number
  user1_id: string
  user2_id: string
  availability_id: number
  status: string
  proposed_datetime: string | null
  proposed_by_id: string | null
  confirmed_at: string | null
  created_at: string
  other_user: User
  availability: AvailabilitySlot
}

interface NewSpot {
  lat: number
  lng: number
  address: string
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '16px',
}

const defaultCenter = { lat: 40.7128, lng: -74.006 }
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Dashboard() {
  const { token, user, updateUser, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()

  // UI State
  const [selectedLocation, setSelectedLocation] = useState<AvailabilitySlot | null>(null)
  const [selectedMySlot, setSelectedMySlot] = useState<AvailabilitySlot | null>(null)
  const [editingInterests, setEditingInterests] = useState(false)
  const [interestSearch, setInterestSearch] = useState('')
  const [proposingFor, setProposingFor] = useState<number | null>(null)
  const [proposedTime, setProposedTime] = useState('')

  // New spot state (when clicking map)
  const [newSpot, setNewSpot] = useState<NewSpot | null>(null)
  const [newSpotDate, setNewSpotDate] = useState('')
  const [newSpotTimeStart, setNewSpotTimeStart] = useState('09:00')
  const [newSpotTimeEnd, setNewSpotTimeEnd] = useState('17:00')
  const [newSpotRepeat, setNewSpotRepeat] = useState(false)
  const [newSpotRepeatDays, setNewSpotRepeatDays] = useState<number[]>([])

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Fetch all interests for editing
  const { data: allInterests = [] } = useQuery<Interest[]>({
    queryKey: ['interests'],
    queryFn: async () => {
      const res = await fetch('/api/interests')
      if (!res.ok) throw new Error('Failed to load interests')
      return res.json()
    },
  })

  // Fetch my availability slots
  const { data: mySlots = [] } = useQuery<AvailabilitySlot[]>({
    queryKey: ['availability'],
    queryFn: async () => {
      const res = await fetch('/api/availability', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load availability')
      return res.json()
    },
  })

  // Fetch locations with people (others)
  const { data: locations = [] } = useQuery<LocationWithPeople[]>({
    queryKey: ['discover-locations'],
    queryFn: async () => {
      const res = await fetch('/api/discover/locations', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load locations')
      return res.json()
    },
  })

  // Fetch people at selected location
  const { data: people = [], isLoading: loadingPeople } = useQuery<PersonAtLocation[]>({
    queryKey: ['discover-people', selectedLocation?.id],
    queryFn: async () => {
      if (!selectedLocation) return []
      const res = await fetch(`/api/discover/locations/${selectedLocation.id}/people`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load people')
      return res.json()
    },
    enabled: !!selectedLocation,
  })

  // Fetch matches
  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await fetch('/api/discover/matches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load matches')
      return res.json()
    },
  })

  // Fetch sent interests
  const { data: sentInterests = [] } = useQuery<{ target_id: string; availability_id: number }[]>({
    queryKey: ['sent-interests'],
    queryFn: async () => {
      const res = await fetch('/api/discover/interests/sent', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      return res.json()
    },
  })

  // Mutations
  const expressInterest = useMutation({
    mutationFn: async ({ targetId, availabilityId }: { targetId: string; availabilityId: number }) => {
      const res = await fetch('/api/discover/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_id: targetId, availability_id: availabilityId }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sent-interests'] })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      if (data.mutual_match) {
        alert("It's a match! You both want to meet! Check your connections below.")
      }
    },
  })

  const createAvailability = useMutation({
    mutationFn: async (data: {
      location_name: string
      latitude: number
      longitude: number
      time_start: string
      time_end: string
      repeat_days: number[]
    }) => {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['discover-locations'] })
      setNewSpot(null)
      setNewSpotDate('')
      setNewSpotRepeat(false)
      setNewSpotRepeatDays([])
    },
  })

  const proposeTime = useMutation({
    mutationFn: async ({ matchId, datetime }: { matchId: number; datetime: string }) => {
      const res = await fetch(`/api/discover/matches/${matchId}/propose-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proposed_datetime: datetime }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setProposingFor(null)
      setProposedTime('')
    },
  })

  const confirmTime = useMutation({
    mutationFn: async (matchId: number) => {
      const res = await fetch(`/api/discover/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const deleteSlot = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/availability/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['discover-locations'] })
      setSelectedMySlot(null)
    },
  })

  // Handle map click to add new spot
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return

    const lat = e.latLng.lat()
    const lng = e.latLng.lng()

    // Reverse geocode to get address
    const geocoder = new google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      const address = response.results[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`

      setNewSpot({ lat, lng, address })
      setSelectedLocation(null)
      setSelectedMySlot(null)
    } catch {
      setNewSpot({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
    }
  }, [])

  const handleSaveSpot = () => {
    if (!newSpot) return

    // Get day of week from selected date for repeat_days
    let repeatDays = newSpotRepeatDays
    if (!newSpotRepeat && newSpotDate) {
      const date = new Date(newSpotDate)
      const dayOfWeek = (date.getDay() + 6) % 7 // Convert Sun=0 to Mon=0
      repeatDays = [dayOfWeek]
    }

    createAvailability.mutate({
      location_name: newSpot.address,
      latitude: newSpot.lat,
      longitude: newSpot.lng,
      time_start: newSpotTimeStart,
      time_end: newSpotTimeEnd,
      repeat_days: repeatDays,
    })
  }

  const toggleRepeatDay = (day: number) => {
    setNewSpotRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // Filter interests for search
  const filteredInterests = useMemo(() => {
    if (!interestSearch.trim()) return allInterests
    return allInterests.filter((i) =>
      i.name.toLowerCase().includes(interestSearch.toLowerCase())
    )
  }, [interestSearch, allInterests])

  const hasExpressedInterest = (userId: string, availabilityId: number) => {
    return sentInterests.some(
      (i) => i.target_id === userId && i.availability_id === availabilityId
    )
  }

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Categorize matches
  const confirmedMatches = matches.filter((m) => m.status === 'confirmed')
  const pendingMatches = matches.filter((m) => m.status === 'pending' || m.status === 'time_proposed')

  // Map center
  const mapCenter = useMemo(() => {
    if (mySlots.length > 0) {
      return { lat: mySlots[0].latitude, lng: mySlots[0].longitude }
    }
    if (locations.length > 0) {
      return { lat: locations[0].availability.latitude, lng: locations[0].availability.longitude }
    }
    return defaultCenter
  }, [mySlots, locations])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Neo Together
          </h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {user.first_name[0]}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                Hey {user.first_name}! 👋
              </h2>
            </div>
            <label className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {user.is_available ? '🟢 Available' : '⚫ Away'}
              </span>
              <div
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                  user.is_available ? 'bg-green-400' : 'bg-gray-300'
                }`}
                onClick={async () => {
                  const res = await fetch('/api/users/me/availability', {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (res.ok) {
                    const data = await res.json()
                    updateUser({ is_available: data.is_available })
                  }
                }}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    user.is_available ? 'translate-x-6' : ''
                  }`}
                />
              </div>
            </label>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">✨ Your interests</h3>
              <button
                onClick={() => setEditingInterests(!editingInterests)}
                className="text-sm text-orange-500 hover:text-orange-600"
              >
                {editingInterests ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <span
                  key={interest.id}
                  className="bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {interest.name}
                </span>
              ))}
            </div>

            {/* Interest Editor */}
            {editingInterests && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="text"
                  value={interestSearch}
                  onChange={(e) => setInterestSearch(e.target.value)}
                  placeholder="Search interests..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3"
                />
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {filteredInterests.map((interest) => {
                    const isSelected = user.interests.some((i) => i.id === interest.id)
                    return (
                      <button
                        key={interest.id}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                        }`}
                        onClick={() => {
                          const newInterests = isSelected
                            ? user.interests.filter((i) => i.id !== interest.id)
                            : [...user.interests, interest]
                          updateUser({ interests: newInterests })
                        }}
                      >
                        {interest.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Map Section */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-gray-800 mb-2">📍 Your World</h3>
          <p className="text-sm text-gray-500 mb-4">
            Click anywhere on the map to add a spot where you hang out
          </p>

          {!isLoaded ? (
            <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-gray-500">Loading map...</span>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
              }}
            >
              {/* New spot marker (yellow) */}
              {newSpot && (
                <Marker
                  position={{ lat: newSpot.lat, lng: newSpot.lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: '#eab308',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                  }}
                />
              )}

              {/* My availability markers (green) */}
              {mySlots.map((slot) => (
                <Marker
                  key={`my-${slot.id}`}
                  position={{ lat: slot.latitude, lng: slot.longitude }}
                  onClick={() => {
                    setSelectedMySlot(slot)
                    setSelectedLocation(null)
                    setNewSpot(null)
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                  }}
                />
              ))}

              {/* Others' locations (blue with count) */}
              {locations.map((loc) => (
                <Marker
                  key={`other-${loc.availability.id}`}
                  position={{ lat: loc.availability.latitude, lng: loc.availability.longitude }}
                  onClick={() => {
                    setSelectedLocation(loc.availability)
                    setSelectedMySlot(null)
                    setNewSpot(null)
                  }}
                  label={{
                    text: String(loc.people_count),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 16,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                  }}
                />
              ))}

              {/* Info window for my slot */}
              {selectedMySlot && (
                <InfoWindow
                  position={{ lat: selectedMySlot.latitude, lng: selectedMySlot.longitude }}
                  onCloseClick={() => setSelectedMySlot(null)}
                >
                  <div className="p-2">
                    <h4 className="font-semibold text-green-700">Your spot</h4>
                    <p className="text-sm">{selectedMySlot.location_name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedMySlot.time_start} - {selectedMySlot.time_end}
                    </p>
                  </div>
                </InfoWindow>
              )}

              {/* Info window for others' location */}
              {selectedLocation && (
                <InfoWindow
                  position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                  onCloseClick={() => setSelectedLocation(null)}
                >
                  <div className="p-2">
                    <h4 className="font-semibold text-blue-700">{selectedLocation.location_name}</h4>
                    <p className="text-sm text-gray-600">
                      {people.length} {people.length === 1 ? 'person' : 'people'} here
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span> Your spots
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> People nearby
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span> New spot
            </span>
          </div>

          {/* New Spot Form */}
          {newSpot && (
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <h4 className="font-semibold text-gray-800 mb-2">📍 Add this spot</h4>
              <p className="text-sm text-gray-600 mb-4">{newSpot.address}</p>

              <div className="space-y-4">
                {/* Date picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    When will you be here?
                  </label>
                  <input
                    type="date"
                    value={newSpotDate}
                    onChange={(e) => setNewSpotDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Time range */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input
                      type="time"
                      value={newSpotTimeStart}
                      onChange={(e) => setNewSpotTimeStart(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="time"
                      value={newSpotTimeEnd}
                      onChange={(e) => setNewSpotTimeEnd(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2"
                    />
                  </div>
                </div>

                {/* Repeat option */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSpotRepeat}
                      onChange={(e) => setNewSpotRepeat(e.target.checked)}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-sm text-gray-700">Repeat weekly</span>
                  </label>

                  {newSpotRepeat && (
                    <div className="flex gap-2 mt-2">
                      {DAY_NAMES.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleRepeatDay(index)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            newSpotRepeatDays.includes(index)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSpot}
                    disabled={createAvailability.isPending || (!newSpotDate && !newSpotRepeat)}
                    className="flex-1 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-medium rounded-lg shadow hover:shadow-lg transition-shadow disabled:opacity-50"
                  >
                    {createAvailability.isPending ? 'Saving...' : '✓ Save this spot'}
                  </button>
                  <button
                    onClick={() => setNewSpot(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My Slots List */}
          {mySlots.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Your spots</h4>
              <div className="space-y-2">
                {mySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border-2 transition-colors ${
                      selectedMySlot?.id === slot.id
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{slot.location_name}</p>
                        <p className="text-sm text-gray-500">
                          {slot.time_start} - {slot.time_end} · {slot.repeat_days.map((d) => DAY_NAMES[d]).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSlot.mutate(slot.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* People at Selected Location */}
        {selectedLocation && (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">
                👥 People at {selectedLocation.location_name}
              </h3>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            {loadingPeople ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : people.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No one here right now
              </div>
            ) : (
              <div className="space-y-4">
                {people.map((person) => (
                  <div
                    key={`${person.user.id}-${person.availability.id}`}
                    className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {person.user.first_name}, {currentYear - person.user.birth_year}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {person.availability.time_start} - {person.availability.time_end}
                        </p>
                      </div>
                      {person.times_overlap && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          ⏰ Times match!
                        </span>
                      )}
                    </div>

                    {person.shared_interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {person.shared_interests.map((interest) => (
                          <span
                            key={interest}
                            className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    {hasExpressedInterest(person.user.id, person.availability.id) ? (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg"
                      >
                        ✓ Interest sent
                      </button>
                    ) : (
                      <button
                        onClick={() => expressInterest.mutate({
                          targetId: person.user.id,
                          availabilityId: person.availability.id,
                        })}
                        disabled={expressInterest.isPending}
                        className="w-full py-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium rounded-lg shadow hover:shadow-lg transition-shadow"
                      >
                        🤝 I'd like to meet!
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Matches Section */}
        {(confirmedMatches.length > 0 || pendingMatches.length > 0) && (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4">🤝 Your Connections</h3>

            {/* Confirmed */}
            {confirmedMatches.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-green-700 mb-3">📅 Upcoming Meetups</h4>
                <div className="space-y-3">
                  {confirmedMatches.map((match) => (
                    <div
                      key={match.id}
                      className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {match.other_user.first_name}, {currentYear - match.other_user.birth_year}
                          </p>
                          <p className="text-sm text-green-700">
                            {match.proposed_datetime && formatDateTime(match.proposed_datetime)}
                          </p>
                          <p className="text-sm text-gray-500">
                            📍 {match.availability.location_name}
                          </p>
                        </div>
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          Confirmed ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending */}
            {pendingMatches.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-700 mb-3">⏳ Pending</h4>
                <div className="space-y-3">
                  {pendingMatches.map((match) => {
                    const isPending = match.status === 'pending'
                    const isMyProposal = match.proposed_by_id === user?.id

                    return (
                      <div
                        key={match.id}
                        className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {match.other_user.first_name}, {currentYear - match.other_user.birth_year}
                            </p>
                            <p className="text-sm text-gray-500">
                              📍 {match.availability.location_name}
                            </p>
                            {match.proposed_datetime && (
                              <p className="text-sm text-orange-600">
                                Proposed: {formatDateTime(match.proposed_datetime)}
                              </p>
                            )}
                          </div>
                        </div>

                        {isPending ? (
                          proposingFor === match.id ? (
                            <div className="space-y-2">
                              <input
                                type="datetime-local"
                                value={proposedTime}
                                onChange={(e) => setProposedTime(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (proposedTime) {
                                      proposeTime.mutate({
                                        matchId: match.id,
                                        datetime: new Date(proposedTime).toISOString(),
                                      })
                                    }
                                  }}
                                  disabled={!proposedTime}
                                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                                >
                                  Propose
                                </button>
                                <button
                                  onClick={() => setProposingFor(null)}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setProposingFor(match.id)}
                              className="w-full py-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-lg"
                            >
                              📅 Propose a time
                            </button>
                          )
                        ) : isMyProposal ? (
                          <p className="text-sm text-orange-600">
                            Waiting for {match.other_user.first_name} to confirm...
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmTime.mutate(match.id)}
                              className="flex-1 py-2 bg-green-500 text-white rounded-lg"
                            >
                              ✓ Confirm
                            </button>
                            <button
                              onClick={() => setProposingFor(match.id)}
                              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg"
                            >
                              Different time
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {mySlots.length === 0 && locations.length === 0 && matches.length === 0 && (
          <section className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-4xl mb-4">🌟</p>
            <h3 className="font-bold text-gray-800 mb-2">Ready to meet people?</h3>
            <p className="text-gray-500 mb-4">
              Click anywhere on the map to add a spot where you like to hang out!
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
