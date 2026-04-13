import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import toastReducer from './slices/toastSlice'
import registerReducer from './slices/registerSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    register: registerReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

