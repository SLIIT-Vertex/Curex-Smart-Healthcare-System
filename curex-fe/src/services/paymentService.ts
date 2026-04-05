import api from "./axiosInstance";
import type { ApiResponse } from "../types/common.ts";

export interface CreatePaymentRequest {
  patientId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeCheckoutResponse {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  stripeSessionId: string;
  checkoutUrl: string;
}

export interface PaymentRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "COMPLETED";
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentsQuery {
  status?: string;
  patientId?: string;
  appointmentId?: string;
}

type ApiEnvelope<T> = {
  payload?: T;
  data?: T;
};

function unwrapEnvelope<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object") {
    const envelope = value as ApiEnvelope<T>;
    if (envelope.payload !== undefined) return envelope.payload;
    if (envelope.data !== undefined) return envelope.data;
  }
  return value as T;
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
  request: CreatePaymentRequest,
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

export async function getPatientPayments(patientId: string): Promise<PaymentRecord[]> {
  const { data } = await api.get<FlexibleApiResponse<PaymentRecord[]>>(
    `/api/payments/patients/${patientId}`
  )
  return unwrapApiData(data)
}

export async function getAdminPayments(query: AdminPaymentsQuery = {}): Promise<PaymentRecord[]> {
  const { data } = await api.get<FlexibleApiResponse<PaymentRecord[]>>(
    `/api/payments/admin`,
    { params: query }
  )

  return unwrapEnvelope(unwrapApiData(data))
}
