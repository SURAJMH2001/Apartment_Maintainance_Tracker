import { create } from 'zustand';

const useRolesStore = create((set) => ({
  userRole: 'admin',
  setRole: (role) => set({ userRole: role }),
  hasPermission: (permission) => {
    const rolePermissions = {
      superAdmin: ['all'],
      admin: ['all', 'manage_residents', 'manage_tasks', 'view_reports', 'manage_vendors', 'manage_users', 'manage_settings'],
      viewer: ['view_dashboard', 'view_residents', 'view_reports']
    };
    return rolePermissions[role]?.includes('all') || rolePermissions[role]?.includes(permission);
  },
  canManage: (resource) => ['superAdmin', 'admin'].includes(useRolesStore.getState().userRole),
  canView: (resource) => ['superAdmin', 'admin', 'viewer'].includes(useRolesStore.getState().userRole)
}));

export default useRolesStore;