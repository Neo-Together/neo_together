import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

interface Interest {
  id: number
  name: string
  category: string | null
}

export default function Signup() {
  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [interestInput, setInterestInput] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([])
  const [privateKey, setPrivateKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false)

  // Fetch approved names
  const { data: approvedNames = [] } = useQuery<string[]>({
    queryKey: ['approvedNames'],
    queryFn: async () => {
      const res = await fetch('/api/auth/approved-names')
      if (!res.ok) throw new Error('Failed to load approved names')
      return res.json()
    },
  })

  // Fetch interests from API
  const { data: interests = [], isLoading: loadingInterests } = useQuery<Interest[]>({
    queryKey: ['interests'],
    queryFn: async () => {
      const res = await fetch('/api/interests')
      if (!res.ok) throw new Error('Failed to load interests')
      return res.json()
    },
  })

  // Filter names based on input
  const filteredNames = useMemo(() => {
    if (!firstName.trim()) return []
    return approvedNames.filter((name) =>
      name.toLowerCase().startsWith(firstName.toLowerCase())
    )
  }, [firstName, approvedNames])

  // Filter interests based on input
  const filteredInterests = useMemo(() => {
    if (!interestInput.trim()) return []
    return interests.filter(
      (interest) =>
        interest.name.toLowerCase().includes(interestInput.toLowerCase()) &&
        !selectedInterests.some((s) => s.id === interest.id)
    )
  }, [interestInput, interests, selectedInterests])

  const handleSelectName = (name: string) => {
    setFirstName(name)
    setShowNameSuggestions(false)
  }

  // Check if current firstName is a valid approved name
  const isValidName = firstName && approvedNames.some((name) => name.toLowerCase() === firstName.toLowerCase())

  const handleSelectInterest = (interest: Interest) => {
    setSelectedInterests((prev) => [...prev, interest])
    setInterestInput('')
    setShowInterestSuggestions(false)
  }

  const handleRemoveInterest = (interestId: number) => {
    setSelectedInterests((prev) => prev.filter((i) => i.id !== interestId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedInterests.length < 1) {
      setError('Please select at least one interest')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          birth_year: parseInt(birthYear),
          gender,
          interest_ids: selectedInterests.map((i) => i.id),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Signup failed')
      }

      const data = await response.json()
      setPrivateKey(data.private_key)
      setStep(3) // Show private key
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (step === 3 && privateKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-green-600">Account Created!</h1>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <p className="font-bold text-yellow-800 mb-2">
              Save your private key now!
            </p>
            <p className="text-sm text-yellow-700 mb-4">
              This is the ONLY time you'll see it. You need it to log in.
            </p>
            <code className="block bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {privateKey}
            </code>
          </div>
          <Link
            to="/login"
            className="block w-full bg-blue-600 text-white py-2 rounded-lg text-center hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>
        <div className="mb-6 flex gap-2">
          <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Name</label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        setShowNameSuggestions(true)
                      }}
                      onFocus={() => setShowNameSuggestions(true)}
                      className="flex-1 border rounded-lg p-2"
                      placeholder="Start typing a name..."
                      autoComplete="off"
                    />
                    {firstName && (
                      <span className={`text-2xl ${isValidName ? 'text-green-500' : 'text-red-500'}`}>
                        {isValidName ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  {showNameSuggestions && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto">
                      {filteredNames.length > 0 ? (
                        filteredNames.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleSelectName(name)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-100"
                          >
                            {name}
                          </button>
                        ))
                      ) : firstName ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No names match "{firstName}"
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No suggestions yet. Start typing...
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  We're sorry if your name isn't in our list. We use this limited list to help prevent hate speech.
                </p>
                {firstName && !isValidName && (
                  <p className="text-xs text-red-600 mt-1">
                    This name is not in the approved list. Please select from the suggestions.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Birth Year</label>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 111 }, (_, i) => 2010 - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isValidName || !birthYear || !gender}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Add at least 1 interest (you can modifiy this later)
                </label>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => {
                      setInterestInput(e.target.value)
                      setShowInterestSuggestions(true)
                    }}
                    onFocus={() => setShowInterestSuggestions(true)}
                    className="w-full border rounded-lg p-2"
                    placeholder="Type an interest..."
                    autoComplete="off"
                    disabled={loadingInterests}
                  />
                  {showInterestSuggestions && filteredInterests.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto">
                      {filteredInterests.map((interest) => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => handleSelectInterest(interest)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-100"
                        >
                          {interest.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedInterests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Selected interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedInterests.map((interest) => (
                        <span
                          key={interest.id}
                          className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {interest.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(interest.id)}
                            className="hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {loadingInterests && <p className="text-gray-500 text-sm">Loading interests...</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedInterests.length < 1}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
