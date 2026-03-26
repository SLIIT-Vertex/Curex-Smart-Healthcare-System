import { useState, useCallback, useRef } from 'react'
import { useToast } from '../store/hooks'
import { cloudinaryService } from '../services/cloudinaryService'

const ACCEPTED = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Manages browser-side Cloudinary image upload for avatar / profile photo fields.
 *
 * Returns a file-input ref, an `openPicker` trigger, the upload state, and the
 * resulting `imageUrl`. Wire the ref to a hidden `<input type="file">` element.
 *
 * @param onUploaded  Called with the secure Cloudinary URL after a successful upload.
 * @param folder      Cloudinary folder (default: curex/profiles)
 *
 * @example
 * function AvatarSection() {
 *   const [url, setUrl] = useState('')
 *   const { fileInputRef, openPicker, uploading } = useProfileImage(setUrl)
 *   return (
 *     <>
 *       <input ref={fileInputRef} type="file" className="hidden" />
 *       <button onClick={openPicker} disabled={uploading}>Change photo</button>
 *     </>
 *   )
 * }
 */
export const useProfileImage = (
  onUploaded: (url: string) => void,
  folder = 'curex/profiles',
) => {
  const { toast }                    = useToast()
  const fileInputRef                 = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]    = useState(false)

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input so the same file can be re-selected after an error
      e.target.value = ''

      if (!file.type.startsWith('image/')) {
        toast('Please select a JPG, PNG, or WebP image.', 'error')
        return
      }
      if (file.size > MAX_BYTES) {
        toast('Image must be smaller than 5 MB.', 'error')
        return
      }

      setUploading(true)
      try {
        const result = await cloudinaryService.uploadImage(file, folder)
        onUploaded(result.secure_url)
        toast('Photo uploaded successfully', 'success')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        toast(msg, 'error')
      } finally {
        setUploading(false)
      }
    },
    [onUploaded, folder, toast],
  )

  return { fileInputRef, openPicker, handleFileChange, uploading, accept: ACCEPTED }
}
