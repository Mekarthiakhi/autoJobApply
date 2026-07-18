import 'dotenv/config';
import { getDatabase } from '../config/database.js';

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
  const sql = getDatabase();
  
  try {
    console.log('Seeding database...');
    
    // Find test user
    const users = await sql`SELECT id FROM users WHERE email = 'test@example.com'`;
    if (users.length === 0) {
      console.log('User test@example.com not found. Please register this user first.');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`Found user ID: ${userId}`);

    // Insert jobs
    for (const job of mockJobs) {
      const insertedJob = await sql`
        INSERT INTO jobs (
          title, company_name, location, salary, experience_level, 
          required_skills, job_description, apply_url, source, external_id
        ) VALUES (
          ${job.title}, ${job.company_name}, ${job.location}, ${job.salary}, 
          ${job.experience_level}, ${job.required_skills}, ${job.job_description}, 
          ${job.apply_url}, ${job.source}, ${job.external_id}
        )
        ON CONFLICT (source, external_id) DO UPDATE SET 
          title = EXCLUDED.title
        RETURNING id
      `;
      
      const jobId = insertedJob[0].id;
      
      // Randomly create match scores
      const matchScore = Math.floor(Math.random() * 30) + 70; // 70 to 99
      await sql`
        INSERT INTO match_scores (user_id, job_id, match_score, missing_skills, matching_skills, recommendation)
        VALUES (
          ${userId}, ${jobId}, ${matchScore}, 
          '{"Docker"}', '{"React", "TypeScript"}', 'Strong Match'
        )
        ON CONFLICT (user_id, job_id) DO NOTHING
      `;
      
      // Randomly apply to some jobs to seed applications
      if (Math.random() > 0.5) {
        const statuses = ['applied', 'interview', 'rejected', 'offer'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        await sql`
          INSERT INTO applications (user_id, job_id, status)
          VALUES (${userId}, ${jobId}, ${randomStatus})
          ON CONFLICT (user_id, job_id) DO NOTHING
        `;
      }
    }
    
    console.log('✅ Database seeded successfully!');
    
  } catch (err) {
    console.error('Failed to seed:', err);
  } finally {
    await sql.end();
  }
}

seed();
