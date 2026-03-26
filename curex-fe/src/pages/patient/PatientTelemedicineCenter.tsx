import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Copy,
  Eye,
  Maximize2,
  Mic,
  Minimize2,
  RefreshCcw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { getAppointmentsByPatient } from "../../services/appointmentService";
import {
  createTelemedicineSession,
  getTelemedicineSession,
} from "../../services/telemedicineService";
import type { AppointmentRecord } from "../../types/appointment";
import type { TelemedicineSessionRecord } from "../../types/telemedicine";
import telemedImage from "../../assets/telemed/telemed.png";
import { useAuth, useToast } from "../../store/hooks";

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

function canJoin(
  appointment: AppointmentRecord | null,
  session: TelemedicineSessionRecord | null,
): boolean {
  if (
    !appointment ||
    appointment.type !== "TELEMEDICINE" ||
    !session?.sessionUrl
  ) {
    return false;
  }

  const statusEligible =
    appointment.status === "CONFIRMED" || appointment.status === "IN_SESSION";
  const joinOpensAt =
    new Date(appointment.appointmentTime).getTime() - 60 * 60 * 1000;
  const startsWithinOneHour = Date.now() >= joinOpensAt;

  return statusEligible && startsWithinOneHour;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function appointmentDateTime(appointment: AppointmentRecord): string {
  const dt = new Date(appointment.appointmentTime);
  return `${dt.toLocaleDateString("en-GB")} ${dt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function meetingTitle(appointment: AppointmentRecord): string {
  const doctor = appointment.doctorName ?? appointment.doctorId;
  const date = new Date(appointment.appointmentTime).toLocaleDateString(
    "en-GB",
  );
  return `Telemedicine with ${doctor} - ${date}`;
}

function joinAvailability(appointment: AppointmentRecord): string {
  if (
    appointment.status !== "CONFIRMED" &&
    appointment.status !== "IN_SESSION"
  ) {
    return "Waiting for confirmation";
  }

  const joinOpensAt =
    new Date(appointment.appointmentTime).getTime() - 60 * 60 * 1000;
  if (Date.now() >= joinOpensAt) {
    return "Available now";
  }

  return `Available at ${formatDateTime(new Date(joinOpensAt).toISOString())}`;
}

function queueStatus(
  appointment: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined,
): string {
  if (session?.status === "ENDED") {
    return "ENDED";
  }
  return String(appointment.status);
}

export function PatientTelemedicineCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "meeting">(
    appointmentId ? "meeting" : "queue",
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(appointmentId ?? null);
  const [sessions, setSessions] = useState<
    Record<string, TelemedicineSessionRecord | null>
  >({});
  const [fullScreen, setFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transcriptText, setTranscriptText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoRestartRef = useRef(false);
  const meetingPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (appointmentId) {
      setSelectedAppointmentId(appointmentId);
      setActiveTab("meeting");
    }
  }, [appointmentId]);

  const teleAppointments = useMemo(
    () =>
      appointments
        .filter((appt) => appt.type === "TELEMEDICINE")
        .sort(
          (a, b) =>
            new Date(a.appointmentTime).getTime() -
            new Date(b.appointmentTime).getTime(),
        ),
    [appointments],
  );

  const activeTeleAppointments = useMemo(
    () =>
      teleAppointments.filter((appt) => sessions[appt.id]?.status !== "ENDED"),
    [teleAppointments, sessions],
  );

  const endedTeleAppointments = useMemo(
    () =>
      teleAppointments.filter((appt) => sessions[appt.id]?.status === "ENDED"),
    [teleAppointments, sessions],
  );

  const selectedAppointment = useMemo(
    () =>
      teleAppointments.find((appt) => appt.id === selectedAppointmentId) ??
      teleAppointments[0] ??
      null,
    [teleAppointments, selectedAppointmentId],
  );

  const nextUpcomingAppointment = useMemo(() => {
    const now = Date.now();
    return (
      teleAppointments.find(
        (appt) => new Date(appt.appointmentTime).getTime() >= now,
      ) ?? null
    );
  }, [teleAppointments]);

  const meetingAppointment = selectedAppointment ?? nextUpcomingAppointment;

  useEffect(() => {
    if (!selectedAppointment && teleAppointments.length > 0) {
      setSelectedAppointmentId(teleAppointments[0].id);
    }
  }, [teleAppointments, selectedAppointment]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        toast("Please login as a patient to access telemedicine.", "error");
        setAppointments([]);
        setSessions({});
        setLoading(false);
        return;
      }

      const appts = await getAppointmentsByPatient(user.id);
      setAppointments(appts);

      const tele = appts.filter((appt) => appt.type === "TELEMEDICINE");
      const entries = await Promise.all(
        tele.map(async (appt) => {
          try {
            const existing = await getTelemedicineSession(appt.id);
            if (existing) {
              return [appt.id, existing] as const;
            }

            const created = await createTelemedicineSession(appt.id, {
              patientId: appt.patientId,
              doctorId: appt.doctorId,
            });
            return [appt.id, created] as const;
          } catch {
            return [appt.id, null] as const;
          }
        }),
      );

      const next: Record<string, TelemedicineSessionRecord | null> = {};
      for (const [id, session] of entries) {
        next[id] = session;
      }
      setSessions(next);
    } catch {
      toast("Could not load telemedicine appointments right now.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFullScreenChange = () => {
      setFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  async function toggleFullScreen() {
    if (!meetingPanelRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await meetingPanelRef.current.requestFullscreen();
  }

  const meetingSession = meetingAppointment
    ? (sessions[meetingAppointment.id] ?? null)
    : null;
  const roomJoinable = canJoin(meetingAppointment, meetingSession);
  const transcriptSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!transcriptSupported) {
      return;
    }

    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
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
      toast(
        "Could not start live transcript. Check microphone permission.",
        "error",
      );
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
    const appointmentPart = meetingAppointment?.id ?? "session";
    link.href = url;
    link.download = `telemedicine-transcript-${appointmentPart}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Transcript exported.", "success");
  }, [interimTranscript, meetingAppointment?.id, toast, transcriptText]);

  const copyTranscript = useCallback(async () => {
    const content = `${transcriptText}${interimTranscript ? `\n${interimTranscript}` : ""}`.trim();
    if (!content) {
      toast("No transcript content to copy yet.", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast("Transcript copied to clipboard.", "success");
    } catch {
      toast("Could not copy transcript.", "error");
    }
  }, [interimTranscript, toast, transcriptText]);

  const clearTranscript = useCallback(() => {
    setTranscriptText("");
    setInterimTranscript("");
    toast("Transcript cleared.", "info");
  }, [toast]);

  const transcriptWordCount = useMemo(() => {
    const content = `${transcriptText} ${interimTranscript}`.trim();
    if (!content) {
      return 0;
    }
    return content.split(/\s+/).length;
  }, [interimTranscript, transcriptText]);

  useEffect(() => {
    if (activeTab === "meeting" && roomJoinable && transcriptSupported && !isTranscribing) {
      startTranscript();
    }
  }, [activeTab, isTranscribing, roomJoinable, startTranscript, transcriptSupported]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-heading">Telemedicine</h1>
          <p className="section-subtext mt-1">
            Join your online consultations directly inside Curex.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/patient/appointments"
            className="rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
          >
            My Bookings
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

      {loading && (
        <div className="appointment-panel p-5 text-sm text-text-secondary">
          Loading telemedicine data...
        </div>
      )}

      <div className="space-y-4">
        <div className="inline-flex rounded-xl border border-text-secondary/20 bg-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "queue"
                ? "bg-primary-light/10 text-primary"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            Video Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("meeting")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "meeting"
                ? "bg-primary-light/10 text-primary"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            Meeting Room
          </button>
        </div>

        {activeTab === "queue" && (
          <div className="appointment-panel p-4">
            <h2 className="text-base font-semibold text-primary">
              My Video Appointments
            </h2>
            <div className="mt-3 rounded-2xl border border-text-secondary/15 bg-background/40 p-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-text-secondary/20 text-text-secondary">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Date & Time</th>
                    <th className="px-3 py-2 font-medium">Doctor</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Meeting Link</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTeleAppointments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-5 text-center text-text-secondary"
                      >
                        No telemedicine bookings found. Book a video appointment
                        to start a session.
                      </td>
                    </tr>
                  )}

                  {activeTeleAppointments.map((appt) => {
                    const session = sessions[appt.id] ?? null;
                    const joinable = canJoin(appt, session);
                    const ended = session?.status === "ENDED";

                    return (
                      <tr
                        key={appt.id}
                        className="border-b border-text-secondary/10"
                      >
                        <td className="px-3 py-2 font-medium text-primary">
                          {meetingTitle(appt)}
                        </td>
                        <td className="px-3 py-2">
                          {appointmentDateTime(appt)}
                        </td>
                        <td className="px-3 py-2">
                          {appt.doctorName ?? appt.doctorId}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-primary-light/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {queueStatus(appt, session)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-text-secondary">
                          {joinable ? "Available" : joinAvailability(appt)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentId(appt.id);
                                setActiveTab("meeting");
                              }}
                              disabled={ended}
                              className="inline-flex items-center rounded-lg border border-primary-light/40 bg-primary-light/10 p-2 text-primary transition hover:bg-primary-light/20 disabled:cursor-not-allowed disabled:opacity-50"
                              title={ended ? "Meeting ended" : "View meeting"}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {endedTeleAppointments.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-2xl border border-text-secondary/15 bg-background/40 p-3">
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  Ended Video Sessions
                </h3>
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-text-secondary/20 text-text-secondary">
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Start Time</th>
                      <th className="px-3 py-2 font-medium">End Time</th>
                      <th className="px-3 py-2 font-medium">End Date Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endedTeleAppointments.map((appt) => {
                      const session = sessions[appt.id] ?? null;
                      return (
                        <tr
                          key={`ended-${appt.id}`}
                          className="border-b border-text-secondary/10"
                        >
                          <td className="px-3 py-2 font-medium text-primary">
                            {meetingTitle(appt)}
                          </td>
                          <td className="px-3 py-2">
                            {new Date(appt.appointmentTime).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {formatDateTime(session?.startedAt)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDateTime(session?.endedAt)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDateTime(session?.endedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "meeting" &&
          (meetingAppointment ? (
            <div className="grid gap-4 xl:grid-cols-[320px_1.7fr]">
              <aside className="appointment-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-primary">
                    Meeting Details
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("queue");
                      setSelectedAppointmentId(null);
                    }}
                    className="rounded-lg border border-text-secondary/20 p-1.5 text-text-secondary hover:text-primary"
                    title="Close meeting window"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-primary">Title:</span>{" "}
                    {meetingTitle(meetingAppointment)}
                  </p>
                  <p>
                    <span className="font-medium text-primary">Doctor:</span>{" "}
                    {meetingAppointment.doctorName ??
                      meetingAppointment.doctorId}
                  </p>
                  <p>
                    <span className="font-medium text-primary">Specialty:</span>{" "}
                    {meetingAppointment.doctorSpecialty ?? "General"}
                  </p>
                  <p>
                    <span className="font-medium text-primary">Scheduled:</span>{" "}
                    {appointmentDateTime(meetingAppointment)}
                  </p>
                  <p>
                    <span className="font-medium text-primary">Status:</span>{" "}
                    {queueStatus(meetingAppointment, meetingSession)}
                  </p>
                  <p>
                    <span className="font-medium text-primary">End Time:</span>{" "}
                    {formatDateTime(meetingSession?.endedAt)}
                  </p>
                  <p>
                    <span className="font-medium text-primary">
                      Availability:
                    </span>{" "}
                    {roomJoinable
                      ? "Available now"
                      : joinAvailability(meetingAppointment)}
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-text-secondary/20 px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-primary"
                  >
                    {fullScreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                    {fullScreen ? "Exit Full Screen" : "Full Screen"}
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-text-secondary/15 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      <Mic className="h-4 w-4" />
                      Live Transcript
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        !transcriptSupported
                          ? "bg-accent-peach/30 text-primary"
                          : isTranscribing
                            ? "bg-accent-mint/25 text-primary"
                            : "bg-background text-text-secondary"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {transcriptSupported
                        ? isTranscribing
                          ? "Recording"
                          : "Stopped"
                        : "Unsupported"}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-text-secondary">
                    Speech from the meeting is transcribed live. You can copy,
                    clear, or export at any time.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startTranscript}
                      disabled={!transcriptSupported || !roomJoinable || isTranscribing}
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
                    <button
                      type="button"
                      onClick={copyTranscript}
                      className="inline-flex items-center gap-1 rounded-lg border border-text-secondary/20 px-2.5 py-1 text-xs font-semibold text-text-secondary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={clearTranscript}
                      className="inline-flex items-center gap-1 rounded-lg border border-text-secondary/20 px-2.5 py-1 text-xs font-semibold text-text-secondary"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Words: {transcriptWordCount}</span>
                    <span>{isTranscribing ? "Listening..." : "Idle"}</span>
                  </div>

                  <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-text-secondary/15 bg-surface px-3 py-3 text-sm leading-6 text-primary">
                    {(transcriptText || interimTranscript).trim() ? (
                      <>
                        <p className="whitespace-pre-wrap">{transcriptText}</p>
                        {interimTranscript && (
                          <p className="mt-1 whitespace-pre-wrap text-text-secondary">
                            {interimTranscript}
                          </p>
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

              <section
                ref={meetingPanelRef}
                className="appointment-panel overflow-hidden p-0"
              >
                {roomJoinable && meetingSession?.sessionUrl ? (
                  <iframe
                    title={meetingTitle(meetingAppointment)}
                    src={meetingSession.sessionUrl}
                    className="h-[78vh] min-h-[560px] w-full"
                    allow="camera; microphone; fullscreen; display-capture"
                  />
                ) : (
                  <div className="flex h-[78vh] min-h-[560px] flex-col items-center justify-center gap-4 bg-background/60 px-6 text-center">
                    <img
                      src={telemedImage}
                      alt="Telemedicine"
                      className="h-44 w-auto max-w-full object-contain"
                    />
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-primary">
                        Room is not open yet
                      </h2>
                      <p className="max-w-lg text-sm text-text-secondary">
                        Your meeting link becomes active 1 hour before the
                        appointment time after confirmation.
                      </p>
                    </div>
                    <Video className="h-8 w-8 text-primary-light" />
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="appointment-panel p-6 text-sm text-text-secondary">
              No meeting selected. Open one from the Video Queue when
              appointments are available.
            </div>
          ))}
      </div>
    </div>
  );
}
