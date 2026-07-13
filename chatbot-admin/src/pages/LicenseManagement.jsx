import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { formatDateToDDMMMYYYY } from '../utils/dateFormatter';
import './LicenseManagement.css';

export default function LicenseManagement() {
  const { user } = useAuth();
  const [license, setLicense] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewDate, setRenewDate] = useState('');
  const [renewType, setRenewType] = useState('1year');

  // Check if user is Super Admin (handle multiple role formats)
  const isSuperAdmin = user?.role === 'Super Admin' ||
                       user?.role === 'super_admin' ||
                       user?.role === 'SuperAdmin' ||
                       user?.role === 'Super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="license-not-authorized">
        <h2>Access Denied</h2>
        <p>Only Super Admin can access license management.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchLicenseData();
  }, []);

  const fetchLicenseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const licenseData = await api.get('/api/license/details');
      const statusData = await api.get('/api/license/status');

      setLicense(licenseData.data?.license);
      setStatus(statusData.data?.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    let finalDate = renewDate;

    if (renewType === '1year') {
      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      finalDate = nextYear.toISOString().split('T')[0];
    } else if (renewType === '6months') {
      const today = new Date();
      const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
      finalDate = sixMonthsLater.toISOString().split('T')[0];
    } else if (renewType === 'custom' && !renewDate) {
      alert('Please select a date for custom renewal');
      return;
    }

    try {
      await api.post('/api/license/renew', { new_valid_till: finalDate });
      alert('License renewed successfully');
      setRenewModalOpen(false);
      setRenewDate('');
      setRenewType('1year');
      fetchLicenseData();
    } catch (err) {
      alert('Renewal failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get('/api/license/download', {
        responseType: 'blob',
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'license.txt';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="license-loading">
        <div className="spinner"></div>
        <p>Loading license information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-error">
        <h2>Error Loading License</h2>
        <p>{error}</p>
        <button onClick={fetchLicenseData} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="license-not-found">
        <h2>No License Found</h2>
        <p>Please contact administrator to activate a license.</p>
      </div>
    );
  }

  return (
    <div className="license-management-container">
      <header className="license-header">
        <h1>License Management</h1>
        <p>Enterprise License Control & Monitoring</p>
      </header>

      {status?.showWarning && (
        <div className="license-warning-banner">
          <span className="warning-icon">⚠</span>
          <span>
            License expires in {status.warningDays} day{status.warningDays !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setRenewModalOpen(true)} className="btn-warning-action">
            Renew Now
          </button>
        </div>
      )}

      <div className="license-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="license-overview">
          <div className="overview-cards">
            <div className="card status-card">
              <div className="card-icon">✓</div>
              <div className="card-content">
                <div className="card-label">License Status</div>
                <div className="card-value">{status?.status || 'UNKNOWN'}</div>
              </div>
            </div>

            <div className="card expiry-card">
              <div className="card-icon">📅</div>
              <div className="card-content">
                <div className="card-label">Days Remaining</div>
                <div className="card-value">{status?.daysRemaining || 0}</div>
                {status?.expiryDate && (
                  <div className="card-detail">
                    Expires: {formatDateToDDMMMYYYY(status.expiryDate)}
                  </div>
                )}
              </div>
            </div>

            <div className="card limits-card">
              <div className="card-icon">👥</div>
              <div className="card-content">
                <div className="card-label">Max Users</div>
                <div className="card-value">{license?.max_users}</div>
              </div>
            </div>

            <div className="card token-card">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <div className="card-label">Max Token Charge</div>
                <div className="card-value">${license?.max_token_usage_charge?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          <div className="license-actions">
            <button onClick={() => setRenewModalOpen(true)} className="btn btn-primary">
              Renew License
            </button>
            <button onClick={handleDownload} className="btn btn-secondary">
              Download License
            </button>
            <button onClick={fetchLicenseData} className="btn btn-secondary">
              Refresh
            </button>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="license-details">
          <div className="details-grid">
            <div className="detail-item">
              <label>License ID</label>
              <value className="monospace">{license?.license_id}</value>
            </div>

            <div className="detail-item">
              <label>Client Name</label>
              <value>{license?.client_name}</value>
            </div>

            <div className="detail-item">
              <label>Product Name</label>
              <value>{license?.product_name}</value>
            </div>

            <div className="detail-item">
              <label>License Type</label>
              <value>{license?.license_type}</value>
            </div>

            <div className="detail-item">
              <label>Deployment Type</label>
              <value>{license?.deployment_type}</value>
            </div>

            <div className="detail-item">
              <label>Environment</label>
              <value>{license?.environment}</value>
            </div>

            <div className="detail-item">
              <label>Valid From</label>
              <value>{formatDateToDDMMMYYYY(license?.valid_from)}</value>
            </div>

            <div className="detail-item">
              <label>Valid Till</label>
              <value>{formatDateToDDMMMYYYY(license?.valid_till)}</value>
            </div>

            <div className="detail-item">
              <label>Maximum Users</label>
              <value>{license?.max_users}</value>
            </div>

            <div className="detail-item">
              <label>Maximum Admin Users</label>
              <value>{license?.max_admin_users}</value>
            </div>

            <div className="detail-item">
              <label>Maximum Token Usage Charge (USD)</label>
              <value>${license?.max_token_usage_charge?.toFixed(2) || '0.00'}</value>
            </div>

            <div className="detail-item">
              <label>Created By</label>
              <value>{license?.created_by_email}</value>
            </div>

            <div className="detail-item">
              <label>Created Date</label>
              <value>{formatDateToDDMMMYYYY(license?.created_date)}</value>
            </div>

            <div className="detail-item">
              <label>Company Email</label>
              <value>{license?.company_email || 'N/A'}</value>
            </div>

            <div className="detail-item">
              <label>Company Contact</label>
              <value>{license?.company_contact || 'N/A'}</value>
            </div>

            <div className="detail-item">
              <label>Company Address</label>
              <value>{license?.company_address || 'N/A'}</value>
            </div>

            {license?.remarks && (
              <div className="detail-item full-width">
                <label>Remarks</label>
                <value>{license.remarks}</value>
              </div>
            )}
          </div>
        </div>
      )}

      {renewModalOpen && (
        <div className="modal-overlay" onClick={() => setRenewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Renew License</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Select Renewal Period</label>
                <div className="renewal-options">
                  <label className="option">
                    <input
                      type="radio"
                      name="renewType"
                      value="1year"
                      checked={renewType === '1year'}
                      onChange={(e) => setRenewType(e.target.value)}
                    />
                    <span>1 Year</span>
                  </label>
                  <label className="option">
                    <input
                      type="radio"
                      name="renewType"
                      value="6months"
                      checked={renewType === '6months'}
                      onChange={(e) => setRenewType(e.target.value)}
                    />
                    <span>6 Months</span>
                  </label>
                  <label className="option">
                    <input
                      type="radio"
                      name="renewType"
                      value="custom"
                      checked={renewType === 'custom'}
                      onChange={(e) => setRenewType(e.target.value)}
                    />
                    <span>Custom Date</span>
                  </label>
                </div>
              </div>

              {renewType === 'custom' && (
                <div className="form-group">
                  <label>Select Date</label>
                  <input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button onClick={handleRenew} className="btn btn-primary">
                  Renew
                </button>
                <button onClick={() => setRenewModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
