import { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAuth, useToast } from '../store/hooks'
import { updateUser } from '../store/slices/authSlice'
import { userService } from '../services/userService'
import type { UserResponse, UpdateProfileRequest } from '../types/auth'

/**
 * Fetches the authenticated user's full profile on mount and provides a
 * save helper that patches only the supplied fields.
 *
 * After a successful save the Redux `auth.user` slice is updated so TopBars
 * and other consumers immediately see the new name / avatar.
 *
 * @example
 * function AdminProfile() {
 *   const { profile, loading, saving, saveProfile } = useMyProfile()
 *   // …
 * }
 */
export const useMyProfile = () => {
  const dispatch    = useAppDispatch()
  const { user }    = useAuth()
  const { toast }   = useToast()

  const [profile, setProfile]   = useState<UserResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    let cancelled = false
    userService.getMyProfile()
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  /**
   * Sends a PATCH-style update (only non-undefined keys are sent).
   * On success, updates local state and syncs key fields to Redux.
   */
  const saveProfile = useCallback(
    async (data: UpdateProfileRequest): Promise<UserResponse | null> => {
      setSaving(true)
      try {
        const updated = await userService.updateMyProfile(data)
        setProfile(updated)

        // Merge lean fields that TopBars / headers depend on into the current Redux user.
        if (user) {
          dispatch(updateUser({
            ...user,
            firstName:       updated.firstName,
            lastName:        updated.lastName,
            phoneNumber:     updated.phoneNumber,
            profileImageUrl: updated.profileImageUrl,
          }))
        }

        toast('Profile updated successfully', 'success')
        return updated
      } catch {
        toast('Failed to save profile. Please try again.', 'error')
        return null
      } finally {
        setSaving(false)
      }
    },
    [dispatch, toast],
  )

  return { profile, setProfile, loading, saving, saveProfile }
}
