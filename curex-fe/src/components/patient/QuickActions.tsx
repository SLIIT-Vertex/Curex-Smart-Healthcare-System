import { Link } from 'react-router-dom'
import { Calendar, Brain, FileUp } from 'lucide-react'

const actions = [
  {
    to: '/patient/appointments',
    icon: Calendar,
    title: 'Book an Appointment',
    description: 'Schedule your next visit.',
    accentClass: 'bg-accent-sky/15 text-accent-sky',
  },
  {
    to: '/patient/symptom-checker',
    icon: Brain,
    title: 'Check Symptoms',
    description: 'AI-powered symptom analysis.',
    accentClass: 'bg-accent-mint/15 text-accent-mint',
  },
  {
    to: '/patient/reports',
    icon: FileUp,
    title: 'Upload Report',
    description: 'Medical reports & lab results.',
    accentClass: 'bg-accent-peach/15 text-accent-peach',
  },
] as const

export function QuickActions() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
