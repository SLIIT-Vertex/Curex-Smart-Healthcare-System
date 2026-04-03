/**
 * Mirrors doctor-service {@code PrescriptionService#isWithinDoctorCancellationWindow}:
 * cancel allowed if now ≤ issuedAt+1h OR now ≤ transitionToActive+1h,
 * where transitionToActive is the later of start-of-validFrom (local calendar day)
 * and issuedAt (same idea as LocalDateTime on the server).
 */
export const CANCEL_GRACE_MS = 60 * 60 * 1000

function startOfValidFromLocal(validFrom?: string): Date | null {
  if (!validFrom?.trim()) return null
  const t = validFrom.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split('-').map(Number)
    return new Date(y!, m! - 1, d!, 0, 0, 0, 0)
  }
  const parsed = new Date(t)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    0,
    0,
    0,
    0
  )
}

export function transitionToActiveInstant(
  issuedAt: Date,
  validFrom?: string
): Date {
  const start = startOfValidFromLocal(validFrom)
  if (!start) return issuedAt
  return issuedAt.getTime() > start.getTime() ? issuedAt : start
}

export function isWithinDoctorCancellationWindow(
  issuedAtIso: string,
  validFrom: string | undefined,
  now = new Date()
): boolean {
  const issuedAt = new Date(issuedAtIso)
  if (Number.isNaN(issuedAt.getTime())) return false
  const transition = transitionToActiveInstant(issuedAt, validFrom)
  const t = now.getTime()
  const issueDeadline = issuedAt.getTime() + CANCEL_GRACE_MS
  const activeDeadline = transition.getTime() + CANCEL_GRACE_MS
  return t <= issueDeadline || t <= activeDeadline
}

/** Latest instant when cancellation is still allowed (both OR branches expired after this). */
export function doctorCancellationDeadlineEnd(
  issuedAtIso: string,
  validFrom: string | undefined
): Date {
  const issuedAt = new Date(issuedAtIso)
  if (Number.isNaN(issuedAt.getTime())) return new Date(0)
  const transition = transitionToActiveInstant(issuedAt, validFrom)
  const issueDeadline = issuedAt.getTime() + CANCEL_GRACE_MS
  const activeDeadline = transition.getTime() + CANCEL_GRACE_MS
  return new Date(Math.max(issueDeadline, activeDeadline))
}
