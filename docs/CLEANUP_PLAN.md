# AutoJobApply System Cleanup Plan & Safety Audit

**Date:** November 13, 2026  
**Auditor / Role:** Senior Software Engineer & Autonomous Development Agent  
**Status:** Verification Complete — Awaiting User Approval  
**Operating Mode:** Read-Only Verification (No files modified or deleted)

---

## 1. Executive Summary & Strategy

Following the complete architectural audit documented in [`docs/EXISTING_SYSTEM_AUDIT.md`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/docs/EXISTING_SYSTEM_AUDIT.md), this cleanup plan provides the second-pass verification and precise execution strategy for purging redundant, outdated, and misleading code from the **AutoJobApply** repository.

### Key Objectives
1. **Eliminate Architecture Ambiguity:** Remove the abandoned root Next.js 16 prototype (`src/`) and the empty Expo mobile template (`JobApply/`), establishing `frontend/` (Vite + React 18) and `backend/` (Node.js + Express + SQLite) as the sole, canonical platforms.
2. **De-clutter Root Directory:** Remove 17 historical git-push instruction scripts and outdated scratch diffs while preserving and organizing unique feature documentation into a clean `docs/` hierarchy.
3. **Purge Fragile Scratch Scripts:** Eliminate one-off regex monkey-patch scripts (`updateOrchestrator.mjs`, `updateScrapers.mjs`, `fix_ts.js`) and unreferenced test fixtures.
4. **Fix Git Tracking Anomaly:** Safely untrack 9,234 committed files inside `backend/node_modules/` from git index without deleting local dependencies.
5. **Enforce Human-in-the-Loop Safety:** Remediate dangerous auto-apply hardcoding in `WorkflowOrchestrator.ts` and restrict `popupAgent.ts` so AI agents can prepare applications and dismiss cookie banners, but **cannot submit applications or fabricate questionnaire responses without explicit individual user confirmation**.

---

## 2. Section 1: Root Next.js Application (`src/`) Verification

### 2.1 Investigation Findings
* **Location:** `autoJobApply/src/` (31 files, including `src/app/page.tsx`, `src/components/premium-ui/PremiumDashboard.tsx`, `src/lib/api.ts`).
* **Git History:** Added in commits `ed4ae99` (*"feat: implement premium job dashboard with UI/UX Pro Max components"*) and `30c67e6` (*"feat: wire PremiumDashboard to live backend API"*).
* **Scope Comparison:**
  * Root `src/` is a minimal 1-page Next.js 16 prototype with basic login/register and a simplistic job cards view (`PremiumDashboard.tsx`, 217 lines).
  * `frontend/src/` is a production-grade Vite SPA with 12 complete modules: Dashboard, Review Queue, Resume Builder, Resume Version Manager, Cover Letter Generator, Company Intelligence, Activity Logs, Analytics Dashboard, Jobs Search/List, Automation Settings, and Auth.
* **Imports & Dependency Check:**
  * Scanned `backend/src` and `frontend/src`: **0 imports** reference `src/`, `@/*`, or `PremiumDashboard`.
  * `docker-compose.yml` builds strictly `./frontend` (Vite) on port 3000. It does **not** mention `src/` or Next.js.
  * Root `package.json` contains conflicting scripts: `npm run dev` launches `next dev` (the broken root prototype), while `npm run dev:all` launches `frontend` and `backend`.
  * Root `package.json` contains 33 unused Radix UI packages, Next.js 16, React 19, and `raccoon-inspect`.

### 2.2 Proposed Action: REMOVE
* **Path:** `src/`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`, `eslint.config.mjs`, `.babelrc`.
* **Prerequisite:** Update root `package.json` scripts (`dev`, `build`, `start`) to delegate cleanly to `frontend` and `backend`, and clean root `dependencies`.
* **Impact:** Eliminates port 3000 collision, prevents developer confusion, and cuts ~400MB of unnecessary root lockfile/module overhead.

---

## 3. Section 2: Mobile App Skeleton (`JobApply/`) Verification

### 3.1 Investigation Findings
* **Location:** `autoJobApply/JobApply/` (15 tracked files, ~250MB untracked `node_modules`).
* **Contents:**
  * `App.js`: Default 20-line boilerplate created by `npx create-expo-app` with text: *"Open up App.js to start working on your app!"*.
  * `package.json`: 4 standard Expo dependencies (`expo`, `expo-status-bar`, `react`, `react-native`).
  * `AGENTS.md` / `CLAUDE.md`: Boilerplate 1-line note linking to Expo 57 documentation.
* **Integration Check:**
  * Contains no API client, no authentication, no screens, no state management, and zero connections to `backend`.
  * Never referenced by any build script, Docker setup, or workflow.

### 3.2 Proposed Action: ARCHIVE & REMOVE
* **Path:** `JobApply/`
* **Recommendation:** Create a compressed archive (`backups/JobApply_expo_skeleton.zip`) before removing from git tracking and disk.
* **Impact:** Zero functional impact. Saves 250MB disk space and simplifies workspace tree.

---

## 4. Section 3: Documentation & Script Sprawl Audit

The root folder currently holds 35 markdown, text, and shell script files. We categorize them into three clear buckets:

### 4.1 Bucket A: Obsolete Push & Helper Artifacts (Proposed for REMOVAL)
These files were created in June 2026 by an AI assistant attempting to guide a manual git push with Personal Access Tokens. They are completely redundant and add clutter.

| File Path | Tracked | Unique Info | Reason for Removal |
| :--- | :---: | :---: | :--- |
| `DO_THIS_NOW.md` | Yes | No | Redundant git push instructions. |
| `FINAL_PUSH_INSTRUCTIONS.md` | Yes | No | Redundant git push instructions. |
| `FINAL_PUSH_SUMMARY.txt` | Yes | No | Static git commit log dump from June 2026. |
| `FINAL_SUMMARY.md` | Yes | No | Historical completion summary from initial scaffold. |
| `GITHUB_PUSH_CHECKLIST.md` | Yes | No | Checkbox list for pushing to GitHub. |
| `GITHUB_PUSH_FINAL.md` | Yes | No | Redundant PAT setup guide. |
| `GITHUB_PUSH_GUIDE.md` | Yes | No | Redundant git push walkthrough. |
| `PUSH_ALL_NOW.sh` | Yes | No | Bash script with hardcoded git push commands. |
| `PUSH_INSTRUCTIONS.md` | Yes | No | Redundant push steps. |
| `PUSH_NOW.txt` | Yes | No | Duplicate push notes. |
| `PUSH_TO_GITHUB.sh` | Yes | No | Duplicate push shell script. |
| `PUSH_TO_YOUR_REPO.md` | Yes | No | Generic token authentication guide. |
| `QUICK_PUSH.md` | Yes | No | 3-line quick push cheat sheet. |
| `QUICK_START_PUSH.txt` | Yes | No | Redundant push text summary. |
| `READY_TO_PUSH.txt` | Yes | No | Duplicate staging status summary. |
| `REDESIGN_SUMMARY.txt` | Yes | No | Historical changelog superseded by `EXISTING_SYSTEM_AUDIT.md`. |
| `REPOSITORY_INFO.txt` | Yes | No | Stale commit count and file listing. |

### 4.2 Bucket B: Feature & Platform Documentation (Proposed to PRESERVE in `docs/`)
These files contain valuable documentation regarding UI design decisions and platform credential setups. They should be moved to organized subdirectories under `docs/`.

| File Path | New Destination | Content Value |
| :--- | :--- | :--- |
| `ANALYTICS_PAGE_SUMMARY.md` | `docs/features/analytics.md` | Documents the 5-stage conversion funnel and metrics UI. |
| `COMPANIES_PAGE_SUMMARY.md` | `docs/features/companies.md` | Documents company intelligence, fit scoring, and status filters. |
| `RESUME_MANAGER_SUMMARY.md` | `docs/features/resumes.md` | Documents resume versioning, ATS analysis, and file parsing. |
| `DESIGN_SHOWCASE.md` | `docs/design/showcase.md` | UI component showcase and visual hierarchy guide. |
| `NEUMORPHISM_DESIGN_GUIDE.md` | `docs/design/neumorphism.md` | Design system specifications, shadows, and Tailwind utilities. |
| `LINKEDIN_SETUP.md` | `docs/integrations/linkedin.md` | Step-by-step 2FA and headless cookie/session configuration. |
| `MULTI_PLATFORM_SETUP.md` | `docs/integrations/multi-platform.md` | Playwright setup for Indeed, Glassdoor, and Naukri. |
| `IMPLEMENTATION_CHECKLIST.md` | `docs/ROADMAP.md` | Historical checklist converted to future feature roadmap. |
| `PROJECT_SUMMARY.md` | `docs/architecture/overview.md` | Baseline architectural description of early services. |

### 4.3 Bucket C: Canonical Root Documentation (KEEP at Root)
* `README.md`: Updated to accurately reflect the Vite + Express + SQLite architecture.
* `DEPLOYMENT.md`: Docker Compose and production deployment instructions.
* `CONTRIBUTING.md`: Contribution and development guidelines.
* `CHANGELOG.md`: Project version history.
* `LICENSE`: MIT License.
* `QUICK_START.md`: Concise local environment startup guide.

---

## 5. Section 4: Scratch & Patch Script Audit

Investigation of standalone scripts revealed several dangerous monkey-patch scripts and dead code:

### 5.1 Patch & Script Detail Table

| Path | Tracked | Usage Verification | Risk / Impact of Removal | Recommendation |
| :--- | :---: | :--- | :--- | :--- |
| `backend/src/scripts/updateOrchestrator.mjs` | Yes | **One-time regex monkey-patch script** run in July 2026. Not imported anywhere. Contains the hazardous line hardcoding `autoApply = ... \|\| true`. | Re-running would corrupt `WorkflowOrchestrator.ts`. Safe to delete. | **DELETE** |
| `backend/src/scripts/updateScrapers.mjs` | Yes | **One-time regex patch script** run in July 2026 to bypass logins in `linkedinScraper.ts` and `indeedScraper.ts`. Not imported. | Dead code. Re-running will corrupt scrapers. Safe to delete. | **DELETE** |
| `backend/fix_ts.js` | Yes | Standalone regex script from early development to patch `setUserAgent` and `sql` tags. | Obsolete. Not in any build pipeline. Safe to delete. | **DELETE** |
| `backend/src/test-imports.ts` | Yes | 7 lines logging `typeof cron`, `typeof OpenAI`, `typeof express`. | Scratch test file. Safe to delete. | **DELETE** |
| `diff.txt` | Yes | 51 KB unapplied raw git diff dumped in root on July 31, 2026. | Obsolete historical diff. Safe to delete. | **DELETE** |
| `project-structure.txt` | Yes | Stale ASCII file tree missing current architecture. | Superseded by `EXISTING_SYSTEM_AUDIT.md`. Safe to delete. | **DELETE** |
| `test-system.js` | Yes | Early Node.js sanity test checking for old service names. | Outdated. Not in CI/CD or npm test. Move to `docs/archive/` or delete. | **DELETE** |
| `backend/view_db.ts` | Yes | 15-line script querying users and settings with `.js` import. | Debug utility. Can be moved to `backend/src/scripts/viewDb.ts`. | **KEEP/RENAME** |
| `backend/test-*.js` (4 files) | Yes | Standalone string-matching validation scripts (`test-glassdoor-validation.js`, `test-linkedin-playwright.js`, etc.). | Static code scanners. Not part of `npm test`. Move to `backend/tests/validation/`. | **MOVE** |

---

## 6. Section 5: `.agents/` and AI Skills Inspection

### 5.1 Investigation Findings
* **Path:** `autoJobApply/.agents/skills/ui-ux-pro-max-skill`
* **Git Status:** Tree entry `160000 commit bdf1179bcf641cca49ee7a5f76df14c3015fd38c`.
* **Disk Status:** Completely empty directory on disk.
* **Configuration:** No `.gitmodules` file exists in the repository root.
* **Diagnosis:** This is an orphaned gitlink (submodule pointer) created when an external agent skill was cloned without `--depth` or submodule tracking. Because there is no `.gitmodules`, git cannot fetch or update it.

### 5.2 Proposed Action: REMOVE GITLINK & CLEAN
* Remove the orphaned gitlink with `git rm --cached .agents/skills/ui-ux-pro-max-skill` and delete the empty directory.
* If custom agent prompts or instructions are desired in the future, create a standardized `.agents/` structure with clean markdown instruction files (e.g., `.agents/ROLE_DEFINITIONS.md`).

---

## 7. Section 6: Generated Folders & Git Tracking Anomaly

### 7.1 Generated Folder Audit
* **`.next/`**: Root build folder. Not tracked by git (0 tracked files). Properly listed in `.gitignore`.
* **Root `node_modules/`**: Not tracked by git (0 tracked files). Properly listed in `.gitignore`.
* **`frontend/node_modules/`**: Not tracked by git (0 tracked files). Properly listed in `.gitignore`.
* **`JobApply/node_modules/`**: Not tracked by git (0 tracked files). Properly listed in `JobApply/.gitignore`.

### 7.2 Critical Git Tracking Anomaly: `backend/node_modules/`
* **Finding:** While `.gitignore` contains `node_modules/`, `backend/node_modules/` has **9,234 files actively tracked in Git!**
* **Root Cause:** In an early commit, `backend/node_modules` was staged and committed before `.gitignore` was configured or was added with `git add -f`. Git does not automatically un-track files that were previously committed when `.gitignore` rules are added later.
* **Consequence:** Massive repository bloat, slow git status/diff operations, merge conflict hazards, and platform-specific binaries checked into version control.

### 7.3 Remediation Procedure (To Be Executed with User Approval):
```bash
# Untrack backend/node_modules from git index without deleting files on disk
git rm -r --cached backend/node_modules

# Ensure root .gitignore explicitly covers subfolder node_modules:
# **/node_modules/
```
* **Impact:** Reduces git index size drastically. Local packages remain intact so backend execution is not interrupted.

---

## 8. Section 7: Uncommitted & Untracked Files to Protect

Before executing any cleanup, the following persistent files and working changes must be preserved:

| File Path | Status | Purpose / Why It Must Be Protected |
| :--- | :--- | :--- |
| `backend/jobs.db` | Ignored (`*.db`) | The live SQLite database containing local users, job records, review queue items, and settings. |
| `.env` & `backend/.env` | Ignored (`.env`) | Contains JWT secrets, database connection settings, and API keys. |
| `backend/src/services/popupAgent.ts` | Uncommitted edits | Contains the newly implemented `PopupAgent` class. |
| `docs/EXISTING_SYSTEM_AUDIT.md` | Untracked | The comprehensive 10-section system audit completed in step 1. |
| `docs/CLEANUP_PLAN.md` | Untracked | This cleanup verification and safety audit document. |
| `backend/screenshots/` | Runtime directory | Preserves Playwright audit screenshots for job application review. |

---

## 9. Section 8: Safety Audit — `popupAgent.ts` Auto-Answer Analysis

### 9.1 Technical Inspection
Inspection of `backend/src/services/popupAgent.ts` identified the following methods and behaviors:
1. `setupDialogListener(page: Page)`: Automatically accepts all browser `dialog` events (`alert`, `confirm`, `prompt`).
2. `acceptAllCookies(page: Page)`: Clicks standard "Accept all cookies", "Allow all", OneTrust, Didomi, Cookiebot, and LinkedIn consent buttons. **(Safe & Desirable)**.
3. `dismissBlockingPopups(page: Page)`: Clicks "No thanks", "Not now", "Skip", modal close buttons. **(Safe & Desirable)**.
4. `selectFirstOptionInPopups(page: Page)`: **(CRITICAL SAFETY RISK)**
   * Lines 84–117: Loops through all visible `<select>` elements and selects the first option that isn't a placeholder.
   * Lines 120–135: Loops through all visible radio button groups and automatically clicks the first radio button.
   * Lines 138–159: Opens visible comboboxes/listboxes and clicks the first list item.
   * Lines 162–188: Auto-checks any checkbox with labels containing "agree", "terms", "consent", "acknowledge".

### 9.2 Hazard Analysis on Job Application Forms
When applied to job application questionnaires (e.g., LinkedIn Easy Apply, Indeed Apply, Workday modals):
* **Legal & Visa Misrepresentation:** A question like *"Will you now or in the future require visa sponsorship?"* usually has options `['Yes', 'No']`. Selecting the first option (`'Yes'`) could cause immediate disqualification for a candidate who does not require sponsorship, or vice versa.
* **Falsification of Qualifications:** Questions such as *"Do you have 5+ years of experience in TypeScript?"* or *"Have you completed a Bachelor's Degree?"* will have arbitrary answers selected based on DOM ordering.
* **Binding Agreements:** Blindly checking checkboxes containing "terms" or "agree" may agree to background checks, legal indemnities, or arbitration clauses without user review.
* **Recommendation:** **Immediately isolate `popupAgent` so that it ONLY handles cookie banners, cookie consent modals, and browser dialogs.** It must NEVER interact with application input fields, job qualification questionnaires, or agreement checkboxes.

---

## 10. Section 9: Safety Audit — Unapproved Application Submission Workflows

### 10.1 Discovery of the Auto-Apply Bypass
In `backend/src/services/WorkflowOrchestrator.ts` lines 118–145:
```typescript
// 5. Place in Review Queue or Auto-Apply
const automationSettings = await db.get(`SELECT * FROM automation_settings WHERE user_id = ?`, [userId]) as any;
const autoApply = automationSettings?.approval_mode_enabled === 0 || true; // Hardcoding to true per user request

if (autoApply && rankResult.score >= (plan.autoRankThreshold || 50)) {
  logger.info(`🤖 Zero-touch auto-applying for job ${job.title}...`, { agent: 'Orchestrator', userId });
  // Directly invokes linkedinScraper.applyToJob or indeedScraper.applyToJob!
} else {
  await reviewAgent.queueForReview(userId, jobId, { ... });
}
```

### 10.2 Analysis of the Vulnerability
1. **The `|| true` Hardcode:** Because `|| true` was injected by `updateOrchestrator.mjs`, `autoApply` is **always true**, completely ignoring the user's database setting `approval_mode_enabled`.
2. **Direct Submission Execution:**
   * In `linkedinScraper.ts` lines 352–356:
     ```typescript
     const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply Now")').first();
     if (await submitButton.isVisible()) {
       await submitButton.click();
       logger.info('✅ Application form submitted');
     }
     ```
   * In `indeedScraper.ts` lines 321–325:
     ```typescript
     const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Apply"), button[type="submit"]').first();
     if (await submitButton.isVisible().catch(() => false)) {
       await submitButton.click();
       logger.info('✅ Application form submitted on Indeed');
     }
     ```
3. **Outcome:** When any workflow runs, as long as a discovered job receives a match score >= 50%, the system autonomously navigates to LinkedIn/Indeed, fills out forms, auto-selects radio/dropdown options, and **clicks Submit** without the user ever seeing the job posting, resume, or responses.

---

## 11. Section 10: Recommended Human-in-the-Loop Safeguards

To strictly enforce the core principle: **"AI can prepare applications, but cannot submit them without explicit user confirmation"**, the following four safeguards must be implemented:

```
  DISCOVERY & MATCHING           AI PREPARATION                HUMAN APPROVAL GATE               SAFE EXECUTION
┌───────────────────────┐    ┌────────────────────┐         ┌─────────────────────────┐     ┌──────────────────────┐
│  Scrapers & Filters   │───▶│  Resume Tailoring  │────────▶│  Review Queue UI        │────▶│ Explicit User Action │
│  Discover Jobs        │    │  Cover Letter Gen  │         │  - View Match Score     │     │ Click "Approve &     │
│  Rank & Score (0-100) │    │  Stage Form Draft  │         │  - Inspect Cover Letter │     │ Submit" Button       │
└───────────────────────┘    │  Capture Screenshot│         │  - Review Questions     │     └──────────────────────┘
                             └────────────────────┘         └─────────────────────────┘
```

### Safeguard 1: Remove the `|| true` Bypass in `WorkflowOrchestrator.ts`
* In `WorkflowOrchestrator.ts`, remove the hardcoded `|| true`.
* Change default behavior so that **EVERY application must pass through `reviewAgent.queueForReview(...)`**.
* Even if an "auto-apply" setting exists, enforce a system-level policy flag `REQUIRE_HUMAN_CONFIRMATION = true` that prevents autonomous submission.

### Safeguard 2: Physical Disarm of Autonomous `Submit` in Scrapers
* Modify `applyToJob` across all scrapers (`linkedinScraper.ts`, `indeedScraper.ts`, `glassdoorScraper.ts`, `naukriScraper.ts`, `careerPagesScraper.ts`) to operate in **Draft Mode**:
  * Scraper navigates to job, opens application modal, and inputs user details.
  * Scraper takes a screenshot of the filled application: `screenshots/review_${applicationId}.png`.
  * Scraper **STOPS** before clicking Submit.
  * It logs: `⏸️ Application prepared and staged. Awaiting explicit user approval in Review Queue.`
  * The actual submit button click is ONLY executable when triggered via an explicit user API call: `POST /api/reviews/:id/submit`.

### Safeguard 3: Restrict `PopupAgent` Scope
* Rename or refactor `selectFirstOptionInPopups` to `dismissConsentAndOverlays`.
* Completely remove automatic selection of arbitrary `<select>` options, radio buttons, and legal agreement checkboxes on application forms.
* Store unanswered questionnaire items in `applications.scraped_questions` so the user can review and answer them in the Review Queue UI.

### Safeguard 4: Review Queue Human Gatekeeper
* Ensure the frontend Review Queue displays:
  1. The tailored resume version.
  2. The generated cover letter.
  3. The screenshot of the pre-filled application form.
  4. Any warnings or detected questions.
* Only when the user clicks **"Approve & Submit"** (or **"Approve All"** with explicit confirmation dialog) does the backend launch the worker to complete the submission.

---

## 12. Master Removal & Migration Matrix

| # | Exact Path | Tracked | Unique Content | Target Action | Backup / Archive Recommendation | Expected Impact |
| :-: | :--- | :---: | :---: | :--- | :--- | :--- |
| **1** | `src/` | Yes | No (Prototype) | **Delete** | Git history preserved (`ed4ae99`) | Prevents duplicate Next.js build; clean frontend architecture. |
| **2** | `next.config.ts`, `next-env.d.ts` | Yes | No | **Delete** | None required | Removes Next.js configuration from root. |
| **3** | `tailwind.config.ts`, `postcss.config.mjs` (root) | Yes | No | **Delete** | `frontend/` has own Tailwind/Postcss configs | Clean root configuration. |
| **4** | `components.json`, `eslint.config.mjs`, `.babelrc` | Yes | No | **Delete** | None required | Removes leftover Shadcn/Next configs. |
| **5** | `JobApply/` | Yes | No (Empty Expo) | **Delete** | Zip archive to `backups/JobApply.zip` | Reclaims 250MB disk space, removes dead mobile skeleton. |
| **6** | `backend/src/scripts/updateOrchestrator.mjs` | Yes | No | **Delete** | Git history preserved | Removes dangerous monkey-patch script. |
| **7** | `backend/src/scripts/updateScrapers.mjs` | Yes | No | **Delete** | Git history preserved | Removes dangerous monkey-patch script. |
| **8** | `backend/fix_ts.js` | Yes | No | **Delete** | Git history preserved | Removes obsolete one-time regex patch. |
| **9** | `backend/src/test-imports.ts` | Yes | No | **Delete** | Git history preserved | Removes scratch test file. |
| **10**| `diff.txt` | Yes | No | **Delete** | Git history preserved | Removes 51KB dead diff file from root. |
| **11**| `project-structure.txt` | Yes | No | **Delete** | Superseded by docs | Removes stale file tree. |
| **12**| `test-system.js` | Yes | No | **Delete** | Git history preserved | Removes broken legacy test script. |
| **13**| `PUSH_*.sh`, `*.txt` push guides (17 files) | Yes | No | **Delete** | Git history preserved | Eliminates root documentation clutter. |
| **14**| Feature Summaries (`ANALYTICS_PAGE_SUMMARY.md`, etc.) | Yes | **Yes** | **Move to `docs/`** | Move to `docs/features/` & `docs/design/` | Preserves UI design specs and metrics documentation. |
| **15**| Platform Setups (`LINKEDIN_SETUP.md`, etc.) | Yes | **Yes** | **Move to `docs/`** | Move to `docs/integrations/` | Preserves setup credentials guides. |
| **16**| `.agents/skills/ui-ux-pro-max-skill` | Yes | No (Empty link) | **Untrack & Delete**| None required | Removes orphaned gitlink. |
| **17**| `backend/node_modules/` | **Yes** (9,234 files) | No (Vendor) | **`git rm -r --cached`** | Files kept on disk | Removes 9,234 tracked vendor files from git repository index. |

---

## 13. Phased Execution Roadmap

Once user approval is granted, cleanup will execute in four safe, non-destructive phases:

### Phase 1: Documentation Consolidation & Archival
1. Create directories: `docs/features/`, `docs/design/`, `docs/integrations/`.
2. Move unique summaries (`ANALYTICS_PAGE_SUMMARY.md`, `COMPANIES_PAGE_SUMMARY.md`, `RESUME_MANAGER_SUMMARY.md`) to `docs/features/`.
3. Move design guides (`DESIGN_SHOWCASE.md`, `NEUMORPHISM_DESIGN_GUIDE.md`) to `docs/design/`.
4. Move platform setups (`LINKEDIN_SETUP.md`, `MULTI_PLATFORM_SETUP.md`) to `docs/integrations/`.
5. Remove the 17 redundant git-push markdown and text files.

### Phase 2: Scratch Script & Orphaned Skill Purge
1. Delete `backend/src/scripts/updateOrchestrator.mjs` and `backend/src/scripts/updateScrapers.mjs`.
2. Delete `backend/fix_ts.js`, `backend/src/test-imports.ts`, `diff.txt`, `project-structure.txt`, `test-system.js`.
3. Untrack and remove empty `.agents/skills/ui-ux-pro-max-skill` gitlink.

### Phase 3: Root Prototype & Mobile Skeleton Removal
1. Create backup archive of `JobApply/` into `backups/JobApply_expo_skeleton.zip`.
2. Remove `JobApply/` directory.
3. Remove root `src/` Next.js directory and associated root config files (`next.config.ts`, `tailwind.config.ts`, `components.json`, etc.).
4. Update root `package.json` to be a pure workspace orchestrator running `frontend` and `backend`.

### Phase 4: Git Tracking Remediation & Safety Guardrail Implementation
1. Run `git rm -r --cached backend/node_modules` to clean the repository index while keeping packages on disk.
2. Edit `WorkflowOrchestrator.ts` to remove `|| true` and enforce review queue routing.
3. Refactor `popupAgent.ts` to restrict actions to cookies and dialogs, completely removing question answer guessing.
4. Run full TypeScript verification (`npm run build --prefix backend` and `npm run build --prefix frontend`) to verify zero regressions.

---

## 14. Verification & Approval Status

* [x] Second-pass verification completed across all 10 inspection criteria.
* [x] Safety review of `popupAgent.ts` and auto-apply workflows documented.
* [x] Master cleanup matrix and safeguard recommendations compiled.
* [ ] **Awaiting User Review & Approval before executing Phase 1–4.**

