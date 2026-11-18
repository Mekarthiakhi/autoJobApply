import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Download } from 'lucide-react';
import CompaniesTable, { Company } from './CompaniesTable';
import AIDiscoverModal from './AIDiscoverModal';
import { jobsAPI, applicationsAPI } from '../../api/auth';

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

const Companies: React.FC = () => {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applicationsThisWeek, setApplicationsThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsRes, appsRes] = await Promise.all([
        jobsAPI.getJobs(200).catch(() => ({ data: [] })),
        applicationsAPI.getApplications().catch(() => ({ data: [] })),
      ]);

      const rawJobs = Array.isArray(jobsRes.data)
        ? jobsRes.data
        : Array.isArray(jobsRes.data?.jobs)
        ? jobsRes.data.jobs
        : [];
      const rawApps = Array.isArray(appsRes.data) ? appsRes.data : [];

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weeklyApps = rawApps.filter((a: any) => {
        const ts = new Date(a.applied_at || a.created_at || 0).getTime();
        return ts >= sevenDaysAgo;
      }).length;
      setApplicationsThisWeek(weeklyApps);

      const companyMap = new Map<
        string,
        {
          name: string;
          industry: string;
          roles: number;
          scores: number[];
          lastAppliedTs: number;
          location: string;
          hasActiveApp: boolean;
        }
      >();

      for (const job of rawJobs) {
        const name = (job.company_name || 'Unknown Company').trim();
        const key = name.toLowerCase();
        const entry = companyMap.get(key) || {
          name,
          industry: job.source ? `Source: ${job.source}` : 'Technology',
          roles: 0,
          scores: [] as number[],
          lastAppliedTs: 0,
          location: job.location || 'Remote',
          hasActiveApp: false,
        };
        entry.roles += 1;
        if (typeof job.match_score === 'number') {
          entry.scores.push(job.match_score);
        }
        if (job.location && entry.location === 'Remote') {
          entry.location = job.location;
        }
        companyMap.set(key, entry);
      }

      for (const app of rawApps) {
        const name = (app.company_name || 'Unknown Company').trim();
        const key = name.toLowerCase();
        const ts = new Date(app.applied_at || app.created_at || 0).getTime();
        const entry = companyMap.get(key) || {
          name,
          industry: 'Applied',
          roles: 1,
          scores: [] as number[],
          lastAppliedTs: 0,
          location: app.location || 'Remote',
          hasActiveApp: false,
        };
        if (ts > entry.lastAppliedTs) entry.lastAppliedTs = ts;
        if (!['rejected', 'withdrawn'].includes((app.status || '').toLowerCase())) {
          entry.hasActiveApp = true;
        }
        companyMap.set(key, entry);
      }

      const dynamicCompanies: Company[] = Array.from(companyMap.entries()).map(([key, item]) => ({
        id: key,
        name: item.name,
        industry: item.industry,
        roles: item.roles,
        lastApplied: item.lastAppliedTs ? formatRelativeDate(new Date(item.lastAppliedTs).toISOString()) : 'Not applied yet',
        fitScore:
          item.scores.length > 0
            ? Math.round(item.scores.reduce((sum, s) => sum + s, 0) / item.scores.length)
            : 0,
        status: item.hasActiveApp || item.roles > 0 ? 'active' : 'paused',
        location: item.location,
      }));

      setCompanies(dynamicCompanies);
    } catch (err) {
      console.error('Failed to load companies', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const activeTargets = companies.filter((c) => c.status === 'active').length;
  const scoredCompanies = companies.filter((c) => c.fitScore > 0);
  const averageFitScore =
    scoredCompanies.length > 0
      ? Math.round(scoredCompanies.reduce((sum, c) => sum + c.fitScore, 0) / scoredCompanies.length)
      : 0;

  const handleExportCsv = () => {
    const headers = ['Company', 'Industry', 'Roles', 'Fit Score', 'Last Applied', 'Status', 'Location'];
    const rows = companies.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.industry.replace(/"/g, '""')}"`,
      c.roles,
      `${c.fitScore}%`,
      `"${c.lastApplied}"`,
      c.status,
      `"${c.location.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'target_companies.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Target Companies
          </h1>
          <p className="text-gray-400 text-sm">
            Dynamically aggregated from your discovered jobs and submitted applications
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCsv}
            disabled={companies.length === 0}
            className="neumo-btn inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="neumo-btn inline-flex items-center gap-2 text-sm bg-accent-primary text-white shadow-glow-blue hover:shadow-glow-blue"
          >
            <Sparkles size={16} />
            Discover with AI
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-primary/10">
            <Plus className="w-6 h-6 text-accent-primary" />
          </div>
          <h3 className="kpi-label">Total Companies</h3>
          <div className="kpi-value text-3xl mt-2">{companies.length}</div>
          <p className="text-xs text-gray-500 mt-2">In your database</p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <span className="text-xl">🎯</span>
          </div>
          <h3 className="kpi-label">Active Targets</h3>
          <div className="kpi-value text-3xl mt-2">{activeTargets}</div>
          <p className="text-xs text-gray-500 mt-2">With open roles or applications</p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <span className="text-xl">📊</span>
          </div>
          <h3 className="kpi-label">Avg Fit Score</h3>
          <div className="kpi-value text-3xl mt-2">{averageFitScore > 0 ? `${averageFitScore}%` : '—'}</div>
          <p className="text-xs text-gray-500 mt-2">
            {scoredCompanies.length > 0 ? `Across ${scoredCompanies.length} scored companies` : 'No scored jobs yet'}
          </p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-info/10">
            <span className="text-xl">📬</span>
          </div>
          <h3 className="kpi-label">Applications</h3>
          <div className="kpi-value text-3xl mt-2">{applicationsThisWeek}</div>
          <p className="text-xs text-gray-500 mt-2">Submitted in last 7 days</p>
        </div>
      </div>

      {/* Companies Table */}
      <div>
        <h2 className="text-xl font-display font-semibold text-white mb-4">
          All Companies
        </h2>
        {loading ? (
          <div className="neumo-card p-12 text-center text-gray-400 text-sm">
            Loading companies from your job database...
          </div>
        ) : (
          <CompaniesTable companies={companies} />
        )}
      </div>

      {/* AI Discover Modal */}
      <AIDiscoverModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onDiscover={async () => {
          setIsAIModalOpen(false);
          await loadCompanies();
        }}
      />
    </div>
  );
};

export default Companies;
