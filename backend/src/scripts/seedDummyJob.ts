import { getDatabase, initializeDatabase } from '../config/database.js';
import { reviewAgent } from '../services/reviewAgent.js';

async function seed() {
  await initializeDatabase();
  const db = await getDatabase();
  
  let user = await db.get(`SELECT id FROM users LIMIT 1`);
  if (!user) {
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      ['test@example.com', 'hash', 'Test User']
    );
    user = await db.get(`SELECT id FROM users LIMIT 1`);
  }

  // Insert dummy job
  const jobId = 'dummy-job-1';
  await db.run(
    `INSERT OR IGNORE INTO jobs (id, title, company_name, location, salary, job_description, apply_url, source, external_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId, 
      'Senior Frontend Engineer', 
      'Tech Innovators Inc', 
      'Remote', 
      '$120k - $150k', 
      'We are looking for a skilled Frontend Developer...', 
      'https://www.linkedin.com/jobs/view/1234567890', 
      'linkedin', 
      'linkedin-dummy-1', 
      'NEW'
    ]
  );

  // Queue for review
  await reviewAgent.queueForReview(user.id, jobId, {
    matchScore: 92,
    warnings: ['The job requires 5 years of experience (you have 4).'],
    scrapedQuestions: ['Are you authorized to work in the US?']
  });

  console.log('Dummy job successfully seeded into the Review Queue!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
