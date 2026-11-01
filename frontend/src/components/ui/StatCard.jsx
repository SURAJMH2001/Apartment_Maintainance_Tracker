import React from 'react';
import { clsx } from 'clsx';

export default function StatCard({ icon, title, value, change, changePositive = false }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 hover:scale-105 transition-transform duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {change && (
            <p className={clsx(
              "text-sm mt-2 flex items-center",
              changePositive ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {changePositive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}