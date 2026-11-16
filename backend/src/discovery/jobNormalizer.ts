import {
  NormalizedJob,
  NormalizedSalary,
  ExperienceLevel,
  EmploymentType,
  JobStatus,
  JobPlatform,
} from './types.js';

export class JobNormalizer {
  /**
   * Normalize an incoming raw job from any scraper or API into canonical NormalizedJob schema.
   */
  normalize(raw: any): NormalizedJob {
    const title = this.cleanString(raw.title || raw.job_title || 'Untitled Position');
    const companyName = this.cleanString(raw.company_name || raw.company || 'Unknown Company');
    const location = this.cleanString(raw.location || 'Remote');
    const description = (raw.job_description || raw.description || '').trim();
    const applyUrl = (raw.apply_url || raw.url || '').trim();
    const source = this.normalizeSource(raw.source);
    const externalId = (raw.external_id || raw.id || `${source}-${Date.now()}`).toString().trim();

    const isRemote = this.detectRemote(title, location, description);
    const salary = this.parseSalary(raw.salary);
    const experienceLevel = this.inferExperienceLevel(raw.experience_level || title, description);
    const employmentType = this.inferEmploymentType(raw.employment_type || title, description);
    const requiredSkills = this.cleanSkills(raw.required_skills || raw.skills);
    const canonicalUrl = this.createCanonicalUrl(applyUrl);

    const now = new Date().toISOString();
    const postedDate = raw.posted_date
      ? new Date(raw.posted_date).toISOString()
      : now;

    return {
      title,
      companyName,
      location,
      isRemote,
      salary,
      experienceLevel,
      employmentType,
      requiredSkills,
      jobDescription: description,
      applyUrl,
      canonicalUrl,
      source,
      externalId,
      postedDate,
      discoveredAt: raw.created_at || now,
      lastSeenAt: now,
      status: (raw.status?.toLowerCase() as JobStatus) || 'new',
    };
  }

  /**
   * Parse salary string into structured currency, min, max, and period.
   */
  parseSalary(salaryStr?: string): NormalizedSalary {
    if (!salaryStr || typeof salaryStr !== 'string' || salaryStr.trim().toLowerCase() === 'not specified') {
      return { raw: salaryStr || 'Not specified' };
    }

    const clean = salaryStr.trim();
    let currency = '$';
    if (clean.includes('₹') || clean.toLowerCase().includes('inr') || clean.toLowerCase().includes('lpa')) currency = '₹';
    else if (clean.includes('£') || clean.toLowerCase().includes('gbp')) currency = '£';
    else if (clean.includes('€') || clean.toLowerCase().includes('eur')) currency = '€';

    let period: 'yearly' | 'monthly' | 'hourly' = 'yearly';
    const lower = clean.toLowerCase();
    if (/\b(hr|hour|hourly)\b|\/\s*hr/i.test(lower)) {
      period = 'hourly';
    } else if (/\b(mo|month|monthly)\b|\/\s*mo/i.test(lower)) {
      period = 'monthly';
    } else if (/\b(yr|year|annum|annual|annually|lpa)\b|\/\s*yr/i.test(lower)) {
      period = 'yearly';
    }

    // Extract numerical ranges (handles $120k - $150k, 120,000 - 160,000, 15 - 25 LPA)
    const matches = clean.match(/(\d+(?:[.,]\d+)?)\s*(k|lpa|lac|lakh)?/gi);
    if (!matches || matches.length === 0) {
      return { raw: clean, currency, period };
    }

    const hasLpa = /\b(lpa|lac|lakh)\b/i.test(clean);
    const hasK = /\bk\b/i.test(clean) || /\d+k\b/i.test(clean);

    const parseNum = (val: string): number => {
      const numMatch = val.match(/(\d+(?:[.,]\d+)?)/);
      if (!numMatch) return 0;
      let n = parseFloat(numMatch[1].replace(/,/g, ''));
      const valLower = val.toLowerCase();
      if (valLower.includes('k') || (hasK && n < 1000)) n *= 1_000;
      else if (valLower.includes('lpa') || valLower.includes('lac') || valLower.includes('lakh') || (hasLpa && n < 100)) n *= 100_000;
      return n;
    };

    const nums = matches.map(parseNum).filter(n => n > 0);
    if (nums.length === 0) return { raw: clean, currency, period };

    const min = Math.min(...nums);
    const max = nums.length > 1 ? Math.max(...nums) : min;

    return {
      raw: clean,
      min,
      max,
      currency,
      period,
    };
  }

  inferExperienceLevel(levelOrTitle?: string, description?: string): ExperienceLevel {
    const text = `${levelOrTitle || ''} ${description || ''}`.toLowerCase();
    if (/\b(intern|internship|trainee|apprentice)\b/i.test(text)) return 'entry';
    if (/\b(junior|entry|grad|graduate|associate|0-2 years|1-2 years)\b/i.test(text)) return 'entry';
    if (/\b(lead|principal|staff|architect|head of)\b/i.test(text)) return 'lead';
    if (/\b(director|vp|vice president|chief|c-level|executive)\b/i.test(text)) return 'executive';
    if (/\b(senior|sr\.|sr|5\+ years|7\+ years|8\+ years)\b/i.test(text)) return 'senior';
    if (/\b(mid|intermediate|3-5 years|2-4 years)\b/i.test(text)) return 'mid';
    return 'unspecified';
  }

  inferEmploymentType(typeOrTitle?: string, description?: string): EmploymentType {
    const text = `${typeOrTitle || ''} ${description || ''}`.toLowerCase();
    if (/\b(intern|internship)\b/i.test(text)) return 'Internship';
    if (/\b(contract|contractor|freelance|consultant|c2c|w2 contract)\b/i.test(text)) return 'Contract';
    if (/\b(part-time|part time)\b/i.test(text)) return 'Part-Time';
    if (/\b(temp|temporary)\b/i.test(text)) return 'Temporary';
    return 'Full-Time';
  }

  detectRemote(title: string, location: string, description: string): boolean {
    const text = `${title} ${location} ${description.slice(0, 500)}`.toLowerCase();
    return /\b(remote|work from home|wfh|anywhere|telecommute|distributed)\b/i.test(text);
  }

  createCanonicalUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'refId', 'trackingId', 'trk', 'sessionId', 'fbclid', 'gclid', 'originalSubdomain',
      ];
      for (const p of trackingParams) {
        parsed.searchParams.delete(p);
      }
      // Strip trailing slashes and hash fragments
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
    } catch {
      return url.split('?')[0].replace(/\/+$/, '').trim();
    }
  }

  cleanSkills(skills: any): string[] {
    if (!skills) return [];
    let list: string[] = [];
    if (Array.isArray(skills)) {
      list = skills;
    } else if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) list = parsed;
        else list = skills.split(/[,;&]/);
      } catch {
        list = skills.split(/[,;&]/);
      }
    }
    const cleaned = list
      .map(s => String(s).trim())
      .filter(s => s.length > 1 && s.length < 50);
    return Array.from(new Set(cleaned));
  }

  private cleanString(val: string): string {
    return val
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  private normalizeSource(source: any): JobPlatform {
    const s = String(source || '').toLowerCase().trim();
    if (s.includes('linkedin')) return 'linkedin';
    if (s.includes('indeed')) return 'indeed';
    if (s.includes('glassdoor')) return 'glassdoor';
    if (s.includes('naukri')) return 'naukri';
    if (s.includes('career')) return 'career_page';
    return 'other';
  }
}

export const jobNormalizer = new JobNormalizer();
