import axios from 'axios'
import type { ApiResponse } from '../types/common.ts'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export interface CreatePaymentRequest {
  patientId: string
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
}

export interface StripeCheckoutResponse {
  sessionId: string
  checkoutUrl: string
}

export interface PaymentRecord {
  id: string
  appointmentId: string
  patientId: string
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  stripePaymentIntentId?: string
  stripeCheckoutSessionId?: string
  createdAt: string
  updatedAt: string
}

export async function createCheckoutSession(
  appointmentId: string,
  request: CreatePaymentRequest
): Promise<StripeCheckoutResponse> {
  const response = await axios.post<ApiResponse<StripeCheckoutResponse>>(
    `${API_BASE_URL}/payments/appointments/${appointmentId}`,
    request
  )
  return response.data.payload
}

export async function getPaymentDetails(id: string): Promise<PaymentRecord> {
  const response = await axios.get<ApiResponse<PaymentRecord>>(
    `${API_BASE_URL}/payments/${id}`
  )
  return response.data.payload
}

export async function getPatientPayments(patientId: string): Promise<PaymentRecord[]> {
  const response = await axios.get<ApiResponse<PaymentRecord[]>>(
    `${API_BASE_URL}/patients/${patientId}/payments`
  )
  return response.data.payload
}
