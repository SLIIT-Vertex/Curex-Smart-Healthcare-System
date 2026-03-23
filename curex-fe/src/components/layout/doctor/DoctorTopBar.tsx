import { Menu, Search, Bell } from 'lucide-react'

interface DoctorTopBarProps {
  onMenuClick?: () => void
}

export function DoctorTopBar({ onMenuClick }: DoctorTopBarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-text-secondary/10 bg-surface px-4 shadow-sm lg:px-6"
      style={{ boxShadow: 'var(--shadow-header)' }}
    >
      {/* Hamburger (mobile only) */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-light/10 hover:text-primary lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {/* Search (desktop) */}
      <div className="hidden flex-1 max-w-md lg:block">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            strokeWidth={1.5}
          />
          <input
            type="search"
            placeholder="Search patients, appointments…"
            className="w-full rounded-xl border border-text-secondary/20 bg-background py-2.5 pl-10 pr-4 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right side: notifications + avatar */}
      <div className="flex flex-1 items-center justify-end gap-2 lg:flex-initial">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-light/10 hover:text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} />
        </button>

        {/* Avatar - TODO: from auth or doctor profile */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light/20 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          DS
        </div>
      </div>
    </header>
  )
}
