import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { MedicineLine } from '../../types/doctor'

const INPUT_CLASS =
  'w-full rounded-xl border border-text-secondary/20 bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20'

export interface PrescriptionFormData {
  patientId: string
  appointmentId: string
  patientEmail?: string
  patientName?: string
  diagnosis?: string
  medicines: MedicineLine[]
  instructions: string
  validFrom: string
  validTo: string
}

export interface PrescriptionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PrescriptionFormData) => void
  patients: { id: string; name: string }[]
  appointments: {
    id: string
    patientId: string
    patientName?: string
    patientEmail?: string
    date: string
  }[]
  prefill?: { patientId: string; appointmentId: string }
}

const emptyMedicine: MedicineLine = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
}

/** YYYY-MM-DD in the user's local calendar (avoids UTC shifting vs doctor-service status-zone dates). */
function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultValidFromString(): string {
  return localYmd(new Date())
}

function defaultValidToString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return localYmd(d)
}

export function PrescriptionForm({
  isOpen,
  onClose,
  onSubmit,
  patients,
  appointments,
  prefill,
}: PrescriptionFormProps) {
  const [patientId, setPatientId] = useState(prefill?.patientId ?? '')
  const [appointmentId, setAppointmentId] = useState(prefill?.appointmentId ?? '')
  const [medicines, setMedicines] = useState<MedicineLine[]>([{ ...emptyMedicine }])
  const [instructions, setInstructions] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [validFrom, setValidFrom] = useState(defaultValidFromString)
  const [validTo, setValidTo] = useState(defaultValidToString)
  const [patientSearch, setPatientSearch] = useState('')

  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients

  const filteredAppointments = appointments.filter(
    (a) => !patientId || a.patientId === patientId
  )

  // When appointment is selected, auto-fill patientId from the appointment
  const handleAppointmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setAppointmentId(id)
    if (id) {
      const appt = appointments.find((a) => a.id === id)
      if (appt) {
        setPatientId(appt.patientId)
      }
    }
  }

  const reset = () => {
    setPatientId('')
    setAppointmentId('')
    setMedicines([{ ...emptyMedicine }])
    setInstructions('')
    setDiagnosis('')
    setValidFrom(defaultValidFromString())
    setValidTo(defaultValidToString())
    setPatientSearch('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validMedicines = medicines.filter((m) => m.name.trim())
    const selectedAppt = appointments.find((a) => a.id === appointmentId)
    const resolvedPatientId = patientId || selectedAppt?.patientId
    if (!resolvedPatientId || !appointmentId || validMedicines.length === 0) return

    onSubmit({
      patientId: resolvedPatientId,
      appointmentId,
      patientEmail: selectedAppt?.patientEmail,
      patientName: selectedAppt?.patientName,
      diagnosis: diagnosis.trim() || undefined,
      medicines: validMedicines,
      instructions,
      validFrom,
      validTo,
    })
    handleClose()
  }

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { ...emptyMedicine }])
  }

  const updateMedicine = (index: number, field: keyof MedicineLine, value: string) => {
    setMedicines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-xl"
        style={{ boxShadow: 'var(--shadow-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-text-secondary/10 bg-surface px-6 py-4">
          <h2 className="text-xl font-semibold text-primary">
            Issue Prescription
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition hover:bg-primary-light/10 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Patient selector — search + select  */}
          <div>
            <label className="block text-sm font-medium text-primary">
              Patient
            </label>
            <div className="mt-1.5 flex flex-nowrap items-stretch gap-2 sm:gap-3">
              <input
                type="search"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className={`min-w-0 flex-1 basis-0 ${INPUT_CLASS}`}
                aria-label="Search patient by name or ID"
              />
              <select
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value)
                  setAppointmentId('')
                }}
                required
                className={`min-w-0 flex-1 basis-0 ${INPUT_CLASS}`}
                aria-label="Select a patient"
              >
                <option value="">Select a patient</option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Appointment selector — required for prescriptions */}
          <div>
            <label className="block text-sm font-medium text-primary">
              Appointment (required)
            </label>
            <select
              value={appointmentId}
              onChange={handleAppointmentChange}
              required
              className={`mt-1.5 ${INPUT_CLASS}`}
            >
              <option value="">Select an appointment</option>
              {filteredAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patientName ?? a.patientId} — {a.date}
                </option>
              ))}
            </select>
          </div>

          {/* Valid from / Valid to */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary">
                Valid from
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">
                Valid to
              </label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                required
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
            </div>
          </div>

          {/* Diagnosis / Clinical notes */}
          <div>
            <label className="block text-sm font-medium text-primary">
              Diagnosis / Clinical notes (optional)
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="e.g. Viral upper respiratory tract infection"
              className={`mt-1.5 ${INPUT_CLASS} resize-y`}
            />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-primary">
                Medicines
              </label>
              <button
                type="button"
                onClick={addMedicine}
                className="flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Add medicine
              </button>
            </div>

            <div className="mt-2 space-y-3">
              {medicines.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-text-secondary/20 bg-background/50 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => updateMedicine(i, 'name', e.target.value)}
                      placeholder="Medicine name"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={m.dosage}
                      onChange={(e) => updateMedicine(i, 'dosage', e.target.value)}
                      placeholder="Dosage"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={m.frequency}
                      onChange={(e) =>
                        updateMedicine(i, 'frequency', e.target.value)
                      }
                      placeholder="Frequency"
                      className={INPUT_CLASS}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m.duration}
                        onChange={(e) =>
                          updateMedicine(i, 'duration', e.target.value)
                        }
                        placeholder="Duration"
                        className={INPUT_CLASS}
                      />
                      <button
                        type="button"
                        onClick={() => removeMedicine(i)}
                        disabled={medicines.length === 1}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-error/30 text-error transition hover:bg-error/10 disabled:opacity-40"
                        aria-label="Remove medicine"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-primary">
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Additional instructions for the patient..."
              className={`mt-1.5 ${INPUT_CLASS} resize-y`}
            />
          </div>

          <div className="flex gap-3 border-t border-text-secondary/10 pt-6">
            <button type="submit" className="btn-primary">
              Issue Prescription
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
