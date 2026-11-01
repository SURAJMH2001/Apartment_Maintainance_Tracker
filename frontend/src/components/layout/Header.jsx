import React, { useState } from 'react';
import { Menu, Building2, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import ProfileModal from '../auth/ProfileModal';
import { useSocietySettings } from '../../utils/useSocietySettings';

export default function Header({ setSidebarOpen }) {
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: societySettings } = useSocietySettings();
  const displayName = societySettings?.display_name || societySettings?.society_name || 'NNG and NB Association';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 shadow-xs sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 md:hidden hover:text-indigo-600 transition-colors"
            onClick={() => setSidebarOpen(true)}
            title="Open Menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {displayName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user?.unit_number && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Flat {user.unit_number}
            </span>
          )}

          {/* Profile & Contacts Button */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm group cursor-pointer"
            title="View or edit profile"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="max-w-[140px] truncate hidden md:inline">{user?.name || 'Profile'}</span>
          </button>

          {/* Sign Out Button - Icon only in right end corner */}
          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      {profileOpen && (
        <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}
