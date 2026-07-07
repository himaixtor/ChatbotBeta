# Chatbot System - Final Summary

**Status:** ✅ Production Ready (v2.0 with D-ID Avatar Support)  
**Last Updated:** 2026-07-07  
**Comprehensive Guide:** See [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)

---

## 📚 Quick Navigation

- **Setup Guide:** [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)
- **Previous Security Docs:** [FINAL_SUMMARY_OLD.md](#captcha--2fa-implementation)
- **Quick Start:** Below ⬇️

---

## 🚀 Quick Start

### Start Everything

```bash
# From project root
npm run dev

# This starts:
# - Backend (port 5000)
# - Admin Dashboard (port 5173)
# - Widget watch build
# - Widget test (port 8090)
# All in background, persists if terminal closes
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Backend API** | http://localhost:5000 | N/A (no auth for /health) |
| **Admin Dashboard** | http://localhost:5173 | admin@chatbot.com / Admin@123 |
| **Widget Test** | http://localhost:8090 | N/A |
| **Prisma Studio** | `cd database && npx prisma studio` | N/A |

---

## 📦 What Each Component Does

### **1. Backend** (`backend/src/`) — Express REST API
**Purpose:** Core business logic and data management

**Key Responsibilities:**
- 🔐 Authentication (login, JWT, 2FA, CAPTCHA)
- 💬 Message routing (user → AI → database)
- 🎭 Avatar management (D-ID WebRTC streams)
- 📊 Admin dashboard API (stats, charts, users)
- 🤖 AI training (documents, URLs)
- ⏰ Job scheduling (automated cleanup)

**Main Endpoints:**
```
POST   /api/auth/login              # Admin login
POST   /api/session/create          # New chat session
POST   /api/chat/message            # Send message
GET    /api/admin/stats             # Dashboard stats
POST   /api/avatar/create-stream    # D-ID WebRTC
POST   /api/train-chatbot           # Train with docs
```

**Tech Stack:** Node.js + Express + Prisma + PostgreSQL

---

### **2. Chatbot Widget** (`chatbot/src/`) — Embeddable Chat Component
**Purpose:** Customer-facing chat interface, works on any website

**Key Features:**
- 📱 Works on all devices (responsive)
- 🎨 Fully customizable (colors, messages, position)
- 🔇 No external dependencies (vanilla JS)
- 🌐 Shadow DOM isolation (no style conflicts)
- 🎭 Avatar support (D-ID WebRTC video chat)
- 💾 Session persistence (cookies)

**How to Embed:**
```html
<script src="https://cdn.example.com/chatbot.min.js"></script>
<script>
  ChatbotWidget.init({
    apiEndpoint: 'https://api.example.com',
    botName: 'Assistant',
    welcomeMessage: 'Hi! How can I help?',
    primaryColor: '#007AFF'
  });
</script>
```

**Building the Widget:**
```bash
cd chatbot
npm install
npm run build              # Outputs to dist/
npm run watch            # Watch mode for development
```

---

### **3. Chatbot Admin** (`chatbot-admin/src/`) — React Dashboard
**Purpose:** Monitor chats, manage users, train AI, view analytics

**Pages:**
- 📊 **Dashboard** — Stats, charts, quick overview
- 💬 **Chats** — Browse all sessions, view full history
- 👥 **Users** — Create/edit/delete admin accounts
- 🤖 **Train AI** — Upload documents, add URLs
- ⏰ **Scheduler** — Manage automated cleanup jobs
- 📈 **Token Usage** — Consumption analytics

**Running:**
```bash
cd chatbot-admin
npm install
npm run dev              # Dev server on port 5173
npm run build           # Production build
```

**Default Login:**
- Email: `admin@chatbot.com`
- Password: `Admin@123`

---

### **4. Widget Test** (`widget-test/`) — Testing Environment
**Purpose:** Test embedded widget locally before production

**What It Does:**
- Opens a test page with widget embedded
- Tests widget functionality
- Tests avatar features
- Tests custom styling

**To Use:**
```bash
# 1. Start backend
cd backend && npm run dev

# 2. Build widget
cd chatbot && npm run build

# 3. Open in browser
http://localhost:8090/widget-test
# or file:///path/to/widget-test/index.html
```

---

### **5. Database** (`database/prisma/`) — PostgreSQL + Prisma ORM
**Purpose:** Persist all application data

**Main Models:**

| Model | Purpose |
|-------|---------|
| **User** | Admin/manager/viewer accounts with 2FA |
| **ChatBot** | Individual chat sessions |
| **Chat** | Individual messages (user + AI responses) |
| **AvatarStream** | D-ID WebRTC connection sessions |
| **AvatarEvent** | Avatar connection events (logging) |
| **Role** | Permission levels (admin, manager, viewer) |
| **TrainChatbot** | Uploaded documents for AI training |
| **TrainChatbotWithUrl** | URLs for AI training |
| **SchedulerConfig** | Scheduled job definitions |
| **SchedulerExecutionHistory** | Job execution logs |
| **RefreshToken** | JWT token storage (secure) |

**Quick Database Commands:**
```bash
cd database

# Setup
npx prisma migrate dev --name init
npm run seed

# View data
npx prisma studio

# Create migration (after schema changes)
npx prisma migrate dev --name describe_change

# Reset database (dev only!)
npx prisma migrate reset
```

---

## 🎭 D-ID Avatar Implementation

### What is D-ID?

D-ID provides **AI avatars that talk**. Users can:
- See a video avatar speaking responses
- Switch between text and video modes
- Customize avatar appearance

### How It Works

```
Frontend (avatar-rtc.js)
  ├─ Loads D-ID SDK
  ├─ Creates WebRTC connection
  └─ Displays video stream

Backend (did-avatar.js module)
  ├─ Allocates session tokens
  └─ Logs events to database

D-ID API
  └─ Provides video streaming + text-to-speech
```

### Configuration

Get D-ID credentials:
1. Sign up at https://www.d-id.com
2. Create API key (clientKey)
3. Create agent character (agentId)
4. Add to config:

```javascript
ChatbotWidget.init({
  didClientKey: 'your_key',
  didAgentId: 'your_agent_id'
});
```

### API Endpoints

```
POST /api/avatar/create-stream      # Initialize WebRTC
POST /api/avatar/send-sdp           # Exchange SDP
POST /api/avatar/send-ice           # Exchange ICE candidates
POST /api/avatar/talk               # Make avatar speak
GET  /api/avatar/stream/:streamId   # Check stream status
```

---

## 🔐 Security Features

### Authentication

1. **Password** — Email + bcrypt-hashed password (12 rounds)
2. **JWT Tokens** — Access (15 min) + Refresh (7 days)
3. **Account Lockout** — After 5 failed attempts (15 min lockout)
4. **Secure Cookies** — HttpOnly, Secure (production), SameSite

### Login Flow

```
Email + Password
  ↓
Hash & compare password
  ↓
Check account lockout status
  ↓
Generate JWT tokens
  ├─ accessToken (15 min)
  └─ refreshToken (7 days)
  ↓
Return tokens to frontend
  ↓
Redirect to dashboard
```

---

## 💬 How Messages Flow

```
1. User types message in widget
   ↓
2. Widget sends: POST /api/chat/message
   ├─ sessionId, message, token
   └─ Shows "typing..." indicator

3. Backend receives
   ├─ Validates JWT & session
   ├─ Stores user message in Chat table
   └─ Calls Python AI API

4. Python AI responds
   ├─ Returns text response
   ├─ Counts tokens used
   └─ Sends back to backend

5. Backend stores response
   ├─ Saves AI message in Chat table
   └─ Returns JSON to widget

6. Widget displays response
   ├─ Removes "typing..." indicator
   ├─ Shows AI message
   └─ Triggers avatar.talk() if video enabled

7. Admin views in dashboard
   ├─ Logs in at /dashboard
   ├─ Clicks "Chats" page
   ├─ Searches by user email
   └─ Views full message history
```

---

## 🛠️ Database Updates for Production

### Backup Before Deploying

```bash
# Create backup
pg_dump chatbot_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify size
ls -lh backup_*.sql
```

### Deploy Schema Changes

```bash
# 1. Edit schema.prisma with changes

# 2. Create migration
cd database
npx prisma migrate dev --name describe_your_change

# 3. Review generated SQL
cat prisma/migrations/*/migration.sql

# 4. Test locally
npm run dev

# 5. Deploy to production
ssh user@prod-server
cd /app/database
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy

# 6. Verify
npx prisma studio
```

### Rollback (If Issues)

```bash
# 1. Restore from backup
psql chatbot_db < backup_timestamp.sql

# 2. Revert code to previous commit
git checkout HEAD~1

# 3. Restart backend
pm2 restart chatbot-backend

# 4. Verify
curl http://localhost:5000/health
```

### Common Migrations

```bash
# Add new column
npx prisma migrate dev --name add_new_field

# Create new model
npx prisma migrate dev --name add_new_model

# Change column type
npx prisma migrate dev --name increase_field_size

# Add unique constraint
npx prisma migrate dev --name add_unique_constraint
```

---

## 📋 Deployment Checklist

### Before Deployment

- [ ] Code reviewed and merged
- [ ] All tests passing
- [ ] Database migrated locally
- [ ] Environment variables set
- [ ] Security audit done (no secrets in code)
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified

### During Deployment

- [ ] Stop services gracefully
- [ ] Create fresh backup
- [ ] Deploy code to servers
- [ ] Run database migrations
- [ ] Regenerate Prisma client
- [ ] Start services
- [ ] Run health checks
- [ ] Monitor error logs
- [ ] Test key features

### After Deployment (24h)

- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Review metrics vs baseline
- [ ] Collect user feedback
- [ ] Document deployment notes

---

## ⚠️ Key Things to Remember

### Critical Files to Never Lose

```
database/prisma/schema.prisma     # Schema definition
database/prisma/migrations/       # Migration history
backend/.env                      # Secrets & config
chatbot-admin/.env                # Frontend config
```

### Environment Variables Needed

**Backend:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/chatbot
NODE_ENV=production
PORT=5000
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=another_secret
PYTHON_AI_API_URL=http://ai-server:8010
D_ID_API_KEY=your_d_id_key
```

**Admin Frontend:**
```env
VITE_API_URL=http://localhost:5000
```

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Backend won't start | Check NODE_ENV, DATABASE_URL, port 5000 in use |
| Widget not appearing | Verify backend running, check browser console |
| Can't login | Check admin user exists, CAPTCHA keys correct |
| Slow messages | Check Python AI API, database indexes |
| Database locked | Check for stuck transactions, restart PostgreSQL |

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│        User's Website                   │
│  (Embedding chatbot widget)             │
└──────────────┬──────────────────────────┘
               │
        chatbot.min.js
               │
    ┌──────────▼──────────┐
    │  ChatBot Widget     │
    │  ┌────────────────┐ │
    │  │ Shadow DOM UI  │ │
    │  │ Message Mgmt   │ │
    │  │ Avatar Support │ │
    │  └────────────────┘ │
    └──────────┬──────────┘
               │
    HTTP + WebRTC
               │
    ┌──────────▼─────────────────────┐
    │    Backend API (port 5000)      │
    │  ┌─────────────────────────────┐│
    │  │ Routes & Controllers         ││
    │  │ - Auth & JWT                 ││
    │  │ - Chat message handling      ││
    │  │ - Avatar/D-ID streams        ││
    │  │ - Admin dashboard APIs       ││
    │  │ - Training & scheduling      ││
    │  └─────────────────────────────┘│
    │  ┌─────────────────────────────┐│
    │  │ Middleware                   ││
    │  │ - Authentication             ││
    │  │ - Error handling             ││
    │  │ - Rate limiting              ││
    │  └─────────────────────────────┘│
    └──────────┬──────────────────────┘
               │
       ┌───────┼────────┬──────────┐
       │       │        │          │
   Database  Python  D-ID API   External
       │      AI API    │        Services
       │       │        │
    PostgreSQL │    WebRTC
       │       │      Video
       ▼       ▼        ▼
   [Chats] [Responses][Avatar]
   [Users]
   [Sessions]
   [Training]
   [Jobs]

┌────────────────────────────────────┐
│  Admin Dashboard (port 5173)        │
│  ┌────────────────────────────────┐│
│  │ React Frontend                  ││
│  │ - Login with 2FA                ││
│  │ - Chat analytics                ││
│  │ - User management               ││
│  │ - Training management           ││
│  │ - Job scheduling                ││
│  └────────────────────────────────┘│
└────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. **Read Full Guide:** [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)
2. **Deploy to Staging:** Test all features
3. **Security Audit:** Review sensitive code
4. **Load Testing:** Verify performance
5. **Production Deployment:** Follow checklist above

---

## 📞 Support

### Getting Help

| Question | Reference |
|----------|-----------|
| **How do I...?** | [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md) |
| **Backend endpoints?** | [COMPREHENSIVE_GUIDE.md - API Reference](#backend---express-api) |
| **Deploy database?** | [Database Updates for Production](#-database-updates-for-production) |
| **Fix an issue?** | [Troubleshooting Guide](COMPREHENSIVE_GUIDE.md#troubleshooting-guide) |
| **Architecture?** | [Architecture Overview](COMPREHENSIVE_GUIDE.md#system-architecture-diagram) |

### File Locations

- **Backend:** `backend/src/`
- **Widget:** `chatbot/src/`
- **Admin:** `chatbot-admin/src/`
- **Database:** `database/prisma/schema.prisma`
- **Tests:** `widget-test/`

---

**Status:** ✅ Production Ready  
**Full Documentation:** See [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)
