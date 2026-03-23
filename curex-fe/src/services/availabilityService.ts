import type { DayOfWeek } from '../types/appointment'
import { DAYS_ORDER } from '../types/appointment'

const STORAGE_PREFIX = 'curex_availability'

export function slotKey(day: DayOfWeek, time: string): string {
  return `${day}_${time}`
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dateSlotKey(dateKey: string, time: string): string {
  return `${dateKey}_${time}`
}

export function parseDateSlotKey(key: string): { dateKey: string; time: string } | null {
  const [head, time] = key.split('_')
  if (!head || !time) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    return null
  }

  return { dateKey: head, time }
}

export function getUpcomingDateKeys(days = 30): string[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const keys: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    keys.push(toDateKey(d))
  }

  return keys
}

function dateKeyToDayOfWeek(dateKey: string): DayOfWeek {
  const d = new Date(`${dateKey}T00:00:00`)
  const dayIndex = d.getDay()
  const map: Record<number, DayOfWeek> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  }
  return map[dayIndex]
}

function normalizeStoredSlots(stored: string[]): string[] {
  const normalized = new Set<string>()
  const upcomingDates = getUpcomingDateKeys(30)

  for (const key of stored) {
    const parsed = parseDateSlotKey(key)
    if (parsed) {
      normalized.add(key)
      continue
    }

    const [legacyDay, time] = key.split('_')
    if (!legacyDay || !time) {
      continue
    }

    if (!DAYS_ORDER.includes(legacyDay as DayOfWeek)) {
      continue
    }

    for (const dateKey of upcomingDates) {
      if (dateKeyToDayOfWeek(dateKey) === legacyDay) {
        normalized.add(dateSlotKey(dateKey, time))
      }
    }
  }

  return [...normalized].sort((a, b) => a.localeCompare(b))
}

function storageKey(doctorId: string): string {
  return `${STORAGE_PREFIX}_${doctorId}`
}

export function getDoctorAvailability(doctorId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(doctorId))
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeStoredSlots(parsed)
  } catch {
    return []
  }
}

export function saveDoctorAvailability(doctorId: string, slotKeys: string[]): void {
  localStorage.setItem(storageKey(doctorId), JSON.stringify(slotKeys))
}
