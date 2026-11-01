import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { authApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { Building2, Phone, Calendar, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function OnboardingModal({ isOpen, onClose }) {
  const { user, setUser, logout } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [residentId, setResidentId] = useState(user?.resident_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-onboarding'],
    queryFn: () => api.get('/api/v1/residents').then(res => res.data),
    enabled: isOpen
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!residentId) {
      toast.error('Please choose your flat unit to proceed.');
      return;
    }
    if (!phone || phone.trim().length < 8) {
      toast.error('Please enter a valid contact phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.onboarding({
        phone: phone.trim(),
        dob: dob || null,
        resident_id: Number(residentId),
        is_visitor: false
      });

      setUser({
        ...res.data.user,
        needs_onboarding: false,
        is_approved: false // awaits admin admission
      });
      toast.success('Flat allocation submitted! Please wait for admin approval.');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to submit onboarding details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-7 text-white text-center relative">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-2">
            <Sparkles className="w-8 h-8 text-amber-300" />
          </div>
          <h3 className="text-xl font-bold">Resident Flat Onboarding</h3>
          <p className="text-xs text-indigo-100 mt-1 max-w-xs mx-auto">
            Hello {user?.name || 'Resident'}, please select your flat unit and contact details to request admission into SocietyTrack.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Your Apartment / Flat <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Your Flat Unit --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.unit_number} — {r.owner_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Your maintenance bills and vehicle records will automatically be linked to this flat.
            </p>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Contact Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Date of Birth / Age */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <span>
              <strong>Admin Verification:</strong> After submitting, your application will be verified by the admin committee. You will wait in the Waiting Room until admitted.
            </span>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={logout}
              className="py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Admin Admission →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
