import api from "./axiosInstance";
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  UpdateProfileRequest,
  UserResponse,
} from "../types/auth";

/**
 * User-service endpoints for authenticated profile operations.
 *
 * GET  /api/users/me          — fetch the caller's full profile (UserResponse)
 * PUT  /api/users/me/profile  — update editable profile fields (returns UserResponse)
 */
export const userService = {
  /**
   * Returns the authenticated user's full profile, including all optional
   * profile fields (dob, gender, address, doctor/patient specific data, etc.)
   */
  getMyProfile(): Promise<UserResponse> {
    return api.get<UserResponse>("/api/users/me").then((r) => r.data);
  },

  /**
   * Partially updates the authenticated user's profile.
   * Only non-null fields in the request body are applied on the backend.
   */
  updateMyProfile(data: UpdateProfileRequest): Promise<UserResponse> {
    return api
      .put<UserResponse>("/api/users/me/profile", data)
      .then((r) => r.data);
  },

  getMyNotificationPreferences(): Promise<NotificationPreferences> {
    return api
      .get<NotificationPreferences>("/api/users/me/preferences/notifications")
      .then((r) => r.data);
  },

  updateMyNotificationPreferences(
    data: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferences> {
    return api
      .put<NotificationPreferences>(
        "/api/users/me/preferences/notifications",
        data,
      )
      .then((r) => r.data);
  },

  deleteMyAccount(): Promise<{ message: string }> {
    return api
      .delete<{ message: string }>("/api/users/me/account")
      .then((r) => r.data);
  },
};
