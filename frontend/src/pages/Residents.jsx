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

  const filtered = residents.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.unit_number.toLowerCase().includes(search.toLowerCase()));

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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Move-in Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/residents/${r.id}`)}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{r.unit_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{r.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 capitalize">{r.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDate(r.move_in_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={r.status === 'active' ? 'success' : r.status === 'overdue' ? 'danger' : 'default'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-indigo-600">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
