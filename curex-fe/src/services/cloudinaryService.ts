const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

export interface CloudinaryUploadResult {
  secure_url: string
  public_id:  string
  width:      number
  height:     number
  format:     string
}

/**
 * Uploads an image file directly from the browser to Cloudinary using an
 * unsigned upload preset — no API secret is exposed to the client.
 *
 * Prerequisites (one-time Cloudinary dashboard setup):
 *   Settings → Upload → Upload presets → Add preset
 *   - Name:         curex_profiles  (must match VITE_CLOUDINARY_UPLOAD_PRESET)
 *   - Signing mode: Unsigned
 *   - Folder:       curex/profiles
 *   - Allowed formats: jpg, png, webp
 *   - Max file size: 5 MB
 *
 * @param file   Image file selected by the user
 * @param folder Optional Cloudinary folder override (default: curex/profiles)
 */
export const cloudinaryService = {
  async uploadImage(
    file: File,
    folder = 'curex/profiles',
  ): Promise<CloudinaryUploadResult> {
    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', UPLOAD_PRESET)
    body.append('folder', folder)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ?? 'Image upload failed',
      )
    }

    return res.json() as Promise<CloudinaryUploadResult>
  },

  /**
   * Uploads any file (PDF, JPG, PNG, etc.) using the `raw` resource type.
   * Used for proof documents — raw ensures files are stored as-is (not
   * processed as images) so PDFs open and download correctly.
   */
  async uploadFile(
    file: File,
    folder = 'curex/documents',
  ): Promise<CloudinaryUploadResult> {
    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', UPLOAD_PRESET)
    body.append('folder', folder)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
      { method: 'POST', body },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ?? 'File upload failed',
      )
    }

    return res.json() as Promise<CloudinaryUploadResult>
  },
}

