import { Link } from 'react-router-dom'
import { Calendar, Sparkles, FileUp, Video, ClipboardList } from 'lucide-react'

const actions = [
  {
    to: '/patient/appointments',
    icon: Calendar,
    title: 'Book appointments',
    description: 'Find a slot and schedule your next visit in seconds.',
    accentClass: 'bg-accent-sky/15 text-accent-sky',
  },
  {
    to: '/patient/telemedicine',
    icon: Video,
    title: 'Video consultations',
    description: 'Join secure telehealth sessions from anywhere.',
    accentClass: 'bg-primary-light/15 text-primary',
  },
  {
    to: '/patient/reports',
    icon: FileUp,
    title: 'Upload reports',
    description: 'Add lab results and imaging for your care team.',
    accentClass: 'bg-accent-peach/15 text-accent-peach',
  },
  {
    to: '/patient/prescriptions',
    icon: ClipboardList,
    title: 'My prescriptions',
    description: 'See active meds, doses, and instructions from your doctors.',
    accentClass: 'bg-accent-mint/15 text-accent-mint',
  },
  {
    to: '/patient/symptom-checker',
    icon: Sparkles,
    title: 'AI health suggestions',
    description: 'Describe how you feel and get guided, AI-based insights.',
    accentClass: 'bg-accent-violet/15 text-accent-violet',
  },
] as const

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {actions.map(({ to, icon: Icon, title, description, accentClass }) => (
        <Link key={to} to={to} className="quick-action-card">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${accentClass}`}
          >
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-primary">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </Link>
      ))}
    </div>
  )
}
