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
  phoneNumber?: string
  role: Role
  medicalLicenseNumber?: string
  specialty?: string
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
