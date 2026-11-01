import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import Modal from '../components/ui/Modal';
import { toast } from 'react-hot-toast';

const INITIAL_EVENTS = [
  { id: 1, title: 'Elevator Maintenance', date: new Date().toISOString(), status: 'pending', priority: 'high', category: 'Electrical' },
  { id: 2, title: 'Pool Cleaning', date: addDays(new Date(), 2).toISOString(), status: 'pending', priority: 'medium', category: 'Maintenance' },
  { id: 3, title: 'Fire Alarm Test', date: subDays(new Date(), 5).toISOString(), status: 'completed', priority: 'critical', category: 'Safety' },
  { id: 4, title: 'HVAC Inspection', date: subDays(new Date(), 1).toISOString(), status: 'overdue', priority: 'medium', category: 'HVAC' },
];

function subDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
}

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', date: '', category: 'Maintenance', status: 'pending' });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setEvents([...events, { ...formData, id: Date.now(), priority: 'medium' }]);
      setIsSubmitting(false);
      setIsModalOpen(false);
      toast.success('Task scheduled');
      setFormData({ title: '', date: '', category: 'Maintenance', status: 'pending' });
    }, 500);
  };

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Maintenance Schedule</h1>
        <p className="text-slate-500 mt-1">Visually plan and track upcoming work</p>
      </div>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="inline-flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md w-full sm:w-auto"
      >
        <Plus className="w-5 h-5" />
        Schedule Task
      </button>
    </div>
  );

  const renderControls = () => (
    <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg sm:text-xl font-bold text-slate-800">
        {format(currentDate, 'MMMM yyyy')}
      </h2>
      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={today} className="px-3 sm:px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
          Today
        </button>
        <button onClick={prevMonth} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={nextMonth} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        const dayEvents = events.filter(e => isSameDay(parseISO(e.date), cloneDay));

        days.push(
          <div
            className={`min-h-[80px] md:min-h-[120px] p-1 sm:p-2 border-r border-b border-slate-100 transition-all min-w-[80px] sm:min-w-0 ${
              !isSameMonth(day, monthStart) ? 'bg-slate-50 text-slate-400' : 
              isSameDay(day, new Date()) ? 'bg-indigo-50/30 text-indigo-700 font-bold' : 'bg-white text-slate-700'
            }`}
            key={day}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs sm:text-sm w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white' : ''}`}>
                {formattedDate}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 mt-1 sm:mt-2">
              {dayEvents.map(event => (
                <div key={event.id} className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded border font-medium truncate flex items-center gap-1 ${
                  event.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  event.status === 'overdue' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 min-w-[560px] sm:min-w-full" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-l border-t border-slate-100 rounded-b-2xl">{rows}</div>;
  };

  const renderDays = () => {
    const dateFormat = 'EEEE';
    const days = [];
    let startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="py-2 sm:py-3 text-center text-[10px] sm:text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 min-w-[80px] sm:min-w-0" key={i}>
          {format(addDays(startDate, i), dateFormat).substring(0, 3)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 bg-white rounded-t-2xl border-x border-t border-slate-100 min-w-[560px] sm:min-w-full">{days}</div>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-2">
      {renderHeader()}
      {renderControls()}
      <div className="shadow-lg shadow-slate-100/50 rounded-2xl bg-white overflow-x-auto">
        {renderDays()}
        {renderCells()}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
