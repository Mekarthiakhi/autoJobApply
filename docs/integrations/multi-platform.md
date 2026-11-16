# Multi-Platform Job Automation Setup Guide

## Overview

Your AI Job Application Automation Platform now supports **4 major job platforms** with real Playwright browser automation:

1. ✅ **LinkedIn** - Premium job portal (Easy Apply integration)
2. ✅ **Naukri** - India's largest job portal
3. ✅ **Indeed** - Global job platform
4. ✅ **CareerPages** - Indian startup job board

Each platform has **real browser automation** for:
- Job discovery and scraping
- Auto-apply to jobs
- Application form filling
- Multi-step application handling

---

## Complete Environment Variables Setup

Create or update your `backend/.env` file with ALL platform credentials:

```env
# ============================================
# NODE & SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=5000
PLAYWRIGHT_HEADLESS=true

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_automation
DB_USER=postgres
DB_PASSWORD=postgres

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# ============================================
# AI & MATCHING ENGINE
# ============================================
OPENAI_API_KEY=your-openai-api-key

# ============================================
# LINKEDIN - REAL BROWSER AUTOMATION
# ============================================
LINKEDIN_EMAIL=your-linkedin-email@gmail.com
LINKEDIN_PASSWORD=your-linkedin-password

# ============================================
# NAUKRI - REAL BROWSER AUTOMATION
# ============================================
NAUKRI_EMAIL=your-naukri-email@gmail.com
NAUKRI_PASSWORD=your-naukri-password

# ============================================
# INDEED - REAL BROWSER AUTOMATION
# ============================================
INDEED_EMAIL=your-indeed-email@gmail.com
INDEED_PASSWORD=your-indeed-password

# ============================================
# CAREERPAGES - NO LOGIN REQUIRED
# ============================================
# CareerPages doesn't require authentication for job search
# Automatic scraping enabled by default

# ============================================
# TELEGRAM NOTIFICATIONS (Optional)
# ============================================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# ============================================
# FRONTEND CONFIGURATION
# ============================================
VITE_API_URL=http://localhost:5000/api

# ============================================
# PLAYWRIGHT DEBUGGING (Optional)
# ============================================
# Set to 'false' to see browser UI while testing
PLAYWRIGHT_HEADLESS=true
```

---

## Platform-Specific Setup Instructions

### 1️⃣ LinkedIn Setup

#### Prerequisites
- Active LinkedIn account
- Standard login credentials

#### Configuration
```env
LINKEDIN_EMAIL=your-email@gmail.com
LINKEDIN_PASSWORD=your-password
```

#### Important Notes
- ⚠️ LinkedIn may detect automation and restrict account access
- 🔐 If you have 2FA enabled, you may need to:
  - Temporarily disable it for automation
  - Use app-specific passwords if available
  - Or handle CAPTCHA manually
- 💡 **Recommendation**: Create a separate LinkedIn account for automation
- 🚀 Features:
  - ✅ Job search via keywords
  - ✅ Easy Apply detection
  - ✅ Automatic form filling
  - ✅ Application submission
  - ✅ Anti-bot detection evasion

#### Test LinkedIn Setup
```bash
cd backend
node test-linkedin-code-validation.js
```

---

### 2️⃣ Naukri Setup

#### Prerequisites
- Naukri account (www.naukri.com)
- Email and password

#### Configuration
```env
NAUKRI_EMAIL=your-naukri-email@gmail.com
NAUKRI_PASSWORD=your-naukri-password
```

#### Features
- ✅ Search across 1000s of Indian jobs
- ✅ Experience level filtering
- ✅ Salary range search
- ✅ Automatic application submission
- ✅ Profile matching

#### How It Works
1. **Job Discovery**: Searches Naukri.com for jobs matching your keywords
2. **Auto-Apply**: Clicks "Apply" button and submits form
3. **Form Filling**: Automatically fills email, phone, cover letter
4. **Success Tracking**: Logs application status

---

### 3️⃣ Indeed Setup

#### Prerequisites
- Indeed account (www.indeed.com)
- Email and password

#### Configuration
```env
INDEED_EMAIL=your-indeed-email@gmail.com
INDEED_PASSWORD=your-indeed-password
```

#### Features
- ✅ Global job search
- ✅ Advanced search filters
- ✅ Salary comparison
- ✅ Company ratings
- ✅ Easy Apply integration

#### How It Works
1. **Search**: Uses Indeed's global job database
2. **Scraping**: Extracts job details (title, salary, company)
3. **Apply**: Submits applications directly on Indeed
4. **Tracking**: Records all applications

---

### 4️⃣ CareerPages Setup

#### Prerequisites
- **NO LOGIN REQUIRED** ✅
- Public job board access

#### Configuration
```env
# CareerPages is automatically enabled
# No credentials needed
```

#### Features
- ✅ Indian startup jobs
- ✅ No authentication required
- ✅ Direct company postings
- ✅ Quick apply mechanism
- ✅ Startup ecosystem focused

#### How It Works
1. **Discovery**: Public job listing scraping
2. **Auto-Apply**: Finds application links
3. **Submission**: Fills and submits forms
4. **Notifications**: Updates on application status

---

## Installation & Setup Steps

### Step 1: Install Dependencies

```bash
cd backend

# Install all npm packages (including Playwright)
npm install

# Install Chromium browser (one-time, ~300MB)
npm run install-browsers
```

### Step 2: Configure Environment Variables

Create `backend/.env`:
```bash
# Copy the template above and fill in your credentials
cp backend/.env.example backend/.env

# Edit with your credentials
nano backend/.env
```

### Step 3: Setup Database

```bash
# Start PostgreSQL (locally or using Docker)
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=job_automation \
  -p 5432:5432 \
  postgres:15-alpine

# Database will auto-initialize on first backend start
```

### Step 4: Verify Credentials

Test each platform:
```bash
cd backend

# Test LinkedIn
node test-linkedin-code-validation.js

# Test all scrapers (after dependencies installed)
node test-system.js
```

### Step 5: Start the System

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Output: Server running on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Output: http://localhost:3000

# Terminal 3 - Monitor (Optional)
# Watch job discovery in real-time
```

---

## How Multi-Platform Automation Works

### Unified Job Discovery Flow

```
┌─────────────────────────────────────────────────┐
│ Scheduled Job Discovery (Every Hour)            │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   LinkedIn      Naukri        Indeed      CareerPages
     Search       Search        Search         Search
        │             │             │             │
        └─────────────┼─────────────┘
                      ↓
            ┌─────────────────────────┐
            │ Store Jobs in Database  │
            └─────────────┬───────────┘
                          │
            ┌─────────────↓───────────┐
            │ AI Matching (OpenAI)    │
            │ Score: 0-100%           │
            └─────────────┬───────────┘
                          │
                ┌─────────↓─────────┐
                │ If Score ≥ 80%    │
                │ AUTO-APPLY        │
                └─────────┬─────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   LinkedIn          Naukri            Indeed
   Auto-Apply      Auto-Apply       Auto-Apply
   + Form Fill    + Form Fill      + Form Fill
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ↓
                ┌─────────────────────┐
                │ Update Database:    │
                │ - Application Date  │
                │ - Platform          │
                │ - Status            │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Send Telegram       │
                │ Notification        │
                └─────────────────────┘
```

---

## Using the Unified Scraper Interface

### Search All Platforms

```typescript
import { unifiedJobScraper } from './scrapers/unifiedJobScraper.js';

// Search all platforms for React Developer jobs
const results = await unifiedJobScraper.searchAllPlatforms(
  ['React Developer', 'Frontend Engineer'],
  'Remote',
  ['linkedin', 'naukri', 'indeed', 'careerpages']
);

// Get statistics
const stats = unifiedJobScraper.getStatistics(results);
console.log(`Total jobs found: ${stats.total_jobs}`);
console.log(`By platform: ${JSON.stringify(stats.by_platform)}`);
```

### Apply to Multiple Jobs

```typescript
const applyResults = await unifiedJobScraper.applyToMultiplePlatforms(
  [
    { platform: 'linkedin', jobUrl: 'https://linkedin.com/jobs/...' },
    { platform: 'naukri', jobUrl: 'https://naukri.com/job-listings-...' },
    { platform: 'indeed', jobUrl: 'https://indeed.com/rc/clk?...' }
  ],
  userProfile
);

// Check results
applyResults.forEach(result => {
  console.log(`${result.platform}: ${result.result.success ? '✅' : '❌'}`);
});
```

### Get Platform Status

```typescript
const status = await unifiedJobScraper.getPlatformStatus();
status.forEach(platform => {
  console.log(`${platform.platform}: ${platform.configured ? 'Ready' : 'Not configured'}`);
  console.log(`  Capabilities: ${platform.capabilities.join(', ')}`);
});
```

---

## Rate Limiting & Best Practices

### Recommended Settings

```env
# Delays between actions (milliseconds)
ACTION_DELAY_MIN=500
ACTION_DELAY_MAX=2000

# Delays between applications (seconds)
APPLICATION_DELAY_MIN=5
APPLICATION_DELAY_MAX=10

# Max jobs per platform per hour
MAX_JOBS_PER_HOUR=50

# Max applications per hour
MAX_APPLICATIONS_PER_HOUR=10
```

### Why Rate Limiting Matters

1. **Avoid Platform Detection**
   - Job portals monitor for bot behavior
   - Rapid actions trigger security alerts
   - Delays make activity look human-like

2. **Respect Terms of Service**
   - Most platforms prohibit automation
   - Use responsibly and ethically
   - Consider using official APIs when available

3. **Account Safety**
   - Gradual application prevents blocks
   - Random delays are detected less
   - Consistent patterns trigger suspicion

---

## Troubleshooting Multi-Platform Issues

### Issue: "Credentials not configured" for all platforms

**Solution:**
```bash
# Check .env file exists
cat backend/.env

# Verify credentials are set
grep LINKEDIN_EMAIL backend/.env
grep NAUKRI_EMAIL backend/.env
grep INDEED_EMAIL backend/.env
```

### Issue: Playwright browser won't launch

**Solution:**
```bash
# Install Chromium explicitly
npm run install-browsers

# Or manually
npx playwright install chromium

# Verify installation
which chromium-browser
```

### Issue: LinkedIn login fails but Naukri works

**Solution:**
- LinkedIn likely has 2FA or security challenges
- Try disabling 2FA temporarily
- Or use the visual mode to see what's happening:
  ```env
  PLAYWRIGHT_HEADLESS=false
  ```

### Issue: Jobs not being applied to

**Solution:**
Check these in order:
1. OpenAI API key is valid
2. Match score threshold (check automation settings)
3. Database connection is working
4. Check logs for specific platform errors

### Issue: High memory usage

**Solution:**
- Reduce concurrent platform searches
- Increase delays between operations
- Close browsers after each operation (automatic)
- Monitor RAM: `free -h`

---

## Monitoring & Logging

### Enable Debug Logging

```env
DEBUG=*
PLAYWRIGHT_DEBUG=true
LOG_LEVEL=debug
```

### Monitor Jobs Being Discovered

```bash
# Watch logs in real-time
tail -f backend/logs/app.log

# Or use dedicated monitor
npm run dev -- --watch logs
```

### Database Queries

```bash
# Connect to PostgreSQL
psql -U postgres -d job_automation

# View discovered jobs
SELECT platform, COUNT(*) as count FROM jobs GROUP BY platform;

# View applications
SELECT platform, status, COUNT(*) as count FROM applications GROUP BY platform, status;

# View match scores
SELECT AVG(match_score) as avg_score FROM match_scores;
```

---

## Advanced Configuration

### Custom Platform Selectors

If a platform changes its HTML structure:

```typescript
// Update selectors in src/config/playwrightConfig.ts
export const linkedinConfig = {
  selectors: {
    easyApplyButton: 'button:has-text("Easy Apply")',  // Update if changed
    // ... other selectors
  }
};
```

### Proxy Support

For advanced use cases (IP rotation):

```env
PROXY_SERVER=http://proxy.service.com:8080
PROXY_USERNAME=user
PROXY_PASSWORD=pass
```

```typescript
// In scraper config
launchOptions: {
  proxy: {
    server: process.env.PROXY_SERVER,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  }
}
```

### Custom Retry Logic

```typescript
import { retryOperation } from './config/playwrightConfig.js';

// Retry up to 5 times with exponential backoff
const jobs = await retryOperation(
  () => linkedinScraper.searchJobs(keywords, location),
  'LinkedIn Search',
  5  // max attempts
);
```

---

## Performance Optimization

### Parallel Processing

The system automatically searches all platforms in parallel:

```
Time without parallel: LinkedIn(3s) + Naukri(3s) + Indeed(3s) = 9s
Time with parallel: max(3s, 3s, 3s) = 3s
```

### Caching

Jobs are cached in database to avoid duplicate processing:

```typescript
// First request hits platforms
const jobs = await searchAllPlatforms(keywords);  // 3s

// Subsequent requests use cache
const cachedJobs = db.getJobs(keywords);  // <100ms
```

### Browser Reuse

Browsers are kept alive and reused:

```typescript
// First call: launch browser (~1.5s)
await linkedinScraper.searchJobs(keywords);

// Subsequent calls: reuse browser
await linkedinScraper.searchJobs(otherKeywords);  // Much faster
```

---

## Security Considerations

### ✅ Do

- ✅ Store credentials in environment variables only
- ✅ Use `.env` file never committed to git
- ✅ Rotate passwords regularly
- ✅ Use separate account for automation
- ✅ Monitor account activity for suspicious logins
- ✅ Enable 2FA on main accounts
- ✅ Review application logs regularly

### ❌ Don't

- ❌ Commit `.env` file to repository
- ❌ Share credentials in messages/emails
- ❌ Use production credentials for testing
- ❌ Store credentials in code
- ❌ Share GitHub repo with credentials
- ❌ Ignore security warnings
- ❌ Apply to same job repeatedly

---

## API Endpoints for Multi-Platform

### Get Jobs from All Platforms

```bash
GET /api/jobs?platform=all&keywords=React&location=Remote
```

### Apply to Job

```bash
POST /api/applications/apply
{
  "jobId": "linkedin-12345",
  "platform": "linkedin"
}
```

### Get Platform Status

```bash
GET /api/dashboard/platform-status
```

### Search Multi-Platform

```bash
POST /api/jobs/search-all
{
  "keywords": ["React", "Frontend"],
  "location": "Remote",
  "platforms": ["linkedin", "naukri", "indeed", "careerpages"]
}
```

---

## Deployment Considerations

### Production Deployment

```bash
# Use strong credentials
NODE_ENV=production
PLAYWRIGHT_HEADLESS=true

# Increase resource limits
MAX_BROWSER_INSTANCES=3
MEMORY_LIMIT=4GB

# Use database backups
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=daily
```

### Scaling

```bash
# Use Docker for easy scaling
docker-compose up -d --scale backend=3

# Load balance across instances
nginx (reverse proxy on :80)
  ├── backend-1 (:5001)
  ├── backend-2 (:5002)
  └── backend-3 (:5003)
```

---

## Support & Resources

### Documentation Files
- `LINKEDIN_SETUP.md` - LinkedIn specific guide
- `REPOSITORY_INFO.txt` - System overview
- `DEPLOYMENT.md` - Production deployment

### Test Scripts
- `backend/test-linkedin-code-validation.js` - LinkedIn validation
- `backend/test-system.js` - Full system test

### Source Code
- `backend/src/scrapers/linkedinScraper.ts`
- `backend/src/scrapers/naukriScraper.ts`
- `backend/src/scrapers/indeedScraper.ts`
- `backend/src/scrapers/careerPagesScraper.ts`
- `backend/src/scrapers/unifiedJobScraper.ts`

---

## Quick Reference

| Platform | Status | Auto-Apply | Credentials | Website |
|----------|--------|-----------|-------------|---------|
| LinkedIn | ✅ Implemented | ✅ Yes | ✅ Required | linkedin.com |
| Naukri | ✅ Implemented | ✅ Yes | ✅ Required | naukri.com |
| Indeed | ✅ Implemented | ✅ Yes | ✅ Required | indeed.com |
| CareerPages | ✅ Implemented | ✅ Yes | ❌ Optional | careerpages.com |

---

## Next Steps

1. ✅ Configure all 4 platforms in `.env`
2. ✅ Run `npm run install-browsers`
3. ✅ Start backend: `npm run dev`
4. ✅ Monitor job discovery: `tail -f logs/app.log`
5. ✅ Watch applications in real-time on dashboard

**You're now ready to automatically discover and apply to jobs across all major platforms!** 🚀

---

**Questions?** Check the documentation files or enable debug mode for detailed logs.

**Happy automating!** ✨
