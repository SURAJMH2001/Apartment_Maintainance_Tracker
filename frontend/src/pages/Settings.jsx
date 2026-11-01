import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import toast from 'react-hot-toast';
import { Building2, Sliders, Save, CheckCircle2, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Spinner from '../components/ui/Spinner';

export default function Settings() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [form, setForm] = useState({
    display_name: 'NNG and NB Association',
    society_name: 'NNG and NB Association',
    registration_number: 'SOC/2026/001',
    address: 'Nithya Nanda Gokula & Nithya Brindavan, Bengaluru',
    contact_email: 'admin@societytrack.com',
    contact_phone: '+91 9876543210',
    default_maintenance_amount: 2750,
    due_date_day: 5,
    penalty_rate: 0.02,
    grace_period_days: 5,
    nng_flats: 12,
    nb_flats: 13,
    resident_access_code: 'NNGNB2026'
  });

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.getSettings().then(res => res.data),
    enabled: isAdmin
  });

  useEffect(() => {
    if (serverSettings) {
      setForm(prev => ({
        ...prev,
        ...serverSettings
      }));
    }
  }, [serverSettings]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsApi.updateSettings(data),
    onSuccess: (res) => {
      toast.success('Society settings updated successfully and saved to DB!');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['society-settings'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update settings');
    }
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
      };
      // If updating display_name, also keep society_name in sync unless explicitly different
      if (name === 'display_name' && (!prev.society_name || prev.society_name === prev.display_name)) {
        updated.society_name = value;
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can modify society configuration.');
      return;
    }
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600" /> Society Settings &amp; Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure the society display name, official registration, billing cycles, and contacts in one central place.
          </p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Persistent Database Backed
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Society Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Society Identity &amp; Branding</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Display Name (Global Web Header, Login Page &amp; Footers) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="display_name"
                value={form.display_name || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="e.g. NNG and NB Association"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">
                Updating this single field updates the name in the header, login card, receipts, and bottom footer.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Registered Society Name
              </label>
              <input
                type="text"
                name="society_name"
                value={form.society_name || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="e.g. NNG and NB Association"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registration / Society Number
              </label>
              <input
                type="text"
                name="registration_number"
                value={form.registration_number || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="e.g. SOC/2026/001"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Address &amp; Location
              </label>
              <textarea
                rows={2}
                name="address"
                value={form.address || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="Society location / premise address"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={form.contact_email || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="admin@societytrack.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone
              </label>
              <input
                type="text"
                name="contact_phone"
                value={form.contact_phone || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Config Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Maintenance &amp; Dues Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Monthly Amount (₹)
              </label>
              <input
                type="number"
                name="default_maintenance_amount"
                value={form.default_maintenance_amount || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                name="due_date_day"
                value={form.due_date_day || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                name="grace_period_days"
                value={form.grace_period_days || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving to Database...' : 'Save All Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
