import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search, Filter, Wrench, Calendar, Activity, Zap, Droplets, Wind } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-hot-toast';
import { assetsApi } from '../api/maintenance';
import { formatDate } from '../utils/formatters';

const INITIAL_ASSETS = [
  { id: 1, name: 'Elevator A', category: 'Electrical', location: 'Block 1', status: 'operational', lastService: '2023-09-15', nextService: '2023-12-15' },
  { id: 2, name: 'Main Water Pump', category: 'Plumbing', location: 'Basement', status: 'maintenance', lastService: '2023-10-01', nextService: '2023-11-01' },
  { id: 3, name: 'Backup Generator', category: 'Electrical', location: 'Rooftop', status: 'operational', lastService: '2023-08-20', nextService: '2024-02-20' },
  { id: 4, name: 'HVAC Chiller Unit', category: 'HVAC', location: 'Rooftop', status: 'critical', lastService: '2023-05-10', nextService: '2023-11-10' },
];

export default function Assets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const { data: dbAssets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.getAll().then(res => res.data).catch(() => []),
  });

  const assets = (dbAssets && dbAssets.length > 0) ? dbAssets : INITIAL_ASSETS;

  const [addFormData, setAddFormData] = useState({
    name: '', category: 'Electrical', location: '', status: 'operational', lastService: '', nextService: ''
  });
  
  const [maintFormData, setMaintFormData] = useState({
    scheduledDate: '', notes: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => assetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsAddModalOpen(false);
      toast.success('Asset added successfully');
      setAddFormData({ name: '', category: 'Electrical', location: '', status: 'operational', lastService: '', nextService: '' });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to add asset');
    }
  });

  const maintMutation = useMutation({
    mutationFn: ({ id, data }) => assetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsMaintModalOpen(false);
      toast.success('Maintenance scheduled');
      setMaintFormData({ scheduledDate: '', notes: '' });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to schedule maintenance');
    }
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'operational':
      case 'active':
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Operational</span>;
      case 'maintenance':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase">In Maintenance</span>;
      case 'critical':
        return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Needs Attention</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{status || 'Active'}</span>;
    }
  };

  const getIcon = (category) => {
    switch (category) {
      case 'Electrical': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Plumbing': return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'HVAC': return <Wind className="w-5 h-5 text-teal-500" />;
      default: return <Building2 className="w-5 h-5 text-indigo-500" />;
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: addFormData.name,
      category: addFormData.category,
      location: addFormData.location,
      status: addFormData.status || 'operational',
      last_maintenance_date: addFormData.lastService || null,
      next_maintenance_date: addFormData.nextService || null,
    });
  };

  const handleMaintSubmit = (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    maintMutation.mutate({
      id: selectedAsset.id,
      data: {
        status: 'maintenance',
        next_maintenance_date: maintFormData.scheduledDate || null,
      }
    });
  };

  const openMaintModal = (asset) => {
    setSelectedAsset(asset);
    setIsMaintModalOpen(true);
  };

  const filteredAssets = assets.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assets Management</h1>
          <p className="text-slate-500 mt-1">Track and maintain facility equipment</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md w-full sm:w-auto cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Asset
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map(asset => {
            const lastDate = asset.last_maintenance_date || asset.lastService || asset.purchase_date;
            const nextDate = asset.next_maintenance_date || asset.nextService;
            return (
              <div key={asset.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    {getIcon(asset.category)}
                  </div>
                  {getStatusBadge(asset.status)}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">{asset.name}</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">{asset.location || 'Building'} • {asset.category || 'General'}</p>
                
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Activity className="w-4 h-4" /> Last Service
                    </div>
                    <span className="font-semibold text-slate-900">{lastDate ? formatDate(lastDate) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" /> Next Due
                    </div>
                    <span className={`font-semibold ${asset.status === 'critical' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {nextDate ? formatDate(nextDate) : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => openMaintModal(asset)}
                  className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-indigo-600 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  Schedule Maintenance
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Asset">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required type="text" value={addFormData.name} onChange={e => setAddFormData({...addFormData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={addFormData.category} onChange={e => setAddFormData({...addFormData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={addFormData.status} onChange={e => setAddFormData({...addFormData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input required type="text" value={addFormData.location} onChange={e => setAddFormData({...addFormData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Service</label>
              <input required type="date" value={addFormData.lastService} onChange={e => setAddFormData({...addFormData, lastService: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Service</label>
              <input required type="date" value={addFormData.nextService} onChange={e => setAddFormData({...addFormData, nextService: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium cursor-pointer">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
              {createMutation.isPending ? 'Saving...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Maintenance Modal */}
      <Modal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} title="Schedule Maintenance">
        <form onSubmit={handleMaintSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
            <input type="text" readOnly value={selectedAsset?.name || ''} className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input required type="date" value={maintFormData.scheduledDate} onChange={e => setMaintFormData({...maintFormData, scheduledDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows="3" value={maintFormData.notes} onChange={e => setMaintFormData({...maintFormData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsMaintModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium cursor-pointer">Cancel</button>
            <button type="submit" disabled={maintMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
              {maintMutation.isPending ? 'Scheduling...' : 'Schedule Maintenance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
