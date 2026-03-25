import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '../store/hooks'
import { cloudinaryService } from '../services/cloudinaryService'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 5

export interface UploadedDoc {
  url:  string
  name: string
}

/**
 * Manages multi-file document upload to Cloudinary.
 *
 * @param initialUrls  Comma-separated URLs string from existing data
 * @param onChanged    Called with the updated comma-separated URL string
 */
export const useDocumentUpload = (
  initialUrls: string,
  onChanged: (urlsCsv: string) => void,
) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState<UploadedDoc[]>(() =>
    initialUrls
      ? initialUrls.split(',').map((u) => {
          const trimmed = u.trim()
          const name = trimmed.split('/').pop() ?? 'document'
          return { url: trimmed, name }
        })
      : [],
  )

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Sync docs → parent AFTER render (never during), avoiding the
  // "setState while rendering a different component" React error.
  // Skip the very first mount so we don't overwrite existing data.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onChanged(docs.map((d) => d.url).join(','))
  }, [docs, onChanged])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)

      // Reset now so the user can re-select the same file later.
      e.target.value = ''

      const remaining = MAX_FILES - docs.length
      if (remaining <= 0) {
        toast(`You can upload up to ${MAX_FILES} documents.`, 'error')
        return
      }

      const toUpload = fileArray.slice(0, remaining)

      for (const file of toUpload) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
        if (!ext || !allowed.includes(ext)) {
          toast(`"${file.name}" is not a supported format. Use PDF, JPG, or PNG.`, 'error')
          continue
        }
        if (file.size > MAX_BYTES) {
          toast(`"${file.name}" exceeds 5 MB limit.`, 'error')
          continue
        }

        setUploading(true)
        try {
          const result = await cloudinaryService.uploadFile(file, 'curex/documents')
          const newDoc: UploadedDoc = { url: result.secure_url, name: file.name }
          setDocs((prev) => [...prev, newDoc])
          toast(`"${file.name}" uploaded`, 'success')
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          toast(`Failed to upload "${file.name}": ${msg}`, 'error')
        } finally {
          setUploading(false)
        }
      }
    },
    [docs.length, toast],
  )

  const removeDoc = useCallback(
    (index: number) => {
      setDocs((prev) => prev.filter((_, i) => i !== index))
    },
    [],
  )

  return {
    docs,
    fileInputRef,
    openPicker,
    handleFileChange,
    removeDoc,
    uploading,
    accept: ACCEPTED,
    maxFiles: MAX_FILES,
  }
}
