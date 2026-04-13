import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getAppointmentsByDoctor,
  getDoctorSlots,
  saveDoctorSlots,
  type AvailabilitySlotResponse,
} from '../../services/appointmentService'
import { getTelemedicineSession } from '../../services/telemedicineService'
import {
  dateSlotKey,
  getUpcomingDateKeys,
  parseDateSlotKey,
  toDateKey,
} from '../../services/availabilityService'
import type { AppointmentRecord } from '../../types/appointment'
import type { TelemedicineSessionRecord } from '../../types/telemedicine'
import '../../styles/pages/AppointmentFlow.css'
import '../../styles/pages/DoctorDashboard.css'
import { useAuth, useToast } from '../../store/hooks'

type SlotState = 'unavailable' | 'available' | 'booked'
function hydrateGridFromSlots(
  slots: AvailabilitySlotResponse[],
  dateKeys: string[]
): Record<string, SlotState> {
  const grid: Record<string, SlotState> = {}
  for (const slot of slots) {
    const day = String(slot.day)
    const time = String(slot.startTime).slice(0, 5)
    for (const dateKey of dateKeys) {
      if (weekdayKey(dateKey) === (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].indexOf(day))) {
        const key = dateSlotKey(dateKey, time)
        grid[key] = slot.booked ? 'booked' : 'available'
      }
    }
  }
  return grid
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

function slotKeyFromAppointment(appt: AppointmentRecord): string {
  if (appt.slotId) {
    const parsed = parseDateSlotKey(appt.slotId)
    if (parsed) {
      return appt.slotId
    }
  }

  const date = new Date(appt.appointmentTime)
  const dateKey = toDateKey(date)
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return dateSlotKey(dateKey, time)
}

function dateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function buildMonthCells(currentMonth: Date): Array<{ dateKey: string; inMonth: boolean; dayNumber: number }> {
  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  const cells: Array<{ dateKey: string; inMonth: boolean; dayNumber: number }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      dateKey: toDateKey(d),
      inMonth: d.getMonth() === currentMonth.getMonth(),
      dayNumber: d.getDate(),
    })
  }

  return cells
}

function statusPastelClass(status: string): string {
  const normalized = status.toUpperCase()
  if (normalized === 'CONFIRMED') {
    return 'bg-accent-mint/25 text-primary'
  }
  if (normalized === 'PENDING') {
    return 'bg-accent-peach/30 text-primary'
  }
  if (normalized === 'CANCELLED') {
    return 'bg-error/20 text-primary'
  }
  return 'bg-primary-light/15 text-primary'
}

function canOpenTelemedicineRoom(
  appt: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined
): boolean {
  if (appt.type !== 'TELEMEDICINE') {
    return false
  }

  if (session?.status === 'ENDED') {
    return false
  }

  const statusEligible = appt.status === 'CONFIRMED' || appt.status === 'IN_SESSION'
  const joinOpensAt = new Date(appt.appointmentTime).getTime() - 60 * 60 * 1000
  return statusEligible && Date.now() >= joinOpensAt
}

function doctorBookingStatusLabel(
  appt: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined
): string {
  if (appt.type === 'TELEMEDICINE' && session?.status === 'ENDED') {
    return 'ENDED'
  }
  return String(appt.status).toUpperCase()
}

function isWeekday(dateKey: string): boolean {
  const d = new Date(`${dateKey}T00:00:00`)
  const day = d.getDay()
  return day >= 1 && day <= 5
}

function weekdayKey(dateKey: string): number {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.getDay()
}

function isMorningSlot(time: string): boolean {
  return time >= '09:00' && time <= '12:00'
}

function withDayPattern(
  prev: Record<string, SlotState>,
  day: string,
  bookedKeys: Set<string>,
  availableTimes: Set<string>
): Record<string, SlotState> {
  const next = { ...prev }
  for (const time of TIME_SLOTS) {
    const key = dateSlotKey(day, time)
    if (bookedKeys.has(key)) {
      continue
    }
    if (availableTimes.has(time)) {
      next[key] = 'available'
    } else {
      delete next[key]
    }
  }
  return next
}

export function DoctorAvailability() {
  const { user } = useAuth()
  const { toast } = useToast()
  const doctorId = user?.id ?? ''
  const [activeTab, setActiveTab] = useState<'availability' | 'booked'>('availability')
  const [grid, setGrid] = useState<Record<string, SlotState>>({})
  const [savedGridSnapshot, setSavedGridSnapshot] = useState<Record<string, SlotState>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [bookedAppointments, setBookedAppointments] = useState<AppointmentRecord[]>([])
  const [telemedicineSessions, setTelemedicineSessions] = useState<
    Record<string, TelemedicineSessionRecord | null>
  >({})
  const dateKeys = useMemo(() => getUpcomingDateKeys(30), [])
  const [selectedDateKey, setSelectedDateKey] = useState(dateKeys[0])
  const [weekStartIndex, setWeekStartIndex] = useState(0)
  const [bookedMonth, setBookedMonth] = useState(() => monthStart(new Date()))
  const [showBookedMonthPicker, setShowBookedMonthPicker] = useState(false)
  const [showBookedCalendar, setShowBookedCalendar] = useState(true)
  const [selectedBookedDate, setSelectedBookedDate] = useState(toDateKey(new Date()))
  const [popupBooked, setPopupBooked] = useState<AppointmentRecord | null>(null)
  const [bookingsSearch, setBookingsSearch] = useState('')
  const [bookingsTypeFilter, setBookingsTypeFilter] = useState<
    'ALL' | 'TELEMEDICINE' | 'IN_PERSON'
  >('ALL')
  const [bookingsStatusFilter, setBookingsStatusFilter] = useState<
    'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'ENDED'
  >('ALL')
  const [bookingsDateFilter, setBookingsDateFilter] = useState('')
  const dragRef = useRef<{
    paintState: SlotState
    touched: Set<string>
  } | null>(null)

  const weekDates = useMemo(() => {
    return dateKeys.slice(weekStartIndex, weekStartIndex + 7)
  }, [dateKeys, weekStartIndex])

  const canGoPrevWeek = weekStartIndex > 0
  const canGoNextWeek = weekStartIndex + 7 < dateKeys.length

  const bookedSlotKeys = useMemo(() => {
    return new Set(
      bookedAppointments
        .filter((appt) => appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED')
        .map(slotKeyFromAppointment)
    )
  }, [bookedAppointments])

  const upcomingBookedAppointments = useMemo(() => {
    return bookedAppointments
      .filter((appt) => appt.status !== 'CANCELLED')
      .sort((a, b) =>
        new Date(a.appointmentTime).getTime() -
        new Date(b.appointmentTime).getTime()
      )
  }, [bookedAppointments])

  const filteredBookedAppointments = useMemo(() => {
    const term = bookingsSearch.trim().toLowerCase()
    return upcomingBookedAppointments.filter((appt) => {
      if (bookingsTypeFilter !== 'ALL' && appt.type !== bookingsTypeFilter) {
        return false
      }

      const teleSession = telemedicineSessions[appt.id]
      const normalizedStatus = doctorBookingStatusLabel(appt, teleSession).toUpperCase()
      if (bookingsStatusFilter !== 'ALL' && normalizedStatus !== bookingsStatusFilter) {
        return false
      }

      if (bookingsDateFilter && toDateKey(new Date(appt.appointmentTime)) !== bookingsDateFilter) {
        return false
      }

      if (!term) {
        return true
      }

      const values = [
        appt.patientName,
        appt.patientId,
        appt.type === 'TELEMEDICINE' ? 'video' : 'in-person',
        normalizedStatus,
        new Date(appt.appointmentTime).toLocaleDateString('en-GB'),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())

      return values.some((value) => value.includes(term))
    })
  }, [
    bookingsSearch,
    bookingsDateFilter,
    bookingsStatusFilter,
    bookingsTypeFilter,
    upcomingBookedAppointments,
    telemedicineSessions,
  ])

  const bookedByDate = useMemo(() => {
    const grouped: Record<string, AppointmentRecord[]> = {}
    for (const appt of upcomingBookedAppointments) {
      const key = toDateKey(new Date(appt.appointmentTime))
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(appt)
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) =>
          new Date(a.appointmentTime).getTime() -
          new Date(b.appointmentTime).getTime()
      )
    }

    return grouped
  }, [upcomingBookedAppointments])

  const bookedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(bookedByDate)) {
      counts[key] = bookedByDate[key].length
    }
    return counts
  }, [bookedByDate])

  const bookedCalendarCells = useMemo(() => buildMonthCells(bookedMonth), [bookedMonth])

  const selectedDateBookings = useMemo(() => {
    return bookedByDate[selectedBookedDate] ?? []
  }, [bookedByDate, selectedBookedDate])

  const bookedYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      years.push(y)
    }
    return years
  }, [])

  useEffect(() => {
    if (!doctorId) {
      return
    }

    let active = true
    async function loadAvailability() {
      try {
        const slots = await getDoctorSlots(doctorId)
        const hydrated = hydrateGridFromSlots(slots, dateKeys)
        if (!active) {
          return
        }
        setGrid(hydrated)
        setSavedGridSnapshot(hydrated)
      } catch {
        if (active) {
          toast('Could not load saved availability.', 'error')
        }
      }
    }

    loadAvailability()
    return () => {
      active = false
    }
  }, [doctorId, dateKeys, toast])

  useEffect(() => {
    async function loadBookedAppointments() {
      if (!doctorId) {
        return
      }
      try {
        const data = await getAppointmentsByDoctor(doctorId)
        setBookedAppointments(data)
      } catch {
        toast('Could not load booked appointments. Showing local availability only.', 'error')
      }
    }

    loadBookedAppointments()
  }, [doctorId])

  useEffect(() => {
    let active = true

    async function loadTeleSessions() {
      const teleAppointments = bookedAppointments.filter(
        (appt) => appt.type === 'TELEMEDICINE'
      )

      if (teleAppointments.length === 0) {
        if (active) {
          setTelemedicineSessions({})
        }
        return
      }

      const entries = await Promise.all(
        teleAppointments.map(async (appt) => {
          try {
            const session = await getTelemedicineSession(appt.id)
            return [appt.id, session] as const
          } catch {
            return [appt.id, null] as const
          }
        })
      )

      if (!active) {
        return
      }

      const map: Record<string, TelemedicineSessionRecord | null> = {}
      for (const [appointmentId, session] of entries) {
        map[appointmentId] = session
      }
      setTelemedicineSessions(map)
    }

    loadTeleSessions()

    return () => {
      active = false
    }
  }, [bookedAppointments])

  const handleSave = async () => {
    if (!doctorId) {
      return
    }

    const availableSlotKeys = Object.entries(grid)
      .filter(([, state]) => state === 'available')
      .map(([key]) => key)

    try {
      const saved = await saveDoctorSlots(doctorId, availableSlotKeys)
      const normalized = hydrateGridFromSlots(saved, dateKeys)
      setGrid(normalized)
      setSavedGridSnapshot(normalized)
      setHasChanges(false)
      toast('Availability saved successfully.', 'success')
    } catch {
      toast('Failed to save availability. Please try again.', 'error')
    }
  }

  const handleCancelChanges = () => {
    setGrid({ ...savedGridSnapshot })
    setHasChanges(false)
  }

  const markFullDay = () => {
    setGrid((prev) => {
      const next = { ...prev }
      for (const time of TIME_SLOTS) {
        const key = dateSlotKey(selectedDateKey, time)
        if (!bookedSlotKeys.has(key)) {
          next[key] = 'available'
        }
      }
      return next
    })
    setHasChanges(true)
  }

  const clearSelectedDay = () => {
    setGrid((prev) => {
      const next = { ...prev }
      for (const time of TIME_SLOTS) {
        const key = dateSlotKey(selectedDateKey, time)
        if (!bookedSlotKeys.has(key)) {
          delete next[key]
        }
      }
      return next
    })
    setHasChanges(true)
  }

  const copyToSameWeekday = () => {
    const selectedWeekday = weekdayKey(selectedDateKey)
    const selectedTimes = new Set(
      TIME_SLOTS.filter((time) => grid[dateSlotKey(selectedDateKey, time)] === 'available')
    )

    setGrid((prev) => {
      let next = { ...prev }
      for (const dateKey of dateKeys) {
        if (weekdayKey(dateKey) !== selectedWeekday) {
          continue
        }
        next = withDayPattern(next, dateKey, bookedSlotKeys, selectedTimes)
      }
      return next
    })
    setHasChanges(true)
  }

  const markWeekdayMornings = () => {
    setGrid((prev) => {
      const next = { ...prev }
      for (const dateKey of dateKeys) {
        if (!isWeekday(dateKey)) {
          continue
        }
        for (const time of TIME_SLOTS) {
          if (!isMorningSlot(time)) {
            continue
          }
          const key = dateSlotKey(dateKey, time)
          if (!bookedSlotKeys.has(key)) {
            next[key] = 'available'
          }
        }
      }
      return next
    })
    setHasChanges(true)
  }

  const handleSlotPointerDown = (dateKey: string, time: string) => {
    const key = dateSlotKey(dateKey, time)
    if (bookedSlotKeys.has(key)) {
      return
    }

    const current = grid[key] === 'available' ? 'available' : 'unavailable'
    const nextState: SlotState = current === 'available' ? 'unavailable' : 'available'

    dragRef.current = {
      paintState: nextState,
      touched: new Set([key]),
    }

    setGrid((prev) => {
      const next = { ...prev }
      if (nextState === 'available') {
        next[key] = 'available'
      } else {
        delete next[key]
      }
      return next
    })
    setHasChanges(true)
  }

  const handleSlotPointerEnter = (dateKey: string, time: string) => {
    if (!dragRef.current) {
      return
    }

    const key = dateSlotKey(dateKey, time)
    if (bookedSlotKeys.has(key) || dragRef.current.touched.has(key)) {
      return
    }

    dragRef.current.touched.add(key)
    const nextState = dragRef.current.paintState

    setGrid((prev) => {
      const next = { ...prev }
      if (nextState === 'available') {
        next[key] = 'available'
      } else {
        delete next[key]
      }
      return next
    })
    setHasChanges(true)
  }

  const handleSlotPointerUp = () => {
    dragRef.current = null
  }

  useEffect(() => {
    const clearDrag = () => {
      dragRef.current = null
    }

    window.addEventListener('pointerup', clearDrag)
    return () => window.removeEventListener('pointerup', clearDrag)
  }, [])

  const handleBookedCalendarDateClick = (dateKey: string) => {
    const todayDateKey = toDateKey(new Date())
    if (dateKey < todayDateKey) {
      toast('Previous dates cannot be selected.', 'error')
      return
    }
    setSelectedBookedDate(dateKey)
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="section-heading">Availability</h1>
        <p className="section-subtext mt-1">
          Set your availability for the next 30 days. Patients will see exact dates and times.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-text-secondary/20 bg-surface p-1">
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'availability'
              ? 'bg-primary-light/10 text-primary'
              : 'text-text-secondary hover:text-primary'
          }`}
        >
          Availability
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('booked')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'booked'
              ? 'bg-primary-light/10 text-primary'
              : 'text-text-secondary hover:text-primary'
          }`}
        >
          Booked Dates
        </button>
      </div>

      {activeTab === 'availability' && (
        <>
          <div className="appointment-panel calendar-surface p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">Weekly Timetable</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Navigate week by week and mark availability directly on the table.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekStartIndex((v) => Math.max(0, v - 7))}
                  disabled={!canGoPrevWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStartIndex((v) => Math.min(v + 7, dateKeys.length - 7))}
                  disabled={!canGoNextWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-text-secondary/15 bg-background/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Quick Mark Tools
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button type="button" onClick={markFullDay} className="day-pill text-left">
                  Mark selected date fully
                </button>
                <button type="button" onClick={clearSelectedDay} className="day-pill text-left">
                  Clear selected date
                </button>
                <button type="button" onClick={copyToSameWeekday} className="day-pill text-left">
                  Copy to same weekday dates
                </button>
                <button type="button" onClick={markWeekdayMornings} className="day-pill text-left">
                  Weekday morning template
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[54rem] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-20 border-b border-r border-text-secondary/20 bg-surface py-2 text-left text-xs font-medium text-text-secondary">
                      Time
                    </th>
                    {weekDates.map((dateKey) => (
                      <th
                        key={dateKey}
                        className="border-b border-text-secondary/20 px-2 py-2 text-center text-xs font-medium text-text-secondary"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDateKey(dateKey)}
                          className={`rounded-md px-2 py-1 ${
                            selectedDateKey === dateKey
                              ? 'bg-primary-light/10 text-primary'
                              : ''
                          }`}
                        >
                          {dateLabel(dateKey)}
                        </button>
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
                      {weekDates.map((dateKey) => {
                        const key = dateSlotKey(dateKey, time)
                        const isBooked = bookedSlotKeys.has(key)
                        const isAvailable = grid[key] === 'available'

                        return (
                          <td
                            key={key}
                            className="border-b border-r border-text-secondary/10 p-1"
                          >
                            <button
                              type="button"
                              onPointerDown={() => handleSlotPointerDown(dateKey, time)}
                              onPointerEnter={() => handleSlotPointerEnter(dateKey, time)}
                              onPointerUp={handleSlotPointerUp}
                              disabled={isBooked}
                              className={`inline-flex h-8 w-full min-w-[2.5rem] items-center justify-center rounded-lg border text-xs transition-colors ${
                                isBooked
                                  ? 'cursor-not-allowed border-accent-sky/40 bg-accent-sky/20'
                                  : isAvailable
                                    ? 'border-accent-mint/40 bg-accent-mint/20'
                                    : 'border-text-secondary/10 bg-background hover:border-text-secondary/30'
                              }`}
                            >
                              {isBooked ? '●' : isAvailable ? '✓' : ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
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
            </div>
          </div>
        </>
      )}

      {activeTab === 'booked' && (
        <div
          className="rounded-2xl bg-surface p-5 lg:p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-lg font-semibold text-primary">Booked Dates</h2>
          <p className="mt-1 text-sm text-text-secondary">
            These are patient bookings from the appointment service.
          </p>

            <div className="mt-4 space-y-5">
              <button
                type="button"
                onClick={() => setShowBookedCalendar((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-text-secondary/20 bg-surface px-3 py-2 text-sm font-medium text-primary"
              >
                {showBookedCalendar ? 'Hide Calendar' : 'Show Calendar'}
              </button>

              {showBookedCalendar && (
              <div className="calendar-surface rounded-2xl border border-text-secondary/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookedMonthPicker((v) => !v)}
                    className="text-base font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {bookedMonth.toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookedMonth((m) => addMonths(m, -1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookedMonth((m) => addMonths(m, 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {showBookedMonthPicker && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-text-secondary/15 bg-surface p-3">
                    <select
                      className="patient-page-input max-w-40"
                      value={bookedMonth.getMonth()}
                      onChange={(e) =>
                        setBookedMonth(
                          new Date(
                            bookedMonth.getFullYear(),
                            Number(e.target.value),
                            1
                          )
                        )
                      }
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>{name}</option>
                      ))}
                    </select>
                    <select
                      className="patient-page-input max-w-36"
                      value={bookedMonth.getFullYear()}
                      onChange={(e) =>
                        setBookedMonth(
                          new Date(
                            Number(e.target.value),
                            bookedMonth.getMonth(),
                            1
                          )
                        )
                      }
                    >
                      {bookedYearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowBookedMonthPicker(false)}
                      className="day-pill"
                    >
                      Done
                    </button>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-secondary">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {bookedCalendarCells.map((cell) => {
                    const dayBookings = bookedByDate[cell.dateKey] ?? []
                    const marked = dayBookings.length > 0
                    const selected = selectedBookedDate === cell.dateKey
                    return (
                      <div
                        key={cell.dateKey}
                        onClick={() => handleBookedCalendarDateClick(cell.dateKey)}
                        className={`min-h-24 rounded-lg border px-1 py-1 text-left text-xs transition ${
                          selected
                            ? 'border-primary-light/40 bg-primary-light/10 text-primary'
                            : marked
                              ? 'border-accent-sky/45 bg-accent-sky/20 text-primary'
                              : cell.inMonth
                                ? 'border-text-secondary/15 bg-surface text-primary'
                              : 'border-text-secondary/10 bg-background/40 text-text-secondary/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cell.dayNumber}</span>
                          {marked && (
                            <span className="rounded-full bg-accent-sky/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {bookedCounts[cell.dateKey]}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 space-y-1">
                          {dayBookings.slice(0, 2).map((appt) => {
                            const apptTime = new Date(appt.appointmentTime).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            return (
                              <button
                                key={appt.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPopupBooked(appt)
                                }}
                                className={`w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium ${statusPastelClass(
                                  String(appt.status)
                                )}`}
                              >
                                {apptTime} {appt.patientName ?? appt.patientId}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-primary">
                    {dateLabel(selectedBookedDate)} ({selectedDateBookings.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedDateBookings.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/40 px-3 py-2 text-sm text-text-secondary">
                        No bookings on selected date.
                      </div>
                    ) : (
                      selectedDateBookings.map((appt) => {
                        const date = new Date(appt.appointmentTime)
                        return (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => setPopupBooked(appt)}
                            className={`rounded-xl px-3 py-2 text-left text-xs font-medium ${statusPastelClass(
                              String(appt.status)
                            )}`}
                          >
                            {date.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {appt.patientName ?? appt.patientId}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-text-secondary">
                  Previous dates are view-only.
                </p>
              </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-text-secondary/15 bg-background/40 p-4">
                <h3 className="mb-3 text-base font-semibold text-primary">All Booked Appointments</h3>
                <div className="mb-3 grid gap-3 md:grid-cols-[1fr_150px_170px_190px]">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      value={bookingsSearch}
                      onChange={(e) => setBookingsSearch(e.target.value)}
                      placeholder="Search by patient, date, status"
                      className="patient-page-input w-full border-text-secondary/20 bg-surface pl-10 shadow-sm"
                    />
                  </label>

                  <label className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <input
                      type="date"
                      value={bookingsDateFilter}
                      onChange={(e) => setBookingsDateFilter(e.target.value)}
                      className="patient-page-input w-full border-primary-light/30 bg-primary-light/5 pl-10 pr-3 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                    />
                  </label>

                  <label className="relative">
                    <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <select
                      value={bookingsTypeFilter}
                      onChange={(e) =>
                        setBookingsTypeFilter(
                          e.target.value as 'ALL' | 'TELEMEDICINE' | 'IN_PERSON'
                        )
                      }
                      className="patient-page-input w-full appearance-none border-primary-light/30 bg-primary-light/5 pl-10 pr-10 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                    >
                      <option value="ALL">All Types</option>
                      <option value="TELEMEDICINE">Telemedicine</option>
                      <option value="IN_PERSON">In-person</option>
                    </select>
                  </label>

                  <label className="relative">
                    <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <select
                      value={bookingsStatusFilter}
                      onChange={(e) =>
                        setBookingsStatusFilter(
                          e.target.value as
                            | 'ALL'
                            | 'PENDING'
                            | 'CONFIRMED'
                            | 'IN_SESSION'
                            | 'COMPLETED'
                            | 'CANCELLED'
                            | 'ENDED'
                        )
                      }
                      className="patient-page-input w-full appearance-none border-primary-light/30 bg-primary-light/5 pl-10 pr-10 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                    >
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="IN_SESSION">In Session</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="ENDED">Ended</option>
                    </select>
                  </label>
                </div>

                {upcomingBookedAppointments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-8 text-center text-text-secondary">
                    No bookings yet.
                  </div>
                ) : filteredBookedAppointments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-6 py-8 text-center text-text-secondary">
                    No bookings match your filters.
                  </div>
                ) : (
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-text-secondary/20 text-text-secondary">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Patient</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Telemedicine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookedAppointments.map((appt) => {
                      const date = new Date(appt.appointmentTime)
                      const teleSession = telemedicineSessions[appt.id]
                      return (
                        <tr
                          key={appt.id}
                          className="border-b border-text-secondary/10 hover:bg-background/40"
                        >
                          <td className="px-3 py-2">{date.toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2">
                            {date.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2">{appt.patientName ?? appt.patientId}</td>
                          <td className="px-3 py-2">
                            {appt.type === 'TELEMEDICINE' ? 'Video' : 'In-person'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPastelClass(doctorBookingStatusLabel(appt, teleSession))}`}>
                              {doctorBookingStatusLabel(appt, teleSession)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {appt.type === 'TELEMEDICINE' && canOpenTelemedicineRoom(appt, teleSession) ? (
                              <Link
                                to={`/doctor/telemedicine/${appt.id}`}
                                className="rounded-lg border border-primary-light/40 bg-primary-light/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light/20"
                              >
                                Open Room
                              </Link>
                            ) : appt.type === 'TELEMEDICINE' ? (
                              <span className="text-xs text-text-secondary">
                                {teleSession?.status === 'ENDED' ? 'Session ended' : 'Available 1 hour before'}
                              </span>
                            ) : (
                              <span className="text-xs text-text-secondary">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                )}
              </div>
            </div>
        </div>
      )}

      {popupBooked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-primary">Booked Appointment Details</h3>
                <p className="text-sm text-text-secondary">Click outside or close to dismiss.</p>
              </div>
              <button
                type="button"
                onClick={() => setPopupBooked(null)}
                className="rounded-lg border border-text-secondary/20 p-2 text-text-secondary transition hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-medium text-primary">Patient:</span> {popupBooked.patientName ?? popupBooked.patientId}</p>
              <p><span className="font-medium text-primary">Date:</span> {new Date(popupBooked.appointmentTime).toLocaleDateString('en-GB')}</p>
              <p><span className="font-medium text-primary">Time:</span> {new Date(popupBooked.appointmentTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="font-medium text-primary">Type:</span> {popupBooked.type === 'TELEMEDICINE' ? 'Video' : 'In-person'}</p>
              <p><span className="font-medium text-primary">Status:</span> {doctorBookingStatusLabel(popupBooked, telemedicineSessions[popupBooked.id])}</p>
              {popupBooked.notes && <p><span className="font-medium text-primary">Notes:</span> {popupBooked.notes}</p>}
            </div>

            {popupBooked.type === 'TELEMEDICINE' && canOpenTelemedicineRoom(popupBooked, telemedicineSessions[popupBooked.id]) && (
              <div className="mt-4">
                <Link
                  to={`/doctor/telemedicine/${popupBooked.id}`}
                  className="btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
                >
                  Join Telemedicine Room
                </Link>
              </div>
            )}

            {popupBooked.type === 'TELEMEDICINE' && !canOpenTelemedicineRoom(popupBooked, telemedicineSessions[popupBooked.id]) && (
              <p className="mt-4 rounded-lg border border-text-secondary/15 bg-background/50 px-3 py-2 text-xs text-text-secondary">
                {telemedicineSessions[popupBooked.id]?.status === 'ENDED'
                  ? 'This session has ended.'
                  : 'Meeting link will be available 1 hour before the appointment.'}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'availability' && hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-text-secondary/10 bg-surface/95 p-4 shadow-lg backdrop-blur-sm lg:left-60">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">You have unsaved changes</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelChanges}
                className="rounded-xl border border-text-secondary/25 px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-text-secondary/40 hover:text-primary"
              >
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn-primary">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
