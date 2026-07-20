import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../utils/api';
import './LicenseActivation.css';

export default function LicenseActivation() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // form, loading, success, error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [licenseExists, setLicenseExists] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    company_address: '',
    company_contact: '',
    company_email: '',
    product_name: 'Chatbot Platform',
    deployment_type: 'Cloud',
    max_users: 100,
    max_admin_users: 5,
    max_token_usage_charge: 1000,
    license_type: 'Enterprise',
    environment: 'Production',
    valid_from: '',
    valid_till: '',
    remarks: '',
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;
    if (!isNaN(value) && value !== '') {
      parsedValue = name === 'max_token_usage_charge' ? parseFloat(value) : parseInt(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.valid_from || !formData.valid_till) {
      setError('License dates are required');
      return;
    }

    setLoading(true);
    setStep('loading');

    try {
      const { data } = await api.post('/api/license/create', formData);

      setSuccess(true);
      setStep('success');
      setError(null);

      // Redirect immediately to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create license');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if license already exists - if so, redirect to dashboard
    const checkLicenseExists = async () => {
      try {
        const { data } = await api.get('/api/license/check-activation');
        if (data.activated) {
          // License already activated, redirect to dashboard
          setLicenseExists(true);
          navigate('/dashboard');
        } else {
          setLicenseExists(false);
        }
      } catch (err) {
        // If error, assume no license yet
        setLicenseExists(false);
      }
    };

    checkLicenseExists();
  }, [navigate]);

  useEffect(() => {
    // Set default dates (only if license doesn't exist)
    if (licenseExists === false) {
      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

      setFormData((prev) => ({
        ...prev,
        valid_from: today.toISOString().split('T')[0],
        valid_till: nextYear.toISOString().split('T')[0],
      }));
    }
  }, [licenseExists]);

  // Show loading while checking if license exists
  if (licenseExists === null) {
    return (
      <div className="license-activation-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p>Checking license status...</p>
        </div>
      </div>
    );
  }

  // Redirect if license already exists
  if (licenseExists) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="license-activation-container">
      <div className="license-activation-header">
        <h1>License Activation</h1>
        <p>Complete the license setup to activate the platform</p>
      </div>

      {step === 'form' && (
        <div className="license-activation-form">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="client_name">Client Name *</label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_email">Company Email</label>
                <input
                  type="email"
                  id="company_email"
                  name="company_email"
                  value={formData.company_email}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_contact">Company Contact</label>
                <input
                  type="tel"
                  id="company_contact"
                  name="company_contact"
                  value={formData.company_contact}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="company_address">Company Address</label>
                <input
                  type="text"
                  id="company_address"
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="product_name">Product Name *</label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="deployment_type">Deployment Type *</label>
                <select
                  id="deployment_type"
                  name="deployment_type"
                  value={formData.deployment_type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Cloud">Cloud</option>
                  <option value="On-Premise">On-Premise</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="max_users">Maximum Users *</label>
                <input
                  type="number"
                  id="max_users"
                  name="max_users"
                  value={formData.max_users}
                  onChange={handleFormChange}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_admin_users">Maximum Admin Users *</label>
                <input
                  type="number"
                  id="max_admin_users"
                  name="max_admin_users"
                  value={formData.max_admin_users}
                  onChange={handleFormChange}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_token_usage_charge">Maximum Token Usage Charge (USD) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>$</span>
                  <input
                    type="number"
                    id="max_token_usage_charge"
                    name="max_token_usage_charge"
                    value={formData.max_token_usage_charge}
                    onChange={handleFormChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="license_type">License Type *</label>
                <select
                  id="license_type"
                  name="license_type"
                  value={formData.license_type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Professional">Professional</option>
                  <option value="Starter">Starter</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="environment">Environment *</label>
                <select
                  id="environment"
                  name="environment"
                  value={formData.environment}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="valid_from">License Valid From *</label>
                <input
                  type="date"
                  id="valid_from"
                  name="valid_from"
                  value={formData.valid_from}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="valid_till">License Valid Till *</label>
                <input
                  type="date"
                  id="valid_till"
                  name="valid_till"
                  value={formData.valid_till}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleFormChange}
                  rows="4"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating License...' : 'Create License'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'loading' && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Creating your license...</p>
        </div>
      )}

      {step === 'success' && (
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h2>License Created Successfully!</h2>
          <p>Your platform has been activated. Redirecting to dashboard...</p>
        </div>
      )}

      {step === 'error' && (
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => setStep('form')}>
              Back to Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
