import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chats from './pages/Chats';
import UserManagement from './pages/UserManagement';
import SchedulerJobs from './pages/SchedulerJobs';
import TrainAI from './pages/TrainAI';
import TokenUsage from './pages/TokenUsage';
import LicenseActivation from './pages/LicenseActivation';
import LicenseManagement from './pages/LicenseManagement';
import ReadUpdateLicenseFile from './pages/ReadUpdateLicenseFile';
import LicenseExpiryWarning from './components/LicenseExpiryWarning';

export default function App() {


  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route - login */}
          <Route path="/login" element={<Login />} />

          {/* Licensed route - license activation (needs auth but not license) */}
          <Route path="/license-activation" element={<ProtectedRoute forceShow="license-activation"><LicenseActivation /></ProtectedRoute>} />

          {/* Debug route - license file reader/updater (Super Admin only, hidden from menu, no license required) */}
          <Route path="/read-update-license-file" element={<ProtectedRoute forceShow="read-update-license-file"><ReadUpdateLicenseFile /></ProtectedRoute>} />

          {/* Protected routes - need license */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chats" element={<Chats />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="scheduler" element={<SchedulerJobs />} />
            <Route path="train-ai" element={<TrainAI />} />
            <Route path="token-usage" element={<TokenUsage />} />
            <Route path="license-management" element={<LicenseManagement />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <LicenseExpiryWarning />
      </BrowserRouter>
    </AuthProvider>
  );
}
