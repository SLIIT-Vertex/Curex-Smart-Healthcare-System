import api from './axiosInstance'
import type { Report } from '../types/report'

const REPORT_API_ROOT = '/api/reports'

export const reportService = {
  uploadReport: async (patientId: string, file: File): Promise<Report> => {
    const formData = new FormData()
    formData.append('patientId', patientId)
    formData.append('file', file)

    const response = await api.post<Report>(`${REPORT_API_ROOT}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getReportsForPatient: async (patientId: string): Promise<Report[]> => {
    const response = await api.get<Report[]>(`${REPORT_API_ROOT}/patient/${patientId}`)
    return response.data
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`${REPORT_API_ROOT}/${id}`)
  },

  getReportById: async (id: string): Promise<Report> => {
    const response = await api.get<Report>(`${REPORT_API_ROOT}/${id}`)
    return response.data
  },

  // Note: Download url is already available on the report object (Cloudinary url)
  getDownloadUrl: (id: string) => `${REPORT_API_ROOT}/${id}/download`,
}
