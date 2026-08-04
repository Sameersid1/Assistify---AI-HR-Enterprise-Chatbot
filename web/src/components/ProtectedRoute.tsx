import { Navigate, useLocation } from "react-router-dom"
import { useAuth, type UserRole } from "@/context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If given, the user's role must be in this list. Omit to allow any signed-in user. */
  roles?: UserRole[]
}

/**
 * Client-side route guard.
 *
 * This is UX, not security — it stops someone wandering into a page they can't
 * use. The real enforcement is server-side (requireAuth + requireRole on every
 * route, plus the tenancy filter). Never rely on this alone.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Wait for the session restore to finish, or we'd bounce a signed-in user to /login.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
