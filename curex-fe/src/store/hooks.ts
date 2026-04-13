import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from './index'
import { clearCredentials, setCredentials } from './slices/authSlice'
import { addToast, removeToast } from './slices/toastSlice'
import type { AuthResponse } from '../types/auth'
import type { ToastVariant } from './slices/toastSlice'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector)

/** Convenience selector for the auth slice */
export function useAuth() {
  return useAppSelector((s) => s.auth)
}

/** Convenience selector: true if the user has a valid access token */
export function useIsAuthenticated(): boolean {
  return useAppSelector((s) => !!s.auth.accessToken && !!s.auth.user)
}

/** Returns the current user's role, or null */
export function useRole() {
  return useAppSelector((s) => s.auth.user?.role ?? null)
}

/** Convenience selector for the multi-step registration form state */
export function useRegister() {
  return useAppSelector((s) => s.register)
}


/**
 * Returns auth action helpers. Must be called inside BrowserRouter
 * because it uses useNavigate internally.
 */
export function useAuthActions() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const login = useCallback(
    (response: AuthResponse) => {
      dispatch(setCredentials(response))
    },
    [dispatch],
  )

  const logout = useCallback(() => {
    dispatch(clearCredentials())
    navigate('/login', { replace: true })
  }, [dispatch, navigate])

  return { login, logout }
}

/** Returns toast action helpers */
export function useToast() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.toast.items)

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4500) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      dispatch(addToast({ id, message, variant, duration }))
      if (duration > 0) {
        setTimeout(() => dispatch(removeToast(id)), duration)
      }
    },
    [dispatch],
  )

  const dismiss = useCallback(
    (id: string) => dispatch(removeToast(id)),
    [dispatch],
  )

  return { items, toast, dismiss }
}
