import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, RefreshCcw, Video } from "lucide-react";
import { getAppointmentById } from "../../services/appointmentService";
import { getTelemedicineSession } from "../../services/telemedicineService";
import type { AppointmentRecord } from "../../types/appointment";
import type { TelemedicineSessionRecord } from "../../types/telemedicine";

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function canJoin(
  appointment: AppointmentRecord | null,
  session: TelemedicineSessionRecord | null,
): boolean {
  if (!appointment || !session?.sessionUrl) {
    return false;
  }

  if (appointment.type !== "TELEMEDICINE") {
    return false;
  }

  const statusEligible =
    appointment.status === "CONFIRMED" || appointment.status === "IN_SESSION";
  const timeReached =
    new Date(appointment.appointmentTime).getTime() <= Date.now();
  return statusEligible && timeReached;
}

export function PatientTelemedicineVisit() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(
    null,
  );
  const [session, setSession] = useState<TelemedicineSessionRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isJoinable = useMemo(
    () => canJoin(appointment, session),
    [appointment, session],
  );

  const load = useCallback(async () => {
    if (!appointmentId) {
      setError("Appointment ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [appointmentData, sessionData] = await Promise.all([
        getAppointmentById(appointmentId),
        getTelemedicineSession(appointmentId),
      ]);

      setAppointment(appointmentData);
      setSession(sessionData);
    } catch {
      setError("Could not load telemedicine session details right now.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-heading">Telemedicine Session</h1>
          <p className="section-subtext mt-1">
            Join your video consultation when the appointment is confirmed and
            time is reached.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/patient/appointments"
            className="rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
          >
            Back to Appointments
          </Link>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="appointment-panel p-5 text-sm text-text-secondary">
          Loading telemedicine room...
        </div>
      ) : error ? (
        <div className="appointment-panel border border-error/30 bg-error/10 p-5 text-sm text-primary">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="appointment-panel overflow-hidden p-0">
            {isJoinable && session?.sessionUrl ? (
              <iframe
                title="Telemedicine Session"
                src={session.sessionUrl}
                className="h-[68vh] min-h-[480px] w-full"
                allow="camera; microphone; fullscreen; display-capture"
              />
            ) : (
              <div className="flex h-[68vh] min-h-[480px] flex-col items-center justify-center gap-3 bg-background/60 px-6 text-center">
                <Video className="h-12 w-12 text-primary-light" />
                <h2 className="text-xl font-semibold text-primary">
                  Room access is not open yet
                </h2>
                <p className="max-w-lg text-sm text-text-secondary">
                  The telemedicine room becomes available once the appointment
                  is confirmed and the scheduled time has started.
                </p>
              </div>
            )}
          </div>

          <aside className="appointment-panel p-5">
            <h2 className="text-base font-semibold text-primary">
              Session details
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium text-primary">Appointment:</span>{" "}
                {appointment?.id}
              </p>
              <p>
                <span className="font-medium text-primary">Doctor:</span>{" "}
                {appointment?.doctorName ?? appointment?.doctorId}
              </p>
              <p>
                <span className="font-medium text-primary">Specialty:</span>{" "}
                {appointment?.doctorSpecialty ?? "-"}
              </p>
              <p>
                <span className="font-medium text-primary">Scheduled:</span>{" "}
                {appointment
                  ? formatDateTime(appointment.appointmentTime)
                  : "-"}
              </p>
              <p>
                <span className="font-medium text-primary">Status:</span>{" "}
                {appointment?.status ?? "-"}
              </p>
              <p>
                <span className="font-medium text-primary">Room:</span>{" "}
                {session?.roomName ?? "Pending creation"}
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {session?.sessionUrl ? (
                <a
                  href={session.sessionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-light/40 bg-primary-light/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light/20"
                >
                  Open in New Tab
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <p className="rounded-lg border border-text-secondary/15 bg-background/50 px-3 py-2 text-xs text-text-secondary">
                  Session URL not generated yet.
                </p>
              )}

              {!isJoinable && (
                <p className="rounded-lg border border-accent-peach/30 bg-accent-peach/20 px-3 py-2 text-xs text-primary">
                  Join is enabled only after confirmation and at the appointment
                  time.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
