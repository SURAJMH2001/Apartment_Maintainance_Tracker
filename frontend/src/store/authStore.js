/**
 * Auth Store — Zustand with localStorage persistence.
 * 
 * Persistence strategy:
 *  - Uses zustand/middleware 'persist' which writes to localStorage under
 *    the key 'auth-storage'. Survives hard refresh, tab close, and browser restart.
 *  - On app load, Zustand rehydrates from localStorage automatically.
 *  - The token is sent with every API request via the axios interceptor.
 *
 * Security:
 *  - Only stores: user profile, JWT token, and isAuthenticated flag
 *  - Sensitive data (passwords, Google tokens) are NEVER stored here
 *  - logout() clears everything from memory AND localStorage
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      /** Called after successful login (both traditional and Google OAuth) */
      login: (userData, token) =>
        set({
          user: {
            id: userData.id,
            name: userData.name || userData.username,
            email: userData.email || '',
            phone: userData.phone || '',
            dob: userData.dob || '',
            role: userData.role || 'viewer',
            avatar: userData.avatar || null,
            resident_id: userData.resident_id || null,
            unit_number: userData.unit_number || null,
            is_approved: Boolean(userData.is_approved),
            needs_onboarding: Boolean(userData.needs_onboarding),
          },
          token,
          isAuthenticated: true,
        }),

      /** Update user profile (e.g., after fetching /api/v1/auth/me or onboarding) */
      setUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),

      /** Clear everything — called on logout or session expiry */
      logout: () => {
        const token = get().token;
        if (token) {
          try {
            fetch('/api/v1/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }).catch(() => {});
          } catch (e) {
            // Ignore network error on logout
          }
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      /** Helper to get current token for axios interceptor */
      getToken: () => get().token,
    }),
    {
      name: 'auth-storage',             // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these specific fields (not any transient loading states)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
