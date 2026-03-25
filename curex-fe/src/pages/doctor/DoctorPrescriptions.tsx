import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { PrescriptionForm } from '../../components/doctor/PrescriptionForm'
import type { Prescription, PrescriptionStatus } from '../../types/doctor'
import type { PrescriptionFormData } from '../../components/doctor/PrescriptionForm'
import { getDoctorByUserId } from '../../services/doctorService'
import { getApiErrorMessage } from '../../services/axiosInstance'
import {
  getPrescriptionsByDoctor,
  issuePrescription,
} from '../../services/prescriptionService'
import { getAppointmentsByDoctor } from '../../services/appointmentService'
import type { AppointmentRecord } from '../../types/appointment'
import { useAuth } from '../../store/hooks'
import { useToast } from '../../store/hooks'
import '../../styles/pages/DoctorDashboard.css'

const INPUT_CLASS =
  'rounded-xl border border-text-secondary/20 bg-surface px-4 py-2 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status?: PrescriptionStatus }) {
  const s = status ?? 'ACTIVE'
  const styles: Record<string, string> = {
    ACTIVE: 'bg-accent-mint/20 text-primary border-accent-mint/40',
    ISSUED: 'bg-accent-mint/20 text-primary border-accent-mint/40',
    COMPLETED: 'bg-accent-peach/20 text-primary border-accent-peach/40',
    PENDING: 'bg-accent-peach/20 text-primary border-accent-peach/40',
    CANCELLED: 'bg-error/20 text-primary border-error/40',
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[s] ?? 'bg-background/50'}`}
    >
      {s}
    </span>
  )
}

export function DoctorPrescriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [patientFilter, setPatientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | ''>('')
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null)

  const patientNames = useMemo(() => {
    const map: Record<string, string> = {}
    prescriptions.forEach((rx) => {
      if (rx.patientName) map[rx.patientId] = rx.patientName
    })
    appointments.forEach((a) => {
      if (a.patientName && !map[a.patientId]) map[a.patientId] = a.patientName
    })
    return map
  }, [prescriptions, appointments])

  const eligibleAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === 'IN_SESSION' || a.status === 'COMPLETED'
    )
  }, [appointments])

  const prescribedAppointmentIds = useMemo(
    () => new Set(prescriptions.map((rx) => rx.appointmentId).filter(Boolean)),
    [prescriptions]
  )

  const appointmentsWithoutPrescription = useMemo(
    () =>
      eligibleAppointments.filter((a) => !prescribedAppointmentIds.has(a.id)),
    [eligibleAppointments, prescribedAppointmentIds]
  )

  const formAppointments = useMemo(
    () =>
      appointmentsWithoutPrescription.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
        patientEmail: a.patientEmail,
        date: formatAppointmentDate(a.appointmentTime),
      })),
    [appointmentsWithoutPrescription]
  )

  const formPatients = useMemo(() => {
    const seen = new Set<string>()
    return appointmentsWithoutPrescription
      .filter((a) => {
        if (seen.has(a.patientId)) return false
        seen.add(a.patientId)
        return true
      })
      .map((a) => ({
        id: a.patientId,
        name: a.patientName ?? a.patientId,
      }))
  }, [appointmentsWithoutPrescription])

  const noIssueReason = useMemo(() => {
    if (loading) return null
    if (appointments.length === 0) {
      return 'You have no appointments yet. Prescriptions can only be issued after you have visits with patients.'
    }
    if (eligibleAppointments.length === 0) {
      return 'None of your appointments are in session or completed yet. Start or finish a visit before issuing a prescription.'
    }
    if (appointmentsWithoutPrescription.length === 0) {
      return 'Every in-session or completed visit already has a prescription linked.'
    }
    return null
  }, [
    loading,
    appointments.length,
    eligibleAppointments.length,
    appointmentsWithoutPrescription.length,
  ])

  const openIssueModal = useCallback(() => {
    if (appointmentsWithoutPrescription.length === 0) {
      const msg =
        noIssueReason ??
        'No eligible appointments. Prescriptions require an appointment that is in session or completed, without an existing prescription for that visit.'
      toast(msg, 'info')
      return
    }
    setModalOpen(true)
  }, [appointmentsWithoutPrescription.length, noIssueReason, toast])

  const fetchDoctorAndData = useCallback(async () => {
    if (!user?.id || user.role !== 'DOCTOR') return
    setLoading(true)
    setError(null)
    try {
      const doctor = await getDoctorByUserId(user.id)
      setDoctorId(doctor.id)
      const [rxList, apptList] = await Promise.all([
        getPrescriptionsByDoctor(doctor.id),
        getAppointmentsByDoctor(doctor.id),
      ])
      setPrescriptions(rxList as Prescription[])
      setAppointments(apptList)
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to load prescriptions')
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role, toast])

  useEffect(() => {
    fetchDoctorAndData()
  }, [fetchDoctorAndData])

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      if (patientFilter) {
        const name = patientNames[rx.patientId] ?? ''
        if (
          !name.toLowerCase().includes(patientFilter.toLowerCase()) &&
          !rx.patientId.toLowerCase().includes(patientFilter.toLowerCase())
        ) {
          return false
        }
      }
      if (dateFrom && rx.issuedAt < dateFrom) return false
      if (dateTo && rx.issuedAt > `${dateTo}T23:59:59`) return false
      if (statusFilter && rx.status !== statusFilter) return false
      return true
    })
  }, [prescriptions, patientFilter, dateFrom, dateTo, statusFilter, patientNames])

  const handleIssuePrescription = async (data: PrescriptionFormData) => {
    if (!doctorId) {
      toast('Doctor profile not loaded', 'error')
      return
    }
    const medicinesStr = data.medicines
      .map(
        (m) =>
          `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}${m.duration ? `, ${m.duration}` : ''}`
      )
      .join('; ')

    try {
      await issuePrescription({
        doctorId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        patientEmail: data.patientEmail,
        patientName: data.patientName,
        diagnosis: data.diagnosis,
        medicines: medicinesStr,
        instructions: data.instructions || undefined,
        validFrom: data.validFrom,
        validTo: data.validTo,
      })
      toast('Prescription issued successfully', 'success')
      setModalOpen(false)
      await fetchDoctorAndData()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to issue prescription')
      toast(msg, 'error')
    }
  }

  const displayName = (rx: Prescription) =>
    rx.patientName ?? patientNames[rx.patientId] ?? rx.patientId

  if (loading && !doctorId) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-text-secondary">
        Loading prescriptions...
      </div>
    )
  }

  if (user?.role !== 'DOCTOR') {
    return (
      <div className="rounded-2xl bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-text-secondary">You must be logged in as a doctor to view prescriptions.</p>
      </div>
    )
  }

  if (error && !doctorId) {
    return (
      <div className="rounded-2xl border border-error/30 bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-error">{error}</p>
        <p className="mt-2 text-sm text-text-secondary">
          Ensure you have created a doctor profile. Prescriptions require a doctor profile linked to your account.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-heading">Prescriptions</h1>
          <p className="section-subtext mt-1">
            View and issue prescriptions for your patients.
          </p>
        </div>
        <button
          type="button"
          onClick={openIssueModal}
          className="btn-primary shrink-0"
          title={
            appointmentsWithoutPrescription.length === 0
              ? 'Tap for details on why issuing is unavailable'
              : undefined
          }
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Issue Prescription
        </button>
      </div>

      {noIssueReason && (
        <div
          className="rounded-2xl border border-text-secondary/15 bg-background/80 px-4 py-3 text-sm text-text-secondary"
          role="status"
        >
          {noIssueReason}
        </div>
      )}

      {/* Search / filter bar */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-text-secondary/10 bg-surface p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
          <input
            type="text"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            placeholder="Patient name or ID"
            className={`w-full pl-10 ${INPUT_CLASS}`}
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={INPUT_CLASS}
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={INPUT_CLASS}
          title="To date"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PrescriptionStatus | '')}
          className={INPUT_CLASS}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Prescriptions table */}
      <div
        className="overflow-hidden rounded-2xl bg-surface"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="rx-table w-full">
            <thead>
              <tr className="border-b border-text-secondary/20 bg-background/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Medicines
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((rx) => (
                  <tr
                    key={rx.id}
                    className="border-b border-text-secondary/10 transition-colors hover:bg-background/50"
                  >
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDate(rx.issuedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {displayName(rx)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-text-secondary">
                      {rx.medicines}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rx.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPrescription(rx)}
                        className="text-sm font-medium text-primary-light hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-text-secondary"
                  >
                    {loading
                      ? 'Loading...'
                      : 'No prescriptions found. Use filters or issue a new prescription.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrescriptionForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleIssuePrescription}
        patients={formPatients}
        appointments={formAppointments}
      />

      {selectedPrescription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && setSelectedPrescription(null)
          }
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-xl"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-text-secondary/10 bg-surface px-6 py-4">
              <h2 className="text-xl font-semibold text-primary">
                Prescription Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition hover:bg-primary-light/10 hover:text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Prescription ID
                  </p>
                  <p className="mt-1 text-sm font-mono text-primary">
                    {selectedPrescription.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Patient
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {displayName(selectedPrescription)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Status
                  </p>
                  <p className="mt-1">
                    <StatusBadge status={selectedPrescription.status} />
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Issued at
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {formatDate(selectedPrescription.issuedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Appointment
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {selectedPrescription.appointmentId ?? '—'}
                  </p>
                </div>
              </div>
              {selectedPrescription.diagnosis && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Diagnosis
                  </p>
                  <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
                    {selectedPrescription.diagnosis}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Medicines
                </p>
                <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
                  {selectedPrescription.medicines}
                </p>
              </div>
              {selectedPrescription.instructions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Instructions
                  </p>
                  <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
                    {selectedPrescription.instructions}
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Valid from
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {selectedPrescription.validFrom
                      ? formatDate(selectedPrescription.validFrom)
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Valid to
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {selectedPrescription.validTo
                      ? formatDate(selectedPrescription.validTo)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
