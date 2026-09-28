import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleHomePages = {
  admin: '/',
  owner: '/',
  manager: '/',
  worker: '/maize',
}

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={roleHomePages[profile.role] ?? '/maize'} replace />
  }

  return children
}
