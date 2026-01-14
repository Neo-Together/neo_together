import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../components/Layout'
import AvailabilityForm from '../components/AvailabilityForm'
import { useAuthStore } from '../stores/auth'

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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Availability() {
  const queryClient = useQueryClient()
  const { token, user, updateUser } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null)

  // Fetch availability slots
  const { data: slots = [], isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ['availability'],
    queryFn: async () => {
      const res = await fetch('/api/availability', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load availability')
      return res.json()
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<AvailabilitySlot, 'id' | 'is_active'>) => {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to create')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      setShowForm(false)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<AvailabilitySlot>
    }) => {
      const res = await fetch(`/api/availability/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      setEditingSlot(null)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/availability/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })

  // Toggle global availability
  const toggleGlobalAvailability = async () => {
    const res = await fetch('/api/users/me/availability', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      updateUser({ is_available: data.is_available })
    }
  }

  // Toggle slot active status
  const toggleSlotActive = (slot: AvailabilitySlot) => {
    updateMutation.mutate({
      id: slot.id,
      data: { is_active: !slot.is_active },
    })
  }

  const handleCreate = async (
    data: Omit<AvailabilitySlot, 'id' | 'is_active'>
  ) => {
    await createMutation.mutateAsync(data)
  }

  const handleUpdate = async (
    data: Omit<AvailabilitySlot, 'id' | 'is_active'>
  ) => {
    if (editingSlot) {
      await updateMutation.mutateAsync({ id: editingSlot.id, data })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('Delete this availability slot?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <Layout>
      {/* Header with global toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Availability</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600">
            {user?.is_available ? 'Available' : 'Unavailable'}
          </span>
          <div
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              user?.is_available ? 'bg-green-500' : 'bg-gray-300'
            }`}
            onClick={toggleGlobalAvailability}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                user?.is_available ? 'translate-x-6' : ''
              }`}
            />
          </div>
        </label>
      </div>

      {!user?.is_available && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
          You're currently set to unavailable. Others won't see you in their matches.
        </div>
      )}

      {/* Add new slot form */}
      {showForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-4">Add Availability</h2>
          <AvailabilityForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      {/* Edit slot form */}
      {editingSlot && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-4">Edit Availability</h2>
          <AvailabilityForm
            initialData={editingSlot}
            onSubmit={handleUpdate}
            onCancel={() => setEditingSlot(null)}
            isLoading={updateMutation.isPending}
          />
        </div>
      )}

      {/* Slots list */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-8">Loading...</div>
      ) : slots.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          <p className="mb-4">No availability slots yet.</p>
          <p className="text-sm">
            Add your first slot to start matching with others!
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className={`bg-white p-4 rounded-lg shadow ${
                !slot.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{slot.location_name}</h3>
                  <span className="text-sm text-gray-500">
                    {slot.time_start} - {slot.time_end}
                  </span>
                  {slot.radius_meters && (
                    <span className="text-xs text-gray-400 ml-2">
                      ±{slot.radius_meters}m
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSlotActive(slot)}
                    className={`text-xs px-2 py-1 rounded ${
                      slot.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {slot.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>

              {/* Days */}
              <div className="flex gap-1 mb-3">
                {DAY_LABELS.map((day, index) => (
                  <span
                    key={day}
                    className={`text-xs px-2 py-1 rounded ${
                      slot.repeat_days.includes(index)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => setEditingSlot(slot)}
                  className="text-blue-600 hover:underline"
                  disabled={!!editingSlot || showForm}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!showForm && !editingSlot && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
        >
          + Add Availability Slot
        </button>
      )}
    </Layout>
  )
}
