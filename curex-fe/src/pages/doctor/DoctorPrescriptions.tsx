import { useState, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { PrescriptionForm } from '../../components/doctor/PrescriptionForm'
import type { Prescription, PrescriptionStatus } from '../../types/doctor'
import type { PrescriptionFormData } from '../../components/doctor/PrescriptionForm'
import '../../styles/pages/DoctorDashboard.css'

const INPUT_CLASS =
  'rounded-xl border border-text-secondary/20 bg-surface px-4 py-2 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

/* ── Mock data ── */

const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx1',
    doctorId: 'd1',
    patientId: 'p1',
    appointmentId: '1',
    medicines: 'Paracetamol 500mg',
    instructions: 'Take twice daily with food',
    issuedAt: '2025-03-22T10:00:00',
    status: 'ISSUED',
  },
  {
    id: 'rx2',
    doctorId: 'd1',
    patientId: 'p2',
    appointmentId: '2',
    medicines: 'Amoxicillin 250mg',
    instructions: 'One capsule three times daily for 7 days',
    issuedAt: '2025-03-21T14:30:00',
    status: 'ISSUED',
  },
  {
    id: 'rx3',
    doctorId: 'd1',
    patientId: 'p1',
    appointmentId: '3',
    medicines: 'Ibuprofen 400mg, Vitamin D3',
    instructions: 'Take ibuprofen as needed. Vitamin D once daily.',
    issuedAt: '2025-03-20T09:15:00',
    status: 'PENDING',
  },
  {
    id: 'rx4',
    doctorId: 'd1',
    patientId: 'p3',
    appointmentId: '4',
    medicines: 'Omeprazole 20mg',
    instructions: 'Before breakfast for 14 days',
    issuedAt: '2025-03-18T11:00:00',
    status: 'CANCELLED',
  },
]

const MOCK_PATIENTS = [
  { id: 'p1', name: 'John Doe' },
  { id: 'p2', name: 'Jane Smith' },
  { id: 'p3', name: 'Mary Kumar' },
]

const MOCK_APPOINTMENTS = [
  { id: '1', patientId: 'p1', patientName: 'John Doe', date: '22 Mar 2025' },
  { id: '2', patientId: 'p2', patientName: 'Jane Smith', date: '21 Mar 2025' },
  { id: '3', patientId: 'p1', patientName: 'John Doe', date: '20 Mar 2025' },
  { id: '4', patientId: 'p3', patientName: 'Mary Kumar', date: '18 Mar 2025' },
]

const PATIENT_NAMES: Record<string, string> = Object.fromEntries(
  MOCK_PATIENTS.map((p) => [p.id, p.name])
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status?: PrescriptionStatus }) {
  const s = status ?? 'ISSUED'
  const styles = {
    ISSUED: 'bg-accent-mint/20 text-primary border-accent-mint/40',
    PENDING: 'bg-accent-peach/20 text-primary border-accent-peach/40',
    CANCELLED: 'bg-error/20 text-primary border-error/40',
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[s]}`}
    >
      {s}
    </span>
  )
}

export function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS)
  const [modalOpen, setModalOpen] = useState(false)

  const [patientFilter, setPatientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | ''>('')

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      if (patientFilter) {
        const name = PATIENT_NAMES[rx.patientId] ?? ''
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
  }, [prescriptions, patientFilter, dateFrom, dateTo, statusFilter])

  const handleIssuePrescription = (data: PrescriptionFormData) => {
    const medicinesStr = data.medicines
      .map(
        (m) =>
          `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}${m.duration ? `, ${m.duration}` : ''}`
      )
      .join('; ')

    const newRx: Prescription = {
      id: `rx${Date.now()}`,
      doctorId: 'd1',
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      medicines: medicinesStr,
      instructions: data.instructions,
      issuedAt: new Date().toISOString(),
      status: 'ISSUED',
    }
    setPrescriptions((prev) => [newRx, ...prev])
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
          onClick={() => setModalOpen(true)}
          className="btn-primary shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Issue Prescription
        </button>
      </div>

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
          <option value="ISSUED">Issued</option>
          <option value="PENDING">Pending</option>
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
                      {PATIENT_NAMES[rx.patientId] ?? rx.patientId}
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
                    No prescriptions found. Use filters or issue a new
                    prescription.
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
        patients={MOCK_PATIENTS}
        appointments={MOCK_APPOINTMENTS}
      />
    </div>
  )
}
