import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Star, MessageSquare, ThumbsUp, Calendar, Clock, 
  Send, Search, Sparkles, Filter, Trash2, CheckCircle2 
} from 'lucide-react';
import { StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';
import { feedbackApi } from '../api/feedback';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

import MonthNavigator, { getMonthDisplay } from '../components/ui/MonthNavigator';

export default function Feedback() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Calendar / Month Selection
  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isAllTime, setIsAllTime] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.display_name || user?.username || '',
    email: user?.email || '',
    unit: user?.unit_number || '',
    subject: '',
    message: '',
    rating: 5,
    category: 'service',
  });

  const { data: rawFeedback = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      try {
        const res = await feedbackApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.feedbacks || []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.warn('Backend feedback fetch failed:', err);
        return [];
      }
    },
  });

  const feedback = Array.isArray(rawFeedback) ? rawFeedback : [];

  const submitMutation = useMutation({
    mutationFn: (data) => feedbackApi.create(data),
    onSuccess: () => {
      toast.success('Thank you! Your feedback has been recorded in the database.');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setFormData({
        name: user?.display_name || user?.username || '',
        email: user?.email || '',
        unit: user?.unit_number || '',
        subject: '',
        message: '',
        rating: 5,
        category: 'service',
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => feedbackApi.delete(id),
    onSuccess: () => {
      toast.success('Feedback deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete feedback');
    }
  });

  // Extract available months from existing feedbacks
  const availableMonths = Array.from(new Set(
    feedback.map(f => {
      const dt = f.created_at || f.date;
      if (!dt) return null;
      return dt.slice(0, 7);
    }).filter(Boolean)
  )).sort().reverse();

  // If current month isn't in list, add it
  const currentMonthStr = getCurrentMonth();
  if (!availableMonths.includes(currentMonthStr)) {
    availableMonths.unshift(currentMonthStr);
  }

  // Filter feedback items based on selected period
  const periodFilteredFeedback = feedback.filter((item) => {
    if (isAllTime) return true;
    const itemMonth = (item.created_at || item.date || '').slice(0, 7);
    return itemMonth === selectedMonth;
  });

  // Compute stats dynamically for the selected period
  const stats = {
    totalFeedback: periodFilteredFeedback.length,
    averageRating: periodFilteredFeedback.length
      ? (periodFilteredFeedback.reduce((acc, f) => acc + (Number(f.rating) || 5), 0) / periodFilteredFeedback.length).toFixed(1)
      : '5.0',
    positive: periodFilteredFeedback.filter((f) => (Number(f.rating) || 0) >= 4).length,
    critical: periodFilteredFeedback.filter((f) => (Number(f.rating) || 0) <= 2).length,
  };

  // Search & rating filter applied to period items
  const displayedFeedback = periodFilteredFeedback.filter((item) => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.unit || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || Number(item.rating) === parseInt(ratingFilter);
    const matchesCategory = categoryFilter === 'all' || (item.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesRating && matchesCategory;
  });

  const formatPeriodLabel = () => {
    if (isAllTime) return 'All Time';
    return getMonthDisplay(selectedMonth);
  };

  const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 sm:w-5 sm:h-5 ${
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" /> Feedback &amp; Reviews
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Resident opinions, amenities reviews, and association satisfaction metrics fetched live from database.
          </p>
        </div>

        {/* Month Navigator with All Time Toggle */}
        <MonthNavigator
          month={selectedMonth}
          onChangeMonth={setSelectedMonth}
          isAllTime={isAllTime}
          onToggleAllTime={setIsAllTime}
        />
      </div>

      {/* Metric Cards - Recalculated for Selected Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-indigo-600" />}
          title={`Total Reviews (${formatPeriodLabel()})`}
          value={stats.totalFeedback}
          change={isAllTime ? 'All historical reviews' : `Specific to ${formatPeriodLabel()}`}
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
          title="Average Rating"
          value={`${stats.averageRating} / 5`}
          change={`${stats.positive} satisfied residents`}
        />
        <StatCard
          icon={<ThumbsUp className="w-5 h-5 text-emerald-600" />}
          title="Satisfaction Rate"
          value={`${stats.totalFeedback ? Math.round((stats.positive / stats.totalFeedback) * 100) : 100}%`}
          change="4★ and 5★ ratings"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          title="Period Filter"
          value={formatPeriodLabel()}
          change={`${periodFilteredFeedback.length} logs in period`}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Search and Filters Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search reviews by name, unit, subject, keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="service">Service</option>
                    <option value="amenity">Amenity</option>
                    <option value="security">Security</option>
                  </select>

                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </div>

              {selectedMonth !== 'all' && (
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <span>Filtered to: <strong>{formatMonthLabel(selectedMonth)}</strong> ({displayedFeedback.length} matching)</span>
                  <button
                    onClick={() => setSelectedMonth('all')}
                    className="text-indigo-600 hover:text-indigo-800 underline ml-2"
                  >
                    Reset to All Time
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Spinner />
              </div>
            ) : displayedFeedback.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
                <p className="font-semibold text-slate-600">No feedback found for {formatMonthLabel(selectedMonth)}</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting another month or submitting the first review on the right.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedFeedback.map((item) => (
                  <div key={item.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {(item.name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                              {item.unit && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md border border-indigo-100">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 capitalize">
                              Category: {item.category || 'General'}
                            </span>
                          </div>
                          <div className="ml-auto flex items-center gap-3">
                            <StarRating rating={Number(item.rating) || 5} />
                            {(isAdmin || (user?.email && item.email === user.email)) && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this feedback review?')) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                title="Delete review"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-semibold text-slate-800 mt-2 mb-1">
                          {item.subject}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                          {item.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-medium text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {new Date(item.created_at || item.date || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(item.created_at || item.date || Date.now()).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-2xl shadow-xl text-white border border-indigo-500/20 relative overflow-hidden">
            {/* Glow Orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold">Leave Your Feedback</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5">
              Help us improve society facilities, vendor services, and community operations.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.message.trim()) {
                  toast.error('Please enter your feedback message.');
                  return;
                }
                submitMutation.mutate(formData);
              }}
              className="space-y-3.5 text-slate-800"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1">
                    Flat / Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NNG-101"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  >
                    <option value="service">Service</option>
                    <option value="amenity">Amenity</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1">
                  Message
                </label>
                <textarea
                  required
                  placeholder="Share your detailed feedback or suggestion..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-200 uppercase mb-1.5">
                  Your Rating
                </label>
                <div className="flex items-center gap-1.5 bg-white/10 p-2 rounded-xl border border-white/15">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setFormData({ ...formData, rating: r })}
                      className="p-1 text-slate-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          formData.rating >= r
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-white/20 hover:text-white/40'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-auto text-xs font-bold text-amber-300 pr-2">
                    {formData.rating} / 5 Stars
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Post Feedback'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
