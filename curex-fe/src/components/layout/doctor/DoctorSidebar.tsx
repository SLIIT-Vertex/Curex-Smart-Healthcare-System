import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  CalendarClock,
  ClipboardList,
  Video,
  Settings,
  LogOut,
} from 'lucide-react'

const LOGO_SRC = '/logo.svg'

const navLinks = [
  { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctor/profile', icon: User, label: 'Profile' },
  { to: '/doctor/availability', icon: CalendarClock, label: 'Availability' },
  { to: '/doctor/telemedicine', icon: Video, label: 'Telemedicine' },
  { to: '/doctor/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
] as const

interface DoctorSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function DoctorSidebar({ isOpen = true, onClose }: DoctorSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 transform border-r border-text-secondary/10
          bg-surface shadow-card transition-transform duration-200 ease-out
          lg:static lg:z-auto lg:h-dvh lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Doctor navigation"
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-text-secondary/10 px-5">
            <img
              src={LOGO_SRC}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
              decoding="async"
            />
            <span className="text-lg font-semibold tracking-tight text-primary">
              Curex
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Doctor">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'sidebar-link--active bg-primary-light/10 text-primary'
                      : 'text-text-secondary hover:bg-primary-light/5 hover:text-primary'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}

            <div className="my-2 border-t border-text-secondary/10" />

            <span
              className="sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary"
              title="Coming soon"
            >
              <Settings className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              Settings
            </span>
            <button
              type="button"
              className="sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary"
              onClick={() => {
                // TODO: logout from AuthContext (M1)
              }}
            >
              <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              Sign out
            </button>
          </nav>

          {/* Bottom profile card */}
          <div className="shrink-0 border-t border-text-secondary/10 p-4">
            <div className="rounded-xl bg-background px-4 py-3">
              <p className="text-sm font-semibold text-primary">
                Dr. Silva
              </p>
              <p className="text-xs text-text-secondary">Cardiologist</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
