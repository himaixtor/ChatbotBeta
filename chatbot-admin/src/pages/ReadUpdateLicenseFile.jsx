import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getUser } from '../utils/auth';
import api from '../utils/api';
import { formatDateToDDMMMYYYY } from '../utils/dateFormatter';
import './ReadUpdateLicenseFile.css';

export default function ReadUpdateLicenseFile() {
  const user = getUser();
  const [uploadedData, setUploadedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Check if Super Admin
  const isSuperAdmin = user?.role === 'Super Admin' ||
                       user?.role === 'super_admin' ||
                       user?.role === 'SuperAdmin' ||
                       user?.role === 'Super_admin';

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/api/license/decrypt-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadedData(data.licenseData);
      setEditData(JSON.parse(JSON.stringify(data.licenseData))); // Deep copy
    } catch (err) {
      setError('Failed to decrypt file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await api.post('/api/license/save-encrypted-file', editData);
      alert('License file updated and encrypted successfully');
      setEditing(false);
      setUploadedData(JSON.parse(JSON.stringify(editData)));
    } catch (err) {
      setError('Failed to save file: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCurrentFile = async () => {
    try {
      const response = await api.get('/api/license/current-file', {
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
      setError('Failed to download file: ' + (err.response?.data?.error || err.message));
    }
  };

  const fields = [
    { key: 'license_id', label: 'License ID', readonly: true },
    { key: 'client_name', label: 'Client Name' },
    { key: 'company_address', label: 'Company Address' },
    { key: 'company_contact', label: 'Company Contact' },
    { key: 'company_email', label: 'Company Email' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'deployment_type', label: 'Deployment Type' },
    { key: 'max_users', label: 'Max Users', type: 'number' },
    { key: 'max_admin_users', label: 'Max Admin Users', type: 'number' },
    { key: 'max_token_usage_charge', label: 'Max Token Usage Charge (USD)', type: 'number', step: '0.01' },
    { key: 'license_type', label: 'License Type' },
    { key: 'environment', label: 'Environment' },
    { key: 'valid_from', label: 'Valid From', type: 'date' },
    { key: 'valid_till', label: 'Valid Till', type: 'date' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
  ];

  return (
    <div className="license-debug-container">
      <div className="debug-header">
        <h1>License File Reader & Updater</h1>
        <p>Upload, decrypt, view and update encrypted license files (Super Admin Only)</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {!uploadedData ? (
        <div className="upload-section">
          <h3>📁 Upload License File</h3>
          <p className="subtitle">Upload an encrypted license file (.txt or .json)</p>

          <div className="upload-buttons">
            <label className="file-upload-label">
              <input
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <span className={`file-upload-btn ${uploading ? 'disabled' : ''}`}>
                {uploading ? '⏳ Uploading...' : '📁 Choose License File'}
              </span>
            </label>

            <button
              onClick={handleDownloadCurrentFile}
              className="btn btn-secondary"
              title="Download the current server license file for testing"
            >
              ⬇️ Download Current File (for testing)
            </button>
          </div>

          <p className="help-text">
            💡 Tip: Click "Download Current File" to get the license.txt from the server,
            then upload it again to test the decrypt functionality.
          </p>
        </div>
      ) : editing ? (
        <div className="edit-section">
          <h2>✏️ Edit License Data</h2>
          <p className="subtitle">Edit the license file data and save to encrypt</p>

          <div className="form-grid">
            {fields.map((field) => (
              <div key={field.key} className="form-group">
                <label>{field.label}</label>
                {field.key === 'max_token_usage_charge' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>$</span>
                    <input
                      type={field.type || 'text'}
                      value={editData[field.key] || ''}
                      onChange={(e) => handleEditChange(field.key, e.target.value)}
                      disabled={field.readonly}
                      className={field.readonly ? 'readonly' : ''}
                      step={field.step || '1'}
                      style={{ flex: 1 }}
                    />
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={editData[field.key] || ''}
                    onChange={(e) => handleEditChange(field.key, e.target.value)}
                    disabled={field.readonly}
                    className={field.readonly ? 'readonly' : ''}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button onClick={handleSave} className="btn btn-success" disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save & Encrypt'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditData(JSON.parse(JSON.stringify(uploadedData)));
              }}
              className="btn btn-secondary"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="view-section">
          <h2>📋 License File Data</h2>

          <div className="action-buttons">
            <button onClick={() => setEditing(true)} className="btn btn-primary">
              ✏️ Update File
            </button>
            <button
              onClick={() => {
                setUploadedData(null);
                setEditData(null);
              }}
              className="btn btn-secondary"
            >
              📁 Upload Another File
            </button>
          </div>

          <table className="data-table">
            <tbody>
              {fields.map((field) => (
                <tr key={field.key}>
                  <td className="label">{field.label}</td>
                  <td className="value">
                    {field.type === 'date'
                      ? formatDateToDDMMMYYYY(uploadedData[field.key])
                      : field.key === 'max_token_usage_charge'
                      ? `$${uploadedData[field.key] || 0}`
                      : uploadedData[field.key] || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
