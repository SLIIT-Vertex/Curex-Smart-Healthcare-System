import axios, { type AxiosError } from 'axios'
import { store } from '../store'
import { clearCredentials } from '../store/slices/authSlice'
import { ACCESS_TOKEN_KEY } from '../store/slices/authSlice'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

/** Extract user-friendly message from API error response (e.g. Doctor not found for user id) */
export function getApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ message?: string }>).response?.data
    if (data?.message && typeof data.message === 'string') return data.message
    const status = (err as AxiosError).response?.status
    if (status === 404) return 'Resource not found'
    if (status === 503) return 'Service temporarily unavailable. Please try again.'
  }
  return err instanceof Error ? err.message : fallback
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

//  Request interceptor — attach Bearer token from Redux store 
api.interceptors.request.use((config) => {
  const token =
    store.getState().auth.accessToken ?? localStorage.getItem(ACCESS_TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Attach admin ID header for admin endpoints so the backend can audit actions
  const user = store.getState().auth.user
  if (user?.role === 'ADMIN' && user.id) {
    config.headers['X-Admin-Id'] = user.id
  }

  return config
})

//  Response interceptor — handle 401 globally 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear state and let the router redirect
      store.dispatch(clearCredentials())
      // Only redirect if not already on auth pages
      const path = window.location.pathname
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
