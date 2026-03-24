import api from './axiosInstance'
import type {
  PlatformStatistics,
  UserApprovalRequest,
  UserResponse,
  UsersPage,
} from '../types/auth.ts'

const ADMIN = '/api/admin'

export interface GetUsersParams {
  page?: number
  size?: number
  role?: string
  status?: string
  search?: string
}

export const adminService = {
  getUsers(params: GetUsersParams = {}): Promise<UsersPage> {
    return api.get<UsersPage>(`${ADMIN}/users`, { params }).then((r) => r.data)
  },

  getUserById(id: string): Promise<UserResponse> {
    return api.get<UserResponse>(`${ADMIN}/users/${id}`).then((r) => r.data)
  },

  getPendingDoctors(): Promise<UserResponse[]> {
    return api.get<UserResponse[]>(`${ADMIN}/doctors/pending`).then((r) => r.data)
  },

  updateUserStatus(
    userId: string,
    request: UserApprovalRequest,
  ): Promise<UserResponse> {
    return api
      .put<UserResponse>(`${ADMIN}/users/${userId}/status`, request)
      .then((r) => r.data)
  },

  bulkUpdateStatus(
    userIds: string[],
    request: UserApprovalRequest,
  ): Promise<UserResponse[]> {
    return api
      .put<UserResponse[]>(`${ADMIN}/users/bulk-status`, {
        userIds,
        action: request.action,
        notes: request.notes,
      })
      .then((r) => r.data)
  },

  suspendUser(userId: string): Promise<void> {
    return api.delete(`${ADMIN}/users/${userId}`).then(() => undefined)
  },

  getStatistics(): Promise<PlatformStatistics> {
    return api
      .get<PlatformStatistics>(`${ADMIN}/statistics`)
      .then((r) => r.data)
  },
}
