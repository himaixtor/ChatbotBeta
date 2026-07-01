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

export default function App() {


  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
