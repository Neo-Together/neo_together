import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useEffect } from 'react'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)

  // Login mode: 'email' or 'key'
  const [mode, setMode] = useState<'email' | 'key'>('email')

  // Email login state
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Private key login state
  const [firstName, setFirstName] = useState('')
  const [privateKey, setPrivateKey] = useState('')

  // Common state
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for magic link token in URL
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      verifyMagicLink(token)
    }
  }, [searchParams])

  const verifyMagicLink = async (token: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Invalid or expired link')
      }

      const { access_token } = await response.json()

      // Fetch user profile
      const userResponse = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const user = await userResponse.json()

      setAuth(access_token, user)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to send login link')
      }

      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, private_key: privateKey }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Login failed')
      }

      const { access_token } = await response.json()

      // Fetch user profile
      const userResponse = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const user = await userResponse.json()

      setAuth(access_token, user)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state if verifying magic link
  if (searchParams.get('token') && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Logging you in...</p>
        </div>
      </div>
    )
  }

  // Show email sent confirmation
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Check your email!</h1>
          <p className="text-gray-600 mb-6">
            We sent a login link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to log in. The link expires in 15 minutes.
          </p>
          <button
            onClick={() => setEmailSent(false)}
            className="text-orange-500 hover:text-orange-600"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome back!</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>
        )}

        {/* Mode Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('email')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'email'
                ? 'bg-white text-gray-800 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => setMode('key')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'key'
                ? 'bg-white text-gray-800 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Private Key
          </button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium rounded-lg shadow hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send login link'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We'll email you a magic link for password-free sign in
            </p>
          </form>
        ) : (
          <form onSubmit={handleKeyLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Private Key
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Enter your private key"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium rounded-lg shadow hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-500 hover:text-orange-600 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
