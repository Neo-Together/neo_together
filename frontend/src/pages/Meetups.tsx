import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../components/Layout'
import { useAuthStore } from '../stores/auth'

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
  interests: Interest[]
}

interface Availability {
  id: number
  location_name: string
  latitude: number
  longitude: number
  time_start: string
  time_end: string
  repeat_days: number[]
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
  availability: Availability
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Meetups() {
  const { token, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [proposingFor, setProposingFor] = useState<number | null>(null)
  const [proposedTime, setProposedTime] = useState('')

  // Fetch matches
  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await fetch('/api/discover/matches', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load matches')
      return res.json()
    },
  })

  // Propose time mutation
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
      if (!res.ok) throw new Error('Failed to propose time')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setProposingFor(null)
      setProposedTime('')
    },
  })

  // Confirm time mutation
  const confirmTime = useMutation({
    mutationFn: async (matchId: number) => {
      const res = await fetch(`/api/discover/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to confirm')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const currentYear = new Date().getFullYear()

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Separate matches by status
  const pendingMatches = matches.filter((m) => m.status === 'pending')
  const proposedMatches = matches.filter((m) => m.status === 'time_proposed')
  const confirmedMatches = matches.filter((m) => m.status === 'confirmed')

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Meetups</h1>

      {isLoading ? (
        <div className="text-gray-500 text-center py-8">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No matches yet!</p>
          <p className="text-sm">
            Browse people and express interest to get matches.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Confirmed meetups */}
          {confirmedMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-green-700">
                Confirmed Meetups
              </h2>
              <div className="space-y-3">
                {confirmedMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-green-50 border border-green-200 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {match.other_user.first_name},{' '}
                          {currentYear - match.other_user.birth_year}
                        </h3>
                        <p className="text-sm text-green-700">
                          {match.proposed_datetime && formatDateTime(match.proposed_datetime)}
                        </p>
                      </div>
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                        Confirmed
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      📍 {match.availability.location_name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending time confirmation */}
          {proposedMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-yellow-700">
                Waiting for Confirmation
              </h2>
              <div className="space-y-3">
                {proposedMatches.map((match) => {
                  const isMyProposal = match.proposed_by_id === user?.id

                  return (
                    <div
                      key={match.id}
                      className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {match.other_user.first_name},{' '}
                            {currentYear - match.other_user.birth_year}
                          </h3>
                          <p className="text-sm text-yellow-700">
                            Proposed: {match.proposed_datetime && formatDateTime(match.proposed_datetime)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        📍 {match.availability.location_name}
                      </p>

                      {isMyProposal ? (
                        <p className="text-sm text-yellow-600">
                          Waiting for {match.other_user.first_name} to confirm...
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmTime.mutate(match.id)}
                            disabled={confirmTime.isPending}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setProposingFor(match.id)}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                          >
                            Suggest different time
                          </button>
                        </div>
                      )}

                      {/* Time picker for counter-proposal */}
                      {proposingFor === match.id && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <input
                            type="datetime-local"
                            value={proposedTime}
                            onChange={(e) => setProposedTime(e.target.value)}
                            className="w-full border rounded p-2 mb-2"
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
                              disabled={!proposedTime || proposeTime.isPending}
                              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Propose
                            </button>
                            <button
                              onClick={() => setProposingFor(null)}
                              className="px-4 bg-gray-200 text-gray-700 py-2 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* New matches - need to pick time */}
          {pendingMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-blue-700">
                New Matches - Pick a Time!
              </h2>
              <div className="space-y-3">
                {pendingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-blue-50 border border-blue-200 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {match.other_user.first_name},{' '}
                          {currentYear - match.other_user.birth_year}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Matched {new Date(match.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        New Match!
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      📍 {match.availability.location_name}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Available: {match.availability.time_start} - {match.availability.time_end}
                      {' · '}
                      {match.availability.repeat_days.map((d) => DAY_NAMES[d]).join(', ')}
                    </p>

                    {/* Interests */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {match.other_user.interests.slice(0, 5).map((interest) => (
                        <span
                          key={interest.id}
                          className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                        >
                          {interest.name}
                        </span>
                      ))}
                    </div>

                    {proposingFor === match.id ? (
                      <div className="p-3 bg-white rounded border">
                        <p className="text-sm text-gray-600 mb-2">
                          Pick a time to meet:
                        </p>
                        <input
                          type="datetime-local"
                          value={proposedTime}
                          onChange={(e) => setProposedTime(e.target.value)}
                          className="w-full border rounded p-2 mb-2"
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
                            disabled={!proposedTime || proposeTime.isPending}
                            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {proposeTime.isPending ? 'Sending...' : 'Propose Time'}
                          </button>
                          <button
                            onClick={() => setProposingFor(null)}
                            className="px-4 bg-gray-200 text-gray-700 py-2 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setProposingFor(match.id)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      >
                        Propose a time to meet
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Layout>
  )
}
