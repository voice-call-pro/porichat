import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seeding process...\n');

  // ISSUE 1 & 6: Enforce strong passwords via Environment Variables
  const { ADMIN_PASSWORD, MOD_PASSWORD, TEST_PASSWORD } = process.env;

  if (!ADMIN_PASSWORD || !MOD_PASSWORD || !TEST_PASSWORD) {
    throw new Error(
      '❌ FATAL: Missing required environment variables. Please set ADMIN_PASSWORD, MOD_PASSWORD, and TEST_PASSWORD.'
    );
  }

  if (ADMIN_PASSWORD.length < 8) {
    console.warn('⚠️ WARNING: Admin password is too short. Consider using a stronger password.');
  }

  try {
    // Hash passwords concurrently
    const [adminHash, modHash, testHash] = await Promise.all([
      bcrypt.hash(ADMIN_PASSWORD, 12), // Using 12 rounds for better security
      bcrypt.hash(MOD_PASSWORD, 10),
      bcrypt.hash(TEST_PASSWORD, 10),
    ]);

    console.log('👤 Synchronizing user accounts...');

    // ISSUE 9 & 8: Parallel execution and accurate logging
    const [admin, moderator, testUser] = await Promise.all([
      prisma.user.upsert({
        where: { email: 'admin@porichat.com' },
        update: { passwordHash: adminHash, role: 'admin' },
        create: {
          email: 'admin@porichat.com',
          name: 'Admin',
          passwordHash: adminHash,
          role: 'admin',
          isBanned: false,
          isOnline: false,
        },
      }),
      prisma.user.upsert({
        where: { email: 'mod@porichat.com' },
        update: { passwordHash: modHash, role: 'moderator' },
        create: {
          email: 'mod@porichat.com',
          name: 'Moderator',
          passwordHash: modHash,
          role: 'moderator',
          isBanned: false,
          isOnline: false,
        },
      }),
      prisma.user.upsert({
        where: { email: 'test@test.com' },
        update: { passwordHash: testHash, role: 'user' },
        create: {
          email: 'test@test.com',
          name: 'TestUser',
          passwordHash: testHash,
          role: 'user',
          isBanned: false,
          isOnline: false,
        },
      }),
    ]);

    console.log(`  ✅ Ensured Admin: ${admin.email}`);
    console.log(`  ✅ Ensured Moderator: ${moderator.email}`);
    console.log(`  ✅ Ensured Test User: ${testUser.email}`);

    console.log('\n⚙️  Synchronizing system settings...');

    const settings = [
      { key: 'chat_enabled', value: 'true', type: 'boolean', description: 'Enable or disable the chat system globally' },
      { key: 'report_system_enabled', value: 'true', type: 'boolean', description: 'Enable or disable the report system' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Enable maintenance mode to block user access' },
      { key: 'auto_ban_threshold', value: '5', type: 'number', description: 'Number of reports before auto-ban triggers' },
      { key: 'max_messages_per_minute', value: '30', type: 'number', description: 'Maximum messages allowed per user per minute' },
      { key: 'lockdown_mode', value: 'false', type: 'boolean', description: 'Emergency lockdown mode - admin only toggle' },
    ];

    // Use Prisma Transactions for multiple sequential writes
    const settingTransactions = settings.map((setting) =>
      prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, description: setting.description },
        create: setting,
      })
    );

    await prisma.$transaction(settingTransactions);
    console.log(`  ✅ Ensured ${settings.length} system settings.`);

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    // ISSUE 12: Graceful error handling
    console.error('\n❌ SEED FAILED: An error occurred during database seeding.');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
