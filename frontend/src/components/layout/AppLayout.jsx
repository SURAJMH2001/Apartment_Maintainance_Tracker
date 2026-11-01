import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OnboardingModal from '../auth/OnboardingModal';
import WaitingRoom from '../auth/WaitingRoom';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useSocietySettings } from '../../utils/useSocietySettings';

export default function AppLayout() {
  const { data: societySettings } = useSocietySettings();
  const displayName = societySettings?.display_name || societySettings?.society_name || 'NNG and NB Association';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('societytrack_sidebar_collapsed');
    return stored === 'false' ? false : true;
  });

  const { user, setUser, logout, token } = useAuthStore();

  // Always sync latest role, permissions, and profile from the database
  useEffect(() => {
    if (!token) return;
    authApi.getMe()
      .then(res => {
        if (res.data) {
          setUser({
            id: res.data.id,
            name: res.data.name || res.data.username,
            email: res.data.email,
            role: res.data.role,
            phone: res.data.phone,
            dob: res.data.dob,
            avatar: res.data.avatar,
            resident_id: res.data.resident_id,
            unit_number: res.data.unit_number,
            is_approved: res.data.is_approved,
            needs_onboarding: res.data.needs_onboarding
          });
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout();
        }
      });
  }, [token]);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('societytrack_sidebar_collapsed', String(next));
      return next;
    });
  };

  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-');
  const isAdmin = rawRole === 'admin' || rawRole === 'super-admin' || rawRole === 'superadmin' || rawRole === 'manager';
  
  // A resident is admitted if they are an admin or their account has is_approved === true
  const isApproved = isAdmin || Boolean(user?.is_approved);
  const needsOnboarding = Boolean(user?.needs_onboarding || (!isAdmin && !user?.resident_id));

  // If a viewer resident has not been admitted by an admin yet
  if (!isAdmin && !isApproved) {
    if (needsOnboarding) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <OnboardingModal
            isOpen={true}
            onClose={() => {
              setUser({ needs_onboarding: false });
            }}
          />
        </div>
      );
    }
    return <WaitingRoom />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        toggleCollapsed={toggleCollapsed} 
      />
      
      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <Header 
          setSidebarOpen={setSidebarOpen} 
          isCollapsed={isCollapsed} 
          toggleCollapsed={toggleCollapsed} 
        />
        
        <main className="flex-1 bg-slate-50 p-3 sm:p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Web Application Bottom Footer */}
        <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-3.5 px-6 text-center text-xs text-slate-500 font-medium">
          <span>© {new Date().getFullYear()} {displayName} • Apartment Maintenance Tracker</span>
        </footer>
      </div>
    </div>
  );
}
