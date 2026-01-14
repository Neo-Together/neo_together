import { useState, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

interface Location {
  name: string
  address: string
  latitude: number
  longitude: number
  placeId?: string
}

interface LocationPickerProps {
  value?: Location | null
  onChange: (location: Location | null) => void
  placeholder?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '8px',
}

const defaultCenter = {
  lat: 40.7128, // NYC default
  lng: -74.006,
}

export default function LocationPicker({
  value,
  onChange,
  placeholder = 'Search for a place...',
}: LocationPickerProps) {
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value?.name || '')

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const onLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac)
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace()

      if (place.geometry?.location) {
        const location: Location = {
          name: place.name || place.formatted_address || '',
          address: place.formatted_address || '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          placeId: place.place_id,
        }
        setInputValue(location.name)
        onChange(location)
      }
    }
  }, [autocomplete, onChange])

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        // For map clicks without a place, use coordinates
        const location: Location = {
          name: 'Custom Location',
          address: `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`,
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
        }
        setInputValue('Custom Location')
        onChange(location)
      }
    },
    [onChange]
  )

  const clearLocation = () => {
    setInputValue('')
    onChange(null)
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading Google Maps. Check your API key.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg animate-pulse">
        Loading maps...
      </div>
    )
  }

  const center = value
    ? { lat: value.latitude, lng: value.longitude }
    : defaultCenter

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['establishment', 'geocode'],
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full border rounded-lg p-2 pr-10"
          />
        </Autocomplete>
        {inputValue && (
          <button
            type="button"
            onClick={clearLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Selected location info */}
      {value && (
        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
          <strong>{value.name}</strong>
          {value.address !== value.name && (
            <p className="text-xs text-gray-500">{value.address}</p>
          )}
        </div>
      )}

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={value ? 15 : 12}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {value && (
          <Marker position={{ lat: value.latitude, lng: value.longitude }} />
        )}
      </GoogleMap>

      <p className="text-xs text-gray-500">
        Search for a business or click on the map to select a location
      </p>
    </div>
  )
}
