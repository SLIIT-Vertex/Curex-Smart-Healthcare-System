/** Public asset from `curex-fe/public/logo.svg` */
const LOGO_SRC = '/logo.svg'

const navLinks = [
  { href: '#features', label: 'What we offer' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Who it’s for' },
] as const

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-text-secondary/10 bg-surface/95 backdrop-blur-md"
      style={{ boxShadow: 'var(--shadow-header)' }}
    >
      <div className="layout-content flex h-16 items-center justify-between gap-4 sm:h-[4.25rem]">
        <a
          href="#get-started"
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
        </a>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Primary"
        >
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
          <a
            href="#sign-in"
            className="link-subtle hidden text-sm font-medium no-underline sm:inline"
          >
            Sign in
          </a>
          <a href="#get-started" className="btn-primary text-xs sm:text-sm">
            Get started
          </a>
        </div>
      </div>
    </header>
  )
}
