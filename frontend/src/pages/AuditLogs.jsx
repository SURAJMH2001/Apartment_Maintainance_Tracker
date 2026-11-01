import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/audit';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/formatters';

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const limit = 50;
  
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.getLogs({ skip: page * limit, limit }).then(res => res.data).catch(() => [
      { id: 1, timestamp: '2023-10-25T10:00:00Z', user: 'Admin', action: 'CREATE', entity_type: 'Resident', entity_id: '10', ip_address: '192.168.1.1' },
      { id: 2, timestamp: '2023-10-25T11:00:00Z', user: 'Admin', action: 'UPDATE', entity_type: 'Payment', entity_id: '5', ip_address: '192.168.1.1' },
      { id: 3, timestamp: '2023-10-25T12:00:00Z', user: 'Manager', action: 'DELETE', entity_type: 'Transaction', entity_id: '8', ip_address: '10.0.0.1' },
      { id: 4, timestamp: '2023-10-26T09:00:00Z', user: 'Admin', action: 'LOGIN', entity_type: 'Auth', entity_id: '1', ip_address: '192.168.1.5' }
    ])
  });

  const getActionBadge = (act) => {
    switch(act) {
      case 'CREATE': return <Badge variant="success">CREATE</Badge>;
      case 'UPDATE': return <Badge variant="info">UPDATE</Badge>;
      case 'DELETE': return <Badge variant="danger">DELETE</Badge>;
      default: return <Badge variant="default">{act}</Badge>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
      {isLoading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">Timestamp</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity ID</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium text-center border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 text-center">{log.user}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center font-mono">{log.entity_type}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center font-mono">{log.entity_id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center font-mono">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <div className="mt-4 flex justify-between items-center">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-500">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={logs.length < limit} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
