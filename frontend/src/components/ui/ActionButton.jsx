import React from 'react';
import { clsx } from 'clsx';

export default function ActionButton({ variant = 'primary', size = 'md', icon, label, onClick, danger = false, disabled = false }) {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    icon: "p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    ghost: "text-indigo-600 hover:bg-indigo-50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        danger && "text-rose-600 hover:bg-rose-50"
      )}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  );
}