import {
  BarChart3,
  Bot,
  Clock,
  LogOut,
  MessageSquareText,
  UsersRound,
  Zap,
  Gauge,
  Shield,
} from "lucide-react";

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LicenseExpiredModal from "./LicenseExpiredModal";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManageUsers =
    user?.permissions?.can_manage_users || user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="brand-icon">K</span>
          <div>
            <h2>Kirloskar Solar</h2>
            <p>Chatbot Admin</p>
          </div>
        </div>
        <nav>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <BarChart3 size={18} />
            Dashboard
          </NavLink>
          <NavLink
            to="/chats"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <MessageSquareText size={18} />
            Chat History
          </NavLink>
          
          {isSuperAdmin && (
            <NavLink
              to="/train-ai"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Zap size={18} />
              Train AI
            </NavLink>
          )}
          {(isSuperAdmin || user?.role === "admin") && (
            <NavLink
              to="/token-usage"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Gauge size={18} />
              Token Usage & Billing
            </NavLink>
          )}
          <NavLink
            to="/scheduler"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Clock size={18} />
            Scheduler
          </NavLink>
          {canManageUsers && (
            <NavLink
              to="/users"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <UsersRound size={18} />
              User Management
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink
              to="/license-management"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Shield size={18} />
              License Management
            </NavLink>
          )}
        </nav>

        <div className="user-bar">
          <Bot size={18} />
          <div className="user-meta">
            <div>{user?.name}</div>
            <div>{user?.role}</div>
          </div>
          <button
            type="button"
            className="btn-icon logout-btn"
            title="Logout"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <LicenseExpiredModal />
    </div>
  );
}
