# 🚀 Quick Start: CAPTCHA & 2FA Setup

## In 5 Minutes

### Step 1: Get reCAPTCHA Keys (2 min)
1. Go to https://www.google.com/recaptcha/admin
2. Click **+** to create new site
3. Fill form:
   - Label: `Chatbot Admin`
   - Type: **reCAPTCHA v3**
   - Domain: Your domain (e.g., `localhost` for local testing)
4. Copy the two keys you see

### Step 2: Update Backend Config (1 min)
Edit `backend/.env`:
```env
RECAPTCHA_SECRET_KEY=<paste_your_secret_key_here>
```

### Step 3: Update Frontend Config (1 min)
Edit `chatbot-admin/.env`:
```env
VITE_RECAPTCHA_SITE_KEY=<paste_your_site_key_here>
```

### Step 4: Restart & Test (1 min)
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd chatbot-admin && npm run dev
```

**Visit**: http://localhost:5173/login

---

## 🎯 Next: Enable 2FA on Your Account

1. Log in successfully
2. Go to: http://localhost:5173/setup-2fa
3. Click "Get Started"
4. **Install authenticator app** (any of these):
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
   - LastPass
   - 1Password

5. **Scan QR code** in your app
6. **Enter 6-digit code** from app
7. **Save backup codes** (click to copy)
8. Click "Confirm & Enable 2FA"

---

## ✅ Test 2FA Login

1. Log out
2. Log in again → Now requires 2FA code
3. Open authenticator → Copy 6-digit code
4. Enter code → Success!

---

## 📋 What Was Installed

### Backend
- `speakeasy` - TOTP generation
- `qrcode` - QR code creation

### Frontend
- `react-google-recaptcha` - CAPTCHA widget

---

## 📖 Need More Details?

See: `2FA_AND_CAPTCHA_SETUP.md` (full guide)
See: `IMPLEMENTATION_SUMMARY.md` (technical details)

---

## 🆘 Quick Troubleshooting

### "reCAPTCHA not showing"
→ Check `VITE_RECAPTCHA_SITE_KEY` in `chatbot-admin/.env`
→ Clear browser cache

### "CAPTCHA verification failed"
→ Check `RECAPTCHA_SECRET_KEY` in `backend/.env`
→ Restart backend

### "2FA code not working"
→ Check device time is accurate
→ Try another code (they expire every 30 sec)
→ Or use a backup code

### "Lost authenticator"
→ Use a backup code to log in
→ Set up 2FA again

---

## 🔗 Useful Links

- [reCAPTCHA Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA Docs](https://developers.google.com/recaptcha/docs/v3)
- [TOTP Standard](https://tools.ietf.org/html/rfc6238)
- [Authenticator Apps](https://en.wikipedia.org/wiki/Comparison_of_authentication_applications)

---

That's it! You're protected! 🔒
