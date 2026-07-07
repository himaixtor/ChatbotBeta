# Chatbot System - Comprehensive Guide

**Last Updated:** 2026-07-07  
**Project Status:** ✅ Production Ready  
**Version:** 2.0 (With D-ID Avatar Support)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend - Express API](#backend---express-api)
3. [Chatbot Widget](#chatbot-widget)
4. [Chatbot Admin Dashboard](#chatbot-admin-dashboard)
5. [Widget Test Environment](#widget-test-environment)
6. [Database Architecture](#database-architecture)
7. [D-ID Avatar Implementation](#did-avatar-implementation)
8. [Implementation Details](#implementation-details)
9. [Database Updates for Production](#database-updates-for-production)
10. [Deployment Checklist](#deployment-checklist)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

### What is This System?

A **full-stack chatbot platform** with three main components:

1. **Backend API** - Node.js/Express server handling all business logic
2. **Embeddable Widget** - Vanilla JavaScript component that can be embedded in any website
3. **Admin Dashboard** - React-based portal for monitoring, managing chats, and training AI
4. **Database** - PostgreSQL with Prisma ORM for data persistence
5. **Avatar Support** - D-ID WebRTC streaming for lifelike avatar interactions

### Key Features

✅ **Multi-language chat support**  
✅ **AI-powered responses** (Python API backend)  
✅ **Session management** with cookies  
✅ **Live avatar** with D-ID streaming  
✅ **Admin dashboard** for analytics  
✅ **Role-based access control** (admin, manager, viewer)  
✅ **Chat training** with documents and URLs  
✅ **Scheduler** for automated cleanup  
✅ **JWT authentication** with account lockout  
✅ **Secure password hashing** (bcrypt)  

---

## Backend - Express API

### Location
`backend/src/`

### What It Does

The backend is the **core of the entire system**. It:

- **Authenticates users** (admin portal logins)
- **Manages sessions** (creates and tracks chat sessions)
- **Routes messages** (sends user messages to AI, returns responses)
- **Serves the admin portal** (API endpoints for dashboard)
- **Manages avatars** (D-ID WebRTC session handling)
- **Trains chatbots** (processes documents and URLs)
- **Schedules jobs** (automated data cleanup)
- **Manages roles** (admin, manager, viewer permissions)

### Architecture

```
backend/
├── src/
│   ├── index.js                    # Express server entry point
│   ├── controllers/                # Business logic
│   │   ├── authController.js       # Login, register, account lockout
│   │   ├── chatController.js       # Chat message handling
│   │   ├── sessionController.js    # Session management
│   │   ├── aiController.js         # Python AI API calls
│   │   ├── avatarController.js     # D-ID avatar sessions
│   │   ├── adminController.js      # Dashboard stats
│   │   ├── userController.js       # User management
│   │   ├── trainChatbotController.js  # Document training
│   │   └── schedulerController.js  # Job scheduling
│   │
│   ├── routes/                     # API endpoints
│   │   ├── authRoutes.js           # /api/auth/*
│   │   ├── chatRoutes.js           # /api/chat/*
│   │   ├── sessionRoutes.js        # /api/session/*
│   │   ├── adminRoutes.js          # /api/admin/*
│   │   ├── avatarRoutes.js         # /api/avatar/*
│   │   └── ... (more routes)
│   │
│   ├── middleware/                 # Request processing
│   │   ├── authenticate.js         # JWT verification
│   │   ├── errorHandler.js         # Global error handling
│   │   ├── rateLimiter.js          # Rate limiting
│   │   └── upload.js               # File uploads
│   │
│   ├── services/                   # Background services
│   │   └── schedulerRunner.js      # Cron job executor
│   │
│   ├── modules/                    # External integrations
│   │   ├── did.js                  # D-ID API wrapper
│   │   └── did-avatar.js           # Avatar session management
│   │
│   └── utils/                      # Helper functions
│       ├── jwt.js                  # Token generation
│       ├── logger.js               # Logging
│       ├── validators.js           # Input validation
│       └── prisma.js               # Database client
│
├── .env.example                    # Environment variables template
└── package.json                    # Dependencies
```

### Main API Endpoints

#### Authentication
```
POST /api/auth/login                  # Login with email/password
POST /api/auth/register               # Register new user (admin only)
GET  /api/auth/refresh                # Refresh JWT token
```

#### Sessions
```
POST /api/session/create              # Create new chat session
GET  /api/session/:sessionId           # Get session details
```

#### Chat
```
POST /api/chat/message                # Send message, get AI response
GET  /api/chat/:sessionId              # Get chat history
DELETE /api/chat/:sessionId            # Delete chat history
```

#### Avatar/D-ID
```
POST /api/avatar/create-stream        # Create WebRTC stream
POST /api/avatar/send-sdp             # Send SDP answer
POST /api/avatar/send-ice             # Send ICE candidate
POST /api/avatar/talk                 # Trigger avatar speech
GET  /api/avatar/stream/:streamId     # Get stream status
```

#### Admin Dashboard
```
GET  /api/admin/stats                 # Dashboard statistics
GET  /api/admin/chats                 # Paginated chat list
GET  /api/admin/chats/:sessionId      # Specific chat detail
GET  /api/admin/users                 # User list
GET  /api/admin/token-usage           # Token consumption stats
```

#### Training
```
POST /api/train-chatbot               # Upload and train with documents
POST /api/train-chatbot-url           # Train with website URL
GET  /api/train-chatbot               # List trained documents
DELETE /api/train-chatbot/:id         # Delete trained document
```

#### Scheduling
```
GET  /api/scheduler/jobs              # List scheduler jobs
POST /api/scheduler/jobs              # Create new job
PUT  /api/scheduler/jobs/:id          # Update job
DELETE /api/scheduler/jobs/:id        # Delete job
GET  /api/scheduler/executions        # Execution history
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Database ORM** | Prisma 5.x |
| **Authentication** | JWT (jsonwebtoken) |
| **Password Hashing** | bcryptjs |
| **Rate Limiting** | express-rate-limit |
| **Security** | helmet, CORS |
| **File Upload** | multer |
| **Job Scheduling** | node-cron |
| **HTTP Client** | axios |

### How Backend Processes a Message

```
1. Frontend sends POST /api/chat/message
   ├─ sessionId (chat session identifier)
   ├─ message (user's text input)
   ├─ attachment (optional file)
   └─ token (JWT for authentication)

2. Backend receives request
   ├─ Validates JWT token
   ├─ Checks session exists
   └─ Stores message in database (Chat model)

3. Backend calls Python AI API
   ├─ Sends session context + message
   ├─ Receives AI response
   ├─ Extracts token count
   └─ Stores response in database

4. Backend returns to Frontend
   ├─ AI response text
   ├─ Response type (text/image)
   ├─ Token count
   └─ Timestamp

5. Frontend displays to User
   └─ Shows message in chatbot widget
```

### Running the Backend

```bash
# Development (with hot reload)
cd backend
npm install
npm run dev

# Production
NODE_ENV=production npm start
```

**Default Port:** 5000  
**Health Check:** `GET http://localhost:5000/health`

---

## Chatbot Widget

### Location
`chatbot/src/`

### What It Does

The chatbot widget is a **self-contained, embeddable chat interface** that:

- **Loads as a single JavaScript file** (no framework dependencies required)
- **Works in a Shadow DOM** (isolated from host page styles)
- **Maintains session cookies** (persistent conversations)
- **Handles message sending** (with typing indicators)
- **Displays AI responses** (with typing animations)
- **Supports avatar streaming** (D-ID WebRTC video chat)
- **Customizable appearance** (colors, position, messages)
- **Mobile responsive** (works on all devices)

### Architecture

```
chatbot/
├── src/
│   ├── chatbot.js              # Main widget class
│   ├── ui.js                   # UI rendering & DOM manipulation
│   ├── api.js                  # API client
│   ├── avatar-rtc.js           # D-ID WebRTC integration
│   ├── styles.css              # Widget styling
│   └── webpack.config.js       # Build configuration
│
├── dist/
│   ├── chatbot.min.js          # Minified widget (embeddable)
│   ├── chatbot.css             # Styles
│   └── demo.html               # Demo page
│
└── package.json
```

### File-by-File Breakdown

#### `chatbot.js` (Main Widget Class)
```javascript
class ChatbotWidgetClass {
  constructor()          // Initialize widget state
  init(config)           // Configure with custom options
  render()               // Create UI in Shadow DOM
  handleMessage()        // Process user messages
  toggleWidget()         // Show/hide widget
  switchMode()           // Toggle text ↔ video avatar
}
```

**Key Properties:**
- `sessionId` - Unique chat session identifier
- `currentMode` - 'text' or 'video' (avatar mode)
- `avatar` - D-ID avatar instance
- `config` - User settings (colors, messages, etc.)

#### `ui.js` (UI Components)
```javascript
createUI()             // Build widget HTML/CSS in Shadow DOM
appendMessage()        // Add message to chat display
showTyping()           // Show "bot is typing" animation
hideTyping()           // Remove typing indicator
clearMessages()        // Reset chat history
```

#### `api.js` (Backend Communication)
```javascript
createApiClient()      // Initialize with backend URL
  ├─ createSession()   // POST /api/session/create
  ├─ sendMessage()     // POST /api/chat/message
  └─ getHistory()      // GET /api/chat/:sessionId
```

#### `avatar-rtc.js` (D-ID Integration)
```javascript
class AvatarRTC {
  constructor()        // Initialize WebRTC
  createStream()       // Create D-ID stream session
  start()              // Start WebRTC connection
  talk()               // Send text for avatar to speak
  stop()               // End stream
}
```

### Embedding the Widget

**Step 1:** Host the built files
```
chatbot/dist/
├── chatbot.min.js
└── chatbot.css
```

**Step 2:** Add to your website
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://your-cdn.com/chatbot.css" />
</head>
<body>
  <!-- Your content here -->

  <script src="https://your-cdn.com/chatbot.min.js"></script>
  <script>
    window.ChatbotWidget.init({
      apiEndpoint: 'https://your-backend.com',
      botName: 'My Assistant',
      welcomeMessage: 'Hi! How can I help?',
      primaryColor: '#007AFF',
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

### Configuration Options

```javascript
ChatbotWidget.init({
  // Required
  apiEndpoint: 'https://backend.com',           // Backend API URL
  
  // Customization
  botName: 'Assistant',                          // Displayed name
  welcomeMessage: 'Hello!',                      // Initial message
  primaryColor: '#007AFF',                       // Widget color
  position: 'bottom-right',                      // bottom-left, bottom-right, top-left, top-right
  
  // Avatar (D-ID)
  didClientKey: 'your_client_key',              // D-ID SDK key
  didAgentId: 'your_agent_id',                  // D-ID agent ID
  
  // Behavior
  autoOpen: false,                               // Open on page load
  minimized: true,                               // Start minimized
  
  // Advanced
  sessionId: 'custom_session_id',                // Override session ID
  userId: 'user_identifier'                     // User tracking
});
```

### Widget State Flow

```
Page Load
   ↓
Widget.init() called
   ↓
Shadow DOM created
   ↓
Create session (POST /api/session/create)
   ↓
Session stored in localStorage (sessionId)
   ↓
User clicks chat bubble
   ↓
Widget opens & shows welcome message
   ↓
User types message → Sends to API
   ↓
API calls Python AI → Returns response
   ↓
Response displayed in widget
   ↓
[Optional] Avatar talks (D-ID WebRTC)
```

### Building the Widget

```bash
cd chatbot

# Install dependencies
npm install

# Development build (watch mode)
npm run watch

# Production build
npm run build

# Output files in dist/
```

---

## Chatbot Admin Dashboard

### Location
`chatbot-admin/src/`

### What It Does

The admin dashboard is a **React web application** that:

- **Displays analytics** (chat counts, languages, tokens used)
- **Lists all chat sessions** (with search and filtering)
- **Views individual chats** (full message history)
- **Manages users** (create, edit, delete admin accounts)
- **Manages roles** (permissions for each role)
- **Schedules jobs** (automated data cleanup tasks)
- **Trains AI** (upload documents or URLs)
- **Monitors token usage** (consumption tracking)
- **User authentication** (email + password with account lockout)

### Architecture

```
chatbot-admin/
├── src/
│   ├── App.jsx                     # Main router component
│   ├── main.jsx                    # React entry point
│   │
│   ├── pages/                      # Page components
│   │   ├── Login.jsx               # Login page
│   │   ├── Dashboard.jsx           # Statistics & overview
│   │   ├── Chats.jsx               # Chat list & viewer
│   │   ├── UserManagement.jsx      # Admin users
│   │   ├── SchedulerJobs.jsx       # Scheduler management
│   │   ├── TrainAI.jsx             # AI training
│   │   └── TokenUsage.jsx          # Usage analytics
│   │
│   ├── components/                 # Reusable components
│   │   ├── Layout.jsx              # Navigation & layout
│   │   ├── ProtectedRoute.jsx      # Authentication guard
│   │   ├── ViewChatModal.jsx       # Chat viewer popup
│   │   ├── DailyActivityChart.jsx  # Chart visualization
│   │   ├── LanguagePie.jsx         # Language distribution
│   │   ├── ChatAttachment.jsx      # File display
│   │   ├── Pagination.jsx          # List pagination
│   │   ├── LoadingSkeleton.jsx     # Loading state
│   │   └── TokenUsageSummary.jsx   # Token stats
│   │
│   ├── hooks/                      # Custom React hooks
│   │   └── useAuth.jsx             # Authentication context
│   │
│   ├── styles/                     # Global CSS
│   │   └── index.css
│   │
│   └── main.jsx                    # Vite entry point
│
├── .env.example
├── vite.config.js                  # Vite build config
└── package.json
```

### Key Pages

#### **1. Login Page**
- Email & password input
- Show/hide password toggle
- Account lockout after 5 failed attempts (15 min)
- Simple credential validation

#### **2. Dashboard**
- Total chats count
- New chats (today/this week)
- Token consumption
- Language distribution pie chart
- Daily activity chart
- Quick stats cards

#### **3. Chats Page**
- Searchable chat list (by email, name, language)
- Pagination (20 per page)
- Filter by date range
- View full chat history modal
- File attachment display
- Download chat as text

#### **4. User Management**
- List all admin users
- Create new user (email, password, role)
- Edit user details
- Delete user
- Assign roles (admin, manager, viewer)

#### **5. Scheduler Jobs**
- View all scheduled cleanup jobs
- Create new job (cron expression)
- Enable/disable jobs
- View execution history
- Monitor last run status

#### **6. Train AI**
- Upload documents (PDF, TXT, DOCX)
- Train with URLs (crawl website)
- List trained data
- Activate/deactivate training data
- Delete training entries

#### **7. Token Usage**
- Daily token consumption graph
- Total tokens used
- Average per session
- Export usage report
- Cost estimation

### Authentication Flow

```
User navigates to http://localhost:5173
   ↓
ProtectedRoute checks for JWT token
   ├─ Token exists? → Load Dashboard
   └─ No token? → Redirect to Login
   
User enters email + password
   ↓
POST /api/auth/login
   ├─ Check account lockout (locked_until > now?)
   ├─ Hash password & compare
   ├─ If incorrect → increment failed_login_attempts
   └─ If correct → Return JWT tokens
   
Receive JWT tokens
   ├─ accessToken (15 min expiry) → Stored in memory
   ├─ refreshToken (7 day expiry) → Stored in localStorage
   └─ user object → Context state
   
Tokens sent with every API request
   ↓
Header: Authorization: Bearer {accessToken}

If accessToken expires
   ↓
POST /api/auth/refresh with refreshToken
   ↓
Receive new accessToken
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | React 18.x |
| **Build Tool** | Vite |
| **Router** | React Router v6 |
| **HTTP Client** | axios |
| **State Management** | Context API + hooks |
| **Charts** | Chart.js (via React Chartjs 2) |
| **Styling** | CSS + Tailwind (optional) |

### Running the Admin Dashboard

```bash
cd chatbot-admin

# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Default Port:** 5173  
**Default Credentials:**
- Email: `admin@chatbot.com`
- Password: `Admin@123`

---

## Widget Test Environment

### Location
`widget-test/`

### What It Does

The widget test environment is a **simple HTML page** used to:

- **Test the embedded widget locally**
- **Test widget configuration options**
- **Test avatar features** (D-ID WebRTC)
- **Verify message sending/receiving**
- **Test different customization options**

### File Structure

```
widget-test/
└── index.html           # Test page with widget embedded
```

### HTML Content

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chatbot Widget Test</title>
  <link rel="stylesheet" href="../chatbot/dist/chatbot.css" />
</head>
<body>
  <!-- Hero section explaining the test -->
  <main>
    <h1>Solar Chatbot Experience</h1>
    <p>Preview the chatbot widget with avatar support...</p>
  </main>

  <!-- Widget scripts -->
  <script src="../chatbot/dist/chatbot.min.js"></script>
  <script>
    window.ChatbotWidget.init({
      apiEndpoint: 'http://localhost:5000',
      botName: 'Solar Assistant',
      welcomeMessage: "Hi I'm Surya! How can I assist?",
      primaryColor: '#008C89',
      position: 'bottom-right',
      didClientKey: 'ck_fXJGfw4y3zeghkLQs3F6p',
      didAgentId: 'v2_agt_H22MLq3n'
    });
  </script>
</body>
</html>
```

### How to Use

1. **Start backend**
   ```bash
   cd backend && npm run dev
   ```

2. **Build chatbot widget**
   ```bash
   cd chatbot && npm run build
   ```

3. **Open test page**
   ```
   Open: file:///<path>/widget-test/index.html
   Or: http://localhost:8080/widget-test/
   ```

4. **Test features**
   - Click widget bubble (bottom-right)
   - Type messages
   - Test avatar toggle
   - Check styling/colors

### Requirements

- ✅ Backend must be running on `http://localhost:5000`
- ✅ Widget must be built (`npm run build` in chatbot folder)
- ✅ Database must be seeded with initial data

---

## Database Architecture

### Location
`database/prisma/schema.prisma`

### What It Does

The database stores **all application data**:

- **User accounts** (admin/manager/viewer)
- **Chat sessions** (individual conversations)
- **Chat messages** (user & AI messages)
- **Avatar streams** (D-ID WebRTC data)
- **Training data** (documents & URLs)
- **Scheduler jobs** (automated tasks)
- **Refresh tokens** (authentication state)

### Schema Models

#### **1. User Model**
Stores admin/manager/viewer user accounts

```prisma
model User {
  uid                   String @id               # Unique identifier
  email                 String @unique           # Login email
  name                  String                   # Display name
  password_hash         String                   # Bcrypt hash
  role                  String                   # admin, manager, viewer
  contact_number        String?                  # Optional phone
  created_at            DateTime @default(now()) # Account creation
  updated_at            DateTime @updatedAt      # Last modification
  is_active             Boolean @default(true)   # Soft delete
  failed_login_attempts Int @default(0)          # Brute force prevention
  locked_until          DateTime?                # Account lockout time
  refresh_tokens        RefreshToken[]           # Related tokens
}

Fields:
- uid: v4 UUID
- email: Unique, indexed
- password_hash: bcryptjs (12 rounds)
- role: admin | manager | viewer
- failed_login_attempts: Locks after 5 attempts
- locked_until: Account locked for 30 minutes
```

#### **2. RefreshToken Model**
Stores JWT refresh tokens for authentication

```prisma
model RefreshToken {
  uid        String   @id @default(uuid())
  user_uid   String                        # References User.uid
  token_hash String   @unique              # Hash of actual token
  expires_at DateTime                      # Token expiration time
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_uid], onDelete: Cascade)
}

Purpose:
- Allows users to get new access tokens
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Prevents token theft (only hash stored)
```

#### **3. Role Model**
Defines permission levels for admin users

```prisma
model Role {
  uid                String   @id @default(uuid())
  role_name          String   @unique      # admin, manager, viewer
  can_view_all_chats Boolean  @default(false)
  can_download       Boolean  @default(false)
  can_manage_users   Boolean  @default(false)
  created_at         DateTime @default(now())
}

Permissions:
┌─────────┬─────────────────┬─────────────┬────────────────┐
│ Role    │ View All Chats  │ Download    │ Manage Users   │
├─────────┼─────────────────┼─────────────┼────────────────┤
│ admin   │ ✓               │ ✓           │ ✓              │
│ manager │ ✓               │ ✓           │ ✗              │
│ viewer  │ ✓               │ ✗           │ ✗              │
└─────────┴─────────────────┴─────────────┴────────────────┘
```

#### **4. ChatBot Model** (Chat Sessions)
Represents a single user chat session

```prisma
model ChatBot {
  session_id     String   @id @default(uuid())
  name           String?                   # User's name (if provided)
  email          String?                   # User's email
  chat_language  String?                   # Language (en, es, fr, etc.)
  interested_in  String?                   # User's topic/product interest
  lead_generated Boolean  @default(false)  # Lead qualification flag
  
  is_focus       Boolean  @default(false)  # For scheduler targeting
  
  # Avatar/D-ID streaming
  did_stream_id  String?                   # D-ID stream identifier
  did_session_id String?                   # D-ID session token
  
  created_at     DateTime @default(now())  # Session start
  expires_at     DateTime                  # Session expiration
  
  chats          Chat[]                    # Related messages
  avatar_streams AvatarStream[]            # Related WebRTC streams
  avatar_events  AvatarEvent[]             # Stream events
}

Indexes:
- email (search chats by user)
- created_at (time-range queries)
- lead_generated (filter leads)
- chat_language (language analytics)
- is_focus (scheduler cleanup)
```

#### **5. Chat Model** (Individual Messages)
Stores each message in a session

```prisma
model Chat {
  id             Int      @id @default(autoincrement())
  session_id     String                   # References ChatBot
  response_type  String                   # 'user', 'bot', 'system'
  message_text   String   @db.Text        # Message content
  timestamp      DateTime @default(now()) # Message time
  token_count    Int?                     # AI tokens consumed
  is_visible     Boolean  @default(true)  # Show in UI
  
  # Optional file attachment
  file_name      String?                  # Original filename
  file_mime_type String?                  # MIME type (image/pdf)
  file_data      Bytes?                   # Binary file content
  
  is_welcome     Boolean  @default(false) # Welcome message marker
  
  chatbot        ChatBot  @relation(fields: [session_id], onDelete: Cascade)
}

Indexes:
- (session_id, timestamp) - Get all messages in order
- is_welcome - Identify welcome messages (for deletion)
```

#### **6. SchedulerConfig Model**
Defines automated cleanup jobs

```prisma
model SchedulerConfig {
  id              String   @id @default(uuid())
  job_name        String                  # Job identifier
  details         String?                 # Job description
  
  run_timing      String?                 # Human-friendly: "Daily at 2 AM"
  cron_expression String                  # Cron: "0 2 * * *"
  
  is_active       Boolean  @default(true)
  
  created_by      String?                 # Admin who created
  updated_by      String?                 # Last modified by
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  executions      SchedulerExecutionHistory[]
}

Example Jobs:
- Delete expired sessions (cron: 0 2 * * *)
- Archive old chats (cron: 0 3 * * 0)
- Clean up temporary files (cron: */30 * * * *)
```

#### **7. SchedulerExecutionHistory Model**
Logs each job execution

```prisma
model SchedulerExecutionHistory {
  id              String   @id @default(uuid())
  scheduler_id    String                  # References SchedulerConfig
  
  start_time      DateTime                # Execution started
  end_time        DateTime?               # Execution completed
  status          String                  # running, success, failed
  
  records_processed Int @default(0)       # Rows examined
  records_deleted   Int @default(0)       # Rows removed
  
  error_message   String?                 # Error details
  created_at      DateTime @default(now())
  
  scheduler       SchedulerConfig @relation(fields: [scheduler_id], onDelete: Cascade)
}
```

#### **8. TrainChatbot Model**
Stores documents used to train the AI

```prisma
model TrainChatbot {
  id            String   @id @default(uuid())
  filename      String                   # Original file name
  file_data     Bytes                    # Document content
  ai_response_id String?                 # AI training response ID
  trained_date  DateTime @default(now()) # Training date
  is_active     Boolean  @default(true)  # Include in training
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}

Supported Formats:
- .pdf (PDF documents)
- .txt (Plain text)
- .docx (Word documents)
```

#### **9. TrainChatbotWithUrl Model**
Stores URLs used to train the AI

```prisma
model TrainChatbotWithUrl {
  id            String   @id @default(uuid())
  page_name     String                   # Display name
  url           String                   # Website URL
  ai_response_id String?                 # AI training response ID
  trained_date  DateTime @default(now()) # Training date
  is_active     Boolean  @default(true)  # Include in training
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}

Process:
1. User provides URL
2. Backend crawls website
3. Extracts content
4. Sends to Python AI for training
5. Stores URL reference for retraining
```

#### **10. AvatarStream Model**
Manages D-ID WebRTC streams

```prisma
model AvatarStream {
  id                  String   @id @default(uuid())
  session_id          String                   # Chat session
  stream_id           String?                  # D-ID stream ID
  session_token       String?                  # D-ID session token
  connection_signature String?                # WebRTC validation
  avatar_mode         String   @default("text") # text, video, audio
  is_active           Boolean  @default(true)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  closed_at           DateTime?                # Stream end time
  
  chatbot             ChatBot  @relation("ChatBotAvatarStreams", onDelete: Cascade)
  events              AvatarEvent[]
}
```

#### **11. AvatarEvent Model**
Logs avatar/streaming events

```prisma
model AvatarEvent {
  id          String   @id @default(uuid())
  stream_id   String?                  # Related stream
  session_id  String?                  # Chat session
  event_type  String                   # Event category
  event_data  String?  @db.Text        # JSON event data
  created_at  DateTime @default(now())
  
  avatar_stream AvatarStream? @relation(fields: [stream_id], onDelete: Cascade)
  chatbot       ChatBot?      @relation(fields: [session_id], onDelete: Cascade)
}

Event Types:
- stream_created: WebRTC initiated
- sdp_sent: SDP answer received
- ice_candidate: ICE candidates exchanged
- talk_sent: Avatar speech triggered
- stream_closed: Connection terminated
- script_loaded: Avatar loaded
- script_closed: Avatar unloaded
```

### Database Relationships

```
User (1) ──→ (Many) RefreshToken
                      ↓
                  Stores JWT tokens

Role (1) ──→ (Many) User
                      ↓
                  Defines permissions

ChatBot (1) ──→ (Many) Chat
  ├─→ Stores session messages
  
ChatBot (1) ──→ (Many) AvatarStream
  ├─→ WebRTC connections
  
AvatarStream (1) ──→ (Many) AvatarEvent
  ├─→ Connection events

TrainChatbot & TrainChatbotWithUrl
  ├─→ Independent models (no relations)
  └─→ Used for AI training data

SchedulerConfig (1) ──→ (Many) SchedulerExecutionHistory
  └─→ Job execution logs
```

### Indexes (Performance)

```prisma
User
  ├─ email (fast login lookups)

Chat
  ├─ (session_id, timestamp) (message history)
  └─ is_welcome (scheduler cleanup)

ChatBot
  ├─ email (search chats)
  ├─ created_at (time-based queries)
  ├─ lead_generated (leads dashboard)
  ├─ chat_language (language analytics)
  └─ is_focus (scheduler targeting)

AvatarStream
  ├─ session_id (find active streams)
  ├─ stream_id (look up by D-ID ID)
  └─ is_active (find open streams)

AvatarEvent
  ├─ stream_id (events for stream)
  ├─ session_id (events for session)
  └─ event_type (filter by type)

SchedulerExecutionHistory
  ├─ scheduler_id (job history)
  ├─ created_at (recent executions)
  └─ status (find failed jobs)

TrainChatbot & TrainChatbotWithUrl
  ├─ created_at (list by date)
  └─ is_active (active training data)
```

### Database Commands

```bash
# Setup database
cd database
npm install
npx prisma migrate dev --name init

# Seed initial data
npm run seed

# Reset database (development only!)
npx prisma migrate reset

# View database in studio
npx prisma studio

# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name add_new_field
```

---

## D-ID Avatar Implementation

### What is D-ID?

**D-ID** is a service that creates **lifelike avatar videos** using WebRTC. The chatbot widget can:

- **Display a talking avatar** that speaks user messages
- **Stream video in real-time** via WebRTC
- **Customize avatar appearance** (clothes, hairstyle, etc.)
- **Process text-to-speech** automatically

### How It's Implemented

#### **Architecture**

```
Frontend (avatar-rtc.js)
   ├─ Loads D-ID SDK
   ├─ Creates WebRTC connection
   ├─ Handles video stream
   └─ Sends "talk" requests

Backend (did-avatar.js module)
   ├─ Creates session tokens
   ├─ Stores stream metadata
   └─ Logs events to database

Database
   ├─ AvatarStream model (session data)
   └─ AvatarEvent model (connection events)
```

#### **Frontend Implementation** (`avatar-rtc.js`)

```javascript
class AvatarRTC {
  constructor(config) {
    // D-ID SDK configuration
    this.clientKey = config.didClientKey;
    this.agentId = config.didAgentId;
    this.videoRef = config.videoElement;
  }

  async createStream() {
    // 1. Call backend to allocate session
    //    POST /api/avatar/create-stream
    
    // 2. Initialize D-ID SDK
    const sdk = await DIDApi.init({
      clientKey: this.clientKey,
      agentId: this.agentId
    });
    
    // 3. Create WebRTC stream
    const stream = await sdk.createStream({
      // D-ID stream configuration
    });
    
    // 4. Connect video to DOM
    this.videoRef.srcObject = stream;
    
    // 5. Log event to backend
    //    POST /api/avatar/send-event
  }

  async talk(text) {
    // Send text to avatar for speech
    await this.sdk.talk({
      text: text,
      streamId: this.streamId
    });
  }

  async stop() {
    // Close stream and log event
    await this.sdk.closeStream();
    await this.reportEvent('stream_closed');
  }
}
```

#### **Backend Implementation** (`did-avatar.js`)

```javascript
async function createStream(sessionId) {
  // 1. Generate session token
  const sessionToken = uuidv4();
  const streamId = uuidv4();
  
  // 2. Store in database
  await prisma.avatarStream.create({
    data: {
      session_id: sessionId,
      stream_id: streamId,
      session_token: sessionToken,
      avatar_mode: 'text'
    }
  });
  
  // 3. Return to frontend
  return {
    id: streamId,
    session_id: sessionToken,
    ice_servers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
}

async function recordEvent(streamId, eventType, eventData) {
  // Log event for debugging/analytics
  await prisma.avatarEvent.create({
    data: {
      stream_id: streamId,
      event_type: eventType,
      event_data: JSON.stringify(eventData)
    }
  });
}
```

#### **API Endpoints**

```
POST /api/avatar/create-stream
  Request:  { sessionId }
  Response: { id, session_id, ice_servers }
  Purpose:  Initialize WebRTC stream

POST /api/avatar/send-sdp
  Request:  { streamId, sessionId, answer }
  Response: { success: true }
  Purpose:  Exchange SDP negotiation data

POST /api/avatar/send-ice
  Request:  { streamId, sessionId, candidate }
  Response: { success: true }
  Purpose:  Exchange ICE candidates

POST /api/avatar/talk
  Request:  { streamId, text, sessionId }
  Response: { success: true, talk_id }
  Purpose:  Trigger avatar speech

GET /api/avatar/stream/:streamId
  Response: { status, is_active, created_at }
  Purpose:  Check stream status
```

### Avatar Workflow

```
User opens widget
   ↓
Selects "Video Avatar" mode
   ↓
Frontend calls POST /api/avatar/create-stream
   ├─ Backend creates AvatarStream record
   └─ Returns sessionToken
   
Frontend loads D-ID SDK
   ├─ Uses clientKey & agentId
   ├─ Connects to D-ID servers
   └─ Initiates WebRTC connection
   
Frontend receives video stream
   ├─ Displays in <video> element
   └─ Shows avatar on screen
   
User sends message
   ├─ API returns AI response
   └─ Calls avatar.talk(response)
   
Avatar speaks response
   ├─ D-ID processes text-to-speech
   ├─ Lips sync with audio
   └─ Frontend logs event to backend
   
User closes widget
   ├─ Frontend closes WebRTC connection
   ├─ Posts event to backend
   └─ Database records stream_closed
```

### D-ID Configuration

Get your D-ID credentials:

1. **Sign up** at https://www.d-id.com
2. **Create API key** (clientKey)
3. **Create agent** (agentId - avatar character)
4. **Add to .env files**

```
# backend/.env
D_ID_API_KEY=your_api_key
D_ID_AGENT_ID=v2_agt_your_agent_id

# widget-test/index.html (hardcoded or from config)
didClientKey: 'ck_fXJGfw4y3zeghkLQs3F6p'
didAgentId: 'v2_agt_H22MLq3n'
```

### Troubleshooting Avatar Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Video not showing | SDK not loaded | Check clientKey, agentId |
| No audio | Microphone denied | Grant browser permissions |
| Latency/lag | Poor connection | Check internet speed |
| SDP error | Wrong token | Verify session token |

---

## Implementation Details

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User's Website                        │
│  (Any website that embeds the chatbot widget)            │
└─────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │   Chatbot Widget (chatbot.min.js)    │
        │  Shadow DOM Isolated Component       │
        │  - UI Rendering                      │
        │  - Message Handling                  │
        │  - D-ID Avatar Integration           │
        └──────────────────────────────────────┘
                    ↓         ↓
        HTTP REST Calls   WebRTC Stream
                    ↓         ↓
    ┌────────────────────────────────────────────┐
    │        Backend Express API (port 5000)     │
    │  ┌────────────────────────────────────────┐│
    │  │         Route Handlers                  ││
    │  │  - /api/auth/*      (Authentication)    ││
    │  │  - /api/session/*   (Session mgmt)      ││
    │  │  - /api/chat/*      (Message routing)   ││
    │  │  - /api/avatar/*    (D-ID streaming)    ││
    │  │  - /api/admin/*     (Dashboard API)     ││
    │  │  - /api/train-*     (AI training)       ││
    │  │  - /api/scheduler/* (Job scheduling)    ││
    │  └────────────────────────────────────────┘│
    │  ┌────────────────────────────────────────┐│
    │  │      Business Logic (Controllers)       ││
    │  │  - Authentication & JWT tokens          ││
    │  │  - Message processing                   ││
    │  │  - AI API calls (Python service)        ││
    │  │  - Avatar session management            ││
    │  │  - Analytics & reporting                ││
    │  └────────────────────────────────────────┘│
    └────────────────────────────────────────────┘
              ↓                    ↓
    ┌──────────────────┐  ┌──────────────────┐
    │   PostgreSQL     │  │   Python AI API  │
    │    Database      │  │  (AI Responses)  │
    │                  │  │                  │
    │  - Users         │  │  - Text→Response │
    │  - Sessions      │  │  - Training data │
    │  - Messages      │  │  - Token counting│
    │  - Avatars       │  │                  │
    │  - Training data │  └──────────────────┘
    │  - Jobs          │
    │  - Events        │         D-ID API
    │                  │      (Avatar Video)
    └──────────────────┘      ↓
                         WebRTC Streaming
    
    ┌────────────────────────────────────────────┐
    │   Admin Dashboard (React, port 5173)       │
    │  - Chat monitoring                         │
    │  - User management                         │
    │  - Analytics                               │
    │  - AI training                             │
    │  - Job scheduling                          │
    └────────────────────────────────────────────┘
```

### Message Flow Example

```
1. User opens website with embedded widget
   ├─ browser loads: chatbot.min.js
   └─ JavaScript initializes widget in Shadow DOM

2. User clicks widget bubble
   ├─ Widget creates session
   ├─ POST /api/session/create → sessionId
   └─ sessionId stored in localStorage

3. User types "What is solar energy?"
   ├─ Widget collects message
   ├─ POST /api/chat/message
   │   {
   │     sessionId: "abc123",
   │     message: "What is solar energy?",
   │     attachment: null
   │   }
   └─ Widget shows "typing..." indicator

4. Backend receives message
   ├─ Validates JWT/sessionId
   ├─ Stores in Chat table (user message)
   ├─ Calls Python AI API
   │   POST http://0.0.0.0:8010/api/v1/chat
   │   {
   │     session_id: "abc123",
   │     message: "What is solar energy?",
   │     context: [previous messages]
   │   }
   └─ Python AI returns response

5. Backend receives AI response
   ├─ Stores in Chat table (bot message)
   ├─ Counts tokens used
   ├─ Returns JSON response
   │   {
   │     response: "Solar energy is...",
   │     tokens: 150,
   │     timestamp: "2026-07-07T10:30:00Z"
   │   }
   └─ Sends to frontend

6. Widget displays response
   ├─ Hides "typing..." indicator
   ├─ Shows AI message in chat
   ├─ If avatar enabled: avatar.talk(response)
   └─ User sees message + hears avatar speech

7. Admin can view chat in dashboard
   ├─ Logs into admin portal
   ├─ Views all chat sessions
   ├─ Searches by email: john@example.com
   ├─ Clicks chat to view full history
   └─ Sees user message → AI response timeline
```

### Data Flow for Training

```
1. Admin uploads document or URL
   ├─ POST /api/train-chatbot (file)
   ├─ POST /api/train-chatbot-url (URL)
   └─ File/URL stored in database

2. Backend processes training data
   ├─ Reads file content
   ├─ Extracts text (PDF, DOCX, TXT)
   ├─ Sends to Python AI API
   │   POST http://0.0.0.0:8010/api/v1/train
   │   {
   │     training_data: "extracted text",
   │     source: "document.pdf"
   │   }
   └─ Python AI updates model

3. AI learns from training data
   ├─ Processes text
   ├─ Updates embeddings
   ├─ Improves response quality
   └─ Returns training_id

4. Backend stores training_id
   ├─ Updates TrainChatbot record
   ├─ Marks as is_active
   └─ Future chats use this training

5. User chats use trained data
   ├─ Next message includes training context
   ├─ AI provides better responses
   └─ Related to trained documents
```

### Authentication & Security Flow

```
┌─────────────────────────────────────────────────────────┐
│              Login Process (Secure)                      │
└─────────────────────────────────────────────────────────┘

1. User submits email + password
   ├─ Frontend validates inputs
   └─ POST /api/auth/login {email, password}

2. Backend processes login
   ├─ Find user by email
   ├─ Check if account is active
   ├─ Check account lockout (> 5 failed attempts)
   ├─ Hash password with bcryptjs (12 rounds)
   ├─ Compare with database password_hash
   ├─ If incorrect password:
   │  ├─ Increment failed_login_attempts
   │  ├─ Lock account after 5 failures
   │  └─ Return error
   └─ If correct password:
      ├─ Reset failed_login_attempts to 0
      ├─ Generate JWT accessToken (15 min)
      ├─ Generate JWT refreshToken (7 days)
      ├─ Store refresh token hash in database
      ├─ Set secure cookies
      └─ Return {accessToken, refreshToken, user}

3. Frontend stores tokens
   ├─ accessToken → Memory (cleared on refresh)
   ├─ refreshToken → localStorage (persists)
   └─ Redirects to dashboard

4. API requests include JWT
   ├─ Every request: Authorization: Bearer {accessToken}
   ├─ Backend verifies JWT signature
   ├─ Extracts user_uid from token
   ├─ If expired → use refreshToken to get new one
   └─ Proceed with request

┌─────────────────────────────────────────────────────────┐
│            Refresh Token Flow                           │
└─────────────────────────────────────────────────────────┘

1. accessToken expires (15 min)
2. Frontend detects 401 response
3. Frontend sends refreshToken → POST /api/auth/refresh
4. Backend validates refreshToken
5. Backend checks if user still exists and is active
6. Backend generates new accessToken
7. Frontend retries original request with new token

┌─────────────────────────────────────────────────────────┐
│            Account Lockout                              │
└─────────────────────────────────────────────────────────┘

1. Failed login attempt
   └─ failed_login_attempts += 1

2. After 5 failed attempts
   ├─ Set locked_until = now() + 15 minutes
   └─ User cannot login for 15 minutes

3. After lockout period expires
   ├─ locked_until < now()
   └─ User can attempt login again
```

### Session & Chat Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│           Chat Session Lifecycle                        │
└─────────────────────────────────────────────────────────┘

Session Created (POST /api/session/create)
   ├─ Generate sessionId (UUID)
   ├─ User fields: name, email, language, interested_in
   ├─ expires_at: 24 hours from now
   ├─ lead_generated: false (default)
   └─ Store in ChatBot table

Widget Displays Welcome Message
   ├─ Create Chat record (is_welcome: true)
   ├─ message_text: "Welcome! How can I help?"
   ├─ timestamp: now()
   └─ response_type: 'system'

User Sends Messages
   ├─ Each message → Chat record
   ├─ response_type: 'user'
   ├─ AI processes & returns response
   └─ Response → Chat record (response_type: 'bot')

Scheduler Processes Sessions (nightly)
   ├─ Find sessions where expires_at < now()
   ├─ Check lead_generated flag
   ├─ If not a lead → delete ChatBot record
   ├─ Cascade delete all Chat records
   └─ Log execution to SchedulerExecutionHistory

Session Deleted
   ├─ User sees no history (session expired)
   ├─ Data removed from database
   ├─ Related avatar streams closed
   └─ Free up storage space

Leads Preserved
   ├─ If lead_generated = true
   ├─ Session NOT deleted by scheduler
   ├─ Kept for sales follow-up
   ├─ Available in admin dashboard indefinitely
   └─ Can be manually archived by admin
```

### Scheduler Job Execution

```
Backend starts (npm start)
   ├─ Initialize Express server
   ├─ Connect to database
   └─ Start schedulerRunner service

SchedulerRunner initializes
   ├─ Fetch all active jobs from SchedulerConfig
   ├─ Parse cron expressions
   ├─ Schedule each job
   └─ Wait for execution time

At scheduled time (e.g., 2:00 AM)
   ├─ Job runs automatically
   ├─ Create SchedulerExecutionHistory record
   ├─ Execute job logic (example: delete expired sessions)
   │
   │  Example: Delete Expired Sessions
   │  ├─ Query: sessions where expires_at < now() AND lead_generated = false
   │  ├─ For each session:
   │  │  ├─ Delete all Chat records (cascade)
   │  │  ├─ Delete ChatBot record
   │  │  ├─ Delete AvatarStream records
   │  │  ├─ Log event: records_deleted++
   │  │  └─ Track records_processed++
   │  │
   │  └─ Update SchedulerExecutionHistory
   │     ├─ end_time: now()
   │     ├─ status: 'success'
   │     ├─ records_processed: 1250
   │     └─ records_deleted: 1250

Job completes
   ├─ Log to database
   ├─ Log to console/file
   └─ Schedule for next occurrence

Admin can view execution history
   ├─ Login to dashboard
   ├─ View /scheduler page
   ├─ See job execution logs
   ├─ Check last run time
   └─ Verify status (success/failed)

Monitoring & Alerts
   ├─ Check if job failed
   ├─ View error_message column
   ├─ Investigate issue
   └─ Re-run or adjust job parameters
```

---

## Database Updates for Production

### Preparation

Before updating the database in a higher server (staging/production):

```bash
# 1. Create backup of current database
pg_dump -h localhost -U postgres chatbot_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup size
ls -lh backup_*.sql

# 3. Store backup securely (cloud storage, external drive, etc.)
```

### Deploying Schema Changes

#### **Step 1: Create Migration**

```bash
cd database

# Make changes to schema.prisma

# Generate migration file
npx prisma migrate dev --name describe_what_changed

# Example migration names:
# npx prisma migrate dev --name add_avatar_fields
# npx prisma migrate dev --name add_two_fa_support
# npx prisma migrate dev --name increase_message_size
```

#### **Step 2: Review Migration**

Prisma creates a SQL file in `database/prisma/migrations/`:

```sql
-- migration_timestamp_describe_change.sql

-- Drop existing constraint if needed
ALTER TABLE "Chat" ALTER COLUMN "message_text" SET DATA TYPE TEXT;

-- Add new columns
ALTER TABLE "User" ADD COLUMN "two_fa_enabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "two_fa_secret" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN "two_fa_backup_codes" TEXT;

-- Create new index
CREATE INDEX "idx_two_fa_enabled" ON "User"("two_fa_enabled");

-- Insert default values
UPDATE "User" SET "two_fa_enabled" = false WHERE "two_fa_enabled" IS NULL;
```

**Review checklist:**
- ✅ All changes are present
- ✅ No accidental data loss
- ✅ Indexes created for new columns
- ✅ Constraints properly defined

#### **Step 3: Test Locally**

```bash
# Apply migration to local database
npx prisma migrate deploy

# Test application with changes
npm run dev (in backend)

# Verify data integrity
npx prisma studio

# Check for issues in logs
```

#### **Step 4: Prepare Production Environment**

```bash
# SSH into production server
ssh user@production-server.com

# Navigate to project
cd /var/www/chatbot-project

# Pull latest code
git pull origin main

# Review changes
git diff HEAD~1 database/prisma/schema.prisma

# Install any new dependencies
npm install (in backend)
npm install (in database)
```

#### **Step 5: Backup Production Database**

```bash
# SSH into database server
ssh user@db-server.com

# Create timestamped backup
pg_dump -h localhost -U postgres chatbot_prod > \
  /backups/chatbot_prod_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh /backups/chatbot_prod_*.sql

# Upload to secure storage (optional but recommended)
# scp /backups/chatbot_prod_*.sql backup-server:/secure-storage/
```

#### **Step 6: Schedule Maintenance Window**

Notify users before migration:

```
Scheduled Maintenance:
Date: 2026-07-15
Time: 2:00 AM - 3:00 AM UTC
Duration: ~30 minutes
Impact: Chatbot unavailable during maintenance
```

#### **Step 7: Execute Migration**

```bash
# SSH into production app server
ssh user@app-server.com
cd /var/www/chatbot-project/database

# Set production database URL
export DATABASE_URL="postgresql://user:pass@db-server:5432/chatbot_prod"

# Run migration
npx prisma migrate deploy

# Check result
echo $?  # Should return 0 (success)
```

#### **Step 8: Verify Migration**

```bash
# Verify all tables/columns exist
npx prisma studio

# Run validation queries
psql -h db-server -U postgres chatbot_prod << EOF
  SELECT COUNT(*) FROM "User";
  SELECT COUNT(*) FROM "Chat";
  SELECT COUNT(*) FROM "AvatarStream";
  SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'User' 
    ORDER BY ordinal_position;
EOF

# Check database size
du -h /var/lib/postgresql/data/chatbot_prod/
```

#### **Step 9: Redeploy Application**

```bash
# Stop current backend
pm2 stop chatbot-backend

# Generate Prisma client with new schema
cd backend
npm run prisma:generate

# Start backend with new schema
pm2 start chatbot-backend

# Check status
pm2 status

# Monitor logs
pm2 logs chatbot-backend

# Verify API working
curl http://localhost:5000/health
```

#### **Step 10: Test in Production**

```bash
# Test login
curl -X POST http://api.chatbot.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chatbot.com","password":"Admin@123","captchaToken":"..."}'

# Create test session
curl -X POST http://api.chatbot.com/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"language":"en"}'

# Send test message
curl -X POST http://api.chatbot.com/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"sessionId":"...","message":"Hello"}'

# Check admin dashboard
curl http://api.chatbot.com/api/admin/stats \
  -H "Authorization: Bearer TOKEN"
```

#### **Step 11: Rollback Plan (If Issues)**

```bash
# If migration fails, rollback to previous version:

# 1. Stop application
pm2 stop chatbot-backend

# 2. Restore database from backup
psql -h db-server -U postgres chatbot_prod < \
  /backups/chatbot_prod_YYYYMMDD_HHMMSS.sql

# 3. Revert code to previous commit
git checkout HEAD~1

# 4. Regenerate Prisma client with old schema
npm run prisma:generate

# 5. Restart application
pm2 start chatbot-backend

# 6. Verify restored state
curl http://localhost:5000/health
```

### Common Migration Scenarios

#### **Scenario 1: Add New Column**

```prisma
// Before
model User {
  uid String @id
  email String
}

// After
model User {
  uid String @id
  email String
  phone_number String?    // New field
}
```

```bash
# Migrate
npx prisma migrate dev --name add_phone_number

# Generates:
# ALTER TABLE "User" ADD COLUMN "phone_number" VARCHAR(255);
```

#### **Scenario 2: Create New Model**

```prisma
// Add new model
model EmailLog {
  id String @id @default(uuid())
  user_uid String
  email_type String
  status String
  created_at DateTime @default(now())
  user User @relation(fields: [user_uid], references: [uid])
}

// Add relation to User
model User {
  // ... existing fields
  email_logs EmailLog[]
}
```

#### **Scenario 3: Change Column Type**

```prisma
// Before
model Chat {
  message_text String @db.Varchar(1000)
}

// After (increase size for longer messages)
model Chat {
  message_text String @db.Text
}

// Migrate
npx prisma migrate dev --name increase_message_length
```

#### **Scenario 4: Add Unique Constraint**

```prisma
// Before
model User {
  email String
}

// After
model User {
  email String @unique
}

// Migrate
npx prisma migrate dev --name add_unique_email
```

### Production Database Maintenance

#### **Weekly Tasks**

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('chatbot_prod'));

# Find slow queries (if slow)
SELECT mean_exec_time, calls, query FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC LIMIT 10;

# Analyze tables
ANALYZE;
```

#### **Monthly Tasks**

```bash
# Rebuild indexes (if fragmented)
REINDEX DATABASE chatbot_prod;

# Vacuum to reclaim space
VACUUM FULL;

# Backup to external storage
pg_dump -Fc chatbot_prod > chatbot_prod_monthly.dump
```

#### **Quarterly Tasks**

```bash
# Archive old chats (if storage is concern)
DELETE FROM "Chat" WHERE created_at < now() - INTERVAL '90 days'
  AND session_id NOT IN (
    SELECT session_id FROM "ChatBot" WHERE lead_generated = true
  );

# Purge old execution logs
DELETE FROM "SchedulerExecutionHistory" 
  WHERE created_at < now() - INTERVAL '180 days';

# Analyze and report
```

### Monitoring & Health Checks

#### **Backend Health**

```bash
# Check API is responding
curl http://api.chatbot.com/health

# Expected response:
# {"status":"ok"}

# Check database connection
curl http://api.chatbot.com/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Check recent errors
grep "ERROR" /var/log/chatbot/backend.log | tail -20
```

#### **Database Health**

```bash
# Check connections
SELECT count(*) as active_connections FROM pg_stat_activity;

# Check for stuck transactions
SELECT pid, usename, state, query, query_start 
  FROM pg_stat_activity 
  WHERE state != 'idle';

# Check replication lag (if applicable)
SELECT slot_name, restart_lsn, confirmed_flush_lsn 
  FROM pg_replication_slots;
```

#### **Widget Health**

```bash
# Test embedded widget
curl -X POST http://api.chatbot.com/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"language":"en"}'

# Expected response includes sessionId
```

---

## Deployment Checklist

### Pre-Deployment (1 week before)

- [ ] Code review completed
- [ ] All tests passing
- [ ] Database migrations tested locally
- [ ] Environment variables documented
- [ ] Backup strategy confirmed
- [ ] Rollback procedure documented
- [ ] Security review done (no secrets in code)
- [ ] Performance tested (load testing)

### Day Before Deployment

- [ ] Database backup created
- [ ] Code changes merged to main
- [ ] Notification sent to stakeholders
- [ ] Maintenance window scheduled
- [ ] Team on-call for support
- [ ] Rollback procedure reviewed
- [ ] Monitoring alerts set up

### Deployment Day

- [ ] Start at scheduled maintenance window
- [ ] Stop all services gracefully
- [ ] Create fresh database backup
- [ ] Deploy code to all servers
- [ ] Run database migrations
- [ ] Regenerate Prisma client
- [ ] Start backend service
- [ ] Verify health endpoints
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Verify admin dashboard working
- [ ] Test widget on staging site
- [ ] Re-enable user traffic
- [ ] Monitor performance metrics

### Post-Deployment (24 hours)

- [ ] Monitor error rates (should be normal)
- [ ] Check database performance
- [ ] Review API response times
- [ ] Verify all features working
- [ ] Check user feedback
- [ ] Review logs for any issues
- [ ] Document deployment notes
- [ ] Update deployment runbook

### Post-Deployment (1 week)

- [ ] Review metrics vs. baseline
- [ ] Collect user feedback
- [ ] Update documentation
- [ ] Plan next release cycle
- [ ] Archive deployment notes

---

## Troubleshooting Guide

### Backend Issues

#### **Backend won't start**

```bash
# Check Node.js version
node --version  # Should be 18+

# Check port already in use
lsof -i :5000

# Check environment variables
echo $DATABASE_URL
echo $JWT_SECRET

# Check database connection
npx prisma db execute --stdin < /dev/null

# View full error
npm run dev 2>&1 | head -50
```

#### **Database connection error**

```bash
# Test PostgreSQL connection
psql "postgresql://user:pass@host:5432/dbname"

# Check connection string format
# Should be: postgresql://user:password@localhost:5432/database

# Verify network connectivity
ping -c 3 database-server

# Check firewall rules
sudo ufw status
```

#### **Messages not being saved**

```bash
# Check Chat table
SELECT COUNT(*) FROM "Chat";

# Check for errors in logs
grep "error\|ERROR" backend.log | tail -20

# Verify Prisma client generated
ls backend/node_modules/.prisma/client/index.d.ts

# Regenerate client
npx prisma generate
```

### Widget Issues

#### **Widget not appearing on website**

```bash
# Check script loaded
curl https://your-cdn.com/chatbot.min.js | head -5

# Check console errors (browser developer tools)
F12 → Console tab → Look for red errors

# Check CORS issues
Network tab → POST to /api/session/create → Check headers

# Verify backend running
curl http://backend-server:5000/health

# Check widget initialization
window.ChatbotWidget  // Should exist in console
```

#### **Avatar not working**

```bash
# Check D-ID credentials in config
didClientKey: 'your_key'
didAgentId: 'your_agent'

# Verify D-ID account has credits
Login to https://www.d-id.com → Check credits

# Check WebRTC working
Network tab → Should see WebRTC connections

# Check browser support
Chrome, Firefox, Safari all support WebRTC
```

### Admin Dashboard Issues

#### **Can't login**

```bash
# Check admin user exists
SELECT * FROM "User" WHERE email = 'admin@chatbot.com';

# Reset password (dev only)
npm run seed  # Re-seeds with default password

# Check CORS headers
curl -X OPTIONS http://localhost:5173 -v
```

#### **Dashboard loads but no data**

```bash
# Check JWT token
Console → localStorage → look for token

# Verify token not expired
Paste token at jwt.io → Check exp field

# Check admin permissions
SELECT role FROM "User" WHERE email = 'admin@chatbot.com';

# Check API is returning data
curl http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Performance Issues

#### **Slow message responses**

```bash
# Check Python AI API response time
time curl http://0.0.0.0:8010/api/v1/chat

# Check database query performance
EXPLAIN ANALYZE SELECT * FROM "Chat" WHERE session_id = '...';

# Check indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'Chat';

# Monitor backend CPU/memory
top  # Linux
Task Manager  # Windows
```

#### **High database load**

```bash
# Check for long-running queries
SELECT pid, duration, query FROM pg_stat_activity 
  WHERE state != 'idle' 
  ORDER BY duration DESC;

# Kill stuck query if needed
SELECT pg_terminate_backend(pid);

# Check for missing indexes
SELECT * FROM pg_stat_user_indexes 
  WHERE idx_scan = 0;

# Run VACUUM to cleanup
VACUUM;
```

### Security Issues

#### **Suspicious login attempts**

```bash
# Check failed login attempts
SELECT * FROM "User" WHERE failed_login_attempts > 0;

# Check if account locked
SELECT * FROM "User" WHERE locked_until > now();

# Reset account lockout
UPDATE "User" SET failed_login_attempts = 0, locked_until = NULL 
  WHERE email = 'user@example.com';
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | DB not running | Start PostgreSQL |
| `JWT malformed` | Token invalid | Clear localStorage, re-login |
| `CORS error` | Origin not allowed | Add to CORS_ORIGIN in .env |
| `File too large` | Upload > 1MB | Increase limit in backend |
| `Session not found` | Expired session | Create new session |
| `D-ID token invalid` | Wrong credentials | Update didClientKey |

---

## Final Checklist

### Before Going Live

**Security:**
- [ ] Remove all hardcoded secrets
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Run security audit

**Performance:**
- [ ] Database indexes created
- [ ] Response times < 500ms
- [ ] Load test passed (1000+ concurrent)
- [ ] CDN configured for assets
- [ ] Caching configured

**Operations:**
- [ ] Monitoring alerts set up
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Disaster recovery tested
- [ ] On-call schedule ready
- [ ] Documentation complete

**Quality:**
- [ ] All tests passing
- [ ] Code review approved
- [ ] No console warnings
- [ ] Mobile responsive tested
- [ ] All browsers tested

---

## Summary

This comprehensive chatbot system consists of:

1. **Backend** - Express API handling all business logic
2. **Widget** - Embeddable vanilla JS component
3. **Admin Dashboard** - React monitoring portal
4. **Database** - PostgreSQL with Prisma ORM
5. **Avatar** - D-ID WebRTC streaming
6. **Automation** - Node-cron for scheduled jobs

Deploy with confidence using this guide! 🚀

---

**Questions?** Refer to individual component sections above.  
**Last Updated:** 2026-07-07  
**Next Review:** 2026-08-07
