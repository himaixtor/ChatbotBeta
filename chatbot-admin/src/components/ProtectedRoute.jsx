import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../utils/auth';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import LicenseNotActivated from './LicenseNotActivated';

/** Redirect to login if not authenticated, to license activation if needed */
export default function ProtectedRoute({ children, forceShow }) {
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [licenseActivated, setLicenseActivated] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const { data } = await api.get('/api/license/check-activation');
        setLicenseActivated(data.activated);
      } catch (error) {
        // If check fails, allow access (fail open for now)
        setLicenseActivated(true);
      } finally {
        setLicenseChecked(true);
        setLoading(false);
      }
    };

    if (isAuthenticated()) {
      // If forceShow is set, skip license check
      if (forceShow === 'license-activation' || forceShow === 'read-update-license-file') {
        setLoading(false);
      } else {
        checkLicense();
      }
    } else {
      setLoading(false);
    }
  }, [forceShow]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If forceShow is set, skip license check and just show the content
  if (forceShow === 'license-activation' || forceShow === 'read-update-license-file') {
    return children;
  }

  // If license is not activated, check user role
  const user = getUser();
  if (!licenseActivated) {
    // Check if user is Super Admin (handle both "Super Admin" and "super_admin" formats)
    const isSuperAdmin = user?.role === 'Super Admin' ||
                         user?.role === 'super_admin' ||
                         user?.role === 'SuperAdmin';

    if (isSuperAdmin) {
      // Redirect Super Admin to license activation form
      return <Navigate to="/license-activation" replace />;
    }

    // Show message with logout option for non-Super Admin
    return <LicenseNotActivated />;
  }

  return children;
}
