import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Eye,
  ExternalLink,
  ListFilter,
  Maximize2,
  Mic,
  Minimize2,
  RefreshCcw,
  Search,
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
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      },
    ) => {
      dispose: () => void;
      executeCommand?: (command: string) => void;
    };
    lastStart?: number;
    lastError?: string;
  }
}

function parseJitsiSessionUrl(sessionUrl: string): {
  domain: string;
  roomName: string;
} | null {
  try {
    const parsed = new URL(sessionUrl);
    const roomName = parsed.pathname.replace(/^\/+/, "");
    if (!roomName) {
      return null;
    }
    return { domain: parsed.host, roomName };
  } catch {
    return null;
  }
}

async function loadJitsiExternalApi(domain: string): Promise<void> {
  const scriptId = `jitsi-external-api-${domain.replace(/[^a-z0-9]/gi, "-")}`;
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (existing) {
    if (window.JitsiMeetExternalAPI) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Jitsi external_api.js")),
        { once: true },
      );
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://${domain}/external_api.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi external_api.js"));
    document.body.appendChild(script);
  });
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

  const raw = String(value).trim();
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw);
  const utcAware = hasZone ? raw : `${raw}Z`;
  const date = new Date(utcAware);
  const parsed = Number.isNaN(date.getTime()) ? new Date(raw) : date;
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return `${parsed.toLocaleDateString("en-GB")} ${parsed.toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function formatTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const raw = String(value).trim();
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw);
  const utcAware = hasZone ? raw : `${raw}Z`;
  const date = new Date(utcAware);
  const parsed = Number.isNaN(date.getTime()) ? new Date(raw) : date;
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBookedAppointmentTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const match = String(value).match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (match?.[1]) {
    return match[1];
  }

  return formatTime(value);
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
  if (isCanceled(appointment.status)) {
    return "Canceled";
  }

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

function toDateInputValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function queueStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED") {
    return "bg-accent-mint/25 text-primary";
  }
  if (normalized === "PENDING") {
    return "bg-accent-peach/30 text-primary";
  }
  if (normalized === "IN_SESSION") {
    return "bg-accent-sky/25 text-primary";
  }
  if (normalized === "COMPLETED" || normalized === "ENDED") {
    return "bg-primary-light/15 text-primary";
  }
  if (normalized === "CANCELED" || normalized === "CANCELLED") {
    return "bg-error/20 text-primary";
  }
  return "bg-primary-light/10 text-primary";
}

function isCanceled(status: string | null | undefined): boolean {
  return status === "CANCELED" || status === "CANCELLED";
}

export function PatientTelemedicineCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "meeting">("queue");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [sessions, setSessions] = useState<
    Record<string, TelemedicineSessionRecord | null>
  >({});
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "IN_SESSION" | "COMPLETED" | "CANCELED"
  >("ALL");
  const [queueDateFilter, setQueueDateFilter] = useState("");
  const [endedExpanded, setEndedExpanded] = useState(false);
  const [endedPage, setEndedPage] = useState(1);
  const [endedSearch, setEndedSearch] = useState("");
  const [endedDateFilter, setEndedDateFilter] = useState("");
  const endedPerPage = 6;
  const [fullScreen, setFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transcriptText, setTranscriptText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoRestartRef = useRef(false);
  const meetingPanelRef = useRef<HTMLDivElement | null>(null);
  const jitsiHostRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<{ dispose: () => void; executeCommand?: (command: string) => void } | null>(null);
  const [embeddedMeetingError, setEmbeddedMeetingError] = useState<string | null>(null);

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

  const meetingAppointment = useMemo(
    () =>
      teleAppointments.find((appt) => appt.id === selectedAppointmentId) ??
      null,
    [teleAppointments, selectedAppointmentId],
  );

  const filteredActiveTeleAppointments = useMemo(() => {
    const term = queueSearch.trim().toLowerCase();
    return activeTeleAppointments.filter((appt) => {
      const rawStatus = queueStatus(appt, sessions[appt.id] ?? null).toUpperCase();
      const normalizedStatus = rawStatus === "CANCELLED" ? "CANCELED" : rawStatus;

      if (queueStatusFilter !== "ALL" && normalizedStatus !== queueStatusFilter) {
        return false;
      }

      if (queueDateFilter && toDateInputValue(appt.appointmentTime) !== queueDateFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        appt.id,
        appt.doctorName,
        appt.doctorId,
        appt.doctorSpecialty,
        meetingTitle(appt),
        normalizedStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [activeTeleAppointments, queueDateFilter, queueSearch, queueStatusFilter, sessions]);

  const queueTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredActiveTeleAppointments.length / perPage)),
    [filteredActiveTeleAppointments.length, perPage],
  );

  const paginatedActiveTeleAppointments = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredActiveTeleAppointments.slice(start, start + perPage);
  }, [filteredActiveTeleAppointments, page, perPage]);

  const filteredEndedTeleAppointments = useMemo(() => {
    const term = endedSearch.trim().toLowerCase();
    return endedTeleAppointments.filter((appt) => {
      const session = sessions[appt.id] ?? null;

      if (endedDateFilter && toDateInputValue(appt.appointmentTime) !== endedDateFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        appt.id,
        appt.doctorName,
        appt.doctorId,
        meetingTitle(appt),
        appointmentDateTime(appt),
        formatDateTime(session?.endedAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [endedDateFilter, endedSearch, endedTeleAppointments, sessions]);

  const endedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEndedTeleAppointments.length / endedPerPage)),
    [endedPerPage, filteredEndedTeleAppointments.length],
  );

  const paginatedEndedTeleAppointments = useMemo(() => {
    const start = (endedPage - 1) * endedPerPage;
    return filteredEndedTeleAppointments.slice(start, start + endedPerPage);
  }, [endedPage, endedPerPage, filteredEndedTeleAppointments]);

  useEffect(() => {
    setPage(1);
  }, [queueDateFilter, queueSearch, queueStatusFilter]);

  useEffect(() => {
    setEndedPage(1);
  }, [endedDateFilter, endedSearch]);

  useEffect(() => {
    if (page > queueTotalPages) {
      setPage(queueTotalPages);
    }
  }, [page, queueTotalPages]);

  useEffect(() => {
    if (endedPage > endedTotalPages) {
      setEndedPage(endedTotalPages);
    }
  }, [endedPage, endedTotalPages]);

  useEffect(() => {
    if (!meetingAppointment) {
      return;
    }

    const session = sessions[meetingAppointment.id];
    if (session?.status === "ENDED" || isCanceled(meetingAppointment.status)) {
      setSelectedAppointmentId(null);
      setActiveTab("queue");
    }
  }, [meetingAppointment, sessions]);

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

  const openMeetingInNewTab = useCallback(() => {
    if (!meetingSession?.sessionUrl) {
      toast("Meeting URL is not available yet.", "warning");
      return;
    }

    const popup = window.open(
      meetingSession.sessionUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (!popup) {
      toast("Popup blocked. Please allow pop-ups for this site.", "warning");
      return;
    }

    popup.focus();
    toast("Meeting opened in a new tab.", "info");
  }, [meetingSession?.sessionUrl, toast]);

  useEffect(() => {
    if (
      activeTab !== "meeting" ||
      !roomJoinable ||
      !meetingSession?.sessionUrl ||
      !jitsiHostRef.current
    ) {
      return;
    }

    const parsed = parseJitsiSessionUrl(meetingSession.sessionUrl);
    if (!parsed) {
      setEmbeddedMeetingError("Invalid meeting URL received from telemedicine service.");
      return;
    }

    let cancelled = false;
    setEmbeddedMeetingError(null);

    const mountEmbeddedMeeting = async () => {
      try {
        await loadJitsiExternalApi(parsed.domain);
        if (cancelled || !jitsiHostRef.current || !window.JitsiMeetExternalAPI) {
          return;
        }

        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose();
          jitsiApiRef.current = null;
        }
        jitsiHostRef.current.innerHTML = "";

        const api = new window.JitsiMeetExternalAPI(parsed.domain, {
          roomName: parsed.roomName,
          parentNode: jitsiHostRef.current,
          userInfo: {
            displayName: "Curex Patient",
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
          },
        });

        jitsiApiRef.current = api;
      } catch {
        if (!cancelled) {
          setEmbeddedMeetingError(
            "Embedded meeting failed to initialize. Use 'Open in New Tab' once, then return here.",
          );
        }
      }
    };

    mountEmbeddedMeeting();

    return () => {
      cancelled = true;
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      if (jitsiHostRef.current) {
        jitsiHostRef.current.innerHTML = "";
      }
    };
  }, [activeTab, meetingSession?.sessionUrl, roomJoinable]);

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
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          // Reliability Fix: Only add if not a duplicate of the previous final text
          // (Browsers sometimes repeat the last final segment)
          const cleanText = text.trim();
          setTranscriptText((prev) => {
            if (prev.endsWith(cleanText)) return prev;
            // Add basic punctuation simulation
            const punctuated = cleanText.charAt(0).toUpperCase() + cleanText.slice(1) + ". ";
            const newText = `${prev} ${punctuated}`.trimStart();
            return newText.length > 5000 ? newText.slice(-5000) : newText;
          });
        } else {
          interimChunk = text;
        }
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      // 'no-speech' is the most common reason transcripts stop working. 
      // We now handle it silently and trigger an immediate restart.
      if (error === "no-speech" || error === "audio-capture") {
        if (autoRestartRef.current) {
          try { recognition.stop(); } catch {}
          return; // onend will handle the restart
        }
      }
      
      if (error !== "aborted") {
        console.warn("Speech recognition error:", error);
      }
    };

    recognition.onend = () => {
      if (autoRestartRef.current) {
        // Heartbeat restart to keep the "Free Mode" alive indefinitely
        const delay = window.lastError === "network" ? 5000 : 300;
        setTimeout(() => {
          if (autoRestartRef.current && recognitionRef.current) {
            try { 
              recognitionRef.current.start(); 
              window.lastStart = Date.now();
            } catch (e) {
              console.error("Failed to restart transcript:", e);
            }
          }
        }, delay);
      } else {
        setIsTranscribing(false);
      }
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
            <div className="mt-3 grid gap-3 md:flex md:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Search by doctor, title, status"
                  className="patient-page-input w-full border-text-secondary/20 bg-surface pl-10 shadow-sm"
                />
              </label>
              <label className="relative md:w-64">
                <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <select
                  value={queueStatusFilter}
                  onChange={(e) =>
                    setQueueStatusFilter(
                      e.target.value as
                        | "ALL"
                        | "PENDING"
                        | "CONFIRMED"
                        | "IN_SESSION"
                        | "COMPLETED"
                        | "CANCELED",
                    )
                  }
                  className="patient-page-input w-full appearance-none border-primary-light/30 bg-primary-light/5 pl-10 pr-10 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_SESSION">In Session</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </label>
              <label className="relative md:w-52">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  type="date"
                  value={queueDateFilter}
                  onChange={(e) => setQueueDateFilter(e.target.value)}
                    className="calendar-filter-input patient-page-input w-full border-primary-light/30 bg-primary-light/5 pl-10 pr-3 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                />
              </label>
            </div>
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
                  {filteredActiveTeleAppointments.length === 0 && (
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

                  {paginatedActiveTeleAppointments.map((appt) => {
                    const session = sessions[appt.id] ?? null;
                    const joinable = canJoin(appt, session);
                    const ended = session?.status === "ENDED";
                    const canceled = isCanceled(appt.status);
                    const disabled = ended || canceled;

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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${queueStatusBadgeClass(queueStatus(appt, session))}`}>
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
                              disabled={disabled}
                              className="inline-flex items-center rounded-lg border border-primary-light/40 bg-primary-light/10 p-2 text-primary transition hover:bg-primary-light/20 disabled:cursor-not-allowed disabled:opacity-50"
                              title={ended ? "Meeting ended" : canceled ? "Meeting canceled" : "View meeting"}
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

            {/* Pagination Controls */}
            <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
                <div>
                  Showing {filteredActiveTeleAppointments.length === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filteredActiveTeleAppointments.length)} of {filteredActiveTeleAppointments.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-2">Page {page} / {queueTotalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(queueTotalPages, p + 1))}
                    disabled={page >= queueTotalPages}
                    className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>

            {endedTeleAppointments.length > 0 && (
              <div className="mt-5 rounded-2xl border border-text-secondary/15 bg-background/40 p-3">
                <button
                  type="button"
                  onClick={() => setEndedExpanded((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl border border-text-secondary/15 bg-surface px-3 py-2 text-left"
                >
                  <h3 className="text-sm font-semibold text-primary">
                    Ended Video Sessions ({endedTeleAppointments.length})
                  </h3>
                  <ChevronDown
                    className={`h-4 w-4 text-text-secondary transition-transform ${endedExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {endedExpanded && (
                  <>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                        <input
                          value={endedSearch}
                          onChange={(e) => setEndedSearch(e.target.value)}
                          placeholder="Search ended sessions"
                          className="patient-page-input w-full border-text-secondary/20 bg-surface pl-10 shadow-sm"
                        />
                      </label>
                      <label className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                        <input
                          type="date"
                          value={endedDateFilter}
                          onChange={(e) => setEndedDateFilter(e.target.value)}
                            className="calendar-filter-input patient-page-input w-full border-primary-light/30 bg-primary-light/5 pl-10 pr-3 font-medium text-primary shadow-sm outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                        />
                      </label>
                    </div>

                    <div className="mt-3 overflow-x-auto">
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
                          {paginatedEndedTeleAppointments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-5 text-center text-text-secondary">
                                No ended sessions match your filters.
                              </td>
                            </tr>
                          ) : (
                            paginatedEndedTeleAppointments.map((appt) => {
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
                                    {formatBookedAppointmentTime(appt.appointmentTime)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {formatTime(session?.endedAt)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {formatDateTime(session?.endedAt)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
                      <div>
                        Showing {filteredEndedTeleAppointments.length === 0 ? 0 : (endedPage - 1) * endedPerPage + 1} - {Math.min(endedPage * endedPerPage, filteredEndedTeleAppointments.length)} of {filteredEndedTeleAppointments.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEndedPage((p) => Math.max(1, p - 1))}
                          disabled={endedPage === 1}
                          className="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="px-2">Page {endedPage} / {endedTotalPages}</span>
                        <button
                          type="button"
                          onClick={() => setEndedPage((p) => Math.min(endedTotalPages, p + 1))}
                          disabled={endedPage >= endedTotalPages}
                          className="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "meeting" &&
          (meetingAppointment ? (
            <div className="flex flex-col gap-6">
              {/* Meeting Header Dashboard */}
              <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-light/25 bg-surface p-6 text-primary shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-primary-light/10 p-3 ring-1 ring-primary-light/25">
                    <Video className="h-6 w-6 text-accent-mint" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {meetingTitle(meetingAppointment)}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Doctor: <span className="font-semibold text-primary">{meetingAppointment.doctorName ?? meetingAppointment.doctorId}</span> • {meetingAppointment.doctorSpecialty ?? "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden flex-col items-end sm:flex">
                    <span className="text-[10px] uppercase tracking-widest text-text-secondary/70">Session Status</span>
                    <span className="flex items-center gap-1.5 font-semibold text-accent-mint">
                      <span className="h-2 w-2 rounded-full bg-accent-mint animate-pulse" />
                      {queueStatus(meetingAppointment, meetingSession)}
                    </span>
                  </div>
                  <div className="mx-2 hidden h-8 w-[1px] bg-text-secondary/20 sm:block" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("queue");
                      setSelectedAppointmentId(null);
                    }}
                    className="group flex items-center gap-2 rounded-xl border border-primary-light/30 bg-primary-light/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light/20"
                  >
                    <X className="h-4 w-4 transition group-hover:rotate-90" />
                    Leave Room
                  </button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                {/* Left Side: Video & Transcript */}
                <div className="space-y-6">
                  {/* Main Video Card */}
                  <section
                    ref={meetingPanelRef}
                    className="relative overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/10"
                  >
                        <div className="relative aspect-video w-full">
                      {(jitsiApiRef.current || !roomJoinable) && (
                        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black">
                          <div className="flex flex-col items-center gap-4 text-center">
                            <img
                              src={telemedImage}
                              alt="Telemedicine"
                              className="h-32 w-auto opacity-20 grayscale"
                            />
                            <p className="text-sm text-white/40">
                              {jitsiApiRef.current ? "Session ended or disconnected." : "Meeting Room is Closed"}
                            </p>
                          </div>
                        </div>
                      )}
                      {roomJoinable && meetingSession?.sessionUrl ? (
                        <>
                          <div
                            ref={jitsiHostRef}
                            className="relative z-10 h-full w-full"
                          />
                          {embeddedMeetingError && (
                            <div className="absolute bottom-4 left-1/2 z-10 w-[90%] -translate-x-1/2 rounded-xl border border-accent-peach/30 bg-black/70 px-4 py-3 text-sm text-white backdrop-blur">
                              <p>{embeddedMeetingError}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background/5 p-8 text-center">
                          <img
                            src={telemedImage}
                            alt="Telemedicine"
                            className="h-48 w-auto opacity-40 grayscale"
                          />
                          <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white/90">
                              Meeting Room is Closed
                            </h2>
                            <p className="max-w-md text-sm text-white/50">
                              The video link will be accessible 1 hour before your scheduled time.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Video Controls Overlay */}
                      {roomJoinable && (
                        <div className="absolute right-4 top-4 flex gap-2">
                           <button
                            onClick={openMeetingInNewTab}
                            className="rounded-lg bg-black/40 p-2 text-white backdrop-blur-md transition hover:bg-primary"
                            title="Open in new tab"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button
                            onClick={toggleFullScreen}
                            className="rounded-lg bg-black/40 p-2 text-white backdrop-blur-md transition hover:bg-primary"
                          >
                            {fullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* New Dedicated Transcript Card */}
                  <div className="overflow-hidden rounded-3xl border border-text-secondary/15 bg-surface p-6 shadow-lg shadow-primary/5 transition hover:shadow-xl">
                    <div className="mb-4 flex items-center justify-between border-b border-text-secondary/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent-mint/10 p-2 text-accent-mint">
                          <Mic className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-primary">Live Transcription</h3>
                          <p className="text-[11px] text-text-secondary/70 uppercase font-semibold">Real-time medical captioning</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={isTranscribing ? stopTranscript : startTranscript}
                          disabled={!transcriptSupported || !roomJoinable}
                          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                            isTranscribing 
                            ? "bg-accent-peach/10 text-accent-peach" 
                            : "bg-accent-mint/10 text-accent-mint"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isTranscribing ? "bg-accent-peach animate-pulse" : "bg-accent-mint"}`} />
                          {isTranscribing ? "Stop Captions" : "Turn On Captions"}
                        </button>
                        <button 
                          onClick={copyTranscript}
                          className="rounded-full bg-background p-2 text-text-secondary transition hover:bg-primary-light/10 hover:text-primary"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[100px] rounded-2xl bg-background/70 p-5 ring-1 ring-text-secondary/10">
                      <div className="text-sm leading-relaxed text-text-primary">
                        {interimTranscript ? (
                          <span className="inline-flex items-center gap-2 italic text-primary/60">
                            {interimTranscript}
                            <span className="inline-flex gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-primary/40 animate-bounce" />
                              <span className="h-1 w-1 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]" />
                              <span className="h-1 w-1 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]" />
                            </span>
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {transcriptText.length > 300 
                              ? `...${transcriptText.slice(-300)}` 
                              : (transcriptText || "Captions will appear here once audio is detected.")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Meeting Info Sidebar */}
                <aside className="space-y-6">
                  <div className="rounded-3xl border border-text-secondary/15 bg-surface p-6 shadow-lg shadow-primary/5">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-secondary/60">Schedule Detail</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-secondary">Appt Time</span>
                        <span className="font-semibold text-primary">{appointmentDateTime(meetingAppointment)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-secondary">Availability</span>
                        <span className={`font-semibold ${roomJoinable ? "text-accent-mint" : "text-accent-peach"}`}>
                          {roomJoinable ? "Active session" : joinAvailability(meetingAppointment)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 border-t border-text-secondary/10 pt-2">
                        <span className="text-[10px] uppercase text-text-secondary/50 font-bold">Word Count</span>
                        <span className="font-mono text-xs">{transcriptWordCount} words recorded</span>
                      </div>
                    </div>
                    
                    <div className="mt-8 space-y-3">
                         <button
                            type="button"
                            onClick={openMeetingInNewTab}
                            disabled={!meetingSession?.sessionUrl}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-primary-light/35 bg-primary-light/10 py-3.5 text-sm font-bold text-primary transition hover:bg-primary-light/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open in New Tab
                          </button>
                         <button
                            type="button"
                            onClick={exportTranscript}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-light py-3.5 text-sm font-bold text-background shadow-lg transition hover:scale-[1.02] active:scale-95"
                          >
                            Download Transcription
                          </button>
                          <button
                            type="button"
                            onClick={clearTranscript}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-text-secondary/15 bg-background py-3.5 text-sm font-bold text-text-secondary transition hover:bg-primary-light/10"
                          >
                            Clear History
                          </button>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-accent-mint/10 p-6 border border-accent-mint/20">
                    <p className="text-xs font-semibold text-accent-mint/80 uppercase mb-2">Patient Security</p>
                    <p className="text-xs leading-relaxed text-primary/70">
                      Curex uses end-to-end encryption for all video calls. Your medical transcripts are stored only locally in your session for your privacy.
                    </p>
                  </div>
                </aside>
              </div>
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
