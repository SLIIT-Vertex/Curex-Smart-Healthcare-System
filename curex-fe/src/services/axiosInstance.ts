import axios, { type AxiosError } from "axios";
import { store } from "../store";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearCredentials,
  setCredentials,
} from "../store/slices/authSlice";
import type { AuthResponse } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/** Extract user-friendly message from API error response (e.g. Doctor not found for user id) */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Request failed",
): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ message?: string }>).response?.data;
    if (data?.message && typeof data.message === "string") return data.message;
    const status = (err as AxiosError).response?.status;
    if (status === 404) return "Resource not found";
    if (status === 503)
      return "Service temporarily unavailable. Please try again.";
  }
  return err instanceof Error ? err.message : fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type RetryableRequestConfig = {
  _retry?: boolean;
  url?: string;
  headers?: Record<string, string>;
};

let refreshPromise: Promise<AuthResponse> | null = null;

const redirectToLoginIfNeeded = () => {
  const path = window.location.pathname;
  if (!path.startsWith("/login") && !path.startsWith("/register")) {
    window.location.href = "/login";
  }
};

const refreshTokens = async (): Promise<AuthResponse> => {
  const state = store.getState().auth;
  const refreshToken =
    state.refreshToken ?? localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );

  return response.data;
};

//  Request interceptor — attach Bearer token from Redux store
api.interceptors.request.use((config) => {
  const token =
    store.getState().auth.accessToken ?? localStorage.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach admin ID header for admin endpoints so the backend can audit actions
  const user = store.getState().auth.user;
  if (user?.role === "ADMIN" && user.id) {
    config.headers["X-Admin-Id"] = user.id;
  }

  return config;
});

//  Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = (error.config ?? {}) as RetryableRequestConfig;
    const requestUrl = originalRequest.url ?? "";
    const isAuthRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register") ||
      requestUrl.includes("/api/auth/refresh");

    if (status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshTokens()
            .then((auth) => {
              store.dispatch(setCredentials(auth));
              return auth;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const refreshedAuth = await refreshPromise;
        if (refreshedAuth.accessToken) {
          originalRequest.headers = {
            ...(originalRequest.headers ?? {}),
            Authorization: `Bearer ${refreshedAuth.accessToken}`,
          };
        }

        return api(originalRequest);
      } catch {
        store.dispatch(clearCredentials());
        redirectToLoginIfNeeded();
      }
      return Promise.reject(error);
    }

    if (status === 401) {
      store.dispatch(clearCredentials());
      redirectToLoginIfNeeded();
    }

    return Promise.reject(error);
  },
);

export default api;
