import React, { useState, useEffect } from 'react';
import { clearAuth } from '../utils/auth';
import './LicenseExpiredModal.css';

export default function LicenseExpiredModal() {
  const [isExpired, setIsExpired] = useState(false);
  const [message, setMessage] = useState('');
  const [tokenCostExceeded, setTokenCostExceeded] = useState(false);

  useEffect(() => {
    const handleLicenseExpired = (event) => {
      setIsExpired(true);
      setMessage(event.detail?.message || 'License has expired');
      setTokenCostExceeded(event.detail?.tokenCostExceeded || false);
    };

    window.addEventListener('licenseExpired', handleLicenseExpired);
    return () => window.removeEventListener('licenseExpired', handleLicenseExpired);
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const handleRetry = () => {
    setIsExpired(false);
    window.location.reload();
  };

  if (!isExpired) {
    return null;
  }

  return (
    <div className="license-expired-overlay">
      <div className="license-expired-modal">
        <div className="modal-header">
          <div className="modal-icon">⛔</div>
          <h1>License Expired</h1>
        </div>

        <div className="modal-content">
          {tokenCostExceeded ? (
            <>
              <p className="modal-subtitle">Token Usage Cost Limit Reached</p>
              <p className="modal-message">
                Your license has expired because the AI token usage cost has reached the maximum limit set in your license agreement.
              </p>
              <div className="alert-box">
                <strong>Current Status:</strong> All platform functionality is disabled until the limit is reset or license is renewed.
              </div>
            </>
          ) : (
            <>
              <p className="modal-subtitle">License Validity Expired</p>
              <p className="modal-message">
                Your license validity period has ended. Please contact your administrator to renew the license.
              </p>
            </>
          )}

          <p className="error-details">{message}</p>
        </div>

        <div className="modal-actions">
          <button onClick={handleLogout} className="btn btn-danger">
            🚪 Logout
          </button>
          <button onClick={handleRetry} className="btn btn-secondary">
            🔄 Retry
          </button>
        </div>

        <div className="modal-footer">
          <p>Contact your Super Admin to resolve this issue.</p>
        </div>
      </div>
    </div>
  );
}
