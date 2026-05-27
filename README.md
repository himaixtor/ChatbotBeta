# Chatbot Project

Full-stack chatbot system with an embeddable widget, admin portal, and Node.js API.

## Structure

| Folder | Description |
|--------|-------------|
| `database/` | PostgreSQL + Prisma schema, migrations, seed |
| `backend/` | Express REST API |
| `chatbot/` | Vanilla JS embeddable widget |
| `chatbot-admin/` | React admin dashboard |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Quick Start

### 1. Database

```bash
cd database
cp .env.example .env
# Edit DATABASE_URL in .env
npm install
npx prisma migrate dev --name init
npm run seed
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Copy DATABASE_URL from database/.env; set JWT secrets
npm install
npm run dev
```

API runs at `http://localhost:5000`.

### 3. Chatbot Widget

```bash
cd chatbot
npm install
npm run build
```

Open `chatbot/dist/demo.html` in a browser (with backend running).

### 4. Admin Portal

```bash
cd chatbot-admin
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` and sign in:

- **Email:** `admin@chatbot.com`
- **Password:** `Admin@123`

## Default Roles

| Role | View chats | Download | Manage users |
|------|------------|----------|--------------|
| admin | ✓ | ✓ | ✓ |
| manager | ✓ | ✓ | ✗ |
| viewer | ✓ | ✗ | ✗ |

## Widget Embed

```html
<script src="https://your-cdn.com/chatbot.min.js"></script>
<script>
  ChatbotWidget.init({
    apiEndpoint: 'http://localhost:5000',
    botName: 'Support Bot',
    welcomeMessage: 'Hi! How can I help you today?',
    primaryColor: '#3B82F6',
    position: 'bottom-right'
  });
</script>
```

## API Overview

- `POST /api/auth/login` — Admin authentication
- `POST /api/session/create` — Widget session
- `POST /api/chat/message` — Send message (mock AI)
- `GET /api/admin/stats` — Dashboard stats (JWT)
- `GET /api/admin/chats` — Paginated chat list (JWT)

## Python AI (placeholder)

Set `PYTHON_AI_API_URL` in backend `.env`. Mock responses are used by default until the Python service is ready. Set `USE_MOCK_AI=false` to call the real API.

## Create a manager user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@chatbot.com","password":"Manager@123","name":"Manager User","role":"manager"}'
```
