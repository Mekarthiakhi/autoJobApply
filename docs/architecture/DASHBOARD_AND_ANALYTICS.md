# Phase 11: Application Intelligence Dashboard and Analytics Architecture

## 1. Executive Summary

Phase 11 implements the **Application Intelligence Dashboard & Analytics Subsystem** for the AutoJobApply platform. It replaces legacy static/mocked values with real-time, audit-grade metrics computed directly from the SQLite database (`jobs`, `applications`, `match_scores`, and `activity_logs`).

The subsystem provides:
- **11 Grounded Core Metrics**: Every metric is mathematically defined, SQL-aggregated, and strictly non-misleading.
- **Dynamic Multi-Dimensional Filters**: Date ranges, company search, platform/source selection, role matching, and application stage filtering.
- **Job-Source Performance Benchmarks**: Multi-platform yield and conversion comparisons (LinkedIn, Indeed, Glassdoor, Naukri, Career Pages).
- **Multi-Agent Observability**: Execution metrics, error rates, and failure exception logs by agent responsibility.
- **Candidate Action Prioritization**: Proactive detection of applications requiring answer verification, missing information, or expiring approval TTLs.
- **High-Performance Querying & Pagination**: Single-pass SQL aggregations, composite indexing, and monotonic offset/limit pagination.

---

## 2. Core Metric Definitions & Mathematical Formulas

| # | Metric Name | Definition & Business Purpose | SQL Aggregation Formula |
| :- | :--- | :--- | :--- |
| **1** | **Total Jobs Discovered** | Distinct active jobs crawled and indexed matching filters | `COUNT(DISTINCT j.id)` from `jobs j` |
| **2** | **Jobs Shortlisted** | Positions matching candidate profile with score &ge; 70% | `COUNT(DISTINCT j.id)` where `m.match_score >= 70 OR a.id IS NOT NULL` |
| **3** | **Applications Prepared** | Drafts assembled with tailored resume and cover letter | `COUNT(DISTINCT a.id)` where `a.stage_status IN ('DRAFTING', 'READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED')` |
| **4** | **Applications Awaiting Review** | Prepared drafts waiting for candidate answer verification | `COUNT(DISTINCT a.id)` where `a.stage_status IN ('READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT')` |
| **5** | **Applications Approved** | Drafts explicitly authorized by candidate with SHA-256 hash | `COUNT(DISTINCT a.id)` where `a.stage_status = 'APPROVED' OR (a.approved_draft_hash IS NOT NULL AND a.stage_status != 'REJECTED')` |
| **6** | **Applications Submitted** | Applications successfully delivered to employer portal | `COUNT(DISTINCT a.id)` where `a.stage_status = 'SUBMITTED' OR a.status IN ('applied', 'submitted', 'interview', 'offer')` |
| **7** | **Failed Applications** | Submissions aborted due to platform errors or anti-bot pauses | `COUNT(DISTINCT a.id)` where `a.stage_status = 'FAILED' OR a.status = 'failed' OR a.last_submission_error IS NOT NULL` |
| **8** | **Interview Invitations** | Confirmed recruiter outreach or scheduled interviews | `COUNT(DISTINCT a.id)` where `a.interview_scheduled = 1 OR a.status = 'interview'` |
| **9** | **Rejection Rate** | Percentage of terminal applications that were rejected | $$\frac{\text{Rejections}}{\max(\text{Submitted} + \text{Rejections}, 1)} \times 100\%$$ |
| **10** | **Application Conversion Rate** | Percentage of submitted applications yielding interviews/offers | $$\frac{\text{Interviews} + \text{Offers}}{\max(\text{Submitted}, 1)} \times 100\%$$ |
| **11** | **Avg Time Discovery to Submission** | Mean duration between job crawl and confirmed submission | `AVG(ABS(julianday(a.applied_at) - julianday(COALESCE(a.created_at, j.created_at))) * 24.0)` hours |

---

## 3. Query Optimization and Single-Pass Aggregation

To avoid N+1 query overhead and table scanning, `AnalyticsService.getDashboardMetrics` executes a single aggregation query over joined `applications` and `jobs`:

```sql
SELECT 
  COUNT(DISTINCT a.id) as total_applications,
  SUM(CASE WHEN a.stage_status IN ('DRAFTING', 'READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT', 'APPROVED', 'SUBMITTING', 'SUBMITTED', 'FAILED') OR a.resume_version_id IS NOT NULL THEN 1 ELSE 0 END) as prepared,
  SUM(CASE WHEN a.stage_status IN ('READY_FOR_REVIEW', 'NEEDS_CANDIDATE_INPUT') OR (a.review_status = 'pending' AND a.stage_status NOT IN ('APPROVED', 'SUBMITTED', 'REJECTED')) THEN 1 ELSE 0 END) as awaiting_review,
  SUM(CASE WHEN a.stage_status = 'APPROVED' OR (a.approved_draft_hash IS NOT NULL AND a.stage_status NOT IN ('REJECTED')) THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN a.stage_status = 'SUBMITTED' OR a.status IN ('applied', 'submitted', 'interview', 'offer') THEN 1 ELSE 0 END) as submitted,
  SUM(CASE WHEN a.stage_status = 'FAILED' OR a.status = 'failed' OR a.last_submission_error IS NOT NULL THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN a.interview_scheduled = 1 OR a.status = 'interview' THEN 1 ELSE 0 END) as interviews,
  SUM(CASE WHEN a.offer_received = 1 OR a.status = 'offer' THEN 1 ELSE 0 END) as offers,
  SUM(CASE WHEN a.rejected = 1 OR a.status = 'rejected' OR a.stage_status = 'REJECTED' THEN 1 ELSE 0 END) as rejections
FROM applications a
JOIN jobs j ON a.job_id = j.id
WHERE a.user_id = ?
  AND [optional filter clauses]
```

---

## 4. Database Indexing Strategy

The following composite and single-column B-Tree indexes guarantee sub-millisecond aggregation:

- `idx_jobs_company`: `jobs(company_name)`
- `idx_jobs_source`: `jobs(source)`
- `idx_jobs_created_at`: `jobs(created_at)`
- `idx_applications_user_id`: `applications(user_id)`
- `idx_applications_user_status`: `applications(user_id, status)`
- `idx_applications_user_stage`: `applications(user_id, stage_status)`
- `idx_applications_applied_at`: `applications(applied_at)`
- `idx_activity_logs_user_status`: `activity_logs(user_id, status)`
- `idx_activity_logs_action`: `activity_logs(action)`
- `idx_activity_logs_created_at`: `activity_logs(created_at)`

---

## 5. Job-Source Performance Benchmarking

Grouped by platform source (`linkedin`, `indeed`, `glassdoor`, `naukri`, `career_page`):
- Tracks job discovery count, applications prepared, applications submitted, interviews received, and rejections.
- Calculates source conversion rate: $\frac{\text{Interviews} + \text{Offers}}{\max(\text{Submitted}, 1)} \times 100\%$.
- Highlights top-performing platforms so candidates can focus on channels with the highest yield.

---

## 6. Multi-Agent Observability & Error Tracking

Logs generated by the agent architecture (`job_discovery`, `ranking`, `resume_tailoring`, `cover_letter`, `review`, `controlled_browser_execution`) are parsed in real time:
- Computes overall system execution error rate: $\frac{\text{Failed Runs}}{\text{Total Runs}} \times 100\%$.
- Tracks run count, error count, and success percentage for each agent.
- Surface recent exception payloads (e.g. anti-bot challenge triggers, network timeouts, selector changes) directly in the UI for candidate intervention.

---

## 7. Pending Candidate Action Detection

Identifies applications that cannot advance automatically:
- **`PROVIDE_MISSING_INFO`**: Applications in `NEEDS_CANDIDATE_INPUT` or with unresolved fields in `missing_fields`.
- **`VERIFY_ANSWERS`**: Applications in `READY_FOR_REVIEW` waiting for explicit answer confirmation.
- **`EXPIRING_SOON`**: Applications in `APPROVED` state with an approval TTL expiring in less than 4 hours.

---

## 8. API Contract Reference

### `GET /api/dashboard`
Returns consolidated metrics, pending actions, recent workflow history, source performance, and recent jobs.
**Query Parameters**:
- `startDate`: string (ISO 8601)
- `endDate`: string (ISO 8601)
- `platform`: string
- `company`: string
- `role`: string
- `status`: string

### `GET /api/analytics`
Returns comprehensive metrics, conversion funnel stages, source performance comparisons, agent health metrics, and grounded data-driven insights.
**Query Parameters**:
- `startDate`, `endDate`, `platform`, `company`, `role`, `status`

### `GET /api/activity-logs`
Returns paginated operational audit logs with job context.
**Query Parameters**:
- `page`: integer (default: 1)
- `limit`: integer (default: 50, max: 100)
- `action`: string
- `status`: string
- `startDate`, `endDate`: string

