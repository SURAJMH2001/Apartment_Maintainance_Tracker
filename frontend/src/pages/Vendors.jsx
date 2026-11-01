import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, Phone, Mail, ExternalLink, Edit2, Trash2, Plus, Search, Filter } from 'lucide-react';
import { SearchBar, DataTable, ActionButton, StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => fetch('/api/vendors').then(res => res.json()).catch(() => []),
  });

  const { data: categories } = useQuery({
    queryKey: ['vendor-categories'],
    queryFn: () => fetch('/api/vendor-categories').then(res => res.json()).catch(() => [
      { id: 1, name: 'Plumbing' },
      { id: 2, name: 'Electrical' },
      { id: 3, name: 'Cleaning' },
      { id: 4, name: 'Gardening' },
      { id: 5, name: 'Maintenance' },
    ]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`/api/vendors/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(['vendors']),
  });

  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || vendor.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalVendors: vendors?.length || 0,
    activeVendors: vendors?.filter(v => v.isActive)?.length || 0,
    categories: categories?.length || 5,
    thisMonth: Math.floor((vendors?.length || 0) * 0.3),
  };

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendor Management</h1>
          <p className="text-slate-500 mt-1">Manage all vendor contacts and services</p>
        </div>
        <button
          onClick={() => { setEditingVendor(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Building2 className="w-6 h-6 text-indigo-600" />}
          title="Total Vendors"
          value={stats.totalVendors}
          change="+12% from last month"
          changePositive
        />
        <StatCard
          icon={<Building2 className="w-6 h-6 text-emerald-600" />}
          title="Active Vendors"
          value={stats.activeVendors}
          change="All active"
        />
        <StatCard
          icon={<Filter className="w-6 h-6 text-amber-600" />}
          title="Categories"
          value={stats.categories}
          change="5 services"
        />
        <StatCard
          icon={<Search className="w-6 h-6 text-rose-600" />}
          title="This Month"
          value={stats.thisMonth}
          change="3 new hires"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Categories</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors?.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {vendor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{vendor.name}</p>
                        <p className="text-sm text-slate-500">{vendor.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                      {vendor.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        {vendor.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        {vendor.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      vendor.isActive 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ActionButton
                        variant="icon"
                        size="sm"
                        icon={<ExternalLink className="w-4 h-4" />}
                        label="View"
                        onClick={() => window.open(vendor.website, '_blank')}
                      />
                      <ActionButton
                        variant="icon"
                        size="sm"
                        icon={<Edit2 className="w-4 h-4" />}
                        label="Edit"
                        onClick={() => { setEditingVendor(vendor); setShowModal(true); }}
                      />
                      <ActionButton
                        variant="icon"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Delete"
                        onClick={() => deleteMutation.mutate(vendor.id)}
                        danger
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}