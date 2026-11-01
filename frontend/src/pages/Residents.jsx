import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/formatters';

export default function Residents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => residentsApi.getAll().then(res => res.data).catch(() => [
      { id: 1, unit_number: 'A-101', name: 'John Doe', phone: '1234567890', type: 'owner', move_in_date: '2020-01-01', status: 'active' },
      { id: 2, unit_number: 'B-202', name: 'Jane Smith', phone: '0987654321', type: 'tenant', move_in_date: '2022-05-15', status: 'overdue' }
    ])
  });

  const filtered = residents.filter(r => {
    const name = r.owner_name || r.name || '';
    const unit = r.unit_number || r.flat_number || r.unit || '';
    const phone = r.owner_phone || r.phone || '';
    const q = (search || '').toLowerCase();
    return name.toLowerCase().includes(q) || unit.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Residents</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-2 border rounded-md text-sm shadow-sm" />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium">Add Resident</button>
        </div>
      </div>
      
      {isLoading ? <Spinner /> : (
        <div className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider shadow-[1px_0_0_0_#e2e8f0]">Unit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Move-in Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/residents/${r.id}`)}>
                  <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 text-center shadow-[1px_0_0_0_#e2e8f0]">{r.unit_number || r.flat_number || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-center font-medium">{r.owner_name || r.name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{r.owner_phone || r.phone || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center capitalize">{r.ownership_type || r.type || 'owner'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{r.move_in_date ? formatDate(r.move_in_date) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge variant={r.is_active !== false && r.status !== 'overdue' ? 'success' : r.status === 'overdue' ? 'danger' : 'default'}>
                      {r.status || (r.is_active !== false ? 'active' : 'inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-indigo-600 font-medium">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
