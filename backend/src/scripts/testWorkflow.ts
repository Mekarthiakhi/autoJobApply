import { workflowOrchestrator } from '../services/WorkflowOrchestrator.js';
import { getDatabase, initializeDatabase } from '../config/database.js';

async function run() {
  await initializeDatabase();
  const db = await getDatabase();
  
  // Find or create a user
  let user = await db.get(`SELECT id FROM users LIMIT 1`);
  if (!user) {
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      ['test@example.com', 'hash', 'Test User']
    );
    user = await db.get(`SELECT id FROM users LIMIT 1`);
  }

  console.log(`Triggering workflow for user: ${user.id}`);
  await workflowOrchestrator.runWorkflow(user.id);
  
  console.log('Done!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
