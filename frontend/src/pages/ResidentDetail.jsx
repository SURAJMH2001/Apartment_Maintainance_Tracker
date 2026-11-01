import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { residentsApi } from '../api/residents';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ArrowLeft } from 'lucide-react';

export default function ResidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: res, isLoading: resLoad } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => residentsApi.getById(id).then(res => res.data).catch(() => ({
      id, unit_number: 'A-101', name: 'John Doe', phone: '1234567890', email: 'john@example.com', type: 'owner', move_in_date: '2020-01-01'
    }))
  });

  const { data: payments = [], isLoading: payLoad } = useQuery({
    queryKey: ['resident-payments', id],
    queryFn: () => residentsApi.getPayments(id).then(res => res.data).catch(() => [
      { id: 1, month: '2023-10', due_amount: 5000, paid_amount: 5000, status: 'paid', due_date: '2023-10-05' }
    ])
  });

  if (resLoad) return <div className="p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/residents')} className="flex items-center text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16} className="mr-1"/> Back to Residents</button>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{res.name}</h2>
            <Badge variant="info">{res.type}</Badge>
          </div>
          <p className="text-slate-500">Unit: <span className="font-medium text-slate-900">{res.unit_number}</span></p>
          <p className="text-slate-500">Email: {res.email} | Phone: {res.phone}</p>
          <p className="text-slate-500">Move-in: {formatDate(res.move_in_date)}</p>
        </div>
        <button className="px-4 py-2 border rounded-md text-sm font-medium">Edit</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-medium mb-4">Payment History</h3>
        {payLoad ? <Spinner /> : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{p.month}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{formatCurrency(p.due_amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{formatCurrency(p.paid_amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
