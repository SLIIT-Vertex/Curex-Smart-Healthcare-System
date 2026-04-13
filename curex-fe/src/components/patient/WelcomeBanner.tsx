import { Link } from 'react-router-dom'
import patientIllustration from '../../assets/patient/patient.svg'

interface WelcomeBannerProps {
  patientName: string
}

export function WelcomeBanner({ patientName }: WelcomeBannerProps) {
  return (
    <div className="welcome-banner">
      <div className="welcome-banner__gradient" aria-hidden />
      <div className="relative flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
        <img
          src={patientIllustration}
          alt=""
          className="h-40 w-40 shrink-0 sm:h-52 sm:w-52 lg:h-56 lg:w-56"
        />
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-semibold text-primary sm:text-2xl">
            Hope you&apos;re doing well, {patientName}!
          </h2>
          <p className="mt-2 text-text-secondary">
            Book appointments, attend video consultations, upload reports, and get AI-based health suggestions.
          </p>
          <Link
            to="/patient/profile"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
          >
            View your profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
