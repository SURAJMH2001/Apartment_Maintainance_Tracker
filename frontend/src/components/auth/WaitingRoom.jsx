import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { Clock, ShieldCheck, Building2, RefreshCw, LogOut, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

export default function WaitingRoom() {
  const { user, setUser, logout } = useAuthStore();
  const [accessCode, setAccessCode] = useState('');

  // Auto-poll approval status every 10 seconds
  const { isFetching, refetch } = useQuery({
    queryKey: ['check-approval-status'],
    queryFn: async () => {
      const res = await authApi.getMe();
      if (res.data?.is_approved) {
        const userId = res.data.id || user?.id;
        const notifiedKey = `societytrack_admitted_notified_${userId}`;
        const alreadyNotified = localStorage.getItem(notifiedKey);
        setUser(res.data);
        if (!alreadyNotified) {
          localStorage.setItem(notifiedKey, 'true');
          toast.success('Congratulations! You have been successfully admitted to the society portal.', { duration: 6000 });
        }
      }
      return res.data;
    },
    refetchInterval: 10000,
    staleTime: 5000
  });

  const claimCodeMut = useMutation({
    mutationFn: (code) => authApi.claimAccessCode(code),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Access code verified! Welcome to SocietyTrack.');
      const userId = res.data?.user?.id || user?.id;
      if (userId) {
        localStorage.setItem(`societytrack_admitted_notified_${userId}`, 'true');
      }
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        refetch();
      }
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Invalid access code. Please try again.';
      toast.error(msg);
    }
  });

  const handleClaimCode = (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    claimCodeMut.mutate(accessCode.trim());
  };

  const handleManualCheck = async () => {
    try {
      const res = await refetch();
      if (res.data?.is_approved) {
        const userId = res.data.id || user?.id;
        const notifiedKey = `societytrack_admitted_notified_${userId}`;
        const alreadyNotified = localStorage.getItem(notifiedKey);
        setUser(res.data);
        if (!alreadyNotified) {
          localStorage.setItem(notifiedKey, 'true');
          toast.success('Welcome! You have been successfully admitted to the society portal.');
        }
      } else {
        toast('Your application is still pending review by the society management committee.', {
          icon: '⏳'
        });
      }
    } catch {
      toast.error('Could not verify status. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
            <Clock className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Resident Waiting Room</h2>
          <p className="text-indigo-100 text-xs mt-1.5 max-w-xs mx-auto">
            NNG & NB Apartment Society Community Portal
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              Awaiting Admin Admission
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Welcome, {user?.name || user?.username}!
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Your flat allocation request for <strong className="text-slate-800">Unit {user?.unit_number || 'Selected Flat'}</strong> has been submitted. For safety and society verification, an administrator must admit you before you can view the portal.
            </p>
          </div>

          {/* Instant Access Code Bypass Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/90 p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Have a Society Access Code?</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" /> Fast-Track
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              If the committee or admin gave you the society resident access code, enter it below to bypass waiting and enter immediately.
            </p>
            <form onSubmit={handleClaimCode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Access Code (e.g. NNGNB2026)"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={claimCodeMut.isPending || !accessCode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                {claimCodeMut.isPending ? 'Verifying...' : 'Admit Me'}
              </button>
            </form>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Requested Flat / Unit:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {user?.unit_number || 'Pending Assignment'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Registered Name:</span>
              <span className="font-semibold text-slate-800">{user?.name || user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Email Address:</span>
              <span className="font-semibold text-slate-800">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Contact Phone:</span>
                <span className="font-semibold text-slate-800">{user?.phone}</span>
              </div>
            )}
          </div>

          {/* Notice info */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Admin Notification Sent:</strong> Society managers review new flat submissions regularly. This screen will automatically refresh and grant you viewer access once you are admitted.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleManualCheck}
              disabled={isFetching}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
