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
  // Page access is driven by the Role table (user.permissions comes from login)
  const perms = user?.permissions || {};

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
          {perms.can_access_dashboard && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <BarChart3 size={18} />
              Dashboard
            </NavLink>
          )}
          {perms.can_view_all_chats && (
            <NavLink
              to="/chats"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <MessageSquareText size={18} />
              Chat History
            </NavLink>
          )}
          {perms.can_access_train_ai && (
            <NavLink
              to="/train-ai"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Zap size={18} />
              Train AI
            </NavLink>
          )}
          {perms.can_access_token_usage && (
            <NavLink
              to="/token-usage"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Gauge size={18} />
              Token Usage & Billing
            </NavLink>
          )}
          {perms.can_access_scheduler && (
            <NavLink
              to="/scheduler"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Clock size={18} />
              Scheduler
            </NavLink>
          )}
          {perms.can_manage_users && (
            <NavLink
              to="/users"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <UsersRound size={18} />
              User Management
            </NavLink>
          )}
          {perms.can_access_license_management && (
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
