# 📋 Deployment Checklist: CAPTCHA & 2FA

## Pre-Deployment ✅

### 1. Environment Setup
- [ ] Created Google reCAPTCHA account
- [ ] Generated reCAPTCHA v3 keys (Site Key + Secret Key)
- [ ] Added `RECAPTCHA_SECRET_KEY` to `backend/.env`
- [ ] Added `VITE_RECAPTCHA_SITE_KEY` to `chatbot-admin/.env`
- [ ] Verified all keys are correct (no typos)
- [ ] Did NOT commit keys to git (check `.gitignore`)

### 2. Dependencies Installed
- [ ] Backend: `npm install speakeasy qrcode`
- [ ] Frontend: `npm install react-google-recaptcha`
- [ ] All packages installed without errors
- [ ] No security vulnerabilities (check `npm audit`)

### 3. Code Review
- [ ] Reviewed modified `authController.js`
- [ ] Reviewed updated `Login.jsx`
- [ ] Reviewed new `TwoFASetup.jsx`
- [ ] Reviewed database schema changes
- [ ] No syntax errors found
- [ ] All imports are correct

### 4. Local Testing
- [ ] Backend server starts without errors: `npm run dev`
- [ ] Frontend dev server starts: `npm run dev`
- [ ] Can access login page: `http://localhost:5173/login`
- [ ] CAPTCHA widget appears on login
- [ ] Can log in without 2FA (backward compatible)
- [ ] Can access 2FA setup page: `http://localhost:5173/setup-2fa`
- [ ] 2FA setup flow works end-to-end
- [ ] Can enable 2FA on test account
- [ ] Can log in with 2FA code
- [ ] Backup codes work as fallback
- [ ] Account lockout works after 5 failed attempts
- [ ] CAPTCHA verification fails with invalid token

### 5. Browser Compatibility
- [ ] Works on Chrome/Chromium
- [ ] Works on Firefox
- [ ] Works on Safari
- [ ] Works on Edge
- [ ] Mobile browser works (iOS Safari, Chrome Mobile)
- [ ] Responsive design works on small screens

### 6. Security Verification
- [ ] CAPTCHA secret key not visible in frontend code
- [ ] Tokens not logged in console
- [ ] Backup codes are not visible after setup (copied only)
- [ ] TOTP secret never sent to frontend unencrypted
- [ ] JWT tokens have appropriate expiry times
- [ ] Refresh token rotation works

---

## Staging/Production Deployment ✅

### 7. Production Environment Setup
- [ ] Created separate reCAPTCHA keys for production domain
- [ ] Updated production `.env` with production keys
- [ ] Verified domain in reCAPTCHA console settings
- [ ] Enabled `NODE_ENV=production` in backend
- [ ] Enabled HTTPS certificate
- [ ] CORS settings updated for production domain

### 8. Database Migration
- [ ] Backed up database before migration
- [ ] Created Prisma migration: `npx prisma migrate dev --name add_2fa`
- [ ] Verified migration SQL is correct
- [ ] Applied migration to staging database
- [ ] Applied migration to production database
- [ ] All users have `two_fa_enabled: false` (default)
- [ ] No data loss during migration

### 9. Deployment Steps
```bash
# Backend
[ ] npm install
[ ] npm run prisma:generate
[ ] Restart backend service
[ ] Verify /health endpoint responds

# Frontend
[ ] npm install
[ ] npm run build
[ ] Deploy dist/ to hosting
[ ] Test login page loads
[ ] Verify CAPTCHA widget appears
```

### 10. Post-Deployment Testing
- [ ] Can access login page on production domain
- [ ] CAPTCHA works (real keys, real domain validation)
- [ ] Can log in on production
- [ ] Can access 2FA setup on production
- [ ] Can enable 2FA on test account
- [ ] Can log in with 2FA code
- [ ] Backup codes work
- [ ] Database migration preserved all user data
- [ ] No errors in production logs

### 11. Admin Training
- [ ] Created admin guide document
- [ ] Set up 2FA on all admin accounts
- [ ] Tested recovery with backup codes
- [ ] Saved backup codes in secure location
- [ ] Created account recovery procedure
- [ ] Documented how to help users who lose their devices

### 12. User Communication
- [ ] Notified users about CAPTCHA requirement
- [ ] Notified admins about 2FA availability
- [ ] Created 2FA guide document
- [ ] Posted 2FA FAQ in documentation
- [ ] Provided support contact for issues

### 13. Monitoring & Logging
- [ ] Set up monitoring for login failures
- [ ] Monitor CAPTCHA rejection rate
- [ ] Monitor 2FA verification failures
- [ ] Set up alerts for unusual patterns
- [ ] Logs capture CAPTCHA results (not tokens)
- [ ] Logs capture 2FA attempts (count only)

### 14. Rollback Plan
- [ ] Documented rollback procedure
- [ ] Can disable 2FA requirement (set flag in code)
- [ ] Can disable CAPTCHA requirement
- [ ] Know how to restore from backup
- [ ] Have previous version deployed and tested
- [ ] Team trained on rollback procedure

---

## Post-Deployment (First Week) ✅

### 15. Monitor & Validate
- [ ] Check login success rate (should not decrease)
- [ ] Monitor error logs for issues
- [ ] Collect user feedback on CAPTCHA
- [ ] Verify 2FA is working for enabled accounts
- [ ] Check response times (CAPTCHA verification latency)
- [ ] Monitor Google reCAPTCHA analytics

### 16. Troubleshoot Issues
- [ ] Fix any CAPTCHA integration issues
- [ ] Fix any 2FA verification issues
- [ ] Address user complaints
- [ ] Update documentation with common issues
- [ ] Test on different networks (VPN, proxy)

### 17. Optimization
- [ ] Optimize CAPTCHA verification latency
- [ ] Cache TOTP secrets efficiently
- [ ] Optimize backup code lookup
- [ ] Consider rate limiting for TOTP verification
- [ ] Profile authentication endpoint

### 18. Documentation
- [ ] Update API documentation
- [ ] Update user documentation
- [ ] Update admin documentation
- [ ] Create troubleshooting guide
- [ ] Document all new endpoints
- [ ] Document database schema changes

---

## Ongoing Maintenance ✅

### 19. Regular Tasks
- [ ] Weekly review of login metrics
- [ ] Monthly review of CAPTCHA analytics
- [ ] Monitor for security alerts
- [ ] Update dependencies when available
- [ ] Review backup code usage patterns
- [ ] Check for unusual TOTP verification failures

### 20. Compliance & Security
- [ ] Verify GDPR compliance (if applicable)
- [ ] Verify backup code security
- [ ] Review access logs
- [ ] Update security policy documentation
- [ ] Conduct security audit
- [ ] Review CAPTCHA false positive rate

### 21. Backup & Recovery
- [ ] Regular database backups
- [ ] Test backup restoration
- [ ] Document recovery procedures
- [ ] Test account recovery without 2FA device
- [ ] Verify backup code storage
- [ ] Have admin account with backup codes saved

---

## Quick Reference

### Environment Variables

**Backend (`backend/.env`)**
```env
RECAPTCHA_SECRET_KEY=<your_secret_key>
```

**Frontend (`chatbot-admin/.env`)**
```env
VITE_RECAPTCHA_SITE_KEY=<your_site_key>
```

### Key Endpoints
```
POST /api/auth/login              # Login (CAPTCHA required)
POST /api/auth/setup-2fa          # Start 2FA setup
POST /api/auth/confirm-2fa        # Confirm & enable 2FA
POST /api/auth/verify-2fa         # Verify TOTP during login
POST /api/auth/refresh            # Refresh access token
POST /api/auth/logout             # Logout
```

### Test Credentials
```
Email:    admin@example.com
Password: TestPassword123!
```

### Recovery Procedures
- **Lost Authenticator**: Use backup code
- **Used All Backup Codes**: Admin disables 2FA
- **Lost All Backup Codes**: Password reset required
- **CAPTCHA Issues**: Check domain in reCAPTCHA console

---

## Compliance Checklist

### GDPR (if applicable)
- [ ] Users understand 2FA requirement
- [ ] Backup codes storage complies with GDPR
- [ ] Audit logs for authentication
- [ ] Right to access authentication data
- [ ] Right to delete 2FA setup

### Security Standards
- [ ] Follows OWASP guidelines
- [ ] No hardcoded secrets
- [ ] Secure token storage (httpOnly cookies)
- [ ] HTTPS/TLS for all communications
- [ ] Password hashing (bcrypt)
- [ ] TOTP according to RFC 6238

### Best Practices
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Error handling without exposing secrets
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Audit logs for auth events

---

## Success Criteria

✅ All items checked = Ready for Production

**Final Sign-off:**
- [ ] Project Lead Approved
- [ ] Security Review Passed
- [ ] QA Testing Completed
- [ ] Operations Team Ready
- [ ] User Documentation Complete
- [ ] Admin Training Complete

---

## Contacts & Escalation

**For CAPTCHA Issues:**
- Contact: Google reCAPTCHA Support
- Link: https://www.google.com/recaptcha/admin

**For 2FA Issues:**
- Contact: Your development team
- Document: 2FA_AND_CAPTCHA_SETUP.md

**For Production Issues:**
- Contact: On-call engineer
- Procedure: See rollback plan above

---

**Checklist Created**: 2026-06-26
**Last Updated**: 2026-06-26
**Status**: Active
