import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function Payments() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('2023-10');
  const [payModal, setPayModal] = useState({ open: false, payment: null });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', month],
    queryFn: () => paymentsApi.getAll({ month }).then(res => res.data).catch(() => [
      { id: 1, resident_name: 'John Doe', unit: 'A-101', due_amount: 5000, paid_amount: 5000, status: 'paid', due_date: '2023-10-05' },
      { id: 2, resident_name: 'Jane Smith', unit: 'B-202', due_amount: 6000, paid_amount: 0, status: 'overdue', due_date: '2023-10-05' },
      { id: 3, resident_name: 'Bob', unit: 'C-303', due_amount: 4000, paid_amount: 2000, status: 'partial', due_date: '2023-10-05' },
    ])
  });

  const markPaidMut = useMutation({
    mutationFn: (data) => paymentsApi.update(payModal.payment.id, data),
    onSuccess: () => { toast.success('Payment updated'); setPayModal({open: false, payment: null}); queryClient.invalidateQueries(['payments']); }
  });

  const genMut = useMutation({
    mutationFn: () => paymentsApi.generateMonthly({ month: '2023-11', amount: 5000 }),
    onSuccess: () => { toast.success('Generated monthly payments'); queryClient.invalidateQueries(['payments']); }
  });

  const totalDue = payments.reduce((acc, p) => acc + Number(p.due_amount), 0);
  const totalPaid = payments.reduce((acc, p) => acc + Number(p.paid_amount), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((acc, p) => acc + (Number(p.due_amount) - Number(p.paid_amount)), 0);

  const getStatusBadge = (s) => {
    switch(s) {
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'partial': return <Badge variant="warning">Partial</Badge>;
      case 'overdue': return <Badge variant="danger">Overdue</Badge>;
      default: return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Month:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border-slate-300 rounded-md shadow-sm text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => genMut.mutate()} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium border border-indigo-200 hover:bg-indigo-100">Generate Monthly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <p className="text-sm text-slate-500">Total Due</p><p className="text-xl font-bold">{formatCurrency(totalDue)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm text-slate-500">Collected</p><p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-amber-500">
          <p className="text-sm text-slate-500">Pending</p><p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        {isLoading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resident</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm"><p className="font-medium text-slate-900">{p.resident_name}</p><p className="text-slate-500">{p.unit}</p></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{formatCurrency(p.due_amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{formatCurrency(p.paid_amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDate(p.due_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {p.status !== 'paid' && (
                        <button onClick={() => setPayModal({open: true, payment: p})} className="text-indigo-600 hover:text-indigo-900 font-medium">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <Modal isOpen={payModal.open} onClose={() => setPayModal({open: false, payment: null})} title="Mark Payment">
        <form onSubmit={(e) => { e.preventDefault(); markPaidMut.mutate({ amount: e.target.amount.value }); }} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Amount Paid</label>
            <input type="number" name="amount" defaultValue={payModal.payment?.due_amount - payModal.payment?.paid_amount} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm px-3 py-2 border" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPayModal({open: false, payment: null})} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
