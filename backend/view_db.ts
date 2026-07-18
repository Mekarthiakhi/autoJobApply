import postgres from 'postgres';
import { env } from './src/config/env.js';

const sql = postgres({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? 'require' : false,
});

async function run() {
  const users = await sql`SELECT id, email, full_name, created_at FROM users`;
  console.table(users);
  
  const settings = await sql`SELECT user_id, auto_apply_enabled, platforms_enabled FROM automation_settings`;
  console.log('\nSettings:');
  console.table(settings);
  
  await sql.end();
}
run();
