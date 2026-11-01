/**
 * Skeleton loading components.
 * Use these wherever data is being fetched to show a shimmer placeholder
 * instead of a blank page or spinner.
 */
import React from 'react';

/** Base shimmer animation wrapper */
const shimmer = 'animate-pulse bg-slate-200 rounded';

/** Single skeleton line — configurable width and height */
export function SkeletonLine({ className = '' }) {
  return <div className={`${shimmer} h-4 ${className}`} />;
}

/** A skeleton card block (title + 3 lines) */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 p-5 space-y-3 shadow-sm ${className}`}>
      <div className={`${shimmer} h-5 w-1/3`} />
      <div className={`${shimmer} h-4 w-full`} />
      <div className={`${shimmer} h-4 w-4/5`} />
      <div className={`${shimmer} h-4 w-2/3`} />
    </div>
  );
}

/** A skeleton stat/KPI card (icon + number + label) */
export function SkeletonStat({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm ${className}`}>
      <div className={`${shimmer} h-12 w-12 rounded-xl flex-shrink-0`} />
      <div className="flex-1 space-y-2">
        <div className={`${shimmer} h-7 w-1/2`} />
        <div className={`${shimmer} h-3 w-2/3`} />
      </div>
    </div>
  );
}

/** A skeleton table row */
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`${shimmer} h-4 ${i === 0 ? 'w-20' : i === cols - 1 ? 'w-12' : 'w-full'}`} />
        </td>
      ))}
    </tr>
  );
}

/** A full skeleton table (header + N rows) */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className={`${shimmer} h-3 w-20`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A skeleton dashboard — 4 stat cards + a chart area */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
      </div>
      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className={`${shimmer} h-5 w-40 mb-4`} />
          <div className={`${shimmer} h-64 w-full`} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className={`${shimmer} h-5 w-40 mb-4`} />
          <div className={`${shimmer} h-64 w-full`} />
        </div>
      </div>
    </div>
  );
}

/** A skeleton residents / list page */
export function SkeletonList({ rows = 6, cols = 6 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="p-5 flex justify-between items-center border-b border-slate-100">
        <div className={`${shimmer} h-6 w-32`} />
        <div className={`${shimmer} h-9 w-36`} />
      </div>
      <SkeletonTable rows={rows} cols={cols} />
    </div>
  );
}

/** Mobile card skeleton */
export function SkeletonMobileCard({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-2">
          <div className="flex justify-between">
            <div className={`${shimmer} h-5 w-1/3`} />
            <div className={`${shimmer} h-5 w-16`} />
          </div>
          <div className={`${shimmer} h-4 w-1/2`} />
          <div className={`${shimmer} h-4 w-2/3`} />
        </div>
      ))}
    </div>
  );
}

/** Default export: a generic page-level loading skeleton */
export default function Skeleton({ variant = 'list', ...props }) {
  if (variant === 'dashboard') return <SkeletonDashboard />;
  if (variant === 'table') return <SkeletonTable {...props} />;
  if (variant === 'card') return <SkeletonCard {...props} />;
  if (variant === 'stat') return <SkeletonStat {...props} />;
  if (variant === 'mobile') return <SkeletonMobileCard {...props} />;
  return <SkeletonList {...props} />;
}
