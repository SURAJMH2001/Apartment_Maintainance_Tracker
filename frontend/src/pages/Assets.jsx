import React, { useState } from 'react';
import { Building2, Plus, Search, Filter, Wrench, Calendar, Activity, Zap, Droplets, Wind } from 'lucide-react';

const MOCK_ASSETS = [
  { id: 1, name: 'Elevator A', category: 'Electrical', location: 'Block 1', status: 'operational', lastService: '2023-09-15', nextService: '2023-12-15' },
  { id: 2, name: 'Main Water Pump', category: 'Plumbing', location: 'Basement', status: 'maintenance', lastService: '2023-10-01', nextService: '2023-11-01' },
  { id: 3, name: 'Backup Generator', category: 'Electrical', location: 'Rooftop', status: 'operational', lastService: '2023-08-20', nextService: '2024-02-20' },
  { id: 4, name: 'HVAC Chiller Unit', category: 'HVAC', location: 'Rooftop', status: 'critical', lastService: '2023-05-10', nextService: '2023-11-10' },
];

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'operational': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Operational</span>;
      case 'maintenance': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase">In Maintenance</span>;
      case 'critical': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Needs Attention</span>;
      default: return null;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assets Management</h1>
          <p className="text-slate-500 mt-1">Track and maintain facility equipment</p>
        </div>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {MOCK_ASSETS.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => (
          <div key={asset.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                {getIcon(asset.category)}
              </div>
              {getStatusBadge(asset.status)}
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{asset.name}</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">{asset.location} • {asset.category}</p>
            
            <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Activity className="w-4 h-4" /> Last Service
                </div>
                <span className="font-semibold text-slate-900">{new Date(asset.lastService).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" /> Next Due
                </div>
                <span className={`font-semibold ${asset.status === 'critical' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {new Date(asset.nextService).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <button className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-indigo-600 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
              <Wrench className="w-4 h-4" />
              Schedule Maintenance
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
