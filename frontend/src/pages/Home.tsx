import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import iconImage from '../assets/icon.jpg'

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${iconImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Semi-transparent overlay for readability */}
      <div className="absolute inset-0 bg-white/70" />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Neo Together</h1>
        <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
          Meet people around you with similar interests, on your terms.
        </p>

        {isAuthenticated ? (
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/app"
              className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              Open App ✨
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/signup"
              className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow text-center"
            >
              Get Started ✨
            </Link>
            <Link
              to="/login"
              className="bg-white/80 text-gray-700 px-8 py-3 rounded-full font-medium shadow hover:shadow-lg transition-shadow text-center"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
