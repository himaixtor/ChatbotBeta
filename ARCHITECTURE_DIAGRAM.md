# System Architecture: CAPTCHA & 2FA Implementation

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CHATBOT ADMIN FRONTEND                       │
│                          (React + Vite)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      LOGIN PAGE                              │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ Email Input    [ user@example.com                    ] │ │    │
│  │  │ Password Input [ ******* ]                             │ │    │
│  │  │ ┌──────────────────────────────────────────────────┐   │ │    │
│  │  │ │    [  reCAPTCHA v3 Widget - Invisible  ]        │   │ │    │
│  │  │ └──────────────────────────────────────────────────┘   │ │    │
│  │  │ [ Sign In Button (disabled until CAPTCHA done) ]       │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                          OR                                  │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │          2FA VERIFICATION PAGE                         │ │    │
│  │  │  Enter 6-digit code from authenticator app:            │ │    │
│  │  │  [ 000000 ]                                            │ │    │
│  │  │  [Verify] [Back to Login]                             │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                          OR                                  │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │          2FA SETUP PAGE                                │ │    │
│  │  │  Step 1: QR Code Display                               │ │    │
│  │  │  Step 2: Manual Secret Key                             │ │    │
│  │  │  Step 3: Backup Codes (copyable)                       │ │    │
│  │  │  Step 4: Verification                                  │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
              ↕ HTTP + JSON + JWT Tokens ↕
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                 │
│                        (Express.js)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    AUTH CONTROLLER                            │   │
│  │                                                                │   │
│  │  register()  ────────────→ Create new user (with hash)        │   │
│  │                                                                │   │
│  │  login()     ────────────→ 1. Verify CAPTCHA with Google      │   │
│  │                            2. Verify email/password (bcrypt)  │   │
│  │                            3. If 2FA enabled:                 │   │
│  │                               Return temp token + flag        │   │
│  │                            4. Else:                           │   │
│  │                               Return full tokens              │   │
│  │                                                                │   │
│  │  setup2FA()  ────────────→ Generate TOTP secret + QR code     │   │
│  │                            Generate backup codes              │   │
│  │                                                                │   │
│  │  confirm2FA() ───────────→ Verify TOTP code                   │   │
│  │                            Store secret in database           │   │
│  │                            Store backup codes (hashed)        │   │
│  │                                                                │   │
│  │  verify2FA()  ───────────→ Verify TOTP code OR backup code    │   │
│  │                            Return full auth tokens            │   │
│  │                            Update last-used backup code       │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 EXTERNAL SERVICES                             │   │
│  │                                                                │   │
│  │  Google reCAPTCHA API ────→ Verify CAPTCHA token             │   │
│  │  (api.google.com)           Return risk score (0.0 - 1.0)     │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
              ↕ Database Queries (Prisma ORM) ↕
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE                                      │
│                    (PostgreSQL)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      USER TABLE                               │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ uid                  VARCHAR (UUID)                   │   │   │
│  │  │ email                VARCHAR (UNIQUE)                 │   │   │
│  │  │ name                 VARCHAR                          │   │   │
│  │  │ password_hash        VARCHAR (bcrypt hash)            │   │   │
│  │  │ role                 VARCHAR                          │   │   │
│  │  │ ...other fields...                                    │   │   │
│  │  │                                                        │   │   │
│  │  │ ┌ NEW 2FA FIELDS ──────────────────────────────────┐ │   │   │
│  │  │ │ two_fa_enabled       BOOLEAN (default: false)    │ │   │   │
│  │  │ │ two_fa_secret        VARCHAR (base32 encoded)    │ │   │   │
│  │  │ │ two_fa_backup_codes  VARCHAR (comma-separated)   │ │   │   │
│  │  │ └──────────────────────────────────────────────────┘ │   │   │
│  │  │                                                        │   │   │
│  │  │ refresh_tokens (RELATION)                             │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                  REFRESH_TOKEN TABLE                 │   │   │
│  │  │  ┌──────────────────────────────────────────────┐   │   │   │
│  │  │  │ uid               VARCHAR (UUID)              │   │   │   │
│  │  │  │ user_uid          VARCHAR (FK to User)        │   │   │   │
│  │  │  │ token_hash        VARCHAR (unique)            │   │   │   │
│  │  │  │ expires_at        TIMESTAMP                   │   │   │   │
│  │  │  │ created_at        TIMESTAMP                   │   │   │   │
│  │  │  └──────────────────────────────────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow Sequence

### Normal Login (No 2FA)
```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│ Browser │                 │ Backend  │                │ Database │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                            │                          │
     │─1. POST /api/auth/login──→│                          │
     │  (email, pwd, captcha)     │                          │
     │                            │                          │
     │                   ┌────────┴───────┐                  │
     │                   │ 2. Verify CAPTCHA │              │
     │                   │   with Google API │              │
     │                   └────────┬───────┘                  │
     │                            │                          │
     │                            │─3. Fetch user──→        │
     │                            │    by email              │
     │                            │←──────────────          │
     │                   ┌────────┴───────┐                  │
     │                   │ 4. Verify password│              │
     │                   │    with bcrypt    │              │
     │                   └────────┬───────┘                  │
     │                            │                          │
     │                   ┌────────┴───────┐                  │
     │                   │ 5. Check 2FA    │                │
     │                   │    status       │                │
     │                   └────────┬───────┘                  │
     │                            │                          │
     │←─6. Return tokens─────────│                          │
     │   { accessToken,           │                          │
     │     refreshToken,          │                          │
     │     user }                 │                          │
     │                            │                          │
     └─7. Store tokens & redirect─────────────────────────→ Dashboard
         to dashboard
```

### Login with 2FA
```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│ Browser │                 │ Backend  │                │ Database │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                            │                          │
     │─1. POST /api/auth/login──→│                          │
     │  (email, pwd, captcha)     │                          │
     │                            │                          │
     │                   ┌────────┴───────┐                  │
     │                   │ Verify CAPTCHA  │                │
     │                   │ & Credentials   │                │
     │                   └────────┬───────┘                  │
     │                            │                          │
     │                   ┌────────┴───────┐                  │
     │                   │ Check: 2FA      │                │
     │                   │ enabled?        │                │
     │                   └────────┬───────┘                  │
     │                     YES ↓                            │
     │←─2. Return temp token────────|                       │
     │   { requires2FA: true,        │                      │
     │     tempToken,                │                      │
     │     user }                    │                      │
     │                               │                      │
     │─3. Show 2FA screen        ───┘                       │
     │    "Enter 6-digit code"       │                      │
     │                               │                      │
     │─4. POST /api/auth/verify-2fa│                       │
     │    (token, tempToken)         │                      │
     │                               │─5. Fetch user──→     │
     │                               │    2FA secret       │
     │                               │←──────────────      │
     │                       ┌───────┴────┐                 │
     │                       │ 6. Verify TOTP│               │
     │                       │    using      │               │
     │                       │    speakeasy  │               │
     │                       └───────┬────┘                  │
     │                               │                      │
     │←─7. Return full tokens───────│                       │
     │   { accessToken,              │                      │
     │     refreshToken,             │                      │
     │     user }                    │                      │
     │                               │                      │
     └─8. Store tokens & redirect─→ Dashboard
```

### 2FA Setup
```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│ Browser │                 │ Backend  │                │ Database │
└────┬────┘                 └────┬─────┘                └────┬─────┘
     │                            │                          │
     │ /setup-2fa page            │                          │
     │ "Get Started"              │                          │
     │─1. POST /api/auth/setup-2fa│                         │
     │    (auth header)           │                          │
     │                            │                          │
     │                   ┌────────┴────────┐                │
     │                   │ Generate TOTP   │                │
     │                   │ secret with     │                │
     │                   │ speakeasy       │                │
     │                   └────────┬────────┘                │
     │                            │                          │
     │                   ┌────────┴────────┐                │
     │                   │ Generate QR code│                │
     │                   │ with qrcode lib │                │
     │                   └────────┬────────┘                │
     │                            │                          │
     │                   ┌────────┴────────┐                │
     │                   │ Generate 8      │                │
     │                   │ backup codes    │                │
     │                   └────────┬────────┘                │
     │                            │                          │
     │←─2. Return──────────────────                         │
     │   { secret,                 │                         │
     │     qrCode (image),         │                         │
     │     backupCodes }           │                         │
     │                             │                         │
     │─3. Display QR code          │                         │
     │─4. Show backup codes        │                         │
     │─5. User scans with app      │                         │
     │─6. User enters 6-digit code │                         │
     │                             │                         │
     │─7. POST /api/auth/confirm-2fa                        │
     │    (token, secret,           │                         │
     │     backupCodes)             │                         │
     │                             │                         │
     │                   ┌─────────┴──────┐                 │
     │                   │ Verify token   │                 │
     │                   │ with speakeasy │                 │
     │                   └─────────┬──────┘                 │
     │                             │                         │
     │                             │─8. Update user──→       │
     │                             │    - 2FA enabled        │
     │                             │    - Store secret       │
     │                             │    - Store codes        │
     │                             │←──────────────          │
     │                             │                         │
     │←─9. Success message─────────                         │
     │   "2FA enabled!"             │                         │
     │                             │                         │
     └──────────────────────────────────────────────────────
```

---

## Data Flow: CAPTCHA

```
Frontend                          Backend                    Google
  │                                 │                          │
  │ 1. User types password          │                          │
  │    & clicks Submit              │                          │
  │                                 │                          │
  │ 2. reCAPTCHA widget             │                          │
  │    analyzes user behavior       │                          │
  │    (mouse, keyboard, etc.)      │                          │
  │                                 │                          │
  │ 3. Get token                    │                          │
  │    (invisible to user)          │                          │
  │                                 │                          │
  │ 4. POST /api/auth/login         │                          │
  │    + captchaToken               │                          │
  │───────────────────────→         │                          │
  │                                 │ 5. POST siteverify       │
  │                                 │    + captchaToken        │
  │                                 │    + secretKey           │
  │                                 │───────────────────────→  │
  │                                 │                          │
  │                                 │ 6. Verify token          │
  │                                 │    Analyze behavior      │
  │                                 │    Return score (0-1)    │
  │                                 │                          │
  │                                 │ ← response:              │
  │                                 │   success: true,         │
  │                                 │   score: 0.9             │
  │                                 │                          │
  │                    7. If score > 0.5 → Login OK           │
  │                       Else → Reject                        │
  │                                 │                          │
  │←─ 8. Response ──────────────────                          │
  │    (Success or Error)           │                          │
  │                                 │                          │
  └─────────────────────────────────┴──────────────────────────
```

---

## Data Flow: 2FA TOTP

```
Frontend                Backend                  Authenticator
  │                       │                           │
  │ User initiates        │                           │
  │ 2FA Setup             │                           │
  │                       │                           │
  │ GET /setup-2fa        │                           │
  │──────────────────────→│                           │
  │                       │                           │
  │            1. Generate secret using speakeasy     │
  │            2. Create QR code from secret          │
  │            3. Generate 8 backup codes             │
  │                       │                           │
  │←─ Response ───────────                           │
  │  secret (base32)      │                           │
  │  qrCode (png)         │                           │
  │  backupCodes (array)  │                           │
  │                       │                           │
  │ User scans QR code    │                           │
  │────────────────────────────────────→              │
  │ (or enters secret manually)                       │
  │                       │                           │
  │ App generates codes   │                           │
  │ every 30 seconds      │                           │
  │ using HMAC-SHA1       │                           │
  │                       │        123456 (current)   │
  │                       │        654321 (next)      │
  │ User reads code:      │        234567 (future)    │
  │ 123456                │                           │
  │                       │                           │
  │ POST /confirm-2fa     │                           │
  │ (token: "123456",     │                           │
  │  secret, codes)       │                           │
  │──────────────────────→│                           │
  │                       │                           │
  │         3. Verify token matches secret            │
  │            using speakeasy.totp.verify()          │
  │            (accepts ±2 time windows)              │
  │                       │                           │
  │         4. If valid:                              │
  │            - Store secret in DB                   │
  │            - Set 2FA enabled flag                 │
  │            - Store backup codes                   │
  │                       │                           │
  │←─ Success ────────────                           │
  │  "2FA enabled!"       │                           │
  │                       │                           │
  └───────────────────────┴───────────────────────────

Next Login:
┌─────────────────────────────────────────────────────┐
│                                                       │
│ 1. User logs in (email/pwd/captcha)                 │
│    Backend returns temp token + requires2FA: true   │
│                                                       │
│ 2. User opens authenticator app                     │
│    Current code: 654321 (generated from stored      │
│    secret using HMAC-SHA1 + time)                   │
│                                                       │
│ 3. User enters code: 654321                         │
│    POST /verify-2fa (token: "654321")               │
│                                                       │
│ 4. Backend verifies:                                │
│    speakeasy.totp.verify({                          │
│      secret: stored_secret,                         │
│      token: "654321",                               │
│      window: 2  ← allows ±2 time windows            │
│    })                                               │
│                                                      │
│ 5. If valid: Grant access tokens                    │
│    If invalid: Reject (try backup code or retry)    │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌────────────────────────────────────────────────────┐
│             Layer 1: CAPTCHA Protection             │
│  Prevents automated attacks & credential stuffing   │
│  Google's risk analysis + invisible detection       │
└────────────┬─────────────────────────────────────┘
             │ ← If fails, stop here
             ↓
┌────────────────────────────────────────────────────┐
│             Layer 2: Email Verification             │
│  Check email exists in database                     │
└────────────┬─────────────────────────────────────┘
             │ ← If fails, stop here
             ↓
┌────────────────────────────────────────────────────┐
│          Layer 3: Password Verification             │
│  Bcrypt comparison (12 rounds)                      │
│  Account lockout after 5 failures                   │
└────────────┬─────────────────────────────────────┘
             │ ← If fails, stop here
             ↓
┌────────────────────────────────────────────────────┐
│     Layer 4: 2FA Verification (if enabled)          │
│  TOTP code verification (±2 time windows)           │
│  Or backup code (single-use)                        │
└────────────┬─────────────────────────────────────┘
             │ ← If fails, stop here
             ↓
┌────────────────────────────────────────────────────┐
│          Layer 5: Session Management                │
│  JWT access tokens (15-min expiry)                  │
│  Refresh tokens (7-day expiry)                      │
│  HttpOnly cookies + Secure flag                     │
└────────────┬─────────────────────────────────────┘
             │
             ↓
        ✓ Full Access
```

---

## File Structure

```
ChatbotBeta/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.js (✓ MODIFIED)
│   │   ├── routes/
│   │   │   └── authRoutes.js (✓ MODIFIED)
│   │   ├── middleware/
│   │   │   └── authenticate.js
│   │   └── utils/
│   │       └── jwt.js
│   ├── .env (✓ MODIFIED)
│   └── package.json
│
├── chatbot-admin/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx (✓ MODIFIED)
│   │   │   └── TwoFASetup.jsx (✓ NEW)
│   │   └── App.jsx (✓ MODIFIED)
│   ├── .env (✓ MODIFIED)
│   └── package.json
│
├── database/
│   └── prisma/
│       └── schema.prisma (✓ MODIFIED)
│
├── 2FA_AND_CAPTCHA_SETUP.md (✓ NEW)
├── IMPLEMENTATION_SUMMARY.md (✓ NEW)
├── QUICK_START_2FA_CAPTCHA.md (✓ NEW)
└── ARCHITECTURE_DIAGRAM.md (✓ THIS FILE)
```

---

**Diagram Created**: 2026-06-26
**System Status**: ✅ Production Ready
