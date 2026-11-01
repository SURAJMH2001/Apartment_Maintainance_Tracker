import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import ResidentDetail from './pages/ResidentDetail';
import Transactions from './pages/Transactions';
import Payments from './pages/Payments';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Vendors from './pages/Vendors';
import Feedback from './pages/Feedback';
import ReportIssue from './pages/ReportIssue';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Assets from './pages/Assets';
import UserRoles from './pages/UserRoles';
import Vehicles from './pages/Vehicles';

import RoleProtectedRoute from './components/layout/RoleProtectedRoute';
import useAuthStore from './store/authStore';
import { GoogleAuthProvider } from './utils/googleAuth.jsx';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <GoogleAuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="residents" element={<Residents />} />
              <Route path="residents/:id" element={<ResidentDetail />} />
              <Route path="transactions" element={<RoleProtectedRoute superAdminOnly><Transactions /></RoleProtectedRoute>} />
              <Route path="payments" element={<Payments />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="issues" element={<ReportIssue />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="assets" element={<Assets />} />
              <Route path="vehicles" element={<Vehicles />} />

              {/* Admin-only routes */}
              <Route path="tasks" element={<RoleProtectedRoute adminOnly><Tasks /></RoleProtectedRoute>} />
              <Route path="vendors" element={<RoleProtectedRoute adminOnly><Vendors /></RoleProtectedRoute>} />
              <Route path="alerts" element={<RoleProtectedRoute adminOnly><Alerts /></RoleProtectedRoute>} />
              <Route path="reports" element={<RoleProtectedRoute adminOnly><Reports /></RoleProtectedRoute>} />
              <Route path="audit-logs" element={<RoleProtectedRoute adminOnly><AuditLogs /></RoleProtectedRoute>} />
              <Route path="settings" element={<RoleProtectedRoute adminOnly><Settings /></RoleProtectedRoute>} />
              <Route path="roles" element={<RoleProtectedRoute adminOnly><UserRoles /></RoleProtectedRoute>} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
      <Toaster position="top-right" />
    </GoogleAuthProvider>
  );
}

export default App;
