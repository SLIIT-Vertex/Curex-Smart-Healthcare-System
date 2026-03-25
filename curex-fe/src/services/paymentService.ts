import api from './axiosInstance'
import type { ApiResponse } from '../types/common.ts'

export interface CreatePaymentRequest {
  patientId: string
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
}

export interface StripeCheckoutResponse {
  paymentId: string
  appointmentId: string
  patientId: string
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  stripeSessionId: string
  checkoutUrl: string
}

export interface PaymentRecord {
  id: string
  appointmentId: string
  patientId: string
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  stripePaymentIntentId?: string
  stripeSessionId?: string
  paymentMethod?: string
  createdAt: string
  updatedAt: string
}

export async function createCheckoutSession(
  appointmentId: string,
  request: CreatePaymentRequest
): Promise<StripeCheckoutResponse> {
  const { data } = await api.post<ApiResponse<StripeCheckoutResponse>>(
    `/api/payments/appointments/${appointmentId}`,
    request
  )
  return data.payload
}

export async function getPaymentDetails(id: string): Promise<PaymentRecord> {
  const { data } = await api.get<ApiResponse<PaymentRecord>>(
    `/api/payments/${id}`
  )
  return data.payload
}

export async function getPatientPayments(patientId: string): Promise<PaymentRecord[]> {
  const { data } = await api.get<ApiResponse<PaymentRecord[]>>(
    `/api/payments/patients/${patientId}`
  )
  return data.payload
}
