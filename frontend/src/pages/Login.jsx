import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { GoogleAuthButton } from '../utils/googleAuth';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCheck, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useSocietySettings } from '../utils/useSocietySettings';

export default function Login() {
  const [activeTab, setActiveTab] = useState('resident'); // 'resident' | 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const { data: societySettings } = useSocietySettings();
  const displayName = societySettings?.display_name || societySettings?.society_name || 'NNG and NB Association';

  // Subtle 3D card tilt effect following mouse
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget.getBoundingClientRect();
    const centerX = card.left + card.width / 2;
    const centerY = card.top + card.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const rotateY = (mouseX / (card.width / 2)) * 6;
    const rotateX = -(mouseY / (card.height / 2)) * 6;
    setCardTilt({ x: rotateX, y: rotateY });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ x: 0, y: 0 });
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      const response = await authApi.login(formData);
      const userData = response.data?.user || { name: username, role: 'admin' };
      login(userData, response.data.access_token);
      toast.success(`Welcome back, ${userData.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err?.response?.data?.detail || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080c18] overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Ambient Cyber Orbs and Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-10 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Centered Login Card */}
      <div
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
        className="relative z-10 w-full max-w-md my-auto"
      >
        {/* Card Outer Glow Border */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/20 via-indigo-500/20 to-cyan-500/30 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="bg-slate-900/85 rounded-3xl p-7 sm:p-9 backdrop-blur-xl border border-white/10 text-white relative overflow-hidden">
            {/* Ambient card interior highlight */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header Content */}
            <div className="text-center relative z-10">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                {displayName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Apartment Maintenance Tracker
              </p>

              {/* Login Mode Switcher Pills */}
              <div className="flex bg-slate-950/70 p-1.5 rounded-2xl mt-5 border border-white/10 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('resident');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'resident'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Resident Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Login
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-950/60 text-rose-300 text-xs text-center rounded-xl border border-rose-500/30 font-medium backdrop-blur-md">
                {error}
              </div>
            )}

            {/* TAB 1: RESIDENT SIGN IN */}
            {activeTab === 'resident' && (
              <div className="space-y-5 pt-5 relative z-10">
                <p className="text-xs sm:text-sm text-slate-300 font-medium text-center">
                  Sign in with your Google account to view maintenance dues and payment receipts.
                </p>

                {/* Google Sign In Button Container */}
                <div className="flex flex-col items-center justify-center py-1 gap-2">
                  <div className="p-1 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-white/20 to-cyan-500/30 shadow-xl shadow-indigo-500/10 hover:shadow-cyan-500/20 transition-all duration-300">
                    <GoogleAuthButton />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-medium"
                  >
                    Society Committee / Admin? <span className="text-indigo-400 font-semibold underline underline-offset-2">Sign in here</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ADMIN / SUPER ADMIN LOGIN */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="space-y-4 pt-5 relative z-10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Admin Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or superadmin"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('resident')}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-medium"
                  >
                    Back to <span className="text-indigo-400 font-semibold underline underline-offset-2">Resident Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500 z-10">
        <span>© {new Date().getFullYear()} {displayName}</span>
      </footer>
    </div>
  );
}
