# AutoJobApply — API Reference Specification

**Base URL:** `http://localhost:5000/api` (Frontend default: `/api`)  
**Authentication Scheme:** `Bearer <JWT_TOKEN>` in standard HTTP `Authorization` header  
**Response Format:** Standard JSON  
**Version:** 2.0 (Post Phase 3 Cleanup Baseline)

---

## 1. System & Health Endpoints

### `GET /health` & `GET /api/health`
Checks backend and database health.
* **Authentication:** None (Public)
* **Frontend Consumer:** Infrastructure monitors, Docker healthcheck, uptime probes.
* **Success Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "uptime": 1420,
    "timestamp": "2026-11-13T12:00:00.000Z",
    "database": "connected"
  }
  ```
* **Degraded Response (`503 Service Unavailable`):**
  ```json
  {
    "status": "degraded",
    "error": "Database health check failed",
    "timestamp": "2026-11-13T12:00:00.000Z"
  }
  ```

---

## 2. Authentication API (`/api/auth`)

Managed by [`backend/src/controllers/authController.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/backend/src/controllers/authController.ts). Frontend client: `authAPI` in [`frontend/src/api/auth.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/frontend/src/api/auth.ts).

### `POST /api/auth/register`
Creates a new user account.
* **Auth:** Public | **Rate Limit:** 10 requests / 15 minutes (`authLimiter`)
* **Consumer:** `Register.tsx` via `authAPI.register(email, password, fullName)`
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecretPassword123!",
    "fullName": "Jane Doe"
  }
  ```
* **Response (`201 Created`):**
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOi...",
    "user": {
      "id": "5f21cc20b2513b9c661fb679b54fab1e",
      "email": "user@example.com",
      "fullName": "Jane Doe"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates an existing user.
* **Auth:** Public | **Rate Limit:** 10 requests / 15 minutes (`authLimiter`)
* **Consumer:** `Login.tsx` via `authAPI.login(email, password)`
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecretPassword123!"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "5f21cc20b2513b9c661fb679b54fab1e",
      "email": "user@example.com",
      "fullName": "Jane Doe"
    }
  }
  ```

### `GET /api/auth/profile`
Retrieves currently logged-in user profile.
* **Auth:** Bearer JWT required
* **Consumer:** `useAuth.ts` via `authAPI.getProfile()`
* **Response (`200 OK`):**
  ```json
  {
    "id": "5f21cc20b2513b9c661fb679b54fab1e",
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "role": "user",
    "preferred_locations": ["Remote", "New York"],
    "employment_type": "Full-Time",
    "min_match_score": 80
  }
  ```

### `PUT /api/auth/profile`
Updates candidate search preferences and profile details.
* **Auth:** Bearer JWT required
* **Consumer:** `Settings.tsx` via `authAPI.updateProfile(data)`
* **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "preferred_locations": ["San Francisco", "Remote"],
    "employment_type": "Full-Time",
    "min_match_score": 85
  }
  ```
* **Response (`200 OK`):** Updated user object.

### Password Reset & Verification Endpoints
* `POST /api/auth/forgot-password` (Rate-limited, sends password reset email token)
* `POST /api/auth/reset-password` (Rate-limited, accepts `{ token, newPassword }`)
* `GET /api/auth/verify-email?token=...` (Verifies account)
* `POST /api/auth/resend-verification` (Rate-limited, accepts `{ email }`)

---

## 3. Review Queue API (`/api/review-queue`) — Human-in-the-Loop Gateway

Managed by [`backend/src/controllers/reviewQueueController.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/backend/src/controllers/reviewQueueController.ts). Frontend client: `reviewQueueAPI`.

### `GET /api/review-queue`
Fetches all applications queued with `review_status = 'pending'` for the current user.
* **Auth:** Bearer JWT required
* **Consumer:** `ReviewQueue.tsx` via `reviewQueueAPI.getPendingReviews()`
* **Response (`200 OK`):**
  ```json
  [
    {
      "id": "app_49b81a29f8c0",
      "job_id": "job_018fa30c9",
      "job_title": "Senior Frontend Engineer",
      "company_name": "Acme Corp",
      "apply_url": "https://linkedin.com/jobs/view/123",
      "source": "LinkedIn",
      "review_status": "pending",
      "match_score": 92.5,
      "screenshot_path": "screenshots/app_49b81a29f8c0.png",
      "warnings": ["Cover letter requires customization"],
      "scraped_questions": [
        {"question": "Years of TypeScript experience?", "type": "text"}
      ],
      "applied_at": "2026-11-13T11:45:00.000Z"
    }
  ]
  ```

### `GET /api/review-queue/:id`
Retrieves complete draft detail, cover letter, resume variant, and captured screenshot.
* **Auth:** Bearer JWT required
* **Consumer:** `ReviewQueue.tsx` via `reviewQueueAPI.getReviewDetail(id)`

### `POST /api/review-queue/:id/approve`
**Explicit Human Approval Endpoint:** Authorizes final submission of a single draft.
* **Auth:** Bearer JWT required (enforces application ownership and pending state)
* **Consumer:** `ReviewQueue.tsx` "Approve & Submit" button via `reviewQueueAPI.approve(id)`
* **Response (`200 OK`):**
  ```json
  {
    "message": "Application approved and submitted successfully",
    "applicationId": "app_49b81a29f8c0",
    "status": "applied"
  }
  ```

### `POST /api/review-queue/approve-all`
**Bulk Human Approval Endpoint:** Requires explicit confirmation payload.
* **Auth:** Bearer JWT required
* **Consumer:** `ReviewQueue.tsx` "Approve All" modal dialog via `reviewQueueAPI.approveAll(true)`
* **Safety Guard:** Rejects with `400 Bad Request` if `{ "confirmed": true }` is omitted.
* **Request Body:**
  ```json
  {
    "confirmed": true
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "message": "Approved all pending applications",
    "approvedCount": 5
  }
  ```

### `POST /api/review-queue/:id/reject`
Rejects a draft application; archives record with reason.
* **Auth:** Bearer JWT required
* **Consumer:** `ReviewQueue.tsx` "Reject" button via `reviewQueueAPI.reject(id, reason)`
* **Request Body:** `{ "reason": "Location not suitable" }`

---

## 4. Jobs API (`/api/jobs`)

Managed by [`backend/src/controllers/jobController.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/backend/src/controllers/jobController.ts). Frontend client: `jobsAPI`.

### `GET /api/jobs`
Lists scraped job listings with optional pagination and source filtering.
* **Auth:** Bearer JWT required
* **Consumer:** `JobsTable.tsx` via `jobsAPI.getJobs(limit)`
* **Query Parameters:** `?limit=50&offset=0&source=linkedin`
* **Response (`200 OK`):**
  ```json
  [
    {
      "id": "job_018fa30c9",
      "title": "Full Stack Engineer",
      "company_name": "Stripe",
      "location": "Remote",
      "salary": "$150,000 - $180,000",
      "experience_level": "Senior",
      "required_skills": ["React", "TypeScript", "Node.js"],
      "apply_url": "https://stripe.com/jobs/123",
      "source": "CareerPages",
      "posted_date": "2026-11-12T00:00:00.000Z",
      "status": "new"
    }
  ]
  ```

### `GET /api/jobs/:jobId`
Fetches complete job listing including full text description and required skills.
* **Auth:** Bearer JWT required
* **Consumer:** `JobsTable.tsx` / Modal inspect.

### `POST /api/jobs/search`
Executes targeted job search using keywords array.
* **Auth:** Bearer JWT required
* **Consumer:** `JobsTable.tsx` search bar via `jobsAPI.searchJobs(keywords)`.

---

## 5. Applications API (`/api/applications`)

Managed by [`backend/src/controllers/applicationController.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/backend/src/controllers/applicationController.ts). Frontend client: `applicationsAPI`.

* `GET /api/applications`: Lists all submitted applications for user (`applied`, `interview`, `offer`, `rejected`).
* `POST /api/applications/apply`: Manually requests application preparation for a specific `jobId`.
* `PUT /api/applications/:applicationId`: Updates status (e.g. records interview dates, notes, or offer received).

---

## 6. Dashboard & Analytics API (`/api/dashboard`, `/api/analytics`)

* **`GET /api/dashboard`:** Aggregated counts: total jobs discovered, pending review items, active applications, interview count, platform distribution.
  * **Consumer:** `Dashboard.tsx` via `dashboardAPI.getDashboard()`.
* **`POST /api/agents/run`:** Triggers the multi-agent automation workflow for the authenticated user.
  * **Consumer:** `Dashboard.tsx` "Run Agents" trigger button.
* **`GET /api/analytics`:** Computes conversion funnel stats (total applied, viewed, interviews, offers, and conversion percentages).
  * **Consumer:** `Analytics.tsx` via `analyticsAPI.getAnalytics()`.

---

## 7. Resume & Resume Versions API (`/api/resumes`, `/api/resume-versions`)

* `POST /api/resumes/upload`: Multipart upload for primary resume PDF; runs `pdf-parse` ATS extraction.
* `GET /api/resumes`: Retrieves parsed skills, experience, education, and ATS score.
* `PUT /api/resumes/builder`: Saves interactive resume builder JSON data.
* `GET /api/resume-versions`: Lists all tailored resume profiles for the candidate.
* `POST /api/resume-versions`: Multipart upload for specialized resume version.
* `PUT /api/resume-versions/:id`: Updates version label or parsed skills.
* `DELETE /api/resume-versions/:id`: Deletes resume version.
* `POST /api/resume-versions/:id/default`: Designates active default resume version.

---

## 8. Cover Letters API (`/api/cover-letters`)

Managed by [`backend/src/controllers/coverLetterController.ts`](file:///c:/Users/MEDICOVER/Desktop/auto-ai/autoJobApply/backend/src/controllers/coverLetterController.ts). Frontend client: `coverLettersAPI`.

* `POST /api/cover-letters/generate`: Generates AI cover letter tailored to `{ jobId, resumeVersionId }`.
* `GET /api/cover-letters`: Lists all generated cover letters.
* `GET /api/cover-letters/:id`: Returns single cover letter text.
* `PUT /api/cover-letters/:id`: Updates content of a cover letter.
* `DELETE /api/cover-letters/:id`: Removes cover letter.

---

## 9. Activity Logs & Exports API (`/api/activity-logs`, `/api/exports`)

* `GET /api/activity-logs`: Returns audit trail logs with filtering by status and action type.
* `GET /api/activity-logs/stats`: Returns daily activity counts and success ratios.
* `GET /api/exports/applications/csv`: Direct download URL for CSV applications table.
* `GET /api/exports/applications/xlsx`: Direct download URL for Excel spreadsheet.
* `GET /api/exports/activity-logs/csv`: Direct download URL for audit log CSV.

---

## 10. Settings API (`/api/settings`)

* `GET /api/settings`: Retrieves job search configuration, preferred platforms, and score thresholds.
* `PUT /api/settings`: Persists updated search criteria:
  ```json
  {
    "target_roles": ["Frontend Developer", "Full Stack Engineer"],
    "target_locations": ["Remote", "Hybrid"],
    "preferred_platforms": ["linkedin", "indeed", "naukri"],
    "auto_rank_threshold": 75,
    "min_salary": "$120,000"
  }
  ```

