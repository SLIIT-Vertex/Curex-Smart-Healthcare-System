export interface Report {
  id: string
  patientId: string
  originalFilename: string
  contentType: string
  fileSize: number
  uploadedAt: string
  downloadUrl: string
}

export interface ReportUploadResponse extends Report {}
