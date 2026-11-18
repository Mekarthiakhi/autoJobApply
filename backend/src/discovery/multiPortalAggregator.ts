import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface DiscoveredJobRecord {
  title: string;
  company_name: string;
  location: string;
  salary: string;
  experience_level: string;
  required_skills: string[];
  job_description: string;
  apply_url: string;
  source: string;
  external_id: string;
  status: string;
  posted_date: Date;
}

export interface PortalStatus {
  id: string;
  name: string;
  coverage: string;
  status: 'active' | 'needs_key';
  requiresKey: boolean;
  envVar?: string;
}

export interface DiscoveryQuery {
  role: string;
  keywords?: string[];
  locations?: string[];
  limitPerPortal?: number;
}

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null): string {
  if (!min && !max) return 'Not specified';
  const curr = currency || 'USD';
  if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  if (min) return `${curr} ${min.toLocaleString()}+`;
  return `Up to ${curr} ${max?.toLocaleString()}`;
}

function matchesSearchTerms(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => t.length >= 2 && lower.includes(t.toLowerCase()));
}

export class MultiPortalAggregator {
  getPortalStatuses(): PortalStatus[] {
    return [
      { id: 'remotive', name: 'Remotive', coverage: 'Global Remote Tech', status: 'active', requiresKey: false },
      { id: 'remoteok', name: 'RemoteOK', coverage: 'Global Remote Dev', status: 'active', requiresKey: false },
      { id: 'jobicy', name: 'Jobicy', coverage: 'Remote Engineering', status: 'active', requiresKey: false },
      { id: 'arbeitnow', name: 'Arbeitnow', coverage: 'Europe & Remote Tech', status: 'active', requiresKey: false },
      { id: 'himalayas', name: 'Himalayas', coverage: 'Worldwide Remote', status: 'active', requiresKey: false },
      {
        id: 'jsearch',
        name: 'LinkedIn / Indeed / Glassdoor (JSearch)',
        coverage: 'India, US & Global',
        status: process.env.RAPIDAPI_KEY ? 'active' : 'needs_key',
        requiresKey: true,
        envVar: 'RAPIDAPI_KEY',
      },
      {
        id: 'adzuna',
        name: 'Adzuna India & Global',
        coverage: 'Hyderabad, Bangalore, India & Global',
        status: process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? 'active' : 'needs_key',
        requiresKey: true,
        envVar: 'ADZUNA_APP_ID + ADZUNA_APP_KEY',
      },
      {
        id: 'jooble',
        name: 'Jooble (Naukri / Shine / Indeed Aggregator)',
        coverage: 'India & Worldwide',
        status: process.env.JOOBLE_API_KEY ? 'active' : 'needs_key',
        requiresKey: true,
        envVar: 'JOOBLE_API_KEY',
      },
    ];
  }

  async discoverAllPortals(query: DiscoveryQuery): Promise<{
    jobs: DiscoveredJobRecord[];
    byPortal: Record<string, number>;
  }> {
    const role = query.role || 'React Developer';
    const location = query.locations?.[0] || 'Remote';
    const limit = Math.min(query.limitPerPortal || 6, 15);

    const searchTerms = Array.from(
      new Set([
        ...role.split(/[\s,/()-]+/).filter((w) => w.length >= 3 && !['the', 'and', 'for', 'developer', 'engineer'].includes(w.toLowerCase())),
        ...(query.keywords || []).slice(0, 5),
      ])
    );
    if (searchTerms.length === 0) searchTerms.push('react', 'frontend', 'javascript');
    const primaryKeyword = searchTerms[0];

    const tasks: Array<{ name: string; promise: Promise<DiscoveredJobRecord[]> }> = [
      { name: 'remotive', promise: this.fetchRemotive(primaryKeyword, limit) },
      { name: 'remoteok', promise: this.fetchRemoteOK(searchTerms, limit) },
      { name: 'jobicy', promise: this.fetchJobicy(primaryKeyword, limit) },
      { name: 'arbeitnow', promise: this.fetchArbeitnow(searchTerms, limit) },
      { name: 'himalayas', promise: this.fetchHimalayas(searchTerms, limit) },
    ];

    if (process.env.RAPIDAPI_KEY) {
      tasks.push({ name: 'jsearch', promise: this.fetchJSearch(role, location, limit) });
    }
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      tasks.push({ name: 'adzuna', promise: this.fetchAdzuna(role, location, limit) });
    }
    if (process.env.JOOBLE_API_KEY) {
      tasks.push({ name: 'jooble', promise: this.fetchJooble(role, location, limit) });
    }

    const results = await Promise.allSettled(tasks.map((t) => t.promise));
    const allJobs: DiscoveredJobRecord[] = [];
    const byPortal: Record<string, number> = {};

    results.forEach((res, idx) => {
      const portalName = tasks[idx].name;
      if (res.status === 'fulfilled') {
        byPortal[portalName] = res.value.length;
        allJobs.push(...res.value);
      } else {
        byPortal[portalName] = 0;
        logger.warn(`Portal fetch failed: ${portalName}`, { error: res.reason?.message });
      }
    });

    logger.info('Multi-portal job discovery finished', {
      role,
      primaryKeyword,
      totalFound: allJobs.length,
      byPortal,
    });

    return { jobs: allJobs, byPortal };
  }

  private async fetchRemotive(keyword: string, limit: number): Promise<DiscoveredJobRecord[]> {
    const res = await axios.get(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=${limit}`,
      { timeout: 10000, headers: { 'User-Agent': 'AutoJobApply/1.0' } }
    );
    const items = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
    return items.slice(0, limit).map((rj: any) => ({
      title: rj.title || 'Software Engineer',
      company_name: rj.company_name || 'Unknown Company',
      location: rj.candidate_required_location || 'Remote',
      salary: rj.salary || 'Not specified',
      experience_level: rj.job_type === 'full_time' ? 'Full-Time' : (rj.job_type || 'Full-Time'),
      required_skills: Array.isArray(rj.tags) ? rj.tags.slice(0, 12) : [],
      job_description: stripHtml(rj.description || ''),
      apply_url: rj.url || '',
      source: 'remotive',
      external_id: `remotive-${rj.id}`,
      status: 'active',
      posted_date: rj.publication_date ? new Date(rj.publication_date) : new Date(),
    }));
  }

  private async fetchRemoteOK(terms: string[], limit: number): Promise<DiscoveredJobRecord[]> {
    const res = await axios.get('https://remoteok.com/api', {
      timeout: 10000,
      headers: { 'User-Agent': 'AutoJobApply/1.0' },
    });
    const list = Array.isArray(res.data) ? res.data.filter((x: any) => x && x.id && x.position) : [];
    const matched = list.filter((j: any) =>
      matchesSearchTerms(`${j.position || ''} ${(j.tags || []).join(' ')} ${j.description || ''}`, terms)
    );
    const pick = matched.length > 0 ? matched : list;
    return pick.slice(0, limit).map((j: any) => ({
      title: j.position,
      company_name: j.company || 'Unknown Company',
      location: j.location || 'Remote Worldwide',
      salary: formatSalary(j.salary_min, j.salary_max, 'USD'),
      experience_level: 'Full-Time',
      required_skills: Array.isArray(j.tags) ? j.tags.slice(0, 12) : [],
      job_description: stripHtml(j.description || ''),
      apply_url: j.apply_url || j.url || '',
      source: 'remoteok',
      external_id: `remoteok-${j.id}`,
      status: 'active',
      posted_date: j.date ? new Date(j.date) : new Date(),
    }));
  }

  private async fetchJobicy(keyword: string, limit: number): Promise<DiscoveredJobRecord[]> {
    const res = await axios.get(
      `https://jobicy.com/api/v2/remote-jobs?count=${limit}&tag=${encodeURIComponent(keyword.toLowerCase())}`,
      { timeout: 10000, headers: { 'User-Agent': 'AutoJobApply/1.0' } }
    );
    const items = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
    return items.slice(0, limit).map((j: any) => ({
      title: j.jobTitle || 'Software Engineer',
      company_name: j.companyName || 'Unknown Company',
      location: j.jobGeo || 'Remote',
      salary: formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency),
      experience_level: j.jobLevel || (Array.isArray(j.jobType) ? j.jobType[0] : 'Full-Time'),
      required_skills: Array.isArray(j.jobIndustry) ? j.jobIndustry.slice(0, 8) : [],
      job_description: stripHtml(j.jobDescription || j.jobExcerpt || ''),
      apply_url: j.url || '',
      source: 'jobicy',
      external_id: `jobicy-${j.id}`,
      status: 'active',
      posted_date: j.pubDate ? new Date(j.pubDate) : new Date(),
    }));
  }

  private async fetchArbeitnow(terms: string[], limit: number): Promise<DiscoveredJobRecord[]> {
    const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 10000,
      headers: { 'User-Agent': 'AutoJobApply/1.0' },
    });
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
    const matched = list.filter((j: any) =>
      matchesSearchTerms(`${j.title || ''} ${(j.tags || []).join(' ')} ${j.description || ''}`, terms)
    );
    return matched.slice(0, limit).map((aj: any) => ({
      title: aj.title || 'Software Engineer',
      company_name: aj.company_name || 'Unknown Company',
      location: aj.remote ? `${aj.location || 'Remote'} (Remote)` : (aj.location || 'Remote'),
      salary: 'Not specified',
      experience_level: 'Full-Time',
      required_skills: Array.isArray(aj.tags) ? aj.tags.slice(0, 12) : [],
      job_description: stripHtml(aj.description || ''),
      apply_url: aj.url || '',
      source: 'arbeitnow',
      external_id: `arbeitnow-${aj.slug}`,
      status: 'active',
      posted_date: aj.created_at ? new Date(aj.created_at * 1000) : new Date(),
    }));
  }

  private async fetchHimalayas(terms: string[], limit: number): Promise<DiscoveredJobRecord[]> {
    const res = await axios.get('https://himalayas.app/jobs/api?limit=40', {
      timeout: 10000,
      headers: { 'User-Agent': 'AutoJobApply/1.0' },
    });
    const list = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
    const matched = list.filter((j: any) =>
      matchesSearchTerms(
        `${j.title || ''} ${(j.categories || []).join(' ')} ${j.excerpt || ''} ${j.description || ''}`,
        terms
      )
    );
    return matched.slice(0, limit).map((hj: any) => ({
      title: hj.title || 'Software Engineer',
      company_name: hj.companyName || 'Unknown Company',
      location:
        Array.isArray(hj.locationRestrictions) && hj.locationRestrictions.length > 0
          ? hj.locationRestrictions.slice(0, 3).join(', ')
          : 'Remote Worldwide',
      salary: formatSalary(hj.minSalary, hj.maxSalary, hj.currency),
      experience_level: Array.isArray(hj.seniority) && hj.seniority[0] ? hj.seniority[0] : (hj.employmentType || 'Full-Time'),
      required_skills: Array.isArray(hj.categories) ? hj.categories.slice(0, 10) : [],
      job_description: stripHtml(hj.description || hj.excerpt || ''),
      apply_url: hj.applicationLink || hj.guid || '',
      source: 'himalayas',
      external_id: `himalayas-${(hj.guid || hj.title || Date.now()).toString().slice(-40)}`,
      status: 'active',
      posted_date: hj.pubDate ? new Date(hj.pubDate * 1000) : new Date(),
    }));
  }

  // Official LinkedIn / Indeed / Glassdoor / Shine / Naukri Aggregator via RapidAPI JSearch v2
  private async fetchJSearch(role: string, location: string, limit: number): Promise<DiscoveredJobRecord[]> {
    const cleanLoc = location && location.toLowerCase() !== 'remote' ? location : 'India';
    const isIndia = /india|hyderabad|bangalore|bengaluru|pune|mumbai|chennai|delhi|noida|gurgaon/i.test(cleanLoc);
    const q = `${role} in ${cleanLoc}`;
    const res = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
      params: {
        query: q,
        num_pages: '1',
        country: isIndia ? 'in' : 'us',
        date_posted: 'all',
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      },
      timeout: 12000,
    });
    const items = Array.isArray(res.data?.data?.jobs)
      ? res.data.data.jobs
      : Array.isArray(res.data?.data)
      ? res.data.data
      : [];
    return items.slice(0, limit).map((j: any) => {
      const publisher = (j.job_publisher || 'jsearch').toLowerCase();
      const source = publisher.includes('linkedin')
        ? 'linkedin'
        : publisher.includes('indeed')
        ? 'indeed'
        : publisher.includes('glassdoor')
        ? 'glassdoor'
        : publisher.includes('naukri')
        ? 'naukri'
        : publisher.includes('shine')
        ? 'shine'
        : 'jsearch';
      return {
        title: j.job_title || role,
        company_name: j.employer_name || 'Unknown Company',
        location: j.job_location ||
          (j.job_is_remote
            ? `${j.job_city || j.job_country || 'Remote'} (Remote)`
            : [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || cleanLoc),
        salary: j.job_salary_string || formatSalary(j.job_min_salary, j.job_max_salary, j.job_salary_currency),
        experience_level: j.job_employment_type || 'Full-Time',
        required_skills: Array.isArray(j.job_required_skills) ? j.job_required_skills : [],
        job_description: stripHtml(j.job_description || ''),
        apply_url: j.job_apply_link || j.job_google_link || '',
        source,
        external_id: `${source}-${j.job_uid || (j.job_id || Date.now()).toString().slice(0, 48)}`,
        status: 'active',
        posted_date: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : new Date(),
      };
    });
  }

  // Official Adzuna API (supports India `in`, US `us`, UK `gb`)
  private async fetchAdzuna(role: string, location: string, limit: number): Promise<DiscoveredJobRecord[]> {
    const country = process.env.ADZUNA_COUNTRY || 'in';
    const res = await axios.get(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`, {
      params: {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_APP_KEY,
        results_per_page: limit,
        what: role,
        ...(location && location.toLowerCase() !== 'remote' ? { where: location } : {}),
      },
      timeout: 12000,
    });
    const items = Array.isArray(res.data?.results) ? res.data.results : [];
    return items.slice(0, limit).map((j: any) => ({
      title: j.title || role,
      company_name: j.company?.display_name || 'Unknown Company',
      location: j.location?.display_name || location,
      salary: formatSalary(j.salary_min, j.salary_max, country === 'in' ? 'INR' : 'USD'),
      experience_level: j.contract_time || 'Full-Time',
      required_skills: j.category?.label ? [j.category.label] : [],
      job_description: stripHtml(j.description || ''),
      apply_url: j.redirect_url || '',
      source: 'adzuna',
      external_id: `adzuna-${j.id}`,
      status: 'active',
      posted_date: j.created ? new Date(j.created) : new Date(),
    }));
  }

  // Official Jooble API (aggregates Naukri, Indeed, Greenhouse, Lever, LinkedIn across India & Global)
  private async fetchJooble(role: string, location: string, limit: number): Promise<DiscoveredJobRecord[]> {
    const apiKey = process.env.JOOBLE_API_KEY || '';
    const primaryKeyword = role.split(/\s+/)[0] || 'React';
    let items: any[] = [];

    for (const loc of [location || 'India', 'India', 'Remote']) {
      const res = await axios.post(
        `https://jooble.org/api/${apiKey}`,
        { keywords: primaryKeyword, location: loc },
        { timeout: 12000 }
      );
      const found = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
      if (found.length > 0) {
        items = found;
        break;
      }
    }

    return items.slice(0, limit).map((j: any) => {
      const rawSrc = (j.source || 'jooble').toLowerCase();
      const source = rawSrc.includes('naukri')
        ? 'naukri'
        : rawSrc.includes('linkedin')
        ? 'linkedin'
        : rawSrc.includes('indeed')
        ? 'indeed'
        : 'jooble';
      return {
        title: j.title || role,
        company_name: j.company || 'Unknown Company',
        location: j.location || location || 'India',
        salary: j.salary || 'Not specified',
        experience_level: j.type || 'Full-Time',
        required_skills: [],
        job_description: stripHtml(j.snippet || ''),
        apply_url: j.link || '',
        source,
        external_id: `jooble-${j.id || Buffer.from(j.link || j.title).toString('base64').slice(0, 24)}`,
        status: 'active',
        posted_date: j.updated ? new Date(j.updated) : new Date(),
      };
    });
  }
}

export const multiPortalAggregator = new MultiPortalAggregator();
