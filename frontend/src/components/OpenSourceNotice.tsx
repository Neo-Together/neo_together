import { useState } from 'react'

export default function OpenSourceNotice() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔓</span>
          <span className="font-medium text-gray-800">Open Source</span>
        </div>
        <span className="text-gray-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            <strong>Neo Together is open source software.</strong> This means our entire codebase
            is publicly available for anyone to view, audit, and contribute to.
          </p>
          <p>
            <strong>What this means for you:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Full transparency - you can see exactly how your data is handled</li>
            <li>Community-driven development - anyone can suggest improvements</li>
            <li>Security through openness - vulnerabilities can be spotted by anyone</li>
            <li>No hidden tracking or data collection</li>
          </ul>
          <p className="pt-2">
            <a
              href="https://github.com/your-repo/neo_together"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 underline"
            >
              View our source code on GitHub →
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
