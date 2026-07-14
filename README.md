# ChatBot Project

Full-stack AI chatbot system with an embeddable widget, admin dashboard, license management, avatar support (D-ID), role-based access control, AI training, token usage tracking, and multi-environment license validation.

## 📋 Project Structure

| Folder | Description |
|--------|-------------|
| `database/` | PostgreSQL + Prisma ORM, schema migrations, seed data |
| `backend/` | Express.js REST API with auth, chat, admin, scheduler, license, avatar, AI training |
| `chatbot/` | Vanilla JavaScript embeddable widget (webpack) |
| `chatbot-admin/` | React + Vite admin dashboard for managing chats, users, licenses, scheduler jobs, AI training |
| `widget-test/` | Test page for widget integration |
| `scripts/` | Automation scripts for starting/stopping all services |

## 🚀 Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ (with psql/pgAdmin for management)
- **npm** 8+

## 📦 Installation & Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd D:\Projects\ChatbotBeta
npm install
```

### 2. Database Setup

```bash
cd database
cp .env.example .env
# Edit DATABASE_URL in .env with your PostgreSQL connection
# Example: postgresql://postgres:password@localhost:5432/chatbot_db

npm install
npx prisma migrate dev --name init
npm run seed
```

This creates all tables and seeds default roles + admin user.

### 3. Backend Setup

```bash
cd ../backend
cp .env.example .env
# Edit .env with your database URL and JWT secrets
npm install
npm run prisma:generate
```

### 4. Chatbot Widget Setup

```bash
cd ../chatbot
npm install
npm run build
# or `npm run dev` for watch mode
```

### 5. Admin Portal Setup

```bash
cd ../chatbot-admin
cp .env.example .env
npm install
```

### 6. Widget Test Setup

```bash
cd ../widget-test
npm install
```

## ▶️ Running the Project

### Option A: Run Everything (Recommended for Demo)

From the project root:

```bash
npm run dev
```

This starts **all services** in detached background processes:
- **Backend** → `http://localhost:5000`
- **Chatbot Admin** → `http://localhost:5173`
- **Widget Test** → `http://localhost:8090`
- **Chatbot Widget** → watch build

Logs saved to `.runtime/logs/`

Useful commands:
```bash
npm run status   # Show running services
npm run kill     # Stop all services
```

### Option B: Run Individual Services

**Backend:**
```bash
cd backend
npm run dev
```

**Admin Portal:**
```bash
cd chatbot-admin
npm run dev
```

**Widget Build:**
```bash
cd chatbot
npm run dev
```

**Widget Test Server:**
```bash
cd widget-test
npm install && node index.js
```

## 🔐 Default Credentials

| Component | Email | Password |
|-----------|-------|----------|
| Admin Portal | `admin@chatbot.com` | `Admin@123` |

## 👥 User Roles & Permissions

| Role | View Chats | Download | Manage Users | Dashboard | AI Training | Token Usage | Scheduler | License |
|------|-----------|----------|--------------|-----------|------------|------------|----------|---------|
| **super_admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **admin** | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| **manager** | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **viewer** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

### Create Additional Users

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"manager@chatbot.com",
    "password":"Manager@123",
    "name":"Manager User",
    "role":"manager"
  }'
```

## 🎯 Core Features

### 1. **Chat Management**
- Real-time widget chat sessions with unique session IDs
- Full chat history with timestamps and message ordering
- File attachment support (images, PDFs, documents)
- Lead generation tracking and conversation metadata
- Multi-language support (English, Hindi, Gujarati)
- Session expiry management with automatic cleanup
- Message encryption at rest (configurable)
- Conversation export and filtering
- Message masking for PII data (optional)

### 2. **Admin Dashboard**
Complete admin portal with the following pages:
- **Dashboard** — Chat analytics, user statistics, daily activity charts, language breakdown
- **Chats** — View all chat sessions, filter by date/status, full conversation viewer with attachments
- **Users** — User management (create, edit, deactivate), role assignment, status tracking
- **Scheduler** — View and manage automated cron jobs, execution history, job configuration
- **Train AI** — Upload training documents (PDF, images, documents), manage URL-based training, toggle training data active/inactive
- **Token Usage** — Real-time token consumption tracking, billing summary, usage analytics
- **License Management** — Upload/validate licenses, check license expiry, manage license files
- **License Activation** — Activate licenses with hardware fingerprinting verification
- Role-based access control with permissions per page
- Download chat history as CSV

### 3. **AI Training**
- **Document-based training** — Upload PDF, images, Word documents for knowledge base
- **URL-based training** — Add URLs for web-based content ingestion
- **Active/Inactive management** — Toggle training data availability without deletion
- **Token tracking** — Monitor token usage per training session
- **Training metadata** — Track upload date, file size, training status
- **Bulk operations** — Manage multiple training documents with filtering

### 4. **Avatar Support (D-ID Integration)**
- **WebRTC streaming** — Real-time video avatar conversations
- **Multiple avatar modes** — Text-based, video-based, audio-based responses
- **Stream session management** — Create, maintain, and terminate avatar streams
- **Event logging** — Detailed event logs for troubleshooting and analytics
- **Avatar configuration** — Customizable presenters and stream settings
- **Error handling** — Graceful fallback when avatar service unavailable

### 5. **Chatbot Widget**
- **Embeddable widget** — Works on any website with simple script tag
- **Customizable appearance** — Colors, bot name, welcome message, branding
- **Session persistence** — Maintain conversation across page refreshes
- **Responsive design** — Mobile, tablet, and desktop optimized
- **CORS-enabled** — Cross-origin requests with credential handling
- **Position options** — Bottom-right, bottom-left, top-right positioning
- **Auto-initialization** — Simple configuration object for setup
- **Message formatting** — Support for rich text, links, code blocks
- **Sound notifications** — Optional audio alerts for new messages (configurable)

### 6. **Scheduler System**
- **Cron job management** — Create and configure automated tasks
- **Automated cleanup** — Expired session removal on schedule
- **Welcome message scheduling** — Timed message delivery to users
- **Execution history** — Detailed logs of all job executions
- **Job monitoring** — Real-time job status and last execution time
- **Error tracking** — Failed job notifications and retry logic
- **Flexible scheduling** — Standard cron syntax support
- **Admin interface** — View, create, edit, and delete scheduled jobs

### 7. **License Management System**
- **Multi-environment support** — Separate licenses for dev, staging, production
- **Hardware fingerprinting** — Device-based license binding for security
- **License tampering detection** — Hash verification and digital signatures
- **User limits enforcement** — Restrict concurrent admin and regular users
- **Token usage billing** — Track and limit token consumption
- **XML-based validation** — Standard license format with encryption
- **License expiry management** — Automatic warnings and enforcement
- **Activation workflow** — Simple activation process with license files
- **License info dashboard** — View license status, usage, expiry dates
- **Debug utilities** — Read/update license files for troubleshooting (Super Admin only)

### 8. **User & Role Management**
- **Multiple roles** — Super Admin, Admin, Manager, Viewer
- **Role-based permissions** — Fine-grained control per feature
- **User creation** — Admin can create new users with roles
- **User deactivation** — Soft-delete users without losing data
- **Role assignment** — Change user roles after creation
- **Permission dashboard** — View permissions per role
- **User list management** — Filter, search, and manage users
- **Status tracking** — Active/inactive user status

### 9. **Authentication & Authorization**
- **JWT authentication** — Secure token-based authentication
- **Refresh token rotation** — Automatic token refresh mechanism
- **Session management** — Cookie and header-based session storage
- **Login endpoint** — Email/password authentication
- **Registration endpoint** — Create new admin users (admin only)
- **Logout endpoint** — Secure logout with token invalidation
- **Permission validation** — Route and resource-level permission checks
- **Token expiry** — Configurable token lifetime

### 10. **Security Features**
- **JWT with RS256** — Asymmetric key signing for tokens
- **Bcrypt hashing** — 12-round password hashing
- **Rate limiting** — Endpoint-level rate limiting on auth routes
- **CORS protection** — Dynamic origin validation with private LAN support
- **Helmet.js security headers** — CSP, X-Frame-Options, X-Content-Type-Options
- **Account lockout** — Lockout after 5 failed login attempts
- **SQL injection prevention** — Prisma ORM parameterized queries
- **XSS protection** — HTML entity encoding and CSP
- **File upload validation** — MIME type and file size checks
- **License validation** — Tamper detection and signature verification
- **Hardware fingerprinting** — Device-based license binding

### 11. **Analytics & Monitoring**
- **Dashboard statistics** — Total chats, users, messages, daily activity
- **Daily activity charts** — Visual representation of chat volume
- **Language breakdown** — Pie charts of language distribution
- **Token usage analytics** — Real-time and historical token consumption
- **User analytics** — Active users, new registrations, user engagement
- **Chat analytics** — Message count, attachment stats, session duration
- **Scheduled job monitoring** — Job execution history and success rates

### 12. **API Integration**
- **Weather API** — Integration for weather-related queries
- **Python AI Service** — Optional integration with external AI services
- **Mock AI mode** — Built-in responses for testing without external AI
- **REST API** — Full REST endpoints for all operations
- **Error handling** — Comprehensive error responses with proper HTTP codes
- **Logging** — All API calls logged for debugging and auditing

### 13. **Data Management**
- **Chat export** — Download conversations as CSV
- **File management** — Store and retrieve attachments
- **Session cleanup** — Automatic expiration of old sessions
- **Data retention** — Configurable retention policies
- **Soft deletes** — User deactivation without data loss
- **Backup support** — Database-level backup capability

## 🌐 Widget Integration

### Embed in Your Website

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Site</title>
</head>
<body>
  <h1>Welcome</h1>
  
  <!-- Chatbot widget script -->
  <script src="http://localhost:5000/chatbot.min.js"></script>
  <script>
    ChatbotWidget.init({
      apiEndpoint: 'http://localhost:5000',
      botName: 'Support Bot',
      welcomeMessage: 'Hi! How can I help you today?',
      primaryColor: '#3B82F6',
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

## 📡 Backend API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` — Admin user login (returns JWT & refresh token)
- `POST /api/auth/register` — Create new admin user (admin only)
- `POST /api/auth/logout` — Logout user and invalidate refresh token
- `POST /api/auth/refresh` — Refresh JWT token using refresh token

### Session Management Endpoints
- `POST /api/session/create` — Create new widget chat session
- `GET /api/session/:session_id` — Get session details
- `PUT /api/session/:session_id` — Update session (e.g., language, metadata)
- `DELETE /api/session/:session_id` — Close/delete session

### Chat Endpoints
- `POST /api/chat/message` — Send message and get AI response
- `GET /api/chat/history/:session_id` — Get paginated chat history
- `GET /api/chat/history/:session_id/export` — Export chat as CSV
- `DELETE /api/chat/:message_id` — Delete specific message
- `GET /api/chat/:session_id/attachments` — List attachments in chat

### Admin Dashboard Endpoints
- `GET /api/admin/stats` — Get dashboard statistics (total chats, users, messages)
- `GET /api/admin/chats` — List all chats with pagination and filtering
- `GET /api/admin/chats/:session_id` — Get full chat details with all messages
- `GET /api/admin/chats/:session_id/export` — Export specific chat as CSV
- `GET /api/admin/analytics/daily-activity` — Get daily chat activity data
- `GET /api/admin/analytics/language-breakdown` — Get language distribution stats

### User Management Endpoints
- `GET /api/users` — List all admin users with pagination
- `POST /api/users` — Create new admin user
- `GET /api/users/:uid` — Get specific user details
- `PUT /api/users/:uid` — Update user (name, email, role, status)
- `DELETE /api/users/:uid` — Deactivate user (soft delete)
- `PUT /api/users/:uid/activate` — Reactivate deactivated user
- `PUT /api/users/:uid/role` — Change user role

### Role Management Endpoints
- `GET /api/roles` — List all roles with permissions
- `POST /api/roles` — Create custom role
- `GET /api/roles/:role_id` — Get specific role details
- `PUT /api/roles/:role_id` — Update role permissions
- `DELETE /api/roles/:role_id` — Delete custom role
- `GET /api/roles/permissions/all` — List all available permissions

### AI Training Endpoints
- `POST /api/train-chatbot` — Upload training document (PDF, images, files)
- `GET /api/train-chatbot` — List all training documents
- `GET /api/train-chatbot/:doc_id` — Get training document details
- `PUT /api/train-chatbot/:doc_id` — Toggle document active/inactive
- `DELETE /api/train-chatbot/:doc_id` — Delete training document
- `POST /api/train-chatbot-url` — Add URL-based training data
- `GET /api/train-chatbot-url` — List all URL training sources
- `PUT /api/train-chatbot-url/:url_id` — Update URL training (status, active)
- `DELETE /api/train-chatbot-url/:url_id` — Delete URL training source

### Avatar (D-ID) Endpoints
- `POST /api/avatar/create-stream` — Initialize D-ID avatar stream
- `POST /api/avatar/talk` — Send talk command to avatar
- `POST /api/avatar/stop-stream` — Stop active avatar stream
- `GET /api/avatar/stream/:stream_id` — Get stream status and info
- `GET /api/avatar/streams` — List all active streams
- `GET /api/avatar/events/:stream_id` — Get stream event history

### Scheduler Endpoints
- `GET /api/scheduler/config` — List all scheduled jobs
- `POST /api/scheduler/config` — Create new scheduled job
- `GET /api/scheduler/config/:job_id` — Get specific job details
- `PUT /api/scheduler/config/:job_id` — Update job configuration
- `DELETE /api/scheduler/config/:job_id` — Delete scheduled job
- `GET /api/scheduler/history` — Get job execution history
- `GET /api/scheduler/history/:job_id` — Get execution history for specific job
- `POST /api/scheduler/run/:job_id` — Manually trigger job execution

### License Management Endpoints
- `POST /api/license/upload` — Upload license file (.xml)
- `GET /api/license/validate` — Validate current license
- `GET /api/license/info` — Get license details (expiry, limits, environment)
- `GET /api/license/status` — Check license status (active/expired/invalid)
- `POST /api/license/activate` — Activate uploaded license
- `GET /api/license/hardware-fingerprint` — Get device hardware fingerprint
- `POST /api/license/verify-fingerprint` — Verify license fingerprint match

### Token Usage Endpoints
- `GET /api/token-usage` — Get token usage statistics
- `GET /api/token-usage/summary` — Get token usage summary
- `GET /api/token-usage/daily` — Get daily token usage breakdown
- `GET /api/token-usage/per-chat` — Get token usage per chat session

### Weather Endpoints
- `GET /api/weather/forecast` — Get weather forecast data
- `GET /api/weather/current` — Get current weather data

### Health & System Endpoints
- `GET /health` — API health status check
- `GET /api/system/info` — System information and version
- `GET /api/system/logs` — Recent system logs (admin only)
- `GET /api/system/metrics` — System performance metrics

## 🤖 AI Integration

The backend supports two AI modes:

### Mode 1: Mock AI (Default)
Returns hardcoded responses for testing. Enable by default.

### Mode 2: Python AI Service
Set `PYTHON_AI_API_URL` in `.env`:
```
PYTHON_AI_API_URL=http://your-server:8010/api/v1/chat
PYTHON_AI_TIMEOUT_MS=120000
```

Send test message via:
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "message_text": "Hello"
  }'
```

## 📊 Database Schema & Architecture

### Core Tables
- **User** — Admin user accounts with timestamps
  - Fields: id, email, name, password_hash, role, is_active, created_at, updated_at
  - Indexes: email (unique), role, is_active
  
- **Role** — Role definitions with permission sets
  - Fields: id, name, description, permissions (JSON), created_at
  - Pre-defined roles: super_admin, admin, manager, viewer
  
- **RefreshToken** — JWT refresh token management
  - Fields: id, user_id, token, expires_at, created_at
  - Used for token rotation and session management

- **ChatBot** — Chat session records
  - Fields: id, session_id (unique), language, metadata (JSON), created_at, updated_at, expires_at
  - Indexes: session_id, created_at, expires_at

- **Chat** — Individual messages in conversations
  - Fields: id, session_id (FK), sender (user/bot), message_text, attachments (JSON), created_at
  - Indexes: session_id, created_at

- **License** — License validation and management
  - Fields: id, environment, license_key, version, is_active, expires_at, user_limits, admin_limits, token_limits, created_at
  - Indexes: is_active, expires_at, environment

### Training Tables
- **TrainChatbot** — Document-based training data
  - Fields: id, file_name, file_path, file_type (pdf/image/document), file_size, tokens_used, is_active, created_at, updated_at
  - Indexes: is_active, created_at

- **TrainChatbotWithUrl** — URL-based training sources
  - Fields: id, url, title, description, tokens_used, is_active, last_fetched_at, created_at, updated_at
  - Indexes: is_active, created_at

### Avatar Tables
- **AvatarStream** — D-ID WebRTC stream sessions
  - Fields: id, session_id (FK), stream_id, presenter_id, status, created_at, updated_at, ended_at
  - Indexes: session_id, stream_id, status

- **AvatarEvent** — Stream event and error logging
  - Fields: id, stream_id (FK), event_type, event_data (JSON), created_at
  - Indexes: stream_id, event_type, created_at

### Scheduler Tables
- **SchedulerConfig** — Scheduled job configuration
  - Fields: id, name, description, cron_expression, job_type, config (JSON), is_active, created_at, updated_at
  - Indexes: is_active, job_type

- **SchedulerExecutionHistory** — Job execution records
  - Fields: id, job_id (FK), executed_at, status (success/failed/pending), result (JSON), error_message, duration_ms
  - Indexes: job_id, executed_at, status

### Database Relationships
```
User 1-→ Many RefreshToken
User 1-→ Many Chat (as admin reference)
Role 1-→ Many User
ChatBot 1-→ Many Chat
ChatBot 1-→ Many AvatarStream
AvatarStream 1-→ Many AvatarEvent
SchedulerConfig 1-→ Many SchedulerExecutionHistory
```

## 🔧 Configuration & Environment Variables

### Backend `.env` (Complete Reference)
```env
# Core Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot_db
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRY=3600000                    # JWT expiry in milliseconds (1 hour)
JWT_REFRESH_EXPIRY=604800000           # Refresh token expiry (7 days)

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:8090,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8090

# Session Configuration
SESSION_EXPIRY_HOURS=24                # Session expiry in hours
SESSION_CLEANUP_CRON=0 2 * * *        # Cleanup schedule (2 AM daily)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000            # 15 minutes
RATE_LIMIT_MAX_REQUESTS=5              # Max auth attempts in window

# D-ID Avatar Configuration (Optional)
DID_API_BASE_URL=https://api.d-id.com
DID_USERNAME=your-username
DID_PASSWORD=your-password
DID_PRESENTER_ID=your-presenter-id

# Python AI Service (Optional - for external AI)
PYTHON_AI_API_URL=http://your-server:8010/api/v1/chat
PYTHON_AI_TIMEOUT_MS=120000            # 2 minutes timeout

# reCAPTCHA Integration (Optional)
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RECAPTCHA_ENABLED=false

# File Upload Configuration
MAX_FILE_SIZE=10485760                 # 10 MB in bytes
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,gif,doc,docx,txt
UPLOAD_DIR=./uploads

# Logging Configuration
LOG_LEVEL=info                         # debug, info, warn, error
LOG_DIR=./.runtime/logs

# License Configuration
LICENSE_DIR=./.runtime/licenses
LICENSE_VALIDATION_ENABLED=true
LICENSE_HARDWARE_FINGERPRINT_REQUIRED=true
LICENSE_TAMPER_DETECTION_ENABLED=true

# Security Headers
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@chatbot.com
EMAIL_NOTIFICATIONS_ENABLED=false
```

### Admin Portal `.env`
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ChatBot Admin
VITE_LOG_LEVEL=info
```

### Database `.env`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot_db
```

### Widget Configuration (JavaScript)
```javascript
ChatbotWidget.init({
  apiEndpoint: 'http://localhost:5000',      // Backend URL
  botName: 'Support Bot',                     // Display name
  welcomeMessage: 'Hi! How can I help?',      // Initial greeting
  primaryColor: '#3B82F6',                    // Theme color
  secondaryColor: '#1E40AF',                  // Secondary theme
  position: 'bottom-right',                   // bottom-right, bottom-left, top-right
  enableNotifications: true,                  // Sound/browser notifications
  enableFileUpload: true,                     // Allow file attachments
  maxFileSize: 10485760,                      // Max file size (10 MB)
  supportedLanguages: ['en', 'hi', 'gu'],    // Available languages
  theme: 'light',                             // light or dark
  debugMode: false,                           // Enable debugging
  sessionTimeout: 3600000,                    // Session expiry (1 hour)
  autoReconnect: true,                        // Auto reconnect on disconnect
  enableTypingIndicator: true,                // Show typing indicator
  enableReadReceipt: true                     // Show message read status
});
```

### Advanced Configuration Examples

#### Enable Python AI Integration
```env
PYTHON_AI_API_URL=http://localhost:8010/api/v1/chat
PYTHON_AI_TIMEOUT_MS=120000
NODE_ENV=production
```

#### Enable reCAPTCHA on Login
```env
RECAPTCHA_ENABLED=true
RECAPTCHA_SECRET_KEY=your-secret-from-google
```

#### Configure Email Notifications
```env
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

#### Production Security Settings
```env
NODE_ENV=production
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true
HELMET_HSTS_MAX_AGE=31536000
RATE_LIMIT_MAX_REQUESTS=3
LICENSE_VALIDATION_ENABLED=true
LICENSE_HARDWARE_FINGERPRINT_REQUIRED=true
```

## 📊 Admin Dashboard Pages Reference

### Dashboard Page
- **Statistics overview** — Total chats, total users, total messages, today's chats
- **Daily activity chart** — Line chart showing chat volume over past 7-14 days
- **Language breakdown** — Pie chart showing distribution of languages used
- **Quick stats cards** — At-a-glance metrics with icons
- **Refresh controls** — Auto-refresh or manual refresh of data

### Chats Page
- **Chat list** — Paginated list of all chat sessions
- **Filters** — Filter by date range, language, status
- **Search** — Search chats by session ID or user name
- **View details** — Click to open full conversation in modal
- **Chat viewer modal** — Display all messages, timestamps, attachments
- **Export chat** — Download individual chat as CSV
- **Delete chat** — Remove chat from system
- **Bulk actions** — Select and export multiple chats

### Users Page
- **User list** — All admin users with pagination
- **Create user** — Add new admin user with role assignment
- **Edit user** — Update user name, email, role
- **Deactivate user** — Soft-delete user (data preserved)
- **Activate user** — Reactivate deactivated users
- **Role assignment** — Assign/change user roles
- **Status indicator** — Show active/inactive status

### Scheduler Page
- **Job list** — All scheduled cron jobs with status
- **Job details** — View job configuration and last execution
- **Create job** — Add new scheduled job with cron expression
- **Edit job** — Modify job schedule and configuration
- **Execute now** — Manually trigger job execution
- **Execution history** — View all past executions and results
- **Delete job** — Remove scheduled job

### Train AI Page
- **Document training** — Upload PDF, images, documents for knowledge base
- **URL training** — Add URLs for training data ingestion
- **Active/Inactive** — Toggle training data availability
- **Document list** — View all training documents with metadata
- **Training status** — Show processing status and token usage
- **Delete training** — Remove training documents/URLs
- **Bulk upload** — Upload multiple documents at once

### Token Usage Page
- **Usage summary** — Total tokens used, daily average, billing info
- **Daily breakdown** — Day-by-day token consumption chart
- **Per-chat usage** — Token usage per conversation
- **Usage trends** — Historical token usage graph
- **Billing info** — Token costs and limits
- **Export report** — Download usage report as CSV

### License Management Page
- **License status** — Current license status and validity
- **License info** — Environment (dev/staging/prod), expiry date, version
- **User limits** — Current admin and user limits
- **Token limits** — Token usage limits and current usage
- **Upload license** — Replace existing license file
- **License validation** — Check license validity and tamper detection
- **Expiry warning** — Visual warning if license expiring soon

### License Activation Page
- **Activate license** — Upload and activate license file
- **Hardware fingerprint** — Display device fingerprint for license binding
- **Verify activation** — Confirm license activation status
- **Error messages** — Clear error messages if activation fails

### Read/Update License File (Debug - Super Admin Only)
- **License file viewer** — Display current license XML content
- **Edit license** — Modify license file directly (careful!)
- **Update license** — Save changes to license file
- **Hardware info** — View device fingerprint details
- **Validation test** — Test license validation logic

## 🧪 Testing & Verification

### Test Widget in Browser
1. Go to `http://localhost:8090`
2. Chat widget should appear bottom-right
3. Type a message and verify response appears
4. Upload file attachment (test with image)
5. Check multi-language support (English, Hindi, Gujarati)
6. Verify session persists on page refresh
7. Check responsive design on mobile view

### Test Admin Dashboard
1. Navigate to `http://localhost:5173`
2. Login with default credentials: `admin@chatbot.com` / `Admin@123`
3. **Verify each page loads correctly:**
   - Dashboard: Check stats and charts load
   - Chats: View chat list and open conversation details
   - Users: Create new user, assign roles
   - Scheduler: View jobs and execution history
   - Train AI: Upload training document
   - Token Usage: Check token tracking
   - License Management: Verify license info displays
4. **Test role permissions:**
   - Login as manager user: Should not see "License Management"
   - Login as viewer: Should only see dashboard and chats
5. **Test file operations:**
   - Upload PDF to Train AI
   - Download chat as CSV
   - Export token usage report

### Test API with cURL
```bash
# 1. Create session for widget
curl -X POST http://localhost:5000/api/session/create \
  -H "Content-Type: application/json"

# 2. Send message to chatbot
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id",
    "message_text": "Hello bot"
  }'

# 3. Get chat history
curl -X GET http://localhost:5000/api/chat/history/your-session-id

# 4. Admin login (get JWT)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@chatbot.com",
    "password": "Admin@123"
  }'

# 5. Get admin stats (requires JWT)
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. Get all chats
curl -X GET http://localhost:5000/api/admin/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 7. List users
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 8. Create new user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "manager@chatbot.com",
    "password": "Manager@123",
    "name": "Manager User",
    "role": "manager"
  }'

# 9. Upload training document
curl -X POST http://localhost:5000/api/train-chatbot \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf"

# 10. Get token usage
curl -X GET http://localhost:5000/api/token-usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 11. Check license status
curl -X GET http://localhost:5000/api/license/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 12. Get scheduled jobs
curl -X GET http://localhost:5000/api/scheduler/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Integration Test Scenarios
1. **End-to-end chat flow**
   - Create session → Send message → View in admin dashboard
2. **User management flow**
   - Create new user → Login with new credentials → Verify permissions
3. **License validation flow**
   - Upload license → Activate → Verify license info displays
4. **Scheduler flow**
   - Create job → Execute manually → Check execution history
5. **AI training flow**
   - Upload document → Verify in training list → Toggle active/inactive
6. **Permission flow**
   - Change user role → Verify menu items update → Verify API blocks unauthorized access

## 🔐 Security Features

✅ JWT authentication with expiry  
✅ Refresh token rotation  
✅ Bcrypt password hashing (rounds: 12)  
✅ Account lockout (after 5 failed attempts)  
✅ Rate limiting on auth endpoints  
✅ CORS with origin validation  
✅ Helmet.js security headers  
✅ Content Security Policy  
✅ SQL injection prevention (Prisma)  
✅ XSS protection  
✅ File upload validation  
✅ License tampering detection  
✅ Hardware fingerprinting  

## 📝 Logs & Monitoring

Logs stored in `.runtime/logs/`:
- `backend.log` — API logs
- `chatbot.log` — Widget build logs
- `chatbot-admin.log` — Admin portal logs
- `widget-test.log` — Test server logs
- `*.error.log` — Error-specific logs

View logs:
```bash
tail -f .runtime/logs/backend.log
```

View Prisma logs:
```bash
DEBUG=* npm run dev
```

## 🏗️ Architecture & Development Guide

### Project Structure Overview
```
ChatbotBeta/
├── backend/                   # Express.js REST API
│   ├── src/
│   │   ├── controllers/      # Business logic (auth, chat, admin, etc.)
│   │   ├── routes/           # API endpoint definitions
│   │   ├── middleware/       # Auth, error handling, validation
│   │   ├── services/         # Business logic helpers (license, scheduler)
│   │   ├── modules/          # External integrations (D-ID avatar)
│   │   ├── utils/            # Utilities (logger, JWT, CSV export, etc.)
│   │   └── index.js          # Server entry point
│   ├── .env.example          # Environment template
│   └── package.json
├── chatbot-admin/             # React + Vite admin dashboard
│   ├── src/
│   │   ├── pages/            # Admin pages (Dashboard, Chats, Users, etc.)
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks (useAuth)
│   │   ├── App.jsx           # Main app routing
│   │   └── main.jsx          # Entry point
│   ├── .env.example
│   └── package.json
├── chatbot/                   # Vanilla JS embeddable widget
│   ├── src/
│   │   ├── widget.js         # Widget core logic
│   │   ├── styles.css        # Widget styling
│   │   └── index.js          # Webpack entry
│   ├── webpack.config.js     # Webpack bundler config
│   └── package.json
├── database/                  # Prisma ORM & Migrations
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema definition
│   │   └── migrations/       # Migration history
│   ├── seed.js               # Database seed script
│   └── package.json
├── widget-test/              # Test page for widget integration
├── scripts/                   # Automation scripts
│   ├── start-all.js          # Start all services
│   ├── kill-all.js           # Stop all services
│   └── status-all.js         # Show service status
└── README.md                  # This file
```

### Technology Stack
- **Backend:** Express.js 4.x, Node.js 18+
- **Frontend:** React 18, Vite, React Router
- **Database:** PostgreSQL 14+, Prisma ORM 5.x
- **Widget:** Vanilla JavaScript, Webpack
- **Authentication:** JWT (RS256), Bcrypt
- **Security:** Helmet.js, CORS, Rate Limiting
- **External APIs:** D-ID (avatars), Python AI service
- **Task Scheduling:** node-cron
- **File Handling:** Multer, xml2js
- **HTTP Client:** Axios

### Middleware Pipeline (Backend)
1. **CORS Middleware** — Validates origin, sets credentials
2. **Helmet Security Headers** — Sets security headers (CSP, X-Frame, etc.)
3. **Body Parser** — Parses JSON/form data
4. **Cookie Parser** — Parses cookies
5. **Rate Limiter** — Limits auth endpoints (optional)
6. **Authentication** — JWT validation for protected routes
7. **Role Authorization** — Permission checks based on user role
8. **Error Handler** — Global error handling middleware

### Development Workflow

#### Adding a New Feature
1. **Update Prisma schema** (`database/prisma/schema.prisma`)
2. **Create migration** (`npx prisma migrate dev --name feature_name`)
3. **Implement backend** (controller → routes → services)
4. **Add API endpoint** (with role/permission checks)
5. **Implement frontend** (React component → Hook → API call)
6. **Update tests** (API tests, component tests)
7. **Test end-to-end** (Widget → Admin dashboard)
8. **Commit with message** describing feature

#### Code Style & Conventions
- **Controllers:** Handle HTTP requests/responses
- **Services:** Contain business logic and data operations
- **Routes:** Define API endpoints with method/path
- **Middleware:** Reusable logic (auth, validation, error)
- **Utils:** Helper functions (logging, JWT, CSV)
- **React Components:** Functional components with hooks
- **Naming:** camelCase for JS, PascalCase for React components

#### Adding New Admin Page
1. Create component in `chatbot-admin/src/pages/`
2. Add route in `chatbot-admin/src/App.jsx`
3. Add navigation link in `chatbot-admin/src/components/Layout.jsx`
4. Create API service functions in component or custom hook
5. Add permission checks in `ProtectedRoute.jsx`
6. Style with Tailwind CSS or custom CSS

#### Adding New API Endpoint
1. Create controller method in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Import route in `backend/src/index.js`
4. Add authentication middleware if needed
5. Add role/permission checks if needed
6. Document endpoint in README.md API section
7. Test with cURL or API client

### Common Development Tasks

#### View Live Logs
```bash
# Backend logs
tail -f .runtime/logs/backend.log

# Widget logs
tail -f .runtime/logs/chatbot.log

# Admin portal logs
tail -f .runtime/logs/chatbot-admin.log

# Error logs
tail -f .runtime/logs/*.error.log
```

#### Debug Database Queries
```bash
# Enable Prisma debug logging
DEBUG=prisma:* npm run dev

# Or in backend .env
DEBUG=prisma:*
```

#### Restart Services
```bash
# Kill all services
npm run kill

# Restart all
npm run dev

# Check status
npm run status
```

#### Create New Role
1. Add role entry to database seed
2. Define permissions in permission matrix
3. Update Prisma schema if new permissions added
4. Test access control for new role

#### Export/Import Database
```bash
# Backup database
pg_dump -U postgres chatbot_db > backup.sql

# Restore database
psql -U postgres chatbot_db < backup.sql
```

## 🚨 Troubleshooting & Common Issues

### Port Already in Use
```bash
# Windows - Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres -h localhost -c "SELECT 1"

# Check DATABASE_URL format
# Should be: postgresql://user:password@host:port/database

# Verify database exists
psql -U postgres -l | grep chatbot_db

# Create database if missing
psql -U postgres -c "CREATE DATABASE chatbot_db;"
```

### Widget Not Loading
- ✅ Verify backend running at `http://localhost:5000`
- ✅ Check CORS_ORIGIN includes widget test origin
- ✅ Check browser console for CORS errors
- ✅ Verify widget script src points to correct backend
- ✅ Check that widget build completed (`npm run build` in chatbot/)

### Admin Dashboard Not Loading
- ✅ Verify admin portal running at `http://localhost:5173`
- ✅ Check backend API responds at `http://localhost:5000/health`
- ✅ Clear browser cache and cookies
- ✅ Check browser console for API errors
- ✅ Verify JWT tokens not expired in browser storage

### License Validation Failed
- ✅ Ensure license file in `.runtime/licenses/`
- ✅ Check license file is valid XML with proper format
- ✅ Verify license expiry date hasn't passed
- ✅ Check hardware fingerprint matches device
- ✅ Enable debug to view license validation logs
- ✅ Use License Debug page (`/read-update-license-file`) to inspect file

### AI Response Not Working
- ✅ If using Python AI: verify `PYTHON_AI_API_URL` is correct
- ✅ Check Python AI service is running and responding
- ✅ Verify timeout not too short for AI response
- ✅ Check API logs for error messages
- ✅ Switch to Mock AI mode for testing

### Scheduler Jobs Not Running
- ✅ Verify scheduler runner started (check logs)
- ✅ Check cron expression syntax is valid
- ✅ Verify job is marked as active (is_active = true)
- ✅ Check execution history for error details
- ✅ Verify database connectivity for job updates

### File Upload Failing
- ✅ Check MAX_FILE_SIZE in .env (default: 10MB)
- ✅ Verify file type in ALLOWED_FILE_TYPES
- ✅ Check upload directory exists and writable
- ✅ Verify Multer middleware configuration
- ✅ Check browser file size limit

### JWT Token Errors
- ✅ Verify JWT_SECRET and JWT_REFRESH_SECRET set in .env
- ✅ Check token not expired (check expiry time)
- ✅ Clear browser storage and re-login
- ✅ Verify token format: "Bearer <token>"
- ✅ Check Authorization header spelled correctly

### CORS Errors
- ✅ Add origin to CORS_ORIGIN in backend .env
- ✅ Restart backend after changing CORS settings
- ✅ Check request includes "Origin" header
- ✅ For local testing, check if using localhost/127.0.0.1 consistently

### High Memory Usage
- ✅ Check for memory leaks in logs
- ✅ Restart services: `npm run kill && npm run dev`
- ✅ Check for long-running queries or jobs
- ✅ Monitor database connections
- ✅ Check file uploads cleanup (old files removed)

## 🚀 Deployment Guide

### Deployment Checklist
- [ ] Environment set to `NODE_ENV=production`
- [ ] All `.env` files configured with production values
- [ ] Database backup created
- [ ] SSL certificates installed (for HTTPS)
- [ ] CORS_ORIGIN updated with production domains
- [ ] Database migrations run successfully
- [ ] License files deployed to `.runtime/licenses/`
- [ ] File upload directories have proper permissions
- [ ] Log directory writable and monitored
- [ ] Database connection pooling configured
- [ ] Rate limiting configured appropriately
- [ ] Security headers enabled (Helmet.js)
- [ ] Backup and recovery plan in place

### Production Environment Setup

#### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://prod-user:secure-pass@prod-db-host:5432/chatbot_prod

# Security
JWT_SECRET=long-random-string-min-32-chars
JWT_REFRESH_SECRET=another-long-random-string-min-32-chars
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true
HELMET_HSTS_MAX_AGE=31536000

# CORS - Only production domains
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com

# Rate Limiting (stricter in production)
RATE_LIMIT_MAX_REQUESTS=3
RATE_LIMIT_WINDOW_MS=900000

# License Validation (strict in production)
LICENSE_VALIDATION_ENABLED=true
LICENSE_HARDWARE_FINGERPRINT_REQUIRED=true
LICENSE_TAMPER_DETECTION_ENABLED=true
```

#### Database Setup for Production
```bash
# Use managed database service (AWS RDS, Google Cloud SQL, etc.)
# Configure backups, monitoring, replication

# Run migrations
npx prisma migrate deploy

# Verify connection
psql -U prod-user -h prod-db-host -d chatbot_prod -c "SELECT 1"
```

#### SSL/HTTPS Setup
```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com

# Configure Express to use HTTPS
# In backend .env or code:
# - Set PORT=443
# - Configure SSL certificates path
# - Use reverse proxy (Nginx) to handle SSL
```

#### Reverse Proxy Setup (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Portal (Vite app)
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Docker Deployment (Optional)
```dockerfile
# Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "src/index.js"]
EXPOSE 5000
```

### Monitoring & Maintenance

#### Health Checks
```bash
# Regular health check endpoint
curl https://yourdomain.com/health

# Database connectivity check
psql -U prod-user -h prod-db-host -d chatbot_prod -c "SELECT NOW()"
```

#### Log Monitoring
```bash
# Real-time backend logs
tail -f .runtime/logs/backend.log | grep ERROR

# Monitor disk usage for logs
du -sh .runtime/logs/

# Rotate logs daily (setup with logrotate)
/var/log/chatbot/*.log {
    daily
    rotate 7
    compress
    missingok
}
```

#### Database Maintenance
```bash
# Analyze database for optimization
ANALYZE;

# Vacuum to reclaim space
VACUUM ANALYZE;

# Backup database daily
pg_dump -U prod-user -h prod-db-host chatbot_prod | gzip > backup-$(date +%Y%m%d).sql.gz

# Monitor database size
SELECT pg_size_pretty(pg_database_size('chatbot_prod'));
```

#### Performance Optimization
- Enable database query caching
- Use CDN for static assets
- Enable gzip compression
- Implement request caching with Redis
- Monitor API response times
- Set up APM (Application Performance Monitoring)

### Scaling Considerations
- **Horizontal scaling:** Use load balancer, stateless API design
- **Database scaling:** Read replicas, connection pooling
- **Session storage:** Consider Redis for distributed sessions
- **File storage:** Use S3 or cloud storage for file uploads
- **Message queue:** Consider for async job processing

## 📈 Performance & Optimization

### Query Optimization
- Database indexes on frequently searched columns
- Pagination for large result sets
- Select only needed fields (not SELECT *)
- Use connection pooling (Prisma has built-in)

### Frontend Optimization
- Lazy load admin pages with React.lazy
- Code splitting for admin dashboard
- Minimize API calls with data batching
- Implement request debouncing
- Use browser caching for static assets

### Memory Optimization
- Stream large files instead of loading to memory
- Implement session cleanup cron job
- Monitor for memory leaks with heap snapshots
- Clear old logs periodically

### Database Optimization
- Add indexes to frequently queried columns
- Archive old chat history to separate table
- Use database query monitoring tools
- Regular VACUUM and ANALYZE

## 📚 Additional Resources & References

### Documentation Links
- [Prisma ORM Docs](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [D-ID API Documentation](https://docs.d-id.com/)
- [JWT Authentication](https://jwt.io/introduction)
- [Webpack Configuration](https://webpack.js.org/configuration/)

### Community & Support
- Check logs in `.runtime/logs/` for detailed error messages
- Enable DEBUG mode for verbose logging
- Check GitHub Issues for known problems
- Test with mock data before production deployment

### Contributing Guidelines
1. Fork the repository
2. Create feature branch (`git checkout -b feature/your-feature`)
3. Make changes and test thoroughly
4. Follow code style conventions
5. Submit pull request with description

### Version History
- **1.0.0** (Current)
  - Full-stack chatbot with admin dashboard
  - License management system
  - AI training capabilities
  - D-ID avatar integration
  - Role-based access control
  - Scheduler system
  - Token usage tracking

### Known Limitations & Future Enhancements
- **Current:** Single-server deployment (no clustering)
- **Future:** Multi-server load balancing
- **Current:** File uploads stored on local disk
- **Future:** Cloud storage integration (S3, GCS)
- **Current:** Basic analytics
- **Future:** Advanced reporting and dashboards
- **Current:** Manual user creation
- **Future:** LDAP/SSO integration
- **Current:** Stateless widget
- **Future:** Conversation context across sessions

## 📞 Support & Contact

For issues, bugs, or feature requests:
1. **Check logs first** — `.runtime/logs/` contains detailed error info
2. **Enable debug mode** — Set `DEBUG=*` for verbose output
3. **Review config** — Verify all `.env` files are properly set
4. **Test in isolation** — Test components separately before integration
5. **Check community** — Look for similar issues in documentation
6. **Contact maintainer** — Email support for urgent issues

**Maintainer:** Him Bhavsar  
**Email:** connect@aixtor.com  
**Issues:** Check project GitHub issues page

## 📄 License & Attribution

This is a proprietary full-stack chatbot system built with modern technologies:

### Core Technologies
- **Backend:** Express.js 4.x, Node.js 18+
- **Frontend:** React 18, Vite, React Router DOM
- **Database:** PostgreSQL 14+, Prisma ORM 5.x
- **Authentication:** JWT (jsonwebtoken), Bcryptjs
- **Security:** Helmet.js, CORS, express-rate-limit
- **File Handling:** Multer, xml2js
- **Scheduling:** node-cron
- **HTTP Client:** Axios
- **Widget:** Vanilla JavaScript, Webpack

### Open Source Licenses
This project uses many open source libraries. See individual `package.json` files for complete dependencies.

---

**Last Updated:** 2026-07-14  
**Version:** 1.0.0  
**Status:** Production Ready  
**Maintainer:** Him Bhavsar (connect@aixtor.com)  
**Repository:** [GitHub Link]
