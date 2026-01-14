import { useAuthStore } from '../stores/auth'
import Layout from '../components/Layout'

export default function Profile() {
  const { user, updateUser } = useAuthStore()

  if (!user) return null

  const currentYear = new Date().getFullYear()
  const age = currentYear - user.birth_year

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {user.first_name[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.first_name}</h2>
              <p className="text-gray-500">
                {age} years old · {user.gender}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-2">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <span
                key={interest.id}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {interest.name}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span>Available for meetups</span>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                user.is_available ? 'bg-green-500' : 'bg-gray-300'
              }`}
              onClick={() => updateUser({ is_available: !user.is_available })}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  user.is_available ? 'translate-x-6' : ''
                }`}
              />
            </div>
          </label>
        </div>
      </div>
    </Layout>
  )
}
