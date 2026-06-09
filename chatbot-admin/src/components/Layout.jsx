import { BarChart3, Bot, Clock, LogOut, MessageSquareText, UsersRound } from 'lucide-react';

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { user, logout } = useAuth();
  const canManageUsers = user?.permissions?.can_manage_users || user?.role === 'admin';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="brand-icon">A</span>
          <div>
            <h2>Aixtor Bot</h2>
            <p>Solar assistant</p>
          </div>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            <BarChart3 size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/chats" className={({ isActive }) => (isActive ? 'active' : '')}>
            <MessageSquareText size={18} />
            Chat History
          </NavLink>
          <NavLink
            to="/scheduler"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Clock size={18} />
            Scheduler
          </NavLink>
          {canManageUsers && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
              <UsersRound size={18} />
              User Management
            </NavLink>
          )}
        </nav>

        <div className="user-bar">
          <Bot size={18} />
          <div className="user-meta">
            <div>{user?.name}</div>
            <div>{user?.role}</div>
          </div>
          <button type="button" className="btn-icon logout-btn" title="Logout" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
