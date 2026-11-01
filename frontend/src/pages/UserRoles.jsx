import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import Badge from '../components/ui/Badge';
import { SkeletonList } from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCheck, ShieldAlert, Plus, Trash2, Mail, CheckCircle2, Clock, AlertCircle, KeyRound, Copy, Check, Search, Filter, ArrowUpDown, Lock } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function UserRoles() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const isCurrentUserSuperAdmin = currentUser?.role === 'super-admin' || currentUser?.role === 'superadmin';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    unit_number: ''
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/api/v1/users').then(res => res.data)
  });

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (roleFilter !== 'all') {
      list = list.filter(u => u.role === roleFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(u => 
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.flat_number || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      list.sort((a, b) => {
        let va = '';
        let vb = '';
        if (sortCol === 'name') {
          va = (a.display_name || a.username || '').toLowerCase();
          vb = (b.display_name || b.username || '').toLowerCase();
        } else if (sortCol === 'email') {
          va = (a.email || '').toLowerCase();
          vb = (b.email || '').toLowerCase();
        } else if (sortCol === 'flat') {
          va = (a.flat_number || '').toLowerCase();
          vb = (b.flat_number || '').toLowerCase();
        } else if (sortCol === 'role') {
          va = (a.role || '').toLowerCase();
          vb = (b.role || '').toLowerCase();
        } else if (sortCol === 'admission') {
          va = a.is_approved ? 1 : 0;
          vb = b.is_approved ? 1 : 0;
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [users, roleFilter, searchTerm, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortHeader = ({ label, col, align = 'left' }) => {
    const isActive = sortCol === col;
    return (
      <th 
        onClick={() => handleSort(col)}
        className={`px-6 py-3.5 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/80 select-none group transition-colors`}
        title={`Sort by ${label}`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`text-[10px] transition-opacity ${isActive ? 'text-indigo-600 font-bold opacity-100' : 'opacity-25 group-hover:opacity-75'}`}>
            {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
          </span>
        </div>
      </th>
    );
  };

  const { data: accessCodeData } = useQuery({
    queryKey: ['resident-access-code'],
    queryFn: () => api.get('/api/v1/users/access-code').then(res => res.data).catch(() => ({ access_code: 'NNGNB2026' }))
  });

  const updateCodeMut = useMutation({
    mutationFn: (newCode) => api.put('/api/v1/users/access-code', { access_code: newCode }),
    onSuccess: () => {
      toast.success('Resident fast-track access code updated!');
      queryClient.invalidateQueries({ queryKey: ['resident-access-code'] });
      setEditingCode(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update access code');
    }
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-dropdown'],
    queryFn: () => api.get('/api/v1/residents').then(res => res.data)
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, newRole }) => api.put(`/api/v1/users/${userId}/role?new_role=${newRole}`, { role: newRole, new_role: newRole }),
    onSuccess: (data, vars) => {
      toast.success(`User role updated to ${vars.newRole} successfully`);
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      if (vars.userId === currentUser?.id) {
        setUser({ role: vars.newRole });
      }
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ') : (detail?.msg || 'Failed to update role'));
      toast.error(msg);
    }
  });

  const approveUserMut = useMutation({
    mutationFn: ({ userId, approve }) => api.put(`/api/v1/users/${userId}/approve?approve=${approve}`),
    onSuccess: (_, vars) => {
      toast.success(vars.approve ? 'Resident admitted into portal!' : 'Resident admission revoked');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update admission status');
    }
  });

  const createUserMut = useMutation({
    mutationFn: (userData) => api.post('/api/v1/users', userData),
    onSuccess: () => {
      toast.success('User created successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'viewer', unit_number: '' });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to create user');
    }
  });

  const deleteUserMut = useMutation({
    mutationFn: (userId) => api.delete(`/api/v1/users/${userId}`),
    onSuccess: () => {
      toast.success('User removed');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete user');
    }
  });

  const updateFlatMut = useMutation({
    mutationFn: ({ userId, residentId }) => api.put(`/api/v1/users/${userId}/flat`, { resident_id: residentId ? Number(residentId) : null }),
    onSuccess: () => {
      toast.success('Flat unit allotted successfully');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to allot flat');
    }
  });

  const handleFlatChange = (userId, resId) => {
    updateFlatMut.mutate({ userId, residentId: resId });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super-admin':
        return <Badge variant="danger">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="warning">Admin</Badge>;
      case 'manager':
        return <Badge variant="info">Manager</Badge>;
      default:
        return <Badge variant="default">Resident (Viewer)</Badge>;
    }
  };

  const handleRoleChange = (userId, newRole) => {
    updateRoleMut.mutate({ userId, newRole });
  };

  const pendingAdmissions = users.filter(u => u.role === 'viewer' && !u.is_approved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" /> Role-Based Access Control & Resident Admission
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage user accounts, admit residents from the Waiting Room, and map apartment flat units.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Resident Fast-Track Access Code Configuration Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl border border-indigo-900/50 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Resident Fast-Track Access Code</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                Bypass Waiting Room
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Share this code with known society residents. When entered in the Waiting Room, it grants instant admin-equivalent approval so known owners/tenants don't have to wait.
            </p>
          </div>
        </div>

        {/* Code display / edit */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/80">
          {editingCode ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCodeInput}
                onChange={e => setNewCodeInput(e.target.value)}
                placeholder="Enter new code..."
                className="px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-indigo-500 rounded-lg text-white focus:outline-none uppercase w-36"
              />
              <button
                onClick={() => updateCodeMut.mutate(newCodeInput.trim())}
                disabled={updateCodeMut.isPending || !newCodeInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingCode(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="px-3 py-1 font-mono font-black text-sm tracking-wider text-indigo-300 bg-indigo-950/60 rounded-lg border border-indigo-800/60">
                {accessCodeData?.access_code || 'NNGNB2026'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(accessCodeData?.access_code || 'NNGNB2026');
                  setCopiedCode(true);
                  toast.success('Access code copied to clipboard!');
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Copy Access Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setNewCodeInput(accessCodeData?.access_code || 'NNGNB2026');
                  setEditingCode(true);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-lg transition-colors border border-indigo-500/30"
              >
                Change Code
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Admissions Alert Banner */}
      {pendingAdmissions.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {pendingAdmissions.length} Resident{pendingAdmissions.length > 1 ? 's' : ''} in Waiting Room
              </h3>
              <p className="text-xs text-amber-700">
                These residents have requested flat allocation and are awaiting your committee admission to enter the portal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingAdmissions.map(p => (
              <button
                key={p.id}
                onClick={() => approveUserMut.mutate({ userId: p.id, approve: true })}
                disabled={approveUserMut.isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Admit {p.display_name || p.username} ({p.flat_number || 'Flat'})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              User Accounts & Privileges
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
              {filteredUsers.length} of {users.length} Users
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="super-admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer (Resident)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user, email, flat..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6"><SkeletonList /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <SortHeader label="User" col="name" />
                  <SortHeader label="Email & Contact" col="email" />
                  <SortHeader label="Allot / Map Flat Unit" col="flat" />
                  <SortHeader label="Portal Admission" col="admission" />
                  <SortHeader label="Current Role" col="role" />
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Role</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No users found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isTargetSuperAdmin = u.role === 'super-admin' || u.role === 'superadmin';
                    return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {(u.display_name || u.username)?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-slate-900">{u.display_name || u.username}</p>
                          <p className="text-xs text-slate-400">@{u.username} • ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.resident_id || ''}
                          disabled={isTargetSuperAdmin && u.id !== currentUser?.id}
                          onChange={(e) => handleFlatChange(u.id, e.target.value)}
                          className={`text-xs font-medium border rounded-lg px-2.5 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isTargetSuperAdmin && u.id !== currentUser?.id ? 'opacity-70 cursor-not-allowed ' : ''
                          }${
                            u.resident_id ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' : 'bg-amber-50/50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <option value="">⚠️ Not Mapped (Visitor / Staff)</option>
                          {residents.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.unit_number} — {r.owner_name}
                            </option>
                          ))}
                        </select>
                        {u.flat_number && (
                          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ {u.flat_number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Portal Admission Status & Control */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {u.role === 'viewer' ? (
                        u.is_approved ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Admitted
                            </span>
                            <button
                              onClick={() => approveUserMut.mutate({ userId: u.id, approve: false })}
                              className="text-[11px] text-slate-400 hover:text-rose-600 underline"
                              title="Revoke portal access and send back to waiting room"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" /> Waiting Room
                            </span>
                            <button
                              onClick={() => approveUserMut.mutate({ userId: u.id, approve: true })}
                              disabled={approveUserMut.isPending}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                              title="Admit resident to society portal"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Admit
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Staff Access
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isTargetSuperAdmin ? (
                        <div 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 cursor-not-allowed select-none"
                          title="Protected: Super Admin access cannot be changed by any user (admin or super admin)"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Protected</span>
                        </div>
                      ) : (
                        <select
                          value={u.role}
                          disabled={u.id === currentUser?.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="viewer">Viewer (Resident)</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          {isCurrentUserSuperAdmin && <option value="super-admin">Super Admin</option>}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {isTargetSuperAdmin ? (
                        <span 
                          className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium px-2 py-1 rounded-md bg-slate-50 border border-slate-200 cursor-not-allowed"
                          title="Super Admin user cannot be deleted"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          Protected
                        </span>
                      ) : u.id !== currentUser?.id ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove user ${u.display_name || u.username}?`)) {
                              deleteUserMut.mutate(u.id);
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                    );
                  }))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New User Account">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMut.mutate(formData);
          }}
          className="space-y-4 mt-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="viewer">Viewer (Resident)</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                {isCurrentUserSuperAdmin && <option value="super-admin">Super Admin</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Associated Flat</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={formData.unit_number}
                onChange={e => setFormData({ ...formData, unit_number: e.target.value })}
              >
                <option value="">-- No flat (Admin/Staff) --</option>
                {residents.map(r => (
                  <option key={r.id} value={r.unit_number}>
                    {r.unit_number} - {r.owner_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUserMut.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              {createUserMut.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
