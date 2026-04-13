/** Public asset from `curex-fe/public/logo.svg` */
const LOGO_SRC = '/logo.svg'

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { href: '#features', label: 'What we offer' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#get-started', label: 'Get started' },
    ],
  },
  {
    title: 'Who it’s for',
    links: [
      { href: '#roles', label: 'Patients & families' },
      { href: '#roles', label: 'Doctors & clinics' },
      { href: '#roles', label: 'Hospitals & teams' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '#', label: 'Help centre' },
      { href: '#', label: 'FAQs' },
      { href: '#', label: 'Contact us' },
    ],
  },
] as const

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-text-secondary/10 bg-primary text-surface">
      <div className="layout-content py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <a
              href="#get-started"
              className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-surface no-underline"
              aria-label="Curex — Home"
            >
              <img
                src={LOGO_SRC}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 brightness-0 invert"
                decoding="async"
              />
              <span className="text-lg">Curex</span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-surface/80">
              Book visits, see your doctor by video, and stay on top of
              prescriptions and results—all in one calm, secure place.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-sky/90">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <a
                      href={link.href}
                      className="text-sm text-surface/75 no-underline transition hover:text-accent-mint"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-surface/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-surface/60">
            © {year} Curex. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6">
            <a
              href="#"
              className="text-sm text-surface/60 no-underline hover:text-surface"
            >
              Privacy policy
            </a>
            <a
              href="#"
              className="text-sm text-surface/60 no-underline hover:text-surface"
            >
              Terms of use
            </a>
            <a
              href="#"
              className="text-sm text-surface/60 no-underline hover:text-surface"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
