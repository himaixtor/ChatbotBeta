import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateToDDMMMYYYY } from '../utils/dateFormatter';
import './LicenseExpiryWarning.css';

export default function LicenseExpiryWarning() {
  const [warning, setWarning] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkLicenseStatus = async () => {
      try {
        const { data } = await api.get('/api/license/status');
        if (data.status?.showWarning) {
          setWarning(data.status);
          setDismissed(false);
        }
      } catch (error) {
        console.error('Failed to check license status:', error);
      }
    };

    // Check on mount
    checkLicenseStatus();

    // Check every 5 minutes
    const interval = setInterval(checkLicenseStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!warning || dismissed) {
    return null;
  }

  return (
    <div className="license-warning-popup">
      <div className="warning-content">
        <div className="warning-header">
          <span className="warning-icon">⚠️</span>
          <h3>License Expiring Soon</h3>
        </div>

        <p className="warning-message">
          Your license expires in <strong>{warning.warningDays}</strong> day
          {warning.warningDays !== 1 ? 's' : ''}.
        </p>

        <p className="warning-date">
          Expiry Date: <strong>{formatDateToDDMMMYYYY(warning.expiryDate)}</strong>
        </p>

        <div className="warning-actions">
          <button
            className="btn-renew"
            onClick={() => {
              window.location.href = '/license-management';
            }}
          >
            Renew License
          </button>
          <button className="btn-dismiss" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
