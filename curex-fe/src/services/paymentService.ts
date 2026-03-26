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

export async function createCheckoutSession(
  appointmentId: string,
  request: CreatePaymentRequest,
): Promise<StripeCheckoutResponse> {
  const { data } = await api.post<ApiResponse<StripeCheckoutResponse>>(
    `/api/payments/appointments/${appointmentId}`,
    request,
  );
  return data.payload;
}

export async function getPaymentDetails(id: string): Promise<PaymentRecord> {
  const { data } = await api.get<ApiResponse<PaymentRecord>>(
    `/api/payments/${id}`,
  );
  return data.payload;
}

export async function getPatientPayments(
  patientId: string,
): Promise<PaymentRecord[]> {
  const { data } = await api.get<ApiResponse<PaymentRecord[]>>(
    `/api/payments/patients/${patientId}`,
  );
  return data.payload;
}

export async function getAdminPayments(
  params: AdminPaymentsQuery = {},
): Promise<PaymentRecord[]> {
  const { data } = await api.get<
    | ApiResponse<PaymentRecord[]>
    | ApiEnvelope<PaymentRecord[]>
    | PaymentRecord[]
  >("/api/payments/admin", { params });
  const payload = unwrapEnvelope<PaymentRecord[] | PaymentRecord>(data);
  return Array.isArray(payload) ? payload : [];
}

export async function confirmPayment(id: string): Promise<PaymentRecord> {
  const { data } = await api.post<
    ApiResponse<PaymentRecord> | ApiEnvelope<PaymentRecord>
  >(`/api/payments/${id}/confirm`);
  return unwrapEnvelope<PaymentRecord>(data);
}
