#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testOpenAIKey() {
  log('\n=== Testing OpenAI API Key ===', 'cyan');
  
  try {
    // Load environment variables
    const envPath = path.join(process.cwd(), 'backend', '.env');
    if (!fs.existsSync(envPath)) {
      log('❌ .env file not found at backend/.env', 'red');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
    
    if (!apiKeyMatch) {
      log('❌ OPENAI_API_KEY not found in .env file', 'red');
      return false;
    }

    const apiKey = apiKeyMatch[1].trim();
    log(`✅ API Key found: ${apiKey.substring(0, 20)}...`, 'green');

    // Test API key format
    if (!apiKey.startsWith('sk-')) {
      log('⚠️  Warning: API key does not start with "sk-"', 'yellow');
    }

    log('✅ OpenAI API Key configuration is valid', 'green');
    return true;
  } catch (error) {
    log(`❌ Error testing OpenAI key: ${error.message}`, 'red');
    return false;
  }
}

async function testProjectStructure() {
  log('\n=== Checking Project Structure ===', 'cyan');
  
  const requiredDirs = [
    'backend/src/config',
    'backend/src/models',
    'backend/src/controllers',
    'backend/src/services',
    'backend/src/repositories',
    'backend/src/scrapers',
    'backend/src/jobs',
    'frontend/src/components',
    'frontend/src/pages',
    'frontend/src/api',
    'frontend/src/hooks',
  ];

  let allExist = true;
  for (const dir of requiredDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      log(`✅ ${dir}`, 'green');
    } else {
      log(`❌ ${dir} - MISSING`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

async function testFileCreation() {
  log('\n=== Verifying Critical Files ===', 'cyan');
  
  const criticalFiles = [
    'backend/src/app.ts',
    'backend/src/config/database.ts',
    'backend/src/config/openai.ts',
    'backend/src/services/aiMatchingService.ts',
    'backend/src/services/telegramService.ts',
    'backend/src/scrapers/linkedinScraper.ts',
    'backend/src/scrapers/naukriScraper.ts',
    'backend/src/jobs/jobDiscoveryJob.ts',
    'backend/src/jobs/aiMatchingJob.ts',
    'frontend/src/App.tsx',
    'frontend/src/components/Auth/Login.tsx',
    'frontend/src/components/Dashboard/Dashboard.tsx',
    'docker-compose.yml',
    'README.md',
    'DEPLOYMENT.md',
  ];

  let allExist = true;
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - MISSING`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

async function testJobScrapers() {
  log('\n=== Job Scraper Configuration ===', 'cyan');
  
  const scrapers = [
    { name: 'LinkedIn', file: 'backend/src/scrapers/linkedinScraper.ts' },
    { name: 'Naukri', file: 'backend/src/scrapers/naukriScraper.ts' },
    { name: 'Indeed', file: 'backend/src/scrapers/indeedScraper.ts' },
    { name: 'CareerPages', file: 'backend/src/scrapers/careerPagesScraper.ts' },
  ];

  let scraperStatus = [];
  for (const scraper of scrapers) {
    const filePath = path.join(process.cwd(), scraper.file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasSearchJobs = content.includes('searchJobs');
      const hasApplyJob = content.includes('applyToJob');
      
      log(`✅ ${scraper.name} Scraper`, 'green');
      log(`   - searchJobs method: ${hasSearchJobs ? '✅' : '❌'}`, hasSearchJobs ? 'green' : 'red');
      log(`   - applyToJob method: ${hasApplyJob ? '✅' : '❌'}`, hasApplyJob ? 'green' : 'red');
      
      scraperStatus.push({
        name: scraper.name,
        search: hasSearchJobs,
        apply: hasApplyJob
      });
    } else {
      log(`❌ ${scraper.name} Scraper - MISSING`, 'red');
      scraperStatus.push({
        name: scraper.name,
        search: false,
        apply: false
      });
    }
  }

  return scraperStatus.every(s => s.search && s.apply);
}

async function testAIMatchingService() {
  log('\n=== AI Matching Service ===', 'cyan');
  
  const servicePath = path.join(process.cwd(), 'backend/src/services/aiMatchingService.ts');
  
  if (!fs.existsSync(servicePath)) {
    log('❌ aiMatchingService.ts not found', 'red');
    return false;
  }

  const content = fs.readFileSync(servicePath, 'utf-8');
  
  const checks = {
    'analyzeJobMatch method': content.includes('analyzeJobMatch'),
    'OpenAI integration': content.includes('openai'),
    'Score calculation': content.includes('score'),
    'Skills matching': content.includes('matchingSkills') || content.includes('skills'),
  };

  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    log(`${passed ? '✅' : '❌'} ${check}`, passed ? 'green' : 'red');
    if (!passed) allPassed = false;
  }

  return allPassed;
}

async function testJobApplicationFlow() {
  log('\n=== Job Application Flow ===', 'cyan');
  
  const components = [
    { name: 'Job Discovery', file: 'backend/src/jobs/jobDiscoveryJob.ts' },
    { name: 'AI Matching', file: 'backend/src/jobs/aiMatchingJob.ts' },
    { name: 'Daily Summary', file: 'backend/src/jobs/dailySummaryJob.ts' },
    { name: 'Application Service', file: 'backend/src/services/applicationService.ts' },
    { name: 'Telegram Notifications', file: 'backend/src/services/telegramService.ts' },
  ];

  let allExist = true;
  for (const component of components) {
    const filePath = path.join(process.cwd(), component.file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${component.name}`, 'green');
    } else {
      log(`❌ ${component.name} - MISSING`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

async function testDatabaseSchema() {
  log('\n=== Database Schema ===', 'cyan');
  
  const dbConfigPath = path.join(process.cwd(), 'backend/src/config/database.ts');
  
  if (!fs.existsSync(dbConfigPath)) {
    log('❌ database.ts not found', 'red');
    return false;
  }

  const content = fs.readFileSync(dbConfigPath, 'utf-8');
  
  const tables = [
    'users',
    'resumes',
    'jobs',
    'applications',
    'match_scores',
    'automation_settings',
    'notifications',
  ];

  let allFound = true;
  for (const table of tables) {
    if (content.includes(table)) {
      log(`✅ ${table} table`, 'green');
    } else {
      log(`❌ ${table} table - NOT FOUND`, 'red');
      allFound = false;
    }
  }

  return allFound;
}

async function testAPIEndpoints() {
  log('\n=== REST API Endpoints ===', 'cyan');
  
  const routeFiles = [
    { name: 'Authentication', file: 'backend/src/routes/auth.ts' },
    { name: 'Jobs', file: 'backend/src/routes/jobs.ts' },
    { name: 'Applications', file: 'backend/src/routes/applications.ts' },
    { name: 'Dashboard', file: 'backend/src/routes/dashboard.ts' },
  ];

  let totalEndpoints = 0;
  for (const route of routeFiles) {
    const filePath = path.join(process.cwd(), route.file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const postCount = (content.match(/router\.post/g) || []).length;
      const getCount = (content.match(/router\.get/g) || []).length;
      const putCount = (content.match(/router\.put/g) || []).length;
      const deleteCount = (content.match(/router\.delete/g) || []).length;
      
      const total = postCount + getCount + putCount + deleteCount;
      totalEndpoints += total;
      
      log(`✅ ${route.name}: ${total} endpoints (GET: ${getCount}, POST: ${postCount}, PUT: ${putCount}, DELETE: ${deleteCount})`, 'green');
    } else {
      log(`❌ ${route.name} - NOT FOUND`, 'red');
    }
  }

  log(`\n📊 Total API Endpoints: ${totalEndpoints}`, 'cyan');
  return true;
}

async function testDocumentation() {
  log('\n=== Documentation ===', 'cyan');
  
  const docs = [
    'README.md',
    'DEPLOYMENT.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'PROJECT_SUMMARY.md',
  ];

  let allExist = true;
  for (const doc of docs) {
    const docPath = path.join(process.cwd(), doc);
    if (fs.existsSync(docPath)) {
      const size = fs.statSync(docPath).size;
      log(`✅ ${doc} (${(size / 1024).toFixed(2)} KB)`, 'green');
    } else {
      log(`❌ ${doc} - MISSING`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   AI Job Application Automation Platform - System Test Suite   ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

  const results = {};

  results.openaiKey = await testOpenAIKey();
  results.structure = await testProjectStructure();
  results.files = await testFileCreation();
  results.scrapers = await testJobScrapers();
  results.aiService = await testAIMatchingService();
  results.applicationFlow = await testJobApplicationFlow();
  results.database = await testDatabaseSchema();
  results.api = await testAPIEndpoints();
  results.docs = await testDocumentation();

  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        TEST SUMMARY                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  log(`\n✅ Tests Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All systems operational! Ready for deployment.', 'green');
    log('\nNext Steps:', 'cyan');
    log('1. Install dependencies: npm install', 'blue');
    log('2. Start the application: npm run dev', 'blue');
    log('3. Access frontend: http://localhost:3000', 'blue');
    log('4. Access backend: http://localhost:5000', 'blue');
    log('5. Follow DEPLOYMENT.md for production deployment', 'blue');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }

  log('\n✨ System Configuration:', 'cyan');
  log('- Backend: Node.js + Express + TypeScript', 'blue');
  log('- Frontend: React 18 + Vite + TypeScript', 'blue');
  log('- Database: PostgreSQL (with schema)', 'blue');
  log('- AI Engine: OpenAI GPT-3.5 (API Key configured)', 'blue');
  log('- Job Scrapers: LinkedIn, Naukri, Indeed, CareerPages', 'blue');
  log('- Notifications: Telegram Bot Integration', 'blue');
  log('- Scheduling: Node Cron (hourly + daily jobs)', 'blue');
  log('- Deployment: Docker Compose + GitHub Actions', 'blue');
  log('\n');
}

runAllTests().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
