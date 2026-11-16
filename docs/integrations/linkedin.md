# LinkedIn Auto-Apply Setup Guide

## Overview

The AI Job Application Automation Platform now includes **real Playwright browser automation** for LinkedIn auto-apply. This means the system will:

1. ✅ Use a real Chromium browser controlled by Playwright
2. ✅ Login to LinkedIn with your credentials
3. ✅ Navigate to job postings
4. ✅ Click "Easy Apply" button
5. ✅ Fill out application forms automatically
6. ✅ Submit applications

## Prerequisites

### 1. LinkedIn Account
- A valid LinkedIn account with login credentials
- Account should be in good standing (no suspensions)
- Recommended: Use a dedicated account or test account first

### 2. System Requirements
- Chromium browser (automatically installed via Playwright)
- Node.js 18+ (already required)
- At least 1GB free disk space for browser installation

## Installation Steps

### Step 1: Install Playwright and Browsers

```bash
cd backend

# Install Playwright package (already in package.json)
npm install

# Install Chromium browser (required for automation)
npm run install-browsers
```

This will download and install the Chromium browser needed for automation (~300MB).

### Step 2: Configure LinkedIn Credentials

Add your LinkedIn credentials to `backend/.env`:

```env
# LinkedIn Credentials (for auto-apply)
LINKEDIN_EMAIL=your-email@gmail.com
LINKEDIN_PASSWORD=your-password

# Optional: LinkedIn User ID (for advanced scenarios)
LINKEDIN_USER_ID=your-linkedin-id
```

**⚠️ IMPORTANT SECURITY NOTES:**

1. **Never commit credentials** - `.env` is in `.gitignore`
2. **Use environment variables** - Store credentials securely in production
3. **Consider dedicated account** - Use a separate LinkedIn account for automation
4. **Enable 2FA carefully** - If you use two-factor auth, you may need to:
   - Disable it for automation
   - Or use app-specific passwords
   - Or implement CAPTCHA handling

### Step 3: Update Other Environment Variables

Ensure your `backend/.env` has all required variables:

```env
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_automation
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# OpenAI (for job matching)
OPENAI_API_KEY=your-openai-api-key

# LinkedIn (NEW - for auto-apply)
LINKEDIN_EMAIL=your-email@gmail.com
LINKEDIN_PASSWORD=your-password

# Telegram (optional - for notifications)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Frontend
VITE_API_URL=http://localhost:5000/api
```

## How It Works

### LinkedIn Scraper with Playwright

The new `LinkedInScraper` class in `backend/src/scrapers/linkedinScraper.ts` includes:

#### 1. Browser Management
```typescript
// Automatically launches Chromium browser
// Reuses same browser instance for efficiency
// Properly closes browser on shutdown
```

#### 2. Authentication
```typescript
async loginToLinkedIn(page: Page): Promise<boolean>
// - Navigates to LinkedIn login page
// - Fills email and password fields
// - Submits login form
// - Waits for navigation completion
// - Validates successful login
```

#### 3. Job Search
```typescript
async searchJobs(keywords: string[], location: string): Promise<LinkedInJobData[]>
// - Builds search URL with parameters
// - Waits for job listings to load
// - Extracts job details (title, company, location, salary, skills)
// - Returns array of job data
```

#### 4. Auto-Apply
```typescript
async applyToJob(jobUrl: string, userProfile: any): Promise<ApplyResult>
// - Navigates to job posting
// - Checks for "Easy Apply" button
// - Fills application form automatically
// - Submits application
// - Returns success/failure status
```

#### 5. Anti-Detection Features
The system includes features to avoid LinkedIn detection:
- ✅ Custom user agent strings
- ✅ Random delays between actions
- ✅ Human-like mouse movements
- ✅ Realistic viewport size
- ✅ Browser automation detection evasion

## Usage in Your Code

### From Backend Service

```typescript
import { linkedinScraper } from './scrapers/linkedinScraper.js';

// Search for jobs
const jobs = await linkedinScraper.searchJobs(
  ['React Developer', 'Frontend Engineer'],
  'Remote'
);

// Apply to a job
const result = await linkedinScraper.applyToJob(
  'https://www.linkedin.com/jobs/view/1234567890',
  {
    email: 'user@example.com',
    phone: '+1-234-567-8900',
    coverLetter: 'I am interested in this position...'
  }
);

if (result.success) {
  console.log('✅ Application submitted successfully!');
} else {
  console.log('❌ Application failed:', result.error);
}

// Clean up browser
await linkedinScraper.closeBrowser();
```

### From Scheduled Jobs

The `jobDiscoveryJob` runs every hour:

```typescript
// backend/src/jobs/jobDiscoveryJob.ts
import { linkedinScraper } from '../scrapers/linkedinScraper.js';

// Automatically searches and stores jobs
const jobs = await linkedinScraper.searchJobs(userKeywords, userLocation);

// The aiMatchingJob then scores them
// If score >= 80%, applyToJob is called automatically
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINKEDIN_EMAIL` | Yes | - | Your LinkedIn email |
| `LINKEDIN_PASSWORD` | Yes | - | Your LinkedIn password |
| `PLAYWRIGHT_HEADLESS` | No | true | Run browser headless (no UI) |
| `PLAYWRIGHT_DEBUG` | No | false | Enable Playwright debug mode |

### Playwright Config

Customize behavior in `backend/src/config/playwrightConfig.ts`:

```typescript
// Browser launch options
launchOptions: {
  headless: true,  // Show browser UI: false
  args: [...]      // Additional Chrome arguments
}

// Context options (user agent, viewport, etc.)
contextOptions: {
  userAgent: '...',
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US'
}

// Timeouts
navigationTimeout: 30000,
selectorTimeout: 15000,

// Retry configuration
retry: {
  maxAttempts: 3,
  backoffMs: 1000
}
```

### Modify for Your Needs

Set `PLAYWRIGHT_HEADLESS=false` to watch browser in real-time:

```bash
# In backend/.env
PLAYWRIGHT_HEADLESS=false

# Or run with environment variable
PLAYWRIGHT_HEADLESS=false npm run dev
```

## Important Notes & Limitations

### ✅ Works With Easy Apply
- Jobs posted directly on LinkedIn with "Easy Apply"
- Standard application form fields
- Single-click applications

### ⚠️ Doesn't Work With
- External apply links (redirects to company website)
- Complex multi-step applications
- Applications requiring file uploads (covered in future update)
- Applications with custom questionnaires

### Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Account suspension | Use rate limiting, random delays, dedicated account |
| CAPTCHA challenges | Implement CAPTCHA solver or manual intervention |
| Session timeout | Automatic re-login on session expiration |
| IP blocking | Rotate IPs with proxy service (premium feature) |

## Testing Locally

### 1. Test Login Only

```bash
cd backend

# Create a test file: test-linkedin-login.js
cat > test-linkedin-login.js << 'EOF'
import { linkedinScraper } from './src/scrapers/linkedinScraper.js';

const result = await linkedinScraper.searchJobs(['React Developer'], 'Remote');
console.log('Found jobs:', result.length);
await linkedinScraper.closeBrowser();
EOF

# Run test
node test-linkedin-login.js
```

### 2. Watch Browser in Real-Time

```bash
# Set headless to false in .env
PLAYWRIGHT_HEADLESS=false npm run dev

# Now you can see the browser automation happening
```

### 3. Full Integration Test

```bash
# Start backend (will run scheduled jobs)
npm run dev

# Start frontend
cd ../frontend && npm run dev

# Login and configure automation settings
# Monitor job discovery and applications in real-time
```

## Troubleshooting

### Issue: "LinkedIn credentials not configured"
**Solution:** Add `LINKEDIN_EMAIL` and `LINKEDIN_PASSWORD` to `backend/.env`

### Issue: "Failed to login to LinkedIn"
**Causes:**
- Invalid credentials
- 2FA enabled on account
- IP blocked by LinkedIn
- Account suspended

**Solutions:**
1. Test credentials manually at linkedin.com
2. Disable 2FA for automation account
3. Try from different IP/VPN
4. Check account status

### Issue: "Easy Apply not available"
**Cause:** Application uses external link or custom form

**Solution:** Implement custom scraper for that company or handle manually

### Issue: Chromium browser won't install
**Solution:**
```bash
# Manually install with specific browser
npx playwright install chromium

# Or install all browsers
npx playwright install
```

### Issue: Application form not filling correctly
**Cause:** LinkedIn changed form structure or selectors

**Solution:**
1. Check console logs for actual selectors
2. Update selectors in `playwrightConfig.ts`
3. Report issue for manual fix

## Advanced Configuration

### Using a Proxy

```typescript
// In backend/src/config/playwrightConfig.ts
launchOptions: {
  proxy: {
    server: 'http://proxy-service.com:8080',
    username: 'your-username',
    password: 'your-password'
  }
}
```

### Handling CAPTCHA

```typescript
// Future enhancement: Integration with CAPTCHA solving service
// Upcoming in v1.1
```

### Custom Application Logic

```typescript
// Override fillApplicationForm in linkedinScraper.ts
private async fillApplicationForm(page: Page, userProfile: any) {
  // Add your custom logic here
  // Examples:
  // - Submit specific answers to questions
  // - Handle file uploads
  // - Custom field mapping
}
```

## Performance Considerations

### Browser Resource Usage
- Each browser instance uses ~150-200MB RAM
- Process runs single-threaded by default
- Consider resource limits on server

### Rate Limiting
- Add delays between jobs: 500ms-2000ms
- Add delays between applications: 5-10 seconds
- LinkedIn may throttle rapid requests

### Optimization Tips
1. Reuse browser context when possible (already done)
2. Process jobs in batches
3. Implement request queuing
4. Cache job listings to reduce searches

## Security Best Practices

1. **Never hardcode credentials**
   ```javascript
   // ❌ WRONG
   const password = 'MyPassword123';
   
   // ✅ CORRECT
   const password = process.env.LINKEDIN_PASSWORD;
   ```

2. **Use environment-specific configs**
   ```bash
   # Production
   NODE_ENV=production npm start
   
   # Development
   NODE_ENV=development npm run dev
   ```

3. **Rotate credentials regularly**
   - Change LinkedIn password monthly
   - Create application-specific passwords if available
   - Monitor account for suspicious activity

4. **Log appropriately**
   ```typescript
   // ❌ WRONG - logs credentials
   logger.info(`Logging in as: ${email} with password: ${password}`);
   
   // ✅ CORRECT - no sensitive data
   logger.info(`Attempting login for: ${email}`);
   ```

## Future Enhancements

Planned features for next versions:

- [ ] Multi-account rotation
- [ ] CAPTCHA solver integration
- [ ] File upload support
- [ ] Custom questionnaire handling
- [ ] LinkedIn messaging for follow-ups
- [ ] Advanced proxy rotation
- [ ] Application status tracking
- [ ] Interview scheduling automation
- [ ] Offer negotiation suggestions

## Support & Debugging

### Enable Debug Mode

```bash
# In backend/.env
PLAYWRIGHT_DEBUG=true
DEBUG=*

# Run with debug logging
npm run dev
```

### Check Playwright Logs

```bash
# View browser console output
# Watch for JavaScript errors or network issues
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Browser launch failed` | Chromium not installed | Run `npm run install-browsers` |
| `Navigation timeout` | LinkedIn took too long | Increase timeout in config |
| `Selector not found` | Form structure changed | Update selectors |
| `Authentication failed` | Wrong credentials | Verify email/password |

## Contact & Issues

For bugs or feature requests:
1. Check existing GitHub issues
2. Review troubleshooting section above
3. Enable debug mode and collect logs
4. Open new issue with error logs

## Version Info

- Playwright Version: 1.40.0+
- Chromium Version: Latest (managed by Playwright)
- Implementation Date: 2026-06-15
- Status: ✅ Production Ready

---

**Happy automating! 🚀**

Remember: Use responsibly and respect LinkedIn's terms of service.
