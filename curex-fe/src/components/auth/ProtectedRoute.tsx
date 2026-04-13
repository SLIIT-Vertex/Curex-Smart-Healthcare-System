import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsAuthenticated, useRole } from "../../store/hooks";
import type { Role } from "../../types/auth";
import { ROLE_HOME } from "./roleHome";

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If omitted, any authenticated user is allowed. */
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const role = useRole();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Authenticated but wrong role — redirect to their home
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return <Outlet />;
}
