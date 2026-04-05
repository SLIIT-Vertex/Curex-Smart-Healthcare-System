import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  bookAppointment,
  getAppointmentsByPatient,
  getDoctorDirectory,
  getDoctorSlots,
} from "../../services/appointmentService";
import {
  getPatientPayments,
  type PaymentRecord,
} from "../../services/paymentService";
import {
  createTelemedicineSession,
  getTelemedicineSession,
} from "../../services/telemedicineService";
import {
  dateSlotKey,
  getUpcomingDateKeys,
  parseDateSlotKey,
  toDateKey,
} from "../../services/availabilityService";
import {
  type AppointmentRecord,
  type DoctorDirectoryItem,
} from "../../types/appointment";
import type { TelemedicineSessionRecord } from "../../types/telemedicine";
import { useAuth, useToast } from "../../store/hooks";
import "../../styles/pages/AppointmentFlow.css";

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function dateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function toAppointmentDateTime(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00`;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function buildMonthCells(
  currentMonth: Date,
): Array<{ dateKey: string; inMonth: boolean; dayNumber: number }> {
  const first = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const cells: Array<{ dateKey: string; inMonth: boolean; dayNumber: number }> =
    [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      dateKey: toDateKey(d),
      inMonth: d.getMonth() === currentMonth.getMonth(),
      dayNumber: d.getDate(),
    });
  }
  return cells;
}

function statusPastelClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED") {
    return "bg-accent-mint/25 text-primary";
  }
  if (normalized === "PENDING") {
    return "bg-accent-peach/30 text-primary";
  }
  if (normalized === "CANCELLED") {
    return "bg-error/20 text-primary";
  }
  return "bg-primary-light/15 text-primary";
}

function canJoinTelemedicine(
  appt: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined,
): boolean {
  if (
    appt.type !== "TELEMEDICINE" ||
    !session?.sessionUrl ||
    session.status === "ENDED"
  ) {
    return false;
  }

  const statusEligible =
    appt.status === "CONFIRMED" || appt.status === "IN_SESSION";
  const joinOpensAt = new Date(appt.appointmentTime).getTime() - 60 * 60 * 1000;
  const startsWithinOneHour = Date.now() >= joinOpensAt;
  return statusEligible && startsWithinOneHour;
}

function telemedicineStateLabel(
  appt: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined,
): string {
  if (appt.type !== "TELEMEDICINE") {
    return "In-person visit";
  }

  if (appt.status !== "CONFIRMED" && appt.status !== "IN_SESSION") {
    return "Video link available after confirmation";
  }

  if (!session?.sessionUrl) {
    return "Preparing session link";
  }

  if (session.status === "ENDED") {
    return "Session ended";
  }

  const joinOpensAt = new Date(appt.appointmentTime).getTime() - 60 * 60 * 1000;
  if (Date.now() < joinOpensAt) {
    return "Link unlocks 1 hour before appointment";
  }

  return "Join video consultation";
}

function bookingStatusLabel(
  appt: AppointmentRecord,
  session: TelemedicineSessionRecord | null | undefined,
): string {
  if (appt.type === "TELEMEDICINE" && session?.status === "ENDED") {
    return "ENDED";
  }
  return String(appt.status).toUpperCase();
}

function doctorInitials(doctor: DoctorDirectoryItem | null): string {
  if (!doctor) {
    return "DR";
  }
  const base = doctor.name.replace(/^Dr\.\s*/i, "").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "D";
  const second = parts[1]?.[0] ?? "R";
  return `${first}${second}`.toUpperCase();
}

function appointmentDateTimeKey(
  appointmentTime: string,
): { dateKey: string; time: string } | null {
  const match = String(appointmentTime).match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/,
  );
  if (match) {
    return { dateKey: match[1], time: match[2] };
  }

  const parsed = new Date(appointmentTime);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    dateKey: toDateKey(parsed),
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
  };
}

export function PatientAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"make" | "bookings">("make");
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [doctorSlots, setDoctorSlots] = useState<
    Record<
      string,
      Array<{
        day: string;
        startTime: string;
        endTime: string;
        booked: boolean;
      }>
    >
  >({});
  const [doctorAppointmentsById, setDoctorAppointmentsById] = useState<
    Record<string, AppointmentRecord[]>
  >({});
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const dateKeys = useMemo(() => getUpcomingDateKeys(30), []);
  const [selectedDateKey, setSelectedDateKey] = useState(dateKeys[0]);
  const [makeDateStartIndex, setMakeDateStartIndex] = useState(0);
  const [selectedBookingDate, setSelectedBookingDate] = useState(dateKeys[0]);
  const [bookingMonth, setBookingMonth] = useState(() =>
    monthStart(new Date()),
  );
  const [showBookingMonthPicker, setShowBookingMonthPicker] = useState(false);
  const [showBookingCalendar, setShowBookingCalendar] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [doctorCardStartIndex, setDoctorCardStartIndex] = useState(0);
  const [slotStartIndex, setSlotStartIndex] = useState(0);
  const [popupBooking, setPopupBooking] = useState<AppointmentRecord | null>(
    null,
  );

  const [notes, setNotes] = useState("");
  const [appointmentType, setAppointmentType] = useState<
    "IN_PERSON" | "TELEMEDICINE"
  >("TELEMEDICINE");

  const [myAppointments, setMyAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [payingAppointmentId, setPayingAppointmentId] = useState<string | null>(null);
  const [paymentsByAppointmentId, setPaymentsByAppointmentId] = useState<
    Record<string, PaymentRecord>
  >({});
  const [bookingTableSearch, setBookingTableSearch] = useState("");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<
    "ALL" | "TELEMEDICINE" | "IN_PERSON"
  >("ALL");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "IN_SESSION" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [bookingTablePage, setBookingTablePage] = useState(1);
  const [telemedicineSessions, setTelemedicineSessions] = useState<
    Record<string, TelemedicineSessionRecord | null>
  >({});

  const patientId = user?.id ?? "";
  const patientName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const patientEmail = user?.email ?? "";

  const loadPatientAppointments = useCallback(async () => {
    if (!patientId) {
      return;
    }

    try {
      setLoading(true);
      const [appointmentsResult, paymentsResult] = await Promise.allSettled([
        getAppointmentsByPatient(patientId),
        getPatientPayments(patientId),
      ]);

      const patientData =
        appointmentsResult.status === "fulfilled" ? appointmentsResult.value : [];
      setMyAppointments(patientData);

      if (paymentsResult.status === "fulfilled") {
        const map: Record<string, PaymentRecord> = {};
        for (const payment of paymentsResult.value) {
          if (!payment.appointmentId) {
            continue;
          }
          const existing = map[payment.appointmentId];
          if (!existing) {
            map[payment.appointmentId] = payment;
            continue;
          }
          const currentTs = new Date(payment.updatedAt ?? payment.createdAt).getTime();
          const existingTs = new Date(
            existing.updatedAt ?? existing.createdAt,
          ).getTime();
          if (currentTs >= existingTs) {
            map[payment.appointmentId] = payment;
          }
        }
        setPaymentsByAppointmentId(map);
      }

      if (patientData.length > 0) {
        const firstDate = toDateKey(new Date(patientData[0].appointmentTime));
        setSelectedBookingDate(firstDate);
      }
    } catch {
      toast(
        "Could not fetch appointment data. Please ensure backend is running.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, toast]);

  const isPaymentCompleted = useCallback(
    (appointmentId: string): boolean => {
      const payment = paymentsByAppointmentId[appointmentId];
      if (!payment) {
        return false;
      }
      const status = String(payment.status).toUpperCase();
      return status === "SUCCESS" || status === "COMPLETED";
    },
    [paymentsByAppointmentId],
  );

  const shouldShowPayNow = useCallback(
    (appt: AppointmentRecord): boolean => {
      const status = String(appt.status).toUpperCase();
      if (status !== "PENDING") {
        return false;
      }
      return !isPaymentCompleted(appt.id);
    },
    [isPaymentCompleted],
  );

  const extractServerMessage = (err: unknown): string | undefined =>
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message;

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      setDoctorsLoading(true);
      try {
        const fetchedDoctors = await getDoctorDirectory();
        setDoctors(fetchedDoctors);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        toast("Failed to load doctors.", "error");
      } finally {
        setDoctorsLoading(false);
      }
    };
    fetchDoctors();
  }, [toast]);

  // Fetch slots when selected doctor changes
  useEffect(() => {
    if (!selectedDoctorId) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const slots = await getDoctorSlots(selectedDoctorId);
        setDoctorSlots((prev) => ({
          ...prev,
          [selectedDoctorId]: slots,
        }));
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        toast("Failed to load available slots for this doctor.", "error");
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, toast]);

  useEffect(() => {
    if (!selectedDoctorId) return;

    const selected = doctors.find((d) => d.id === selectedDoctorId);
    const idsToCheck = new Set(
      [selectedDoctorId, selected?.profileId].filter(
        (id): id is string => Boolean(id),
      ),
    );

    // Patient pages cannot call doctor-only appointment endpoints (403).
    // Use the patient's own appointment list to infer booked slots for selected doctor.
    const merged = myAppointments.filter((appt) => idsToCheck.has(appt.doctorId));

    setDoctorAppointmentsById((prev) => ({
      ...prev,
      [selectedDoctorId]: merged,
    }));
  }, [selectedDoctorId, doctors, myAppointments]);

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return doctors.find((d) => d.id === selectedDoctorId) ?? null;
  }, [doctors, selectedDoctorId]);

  const specialtyOptions = useMemo(() => {
    const all = doctors
      .map((doctor) => doctor.specialty?.trim())
      .filter((specialty): specialty is string => Boolean(specialty));
    return [
      "ALL",
      ...Array.from(new Set(all)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const key = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesText =
        !key ||
        `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(key);
      const matchesSpecialty =
        selectedSpecialty === "ALL" || doctor.specialty === selectedSpecialty;
      return matchesText && matchesSpecialty;
    });
  }, [doctors, search, selectedSpecialty]);

  useEffect(() => {
    if (filteredDoctors.length === 0) {
      return;
    }

    const selectedStillVisible = filteredDoctors.some(
      (doctor) => doctor.id === selectedDoctorId,
    );

    if (!selectedDoctorId || !selectedStillVisible) {
      setSelectedDoctorId(filteredDoctors[0].id);
    }
  }, [filteredDoctors, selectedDoctorId]);

  const visibleDoctors = useMemo(() => {
    return filteredDoctors.slice(
      doctorCardStartIndex,
      doctorCardStartIndex + 2,
    );
  }, [filteredDoctors, doctorCardStartIndex]);

  const canGoPrevDoctors = doctorCardStartIndex > 0;
  const canGoNextDoctors = doctorCardStartIndex + 2 < filteredDoctors.length;

  const availableSlotsForSelectedDoctor = useMemo(() => {
    if (!selectedDoctor || !selectedDoctorId) {
      return [] as Array<{
        key: string;
        time: string;
        isBooked: boolean;
        isAvailable: boolean;
        isPast: boolean;
      }>;
    }

    const slots = doctorSlots[selectedDoctorId] || [];
    const doctorAppointments = doctorAppointmentsById[selectedDoctorId] || [];

    // Convert backend slots to date-time format for the selected date
    const availableForDate = new Set<string>();
    const bookedForDate = new Set<string>();

    // Parse the selected date
    const selectedDate = new Date(`${selectedDateKey}T00:00:00`);
    const selectedDayOfWeek = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ][selectedDate.getDay()];

    // Filter slots that match the selected day
    for (const slot of slots) {
      if (slot.day === selectedDayOfWeek) {
        const time = slot.startTime.substring(0, 5); // Get HH:mm format
        const slotKey = dateSlotKey(selectedDateKey, time);

        // More robust booked/available inference to handle varying backend payloads
        const slotAny = slot as unknown as {
          booked?: boolean;
          isBooked?: boolean;
          available?: boolean;
          isAvailable?: boolean;
          status?: string;
        };
        const normalizedStatus = String(slotAny.status ?? "").toUpperCase();
        const inferredBooked =
          slotAny.booked === true ||
          slotAny.isBooked === true ||
          slotAny.available === false ||
          slotAny.isAvailable === false ||
          (normalizedStatus !== "" &&
            normalizedStatus !== "AVAILABLE" &&
            normalizedStatus !== "OPEN" &&
            normalizedStatus !== "FREE");

        if (inferredBooked) {
          bookedForDate.add(slotKey);
        } else {
          availableForDate.add(slotKey);
        }
      }
    }

    // Merge appointment records as booked markers so patients can always see booked slots.
    for (const appt of doctorAppointments) {
      const status = String(appt.status).toUpperCase();
        if (status === "CANCELLED" || status === "CANCELED" || status === "COMPLETED") {
        continue;
      }

      const parsedSlot = appt.slotId ? parseDateSlotKey(appt.slotId) : null;
      if (parsedSlot && parsedSlot.dateKey === selectedDateKey) {
        bookedForDate.add(appt.slotId as string);
        continue;
      }

      const appointmentKey = appointmentDateTimeKey(appt.appointmentTime);
      if (!appointmentKey || appointmentKey.dateKey !== selectedDateKey) {
        continue;
      }

      bookedForDate.add(
        dateSlotKey(appointmentKey.dateKey, appointmentKey.time),
      );
    }

    const merged = new Set<string>([...availableForDate, ...bookedForDate]);

    return [...merged]
      .map((key) => {
        const parsed = parseDateSlotKey(key);
        if (!parsed) {
          return null;
        }
        return {
          key,
          time: parsed.time,
          isBooked: bookedForDate.has(key),
          isAvailable: availableForDate.has(key),
          isPast:
            new Date(`${parsed.dateKey}T${parsed.time}:00`).getTime() <=
            Date.now(),
        };
      })
      .filter(
        (
          slot,
        ): slot is {
          key: string;
          time: string;
          isBooked: boolean;
          isAvailable: boolean;
          isPast: boolean;
        } => Boolean(slot),
      )
      .sort((a, b) => TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time));
  }, [
    selectedDoctor,
    selectedDoctorId,
    doctorSlots,
    doctorAppointmentsById,
    selectedDateKey,
  ]);

  const visibleSlots = useMemo(() => {
    return availableSlotsForSelectedDoctor.slice(
      slotStartIndex,
      slotStartIndex + 5,
    );
  }, [availableSlotsForSelectedDoctor, slotStartIndex]);

  const canGoPrevSlots = slotStartIndex > 0;
  const canGoNextSlots =
    slotStartIndex + 5 < availableSlotsForSelectedDoctor.length;

  const sortedMyAppointments = useMemo(() => {
    return [...myAppointments].sort(
      (a, b) =>
        new Date(b.appointmentTime).getTime() -
        new Date(a.appointmentTime).getTime(),
    );
  }, [myAppointments]);

  const BOOKING_TABLE_PAGE_SIZE = 8;

  const filteredBookingRows = useMemo(() => {
    const term = bookingTableSearch.trim().toLowerCase();
    return sortedMyAppointments.filter((appt) => {
      if (bookingTypeFilter !== "ALL" && appt.type !== bookingTypeFilter) {
        return false;
      }

      const normalizedStatus = bookingStatusLabel(
        appt,
        telemedicineSessions[appt.id],
      ).toUpperCase();
      if (bookingStatusFilter !== "ALL" && normalizedStatus !== bookingStatusFilter) {
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
        appt.type,
        normalizedStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [
    bookingStatusFilter,
    bookingTableSearch,
    bookingTypeFilter,
    sortedMyAppointments,
    telemedicineSessions,
  ]);

  const bookingTableTotalPages = Math.max(
    1,
    Math.ceil(filteredBookingRows.length / BOOKING_TABLE_PAGE_SIZE),
  );

  const paginatedBookingRows = useMemo(() => {
    const start = (bookingTablePage - 1) * BOOKING_TABLE_PAGE_SIZE;
    return filteredBookingRows.slice(start, start + BOOKING_TABLE_PAGE_SIZE);
  }, [filteredBookingRows, bookingTablePage]);

  useEffect(() => {
    setBookingTablePage(1);
  }, [bookingTableSearch, bookingTypeFilter, bookingStatusFilter]);

  useEffect(() => {
    if (bookingTablePage > bookingTableTotalPages) {
      setBookingTablePage(bookingTableTotalPages);
    }
  }, [bookingTablePage, bookingTableTotalPages]);

  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, AppointmentRecord[]> = {};
    for (const appt of sortedMyAppointments) {
      const key = toDateKey(new Date(appt.appointmentTime));
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(appt);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) =>
          new Date(a.appointmentTime).getTime() -
          new Date(b.appointmentTime).getTime(),
      );
    }

    return grouped;
  }, [sortedMyAppointments]);

  const bookingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const appt of sortedMyAppointments) {
      const key = toDateKey(new Date(appt.appointmentTime));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [sortedMyAppointments]);

  const bookingsForSelectedDate = useMemo(() => {
    return bookingsByDate[selectedBookingDate] ?? [];
  }, [bookingsByDate, selectedBookingDate]);

  const bookingCalendarCells = useMemo(
    () => buildMonthCells(bookingMonth),
    [bookingMonth],
  );

  const visibleMakeDates = useMemo(() => {
    return dateKeys.slice(makeDateStartIndex, makeDateStartIndex + 7);
  }, [dateKeys, makeDateStartIndex]);

  const canGoPrevMakeDates = makeDateStartIndex > 0;
  const canGoNextMakeDates = makeDateStartIndex + 7 < dateKeys.length;

  const bookingYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  useEffect(() => {
    void loadPatientAppointments();
  }, [loadPatientAppointments]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");

    if (paymentStatus === "success") {
      setActiveTab("bookings");

      const handleSuccessReturn = async () => {
        toast("Payment successful. Updating booking status...", "success");

        const appointmentId = params.get("id");
        let polls = 0;
        while (polls < 8) {
          await loadPatientAppointments();
          if (!appointmentId || isPaymentCompleted(appointmentId)) {
            break;
          }
          polls += 1;
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }

        sessionStorage.removeItem("curex.pendingPayment");

        navigate("/patient/appointments", { replace: true });
      };

      void handleSuccessReturn();
      return;
    }

    if (paymentStatus === "cancelled") {
      setActiveTab("bookings");
      toast("Payment was cancelled.", "warning");
      navigate("/patient/appointments", { replace: true });
    }
  }, [location.search, loadPatientAppointments, navigate, toast, isPaymentCompleted]);

  useEffect(() => {
    let active = true;

    async function loadTelemedicineSessions() {
      const telemedicineAppointments = myAppointments.filter(
        (appt) => appt.type === "TELEMEDICINE",
      );

      if (telemedicineAppointments.length === 0) {
        if (active) {
          setTelemedicineSessions({});
        }
        return;
      }

      const entries = await Promise.all(
        telemedicineAppointments.map(async (appt) => {
          try {
            const session = await getTelemedicineSession(appt.id);
            return [appt.id, session] as const;
          } catch {
            return [appt.id, null] as const;
          }
        }),
      );

      if (!active) {
        return;
      }

      const nextMap: Record<string, TelemedicineSessionRecord | null> = {};
      for (const [appointmentId, session] of entries) {
        nextMap[appointmentId] = session;
      }
      setTelemedicineSessions(nextMap);
    }

    loadTelemedicineSessions();

    return () => {
      active = false;
    };
  }, [myAppointments]);

  useEffect(() => {
    setDoctorCardStartIndex((prev) => {
      if (filteredDoctors.length <= 2) {
        return 0;
      }
      return Math.min(prev, Math.max(filteredDoctors.length - 2, 0));
    });
  }, [filteredDoctors]);

  useEffect(() => {
    setSlotStartIndex(0);
  }, [selectedDoctorId, selectedDateKey]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedSlot) {
      return;
    }

    if (!patientId || !patientName || !patientEmail) {
      toast("Please login as a patient to book appointments.", "error");
      return;
    }

    const parsed = parseDateSlotKey(selectedSlot);
    if (!parsed) {
      toast("Selected slot is invalid. Please re-select a slot.", "error");
      return;
    }

    const selectedSlotTime = new Date(
      `${parsed.dateKey}T${parsed.time}:00`,
    ).getTime();
    if (selectedSlotTime <= Date.now()) {
      toast(
        "Selected time has already passed. Please choose a future slot.",
        "error",
      );
      return;
    }

    try {
      setBooking(true);

      const appointmentTime = toAppointmentDateTime(
        parsed.dateKey,
        parsed.time,
      );

      const createdAppointment = await bookAppointment({
        patientId,
        patientName,
        patientEmail,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        slotId: selectedSlot,
        appointmentTime,
        type: appointmentType,
        notes,
      });

      let bookingMessage =
        "Appointment booked. It will be confirmed after payment is completed.";

      if (appointmentType === "TELEMEDICINE") {
        try {
          const session = await createTelemedicineSession(
            createdAppointment.id,
            {
              patientId,
              doctorId: selectedDoctor.id,
            },
          );
          setTelemedicineSessions((prev) => ({
            ...prev,
            [createdAppointment.id]: session,
          }));
          bookingMessage +=
            " Video session has been prepared for this appointment.";
        } catch {
          bookingMessage +=
            " Video session creation is in progress. Refresh My Bookings if link is not visible yet.";
        }
      }

      toast(bookingMessage, "success");
      setSelectedSlot(null);
      setNotes("");

      // Optimistically mark the slot as booked in local slots and doctor appointments cache
      try {
        setDoctorSlots((prev) => {
          const copy = { ...prev };
          const slots = (copy[selectedDoctor.id] || []).map((s) => ({ ...s }));
          const parsed = parseDateSlotKey(createdAppointment.slotId ?? "");
          if (parsed) {
            for (const s of slots) {
              const time = s.startTime.substring(0, 5);
              const key = dateSlotKey(parsed.dateKey, time);
              if (key === createdAppointment.slotId) {
                s.booked = true;
              }
            }
          }
          copy[selectedDoctor.id] = slots;
          return copy;
        });

        setDoctorAppointmentsById((prev) => ({
          ...prev,
          [selectedDoctor.id]: [
            createdAppointment,
            ...(prev[selectedDoctor.id] ?? []),
          ],
        }));
      } catch {}

      const patientData = await getAppointmentsByPatient(patientId);
      setMyAppointments(patientData);

      const slots = await getDoctorSlots(selectedDoctor.id);
      setDoctorSlots((prev) => ({
        ...prev,
        [selectedDoctor.id]: slots,
      }));

      const idsToCheck = new Set(
        [selectedDoctor.id, selectedDoctor.profileId].filter(
          (id): id is string => Boolean(id),
        ),
      );
      const mergedAppointments = patientData.filter((appt) =>
        idsToCheck.has(appt.doctorId),
      );
      setDoctorAppointmentsById((prev) => ({
        ...prev,
        [selectedDoctor.id]: mergedAppointments,
      }));
    } catch (err: unknown) {
      const serverMessage = extractServerMessage(err);
      toast(serverMessage ?? "Booking failed. Please try again.", "error");
    } finally {
      setBooking(false);
    }
  };

  const handleBookingCalendarDateClick = (dateKey: string) => {
    const todayDateKey = toDateKey(new Date());
    const isPastDate = dateKey < todayDateKey;
    if (isPastDate) {
      toast("Previous dates cannot be selected.", "error");
      return;
    }
    setSelectedBookingDate(dateKey);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-heading">Make an Appointment</h1>
        <p className="section-subtext mt-1">
          Search doctors, view available slots, and book your appointment.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-text-secondary/20 bg-surface p-1">
        <button
          type="button"
          onClick={() => setActiveTab("make")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "make"
              ? "bg-primary-light/10 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          Make Appointment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "bookings"
              ? "bg-primary-light/10 text-primary"
              : "text-text-secondary hover:text-primary"
          }`}
        >
          My Bookings
        </button>
      </div>

      {activeTab === "make" && (
        <>
          <div className="appointment-panel p-4 lg:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="patient-page-input pl-10"
                placeholder="Search doctors by name or specialty"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {specialtyOptions.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => setSelectedSpecialty(specialty)}
                  className={`day-pill ${selectedSpecialty === specialty ? "day-pill--active" : ""}`}
                >
                  {specialty === "ALL" ? "All Specialties" : specialty}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="appointment-panel p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-primary">
                    Choose doctor
                  </h2>
                  {slotsLoading && (
                    <span className="text-xs text-text-secondary">
                      Loading slots...
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  {doctorsLoading && (
                    <p className="rounded-xl border border-text-secondary/15 bg-background/40 px-3 py-2 text-xs text-text-secondary">
                      Loading doctors...
                    </p>
                  )}

                  {!doctorsLoading && filteredDoctors.length === 0 && (
                    <p className="rounded-xl border border-text-secondary/15 bg-background/40 px-3 py-2 text-xs text-text-secondary">
                      No doctors found right now. You can still view your
                      existing bookings.
                    </p>
                  )}

                  {!doctorsLoading &&
                    filteredDoctors.length > 0 &&
                    !selectedDoctorId && (
                      <p className="rounded-xl border border-primary-light/20 bg-primary-light/10 px-3 py-2 text-xs text-primary">
                        Select a doctor first to load availability.
                      </p>
                    )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDoctorCardStartIndex((v) => Math.max(0, v - 2))
                      }
                      disabled={!canGoPrevDoctors}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      {visibleDoctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doctor.id);
                            setSelectedSlot(null);
                          }}
                          className={`doctor-card-horizontal text-left ${
                            doctor.id === selectedDoctorId
                              ? "doctor-card-horizontal--active"
                              : ""
                          }`}
                        >
                          {doctor.avatarUrl ? (
                            <img
                              src={doctor.avatarUrl}
                              alt={doctor.name}
                              className="doctor-card-photo"
                            />
                          ) : (
                            <div className="doctor-card-avatar">
                              {doctor.name.replace(/^Dr\.\s*/i, "").charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-primary">
                              {doctor.name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {doctor.specialty}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-text-secondary/85">
                              {doctor.consultationFee != null
                                ? `Fee: $${doctor.consultationFee}`
                                : doctor.email ?? "Profile available"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDoctorCardStartIndex((v) => v + 2)}
                      disabled={!canGoNextDoctors}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {filteredDoctors.length > 2 && (
                    <p className="mt-2 text-xs text-text-secondary">
                      Showing {doctorCardStartIndex + 1}-
                      {Math.min(
                        doctorCardStartIndex + 2,
                        filteredDoctors.length,
                      )}{" "}
                      of {filteredDoctors.length} doctors
                    </p>
                  )}
                </div>
              </div>

              <div className="appointment-panel p-4 lg:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">
                      Choose date and time
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {selectedDoctor?.name ??
                        "Select a doctor to view available slots"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMakeDateStartIndex((v) => Math.max(0, v - 7))
                    }
                    disabled={!canGoPrevMakeDates}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                    {visibleMakeDates.map((dateKey) => (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(dateKey);
                          setSelectedSlot(null);
                        }}
                        className={`day-pill shrink-0 ${selectedDateKey === dateKey ? "day-pill--active" : ""}`}
                      >
                        {dateLabel(dateKey)}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMakeDateStartIndex((v) =>
                        Math.min(v + 7, dateKeys.length - 7),
                      )
                    }
                    disabled={!canGoNextMakeDates}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  {availableSlotsForSelectedDoctor.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-4 py-6 text-center text-sm text-text-secondary">
                      {selectedDoctor
                        ? `No slots on ${dateLabel(selectedDateKey)}.`
                        : "Select a doctor first to view available slots."}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSlotStartIndex((v) => Math.max(0, v - 5))
                          }
                          disabled={!canGoPrevSlots}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="grid flex-1 grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                          {visibleSlots.map((slot) => (
                            <button
                              key={slot.key}
                              type="button"
                              onClick={() => {
                                if (
                                  !slot.isBooked &&
                                  slot.isAvailable &&
                                  !slot.isPast
                                ) {
                                  setSelectedSlot(slot.key);
                                }
                              }}
                              disabled={
                                slot.isBooked ||
                                !slot.isAvailable ||
                                slot.isPast
                              }
                              className={`slot-pill min-w-0 w-full ${
                                selectedSlot === slot.key
                                  ? "slot-pill--active"
                                  : ""
                              } ${
                                slot.isBooked
                                  ? "cursor-not-allowed border-accent-sky/40 bg-accent-sky/20 text-text-secondary"
                                  : ""
                              } ${
                                !slot.isAvailable
                                  ? "cursor-not-allowed border-text-secondary/15 bg-background/40 text-text-secondary"
                                  : ""
                              } ${
                                !slot.isBooked && slot.isPast
                                  ? "cursor-not-allowed border-text-secondary/20 bg-background/60 text-text-secondary/80"
                                  : ""
                              }`}
                            >
                              <div className="text-center">
                                <div>{slot.time}</div>
                                <div className="text-[10px] text-text-secondary">
                                  {slot.isBooked
                                    ? "Booked"
                                    : slot.isPast
                                      ? "Passed"
                                      : slot.isAvailable
                                        ? "Available"
                                        : "Off"}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSlotStartIndex((v) => v + 5)}
                          disabled={!canGoNextSlots}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-text-secondary">
                        Showing {slotStartIndex + 1}-
                        {Math.min(
                          slotStartIndex + 5,
                          availableSlotsForSelectedDoctor.length,
                        )}{" "}
                        of {availableSlotsForSelectedDoctor.length} slots
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-3 rounded-xl border border-text-secondary/10 bg-background/50 p-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional note for doctor"
                    className="symptom-input min-h-[90px]"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setAppointmentType("IN_PERSON")}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        appointmentType === "IN_PERSON"
                          ? "border-primary-light/40 bg-primary-light/10 text-primary"
                          : "border-text-secondary/20 text-text-secondary hover:text-primary"
                      }`}
                    >
                      In-person
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentType("TELEMEDICINE")}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        appointmentType === "TELEMEDICINE"
                          ? "border-primary-light/40 bg-primary-light/10 text-primary"
                          : "border-text-secondary/20 text-text-secondary hover:text-primary"
                      }`}
                    >
                      Telemedicine
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={!selectedDoctor || !selectedSlot || booking}
                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {booking
                      ? "Booking..."
                      : appointmentType === "TELEMEDICINE"
                        ? "Book and Create Video Session"
                        : "Book Selected Slot"}
                  </button>
                </div>

              </div>
            </div>

            <div className="space-y-4">
              <div className="appointment-panel bg-primary p-4 text-surface lg:p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-surface">
                    Doctor Profile
                  </h3>
                  {loading && (
                    <span className="text-xs text-surface/80">Loading...</span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  {selectedDoctor?.avatarUrl ? (
                    <img
                      src={selectedDoctor.avatarUrl}
                      alt={selectedDoctor.name}
                      className="doctor-profile-photo"
                    />
                  ) : (
                    <div className="doctor-profile-avatar border-surface/35 bg-surface/15 text-surface">
                      {doctorInitials(selectedDoctor)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-surface">
                      {selectedDoctor?.name ?? "No doctor selected"}
                    </p>
                    <p className="text-sm text-surface/80">
                      {selectedDoctor?.specialty ?? "Specialty"}
                    </p>
                    <p className="text-xs text-surface/70">
                      {selectedDoctor?.email ?? "No contact info"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-surface/25 bg-surface/10 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-surface/70">
                      Age
                    </p>
                    <p className="mt-1 text-sm font-semibold text-surface">
                      {selectedDoctor?.age ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-surface/25 bg-surface/10 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-surface/70">
                      Gender
                    </p>
                    <p className="mt-1 text-sm font-semibold text-surface">
                      {selectedDoctor?.gender ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-surface/25 bg-surface/10 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-surface/70">
                      Experience
                    </p>
                    <p className="mt-1 text-sm font-semibold text-surface">
                      {selectedDoctor?.yearsOfExperience != null
                        ? `${selectedDoctor.yearsOfExperience} yrs`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-surface/20 bg-surface/10 p-3 text-xs text-surface/85">
                  <p>
                    <span className="font-semibold text-surface">Phone:</span>{" "}
                    {selectedDoctor?.phone ?? "Not provided"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-surface">Fee:</span>{" "}
                    {selectedDoctor?.consultationFee != null
                      ? `$${selectedDoctor.consultationFee}`
                      : "Not specified"}
                  </p>
                </div>
                <div className="mt-4 rounded-xl border border-surface/20 bg-surface/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-surface/70">
                    Biography
                  </p>
                  <p className="mt-2 text-sm text-surface">
                    {selectedDoctor
                      ? selectedDoctor.bio ||
                        `${selectedDoctor.name} specializes in ${selectedDoctor.specialty}.`
                      : "Select a doctor to view profile details."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "bookings" && (
        <div className="appointment-panel p-4 lg:p-5">
          <h2 className="text-lg font-semibold text-primary">My Bookings</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Calendar view for patient ID: {patientId}. Dates with bookings are
            marked.
          </p>

          <div className="mt-4 space-y-5">
            <button
              type="button"
              onClick={() => setShowBookingCalendar((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-text-secondary/20 bg-surface px-3 py-2 text-sm font-medium text-primary"
            >
              {showBookingCalendar ? "Hide Calendar" : "Show Calendar"}
            </button>

            {showBookingCalendar && (
              <div className="calendar-surface rounded-2xl border border-text-secondary/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingMonthPicker((v) => !v)}
                    className="text-base font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {bookingMonth.toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingMonth((m) => addMonths(m, -1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingMonth((m) => addMonths(m, 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-text-secondary/20 text-text-secondary transition hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {showBookingMonthPicker && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-text-secondary/15 bg-surface p-3">
                    <select
                      className="patient-page-input max-w-40"
                      value={bookingMonth.getMonth()}
                      onChange={(e) =>
                        setBookingMonth(
                          new Date(
                            bookingMonth.getFullYear(),
                            Number(e.target.value),
                            1,
                          ),
                        )
                      }
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="patient-page-input max-w-36"
                      value={bookingMonth.getFullYear()}
                      onChange={(e) =>
                        setBookingMonth(
                          new Date(
                            Number(e.target.value),
                            bookingMonth.getMonth(),
                            1,
                          ),
                        )
                      }
                    >
                      {bookingYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowBookingMonthPicker(false)}
                      className="day-pill"
                    >
                      Done
                    </button>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-secondary">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {bookingCalendarCells.map((cell) => {
                    const dayBookings = bookingsByDate[cell.dateKey] ?? [];
                    const marked = dayBookings.length > 0;
                    const selected = selectedBookingDate === cell.dateKey;
                    return (
                      <div
                        key={cell.dateKey}
                        onClick={() =>
                          handleBookingCalendarDateClick(cell.dateKey)
                        }
                        className={`min-h-24 rounded-lg border px-1 py-1 text-left text-xs transition ${
                          selected
                            ? "border-primary-light/40 bg-primary-light/10 text-primary"
                            : marked
                              ? "border-accent-mint/45 bg-accent-mint/20 text-primary"
                              : cell.inMonth
                                ? "border-text-secondary/15 bg-surface text-primary"
                                : "border-text-secondary/10 bg-background/40 text-text-secondary/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cell.dayNumber}</span>
                          {marked && (
                            <span className="rounded-full bg-accent-mint/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {bookingCounts[cell.dateKey]}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 space-y-1">
                          {dayBookings.slice(0, 2).map((appt) => {
                            const apptTime = new Date(
                              appt.appointmentTime,
                            ).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return (
                              <button
                                key={appt.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPopupBooking(appt);
                                }}
                                className={`w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium ${statusPastelClass(
                                  String(appt.status),
                                )}`}
                                title={`${apptTime} - ${appt.doctorName ?? appt.doctorId}`}
                              >
                                {apptTime} {appt.doctorName ?? appt.doctorId}
                              </button>
                            );
                          })}
                          {dayBookings.length > 2 && (
                            <div className="px-1 text-[10px] font-medium text-text-secondary">
                              +{dayBookings.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-primary">
                    {dateLabel(selectedBookingDate)} (
                    {bookingsForSelectedDate.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bookingsForSelectedDate.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/40 px-3 py-2 text-sm text-text-secondary">
                        No bookings on selected date.
                      </div>
                    ) : (
                      bookingsForSelectedDate.map((appt) => {
                        const date = new Date(appt.appointmentTime);
                        return (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => setPopupBooking(appt)}
                            className={`rounded-xl px-3 py-2 text-left text-xs font-medium ${statusPastelClass(
                              String(appt.status),
                            )}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusPastelClass(
                                  appt.status,
                                )}`}
                              >
                                {bookingStatusLabel(
                                  appt,
                                  telemedicineSessions[appt.id],
                                )}
                              </span>
                              {shouldShowPayNow(appt) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPayingAppointmentId(appt.id);
                                    // small delay to allow any pending backend warm-up
                                    setTimeout(() => {
                                      navigate(`/patient/checkout/${appt.id}`);
                                    }, 500);
                                  }}
                                  disabled={payingAppointmentId === appt.id}
                                  className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-surface transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {payingAppointmentId === appt.id ? "Processing..." : "PAY NOW"}
                                </button>
                              )}
                              {!shouldShowPayNow(appt) &&
                                isPaymentCompleted(appt.id) &&
                                String(appt.status).toUpperCase() === "PENDING" && (
                                  <span className="rounded-full bg-accent-mint/20 px-3 py-0.5 text-[10px] font-bold text-primary">
                                    Paid - Confirming
                                  </span>
                                )}
                            </div>
                            {date.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {appt.doctorName ?? appt.doctorId}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-text-secondary">
                  Previous dates are view-only.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-text-secondary/15 bg-background/40 p-4">
              <h3 className="mb-3 text-base font-semibold text-primary">
                All Bookings
              </h3>
              <div className="mb-3 grid gap-3 md:grid-cols-[1fr_170px_180px]">
                <label className="flex-1">
                  <input
                    value={bookingTableSearch}
                    onChange={(e) => setBookingTableSearch(e.target.value)}
                    placeholder="Search by doctor, specialty, status"
                    className="patient-page-input w-full"
                  />
                </label>
                <div className="flex gap-2">
                  <select
                    value={bookingTypeFilter}
                    onChange={(e) =>
                      setBookingTypeFilter(
                        e.target.value as "ALL" | "TELEMEDICINE" | "IN_PERSON",
                      )
                    }
                    className="patient-page-input border-primary-light/30 bg-primary-light/5 font-medium text-primary outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                  >
                    <option value="ALL">All Types</option>
                    <option value="TELEMEDICINE">Telemedicine</option>
                    <option value="IN_PERSON">In-person</option>
                  </select>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) =>
                      setBookingStatusFilter(
                        e.target.value as
                          | "ALL"
                          | "PENDING"
                          | "CONFIRMED"
                          | "IN_SESSION"
                          | "COMPLETED"
                          | "CANCELLED",
                      )
                    }
                    className="patient-page-input border-primary-light/30 bg-primary-light/5 font-medium text-primary outline-none transition-all hover:border-primary-light/60 hover:bg-primary-light/10 focus:ring-2 focus:ring-primary-light/20"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="IN_SESSION">IN_SESSION</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {paginatedBookingRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-text-secondary/20 bg-background/50 px-4 py-6 text-center text-sm text-text-secondary">
                  No bookings match your filters.
                </div>
              ) : (
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-text-secondary/20 text-text-secondary">
                      <th className="px-3 py-2 font-medium">Doctor</th>
                      <th className="px-3 py-2 font-medium">Specialty</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Payment</th>
                      <th className="px-3 py-2 font-medium">Telemedicine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookingRows.map((appt) => {
                      const date = new Date(appt.appointmentTime);
                      const telemedSession = telemedicineSessions[appt.id];
                      const canJoin = canJoinTelemedicine(appt, telemedSession);
                      return (
                        <tr
                          key={appt.id}
                          className="border-b border-text-secondary/10 hover:bg-background/40"
                        >
                          <td className="px-3 py-2">
                            {appt.doctorName ?? appt.doctorId}
                          </td>
                          <td className="px-3 py-2">
                            {appt.doctorSpecialty ?? "-"}
                          </td>
                          <td className="px-3 py-2">
                            {date.toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-3 py-2">
                            {date.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2">
                            {appt.type === "TELEMEDICINE"
                              ? "Video"
                              : "In-person"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPastelClass(String(appt.status))}`}
                            >
                              {bookingStatusLabel(appt, telemedSession)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {shouldShowPayNow(appt) ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/patient/checkout/${appt.id}`)}
                                className="whitespace-nowrap rounded-md border border-primary/30 bg-primary px-2.5 py-1 text-[11px] font-semibold text-surface transition hover:bg-primary/90"
                              >
                                Pay Now
                              </button>
                            ) : isPaymentCompleted(appt.id) &&
                              String(appt.status).toUpperCase() === "PENDING" ? (
                              <span className="rounded-full bg-accent-mint/20 px-2.5 py-1 text-xs font-semibold text-primary">
                                Paid - Confirming
                              </span>
                            ) : String(appt.status).toUpperCase() === "CONFIRMED" ||
                              String(appt.status).toUpperCase() === "IN_SESSION" ||
                              String(appt.status).toUpperCase() === "COMPLETED" ? (
                              <span className="rounded-full bg-accent-mint/20 px-2.5 py-1 text-xs font-semibold text-primary">
                                Paid
                              </span>
                            ) : (
                              <span className="text-xs text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {appt.type !== "TELEMEDICINE" ? (
                              <span className="text-xs text-text-secondary">
                                -
                              </span>
                            ) : canJoin ? (
                              <Link
                                to={`/patient/telemedicine/${appt.id}`}
                                className="rounded-lg border border-primary-light/40 bg-primary-light/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light/20"
                              >
                                Join Call
                              </Link>
                            ) : (
                              <span className="text-xs text-text-secondary">
                                {telemedicineStateLabel(appt, telemedSession)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                <span>
                  Showing {filteredBookingRows.length === 0 ? 0 : (bookingTablePage - 1) * BOOKING_TABLE_PAGE_SIZE + 1}-
                  {Math.min(bookingTablePage * BOOKING_TABLE_PAGE_SIZE, filteredBookingRows.length)} of {filteredBookingRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingTablePage((p) => Math.max(1, p - 1))}
                    disabled={bookingTablePage === 1}
                    className="rounded-lg border border-text-secondary/20 px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>Page {bookingTablePage} / {bookingTableTotalPages}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBookingTablePage((p) => Math.min(bookingTableTotalPages, p + 1))
                    }
                    disabled={bookingTablePage === bookingTableTotalPages}
                    className="rounded-lg border border-text-secondary/20 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {popupBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl bg-surface p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  Booking Details
                </h3>
                <p className="text-sm text-text-secondary">
                  Click outside or close to dismiss.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupBooking(null)}
                className="rounded-lg border border-text-secondary/20 p-2 text-text-secondary transition hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium text-primary">Doctor:</span>{" "}
                {popupBooking.doctorName ?? popupBooking.doctorId}
              </p>
              <p>
                <span className="font-medium text-primary">Specialty:</span>{" "}
                {popupBooking.doctorSpecialty ?? "-"}
              </p>
              <p>
                <span className="font-medium text-primary">Date:</span>{" "}
                {new Date(popupBooking.appointmentTime).toLocaleDateString(
                  "en-GB",
                )}
              </p>
              <p>
                <span className="font-medium text-primary">Time:</span>{" "}
                {new Date(popupBooking.appointmentTime).toLocaleTimeString(
                  "en-GB",
                  { hour: "2-digit", minute: "2-digit" },
                )}
              </p>
              <p>
                <span className="font-medium text-primary">Type:</span>{" "}
                {popupBooking.type === "TELEMEDICINE" ? "Video" : "In-person"}
              </p>
              <p>
                <span className="font-medium text-primary">Status:</span>{" "}
                {bookingStatusLabel(
                  popupBooking,
                  telemedicineSessions[popupBooking.id],
                )}
              </p>
              {popupBooking.type === "TELEMEDICINE" && (
                <p>
                  <span className="font-medium text-primary">
                    Telemedicine:
                  </span>{" "}
                  {telemedicineStateLabel(
                    popupBooking,
                    telemedicineSessions[popupBooking.id],
                  )}
                </p>
              )}
              {popupBooking.notes && (
                <p>
                  <span className="font-medium text-primary">Notes:</span>{" "}
                  {popupBooking.notes}
                </p>
              )}
            </div>

            {popupBooking.type === "TELEMEDICINE" &&
              canJoinTelemedicine(
                popupBooking,
                telemedicineSessions[popupBooking.id],
              ) && (
                <div className="mt-4">
                  <Link
                    to={`/patient/telemedicine/${popupBooking.id}`}
                    className="btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
                  >
                    Open Telemedicine Room
                  </Link>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
