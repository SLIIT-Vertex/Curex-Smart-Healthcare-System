import { useEffect } from "react";
import { authService } from "../services/authService";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  clearCredentials,
  syncFromStorage,
  updateUser,
} from "../store/slices/authSlice";

const SESSION_VALIDATION_INTERVAL_MS = 60_000;

export const useAuthSessionSync = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    const syncStateFromStorage = () => {
      const nextAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const nextRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      let nextUser = null;
      try {
        const raw = localStorage.getItem(USER_KEY);
        nextUser = raw ? JSON.parse(raw) : null;
      } catch {
        nextUser = null;
      }

      if (!nextAccessToken || !nextUser) {
        dispatch(clearCredentials());
        return;
      }

      dispatch(
        syncFromStorage({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
          user: nextUser,
        }),
      );
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === ACCESS_TOKEN_KEY ||
        event.key === REFRESH_TOKEN_KEY ||
        event.key === USER_KEY
      ) {
        syncStateFromStorage();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!accessToken) return;

    let stopped = false;

    const validateSession = async () => {
      try {
        const profile = await authService.getProfile();
        if (!stopped) {
          dispatch(updateUser(profile));
        }
      } catch {
        // 401 and token issues are handled globally by axios interceptors.
      }
    };

    void validateSession();

    const intervalId = window.setInterval(() => {
      void validateSession();
    }, SESSION_VALIDATION_INTERVAL_MS);

    const onFocus = () => {
      void validateSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void validateSession();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [accessToken, dispatch]);
};
