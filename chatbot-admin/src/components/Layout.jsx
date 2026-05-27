import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>Chatbot Admin</h2>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/chats" className={({ isActive }) => (isActive ? 'active' : '')}>
            Chat History
          </NavLink>
        </nav>
        <div className="user-bar">
          <div>{user?.name}</div>
          <div>{user?.role}</div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={logout}>
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
