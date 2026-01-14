import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import Layout from '../components/Layout'
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

interface Availability {
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
  availability: Availability
  people_count: number
}

interface PersonAtLocation {
  user: User
  availability: Availability
  shared_interests: string[]
  times_overlap: boolean
  overlapping_times: { days: number[]; start: string; end: string }[] | null
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
}

const defaultCenter = { lat: 40.7128, lng: -74.006 }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Browse() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedLocation, setSelectedLocation] = useState<Availability | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Fetch locations with people
  const { data: locations = [], isLoading: loadingLocations } = useQuery<LocationWithPeople[]>({
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

  // Fetch sent interests to know who we've already liked
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

  // Express interest mutation
  const expressInterest = useMutation({
    mutationFn: async ({ targetId, availabilityId }: { targetId: string; availabilityId: number }) => {
      const res = await fetch('/api/discover/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_id: targetId,
          availability_id: availabilityId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sent-interests'] })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      if (data.mutual_match) {
        alert("It's a match! You both expressed interest. Check your Meetups tab!")
      }
    },
  })

  const hasExpressedInterest = (userId: string, availabilityId: number) => {
    return sentInterests.some(
      (i) => i.target_id === userId && i.availability_id === availabilityId
    )
  }

  const handleExpressInterest = (person: PersonAtLocation) => {
    expressInterest.mutate({
      targetId: person.user.id,
      availabilityId: person.availability.id,
    })
  }

  const currentYear = new Date().getFullYear()

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Discover People</h1>

      {/* Map */}
      {!isLoaded ? (
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          Loading map...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={
            locations[0]
              ? { lat: locations[0].availability.latitude, lng: locations[0].availability.longitude }
              : defaultCenter
          }
          zoom={12}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {locations.map((loc) => (
            <Marker
              key={loc.availability.id}
              position={{
                lat: loc.availability.latitude,
                lng: loc.availability.longitude,
              }}
              onClick={() => setSelectedLocation(loc.availability)}
              label={{
                text: String(loc.people_count),
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          ))}

          {selectedLocation && (
            <InfoWindow
              position={{
                lat: selectedLocation.latitude,
                lng: selectedLocation.longitude,
              }}
              onCloseClick={() => setSelectedLocation(null)}
            >
              <div className="p-1">
                <h3 className="font-semibold">{selectedLocation.location_name}</h3>
                <p className="text-sm text-gray-600">
                  {people.length} {people.length === 1 ? 'person' : 'people'} available
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      {/* Instructions */}
      {!selectedLocation && (
        <p className="text-gray-500 text-center mt-4">
          Click on a marker to see who's available at that location
        </p>
      )}

      {/* People at selected location */}
      {selectedLocation && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              People at {selectedLocation.location_name}
            </h2>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>

          {loadingPeople ? (
            <div className="text-gray-500 text-center py-8">Loading...</div>
          ) : people.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No one available at this location right now
            </div>
          ) : (
            <div className="space-y-4">
              {people.map((person) => (
                <div
                  key={`${person.user.id}-${person.availability.id}`}
                  className="bg-white p-4 rounded-lg shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {person.user.first_name}, {currentYear - person.user.birth_year}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {person.availability.time_start} - {person.availability.time_end}
                        {' · '}
                        {person.availability.repeat_days.map((d) => DAY_NAMES[d]).join(', ')}
                      </p>
                    </div>
                    {person.times_overlap && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Times overlap!
                      </span>
                    )}
                  </div>

                  {/* Shared interests */}
                  {person.shared_interests.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Shared interests:</p>
                      <div className="flex flex-wrap gap-1">
                        {person.shared_interests.map((interest) => (
                          <span
                            key={interest}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All interests */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">All interests:</p>
                    <div className="flex flex-wrap gap-1">
                      {person.user.interests.map((interest) => (
                        <span
                          key={interest.id}
                          className={`text-xs px-2 py-1 rounded ${
                            person.shared_interests.includes(interest.name)
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {interest.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Overlapping times detail */}
                  {person.overlapping_times && person.overlapping_times.length > 0 && (
                    <div className="mb-4 p-2 bg-green-50 rounded text-sm">
                      <p className="font-medium text-green-800 mb-1">Your overlapping times:</p>
                      {person.overlapping_times.map((ot, i) => (
                        <p key={i} className="text-green-700">
                          {ot.days.map((d) => DAY_NAMES[d]).join(', ')}: {ot.start} - {ot.end}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Action button */}
                  {hasExpressedInterest(person.user.id, person.availability.id) ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-500 py-2 rounded-lg cursor-not-allowed"
                    >
                      Interest expressed ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExpressInterest(person)}
                      disabled={expressInterest.isPending}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {expressInterest.isPending ? 'Sending...' : "I'm interested in meeting"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loadingLocations && locations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No one has set their availability yet.</p>
          <p className="text-sm">Be the first! Go to Availability to add your spots.</p>
        </div>
      )}
    </Layout>
  )
}
