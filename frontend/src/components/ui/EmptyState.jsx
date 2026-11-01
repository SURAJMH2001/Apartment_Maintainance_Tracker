import React from 'react';
import { FileQuestion } from 'lucide-react';
export default function EmptyState({ title, description, icon: Icon = FileQuestion }) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-slate-400" />
      <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
