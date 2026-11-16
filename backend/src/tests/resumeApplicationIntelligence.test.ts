import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, closeDatabase, getDatabase } from '../config/database.js';
import { 
  candidateExtractor, 
  atsEvaluator, 
  resumeTailoringEngine, 
  documentValidator, 
  pdfExporter,
  StructuredResume 
} from '../resumes/index.js';
import { ResumeVersionRepository } from '../repositories/resumeVersionRepository.js';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { coverLetterAgent } from '../services/coverLetterAgent.js';

describe('Phase 9: Resume and Application Intelligence Tests', () => {
  let resumeVersionRepo: ResumeVersionRepository;
  let applicationRepo: ApplicationRepository;
  let jobRepo: JobRepository;
  let testUserId: string;
  let sampleResumeText: string;

  before(async () => {
    await initializeDatabase();
    resumeVersionRepo = new ResumeVersionRepository();
    applicationRepo = new ApplicationRepository();
    jobRepo = new JobRepository();

    const db = await getDatabase();
    // Create a mock test user
    const testEmail = `test_candidate_${Date.now()}@example.com`;
    await db.run(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [testEmail, 'hash123', 'Jane Doe']
    );
    const userRow = await db.get(`SELECT id FROM users WHERE email = ?`, [testEmail]);
    testUserId = userRow.id;

    sampleResumeText = `
Jane Doe
jane.doe@example.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/janedoe | https://github.com/janedoe

SUMMARY
Experienced Full Stack Engineer with 4 years of experience building distributed web applications using TypeScript, React, and Node.js.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, Go
Frameworks: React, Next.js, Node.js, Express, Tailwind
Databases & Cloud: PostgreSQL, Redis, Docker, Kubernetes, AWS
Tools & Practices: Git, GitHub Actions, CI/CD, Agile, System Design

WORK EXPERIENCE
Senior Backend Engineer at Acme Corp, San Francisco, CA
Jan 2022 - Present
• Architected and deployed microservices processing 10M daily requests using Node.js and TypeScript.
• Reduced API response latency by 35% by implementing Redis caching and database query optimization.
• Spearheaded migration of legacy services to Docker and Kubernetes on AWS.

Software Engineer at TechStart Inc, Remote
Jun 2020 - Dec 2021
• Developed responsive frontend interfaces with React and Next.js, improving user engagement by 20%.
• Built RESTful APIs in Node.js and integrated PostgreSQL database layers with automated CI/CD pipelines.

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley, 2020

PROJECTS
CloudMetrics Dashboard
• Real-time observability dashboard built with Next.js, TypeScript, and Prometheus.
• Integrated GraphQL APIs and WebSocket streaming for live metric alerting.

CERTIFICATIONS
AWS Certified Solutions Architect – Amazon Web Services (2022)
    `.trim();
  });

  after(async () => {
    // Database cleanup can happen or be left in WAL
  });

  describe('1. Structured Candidate Information Extraction', () => {
    it('extracts contact details, basics and professional summary correctly', async () => {
      const extracted = candidateExtractor.extractDeterministically(sampleResumeText);

      assert.strictEqual(extracted.basics.fullName, 'Jane Doe');
      assert.strictEqual(extracted.basics.email, 'jane.doe@example.com');
      assert.ok(extracted.basics.phone?.includes('555'));
      assert.ok(extracted.basics.linkedinUrl?.includes('linkedin.com/in/janedoe'));
      assert.ok(extracted.basics.githubUrl?.includes('github.com/janedoe'));
      assert.ok(extracted.basics.summary?.includes('Full Stack Engineer'));
    });

    it('identifies and categorizes technical skills accurately', async () => {
      const extracted = candidateExtractor.extractDeterministically(sampleResumeText);

      assert.ok(extracted.skills.all.length >= 10, 'Should extract at least 10 skills');
      assert.ok(extracted.skills.languages.includes('TypeScript'));
      assert.ok(extracted.skills.languages.includes('Python'));
      assert.ok(extracted.skills.frameworks.includes('React'));
      assert.ok(extracted.skills.frameworks.includes('Node.js'));
      assert.ok(extracted.skills.databases.includes('PostgreSQL'));
      assert.ok(extracted.skills.databases.includes('Redis'));
      assert.ok(extracted.skills.cloudDevOps.includes('AWS'));
      assert.ok(extracted.skills.cloudDevOps.includes('Docker'));
      assert.ok(extracted.skills.cloudDevOps.includes('Kubernetes'));
    });

    it('extracts work experience, education, projects, and certifications', async () => {
      const extracted = candidateExtractor.extractDeterministically(sampleResumeText);

      assert.ok(extracted.experience.length >= 2, 'Should identify at least 2 experience items');
      const exp1 = extracted.experience[0];
      assert.ok(exp1.company.includes('Acme'));
      assert.ok(exp1.highlights.length >= 2);
      assert.strictEqual(exp1.isCurrent, true);

      assert.ok(extracted.education.length >= 1, 'Should identify education entry');
      assert.ok(extracted.education[0].institution.includes('Berkeley'));

      assert.ok(extracted.projects.length >= 1, 'Should identify projects');
      assert.ok(extracted.projects[0].name.includes('CloudMetrics'));

      assert.ok(extracted.certifications.length >= 1, 'Should identify certifications');
      assert.ok(extracted.certifications[0].name.includes('AWS Certified'));
    });
  });

  describe('2. ATS Compatibility & Explainable Assessment', () => {
    it('generates a 5-dimension explainable ATS assessment against a job description', async () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);
      const targetJob = {
        title: 'Senior Backend Engineer',
        description: 'We are seeking a Senior Backend Engineer with 4+ years of experience with Node.js, TypeScript, PostgreSQL, and AWS. Knowledge of Redis and Docker is required. Rust experience is a plus.',
        requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Redis', 'Docker', 'Rust'],
        companyName: 'Stripe',
      };

      const evalResult = await atsEvaluator.evaluate(structured, targetJob);

      assert.ok(evalResult.overallScore >= 75, `Expected score >= 75, got ${evalResult.overallScore}`);
      assert.ok(evalResult.breakdown.keywordMatch.score > 20);
      assert.ok(evalResult.breakdown.experienceRelevance.score > 15);
      assert.ok(evalResult.breakdown.formattingParseability.score >= 12);
      assert.ok(evalResult.breakdown.educationRelevance.score >= 10);
      assert.ok(evalResult.breakdown.quantifiableImpact.score >= 5);

      // Verify keyword matches and missing
      assert.ok(evalResult.matchingKeywords.includes('TypeScript'));
      assert.ok(evalResult.matchingKeywords.includes('Node.js'));
      assert.ok(evalResult.missingKeywords.includes('Rust'));

      // Verify explainable summary is generated
      assert.ok(evalResult.explainableSummary.includes('Jane') || evalResult.explainableSummary.includes('Candidate') || evalResult.explainableSummary.includes('resume'));
    });

    it('suggests improvements grounded in fact without hallucinating qualifications', async () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);
      const targetJob = {
        title: 'Principal Distributed Systems Engineer',
        description: 'Requires 8+ years experience, expert knowledge of Golang, Kafka, and Kubernetes.',
        requiredSkills: ['Go', 'Kafka', 'Kubernetes'],
        companyName: 'Scale AI',
      };

      const evalResult = await atsEvaluator.evaluate(structured, targetJob);

      // All suggestions must have groundedInFact = true
      assert.ok(evalResult.suggestions.length > 0);
      evalResult.suggestions.forEach(s => {
        assert.strictEqual(s.groundedInFact, true, 'Suggestions must be grounded in facts');
      });

      // Experience gap identified
      assert.ok(evalResult.experienceGaps.length > 0);
      assert.ok(evalResult.experienceGaps[0].includes('experience'));
    });
  });

  describe('3. Job-Specific Resume Tailoring (Non-Destructive)', () => {
    it('generates a job-tailored draft without mutating or replacing the original', async () => {
      const baseline = candidateExtractor.extractDeterministically(sampleResumeText);
      const targetJob = {
        id: 'job-123',
        title: 'Staff Platform Engineer',
        companyName: 'Cloudflare',
        description: 'Seeking Staff Platform Engineer with deep expertise in Kubernetes, Docker, and AWS.',
        requiredSkills: ['Kubernetes', 'Docker', 'AWS'],
      };

      const originalSummary = baseline.basics.summary;
      const draft = await resumeTailoringEngine.generateTailoredDraft(baseline, 'ver-base-1', targetJob);

      assert.strictEqual(draft.targetJobId, 'job-123');
      assert.strictEqual(draft.parentVersionId, 'ver-base-1');
      assert.ok(draft.tailoredSummary.includes('Cloudflare'));
      assert.ok(draft.isReviewable, 'Draft must be candidate reviewable');

      // Verify original baseline was not mutated
      assert.strictEqual(baseline.basics.summary, originalSummary);

      // Verify Kubernetes and AWS were moved to the top of skills
      assert.strictEqual(draft.tailoredSkills.cloudDevOps[0], 'AWS');
    });
  });

  describe('4. Document Validation & PDF Export', () => {
    it('validates resume structure and detects completeness', () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);
      const result = documentValidator.validate(structured);

      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.wordCount > 150);
      assert.strictEqual(result.estimatedPageCount, 1);
    });

    it('detects incomplete resumes with missing contact info', () => {
      const emptyResume: StructuredResume = {
        basics: { fullName: '', email: '' },
        skills: { languages: [], frameworks: [], cloudDevOps: [], databases: [], tools: [], softSkills: [], all: [] },
        experience: [],
        education: [],
        projects: [],
        certifications: [],
      };

      const result = documentValidator.validate(emptyResume);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('name')));
      assert.ok(result.errors.some(e => e.includes('email')));
      assert.ok(result.missingSections.includes('Experience'));
    });

    it('renders clean ATS-compliant HTML for export', () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);
      const html = pdfExporter.renderToHTML(structured);

      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('Jane Doe'));
      assert.ok(html.includes('jane.doe@example.com'));
      assert.ok(html.includes('Work Experience'));
      assert.ok(html.includes('Acme Corp'));
      assert.ok(html.includes('Technical Skills'));
    });

    it('exports real PDF buffer using headless Chromium', async () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);
      const pdfBuffer = await pdfExporter.exportToPDF(structured);

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 1000, 'PDF buffer should be valid non-trivial size');
      // PDF header check (%PDF-)
      assert.strictEqual(pdfBuffer.subarray(0, 4).toString(), '%PDF');
    });
  });

  describe('5. Multiple Versions, History & Application Lineage Tracking', () => {
    it('creates multiple resume versions and supports version cloning and default switching', async () => {
      const structured = candidateExtractor.extractDeterministically(sampleResumeText);

      // 1. Create base version
      const v1 = await resumeVersionRepo.create(
        testUserId,
        'Base Full Stack Resume',
        'resume.pdf',
        sampleResumeText,
        structured.skills.all,
        { structuredData: structured, versionNumber: 1 }
      );
      assert.strictEqual(v1.is_default, 1, 'First version should default to active');

      // 2. Clone to create a branched version
      const v2 = await resumeVersionRepo.clone(testUserId, v1.id, 'Frontend Specialized');
      assert.strictEqual(v2.parent_version_id, v1.id);
      assert.strictEqual(v2.version_number, 2);

      // 3. Switch default version
      await resumeVersionRepo.setDefault(testUserId, v2.id);
      const defaultVer = await resumeVersionRepo.findDefault(testUserId);
      assert.strictEqual(defaultVer?.id, v2.id);

      // 4. Trace history
      const history = await resumeVersionRepo.findHistory(testUserId, v1.id);
      assert.ok(history.length >= 2);
    });

    it('tracks which resume version was used for each application (Requirement 12)', async () => {
      const versions = await resumeVersionRepo.findByUserId(testUserId);
      const usedVersion = versions[0];

      // Create a test job
      const savedJob = await jobRepo.create({
        title: 'Backend Systems Engineer',
        company_name: 'Netflix',
        location: 'Los Gatos, CA',
        salary: '$160,000 - $220,000',
        experience_level: 'Senior',
        required_skills: ['TypeScript', 'Node.js'],
        apply_url: 'https://netflix.jobs/test',
        source: 'manual',
        external_id: `netflix-test-${Date.now()}`,
        status: 'active',
        employment_type: 'Full-Time',
        posted_date: new Date(),
        job_description: 'Building streaming services with TypeScript and Node.js',
      });

      // Submit/record an application linked to usedVersion
      const app = await applicationRepo.create(testUserId, savedJob.id, {
        resumeVersionId: usedVersion.id,
        notes: 'Submitted via company portal with tailored backend resume',
        matchScore: 92,
      });

      assert.strictEqual(app.job_id, savedJob.id);
      assert.strictEqual(app.resume_version_id, usedVersion.id);

      // Query applications using this specific resume version
      const linkedApps = await applicationRepo.findByResumeVersionId(testUserId, usedVersion.id);
      assert.ok(linkedApps.length >= 1);
      assert.strictEqual(linkedApps[0].job_title, 'Backend Systems Engineer');
      assert.strictEqual(linkedApps[0].company_name, 'Netflix');
      assert.strictEqual(linkedApps[0].resume_version_label, usedVersion.label);
    });
  });

  describe('6. Tailored Cover Letter Generation', () => {
    it('generates a tailored, grounded cover letter without placeholders or hallucinations', async () => {
      const coverLetter = await coverLetterAgent.generateCoverLetter(
        sampleResumeText,
        'Senior Backend Developer responsible for microservices and cloud infrastructure at Netflix.',
        'Senior Backend Developer',
        'Netflix'
      );

      assert.ok(coverLetter.length > 50);
      assert.ok(coverLetter.includes('Netflix'));
      assert.ok(!coverLetter.includes('[Your Name]'), 'Should not contain [Your Name] placeholder');
      assert.ok(!coverLetter.includes('[Date]'), 'Should not contain [Date] placeholder');
    });
  });
});
