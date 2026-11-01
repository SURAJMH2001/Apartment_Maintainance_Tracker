import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getMonthDisplay = (ym) => {
  if (!ym) return '';
  const [yr, mo] = ym.split('-');
  const num = parseInt(mo, 10);
  const name = MONTH_NAMES[num - 1] || mo;
  return `${name}, ${yr}`;
};

export default function MonthNavigator({
  month,
  onChangeMonth,
  isAllTime = false,
  onToggleAllTime,
  showAllTime = true,
  className = ''
}) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const handlePrev = () => {
    const [yr, mo] = currentMonth.split('-').map(Number);
    let pY = yr;
    let pM = mo - 1;
    if (pM === 0) {
      pM = 12;
      pY -= 1;
    }
    const newYm = `${pY}-${String(pM).padStart(2, '0')}`;
    if (isAllTime && onToggleAllTime) onToggleAllTime(false);
    onChangeMonth(newYm);
  };

  const handleNext = () => {
    const [yr, mo] = currentMonth.split('-').map(Number);
    let nY = yr;
    let nM = mo + 1;
    if (nM === 13) {
      nM = 1;
      nY += 1;
    }
    const newYm = `${nY}-${String(nM).padStart(2, '0')}`;
    if (isAllTime && onToggleAllTime) onToggleAllTime(false);
    onChangeMonth(newYm);
  };

  const handlePickerChange = (e) => {
    if (e.target.value) {
      if (isAllTime && onToggleAllTime) onToggleAllTime(false);
      onChangeMonth(e.target.value);
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Month Navigator pill */}
      <div className={`flex items-center bg-white border rounded-xl p-1 shadow-xs transition-colors ${
        !isAllTime ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200 opacity-80'
      }`}>
        <button
          type="button"
          onClick={handlePrev}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 px-2.5">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight select-none">
            {getMonthDisplay(currentMonth)}
          </span>

          {/* Native Month Picker Overlay */}
          <div className="relative flex items-center ml-0.5">
            <input
              type="month"
              value={currentMonth}
              onChange={handlePickerChange}
              className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer z-10"
              title="Choose Month"
            />
            <button
              type="button"
              tabIndex={-1}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors pointer-events-none"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* All Time Button */}
      {showAllTime && onToggleAllTime && (
        <button
          type="button"
          onClick={() => onToggleAllTime(!isAllTime)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isAllTime
              ? 'bg-indigo-600 text-white shadow-indigo-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          All Time
        </button>
      )}
    </div>
  );
}
