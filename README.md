# AutoApply AI — Open-Source Multi-Agent Job Application & Verification Platform

An open-source, multi-user, full-stack AI job discovery, resume tailoring, and **verified external application** platform built with **React + TypeScript + Express + SQLite + Playwright + Gemini AI**.

Unlike basic trackers that only log jobs locally, AutoApply AI **verifies every external submission honestly** — capturing live company page screenshots, tracking official company replies in your inbox, and sending hourly **Email + WhatsApp verification reports** to each user.

## Key Features

- **10 Live Job Portals (Direct Company ATS First):**
  - **Direct Company ATS Boards:** Greenhouse, Ashby, and Lever public company boards (Vercel, GitLab, Netlify, Cloudflare, Linear, Supabase, PostHog, Resend, Algolia, Twilio, Spotify, etc.) — direct company forms with zero aggregator wrappers.
  - **Global Remote & Regional Portals:** Himalayas, Remotive, RemoteOK, Jobicy, Arbeitnow, plus optional **JSearch (LinkedIn/Indeed/Glassdoor)**, **Jooble**, and **Adzuna** via API keys.
- **Multi-Agent AI Pipeline (Runs Automatically Every 1 Hour):**
  - Parses each user's uploaded PDF/DOCX resume (auto-extracting skills, keywords, and WhatsApp mobile number).
  - Ranks Remote-first engineering roles using Gemini AI.
  - Generates a **job-tailored resume version** + **personalized Gemini cover letter** for every match.
  - Persists the user's real `.pdf` resume and renders ATS-compatible PDFs via Playwright.
- **Honest External Verification & Proof Center (`/applications`):**
  - **Verified Applied (ATS):** Genuine Playwright submission on open public ATS forms with live confirmation screenshot + official confirmation email straight to the user's inbox.
  - **Verified Applied (Email):** Direct recruiter/hiring email submission with `Reply-To` set to the user's email and real delivery Message ID.
  - **AI Prepared (1-Click Apply):** Strictly **never bypasses** CAPTCHAs (Cloudflare Turnstile, reCAPTCHA, hCaptcha) or login walls — captures a live screenshot, shows the exact blocker, and gives 1-click access to the company URL, tailored resume, and cover letter.
- **Company Reply Inbox Tracker (Read-Only IMAP):**
  - Optional per-user read-only IMAP scan (`imap.gmail.com` or any IMAP server) to detect when companies send confirmation emails, interview invites, or rejections — automatically updating application status and pushing WhatsApp/Email alerts.
- **Multi-User Email & WhatsApp Reports:**
  - Universal email delivery supporting **Brevo HTTP API**, **SMTP (Gmail/Outlook/Custom)**, or **Resend**.
  - Automatic **WhatsApp notifications** via **CallMeBot Free API** or **Meta WhatsApp Cloud API** (auto-populated with each user's mobile phone extracted from their resume) + 1-click `wa.me` share fallback.

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/Mekarthiakhi/autoJobApply.git
cd autoJobApply

# 2. Configure environment variables
cp .env.example backend/.env
# Edit backend/.env and add GEMINI_API_KEY and JWT_SECRET

# 3. Install & run backend
cd backend
npm install
npx playwright install chromium
npm run dev

# 4. Install & run frontend (in a second terminal)
cd ../frontend
npm install
npm run dev
```

## One-Click Docker / Railway Deployment

The repository includes a unified multi-stage [Dockerfile](./Dockerfile) that builds the React SPA, compiles the TypeScript Express backend, and installs Playwright Chromium in a single container:

```bash
docker build -t autoapply-ai .
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="replace-with-a-32-char-random-secret" \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  -e ENABLE_SCHEDULED_JOBS=true \
  -e DISCOVERY_CRON_SCHEDULE="0 * * * *" \
  -v autoapply_data:/app/data \
  autoapply-ai
```

## Environment Variables

See [.env.example](./.env.example) for the complete list of optional and required environment variables.

## Security & Responsible Automation

- Every user has isolated credentials, resumes, settings, and applications.
- Anti-bot gates (Cloudflare Turnstile, Google reCAPTCHA, hCaptcha), OTP checkpoints, and login walls are **strictly respected and never bypassed**.
- Inbox reply tracking uses read-only `EXAMINE INBOX` and never deletes or modifies user mail.

## License

MIT License — see [LICENSE](./LICENSE).
