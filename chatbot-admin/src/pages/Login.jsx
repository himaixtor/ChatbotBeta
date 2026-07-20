import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
// import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../hooks/useAuth';
import { isAuthenticated } from '../utils/auth';
import api from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  // const [captchaError, setCaptchaError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  // const recaptchaRef = useRef();

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // setCaptchaError('');

    // // Check if CAPTCHA is completed
    // const captchaToken = recaptchaRef.current?.getValue();
    // if (!captchaToken) {
    //   setCaptchaError('Please complete the CAPTCHA verification');
    //   return;
    // }

    try {
      // Pass captcha token to login function
      const userData = await login(email, password); // captchaToken commented out
      // recaptchaRef.current?.reset();

      // Check license status
      try {
        const { data: licenseData } = await api.get('/api/license/check-activation');

        // Check if user is Super Admin and license not activated
        const isSuperAdmin = userData.user?.role === 'Super Admin' ||
                             userData.user?.role === 'super_admin' ||
                             userData.user?.role === 'SuperAdmin';

        if (!licenseData.activated && isSuperAdmin) {
          // Super Admin needs to activate license
          navigate('/license-activation');
        } else {
          // Regular redirect to dashboard
          navigate('/dashboard');
        }
      } catch (licenseErr) {
        // If license check fails, go to dashboard anyway
        navigate('/dashboard');
      }
    } catch (err) {
      // if (err.response?.data?.captchaError) {
      //   setCaptchaError(err.response.data.captchaError);
      // } else {
      setError(err.response?.data?.error || 'Invalid credentials');
      // }
      // Reset CAPTCHA on error
      // recaptchaRef.current?.reset();
    }
  };

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
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {/* <div className="captcha-container">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            />
          </div>
          {captchaError && <p className="error-text">{captchaError}</p>} */}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
