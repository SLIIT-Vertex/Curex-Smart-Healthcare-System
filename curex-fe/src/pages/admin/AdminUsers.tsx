import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ShieldOff,
  ShieldCheck,
  UserCheck,
  UserX,
  RotateCcw,
  Ban,
  X,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { useToast } from "../../store/hooks";
import type { AccountStatus, Role, UserResponse } from "../../types/auth";

const ROLE_LABELS: Record<Role, string> = {
  PATIENT: "Patient",
  DOCTOR: "Doctor",
  ADMIN: "Admin",
};
const STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};
const STATUS_CLASSES: Record<AccountStatus, string> = {
  PENDING: "bg-status-attention/15 text-status-attention",
  APPROVED: "bg-status-healthy/15 text-status-healthy",
  REJECTED: "bg-error/15 text-error",
  SUSPENDED: "bg-text-secondary/15 text-text-secondary",
};
const STATUS_DOT: Record<AccountStatus, string> = {
  PENDING: "bg-status-attention animate-pulse",
  APPROVED: "bg-status-healthy",
  REJECTED: "bg-error",
  SUSPENDED: "bg-text-secondary",
};

function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "ADMIN"
      ? "bg-primary/10 text-primary"
      : role === "DOCTOR"
        ? "bg-accent-sky/20 text-primary"
        : "bg-accent-mint/20 text-primary";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function UserAvatar({ user }: { user: UserResponse }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    "U";
  const showImage = Boolean(user.profileImageUrl) && !imageFailed;

  return (
    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-light/10 text-xs font-semibold text-primary">
      {showImage ? (
        <img
          src={user.profileImageUrl ?? ""}
          alt={`${user.firstName} ${user.lastName}`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOptional(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-text-secondary/8 bg-linear-to-br from-background/60 to-background/30 px-3.5 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-primary wrap-break-word leading-relaxed">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary/40 whitespace-nowrap">
          {title}
        </h3>
        <div className="h-px flex-1 bg-linear-to-r from-text-secondary/10 to-transparent" />
      </div>
      {children}
    </div>
  );
}

interface ActionMenuProps {
  user: UserResponse;
  onAction: (
    userId: string,
    action:
      | "APPROVE"
      | "REJECT"
      | "SUSPEND"
      | "REACTIVATE"
      | "PROMOTE_TO_ADMIN",
  ) => void;
}

function ActionMenu({ user, onAction }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 144;
    const margin = 8;
    const left = Math.max(
      margin,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - margin),
    );
    const top = rect.bottom + 6;
    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const clickedTrigger = !!ref.current && ref.current.contains(target);
      const clickedMenu = !!menuRef.current && menuRef.current.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    const onViewportChange = () => updateMenuPosition();

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, updateMenuPosition]);

  const actions: {
    label: string;
    value: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE" | "PROMOTE_TO_ADMIN";
    show: boolean;
  }[] = (
    [
      {
        label: "Approve",
        value: "APPROVE" as const,
        show:
          user.accountStatus === "PENDING" || user.accountStatus === "REJECTED",
      },
      {
        label: "Reject",
        value: "REJECT" as const,
        show:
          user.accountStatus === "PENDING" || user.accountStatus === "APPROVED",
      },
      {
        label: "Suspend",
        value: "SUSPEND" as const,
        show: user.accountStatus === "APPROVED",
      },
      {
        label: "Reactivate",
        value: "REACTIVATE" as const,
        show:
          user.accountStatus === "SUSPENDED" ||
          user.accountStatus === "REJECTED",
      },
      {
        label: "Promote to Admin",
        value: "PROMOTE_TO_ADMIN" as const,
        show: user.role !== "ADMIN",
      },
    ] as const
  ).filter((a) => a.show);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => {
            const next = !v;
            if (next) {
              updateMenuPosition();
            }
            return next;
          });
        }}
        aria-label="User actions"
        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-190 min-w-[9rem] rounded-xl border border-text-secondary/10 bg-surface py-1 shadow-card"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {actions.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm transition-colors hover:bg-primary-light/5 ${value === "REJECT" || value === "SUSPEND" ? "text-error" : "text-primary"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(user.id, value);
                  setOpen(false);
                }}
              >
                {value === "APPROVE" || value === "REACTIVATE" ? (
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : value === "PROMOTE_TO_ADMIN" ? (
                  <UserCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const fetchUsers = useCallback(() => {
    setIsLoading(true);
    adminService
      .getUsers({
        page,
        size: 10,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
      })
      .catch(() => toast("Failed to load users.", "error"))
      .finally(() => setIsLoading(false));
  }, [page, search, roleFilter, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, statusFilter]);

  async function handleAction(
    userId: string,
    action:
      | "APPROVE"
      | "REJECT"
      | "SUSPEND"
      | "REACTIVATE"
      | "PROMOTE_TO_ADMIN",
  ) {
    setActionLoading(userId);
    try {
      await adminService.updateUserStatus(userId, { action });
      toast(
        action === "APPROVE"
          ? "User approved."
          : action === "REJECT"
            ? "User rejected."
            : action === "SUSPEND"
              ? "User suspended."
              : action === "PROMOTE_TO_ADMIN"
                ? "User promoted to admin."
                : "User reactivated.",
        action === "APPROVE" ||
          action === "REACTIVATE" ||
          action === "PROMOTE_TO_ADMIN"
          ? "success"
          : "warning",
      );
      fetchUsers();
    } catch {
      toast("Action failed. Please try again.", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          User Management
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {totalItems} users registered on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            strokeWidth={1.5}
          />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-text-secondary/20 bg-surface py-2.5 pl-10 pr-4 text-sm text-primary placeholder:text-text-secondary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-text-secondary/20 bg-surface px-3 py-2.5 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="">All roles</option>
          <option value="PATIENT">Patient</option>
          <option value="DOCTOR">Doctor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-text-secondary/20 bg-surface px-3 py-2.5 text-sm text-primary focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Active</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl bg-surface"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-text-secondary/10">
                {["Name", "Email", "Role", "Status", "Joined", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-text-secondary/10 last:border-0"
                  >
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-text-secondary/10" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-text-secondary"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`cursor-pointer border-b border-text-secondary/10 last:border-0 transition-colors hover:bg-background/40 ${actionLoading === user.id ? "opacity-50" : ""}`}
                    onClick={() => setSelectedUser(user)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedUser(user);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={user} />
                        <span className="font-medium text-primary">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {user.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.accountStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionMenu user={user} onAction={handleAction} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-text-secondary/10 px-5 py-3">
            <p className="text-xs text-text-secondary">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-light/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser &&
        (() => {
          const modalActions = [
            {
              label: "Approve",
              value: "APPROVE",
              icon: UserCheck,
              variant: "success",
            },
            {
              label: "Reject",
              value: "REJECT",
              icon: UserX,
              variant: "danger",
            },
            {
              label: "Suspend",
              value: "SUSPEND",
              icon: Ban,
              variant: "danger",
            },
            {
              label: "Reactivate",
              value: "REACTIVATE",
              icon: RotateCcw,
              variant: "neutral",
            },
            {
              label: "Promote to Admin",
              value: "PROMOTE_TO_ADMIN",
              icon: UserCheck,
              variant: "success",
            },
          ] as const;

          const filteredModalActions = modalActions.filter((a) => {
            const s = selectedUser.accountStatus;
            if (a.value === "APPROVE")
              return s === "PENDING" || s === "REJECTED";
            if (a.value === "REJECT")
              return s === "PENDING" || s === "APPROVED";
            if (a.value === "SUSPEND") return s === "APPROVED";
            if (a.value === "REACTIVATE")
              return s === "SUSPENDED" || s === "REJECTED";
            if (a.value === "PROMOTE_TO_ADMIN")
              return selectedUser.role !== "ADMIN";
            return false;
          });

          return (
            <div
              className="fixed inset-0 z-200 flex items-center justify-center bg-primary/25 px-4 backdrop-blur-md"
              onClick={() => setSelectedUser(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl bg-surface/95 backdrop-blur-xl flex flex-col border border-text-secondary/8"
                style={{
                  boxShadow:
                    "0 25px 60px -12px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.05)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div className="relative">
                  {/* Mesh gradient banner */}
                  <div className="h-24 bg-linear-to-br from-primary-light/25 via-accent-sky/20 to-accent-mint/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,.12),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.08),transparent_50%)]" />
                  </div>

                  {/* Avatar */}
                  <div className="absolute left-6 -bottom-8">
                    {selectedUser.profileImageUrl ? (
                      <img
                        src={selectedUser.profileImageUrl}
                        alt=""
                        className="h-[72px] w-[72px] rounded-2xl border-[3px] border-surface object-cover shadow-lg ring-1 ring-primary/5"
                      />
                    ) : (
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-[3px] border-surface bg-linear-to-br from-primary-light/15 to-accent-sky/10 text-xl font-bold text-primary shadow-lg ring-1 ring-primary/5">
                        {selectedUser.firstName?.[0] ?? ""}
                        {selectedUser.lastName?.[0] ?? ""}
                      </div>
                    )}
                  </div>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-surface/70 text-text-secondary hover:bg-surface hover:text-primary transition-all backdrop-blur-md border border-white/10 hover:scale-105"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                {/* Name + meta */}
                <div className="px-6 pt-12 pb-3">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    {selectedUser.role === "DOCTOR" ? "Dr. " : ""}
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                  <p className="mt-0.5 text-xs text-text-secondary/70 font-mono">
                    {selectedUser.email}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <RoleBadge role={selectedUser.role} />
                    <StatusBadge status={selectedUser.accountStatus} />
                    {selectedUser.emailVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-healthy/8 border border-status-healthy/15 px-2 py-0.5 text-[10px] font-semibold text-status-healthy uppercase tracking-wide">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto px-6 pb-5">
                  {/* Contact */}
                  <Section title="Contact">
                    <div className="grid grid-cols-2 gap-2.5">
                      <DetailField label="Email" value={selectedUser.email} />
                      <DetailField
                        label="Phone"
                        value={formatOptional(selectedUser.phoneNumber)}
                      />
                    </div>
                  </Section>

                  {/* Personal */}
                  {(selectedUser.dob ||
                    selectedUser.gender ||
                    selectedUser.address) && (
                    <Section title="Personal">
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedUser.dob && (
                          <DetailField
                            label="Date of Birth"
                            value={new Date(
                              selectedUser.dob,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          />
                        )}
                        {selectedUser.gender && (
                          <DetailField
                            label="Gender"
                            value={selectedUser.gender}
                          />
                        )}
                      </div>
                      {selectedUser.address && (
                        <div className="mt-2.5">
                          <DetailField
                            label="Address"
                            value={selectedUser.address}
                          />
                        </div>
                      )}
                      {selectedUser.bio && (
                        <div className="mt-2.5">
                          <DetailField label="Bio" value={selectedUser.bio} />
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Doctor credentials */}
                  {selectedUser.role === "DOCTOR" &&
                    (selectedUser.specialty ||
                      selectedUser.medicalLicenseNumber ||
                      selectedUser.yearsOfExperience != null ||
                      selectedUser.certifications) && (
                      <Section title="Credentials">
                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedUser.specialty && (
                            <DetailField
                              label="Specialty"
                              value={selectedUser.specialty}
                            />
                          )}
                          {selectedUser.medicalLicenseNumber && (
                            <DetailField
                              label="License No."
                              value={selectedUser.medicalLicenseNumber}
                            />
                          )}
                          {selectedUser.yearsOfExperience != null && (
                            <DetailField
                              label="Experience"
                              value={`${selectedUser.yearsOfExperience} year${selectedUser.yearsOfExperience !== 1 ? "s" : ""}`}
                            />
                          )}
                          {selectedUser.certifications && (
                            <DetailField
                              label="Certifications"
                              value={selectedUser.certifications}
                            />
                          )}
                        </div>
                      </Section>
                    )}

                  {/* Proof docs */}
                  {selectedUser.proofDocumentUrls && (
                    <Section title="Documents">
                      <div className="flex flex-col gap-2">
                        {selectedUser.proofDocumentUrls
                          .split(",")
                          .map((rawUrl) => {
                            const url = rawUrl.trim();
                            if (!url) return null;
                            const filename = decodeURIComponent(
                              url.split("/").pop() ?? "Document",
                            );
                            const isPdf = url.toLowerCase().endsWith(".pdf");
                            return (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-text-secondary/10 bg-linear-to-r from-background/60 to-background/30 px-4 py-3 text-sm text-primary hover:border-primary-light/25 hover:from-primary-light/3 transition-all group"
                              >
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold uppercase tracking-wide ${isPdf ? "bg-error/10 text-error border border-error/15" : "bg-accent-sky/10 text-accent-sky border border-accent-sky/15"}`}
                                >
                                  {isPdf ? "PDF" : "IMG"}
                                </span>
                                <span className="flex-1 truncate text-sm font-medium">
                                  {filename}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary/40 group-hover:text-primary-light transition-colors">
                                  Open ↗
                                </span>
                              </a>
                            );
                          })}
                      </div>
                    </Section>
                  )}

                  {/* Patient health */}
                  {selectedUser.role === "PATIENT" &&
                    (selectedUser.bloodGroup ||
                      selectedUser.allergies ||
                      selectedUser.chronicConditions) && (
                      <Section title="Health">
                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedUser.bloodGroup && (
                            <DetailField
                              label="Blood Group"
                              value={selectedUser.bloodGroup}
                            />
                          )}
                          {selectedUser.allergies && (
                            <DetailField
                              label="Allergies"
                              value={selectedUser.allergies}
                            />
                          )}
                          {selectedUser.chronicConditions && (
                            <DetailField
                              label="Chronic Conditions"
                              value={selectedUser.chronicConditions}
                            />
                          )}
                        </div>
                        {(selectedUser.emergencyContactName ||
                          selectedUser.emergencyContactPhone) && (
                          <div className="mt-3 rounded-xl bg-error/4 border border-error/12 p-3">
                            <p className="text-[10px] uppercase tracking-widest text-error/60 font-bold mb-2">
                              Emergency Contact
                            </p>
                            <div className="grid grid-cols-2 gap-2.5">
                              {selectedUser.emergencyContactName && (
                                <DetailField
                                  label="Name"
                                  value={selectedUser.emergencyContactName}
                                />
                              )}
                              {selectedUser.emergencyContactPhone && (
                                <DetailField
                                  label="Phone"
                                  value={selectedUser.emergencyContactPhone}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </Section>
                    )}

                  {/* Approval */}
                  {(selectedUser.approvedBy ||
                    selectedUser.approvalNotes ||
                    selectedUser.approvalDate) && (
                    <Section title="Approval">
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedUser.approvedBy && (
                          <DetailField
                            label="Approved By"
                            value={selectedUser.approvedBy}
                          />
                        )}
                        {selectedUser.approvalDate && (
                          <DetailField
                            label="Date"
                            value={formatDateTime(selectedUser.approvalDate)}
                          />
                        )}
                      </div>
                      {selectedUser.approvalNotes && (
                        <div className="mt-2.5">
                          <DetailField
                            label="Notes"
                            value={selectedUser.approvalNotes}
                          />
                        </div>
                      )}
                    </Section>
                  )}

                  {/* System */}
                  <Section title="System">
                    <div className="grid grid-cols-2 gap-2.5">
                      <DetailField
                        label="Created"
                        value={formatDateTime(selectedUser.createdAt)}
                      />
                      <DetailField
                        label="Updated"
                        value={formatDateTime(selectedUser.updatedAt)}
                      />
                    </div>
                    <div className="mt-2.5">
                      <p className="rounded-xl bg-background/40 border border-text-secondary/8 px-3.5 py-2 text-[10px] text-text-secondary/50 font-mono break-all">
                        {selectedUser.id}
                      </p>
                    </div>
                  </Section>
                </div>

                {/* ── Sticky footer with actions ── */}
                {filteredModalActions.length > 0 && (
                  <div className="border-t border-text-secondary/8 bg-background/30 px-6 py-4 flex gap-2.5">
                    {filteredModalActions.map(
                      ({ label, value, icon: Icon, variant }) => {
                        const isLoading = actionLoading === selectedUser.id;
                        const base =
                          "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-50";
                        const styles =
                          variant === "success"
                            ? `${base} bg-status-healthy text-primary hover:brightness-95 shadow-sm`
                            : variant === "danger"
                              ? `${base} border border-error/25 bg-error/6 text-error hover:bg-error/10`
                              : `${base} border border-text-secondary/20 bg-surface text-primary hover:bg-primary-light/5 hover:border-primary-light/25`;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={isLoading}
                            className={styles}
                            onClick={() => {
                              handleAction(selectedUser.id, value);
                              setSelectedUser(null);
                            }}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                            {label}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
