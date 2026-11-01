import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentsApi } from '../api/residents';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  ArrowLeft, Phone, Mail, Calendar, Building, Home, 
  Car, ShieldCheck, CreditCard, Edit3, Trash2, CheckCircle2, 
  XCircle, Plus 
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function ResidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);

  const rawRole = (currentUser?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    ownership_type: 'owner',
    move_in_date: '',
    notes: ''
  });

  // 1. Fetch Resident Details
  const { data: rawResident, isLoading: resLoad } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      const res = await residentsApi.getById(id);
      return res.data;
    }
  });

  // 2. Fetch Resident Payment History
  const { data: payments = [], isLoading: payLoad } = useQuery({
    queryKey: ['resident-payments', id],
    queryFn: async () => {
      try {
        const res = await residentsApi.getPayments(id);
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Resident payments fetch error:', err);
        return [];
      }
    }
  });

  // 3. Fetch Vehicles for this resident / flat
  const { data: allVehicles = [] } = useQuery({
    queryKey: ['all-vehicles'],
    queryFn: async () => {
      try {
        const res = await residentsApi.getVehicles();
        return Array.isArray(res.data) ? res.data : (res.data?.vehicles || []);
      } catch (err) {
        return [];
      }
    }
  });

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: () => residentsApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident active status updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to toggle status');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => residentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident profile updated successfully');
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update resident');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => residentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident profile deleted');
      navigate('/residents');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete resident');
    }
  });

  if (resLoad) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );
  }

  const res = rawResident || {};
  const residentName = res.owner_name || res.name || 'Resident';
  const unitNumber = res.unit_number || res.flat_number || '—';
  const email = res.owner_email || res.email || '';
  const phone = res.owner_phone || res.phone || '';
  const ownershipType = res.ownership_type || res.type || 'Owner';
  const isActive = res.is_active !== false;

  // Filter vehicles matching this resident or unit
  const residentVehicles = allVehicles.filter(v => 
    String(v.resident_id) === String(id) || 
    (v.flat_number && unitNumber && v.flat_number.toUpperCase() === unitNumber.toUpperCase()) ||
    (v.unit_number && unitNumber && v.unit_number.toUpperCase() === unitNumber.toUpperCase())
  );

  const openEditModal = () => {
    setEditFormData({
      owner_name: residentName,
      owner_email: email,
      owner_phone: phone,
      ownership_type: ownershipType.toLowerCase(),
      move_in_date: res.move_in_date ? res.move_in_date.split('T')[0] : '',
      notes: res.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(editFormData);
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (Number(p.paid_amount) || Number(p.due_amount) || 0), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((acc, p) => acc + (Number(p.due_amount) - (Number(p.paid_amount) || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/residents')} 
          className="flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to Residents Directory
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-100 shrink-0">
            {residentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{residentName}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                {isActive ? 'Active Resident' : 'Inactive'}
              </span>
              <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {ownershipType}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-2 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Home className="w-3.5 h-3.5 text-indigo-500" /> Flat: {unitNumber}
              </span>
              {phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`tel:${phone}`} className="hover:text-indigo-600">{phone}</a>
                </span>
              )}
              {email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${email}`} className="hover:text-indigo-600">{email}</a>
                </span>
              )}
              {res.move_in_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Move-in: {formatDate(res.move_in_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          {/* Active / Inactive Toggle */}
          <button
            onClick={() => toggleStatusMutation.mutate()}
            disabled={toggleStatusMutation.isPending}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
              isActive 
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isActive ? 'Mark Inactive' : 'Activate Resident'}
          </button>

          {/* Edit Profile */}
          <button 
            onClick={openEditModal}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>

          {/* Delete (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm(`Delete resident profile for "${residentName}" (${unitNumber})?`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Grid: Left: Allocated Vehicles | Right: Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocated Vehicles Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Registered Vehicles &amp; Parking Slots</h2>
            </div>
            <button
              onClick={() => navigate('/vehicles')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Vehicle Directory
            </button>
          </div>

          {residentVehicles.length === 0 ? (
            <div className="py-6 text-center text-slate-400 space-y-1">
              <Car className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
              <p className="text-xs font-semibold text-slate-600">No vehicles registered for flat {unitNumber}</p>
              <p className="text-[11px] text-slate-400">Resident vehicles, RFID tags, and allocated parking bays can be mapped from Vehicle Management.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {residentVehicles.map(v => (
                <div key={v.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition-all flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 font-bold shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                        {v.vehicle_number}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {v.vehicle_type || 'Vehicle'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Parking Bay: <strong className="text-slate-800">{v.parking_slot || 'General Bay'}</strong>
                    </p>
                    {v.make_model && (
                      <p className="text-[11px] text-slate-400">{v.make_model}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Dues Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl text-white space-y-4 selection:bg-indigo-500 selection:text-white">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">Maintenance Dues Status</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Total Paid (All Time):</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Outstanding Dues:</span>
              <span className="font-bold text-rose-400 font-mono text-sm">{formatCurrency(totalPending)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Total Bill Records:</span>
              <span className="font-semibold">{payments.length} Months</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/payments')}
            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span>View Society Payments Ledger</span>
          </button>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Maintenance Billing History ({payments.length})</h3>
          </div>
        </div>

        {payLoad ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No maintenance records generated for this resident yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Month</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Paid Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment Method</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 text-center font-mono">
                      {p.month}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900 text-center font-mono">
                      {formatCurrency(p.due_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-emerald-600 text-center font-mono">
                      {formatCurrency(p.paid_amount || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 text-center">
                      {p.due_date ? formatDate(p.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant={p.status === 'paid' ? 'success' : (p.status === 'partial' ? 'info' : 'warning')}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 text-center">
                      {p.payment_method || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Resident Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Resident Profile — ${unitNumber}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Resident Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.owner_name}
              onChange={e => setEditFormData({ ...editFormData, owner_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
              <input
                type="text"
                value={editFormData.owner_phone}
                onChange={e => setEditFormData({ ...editFormData, owner_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={editFormData.owner_email}
                onChange={e => setEditFormData({ ...editFormData, owner_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ownership Type</label>
              <select
                value={editFormData.ownership_type}
                onChange={e => setEditFormData({ ...editFormData, ownership_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="family">Family Member</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Move-in Date</label>
              <input
                type="date"
                value={editFormData.move_in_date}
                onChange={e => setEditFormData({ ...editFormData, move_in_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Remarks</label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
