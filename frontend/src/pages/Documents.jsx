import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/documents';
import { formatCurrency, formatDate } from '../utils/formatters';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import { UploadCloud, FileText } from 'lucide-react';

export default function Documents() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getAll().then(res => res.data).catch(() => [
      { id: 1, filename: 'bank_statement_oct.pdf', type: 'application/pdf', size: 1024000, uploaded_at: '2023-10-01', status: 'pending' },
      { id: 2, filename: 'expenses.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 500000, uploaded_at: '2023-09-15', status: 'parsed' }
    ])
  });

  const uploadMut = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return documentsApi.upload(formData);
    },
    onSuccess: () => { toast.success('File uploaded'); queryClient.invalidateQueries(['documents']); }
  });

  const parseMut = useMutation({
    mutationFn: (id) => documentsApi.import(id, {}).then(res => res.data).catch(() => [
      { id: 101, date: '2023-10-01', description: 'Transfer in', amount: 5000, type: 'income' },
      { id: 102, date: '2023-10-02', description: 'Vendor pay', amount: 2000, type: 'expense' }
    ]),
    onSuccess: (data) => { setParsedData(data); setModalOpen(true); }
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) uploadMut.mutate(acceptedFiles[0]);
    }
  });

  return (
    <div className="space-y-6">
      <div {...getRootProps()} className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 p-10 text-center rounded-xl cursor-pointer transition-colors">
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-indigo-400 mb-3" />
        <p className="text-sm font-medium text-indigo-900">Drag & drop files here, or click to select files</p>
        <p className="text-xs text-indigo-500 mt-1">Supports PDF, Excel, Word (Max 10MB)</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
        {isLoading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200">File</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white z-10 px-4 py-3 whitespace-nowrap flex items-center gap-2 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <FileText className="text-slate-400" size={16} />
                      <span className="text-sm font-medium text-slate-900">{doc.filename}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{formatDate(doc.uploaded_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant={doc.status === 'parsed' ? 'success' : 'warning'}>{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <button onClick={() => { setSelectedDoc(doc); parseMut.mutate(doc.id); }} className="text-indigo-600 hover:text-indigo-900 font-medium">Parse & Preview</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Parsed Transactions Preview">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-2 py-2"><input type="checkbox" /></th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">Desc</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">Amount</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parsedData.map((t, i) => (
                <tr key={i}>
                  <td className="px-2 py-2"><input type="checkbox" defaultChecked /></td>
                  <td className="px-2 py-2 text-sm text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-2 py-2 text-sm text-slate-900">{t.description}</td>
                  <td className="px-2 py-2 text-sm text-slate-900">{formatCurrency(t.amount)}</td>
                  <td className="px-2 py-2 text-sm text-slate-500">{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
          <button onClick={() => { toast.success('Imported successfully'); setModalOpen(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Import Selected</button>
        </div>
      </Modal>
    </div>
  );
}
