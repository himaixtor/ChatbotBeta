# CAPTCHA and Two-Factor Authentication Setup Guide

This guide explains how to set up and configure CAPTCHA and Two-Factor Authentication (2FA) in your Chatbot Admin Login System.

## Overview

### CAPTCHA (Google reCAPTCHA v3)
- **What it does**: Automatically verifies that login attempts are from real users, not bots
- **How it works**: Invisible protection - users don't see a checkbox; the system analyzes user behavior
- **Security Level**: Prevents automated attacks and brute-force attempts

### Two-Factor Authentication (TOTP)
- **What it does**: Requires users to provide a second form of authentication (time-based code)
- **How it works**: Users scan a QR code with an authenticator app and enter 6-digit codes
- **Apps supported**: Google Authenticator, Microsoft Authenticator, Authy, LastPass, etc.

## Setup Instructions

### Step 1: Get Google reCAPTCHA Keys

1. Go to [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Sign in with your Google account (create one if needed)
3. Click the **+** button to create a new site
4. Fill in the form:
   - **Label**: "Chatbot Admin Login"
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domain (e.g., `localhost`, `yourdomain.com`)
5. Accept terms and submit
6. You'll receive:
   - **Site Key** (public)
   - **Secret Key** (keep private!)

### Step 2: Configure Backend (reCAPTCHA Secret Key)

1. Open `backend/.env`
2. Find the line: `RECAPTCHA_SECRET_KEY=YOUR_RECAPTCHA_SECRET_KEY_HERE`
3. Replace `YOUR_RECAPTCHA_SECRET_KEY_HERE` with your Secret Key from Step 1
4. Save the file

Example:
```env
RECAPTCHA_SECRET_KEY=6Lfxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Configure Frontend (reCAPTCHA Site Key)

1. Open `chatbot-admin/.env`
2. Find the line: `VITE_RECAPTCHA_SITE_KEY=YOUR_RECAPTCHA_SITE_KEY_HERE`
3. Replace `YOUR_RECAPTCHA_SITE_KEY_HERE` with your Site Key from Step 1
4. Save the file

Example:
```env
VITE_RECAPTCHA_SITE_KEY=6Lfxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Restart Your Application

```bash
# Backend
cd backend
npm run dev

# Frontend (in a new terminal)
cd chatbot-admin
npm run dev
```

## Using the Features

### Login with CAPTCHA

1. Go to the login page
2. Enter email and password
3. Complete the reCAPTCHA verification at the bottom
4. Click "Sign in"

**Note**: CAPTCHA verification is required to submit the login form. The "Sign in" button is disabled until the CAPTCHA is completed.

### Setting Up 2FA for Your Account

#### As an Admin/User with Auth Access:

1. Navigate to `/setup-2fa` or access the 2FA setup link from your account settings
2. Click "Get Started"
3. **Scan the QR Code**:
   - Open an authenticator app (Google Authenticator, Authy, etc.)
   - Tap the + button to add a new account
   - Scan the QR code displayed
4. **Save Backup Codes**:
   - You'll see 8 backup codes
   - Click on each code to copy it to your clipboard
   - **IMPORTANT**: Save these codes in a secure place (password manager, safe storage)
   - You can use these codes if you lose your authenticator device
5. **Verify Your Setup**:
   - Enter a 6-digit code from your authenticator app
   - Click "Confirm & Enable 2FA"
6. Success! 2FA is now enabled on your account

### Logging In with 2FA Enabled

1. Enter your email and password on the login page
2. Complete CAPTCHA verification
3. Click "Sign in"
4. You'll see the "Two-Factor Authentication" screen
5. Enter the 6-digit code from your authenticator app
6. Click "Verify"

**Alternative**: If you don't have your authenticator app, you can use a backup code (just enter it as the 6-digit code)

## Backend API Endpoints

### Login with CAPTCHA
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "captchaToken": "reCAPTCHA_token_from_frontend"
}

Response (2FA enabled):
{
  "requires2FA": true,
  "tempToken": "jwt_token",
  "user": {
    "uid": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}

Response (2FA disabled):
{
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token",
  "user": {
    "uid": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "permissions": {...}
  }
}
```

### Setup 2FA
```http
POST /api/auth/setup-2fa
Authorization: Bearer <access_token>

Response:
{
  "secret": "base32_encoded_secret",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": ["CODE1", "CODE2", ..., "CODE8"]
}
```

### Confirm 2FA
```http
POST /api/auth/confirm-2fa
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "token": "6_digit_code",
  "secret": "base32_secret",
  "backupCodes": ["CODE1", "CODE2", ..., "CODE8"]
}

Response:
{
  "message": "2FA enabled successfully"
}
```

### Verify 2FA During Login
```http
POST /api/auth/verify-2fa
Authorization: Bearer <temp_token_from_login>
Content-Type: application/json

{
  "token": "6_digit_code_or_backup_code"
}

Response:
{
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token",
  "user": {...}
}
```

## Database Schema Changes

The `User` model in your database has been updated with these fields:

```prisma
model User {
  ...
  two_fa_enabled      Boolean        @default(false)
  two_fa_secret       String?
  two_fa_backup_codes String?
  ...
}
```

- `two_fa_enabled`: Boolean flag indicating if 2FA is active
- `two_fa_secret`: The base32-encoded secret key for TOTP
- `two_fa_backup_codes`: Comma-separated list of backup codes

## Security Best Practices

1. **Backup Codes**: 
   - Save them in a secure location (password manager, safe)
   - Never share them with anyone
   - Each code can only be used once

2. **Authenticator App**:
   - Use a well-known app (Google Authenticator, Authy, Microsoft Authenticator)
   - Don't share access to your device
   - If you get a new device, disable 2FA first, then re-enable on the new device

3. **CAPTCHA**:
   - Keep your Secret Key confidential (never commit to version control)
   - Use different reCAPTCHA projects for development and production
   - Monitor reCAPTCHA analytics for unusual patterns

4. **Account Recovery**:
   - If you lose access to your authenticator app, use a backup code
   - If you've used all backup codes, an admin will need to disable 2FA on your account

## Troubleshooting

### CAPTCHA Not Showing
- **Issue**: reCAPTCHA widget doesn't appear on login page
- **Solution**:
  - Check that `VITE_RECAPTCHA_SITE_KEY` is correctly set in `chatbot-admin/.env`
  - Verify the domain in reCAPTCHA console matches your access domain
  - Clear browser cache and reload

### "CAPTCHA verification failed"
- **Issue**: Getting this error even though CAPTCHA is completed
- **Solution**:
  - Verify `RECAPTCHA_SECRET_KEY` is correctly set in `backend/.env`
  - Check that the Secret Key is correct (copy from reCAPTCHA console again)
  - Restart the backend server

### 2FA Code Not Working
- **Issue**: Entering correct code still gets "Invalid 2FA token"
- **Solution**:
  - Check that your device time is synchronized (critical for TOTP)
  - Try the code again (codes expire every 30 seconds)
  - Make sure you're using the right authenticator app account
  - Try a backup code instead

### Lost Authenticator Device
- **Solution**:
  - Use a backup code to log in
  - Set up 2FA again with a new device
  - If all backup codes are used, contact an admin to disable 2FA

## Environment Variables Reference

### Backend (.env)
```env
# Required for CAPTCHA verification
RECAPTCHA_SECRET_KEY=your_secret_key_here

# JWT Secrets (already configured)
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### Frontend (.env)
```env
# Required for CAPTCHA widget
VITE_RECAPTCHA_SITE_KEY=your_site_key_here

# API configuration (already configured)
VITE_API_URL=auto
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Login Page (Frontend)            │
├─────────────────────────────────────────┤
│ 1. User enters email/password            │
│ 2. reCAPTCHA verification (automatic)    │
│ 3. Submit to /api/auth/login             │
└─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────┐
│      Backend Login Verification          │
├─────────────────────────────────────────┤
│ 1. Verify reCAPTCHA token with Google    │
│ 2. Check email/password                  │
│ 3. If 2FA enabled → return temp token    │
│ 4. If 2FA disabled → return full tokens  │
└─────────────────────────────────────────┘
                    │
                    ├─→ [No 2FA] Direct Login
                    │
                    └─→ [2FA Enabled]
                         │
                         ↓
            ┌─────────────────────────────────────┐
            │  2FA Verification Page (Frontend)   │
            ├─────────────────────────────────────┤
            │ 1. User opens authenticator app     │
            │ 2. Enters 6-digit code              │
            │ 3. Submit to /api/auth/verify-2fa   │
            └─────────────────────────────────────┘
                         │
                         ↓
            ┌─────────────────────────────────────┐
            │    Backend 2FA Verification         │
            ├─────────────────────────────────────┤
            │ 1. Verify TOTP code using secret    │
            │ 2. Return full access/refresh tokens│
            │ 3. User granted access to dashboard │
            └─────────────────────────────────────┘
```

## Files Modified/Created

### Modified Files:
- `backend/src/controllers/authController.js` - Added 2FA logic
- `backend/src/routes/authRoutes.js` - Added 2FA routes
- `backend/.env` - Added RECAPTCHA_SECRET_KEY
- `chatbot-admin/src/pages/Login.jsx` - Added CAPTCHA & 2FA UI
- `chatbot-admin/.env` - Added VITE_RECAPTCHA_SITE_KEY
- `chatbot-admin/src/App.jsx` - Added 2FA setup route
- `database/prisma/schema.prisma` - Added 2FA fields to User model

### New Files:
- `chatbot-admin/src/pages/TwoFASetup.jsx` - 2FA setup component

### New Dependencies:
**Backend:**
- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation

**Frontend:**
- `react-google-recaptcha` - reCAPTCHA integration

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the backend logs for error messages
3. Verify all environment variables are correctly set
4. Check browser console for frontend errors

## Next Steps

1. ✅ Install and configure CAPTCHA keys
2. ✅ Test login with CAPTCHA verification
3. ✅ Set up 2FA on your admin account
4. ✅ Test 2FA login flow
5. Optional: Create user guide for other admins
6. Optional: Monitor login metrics in backend logs

---

**Last Updated**: 2026-06-26
**Version**: 1.0
