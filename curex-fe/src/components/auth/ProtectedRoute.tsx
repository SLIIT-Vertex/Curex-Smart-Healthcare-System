import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useIsAuthenticated, useRole } from '../../store/hooks'
import type { Role } from '../../types/auth'

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If omitted, any authenticated user is allowed. */
  allowedRoles?: Role[]
}

/** Role → default redirect after login */
export const ROLE_HOME: Record<Role, string> = {
  PATIENT: '/patient/dashboard',
  DOCTOR: '/doctor/dashboard',
  ADMIN: '/admin/dashboard',
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated()
  const role = useRole()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Authenticated but wrong role — redirect to their home
    return <Navigate to={ROLE_HOME[role]} replace />
  }

  return <Outlet />
}
