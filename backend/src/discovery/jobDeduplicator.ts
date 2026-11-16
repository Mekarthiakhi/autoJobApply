import { NormalizedJob } from './types.js';

export interface DeduplicationResult {
  uniqueJobs: NormalizedJob[];
  duplicates: Array<{
    duplicate: NormalizedJob;
    canonicalJobId: string;
    reason: 'exact_external_id' | 'exact_canonical_url' | 'fuzzy_cross_platform';
    similarityScore: number;
  }>;
}

export class JobDeduplicator {
  /**
   * Deduplicate a batch of newly ingested jobs against each other and against an optional list of existing database jobs.
   */
  deduplicateBatch(
    incomingJobs: NormalizedJob[],
    existingJobs: NormalizedJob[] = [],
    fuzzyThreshold: number = 0.80
  ): DeduplicationResult {
    const uniqueJobs: NormalizedJob[] = [];
    const duplicates: DeduplicationResult['duplicates'] = [];

    // Fast lookup maps for Level 1 exact matching
    const exactExternalMap = new Map<string, string>(); // `${source}:${externalId}` -> id
    const exactUrlMap = new Map<string, string>();        // canonicalUrl -> id

    // Populate lookup maps with existing jobs
    for (const job of existingJobs) {
      const jobId = job.id || job.externalId;
      exactExternalMap.set(`${job.source}:${job.externalId}`.toLowerCase(), jobId);
      if (job.canonicalUrl) {
        exactUrlMap.set(job.canonicalUrl.toLowerCase(), jobId);
      }
    }

    const poolForFuzzy = [...existingJobs];

    for (const job of incomingJobs) {
      const externalKey = `${job.source}:${job.externalId}`.toLowerCase();
      const urlKey = job.canonicalUrl ? job.canonicalUrl.toLowerCase() : '';

      // 1. Check Exact External ID
      if (exactExternalMap.has(externalKey)) {
        duplicates.push({
          duplicate: job,
          canonicalJobId: exactExternalMap.get(externalKey)!,
          reason: 'exact_external_id',
          similarityScore: 1.0,
        });
        continue;
      }

      // 2. Check Exact Canonical URL
      if (urlKey && exactUrlMap.has(urlKey)) {
        duplicates.push({
          duplicate: job,
          canonicalJobId: exactUrlMap.get(urlKey)!,
          reason: 'exact_canonical_url',
          similarityScore: 1.0,
        });
        continue;
      }

      // 3. Check Cross-Platform Fuzzy Similarity
      let isFuzzyMatched = false;
      for (const candidate of poolForFuzzy) {
        const sim = this.calculateSimilarity(job, candidate);
        if (sim >= fuzzyThreshold) {
          duplicates.push({
            duplicate: job,
            canonicalJobId: candidate.id || candidate.externalId,
            reason: 'fuzzy_cross_platform',
            similarityScore: sim,
          });
          isFuzzyMatched = true;
          break;
        }
      }

      if (!isFuzzyMatched) {
        uniqueJobs.push(job);
        const assignedId = job.id || job.externalId;
        exactExternalMap.set(externalKey, assignedId);
        if (urlKey) exactUrlMap.set(urlKey, assignedId);
        poolForFuzzy.push(job);
      }
    }

    return { uniqueJobs, duplicates };
  }

  /**
   * Compute multi-attribute fuzzy similarity between two jobs (0.0 to 1.0).
   */
  calculateSimilarity(jobA: NormalizedJob, jobB: NormalizedJob): number {
    // 1. Company name token match (weight: 0.40)
    const companySim = this.jaccardTokenSimilarity(
      this.normalizeCompany(jobA.companyName),
      this.normalizeCompany(jobB.companyName)
    );

    // If company doesn't match at all, they cannot be duplicate jobs
    if (companySim < 0.5) return 0;

    // 2. Job title token match (weight: 0.40)
    const titleSim = this.jaccardTokenSimilarity(
      this.normalizeTitle(jobA.title),
      this.normalizeTitle(jobB.title)
    );

    if (titleSim < 0.5) return 0;

    // 3. Location match (weight: 0.20)
    let locationSim = 0.5; // neutral if unspecified
    if (jobA.isRemote && jobB.isRemote) {
      locationSim = 1.0;
    } else if (jobA.location && jobB.location) {
      locationSim = this.jaccardTokenSimilarity(
        jobA.location.toLowerCase(),
        jobB.location.toLowerCase()
      );
    }

    const total = companySim * 0.45 + titleSim * 0.40 + locationSim * 0.15;
    return Math.round(total * 100) / 100;
  }

  normalizeCompany(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|technologies|software|solutions|group|holdings|co)\b\.?/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\b(sr|sr\.|senior)\b/gi, 'senior')
      .replace(/\b(jr|jr\.|junior)\b/gi, 'junior')
      .replace(/\b(immediate joiner|urgent hiring|hiring now|remote|full time|wfh)\b/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private jaccardTokenSimilarity(strA: string, strB: string): number {
    const tokensA = new Set(strA.split(/\s+/).filter(t => t.length > 1));
    const tokensB = new Set(strB.split(/\s+/).filter(t => t.length > 1));

    if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
    if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersectionCount++;
    }

    const unionCount = new Set([...tokensA, ...tokensB]).size;
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }
}

export const jobDeduplicator = new JobDeduplicator();

