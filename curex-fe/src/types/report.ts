export interface Report {
  id: string
  ownerId: string
  category: string
  originalFilename: string
  contentType: string
  fileSize: number
  uploadedAt: string
  downloadUrl: string
}

export interface ReportUploadResponse extends Report {}
