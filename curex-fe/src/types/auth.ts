export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN'
export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
export type ApprovalAction = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE'

export interface UserInfo {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role: Role
  accountStatus: AccountStatus
  emailVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: UserInfo
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  phoneVerificationToken: string
  emailVerificationToken: string
  role: Role
}

/** Sent to PUT /api/users/me/profile immediately after registration. All fields optional. */
export interface UpdateProfileRequest {
  // Common
  dob?: string          // ISO-8601 "YYYY-MM-DD"
  gender?: string
  address?: string
  // Doctor-specific
  specialty?: string
  medicalLicenseNumber?: string
  yearsOfExperience?: number
  certifications?: string
  // Patient-specific
  bloodGroup?: string
  allergies?: string
  chronicConditions?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface SendOtpRequest {
  phoneNumber: string
  email: string
}

export interface VerifyOtpRequest {
  phoneNumber: string
  otpCode: string
  email: string
  emailOtpCode: string
}

export interface VerifyOtpResponse {
  verificationToken: string
  emailVerificationToken: string
  message: string
}

export interface UserResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role: Role
  accountStatus: AccountStatus
  emailVerified: boolean
  approvedBy?: string
  approvalNotes?: string
  approvalDate?: string
  createdAt: string
  updatedAt: string
  // Profile fields
  dob?: string
  gender?: string
  address?: string
  specialty?: string
  medicalLicenseNumber?: string
  yearsOfExperience?: number
  certifications?: string
  bloodGroup?: string
  allergies?: string
  chronicConditions?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface UsersPage {
  users: UserResponse[]
  currentPage: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface UserApprovalRequest {
  action: ApprovalAction
  notes?: string
}

export interface PlatformStatistics {
  userStats: {
    totalPatients: number
    totalDoctors: number
    totalAdmins: number
    pendingDoctors: number
    approvedDoctors: number
    rejectedDoctors: number
    totalUsers: number
  } | null
  registrationTrends: Array<{ date: string; registrations: number }>
  systemHealth: {
    status: string
    databaseStatus: string
    messagingStatus: string
    uptime: number
  } | null
}
