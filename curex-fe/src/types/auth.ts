export type Role = "PATIENT" | "DOCTOR" | "ADMIN";
export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type ApprovalAction = "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE";

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  /** Null for DOCTOR registrations — doctors must be approved before they can log in. */
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number | null;
  user: UserInfo;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface NotificationPreferences {
  userId?: string;
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  paymentAlerts: boolean;
  emailDigest: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  appointmentReminders?: boolean;
  prescriptionAlerts?: boolean;
  paymentAlerts?: boolean;
  emailDigest?: boolean;
}

export type ForgotPasswordChannel = "EMAIL" | "SMS";

export interface ForgotPasswordSendOtpRequest {
  identifier: string;
  channel: ForgotPasswordChannel;
}

export interface ForgotPasswordVerifyOtpRequest {
  identifier: string;
  channel: ForgotPasswordChannel;
  otpCode: string;
}

export interface ForgotPasswordVerifyOtpResponse {
  verificationToken: string;
  message: string;
}

export interface ForgotPasswordResetRequest {
  identifier: string;
  channel: ForgotPasswordChannel;
  verificationToken: string;
  newPassword: string;
}

export interface RegisterRequest {
  // Required identity
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneVerificationToken: string;
  emailVerificationToken: string;
  role: Role;
  // Optional profile fields — all roles
  profileImageUrl?: string;
  dob?: string; // ISO-8601 "YYYY-MM-DD"
  gender?: string;
  address?: string;
  // Doctor-specific
  specialty?: string;
  medicalLicenseNumber?: string;
  yearsOfExperience?: number;
  certifications?: string;
  proofDocumentUrls?: string;
  // Patient-specific
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/** Sent to PUT /api/users/me/profile. All fields optional — null means no change. */
export interface UpdateProfileRequest {
  // Identity
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  // Common profile
  dob?: string; // ISO-8601 "YYYY-MM-DD"
  gender?: string;
  address?: string;
  bio?: string;
  // Doctor-specific
  specialty?: string;
  medicalLicenseNumber?: string;
  yearsOfExperience?: number;
  certifications?: string;
  proofDocumentUrls?: string; // comma-separated Cloudinary URLs
  // Patient-specific
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface SendOtpRequest {
  phoneNumber: string;
  email: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otpCode: string;
  email: string;
  emailOtpCode: string;
}

export interface VerifyOtpResponse {
  verificationToken: string;
  emailVerificationToken: string;
  message: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  approvedBy?: string;
  approvalNotes?: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
  // Common profile fields
  dob?: string;
  gender?: string;
  address?: string;
  bio?: string;
  // Doctor-specific
  specialty?: string;
  medicalLicenseNumber?: string;
  yearsOfExperience?: number;
  certifications?: string;
  proofDocumentUrls?: string;
  // Patient-specific
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UsersPage {
  users: UserResponse[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserApprovalRequest {
  action: ApprovalAction;
  notes?: string;
}

export interface PlatformStatistics {
  userStats: {
    totalPatients: number;
    totalDoctors: number;
    totalAdmins: number;
    pendingDoctors: number;
    approvedDoctors: number;
    rejectedDoctors: number;
    totalUsers: number;
  } | null;
  registrationTrends: Array<{ date: string; registrations: number }>;
  systemHealth: {
    status: string;
    databaseStatus: string;
    messagingStatus: string;
    uptime: number;
  } | null;
}
