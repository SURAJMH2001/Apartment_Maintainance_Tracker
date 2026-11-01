import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Car, 
  Bike, 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  MapPin, 
  User, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  ChevronUp, 
  ChevronDown, 
  Building 
} from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const sortFlats = (a, b) => {
  const valA = typeof a === 'string' ? a : (a?.unit_number || '');
  const valB = typeof b === 'string' ? b : (b?.unit_number || '');
  return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
};

const DEFAULT_FLATS = [
  'NNG-SF1', 'NNG-SF2', 'NNG-TF1', 'NNG-TF2',
  'NB-SF1', 'NB-SF2', 'NB-TF1', 'NB-TF2'
];

export default function Vehicles() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const role = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isAdminOrManager = role === 'admin' || role === 'super-admin' || role === 'superadmin' || role === 'manager';

  const [isOpen, setIsOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    resident_id: '',
    vehicle_number: '',
    vehicle_type: 'four_wheeler',
    make_model: '',
    parking_slot: ''
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => api.get('/api/v1/vehicles').then(res => res.data)
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-dropdown'],
    queryFn: () => api.get('/api/v1/residents').then(res => res.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/api/v1/vehicles', data),
    onSuccess: () => {
      toast.success('Vehicle registered successfully');
      setIsOpen(false);
      setEditingVehicle(null);
      setFormData({
        resident_id: '',
        vehicle_number: '',
        vehicle_type: 'four_wheeler',
        make_model: '',
        parking_slot: ''
      });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to add vehicle');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/api/v1/vehicles/${id}`, data),
    onSuccess: () => {
      toast.success('Vehicle updated successfully');
      setIsOpen(false);
      setEditingVehicle(null);
      setFormData({
        resident_id: '',
        vehicle_number: '',
        vehicle_type: 'four_wheeler',
        make_model: '',
        parking_slot: ''
      });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update vehicle');
    }
  });

  const openEditModal = (v) => {
    setEditingVehicle(v);
    setFormData({
      resident_id: v.resident_id || '',
      vehicle_number: v.vehicle_number || v.registration_number || '',
      vehicle_type: v.vehicle_type || 'four_wheeler',
      make_model: v.make_model || '',
      parking_slot: v.parking_slot || ''
    });
    setIsOpen(true);
  };

  const openAddModal = (defaultFlat = null) => {
    setEditingVehicle(null);
    let defaultResId = '';
    if (defaultFlat) {
      const res = residents.find(r => r.unit_number === defaultFlat);
      if (res) defaultResId = res.id;
    }
    setFormData({
      resident_id: defaultResId,
      vehicle_number: '',
      vehicle_type: 'four_wheeler',
      make_model: '',
      parking_slot: ''
    });
    setIsOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/v1/vehicles/${id}`),
    onSuccess: () => {
      toast.success('Vehicle record removed');
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete vehicle');
    }
  });

  const filteredVehicles = vehicles.filter(v => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (v.vehicle_number && v.vehicle_number.toLowerCase().includes(q)) ||
      (v.make_model && v.make_model.toLowerCase().includes(q)) ||
      (v.parking_slot && v.parking_slot.toLowerCase().includes(q)) ||
      (v.owner_name && v.owner_name.toLowerCase().includes(q)) ||
      (v.unit_number && v.unit_number.toLowerCase().includes(q))
    );
  }).sort(sortFlats);

  const [viewMode, setViewMode] = useState('accordion');
  const [expandedFlats, setExpandedFlats] = useState({});

  const toggleFlat = (flat) => {
    setExpandedFlats(prev => ({ ...prev, [flat]: !prev[flat] }));
  };

  const viewerFlat = user?.unit_number || user?.flat_number || residents.find(r => String(r.id) === String(user?.resident_id))?.unit_number;

  const allFlats = React.useMemo(() => {
    if (!isAdminOrManager) {
      if (viewerFlat) return [viewerFlat];
      const vehicleFlats = vehicles.map(v => v.unit_number).filter(Boolean);
      return Array.from(new Set(vehicleFlats)).sort(sortFlats);
    }
    return Array.from(new Set([
      ...DEFAULT_FLATS,
      ...residents.map(r => r.unit_number),
      ...vehicles.map(v => v.unit_number).filter(Boolean)
    ])).sort(sortFlats);
  }, [isAdminOrManager, viewerFlat, residents, vehicles]);

  // Auto-expand viewer's own flat
  React.useEffect(() => {
    if (!isAdminOrManager && viewerFlat) {
      setExpandedFlats({ [viewerFlat]: true });
    }
  }, [isAdminOrManager, viewerFlat]);

  const expandAll = () => {
    const exp = {};
    allFlats.forEach(f => { exp[f] = true; });
    setExpandedFlats(exp);
  };

  const collapseAll = () => {
    setExpandedFlats({});
  };

  const vehiclesByFlat = allFlats.reduce((acc, flat) => {
    acc[flat] = filteredVehicles.filter(v => v.unit_number === flat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-indigo-600" /> Vehicle Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registered resident vehicles, allocated parking slots, and security passes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('accordion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'accordion' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Flat Accordion
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table List
            </button>
          </div>
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, resident_id: user?.resident_id || '' }));
              setIsOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Register Vehicle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle number, flat, owner, slot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {viewMode === 'accordion' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={expandAll}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Expand All Flats
              </button>
              <button
                onClick={collapseAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <Spinner />
        ) : viewMode === 'accordion' ? (
          <div className="space-y-3">
            {Object.entries(vehiclesByFlat).map(([flat, fVehicles]) => {
              const isExpanded = expandedFlats[flat] || (searchTerm && fVehicles.length > 0);
              const hasVehicles = fVehicles.length > 0;
              const flatResident = residents.find(r => r.unit_number === flat);

              return (
                <div
                  key={flat}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                    hasVehicles ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-100 bg-slate-50/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFlat(flat)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs ${
                          hasVehicles
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
                              hasVehicles
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {fVehicles.length} {fVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {flatResident?.owner_name ? `Resident: ${flatResident.owner_name}` : 'Unit resident record'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1.5">
                        {fVehicles.slice(0, 2).map(v => (
                          <span
                            key={v.id}
                            className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold"
                          >
                            {v.vehicle_number}
                          </span>
                        ))}
                        {fVehicles.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{fVehicles.length - 2} more
                          </span>
                        )}
                      </div>
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      {fVehicles.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                          <Car className="w-6 h-6 text-slate-300 mb-1" />
                          No vehicles registered under flat {flat} yet.
                          <button
                            onClick={() => {
                              const resident = residents.find(r => r.unit_number === flat);
                              setFormData({
                                resident_id: resident ? resident.id : '',
                                vehicle_number: '',
                                vehicle_type: 'four_wheeler',
                                make_model: '',
                                parking_slot: ''
                              });
                              setIsOpen(true);
                            }}
                            className="mt-2 text-indigo-600 font-semibold hover:underline text-xs"
                          >
                            + Register vehicle for this flat
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {fVehicles.map(v => (
                            <div
                              key={v.id}
                              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`p-2 rounded-xl text-white ${
                                        v.vehicle_type === 'four_wheeler' ? 'bg-indigo-600' : 'bg-amber-600'
                                      }`}
                                    >
                                      {v.vehicle_type === 'four_wheeler' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <span className="font-mono font-extrabold text-sm text-slate-900 block tracking-wider">
                                        {v.vehicle_number}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        {v.make_model || 'Unspecified Model'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => openEditModal(v)}
                                      title="Edit vehicle details"
                                      className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    {isAdminOrManager && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Delete vehicle ${v.vehicle_number}?`)) {
                                            deleteMutation.mutate(v.id);
                                          }
                                        }}
                                        title="Delete vehicle record"
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Type</span>
                                    <span className="font-medium text-slate-700 capitalize">
                                      {v.vehicle_type === 'four_wheeler' ? '4-Wheeler' : '2-Wheeler'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Parking Slot</span>
                                    <span className="font-semibold text-indigo-600 flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {v.parking_slot || 'Open Area'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-2 text-[11px] text-slate-500 border-t border-slate-50 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {v.owner_name || flatResident?.owner_name || 'Resident'}
                                </span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Registered
                                </span>
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
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">
                    Flat / Resident
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vehicle Number
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Make &amp; Model
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Parking Slot
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-6 py-4 whitespace-nowrap border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <p className="text-sm font-semibold text-slate-900">{v.unit_number || 'Unknown Flat'}</p>
                      <p className="text-xs text-slate-500">{v.owner_name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-slate-800 text-center">
                      {v.vehicle_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant={v.vehicle_type === 'four_wheeler' ? 'info' : 'warning'}>
                        {v.vehicle_type === 'four_wheeler' ? '4-Wheeler (Car)' : '2-Wheeler (Bike)'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                      {v.make_model || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 text-center">
                      {v.parking_slot || 'Open Parking'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(v)}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 inline-flex items-center justify-center transition-colors"
                          title="Edit vehicle details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdminOrManager && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete vehicle ${v.vehicle_number}?`)) {
                                deleteMutation.mutate(v.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 inline-flex items-center justify-center transition-colors"
                            title="Delete vehicle record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                      No vehicles found. Click &quot;Register Vehicle&quot; to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditingVehicle(null); }} title={editingVehicle ? "Edit Vehicle Details" : "Register Resident Vehicle"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const plate = formData.vehicle_number.toUpperCase().trim();
            const payload = {
              resident_id: formData.resident_id,
              vehicle_number: plate,
              registration_number: plate,
              vehicle_type: formData.vehicle_type,
              make_model: formData.make_model,
              parking_slot: formData.parking_slot
            };
            if (editingVehicle?.id) {
              updateMutation.mutate({ id: editingVehicle.id, data: payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
          className="space-y-4 mt-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Flat / Resident <span className="text-red-500 font-bold">*</span>
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={formData.resident_id}
              onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
            >
              <option value="">-- Choose Flat --</option>
              {(isAdminOrManager ? residents : residents.filter(r => r.unit_number === viewerFlat)).map(r => (
                <option key={r.id} value={r.id}>
                  {r.unit_number} - {r.owner_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vehicle Plate No. <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KA05MC1234"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="four_wheeler">4-Wheeler (Car / SUV)</option>
                <option value="two_wheeler">2-Wheeler (Bike / Scooter)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make / Model</label>
              <input
                type="text"
                placeholder="e.g. Hyundai Creta / Honda Activa"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={formData.make_model}
                onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parking Slot No.</label>
              <input
                type="text"
                placeholder="e.g. B-04 / Ground-02"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={formData.parking_slot}
                onChange={(e) => setFormData({ ...formData, parking_slot: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Save Vehicle')}
            </button>
          </div>
        </form>
      </Modal>

      {(isAdminOrManager || user?.resident_id) && (
        <button
          type="button"
          onClick={() => {
            setFormData({
              resident_id: user?.resident_id || residents[0]?.id || '',
              vehicle_number: '',
              vehicle_type: 'four_wheeler',
              make_model: '',
              parking_slot: ''
            });
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-indigo-500/50 font-bold text-sm transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20"
          title="Register new vehicle"
        >
          <span className="text-xl leading-none font-bold">+</span>
          <span>Add Vehicle</span>
        </button>
      )}
    </div>
  );
}
