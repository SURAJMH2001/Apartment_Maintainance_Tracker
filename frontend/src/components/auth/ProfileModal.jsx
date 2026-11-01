import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { authApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Calendar, Building2, Save, X, Shield, PhoneCall } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    dob: '',
    resident_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all flats so the owner can view or link their flat
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-profile-modal'],
    queryFn: () => api.get('/api/v1/residents').then(res => res.data).catch(() => []),
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      let altPhone = '';
      if (user?.resident_id && residents.length > 0) {
        const found = residents.find(r => String(r.id) === String(user.resident_id));
        if (found?.alternate_phone) altPhone = found.alternate_phone;
      }
      setFormData({
        display_name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        alternate_phone: altPhone,
        dob: user?.dob || '',
        resident_id: user?.resident_id || ''
      });
    }
  }, [isOpen, user, residents]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await authApi.updateProfile({
        display_name: formData.display_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        alternate_phone: formData.alternate_phone.trim() || null,
        dob: formData.dob || null,
        resident_id: formData.resident_id ? Number(formData.resident_id) : null
      });

      setUser(res.data.user);
      toast.success('Profile and contact details updated successfully!');
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : 'Failed to update profile');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg shadow-inner">
              {formData.display_name?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-bold">My Profile & Contacts</h3>
              <p className="text-xs text-indigo-100">Manage your phone numbers, email, and flat mapping</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Role & Unit Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">Role:</span>
              <span className="capitalize px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-md">
                {user?.role === 'super-admin' ? 'Super Admin' : (user?.role || 'Viewer')}
              </span>
            </div>
            {user?.unit_number && (
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Unit: {user.unit_number}</span>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name / Owner Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.display_name}
                onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* Phone Numbers: Primary & Alternate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+]/g, '') })}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Phone Number
              </label>
              <div className="relative">
                <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={formData.alternate_phone}
                  onChange={e => setFormData({ ...formData, alternate_phone: e.target.value.replace(/[^0-9+]/g, '') })}
                  placeholder="Secondary / Landline"
                />
              </div>
            </div>
          </div>

          {/* Date of Birth / Age */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date of Birth / Age
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                placeholder="YYYY-MM-DD or Age e.g. 35"
              />
            </div>
          </div>

          {/* Linked Flat Unit Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Linked Flat / Unit
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                value={formData.resident_id}
                onChange={e => setFormData({ ...formData, resident_id: e.target.value })}
              >
                <option value="">-- No Flat Linked (Visitor / General) --</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.unit_number} - {r.owner_name} ({r.ownership_type || 'owner'})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select your apartment flat if you are an owner, tenant, builder, or family resident.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
