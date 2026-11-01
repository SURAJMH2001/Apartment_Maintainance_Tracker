/**
 * Google OAuth integration.
 * Flow:
 *  1. User clicks "Continue with Google" → Google popup appears
 *  2. Google returns a credential (JWT id_token) to our onSuccess callback
 *  3. We POST that token to our backend /api/v1/auth/google
 *  4. Backend verifies it with Google's servers, creates/updates user in DB,
 *     returns OUR OWN JWT (access_token) + user info
 *  5. We store our JWT in Zustand persist (localStorage) — NEVER store Google's token
 *  6. Navigate to /dashboard
 *
 * Security notes:
 *  - Google's id_token is only sent to our backend once, never stored client-side
 *  - We verify it server-side using google-auth library
 *  - All subsequent API calls use our own JWT
 */
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const GoogleAuthButton = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1$/, '').replace(/\/$/, '');
      const res = await fetch(
        `${baseUrl}/api/v1/auth/google`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: credentialResponse.credential }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Google authentication failed');
      }

      const data = await res.json();

      // Store our own JWT + full user profile — NOT the Google token
      login(
        {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          dob: data.user.dob,
          role: data.user.role,
          avatar: data.user.avatar,
          resident_id: data.user.resident_id,
          unit_number: data.user.unit_number,
          needs_onboarding: data.needs_onboarding,
        },
        data.access_token
      );

      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Google auth error:', err);
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    toast.error('Google sign-in was cancelled or failed.');
  };

  const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID';

  if (!isConfigured) {
    return (
      <div className="w-full text-center p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 bg-slate-50">
        Google Login not configured.{' '}
        <span className="text-xs">
          Add <code className="bg-slate-200 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to .env
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-3 text-sm text-slate-500">
        <svg className="animate-spin h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Signing you in...
      </div>
    );
  }

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap={false}
      width={300}
      theme="filled_black"
      size="large"
      shape="rectangular"
      text="continue_with"
    />
  );
};

export const GoogleAuthProvider = ({ children }) => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    return <>{children}</>;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
};