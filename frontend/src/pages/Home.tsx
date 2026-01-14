import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Neo Together</h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
        Meet like-minded people in real life. No chat, no calls — just real connections.
      </p>

      {isAuthenticated ? (
        <div className="space-x-4">
          <Link
            to="/browse"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Browse People
          </Link>
          <Link
            to="/availability"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
          >
            Set Availability
          </Link>
        </div>
      ) : (
        <div className="space-x-4">
          <Link
            to="/signup"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
          >
            Login
          </Link>
        </div>
      )}
    </div>
  )
}
