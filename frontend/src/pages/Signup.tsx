import { useState } from 'react'
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
  const [selectedInterests, setSelectedInterests] = useState<number[]>([])
  const [privateKey, setPrivateKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch interests from API
  const { data: interests = [], isLoading: loadingInterests } = useQuery<Interest[]>({
    queryKey: ['interests'],
    queryFn: async () => {
      const res = await fetch('/api/interests')
      if (!res.ok) throw new Error('Failed to load interests')
      return res.json()
    },
  })

  // Group interests by category
  const interestsByCategory = interests.reduce((acc, interest) => {
    const category = interest.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

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
          interest_ids: selectedInterests,
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

  const toggleInterest = (id: number) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
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
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Choose from approved names"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be from the approved names list for privacy
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Birth Year</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  min="1900"
                  max="2010"
                  required
                />
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
                disabled={!firstName || !birthYear || !gender}
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
                  Select your interests (at least 1)
                </label>
                {loadingInterests ? (
                  <p className="text-gray-500">Loading interests...</p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {Object.entries(interestsByCategory).map(([category, categoryInterests]) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          {category}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryInterests.map((interest) => (
                            <button
                              key={interest.id}
                              type="button"
                              onClick={() => toggleInterest(interest.id)}
                              className={`p-2 rounded-lg border text-sm text-left ${
                                selectedInterests.includes(interest.id)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {interest.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
