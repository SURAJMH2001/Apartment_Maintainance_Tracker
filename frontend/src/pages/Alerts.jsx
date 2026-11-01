import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api/alerts';
import { paymentsApi } from '../api/payments';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';
import { Bell, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function Alerts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll().then(res => res.data).catch(() => [
      { id: 1, severity: 'critical', title: 'Payment Overdue', message: 'Unit A-101 is overdue by 3 months', resident: 'John Doe', created_at: '2023-10-15', status: 'active' },
      { id: 2, severity: 'warning', title: 'Lease expiring', message: 'Unit B-202 lease expires soon', resident: 'Jane Smith', created_at: '2023-10-16', status: 'active' },
      { id: 3, severity: 'info', title: 'Welcome', message: 'New resident moved in', resident: 'Alice', created_at: '2023-10-17', status: 'resolved' }
    ])
  });

  const resolveMut = useMutation({
    mutationFn: (id) => alertsApi.resolve(id),
    onSuccess: () => { toast.success('Alert resolved'); queryClient.invalidateQueries(['alerts']); }
  });
  const checkOverdueMut = useMutation({
    mutationFn: () => paymentsApi.checkOverdue(),
    onSuccess: () => { toast.success('Checked overdue payments'); queryClient.invalidateQueries(['alerts']); }
  });

  const filtered = alerts.filter(a => {
    if (filter === 'Active') return a.status === 'active';
    if (filter === 'Resolved') return a.status === 'resolved';
    if (filter === 'Critical') return a.severity === 'critical';
    if (filter === 'Warning') return a.severity === 'warning';
    return true;
  });

  const getSeverityBadge = (sev) => {
    if (sev === 'critical') return <Badge variant="danger" className="flex gap-1 items-center"><ShieldAlert size={12}/> Critical</Badge>;
    if (sev === 'warning') return <Badge variant="warning" className="flex gap-1 items-center"><AlertTriangle size={12}/> Warning</Badge>;
    return <Badge variant="info" className="flex gap-1 items-center"><Info size={12}/> Info</Badge>;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <button onClick={() => checkOverdueMut.mutate()} disabled={checkOverdueMut.isPending} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          Check Overdue
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2 overflow-x-auto">
        {['All', 'Active', 'Resolved', 'Critical', 'Warning'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-sm font-medium rounded-full ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {f} {f === 'All' ? `(${alerts.length})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : filtered.length === 0 ? <EmptyState title="No alerts" description="Everything looks good." icon={Bell} /> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title & Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resident</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map(alert => (
                <tr key={alert.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{getSeverityBadge(alert.severity)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{alert.message}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{alert.resident || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDate(alert.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={alert.status === 'active' ? 'warning' : 'success'}>{alert.status}</Badge></td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    {alert.status === 'active' && (
                      <button onClick={() => resolveMut.mutate(alert.id)} className="text-indigo-600 hover:text-indigo-900 font-medium">Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
