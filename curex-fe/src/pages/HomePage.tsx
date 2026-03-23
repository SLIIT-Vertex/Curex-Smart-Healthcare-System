import '../styles/pages/HomePage.css'

import heroIllustration from '../assets/home/hero.svg'
import telemedIllustration from '../assets/home/telemed.svg'
import aiSymptomIllustration from '../assets/home/ai_symptom.svg'
import prescriptionIllustration from '../assets/home/prescription.svg'
import patientsAndFamiliesIllustration from '../assets/home/patients_and_families.svg'
import doctorsIllustration from '../assets/home/doctors.svg'
import hospitalIllustration from '../assets/home/hospital.svg'
import accountIllustration from '../assets/home/account.svg'
import consultationIllustration from '../assets/home/consultation.svg'
import reportIllustration from '../assets/home/report.svg'
import { HeroDecorations } from '../components/home/HeroDecorations'

/* ── Static data ── */

const STATUS_PILLS = [
  { bg: 'bg-status-healthy/20', dot: 'bg-status-healthy', label: 'Private video visits' },
  { bg: 'bg-status-info/20', dot: 'bg-status-info', label: 'Secure health info' },
  { bg: 'bg-status-attention/20', dot: 'bg-status-attention', label: 'Helpful guidance' },
] as const

const FEATURES = [
  {
    title: 'Video visits from home',
    description:
      'See a trusted clinician face to face on your phone or computer—no travel, less waiting, same quality care when it\u2019s right for you.',
    image: telemedIllustration,
    accent: 'border-accent-sky/40 bg-accent-sky/10',
    badge: 'bg-status-info/20 text-primary',
    badgeLabel: 'Telehealth',
  },
  {
    title: 'Guidance when you\u2019re unsure',
    description:
      'Get clear, gentle suggestions based on what you describe—so you know whether to rest, book a visit, or seek urgent help.',
    image: aiSymptomIllustration,
    accent: 'border-accent-mint/40 bg-accent-mint/10',
    badge: 'bg-status-healthy/25 text-primary',
    badgeLabel: 'Smart support',
  },
  {
    title: 'Prescriptions & reports in one place',
    description:
      'View scripts, download lab and imaging results, and pay bills without juggling paper, portals, and phone tags.',
    image: prescriptionIllustration,
    accent: 'border-accent-peach/50 bg-accent-peach/10',
    badge: 'bg-status-attention/25 text-primary',
    badgeLabel: 'Your records',
  },
] as const

const STEPS = [
  {
    step: '01',
    title: 'Create your account',
    copy: 'Tell us who you are—patient, doctor, or part of a care organisation—and we\u2019ll tailor your experience.',
    image: accountIllustration,
    imageAlt: 'Illustration of creating your healthcare account',
  },
  {
    step: '02',
    title: 'Book or join a visit',
    copy: 'Choose a time that works, get reminders, and join your video visit from a private link when it\u2019s time.',
    image: consultationIllustration,
    imageAlt: 'Illustration of a video or in-person consultation',
  },
  {
    step: '03',
    title: 'Follow your care plan',
    copy: 'See notes, prescriptions, and next steps in one dashboard—so nothing important slips through the cracks.',
    image: reportIllustration,
    imageAlt: 'Illustration of health records and care plan documents',
  },
] as const

const ROLES = [
  {
    title: 'Patients & families',
    body: 'Book appointments, join video visits, upload documents, and follow your treatment plan with reminders that fit your life.',
    tone: 'bg-accent-sky/15 text-primary',
    image: patientsAndFamiliesIllustration,
    imageAlt: 'Illustration of patients and families using healthcare services together',
  },
  {
    title: 'Doctors & clinicians',
    body: 'Set your availability, meet patients online, review history at a glance, and send prescriptions your patients can pick up or refill easily.',
    tone: 'bg-accent-mint/20 text-primary',
    image: doctorsIllustration,
    imageAlt: 'Illustration of doctors and clinicians providing care',
  },
  {
    title: 'Hospitals & care teams',
    body: 'Onboard staff safely, verify who\u2019s who, and keep day-to-day operations smooth so everyone spends more time on care.',
    tone: 'bg-accent-peach/20 text-primary',
    image: hospitalIllustration,
    imageAlt: 'Illustration representing hospitals and coordinated care teams',
  },
] as const

/* ── Helpers ── */

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 id={id} className="section-heading">{title}</h2>
      <p className="section-subtext">{subtitle}</p>
    </div>
  )
}

/* ── Page ── */

export function HomePage() {
  return (
    <>
      {/* ━━ Hero ━━ */}
      <section id="get-started" className="hero" aria-labelledby="hero-heading">
        <HeroDecorations />

        <div className="layout-content relative z-10 w-full py-12 text-center sm:py-16 lg:py-20">
          <div className="grid items-center justify-items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-12 xl:gap-16">
            <div className="mx-auto w-full max-w-xl">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-light/20 bg-primary-light/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-light shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-mint opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-mint" />
                </span>
                Your health, connected
              </p>

              <h1 id="hero-heading" className="hero__heading">
                Care that fits your day: book visits, see your doctor online, and stay in control.
              </h1>

              <p className="mx-auto mt-5 max-w-lg text-pretty text-base text-text-secondary sm:text-lg">
                Appointments, video consultations, and everyday health tools—together in one simple experience.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href="#features" className="btn-primary shadow-md shadow-primary-light/25">See what you can do</a>
                <a href="#how-it-works" className="btn-secondary">How it works</a>
              </div>

              <ul className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-text-secondary">
                {STATUS_PILLS.map((p) => (
                  <li key={p.label} className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${p.bg}`} aria-hidden>
                      <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    </span>
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex w-full justify-center">
              <div className="hero__image-wrap">
                <div className="hero__backdrop-inner" aria-hidden />
                <div className="hero__backdrop-outer" aria-hidden />
                <div className="hero__radial-glow" aria-hidden />
                <div className="hero__corner-tl" aria-hidden />
                <div className="hero__corner-br" aria-hidden />
                <img
                  src={heroIllustration}
                  alt="People receiving friendly healthcare support online and in person"
                  className="hero__image"
                  width={840} height={560} loading="eager"
                  sizes="(min-width: 1280px) 800px, (min-width: 1024px) 58vw, (min-width: 640px) 92vw, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ Features ━━ */}
      <section
        id="features"
        className="section-screen scroll-mt-20 border-b border-text-secondary/10 bg-background sm:scroll-mt-[4.25rem]"
        aria-labelledby="features-heading"
      >
        <div className="section-inner">
          <SectionHeader
            id="features-heading"
            title="Everything you need for everyday care"
            subtitle="From a first question to a follow-up prescription, Curex keeps the important stuff organised—so you can focus on feeling better."
          />
          <div className="mt-12 grid w-full max-w-6xl justify-items-center gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className={`card bg-surface ${f.accent}`}>
                <div className="border-b border-text-secondary/10 bg-surface/80 p-4">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${f.badge}`}>
                    {f.badgeLabel}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-primary">{f.title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-text-secondary">{f.description}</p>
                </div>
                <div className="flex min-h-48 flex-1 items-center justify-center p-5 sm:min-h-56 sm:p-7 lg:min-h-64 lg:p-8">
                  <img src={f.image} alt="" className="card__image" loading="lazy" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ How it works ━━ */}
      <section
        id="how-it-works"
        className="section-screen scroll-mt-20 border-b border-text-secondary/10 bg-surface sm:scroll-mt-[4.25rem]"
        aria-labelledby="how-heading"
      >
        <div className="section-inner">
          <SectionHeader
            id="how-heading"
            title="How Curex works"
            subtitle="Three simple steps—from signing up to staying on track with the care plan you and your clinician agree on."
          />
          <ol className="mt-12 grid w-full max-w-5xl justify-items-center gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.step} className="card border-text-secondary/10 bg-background">
                <div className="flex min-h-56 items-center justify-center border-b border-text-secondary/10 bg-surface/70 px-4 py-7 sm:min-h-64 sm:py-8 lg:min-h-72">
                  <img src={s.image} alt={s.imageAlt} className="card__image" loading="lazy" />
                </div>
                <div className="p-6">
                  <span className="font-mono text-sm font-bold text-primary-light">{s.step}</span>
                  <h3 className="mt-2 text-lg font-semibold text-primary">{s.title}</h3>
                  <p className="mt-2 text-pretty text-sm text-text-secondary">{s.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ━━ Roles ━━ */}
      <section
        id="roles"
        className="section-screen scroll-mt-20 bg-background sm:scroll-mt-[4.25rem]"
        aria-labelledby="roles-heading"
      >
        <div className="section-inner">
          <SectionHeader
            id="roles-heading"
            title="Made for everyone who delivers or receives care"
            subtitle="Whether you're at home, in clinic, or running a hospital team, Curex meets you with tools that feel human and stay out of your way."
          />
          <div className="mt-10 grid w-full max-w-6xl justify-items-center gap-6 md:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.title} className={`card border-text-secondary/10 ${r.tone}`}>
                <div className="flex min-h-56 flex-1 items-center justify-center border-b border-text-secondary/10 bg-surface/60 px-4 py-7 sm:min-h-64 sm:py-8 lg:min-h-72">
                  <img src={r.image} alt={r.imageAlt} className="card__image lg:max-h-[22rem]" loading="lazy" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-text-secondary">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ CTA ━━ */}
      <section
        id="sign-in"
        className="scroll-mt-20 border-t border-text-secondary/10 bg-primary sm:scroll-mt-[4.25rem]"
        aria-labelledby="cta-heading"
      >
        <div className="layout-content flex w-full flex-col items-center py-12 text-center sm:py-14 lg:py-16">
          <h2 id="cta-heading" className="text-balance text-2xl font-semibold tracking-tight text-surface sm:text-3xl">
            Ready to take the next step?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-surface/80">
            Create a free account to book visits, message your care team, and keep your health information in one secure
            place. Already with Curex? Sign in anytime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#get-started"
              className="inline-flex items-center justify-center rounded-lg bg-accent-mint px-6 py-3 text-sm font-semibold text-primary no-underline shadow-sm transition hover:brightness-95"
            >
              Create an account
            </a>
            <a
              href="#sign-in"
              className="inline-flex items-center justify-center rounded-lg border border-surface/30 px-6 py-3 text-sm font-semibold text-surface no-underline transition hover:bg-surface/10"
            >
              I already have an account
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
