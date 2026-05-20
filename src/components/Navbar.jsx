import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-semibold text-indigo-600">CMS</Link>
        <Link to="/contracts" className="text-sm text-gray-600 hover:text-gray-900">Contracts</Link>
        <Link to="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
        <Link to="/templates" className="text-sm text-gray-600 hover:text-gray-900">Templates</Link>
        {user?.role === 'admin' && (
          <Link to="/audit" className="text-sm text-gray-600 hover:text-gray-900">Audit</Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {user?.full_name || user?.email}
          <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
            {user?.role}
          </span>
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
