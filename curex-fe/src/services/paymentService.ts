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

type FlexibleApiResponse<T> = ApiResponse<T> & { data?: T }

function unwrapApiData<T>(response: FlexibleApiResponse<T>): T {
  const value = response.payload ?? response.data
  if (value === undefined || value === null) {
    throw new Error('Invalid API response: missing payload/data')
  }
  return value
}

export async function createCheckoutSession(
  appointmentId: string,
  request: CreatePaymentRequest
): Promise<StripeCheckoutResponse> {
  const { data } = await api.post<FlexibleApiResponse<StripeCheckoutResponse>>(
    `/api/payments/appointments/${appointmentId}`,
    request
  )
  return unwrapApiData(data)
}

export async function getPaymentDetails(id: string): Promise<PaymentRecord> {
  const { data } = await api.get<FlexibleApiResponse<PaymentRecord>>(
    `/api/payments/${id}`
  )
  return unwrapApiData(data)
}

export async function confirmPayment(id: string): Promise<PaymentRecord> {
  const { data } = await api.post<FlexibleApiResponse<PaymentRecord>>(
    `/api/payments/${id}/confirm`
  )
  return unwrapApiData(data)
}

export async function getPatientPayments(patientId: string): Promise<PaymentRecord[]> {
  const { data } = await api.get<FlexibleApiResponse<PaymentRecord[]>>(
    `/api/payments/patients/${patientId}`
  )
  const records = unwrapApiData(data)
  return Array.isArray(records) ? records : []
}
