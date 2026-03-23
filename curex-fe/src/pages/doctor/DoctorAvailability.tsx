import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AvailabilityGrid, type SlotState } from '../../components/doctor/AvailabilityGrid'
import '../../styles/pages/DoctorDashboard.css'

const DAYS_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

const DAY_LABELS: Record<(typeof DAYS_ORDER)[number], string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

function slotKey(day: string, time: string): string {
  return `${day}_${time}`
}

/* ── Mock data: seed some available and booked slots ── */

function createMockGrid(): Record<string, SlotState> {
  const grid: Record<string, SlotState> = {}

  const setSlot = (day: string, start: string, state: SlotState) => {
    grid[slotKey(day, start)] = state
  }

  // Monday: 08:00-12:00 available, 09:00 booked
  for (const t of ['08:00', '08:30', '09:30', '10:00', '10:30', '11:00', '11:30']) {
    setSlot('MONDAY', t, 'available')
  }
  setSlot('MONDAY', '09:00', 'booked')

  // Tuesday: 08:00-10:00 available
  for (const t of ['08:00', '08:30', '09:00', '09:30', '10:00']) {
    setSlot('TUESDAY', t, 'available')
  }

  // Wednesday: mostly empty
  setSlot('WEDNESDAY', '14:00', 'available')
  setSlot('WEDNESDAY', '14:30', 'available')

  // Thursday: 08:00-09:00 available
  for (const t of ['08:00', '08:30', '09:00']) {
    setSlot('THURSDAY', t, 'available')
  }

  // Friday: 08:00-12:00, 14:00-16:00 available
  for (const t of ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30']) {
    setSlot('FRIDAY', t, 'available')
  }

  // Sat/Sun: empty
  return grid
}

export function DoctorAvailability() {
  const [grid, setGrid] = useState<Record<string, SlotState>>(createMockGrid)
  const [hasChanges, setHasChanges] = useState(false)
  const [mobileDayIndex, setMobileDayIndex] = useState(0)

  const handleGridChange = (updates: Record<string, SlotState>) => {
    setGrid((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const handleSave = () => {
    // TODO: call API to persist
    setHasChanges(false)
  }

  const visibleDay = DAYS_ORDER[mobileDayIndex]

  const goPrevDay = () => setMobileDayIndex((i) => Math.max(0, i - 1))
  const goNextDay = () =>
    setMobileDayIndex((i) => Math.min(DAYS_ORDER.length - 1, i + 1))

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="section-heading">Availability</h1>
        <p className="section-subtext mt-1">
          Manage your weekly schedule. Click slots to toggle available.
        </p>
      </div>

      {/* Mobile day picker */}
      <div className="flex items-center justify-between rounded-xl border border-text-secondary/20 bg-surface p-4 lg:hidden">
        <button
          type="button"
          onClick={goPrevDay}
          disabled={mobileDayIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition hover:bg-primary-light/10 hover:text-primary disabled:opacity-40"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <span className="font-medium text-primary">
          {DAY_LABELS[visibleDay]}
        </span>
        <button
          type="button"
          onClick={goNextDay}
          disabled={mobileDayIndex === DAYS_ORDER.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition hover:bg-primary-light/10 hover:text-primary disabled:opacity-40"
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid card */}
      <div
        className="overflow-hidden rounded-2xl bg-surface"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto p-4">
          {/* Desktop: full week; Mobile: single day */}
          <div className="hidden lg:block">
            <AvailabilityGrid
              grid={grid}
              onChange={handleGridChange}
              compact={false}
            />
          </div>
          <div className="lg:hidden">
            <AvailabilityGrid
              grid={grid}
              onChange={handleGridChange}
              visibleDay={visibleDay}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-accent-mint/40 bg-accent-mint/20 text-xs">
            ✓
          </span>
          Available
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-accent-sky/40 bg-accent-sky/20 text-xs">
            ●
          </span>
          Booked
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-text-secondary/10 bg-background text-xs">
            {' '}
          </span>
          Unavailable
        </span>
      </div>

      {/* Sticky Save button */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-text-secondary/10 bg-surface/95 p-4 shadow-lg backdrop-blur-sm lg:left-60">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">
              You have unsaved changes
            </p>
            <button type="button" onClick={handleSave} className="btn-primary">
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
