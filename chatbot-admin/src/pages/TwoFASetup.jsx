import { useState, useRef } from 'react';
import api from '../utils/api';

export default function TwoFASetup() {
  const [step, setStep] = useState('start');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const inputRef = useRef();

  const handleSetup2FA = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/setup-2fa');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('scan');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/confirm-2fa', {
        token: verificationCode,
        secret,
        backupCodes,
      });
      setSuccess('2FA has been enabled successfully!');
      setStep('done');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (step === 'start') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: '500px' }}>
          <h1>Enable Two-Factor Authentication</h1>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Two-factor authentication adds an extra layer of security to your account.
          </p>
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn btn-primary"
            onClick={handleSetup2FA}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Setting up…' : 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'scan') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: '600px' }}>
          <h1>Scan QR Code</h1>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '250px' }} />
          </div>

          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              wordBreak: 'break-all',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Or enter this key manually:
            </p>
            <code style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{secret}</code>
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Backup Codes</h3>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
            Save these codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {backupCodes.map((code) => (
              <div
                key={code}
                onClick={() => copyToClipboard(code)}
                style={{
                  padding: '0.75rem',
                  backgroundColor: copiedCode === code ? '#d4edda' : '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                }}
              >
                {code}
                {copiedCode === code && <span style={{ marginLeft: '0.5rem' }}>✓</span>}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="verification">Enter 6-digit code from your authenticator</label>
            <input
              ref={inputRef}
              id="verification"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength="6"
              inputMode="numeric"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            className="btn btn-primary"
            onClick={handleConfirm2FA}
            disabled={loading || verificationCode.length !== 6}
            style={{ width: '100%' }}
          >
            {loading ? 'Confirming…' : 'Confirm & Enable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: '500px' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                color: '#28a745',
              }}
            >
              ✓
            </div>
            <h1>2FA Enabled</h1>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Two-factor authentication has been successfully enabled on your account.
            </p>
            {success && <p style={{ color: '#28a745', fontWeight: 'bold' }}>{success}</p>}
          </div>
        </div>
      </div>
    );
  }
}
