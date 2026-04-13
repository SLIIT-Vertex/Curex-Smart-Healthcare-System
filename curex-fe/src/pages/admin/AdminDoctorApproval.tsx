import { useCallback, useEffect, useState } from "react";
import {
  UserCheck,
  UserX,
  Stethoscope,
  RefreshCw,
  CalendarDays,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  MapPin,
  Award,
  FileText,
  Clock,
  User,
  Download,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { useToast } from "../../store/hooks";
import type { UserResponse } from "../../types/auth";

/* ═══════════════════════════════════════════════════════════════════════════
   Confirmation dialog (approve / reject)
   ═══════════════════════════════════════════════════════════════════════════ */

interface ConfirmDialogProps {
  user: UserResponse;
  action: "APPROVE" | "REJECT";
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmDialog({
  user,
  action,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  const [notes, setNotes] = useState("");
  const isApprove = action === "APPROVE";

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${isApprove ? "Approve" : "Reject"} doctor account`}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isApprove ? "bg-status-healthy/15" : "bg-error/15"}`}
          >
            {isApprove ? (
              <CheckCircle2
                className="h-5 w-5 text-status-healthy"
                strokeWidth={1.75}
              />
            ) : (
              <XCircle className="h-5 w-5 text-error" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-primary">
              {isApprove ? "Approve" : "Reject"} doctor account
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {user.firstName} {user.lastName} — {user.email}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-text-secondary">
          {isApprove
            ? "The doctor will be notified and can start accepting patient appointments."
            : "The doctor will be notified that their application was not accepted."}
        </p>

        <div className="mt-4">
          <label
            htmlFor="approval-notes"
            className="text-sm font-medium text-primary"
          >
            Notes{" "}
            <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <textarea
            id="approval-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isApprove
                ? "e.g. Credentials verified successfully"
                : "e.g. Incomplete licence documentation"
            }
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-text-secondary/20 bg-background px-4 py-3 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary flex-1 justify-center py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(notes)}
            disabled={isLoading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-surface transition disabled:opacity-60 ${
              isApprove
                ? "bg-status-healthy hover:brightness-95"
                : "bg-error hover:brightness-95"
            }`}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface/30 border-t-surface" />
            ) : isApprove ? (
              <UserCheck className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <UserX className="h-4 w-4" strokeWidth={1.75} />
            )}
            {isLoading ? "Processing…" : isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Detail modal — shows all doctor information
   ═══════════════════════════════════════════════════════════════════════════ */

interface DetailModalProps {
  doctor: UserResponse;
  onClose: () => void;
  onApprove: (doctor: UserResponse) => void;
  onReject: (doctor: UserResponse) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | number | null;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary/70"
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary/60">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

function DoctorDetailModal({
  doctor,
  onClose,
  onApprove,
  onReject,
}: DetailModalProps) {
  const proofDocs = doctor.proofDocumentUrls
    ? doctor.proofDocumentUrls
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for Dr. ${doctor.firstName} ${doctor.lastName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-surface overflow-hidden flex flex-col"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-text-secondary/10 px-6 py-4">
          <div className="flex items-center gap-3">
            {doctor.profileImageUrl ? (
              <img
                src={doctor.profileImageUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover border-2 border-primary/10"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-sky/15 text-sm font-bold text-primary">
                {doctor.firstName[0]}
                {doctor.lastName[0]}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-primary">
                Dr. {doctor.firstName} {doctor.lastName}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-status-attention/15 px-2 py-0.5 text-xs font-medium text-status-attention">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-attention" />
                Pending Review
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-text-secondary/10 hover:text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Personal Information */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-1">
              Personal Information
            </h3>
            <div className="divide-y divide-text-secondary/8">
              <DetailRow icon={Mail} label="Email" value={doctor.email} />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={doctor.phoneNumber}
              />
              <DetailRow
                icon={CalendarDays}
                label="Date of Birth"
                value={
                  doctor.dob
                    ? new Date(doctor.dob).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : null
                }
              />
              <DetailRow icon={User} label="Gender" value={doctor.gender} />
              <DetailRow icon={MapPin} label="Address" value={doctor.address} />
            </div>
          </section>

          {/* Medical Credentials */}
          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-1">
              Medical Credentials
            </h3>
            <div className="divide-y divide-text-secondary/8">
              <DetailRow
                icon={Stethoscope}
                label="Specialty"
                value={doctor.specialty}
              />
              <DetailRow
                icon={Award}
                label="Medical License No."
                value={doctor.medicalLicenseNumber}
              />
              <DetailRow
                icon={Clock}
                label="Years of Experience"
                value={
                  doctor.yearsOfExperience != null
                    ? `${doctor.yearsOfExperience} year${doctor.yearsOfExperience !== 1 ? "s" : ""}`
                    : null
                }
              />
              <DetailRow
                icon={Award}
                label="Certifications"
                value={doctor.certifications}
              />
            </div>
          </section>

          {/* Proof Documents */}
          {proofDocs.length > 0 && (
            <section className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-2">
                Proof Documents
              </h3>
              <div className="flex flex-col gap-2">
                {proofDocs.map((url, i) => {
                  const filename = decodeURIComponent(
                    url.split("/").pop() ?? `Document ${i + 1}`,
                  );
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-text-secondary/15 bg-background px-4 py-3 text-sm text-primary hover:border-primary-light/30 hover:bg-primary/[0.02] transition-colors group"
                    >
                      <FileText
                        className="h-4 w-4 shrink-0 text-primary-light"
                        strokeWidth={1.5}
                      />
                      <span className="flex-1 truncate">{filename}</span>
                      <Download
                        className="h-3.5 w-3.5 shrink-0 text-text-secondary/40 group-hover:text-primary-light transition-colors"
                        strokeWidth={1.5}
                      />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* If no medical data at all */}
          {!doctor.specialty &&
            !doctor.medicalLicenseNumber &&
            doctor.yearsOfExperience == null &&
            !doctor.certifications &&
            proofDocs.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-status-attention/30 bg-status-attention/5 px-4 py-6 text-center">
                <p className="text-sm text-status-attention font-medium">
                  No credentials submitted
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  This doctor did not provide medical credentials during
                  registration.
                </p>
              </div>
            )}

          {/* Application metadata */}
          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary/50 mb-1">
              Application Details
            </h3>
            <div className="divide-y divide-text-secondary/8">
              <DetailRow
                icon={CalendarDays}
                label="Applied on"
                value={
                  new Date(doctor.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }) +
                  " at " +
                  new Date(doctor.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
              />
              <DetailRow
                icon={CheckCircle2}
                label="Email Verified"
                value={doctor.emailVerified ? "Yes" : "No"}
              />
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="border-t border-text-secondary/10 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={() => onReject(doctor)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-3 py-2.5 text-sm font-medium text-error transition hover:bg-error/10"
          >
            <UserX className="h-4 w-4" strokeWidth={1.75} />
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove(doctor)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-healthy px-3 py-2.5 text-sm font-semibold text-primary transition hover:brightness-95"
          >
            <UserCheck className="h-4 w-4" strokeWidth={1.75} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Doctor card — compact card with View button
   ═══════════════════════════════════════════════════════════════════════════ */

interface DoctorCardProps {
  doctor: UserResponse;
  onView: (doctor: UserResponse) => void;
  onApprove: (doctor: UserResponse) => void;
  onReject: (doctor: UserResponse) => void;
}

function DoctorCard({ doctor, onView, onApprove, onReject }: DoctorCardProps) {
  return (
    <div
      className="rounded-2xl bg-surface p-5 transition-shadow hover:shadow-md"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {doctor.profileImageUrl ? (
            <img
              src={doctor.profileImageUrl}
              alt=""
              className="h-11 w-11 rounded-full object-cover border-2 border-primary/10"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-sky/15 text-sm font-bold text-primary">
              {doctor.firstName[0]}
              {doctor.lastName[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-primary">
              Dr. {doctor.firstName} {doctor.lastName}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-status-attention/15 px-2 py-0.5 text-xs font-medium text-status-attention">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-attention" />
              Pending Review
            </span>
          </div>
        </div>

        {/* View details button */}
        <button
          type="button"
          onClick={() => onView(doctor)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-text-secondary/15 text-text-secondary hover:border-primary-light/30 hover:text-primary-light hover:bg-primary-light/5 transition-colors"
          aria-label={`View details for Dr. ${doctor.firstName} ${doctor.lastName}`}
          title="View details"
        >
          <Eye className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Details */}
      <dl className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <dd className="truncate">{doctor.email}</dd>
        </div>
        {doctor.phoneNumber && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <dd>{doctor.phoneNumber}</dd>
          </div>
        )}
        {doctor.specialty && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Stethoscope className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <dd className="truncate">{doctor.specialty}</dd>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <dd>
            Applied{" "}
            {new Date(doctor.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => onReject(doctor)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-3 py-2.5 text-sm font-medium text-error transition hover:bg-error/10"
        >
          <UserX className="h-4 w-4" strokeWidth={1.75} />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onApprove(doctor)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-status-healthy px-3 py-2.5 text-sm font-semibold text-primary transition hover:brightness-95"
        >
          <UserCheck className="h-4 w-4" strokeWidth={1.75} />
          Approve
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdminDoctorApproval() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewDoctor, setViewDoctor] = useState<UserResponse | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    doctor: UserResponse;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [isActing, setIsActing] = useState(false);

  const fetchDoctors = useCallback(
    (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      adminService
        .getPendingDoctors()
        .then(setDoctors)
        .catch(() => toast("Failed to load pending doctors.", "error"))
        .finally(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [toast],
  );

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const openConfirm = (doctor: UserResponse, action: "APPROVE" | "REJECT") => {
    setViewDoctor(null); // close detail modal if open
    setConfirmTarget({ doctor, action });
  };

  async function handleConfirm(notes: string) {
    if (!confirmTarget) return;
    setIsActing(true);
    try {
      await adminService.updateUserStatus(confirmTarget.doctor.id, {
        action: confirmTarget.action,
        notes: notes || undefined,
      });
      const isApprove = confirmTarget.action === "APPROVE";
      toast(
        isApprove
          ? `Dr. ${confirmTarget.doctor.firstName} ${confirmTarget.doctor.lastName} has been approved.`
          : `Dr. ${confirmTarget.doctor.firstName} ${confirmTarget.doctor.lastName}'s application was rejected.`,
        isApprove ? "success" : "warning",
      );
      setConfirmTarget(null);
      fetchDoctors(true);
    } catch {
      toast("Action failed. Please try again.", "error");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <>
      {/* Detail modal */}
      {viewDoctor && (
        <DoctorDetailModal
          doctor={viewDoctor}
          onClose={() => setViewDoctor(null)}
          onApprove={(d) => openConfirm(d, "APPROVE")}
          onReject={(d) => openConfirm(d, "REJECT")}
        />
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          user={confirmTarget.doctor}
          action={confirmTarget.action}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
          isLoading={isActing}
        />
      )}

      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              Doctor Approval
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {doctors.length} application{doctors.length !== 1 ? "s" : ""}{" "}
              waiting for review
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchDoctors(true)}
            disabled={isRefreshing}
            aria-label="Refresh list"
            className="btn-secondary flex items-center gap-1.5 py-2 text-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              strokeWidth={1.75}
            />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-60 animate-pulse rounded-2xl bg-text-secondary/10"
              />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-text-secondary/20 bg-surface px-8 py-20 text-center">
            <UserCheck
              className="h-10 w-10 text-status-healthy"
              strokeWidth={1.25}
            />
            <p className="mt-3 text-base font-medium text-primary">
              All caught up!
            </p>
            <p className="mt-1 max-w-xs text-sm text-text-secondary">
              There are no pending doctor applications to review right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onView={setViewDoctor}
                onApprove={(d) => openConfirm(d, "APPROVE")}
                onReject={(d) => openConfirm(d, "REJECT")}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
