import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const RoleProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  const user = useAuthStore((state) => state.user);
  const rawRole = (user?.role || 'viewer').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  const isSuperAdmin = rawRole === 'super-admin' || rawRole === 'superadmin';
  const isAdmin = isSuperAdmin || rawRole === 'admin' || rawRole === 'manager';

  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleProtectedRoute;