import 'dotenv/config';
import { getDatabase, initializeDatabase } from '../config/database.js';

const mockJobs = [
  {
    title: 'Senior Frontend Engineer',
    company_name: 'TechFlow',
    location: 'Remote',
    salary: '$140k - $160k',
    experience_level: 'Senior',
    required_skills: ['React', 'TypeScript', 'Node.js'],
    job_description: 'Looking for a senior frontend engineer to lead our React architecture.',
    apply_url: 'https://example.com/apply/1',
    source: 'LinkedIn',
    external_id: 'li_12345',
  },
  {
    title: 'Full Stack Developer',
    company_name: 'Innovate AI',
    location: 'San Francisco, CA (Hybrid)',
    salary: '$130k - $170k',
    experience_level: 'Mid-Senior',
    required_skills: ['React', 'Python', 'PostgreSQL'],
    job_description: 'Join our AI startup to build internal tools and customer-facing apps.',
    apply_url: 'https://example.com/apply/2',
    source: 'Indeed',
    external_id: 'ind_9876',
  },
  {
    title: 'React Native Developer',
    company_name: 'AppWorks',
    location: 'Remote',
    salary: '$110k - $140k',
    experience_level: 'Mid',
    required_skills: ['React Native', 'TypeScript', 'Mobile'],
    job_description: 'Mobile developer needed for our flagship application.',
    apply_url: 'https://example.com/apply/3',
    source: 'Wellfound',
    external_id: 'wf_456',
  },
  {
    title: 'Backend Engineer (Node.js)',
    company_name: 'CloudSync',
    location: 'New York, NY',
    salary: '$150k - $180k',
    experience_level: 'Senior',
    required_skills: ['Node.js', 'Express', 'AWS', 'PostgreSQL'],
    job_description: 'Scale our core backend services to handle millions of requests.',
    apply_url: 'https://example.com/apply/4',
    source: 'LinkedIn',
    external_id: 'li_87654',
  },
  {
    title: 'Frontend Developer',
    company_name: 'DesignStudio',
    location: 'Remote',
    salary: '$90k - $120k',
    experience_level: 'Junior-Mid',
    required_skills: ['React', 'CSS', 'Figma'],
    job_description: 'Translate Figma designs into pixel-perfect React components.',
    apply_url: 'https://example.com/apply/5',
    source: 'Glassdoor',
    external_id: 'gd_234',
  }
];

async function seed() {
  await initializeDatabase();
  const db = await getDatabase();
  
  try {
    console.log('Seeding database...');
    
    // Find test user
    const users = await db.all(`SELECT id FROM users WHERE email = 'test@example.com'`);
    if (users.length === 0) {
      console.log('User test@example.com not found. Please register this user first.');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`Found user ID: ${userId}`);

    // Insert jobs
    for (const job of mockJobs) {
      await db.run(
        `INSERT INTO jobs (
          title, company_name, location, salary, experience_level, 
          required_skills, job_description, apply_url, source, external_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (source, external_id) DO UPDATE SET title = excluded.title`,
        [
          job.title, job.company_name, job.location, job.salary, 
          job.experience_level, JSON.stringify(job.required_skills), job.job_description, 
          job.apply_url, job.source, job.external_id
        ]
      );
      
      const insertedJob = await db.get(
        `SELECT id FROM jobs WHERE source = ? AND external_id = ?`,
        [job.source, job.external_id]
      );
      const jobId = insertedJob?.id;
      if (!jobId) continue;
      
      // Randomly create match scores
      const matchScore = Math.floor(Math.random() * 30) + 70; // 70 to 99
      await db.run(
        `INSERT INTO match_scores (user_id, job_id, match_score, missing_skills, matching_skills, recommendation)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, job_id) DO NOTHING`,
        [
          userId, jobId, matchScore, 
          JSON.stringify(['Docker']), JSON.stringify(['React', 'TypeScript']), 'Strong Match'
        ]
      );
      
      // Randomly apply to some jobs to seed applications
      if (Math.random() > 0.5) {
        const statuses = ['applied', 'interview', 'rejected', 'offer'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        await db.run(
          `INSERT INTO applications (user_id, job_id, status)
          VALUES (?, ?, ?)
          ON CONFLICT (user_id, job_id) DO NOTHING`,
          [userId, jobId, randomStatus]
        );
      }
    }
    
    console.log('✅ Database seeded successfully!');
    
  } catch (err) {
    console.error('Failed to seed:', err);
  }
}

seed();
