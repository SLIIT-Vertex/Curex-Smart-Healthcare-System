export interface ApiResponse<T> {
  message: string
  payload: T
  timestamp?: string
}

export interface ApiMessageResponse {
  message: string
  timestamp?: string
}
