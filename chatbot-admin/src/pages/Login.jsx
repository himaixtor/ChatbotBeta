import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { isAuthenticated } from '../utils/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef();
  const navigate = useNavigate();

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        captchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setRequires2FA(true);
        setEmail('');
        setPassword('');
        captchaRef.current?.reset();
        setCaptchaToken(null);
      } else {
        localStorage.setItem('chatbot_access_token', data.accessToken);
        localStorage.setItem('chatbot_refresh_token', data.refreshToken);
        localStorage.setItem('chatbot_user', JSON.stringify(data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');

    if (!twoFAToken) {
      setError('Please enter your 2FA code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ token: twoFAToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '2FA verification failed');
        return;
      }

      localStorage.setItem('chatbot_access_token', data.accessToken);
      localStorage.setItem('chatbot_refresh_token', data.refreshToken);
      localStorage.setItem('chatbot_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <span className="brand-icon">K</span>
            <div>
              <h1>Kirloskar Solar</h1>
              <p>Chatbot Console</p>
            </div>
          </div>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Two-Factor Authentication</h2>
          {error && <p className="error-text">{error}</p>}
          <form onSubmit={handleVerify2FA}>
            <div className="form-group">
              <label htmlFor="twofa">Enter 6-digit code or backup code</label>
              <input
                id="twofa"
                type="text"
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '0.5rem', width: '100%' }}
              onClick={() => setRequires2FA(false)}
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-icon">K</span>
          <div>
            <h1>Kirloskar Solar</h1>
            <p>Chatbot Console</p>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <ReCAPTCHA
              ref={captchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'YOUR_RECAPTCHA_SITE_KEY'}
              onChange={(token) => setCaptchaToken(token)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !captchaToken}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
