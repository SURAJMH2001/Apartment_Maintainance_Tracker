import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, ThumbsUp, Calendar, Clock, Send, Search } from 'lucide-react';
import { StatCard } from '../components/ui';
import Spinner from '../components/ui/Spinner';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Feedback() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    rating: 5,
    category: 'service',
  });

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => api.get('/api/v1/feedbacks').then(res => res.data).catch(() => []),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/api/v1/feedbacks', data),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        rating: 5,
        category: 'service',
      });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit feedback');
    }
  });

  const stats = {
    totalFeedback: feedback?.length || 0,
    averageRating: feedback?.length ? (feedback.reduce((acc, f) => acc + (f.rating || 5), 0) / feedback.length).toFixed(1) : 0,
    positive: feedback?.filter(f => (f.rating || 5) >= 4)?.length || 0,
    thisMonth: feedback?.filter(f => {
      const d = f.created_at ? new Date(f.created_at) : (f.date ? new Date(f.date) : new Date());
      return d.getMonth() === new Date().getMonth();
    })?.length || 0,
  };

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  const filteredFeedback = feedback?.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (item.name || '').toLowerCase().includes(q) ||
                          (item.subject || '').toLowerCase().includes(q) ||
                          (item.message || '').toLowerCase().includes(q);
    const matchesRating = ratingFilter === 'all' || item.rating === parseInt(ratingFilter);
    return matchesSearch && matchesRating;
  });

  const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feedback &amp; Reviews</h1>
          <p className="text-slate-500 mt-1">View and manage resident feedback</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-6 h-6 text-indigo-600" />}
          title="Total Reviews"
          value={stats.totalFeedback}
          change="This month"
        />
        <StatCard
          icon={<Star className="w-6 h-6 text-amber-600" />}
          title="Average Rating"
          value={`${stats.averageRating}/5`}
          change={`${stats.positive} positive`}
        />
        <StatCard
          icon={<ThumbsUp className="w-6 h-6 text-emerald-600" />}
          title="Positive Reviews"
          value={stats.positive}
          change={`${Math.round((stats.positive / (feedback?.length || 1)) * 100)}%`}
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-rose-600" />}
          title="This Month"
          value={stats.thisMonth}
          change="New submissions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Ratings</option>
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r} Stars</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredFeedback?.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {item.name?.charAt(0) || 'R'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500 capitalize">{item.category}</p>
                        </div>
                        <div className="ml-auto">
                          <StarRating rating={item.rating || 5} />
                        </div>
                      </div>
                      {item.subject && <h3 className="text-lg font-medium text-slate-900 mb-2">{item.subject}</h3>}
                      <p className="text-slate-600 mb-3">{item.message}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.created_at || item.date || Date.now()).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(item.created_at || item.date || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredFeedback?.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No feedback reviews found.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white">
            <h3 className="text-xl font-bold mb-4">Submit Feedback</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.name.trim() || !formData.message.trim()) {
                  toast.error('Please fill in your name and feedback message.');
                  return;
                }
                submitMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                required
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-800 text-white border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="service">Service</option>
                <option value="amenity">Amenity</option>
                <option value="maintenance">Maintenance</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
              <textarea
                required
                placeholder="Your feedback..."
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={4}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60 resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setFormData({...formData, rating: r})}
                      className={`p-1.5 rounded-lg transition-colors ${formData.rating >= r ? 'text-amber-400' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-5 h-5" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
