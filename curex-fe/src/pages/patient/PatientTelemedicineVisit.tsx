import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, RefreshCcw, Video } from "lucide-react";
import { getAppointmentById } from "../../services/appointmentService";
import { getTelemedicineSession } from "../../services/telemedicineService";
import type { AppointmentRecord } from "../../types/appointment";
import type { TelemedicineSessionRecord } from "../../types/telemedicine";
import { useToast } from "../../store/hooks";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

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
  const { toast } = useToast();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(
    null,
  );
  const [session, setSession] = useState<TelemedicineSessionRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [transcriptText, setTranscriptText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoRestartRef = useRef(false);

  const isJoinable = useMemo(
    () => canJoin(appointment, session),
    [appointment, session],
  );

  const transcriptSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const load = useCallback(async () => {
    if (!appointmentId) {
      toast("Appointment ID is missing.", "error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [appointmentData, sessionData] = await Promise.all([
        getAppointmentById(appointmentId),
        getTelemedicineSession(appointmentId),
      ]);

      setAppointment(appointmentData);
      setSession(sessionData);
    } catch {
      toast("Could not load telemedicine session details right now.", "error");
      setAppointment(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!transcriptSupported) {
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalChunk += `${text.trim()} `;
        } else {
          interimChunk += text;
        }
      }

      if (finalChunk) {
        setTranscriptText((prev) => `${prev}${finalChunk}`.trimStart());
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        toast(`Live transcript error: ${event.error}`, "warning");
      }
    };

    recognition.onend = () => {
      if (autoRestartRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Ignore restart failures.
        }
      }
      setIsTranscribing(false);
    };

    recognitionRef.current = recognition;

    return () => {
      autoRestartRef.current = false;
      try {
        recognition.stop();
      } catch {
        // Ignore teardown stop errors.
      }
      recognitionRef.current = null;
    };
  }, [toast, transcriptSupported]);

  const startTranscript = useCallback(() => {
    if (!recognitionRef.current) {
      toast("Live transcript is not supported in this browser.", "warning");
      return;
    }

    autoRestartRef.current = true;
    try {
      recognitionRef.current.start();
      setIsTranscribing(true);
      toast("Live transcript started.", "info");
    } catch {
      toast("Could not start live transcript. Check microphone permission.", "error");
    }
  }, [toast]);

  const stopTranscript = useCallback(() => {
    autoRestartRef.current = false;
    setInterimTranscript("");
    try {
      recognitionRef.current?.stop();
      setIsTranscribing(false);
      toast("Live transcript stopped.", "info");
    } catch {
      // Ignore stop errors.
    }
  }, [toast]);

  const exportTranscript = useCallback(() => {
    const content = `${transcriptText}${interimTranscript ? `\n${interimTranscript}` : ""}`.trim();
    if (!content) {
      toast("No transcript content to export yet.", "warning");
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const appointmentPart = appointment?.id ?? "session";
    link.href = url;
    link.download = `telemedicine-transcript-${appointmentPart}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Transcript exported.", "success");
  }, [appointment?.id, interimTranscript, toast, transcriptText]);

  useEffect(() => {
    if (isJoinable && transcriptSupported && !isTranscribing) {
      startTranscript();
    }
  }, [isJoinable, isTranscribing, startTranscript, transcriptSupported]);

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

            <div className="mt-5 rounded-xl border border-text-secondary/15 bg-background/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary">Live Transcript</h3>
                <span className="text-[11px] text-text-secondary">
                  {transcriptSupported
                    ? isTranscribing
                      ? "Recording"
                      : "Stopped"
                    : "Unsupported"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startTranscript}
                  disabled={!transcriptSupported || !isJoinable || isTranscribing}
                  className="rounded-lg border border-primary-light/30 bg-primary-light/10 px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-50"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={stopTranscript}
                  disabled={!isTranscribing}
                  className="rounded-lg border border-text-secondary/20 px-2.5 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={exportTranscript}
                  className="rounded-lg border border-primary/30 bg-primary px-2.5 py-1 text-xs font-semibold text-surface"
                >
                  Export .txt
                </button>
              </div>

              <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-text-secondary/15 bg-surface px-3 py-2 text-xs text-primary">
                {(transcriptText || interimTranscript).trim() ? (
                  <>
                    <p>{transcriptText}</p>
                    {interimTranscript && (
                      <p className="text-text-secondary">{interimTranscript}</p>
                    )}
                  </>
                ) : (
                  <p className="text-text-secondary">
                    Transcript will appear here once meeting audio is captured.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
