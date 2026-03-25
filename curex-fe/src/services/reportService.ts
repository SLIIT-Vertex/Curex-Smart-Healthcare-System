import api from './axiosInstance'
import type { Report } from '../types/report'

const FILE_API_ROOT = '/api/files' // Changed from /api/reports

export const reportService = {
  /**
   * Upload a file with a specific category (defaults to REPORT for backward compatibility)
   */
  uploadReport: async (ownerId: string, file: File, category: string = 'REPORT'): Promise<Report> => {
    const formData = new FormData()
    formData.append('ownerId', ownerId)
    formData.append('category', category)
    formData.append('file', file)

    const response = await api.post<Report>(`${FILE_API_ROOT}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get files for a specific owner and optionally filter by category
   */
  getReportsForPatient: async (ownerId: string, category: string = 'REPORT'): Promise<Report[]> => {
    const response = await api.get<Report[]>(`${FILE_API_ROOT}/owner/${ownerId}`, {
      params: { category }
    })
    return response.data
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`${FILE_API_ROOT}/${id}`)
  },

  getReportById: async (id: string): Promise<Report> => {
    const response = await api.get<Report>(`${FILE_API_ROOT}/${id}`)
    return response.data
  },

  // Note: Download url is already available on the report object (Cloudinary url)
  getDownloadUrl: (id: string) => `${FILE_API_ROOT}/${id}/download`,
}
