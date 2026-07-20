import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './LicenseNotActivated.css';

export default function LicenseNotActivated() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="license-not-activated-container">
      <div className="license-not-activated-card">
        <div className="icon-container">
          <span className="icon">🔒</span>
        </div>

        <h1>License Not Activated</h1>

        <p className="message">
          The platform license has not been activated yet.
        </p>

        <p className="submessage">
          {user?.role === 'Super Admin'
            ? 'Please fill out the license activation form to continue.'
            : 'Please contact your Super Administrator to activate the license.'}
        </p>

        <div className="user-info">
          <p>
            <strong>Logged in as:</strong> {user?.email}
          </p>
          <p>
            <strong>Role:</strong> {user?.role}
          </p>
        </div>

        <div className="action-buttons">
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
