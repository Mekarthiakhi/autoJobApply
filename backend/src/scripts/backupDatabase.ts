import { databaseBackupManager } from '../utils/databaseBackup.js';
import { initializeDatabase, closeDatabase } from '../config/database.js';

async function run() {
  try {
    console.log('🔄 Initializing database connection for backup...');
    await initializeDatabase();

    const result = await databaseBackupManager.createBackup();
    if (result.success) {
      console.log(`✅ Database backup created successfully: ${result.backupPath} (${result.sizeBytes} bytes)`);
    } else {
      console.error(`❌ Database backup failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during backup script:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

run();

