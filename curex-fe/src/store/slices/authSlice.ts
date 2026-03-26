import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthResponse, UserInfo } from '../../types/auth'

const ACCESS_TOKEN_KEY = 'curex_access_token'
const REFRESH_TOKEN_KEY = 'curex_refresh_token'
const USER_KEY = 'curex_user'

function persistAuth(response: AuthResponse) {
  if (response.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
  }
  if (response.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
  }
  localStorage.setItem(USER_KEY, JSON.stringify(response.user))
}

function clearPersistedAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function loadPersistedUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

interface AuthState {
  user: UserInfo | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
}

const initialState: AuthState = {
  user: loadPersistedUser(),
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      const { accessToken, refreshToken, user } = action.payload
      state.user = user
      state.accessToken = accessToken
      state.refreshToken = refreshToken
      state.isLoading = false
      persistAuth(action.payload)
    },
    updateUser(state, action: PayloadAction<UserInfo>) {
      state.user = action.payload
      if (state.accessToken && state.refreshToken) {
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload))
      }
    },
    clearCredentials(state) {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isLoading = false
      clearPersistedAuth()
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setCredentials, updateUser, clearCredentials, setLoading } = authSlice.actions
export default authSlice.reducer
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY }
