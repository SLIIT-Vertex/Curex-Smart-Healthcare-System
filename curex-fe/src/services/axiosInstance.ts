import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// TODO: JWT interceptor when auth ready
// Add request interceptor to inject Authorization: Bearer <token> from localStorage
// Add response interceptor to handle 401 (clear token, redirect to login)
// Reference: docs/DEVERLOPER_GUIDE.md § 8. JWT Authentication Flow

export default api
