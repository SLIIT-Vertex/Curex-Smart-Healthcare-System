import { useRef, useCallback, useEffect } from 'react'

export type SlotState = 'unavailable' | 'available' | 'booked' | 'blocked'

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

const SLOT_STYLE: Record<SlotState, string> = {
  unavailable:
    'availability-cell bg-background border-text-secondary/10 hover:border-text-secondary/30',
  available:
    'availability-cell bg-accent-mint/20 border-accent-mint/40 hover:border-accent-mint/60',
  booked: 'availability-cell bg-accent-sky/20 border-accent-sky/40 cursor-default',
  blocked: 'availability-cell bg-error/10 border-error/30 hover:border-error/50',
}

export interface AvailabilityGridProps {
  grid: Record<string, SlotState>
  onChange: (updates: Record<string, SlotState>) => void
  /** On mobile: show only this day */
  visibleDay?: (typeof DAYS)[number]
  compact?: boolean
}

function slotKey(day: string, time: string): string {
  return `${day}_${time}`
}

export function AvailabilityGrid({
  grid,
  onChange,
  visibleDay,
  compact = false,
}: AvailabilityGridProps) {
  const dragRef = useRef<{
    startKey: string
    paintState: SlotState
    touched: Set<string>
  } | null>(null)

  const getState = useCallback(
    (day: string, time: string): SlotState => {
      return grid[slotKey(day, time)] ?? 'unavailable'
    },
    [grid]
  )

  const canToggle = useCallback((state: SlotState): boolean => {
    return state === 'available' || state === 'unavailable'
  }, [])

  const toggleState = useCallback((state: SlotState): SlotState => {
    return state === 'available' ? 'unavailable' : 'available'
  }, [])

  const handlePointerDown = useCallback(
    (day: string, time: string) => {
      const key = slotKey(day, time)
      const state = getState(day, time)
      if (!canToggle(state)) return

      const newState = toggleState(state)
      dragRef.current = { startKey: key, paintState: newState, touched: new Set([key]) }
      onChange({ [key]: newState })
    },
    [getState, canToggle, toggleState, onChange]
  )

  const handlePointerEnter = useCallback(
    (day: string, time: string) => {
      if (!dragRef.current) return

      const key = slotKey(day, time)
      const state = getState(day, time)
      if (!canToggle(state)) return

      if (dragRef.current.touched.has(key)) return

      dragRef.current.touched.add(key)
      onChange({ [key]: dragRef.current.paintState })
    },
    [getState, canToggle, onChange]
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  useEffect(() => {
    const up = () => dragRef.current = null
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const daysToShow = visibleDay ? [visibleDay] : [...DAYS]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-16 border-b border-r border-text-secondary/20 bg-surface py-2 text-left text-xs font-medium text-text-secondary">
              Time
            </th>
            {daysToShow.map((day) => (
              <th
                key={day}
                className="border-b border-text-secondary/20 py-2 text-center text-xs font-medium text-text-secondary"
              >
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((time) => (
            <tr key={time}>
              <td className="sticky left-0 z-10 border-b border-r border-text-secondary/20 bg-background py-1 pr-2 text-right text-xs text-text-secondary">
                {time}
              </td>
              {daysToShow.map((day) => {
                const state = getState(day, time)
                const key = slotKey(day, time)
                const clickable = canToggle(state)

                return (
                  <td
                    key={key}
                    className="border-b border-r border-text-secondary/10 p-1"
                  >
                    <button
                      type="button"
                      onPointerDown={() => handlePointerDown(day, time)}
                      onPointerEnter={() => handlePointerEnter(day, time)}
                      onPointerUp={handlePointerUp}
                      disabled={!clickable}
                      className={`inline-flex h-8 w-full min-w-[2.5rem] items-center justify-center rounded-lg border text-xs transition-colors ${
                        compact ? 'h-6 min-w-[2rem]' : ''
                      } ${SLOT_STYLE[state]} ${clickable ? 'cursor-pointer' : ''}`}
                      title={
                        state === 'booked'
                          ? 'Booked'
                          : state === 'blocked'
                            ? 'Blocked'
                            : state === 'available'
                              ? 'Available (click to remove)'
                              : 'Unavailable (click to add)'
                      }
                      aria-label={`${day} ${time}: ${state}`}
                    >
                      {state === 'available' && '✓'}
                      {state === 'booked' && '●'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
