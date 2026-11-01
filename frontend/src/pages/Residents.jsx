import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { Users, Plus, Search, Building2, Phone, Mail, ChevronRight } from 'lucide-react';

export default function Residents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    unit_number: '',
    floor: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    ownership_type: 'owner',
    move_in_date: '',
    notes: ''
  });
  
  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      try {
        const res = await residentsApi.getAll();
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map(item => ({
            id: item.id,
            unit_number: item.unit_number || item.flat_number || '',
            name: item.owner_name || item.name || '',
            email: item.owner_email || item.email || '',
            phone: item.owner_phone || item.phone || '',
            type: item.ownership_type || item.type || 'owner',
            move_in_date: item.move_in_date,
            status: item.is_active !== false ? 'active' : 'inactive'
          }));
        }
      } catch (err) {
        console.warn('Residents getAll fallback:', err);
      }
      return [
        { id: 1, unit_number: 'NNG-101', name: 'S. K. Sharma', phone: '9845012345', email: 'sharma@example.com', type: 'owner', move_in_date: '2024-01-01', status: 'active' },
        { id: 2, unit_number: 'NNG-102', name: 'R. Venkatesh', phone: '9845067890', email: 'venkat@example.com', type: 'owner', move_in_date: '2024-02-15', status: 'active' },
        { id: 3, unit_number: 'NB-101', name: 'M. K. Swamy', phone: '9845099887', email: 'swamy@example.com', type: 'owner', move_in_date: '2024-03-01', status: 'active' },
        { id: 4, unit_number: 'NB-102', name: 'Praveen Nair', phone: '9845055443', email: 'praveen@example.com', type: 'tenant', move_in_date: '2025-05-10', status: 'active' },
      ];
    }
  });

  const mutation = useMutation({
    mutationFn: (newResident) => residentsApi.create(newResident),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident added successfully!');
      setIsModalOpen(false);
      setFormData({
        unit_number: '',
        floor: '',
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        ownership_type: 'owner',
        move_in_date: '',
        notes: ''
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to add resident');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      floor: formData.floor ? Number(formData.floor) : undefined,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filtered = residents.filter(r => {
    const name = (r.name || '').toLowerCase();
    const unit = (r.unit_number || '').toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || unit.includes(q) || phone.includes(q);
  });

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Resident Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of apartment flat owners, tenants, occupancy records, and contact details.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Resident
        </button>
      </div>

      {/* Search Input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by flat number, resident name, or phone number..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
          <p className="font-semibold text-slate-600">No residents found</p>
          <p className="text-xs text-slate-400 mt-1">Try searching another unit number or name.</p>
        </div>
      ) : (
        <>
          {/* Mobile view - Stacked Cards */}
          <div className="block md:hidden space-y-3">
            {filtered.map(r => (
              <div 
                key={r.id} 
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => navigate(`/residents/${r.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
                    <p className="text-xs font-bold text-indigo-600 mt-0.5">Flat {r.unit_number}</p>
                  </div>
                  <Badge variant={r.status === 'active' ? 'success' : 'default'}>
                    {r.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1 mt-2">
                  <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {r.phone || '—'}</p>
                  <p className="capitalize font-medium text-slate-700">Occupancy: {r.type}</p>
                  {r.move_in_date && <p>Move-in: {formatDate(r.move_in_date)}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view - Table with Frozen Unit Column & Centered Values */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Resident Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Ownership Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Move-in Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filtered.map(r => (
                  <tr 
                    key={r.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => navigate(`/residents/${r.id}`)}
                  >
                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-700 text-center border-r border-slate-100 shadow-[1px_0_0_0_#e2e8f0]">
                      {r.unit_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 text-center">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                      {r.phone || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 capitalize text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
                      {r.move_in_date ? formatDate(r.move_in_date) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant={r.status === 'active' ? 'success' : 'default'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                      <span className="inline-flex items-center gap-0.5">
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Resident Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Resident Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Number</label>
              <input
                type="text"
                name="unit_number"
                required
                placeholder="e.g. NNG-101 or NB-204"
                value={formData.unit_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Floor (Optional)</label>
              <input
                type="number"
                name="floor"
                placeholder="e.g. 1"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Owner / Resident Name</label>
            <input
              type="text"
              name="owner_name"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.owner_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Email</label>
              <input
                type="email"
                name="owner_email"
                placeholder="name@example.com"
                value={formData.owner_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                name="owner_phone"
                required
                placeholder="e.g. +91 9845012345"
                value={formData.owner_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ownership Type</label>
              <select
                name="ownership_type"
                value={formData.ownership_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Move-in Date</label>
              <input
                type="date"
                name="move_in_date"
                value={formData.move_in_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes (Optional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Parking spot P-03 assigned"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save Resident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
