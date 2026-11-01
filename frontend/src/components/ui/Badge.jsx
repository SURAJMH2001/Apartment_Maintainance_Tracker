import React from 'react';
import clsx from 'clsx';

const variants = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  default: 'bg-slate-100 text-slate-700',
};

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ring-slate-500/10", variants[variant] || variants.default, className)}>
      {children}
    </span>
  );
}
