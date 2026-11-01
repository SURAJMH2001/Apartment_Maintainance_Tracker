import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Phone, Mail, ExternalLink, Edit2, Trash2, 
  Plus, Search, Filter, Wrench, ShieldCheck, CheckCircle2, X 
} from 'lucide-react';
import { StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { vendorsApi } from '../api/vendors';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function Vendors() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Maintenance',
    contact: '',
    phone: '',
    email: '',
    service: '',
    is_active: true
  });

  const categories = [
    { id: 1, name: 'Elevator & AMC' },
    { id: 2, name: 'Electrical' },
    { id: 3, name: 'Plumbing & Water' },
    { id: 4, name: 'Housekeeping & Cleaning' },
    { id: 5, name: 'Security & CCTV' },
    { id: 6, name: 'Gardening & Landscaping' },
    { id: 7, name: 'Maintenance' },
  ];

  const { data: rawVendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const res = await vendorsApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.vendors || []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Vendors fetch failed:', err);
        return [];
      }
    },
  });

  const vendors = Array.isArray(rawVendors) ? rawVendors : [];

  const createOrUpdateMutation = useMutation({
    mutationFn: (data) => {
      if (editingVendor?.id) {
        return vendorsApi.update(editingVendor.id, data);
      }
      return vendorsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(editingVendor ? 'Vendor updated successfully!' : 'Vendor added successfully!');
      setShowModal(false);
      setEditingVendor(null);
      setFormData({
        name: '',
        category: 'Maintenance',
        contact: '',
        phone: '',
        email: '',
        service: '',
        is_active: true
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to save vendor');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete vendor');
    }
  });

  const openAddModal = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      category: 'Maintenance',
      contact: '',
      phone: '',
      email: '',
      service: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      category: vendor.category || 'Maintenance',
      contact: vendor.contact || vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      service: vendor.service || '',
      is_active: vendor.is_active !== false
    });
    setShowModal(true);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter vendor name');
      return;
    }
    createOrUpdateMutation.mutate(formData);
  };

  const filteredVendors = vendors.filter(vendor => {
    const name = (vendor.name || '').toLowerCase();
    const contact = (vendor.contact || vendor.contact_person || '').toLowerCase();
    const category = (vendor.category || '').toLowerCase();
    const service = (vendor.service || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = name.includes(q) || contact.includes(q) || category.includes(q) || service.includes(q);
    const matchesFilter = filterCategory === 'all' || (vendor.category || '').toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.is_active !== false).length,
    categoriesCount: new Set(vendors.map(v => v.category)).size || categories.length,
    serviceContracts: vendors.filter(v => (v.category || '').toLowerCase().includes('amc')).length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" /> Vendor Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Directory of approved AMC contractors, plumbers, electricians, and facility service providers.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Building2 className="w-5 h-5 text-indigo-600" />}
          title="Total Vendors"
          value={stats.totalVendors}
          change="Contracted partners"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          title="Active Vendors"
          value={stats.activeVendors}
          change="Available on call"
        />
        <StatCard
          icon={<Filter className="w-5 h-5 text-amber-600" />}
          title="Categories"
          value={stats.categoriesCount}
          change="Services covered"
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
          title="AMC Contracts"
          value={stats.serviceContracts}
          change="Annual maintenance"
        />
      </div>

      {/* Main Vendor Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden space-y-4">
        {/* Search & Filter Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by vendor name, contact person, phone, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
            <p className="font-semibold text-slate-600">No vendors found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your search query or add a new vendor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    Vendor Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone &amp; Email
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
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                    {/* Sticky Name Column */}
                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-3 whitespace-nowrap text-center border-r border-slate-100 shadow-[1px_0_0_0_#e2e8f0]">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                          {(vendor.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900 text-sm">{vendor.name}</p>
                          {vendor.service && (
                            <p className="text-[11px] text-slate-500 max-w-[180px] truncate">{vendor.service}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {vendor.category || 'Maintenance'}
                      </span>
                    </td>

                    {/* Contact Person */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center font-medium">
                      {vendor.contact || vendor.contact_person || '—'}
                    </td>

                    {/* Phone & Email */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="inline-flex flex-col items-center text-xs text-slate-600 space-y-0.5">
                        {vendor.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {vendor.phone}
                          </span>
                        )}
                        {vendor.email && (
                          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {vendor.email}
                          </span>
                        )}
                        {!vendor.phone && !vendor.email && <span>—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        vendor.is_active !== false 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {vendor.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Vendor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
                                deleteMutation.mutate(vendor.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingVendor ? 'Edit Vendor Information' : 'Add New Vendor'}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Vendor / Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Otis Elevator AMC"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 9845012345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="contact@agency.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Service Description / Scope
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Monthly lift servicing, emergency breakdowns, oil filter maintenance"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_vendor"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active_vendor" className="text-xs font-medium text-slate-700">
              Active Vendor (contract currently ongoing)
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrUpdateMutation.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {createOrUpdateMutation.isPending ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
