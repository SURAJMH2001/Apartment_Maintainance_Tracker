import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { 
  Users, Plus, Search, Building2, Building, Phone, Mail, 
  ChevronRight, ChevronDown, ChevronUp, LayoutGrid, List,
  CreditCard, Calendar, User, Home, CheckCircle2, Car, Trash2 
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const sortFlats = (a, b) => {
  const valA = typeof a === 'string' ? a : (a?.unit_number || '');
  const valB = typeof b === 'string' ? b : (b?.unit_number || '');
  return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
};

const DEFAULT_FLATS = [
  'NB-GF1', 'NB-GF2', 'NB-FF1', 'NB-FF2', 'NB-FF3', 'NB-SF1', 'NB-SF2', 'NB-TF1', 'NB-TF2',
  'NNG-GF1', 'NNG-GF2', 'NNG-FF1', 'NNG-FF2', 'NNG-FF3', 'NNG-SF1', 'NNG-SF2', 'NNG-TF1', 'NNG-TF2'
];

export default function Residents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('accordion'); // 'accordion' | 'list'
  const [expandedFlats, setExpandedFlats] = useState({});
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
  
  const currentUser = useAuthStore(state => state.user);
  const rawRole = (currentUser?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const { data: rawResidents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      try {
        const res = await residentsApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.residents || []);
        return list.map(item => ({
          id: item.id,
          unit_number: item.unit_number || item.flat_number || '',
          name: item.owner_name || item.name || '',
          email: item.owner_email || item.email || '',
          phone: item.owner_phone || item.phone || '',
          type: item.ownership_type || item.type || 'owner',
          move_in_date: item.move_in_date,
          status: item.is_active !== false ? 'active' : 'inactive',
          floor: item.floor,
          notes: item.notes
        }));
      } catch (err) {
        console.warn('Residents getAll error:', err);
        return [];
      }
    }
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      try {
        const res = await residentsApi.getVehicles();
        return Array.isArray(res.data) ? res.data : (res.data?.vehicles || []);
      } catch {
        return [];
      }
    }
  });

  const residents = Array.isArray(rawResidents) ? rawResidents : [];

  const getVehiclesForResident = (r) => {
    return allVehicles.filter(v => 
      String(v.resident_id) === String(r.id) ||
      (v.flat_number && r.unit_number && v.flat_number.toUpperCase() === r.unit_number.toUpperCase()) ||
      (v.unit_number && r.unit_number && v.unit_number.toUpperCase() === r.unit_number.toUpperCase())
    );
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => residentsApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident active status updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update status');
    }
  });

  const deleteResidentMutation = useMutation({
    mutationFn: (id) => residentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Resident profile deleted successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete resident');
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
    if (!formData.unit_number.trim() || !formData.owner_name.trim()) {
      toast.error('Please enter both unit number and owner name.');
      return;
    }
    mutation.mutate({
      ...formData,
      floor: formData.floor ? Number(formData.floor) : undefined,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Filtered residents list
  const filteredResidents = residents.filter(r => {
    const name = (r.name || '').toLowerCase();
    const unit = (r.unit_number || '').toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || unit.includes(q) || phone.includes(q);
  }).sort(sortFlats);

  // All distinct flats across society
  const allFlats = Array.from(new Set([
    ...DEFAULT_FLATS,
    ...residents.map(r => r.unit_number).filter(Boolean)
  ])).sort(sortFlats);

  const residentsByFlat = allFlats.reduce((acc, flat) => {
    acc[flat] = filteredResidents.filter(r => r.unit_number === flat);
    return acc;
  }, {});

  const toggleFlat = (flat) => {
    setExpandedFlats(prev => ({ ...prev, [flat]: !prev[flat] }));
  };

  const expandAll = () => {
    const exp = {};
    allFlats.forEach(f => { exp[f] = true; });
    setExpandedFlats(exp);
  };

  const collapseAll = () => {
    setExpandedFlats({});
  };

  const openAddModalForFlat = (flat = '') => {
    setFormData({
      unit_number: flat,
      floor: '',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      ownership_type: 'owner',
      move_in_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Resident Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of apartment flat owners, tenants, occupancy records, and contact details.
          </p>
        </div>

        {/* View Toggle & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('accordion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'accordion' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Flat Accordion
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table List
            </button>
          </div>

          <button 
            onClick={() => openAddModalForFlat()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Resident
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-4">
        {/* Search Bar Row with Expand/Collapse buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by flat number, resident name, or phone number..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          {viewMode === 'accordion' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Expand All Flats
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* View Mode 1: Flat Accordion (Identical to Vehicle Management UX) */}
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : viewMode === 'accordion' ? (
          <div className="space-y-3 pt-2">
            {Object.entries(residentsByFlat).map(([flat, fResidents]) => {
              const hasResidents = fResidents.length > 0;
              const isExpanded = expandedFlats[flat] || (search && hasResidents);
              const primaryResident = fResidents[0];

              return (
                <div
                  key={flat}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                    hasResidents ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-100 bg-slate-50/40'
                  }`}
                >
                  {/* Accordion Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleFlat(flat)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs ${
                          hasResidents
                            ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 tracking-tight">{flat}</span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              hasResidents
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {fResidents.length} {fResidents.length === 1 ? 'Resident' : 'Residents'}
                          </span>
                          {primaryResident && (
                            <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {primaryResident.type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {primaryResident?.name 
                            ? `Resident: ${primaryResident.name}` 
                            : 'No active resident registered for this flat'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {primaryResident?.phone && (
                        <div className="hidden sm:flex items-center gap-1 font-mono text-xs text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {primaryResident.phone}
                        </div>
                      )}
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Accordion Body Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      {fResidents.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                          <Home className="w-6 h-6 text-slate-300 mb-1" />
                          No resident profile registered under flat {flat} yet.
                          <button
                            type="button"
                            onClick={() => openAddModalForFlat(flat)}
                            className="mt-2 text-indigo-600 font-semibold hover:underline text-xs"
                          >
                            + Register resident for flat {flat}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fResidents.map((r) => (
                            <div 
                              key={r.id} 
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStatusMutation.mutate(r.id);
                                      }}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                        r.status === 'active' 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700' 
                                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                      title="Click to toggle active/inactive status"
                                    >
                                      {r.status === 'active' ? '● Active' : '○ Inactive'}
                                    </button>
                                  </div>
                                  <p className="text-xs text-indigo-600 font-semibold capitalize mt-0.5">
                                    Occupancy: {r.type}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                                    {r.unit_number}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete resident profile for "${r.name}" (${r.unit_number})?`)) {
                                          deleteResidentMutation.mutate(r.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete resident"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Registered Vehicles Badge Display */}
                              {(() => {
                                const rVehicles = getVehiclesForResident(r);
                                return rVehicles.length > 0 ? (
                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                                    <Car className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    {rVehicles.map(v => (
                                      <span key={v.id} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {v.vehicle_number} {v.parking_slot ? `(${v.parking_slot})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-400">
                                    <Car className="w-3.5 h-3.5 opacity-40 shrink-0" />
                                    <span>0 registered vehicles</span>
                                  </div>
                                );
                              })()}

                              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                {r.phone && (
                                  <p className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono">{r.phone}</span>
                                  </p>
                                )}
                                {r.email && (
                                  <p className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{r.email}</span>
                                  </p>
                                )}
                                {r.move_in_date && (
                                  <p className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Move-in: {formatDate(r.move_in_date)}</span>
                                  </p>
                                )}
                              </div>

                              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/residents/${r.id}`)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                >
                                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate('/payments')}
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" /> Dues Ledger
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Table List (Tabular View with sticky reference column) */
          <div className="pt-2">
            {filteredResidents.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="font-semibold text-slate-600">No residents found</p>
                <p className="text-xs text-slate-400 mt-1">Try searching another unit number or resident name.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                        Vehicles
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Move-in Date
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status (Click to Toggle)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredResidents.map(r => {
                      const rVehicles = getVehiclesForResident(r);
                      return (
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center font-mono">
                            {r.phone || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 capitalize text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                              {r.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-center font-mono">
                            {rVehicles.length > 0 ? (
                              <div className="flex items-center justify-center gap-1 flex-wrap max-w-xs mx-auto">
                                <Car className="w-3.5 h-3.5 text-indigo-500" />
                                {rVehicles.map(v => (
                                  <span key={v.id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold border border-indigo-100">
                                    {v.vehicle_number}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
                            {r.move_in_date ? formatDate(r.move_in_date) : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatusMutation.mutate(r.id);
                              }}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                                r.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              title="Click to toggle status"
                            >
                              {r.status === 'active' ? '● Active' : '○ Inactive'}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-semibold">
                            <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => navigate(`/residents/${r.id}`)}
                                className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                              >
                                View Profile <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete resident profile for "${r.name}" (${r.unit_number})?`)) {
                                      deleteResidentMutation.mutate(r.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                  title="Delete resident"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Resident Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Resident Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unit_number"
                required
                placeholder="e.g. NB-FF1 or NNG-GF2"
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
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Owner / Resident Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="owner_name"
              required
              placeholder="e.g. SUBRAMANYA KASHYAP H B"
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
