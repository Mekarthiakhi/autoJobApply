# AutoApply AI — Open-Source Multi-Agent Job Application & Verification Platform

[![Live Web App](https://img.shields.io/badge/Live_App-autojobapply.up.railway.app-8A2BE2?style=for-the-badge&logo=railway&logoColor=white)](https://autojobapply-production-69da9ff5.up.railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

An open-source, multi-user, full-stack AI job discovery, resume tailoring, and **verified external application** platform built with **React + TypeScript + Express + SQLite + Playwright + Gemini AI**.

Unlike basic trackers that only log jobs locally, AutoApply AI **verifies every external submission honestly** — capturing live company page screenshots, tracking official company replies in your inbox, and sending hourly **Email + WhatsApp verification reports** to each user.

---

### 🚀 Direct Links

* 🌐 **Live Web Application (Railway):** [https://autojobapply-production-69da9ff5.up.railway.app](https://autojobapply-production-69da9ff5.up.railway.app)
* 📖 **Complete User & Architecture Guide:** [docs/USER_AND_ARCHITECTURE_GUIDE.md](./docs/USER_AND_ARCHITECTURE_GUIDE.md) (covers resume upload, cronjob active/inactive toggling, proof verification, and hosting).

---

## Key Features

- **10 Live Job Portals (Direct Company ATS First):**
  - **Direct Company ATS Boards:** Greenhouse, Ashby, and Lever public company boards (Vercel, GitLab, Netlify, Cloudflare, Linear, Supabase, PostHog, Resend, Algolia, Twilio, Spotify, etc.) — direct company forms with zero aggregator wrappers.
  - **Global Remote & Regional Portals:** Himalayas, Remotive, RemoteOK, Jobicy, Arbeitnow, plus optional **JSearch (LinkedIn/Indeed/Glassdoor)**, **Jooble**, and **Adzuna** via API keys.
- **Multi-Agent AI Pipeline (Customizable 1–5 Hour Cron Job per User):**
  - Every user can pick their own **1 hr, 2 hrs, 3 hrs, 4 hrs, or 5 hrs** auto-apply cron interval right in **Settings** (`0 * * * *` through `0 */5 * * *`).
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

## Docker Deployment

The repository includes a modern [docker-compose.yml](./docker-compose.yml) and unified multi-stage [Dockerfile](./Dockerfile) that builds the React SPA, compiles the TypeScript Express backend, and installs Playwright Chromium:

```bash
# Start with docker-compose
docker compose up -d

# Or run the standalone container
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
