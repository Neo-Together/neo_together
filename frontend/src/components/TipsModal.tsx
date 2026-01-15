import { useState } from 'react'

interface Tip {
  icon: string
  title: string
  description: string
  category: 'location' | 'matching' | 'safety' | 'general'
}

const TIPS: Tip[] = [
  {
    icon: '🧋',
    title: 'Bubble Tea Spots',
    description: 'If you see people selecting a bubble tea store, they\'re likely looking for someone to enjoy bubble tea with!',
    category: 'location',
  },
  {
    icon: '⚽',
    title: 'Sports Fields',
    description: 'People at soccer fields, basketball courts, or other sports venues are usually looking for teammates or workout buddies.',
    category: 'location',
  },
  {
    icon: '☕',
    title: 'Coffee Shops',
    description: 'Coffee shops are perfect for casual conversations. Great for first meetups or study sessions.',
    category: 'location',
  },
  {
    icon: '📚',
    title: 'Libraries & Bookstores',
    description: 'Quiet spots for book lovers and studious types. Perfect if you prefer calm environments.',
    category: 'location',
  },
  {
    icon: '🌳',
    title: 'Parks',
    description: 'Parks are great for walks, picnics, or outdoor activities. Perfect for relaxed meetups.',
    category: 'location',
  },
  {
    icon: '🔔',
    title: 'Check Regularly',
    description: 'Check the app regularly! People might express interest in meeting you, and groups might be forming at your favorite spots.',
    category: 'general',
  },
  {
    icon: '⏰',
    title: 'Time Overlap Matters',
    description: 'Look for the "Times match!" badge - it means you and the other person will be available at the same time.',
    category: 'matching',
  },
  {
    icon: '🎯',
    title: 'Shared Interests',
    description: 'People with more shared interests (shown in orange) are more likely to have common ground for conversation.',
    category: 'matching',
  },
  {
    icon: '👥',
    title: 'Groups Form Naturally',
    description: 'When two people match, they form a group. Others can request to join, making it easy to meet multiple like-minded people.',
    category: 'general',
  },
  {
    icon: '📍',
    title: 'Add Multiple Spots',
    description: 'Add several spots where you hang out regularly. This increases your chances of finding people with similar routines.',
    category: 'general',
  },
  {
    icon: '🛡️',
    title: 'Meet in Public',
    description: 'Always meet in public places for the first time. Coffee shops and parks are great choices.',
    category: 'safety',
  },
  {
    icon: '📱',
    title: 'Tell Someone',
    description: 'Let a friend or family member know where you\'re going and who you\'re meeting.',
    category: 'safety',
  },
]

const CATEGORY_LABELS = {
  location: { label: 'Location Tips', color: 'bg-blue-100 text-blue-700' },
  matching: { label: 'Matching Tips', color: 'bg-purple-100 text-purple-700' },
  safety: { label: 'Safety Tips', color: 'bg-red-100 text-red-700' },
  general: { label: 'General Tips', color: 'bg-green-100 text-green-700' },
}

export default function TipsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<Tip['category'] | 'all'>('all')

  if (!isOpen) return null

  const filteredTips = selectedCategory === 'all'
    ? TIPS
    : TIPS.filter((tip) => tip.category === selectedCategory)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">💡 Tips & Hints</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {(Object.keys(CATEGORY_LABELS) as Tip['category'][]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === cat
                    ? CATEGORY_LABELS[cat].color.replace('100', '500').replace('700', 'white')
                    : `${CATEGORY_LABELS[cat].color} hover:opacity-80`
                }`}
              >
                {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Tips List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTips.map((tip, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800">{tip.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tip.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${CATEGORY_LABELS[tip.category].color}`}>
                    {CATEGORY_LABELS[tip.category].label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium rounded-lg"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
