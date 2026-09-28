import { useAuth } from '../context/AuthContext'

export function useRole() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'worker'

  return {
    role,
    isAdmin: role === 'admin',
    isOwner: role === 'owner',
    isManager: role === 'manager',
    isWorker: role === 'worker',
    canAccess: (roles) => roles.includes(role),
  }
}
