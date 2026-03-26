import api from './axiosInstance'
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  SendOtpRequest,
  UpdateProfileRequest,
  UserInfo,
  UserResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../types/auth'

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

  changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return api.post<{ message: string }>(`${AUTH}/change-password`, data).then((r) => r.data)
  },

  /**
   * Sends a 6-digit OTP to the given phone number.
   * The code is valid for 5 minutes.
   */
  sendOtp(data: SendOtpRequest): Promise<{ message: string; expiresInMinutes: string }> {
    return api.post(`${AUTH}/otp/send`, data).then((r) => r.data)
  },

  /**
   * Verifies the OTP code for the given phone number.
   * Returns a short-lived `verificationToken` that must be included in the registration request.
   */
  verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    return api.post<VerifyOtpResponse>(`${AUTH}/otp/verify`, data).then((r) => r.data)
  },

  /**
   * Updates the authenticated user's profile.
   *
   * Called immediately after registration to persist supplementary data
   * (dob, gender, address, doctor credentials, patient health info).
   * Only non-null fields are applied on the backend — safe to call with partial data.
   */
  updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
    return api.put<UserResponse>('/api/users/me/profile', data).then((r) => r.data)
  },
}
