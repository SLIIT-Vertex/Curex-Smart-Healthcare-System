import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

interface ToastState {
  items: ToastItem[]
}

const initialState: ToastState = { items: [] }

let _counter = 0

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast(
      state,
      action: PayloadAction<Omit<ToastItem, 'id'> & { id?: string }>,
    ) {
      const id = action.payload.id ?? `toast-${++_counter}`
      state.items.push({ ...action.payload, id })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload)
    },
    clearAllToasts(state) {
      state.items = []
    },
  },
})

export const { addToast, removeToast, clearAllToasts } = toastSlice.actions
export default toastSlice.reducer
