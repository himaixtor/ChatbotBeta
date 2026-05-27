/**
 * Seed default roles, admin user, and sample chat data for dashboard demos.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

const ROLES = [
  {
    role_name: 'admin',
    can_view_all_chats: true,
    can_download: true,
    can_manage_users: true,
  },
  {
    role_name: 'manager',
    can_view_all_chats: true,
    can_download: true,
    can_manage_users: false,
  },
  {
    role_name: 'viewer',
    can_view_all_chats: true,
    can_download: false,
    can_manage_users: false,
  },
];

async function seedRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { role_name: role.role_name },
      update: role,
      create: role,
    });
  }
  console.log('Roles seeded.');
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@chatbot.com' },
    update: {
      name: 'System Admin',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
    },
    create: {
      email: 'admin@chatbot.com',
      name: 'System Admin',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
    },
  });
  console.log('Admin user seeded (admin@chatbot.com / Admin@123).');
}

/** Sample sessions for dashboard charts and chat history table */
async function seedSampleChats() {
  const existing = await prisma.chatBot.count();
  if (existing > 0) {
    console.log('Sample chats already exist, skipping.');
    return;
  }

  const now = new Date();
  const languages = ['English', 'Hindi', 'Gujarati'];
  const samples = [];

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const sessionsPerDay = 3 + (day % 5);

    for (let i = 0; i < sessionsPerDay; i++) {
      const lang = languages[(day + i) % languages.length];
      const lead = (day + i) % 3 === 0;
      const expires = new Date(date);
      expires.setHours(expires.getHours() + 24);

      samples.push({
        session: {
          name: `User ${day}-${i}`,
          email: `user${day}${i}@example.com`,
          chat_language: lang,
          interested_in: lead ? 'pricing' : 'general inquiry',
          lead_generated: lead,
          created_at: date,
          expires_at: expires,
        },
        messages: [
          { response_type: 'user', message_text: 'Hello, I need help.' },
          {
            response_type: 'AI',
            message_text: 'Hi! How can I assist you today?',
          },
          {
            response_type: 'user',
            message_text: lead ? 'Tell me about pricing.' : 'What are your hours?',
          },
          {
            response_type: 'AI',
            message_text: lead
              ? 'Our pricing starts at $99/month.'
              : 'We are open 9 AM to 6 PM.',
          },
        ],
      });
    }
  }

  for (const sample of samples) {
    const bot = await prisma.chatBot.create({
      data: sample.session,
    });
    for (const msg of sample.messages) {
      await prisma.chat.create({
        data: {
          session_id: bot.session_id,
          ...msg,
          timestamp: sample.session.created_at,
        },
      });
    }
  }

  console.log(`Sample chats seeded (${samples.length} sessions).`);
}

async function main() {
  await seedRoles();
  await seedAdminUser();
  await seedSampleChats();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
