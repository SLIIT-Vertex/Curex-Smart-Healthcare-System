import { Link } from 'react-router-dom'
import { useIsAuthenticated, useRole, useAuthActions } from '../../store/hooks'
import { ROLE_HOME } from '../auth/ProtectedRoute'

const LOGO_SRC = '/logo.svg'

const navLinks = [
  { href: '#features', label: 'What we offer' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Who it\u2019s for' },
] as const

export function Header() {
  const isAuthenticated = useIsAuthenticated()
  const role = useRole()
  const { logout } = useAuthActions()

  const dashboardPath = role ? ROLE_HOME[role] : '/patient/dashboard'

  return (
    <header
      className="sticky top-0 z-50 border-b border-text-secondary/10 bg-surface/95 backdrop-blur-md"
      style={{ boxShadow: 'var(--shadow-header)' }}
    >
      <div className="layout-content flex h-16 items-center justify-between gap-4 sm:h-[4.25rem]">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-primary no-underline"
          aria-label="Curex — Home"
        >
          <img
            src={LOGO_SRC}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
            decoding="async"
          />
          <span className="text-lg">Curex</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="link-subtle text-sm font-medium no-underline"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="link-subtle hidden text-sm font-medium no-underline sm:inline">
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn-secondary text-xs sm:text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="link-subtle hidden text-sm font-medium no-underline sm:inline">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-xs sm:text-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
