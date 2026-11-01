import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, Users, ArrowLeftRight, FileText, 
  CreditCard, Bell, BarChart3, ClipboardList, Settings, X,
  Building2, MessageSquare, AlertTriangle, ChevronRight, ChevronDown,
  Wrench, Calendar, Car, ShieldCheck, UserCheck, ShieldAlert,
  Sliders, Shield, IndianRupee, Store, Megaphone, UserCog,
  PanelLeftClose, PanelLeftOpen, ChevronLeft
} from 'lucide-react';
import clsx from 'clsx';
import useAuthStore from '../../store/authStore';
import { alertsApi } from '../../api/alerts';
import ProfileModal from '../auth/ProfileModal';

export default function Sidebar({ sidebarOpen, setSidebarOpen, isCollapsed, setIsCollapsed, toggleCollapsed }) {
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});

  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';
  const isSuperAdmin = rawRole === 'super-admin' || rawRole === 'superadmin';

  // Dynamic alert count (active alerts only)
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll().then(res => res.data).catch(() => []),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const activeAlertsCount = alerts.filter(a => a.status === 'active' || (!a.is_resolved && a.status !== 'resolved')).length;

  const toggleDropdown = (name) => {
    if (isCollapsed) {
      if (toggleCollapsed) toggleCollapsed();
    }
    setOpenDropdowns(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleEmptySpaceClick = (e) => {
    // If user clicked inside an interactive element, do not toggle
    if (e.target.closest('a, button, input, select, textarea, [role="button"]')) {
      return;
    }
    // Only toggle on desktop (md screen and above) where collapse exists
    if (window.innerWidth >= 768 && toggleCollapsed) {
      toggleCollapsed();
    }
  };

  const navLinkClass = ({ isActive }) => clsx(
    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    isActive 
      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
  );

  const collapsedNavLinkClass = ({ isActive }) => clsx(
    "flex items-center justify-center rounded-xl p-3 text-sm font-medium transition-all duration-200",
    isActive 
      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
      : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
  );

  const subNavLinkClass = ({ isActive }) => clsx(
    "group flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
    isActive 
      ? "bg-indigo-500/90 text-white shadow-sm" 
      : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 z-40 bg-gray-900/70 backdrop-blur-sm transition-opacity md:hidden",
          sidebarOpen ? "block" : "hidden"
        )} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      {/* Sidebar container */}
      <aside 
        onClick={handleEmptySpaceClick}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 shadow-2xl border-r border-slate-800 flex flex-col select-none",
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-72"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between px-4 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
            {!isCollapsed ? (
              <span className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                <Building2 className="w-7 h-7 text-indigo-200" />
                <span>SocietyTrack</span>
              </span>
            ) : (
              <button 
                type="button" 
                onClick={toggleCollapsed} 
                className="w-full flex justify-center text-white hover:text-indigo-200 transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <Building2 className="w-7 h-7" />
              </button>
            )}

            <div className="flex items-center gap-1">
              {/* Collapse/Expand Toggle on Desktop */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapsed && toggleCollapsed();
                }}
                className="hidden md:flex p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              {/* Mobile close */}
              <button 
                type="button" 
                className="md:hidden text-white/80 hover:text-white" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarOpen(false);
                }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Nav items */}
          <div 
            onClick={handleEmptySpaceClick}
            className="flex-1 overflow-y-auto py-5 px-3 space-y-3 flex flex-col scrollbar-thin scrollbar-thumb-slate-700"
          >
            <nav 
              className="space-y-1.5"
              onClick={(e) => {
                if (e.target.closest('a') && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
            >
              
              {/* 1. STANDALONE: Dashboard */}
              <NavLink 
                to="/dashboard" 
                className={isCollapsed ? collapsedNavLinkClass : navLinkClass}
                title="Dashboard"
              >
                {({ isActive }) => (
                  <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "")}>
                    <LayoutDashboard className={clsx("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3", isActive ? "text-white" : "text-slate-400")} />
                    {!isCollapsed && <span>Dashboard</span>}
                  </div>
                )}
              </NavLink>

              {/* 2. STANDALONE: Payments & Dues (Ungrouped directly below Dashboard for all users) */}
              <NavLink 
                to="/payments" 
                className={isCollapsed ? collapsedNavLinkClass : navLinkClass}
                title="Payments & Dues"
              >
                {({ isActive }) => (
                  <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "")}>
                    <CreditCard className={clsx("h-5 w-5 flex-shrink-0 text-emerald-400", !isCollapsed && "mr-3", isActive ? "text-white" : "")} />
                    {!isCollapsed && <span>Payments & Dues</span>}
                  </div>
                )}
              </NavLink>

              {/* 3. STANDALONE: Transactions / Passbook (ONLY for Super Admin; completely hidden for admin and viewer) */}
              {isSuperAdmin && (
                <NavLink 
                  to="/transactions" 
                  className={isCollapsed ? collapsedNavLinkClass : navLinkClass}
                  title="Transactions (Passbook)"
                >
                  {({ isActive }) => (
                    <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "")}>
                      <ArrowLeftRight className={clsx("h-5 w-5 flex-shrink-0 text-emerald-400", !isCollapsed && "mr-3", isActive ? "text-white" : "")} />
                      {!isCollapsed && <span>Transactions (Passbook)</span>}
                    </div>
                  )}
                </NavLink>
              )}

              {/* 3. GROUP: Community */}
              <div>
                {!isCollapsed ? (
                  <>
                    <button
                      onClick={() => toggleDropdown('Community')}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all"
                    >
                      <div className="flex items-center">
                        <Users className="mr-3 h-5 w-5 text-sky-400" />
                        <span>Community</span>
                      </div>
                      {openDropdowns['Community'] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                    {openDropdowns['Community'] && (
                      <div className="ml-4 mt-1 pl-2 border-l border-slate-800 space-y-1">
                        <NavLink to="/residents" className={subNavLinkClass}>
                          <Users className="mr-2.5 h-4 w-4" />
                          Residents
                        </NavLink>
                        <NavLink to="/vehicles" className={subNavLinkClass}>
                          <Car className="mr-2.5 h-4 w-4" />
                          Vehicles
                        </NavLink>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <NavLink to="/residents" className={collapsedNavLinkClass} title="Residents & Flat Directory">
                      <Users className="h-5 w-5 text-sky-400" />
                    </NavLink>
                    <NavLink to="/vehicles" className={collapsedNavLinkClass} title="Vehicle Directory">
                      <Car className="h-5 w-5 text-sky-400" />
                    </NavLink>
                  </div>
                )}
              </div>

              {/* 4. GROUP: Maintenance */}
              <div>
                {!isCollapsed ? (
                  <>
                    <button
                      onClick={() => toggleDropdown('Maintenance')}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all"
                    >
                      <div className="flex items-center">
                        <Wrench className="mr-3 h-5 w-5 text-amber-400" />
                        <span>Maintenance</span>
                      </div>
                      {openDropdowns['Maintenance'] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                    {openDropdowns['Maintenance'] && (
                      <div className="ml-4 mt-1 pl-2 border-l border-slate-800 space-y-1">
                        {isAdmin && (
                          <NavLink to="/tasks" className={subNavLinkClass}>
                            <Wrench className="mr-2.5 h-4 w-4" />
                            Tasks
                          </NavLink>
                        )}
                        <NavLink to="/schedule" className={subNavLinkClass}>
                          <Calendar className="mr-2.5 h-4 w-4" />
                          Schedule
                        </NavLink>
                        <NavLink to="/assets" className={subNavLinkClass}>
                          <Building2 className="mr-2.5 h-4 w-4" />
                          Assets
                        </NavLink>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <NavLink to="/schedule" className={collapsedNavLinkClass} title="Maintenance Schedule">
                      <Calendar className="h-5 w-5 text-amber-400" />
                    </NavLink>
                    <NavLink to="/assets" className={collapsedNavLinkClass} title="Assets & Equipment">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </NavLink>
                  </div>
                )}
              </div>

              {/* 5. STANDALONE: Report Issue */}
              <NavLink 
                to="/issues" 
                className={isCollapsed ? collapsedNavLinkClass : navLinkClass}
                title="Report Issue"
              >
                {({ isActive }) => (
                  <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "")}>
                    <AlertTriangle className={clsx("h-5 w-5 flex-shrink-0 text-amber-500", !isCollapsed && "mr-3", isActive ? "text-white" : "")} />
                    {!isCollapsed && <span>Report Issue</span>}
                  </div>
                )}
              </NavLink>

              {/* 6. STANDALONE: Feedback */}
              <NavLink 
                to="/feedback" 
                className={isCollapsed ? collapsedNavLinkClass : navLinkClass}
                title="Feedback"
              >
                {({ isActive }) => (
                  <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "")}>
                    <MessageSquare className={clsx("h-5 w-5 flex-shrink-0 text-sky-400", !isCollapsed && "mr-3", isActive ? "text-white" : "")} />
                    {!isCollapsed && <span>Feedback</span>}
                  </div>
                )}
              </NavLink>

              {/* 7. ROLE RESTRICTED GROUP: Administration (Admin & Super Admin only) */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-800/80">
                  {!isCollapsed ? (
                    <>
                      <button
                        onClick={() => toggleDropdown('Administration')}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-300 hover:bg-slate-800/80 hover:text-white transition-all"
                      >
                        <div className="flex items-center">
                          <Settings className="mr-3 h-5 w-5 text-indigo-400" />
                          <span className="font-semibold">Administration</span>
                        </div>
                        {openDropdowns['Administration'] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </button>
                      {openDropdowns['Administration'] && (
                        <div className="ml-4 mt-1 pl-2 border-l border-indigo-900/60 space-y-1">
                          <NavLink to="/roles" className={subNavLinkClass}>
                            <ShieldCheck className="mr-2.5 h-4 w-4 text-indigo-400" />
                            User & Role Management
                          </NavLink>
                          <NavLink to="/alerts" className={subNavLinkClass}>
                            <Bell className="mr-2.5 h-4 w-4 text-rose-400" />
                            <span className="flex-1">Alerts & Verification</span>
                            {activeAlertsCount > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {activeAlertsCount}
                              </span>
                            )}
                          </NavLink>
                          <NavLink to="/reports" className={subNavLinkClass}>
                            <BarChart3 className="mr-2.5 h-4 w-4 text-emerald-400" />
                            Financial Reports
                          </NavLink>
                          <NavLink to="/vendors" className={subNavLinkClass}>
                            <Store className="mr-2.5 h-4 w-4 text-sky-400" />
                            Vendor Management
                          </NavLink>
                          <NavLink to="/settings" className={subNavLinkClass}>
                            <Sliders className="mr-2.5 h-4 w-4 text-purple-400" />
                            Society & Settings
                          </NavLink>
                          <NavLink to="/audit-logs" className={subNavLinkClass}>
                            <ClipboardList className="mr-2.5 h-4 w-4 text-amber-400" />
                            Audit Logs
                          </NavLink>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <NavLink to="/roles" className={collapsedNavLinkClass} title="User Roles & Admission">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                      </NavLink>
                      <NavLink to="/alerts" className={collapsedNavLinkClass} title="Alerts & Verification">
                        <Bell className="h-5 w-5 text-rose-400" />
                      </NavLink>
                      <NavLink to="/settings" className={collapsedNavLinkClass} title="Society Settings">
                        <Sliders className="h-5 w-5 text-purple-400" />
                      </NavLink>
                    </div>
                  )}
                </div>
              )}

            </nav>

            {/* Clickable empty space to toggle sidebar */}
            <div 
              className="flex-1 min-h-[60px] cursor-pointer" 
              title={isCollapsed ? "Click empty space to expand sidebar" : "Click empty space to collapse sidebar"}
            />
          </div>
          
          {/* User Profile Footer */}
          <div className="border-t border-slate-800 p-3 bg-slate-950/60">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 text-white">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-indigo-500/20 shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate">{user?.name || 'User'}</span>
                  <span className="text-xs text-indigo-400 font-medium capitalize">
                    {user?.role === 'super-admin' ? 'Super Admin' : (user?.role || 'Viewer')}
                  </span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button 
                      onClick={() => setProfileOpen(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      Edit Profile
                    </button>
                    <span className="text-slate-600 text-xs">•</span>
                    <button onClick={logout} className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors">
                      <X className="w-3 h-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => setProfileOpen(true)}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-indigo-500/20 text-white hover:ring-indigo-400 transition-all"
                  title={`${user?.name} (${user?.role}) - Click to Edit Profile`}
                >
                  {user?.name?.charAt(0) || 'U'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {profileOpen && (
        <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}
