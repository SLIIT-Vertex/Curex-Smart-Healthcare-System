import api from './axiosInstance'
import type { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from '../types/auth.ts'

const AUTH = '/api/auth'

export const authService = {
  login(data: LoginRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>(`${AUTH}/login`, data).then((r) => r.data)
  },

  register(data: RegisterRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>(`${AUTH}/register`, data).then((r) => r.data)
  },

  getProfile(): Promise<UserInfo> {
    return api.get<UserInfo>(`${AUTH}/profile`).then((r) => r.data)
  },

  refreshToken(refreshToken: string): Promise<AuthResponse> {
    return api
      .post<AuthResponse>(`${AUTH}/refresh`, { refreshToken })
      .then((r) => r.data)
  },

  logout(): Promise<void> {
    return api.post(`${AUTH}/logout`).then(() => undefined)
  },
}
