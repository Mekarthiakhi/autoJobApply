import React, { useState, useEffect, useCallback } from 'react';
import { activityLogsAPI, exportsAPI } from '../../api/auth';
import { Download, CheckCircle, XCircle, Info, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  job_title: string;
  company_name: string;
  status: string;
  details: string | Record<string, unknown>;
  created_at: string;
}

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit: 25 };
      if (actionFilter) params.action = actionFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await activityLogsAPI.getLogs(params);
      if (response.data && response.data.logs) {
        setLogs(response.data.logs);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.total || 0);
        }
      } else if (Array.isArray(response.data)) {
        setLogs(response.data);
        setTotalPages(1);
        setTotalCount(response.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px] font-mono">
            <CheckCircle size={12} /> Success
          </span>
        );
      case 'failed':
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded text-[11px] font-mono">
            <XCircle size={12} /> Failed
          </span>
        );
      case 'warning':
      case 'challenge':
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded text-[11px] font-mono">
            <AlertTriangle size={12} /> Challenge
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded text-[11px] font-mono">
            <Info size={12} /> {status}
          </span>
        );
    }
  };

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System & Multi-Agent Activity Logs</h1>
          <p className="text-gray-400 text-sm mt-1">
            Audit-grade operational event history, scraper execution, and browser safety events
          </p>
        </div>
        <a
          href={exportsAPI.getActivityLogsCsvUrl()}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary flex items-center gap-2 text-xs px-3.5 py-2 rounded-lg"
        >
          <Download size={15} /> Export Audit CSV
        </a>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-400 font-semibold flex items-center gap-1">
            <Filter size={14} /> Filter:
          </span>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 text-gray-200 rounded-lg px-2.5 py-1.5 border border-gray-700"
          >
            <option value="">All Actions</option>
            <option value="job_discovery">Job Discovery</option>
            <option value="draft_generated">Draft Generated</option>
            <option value="candidate_verification">Candidate Verification</option>
            <option value="application_approved">Application Approved</option>
            <option value="submission_executed">Submission Executed</option>
            <option value="anti_bot_challenge_detected">Challenge Detected</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 text-gray-200 rounded-lg px-2.5 py-1.5 border border-gray-700"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed / Error</option>
            <option value="warning">Warning / Challenge</option>
          </select>
        </div>

        {totalCount > 0 && (
          <span className="text-gray-400">
            Showing {logs.length} of {totalCount} records
          </span>
        )}
      </div>

      {/* Table */}
      <div className="glass-dark rounded-xl overflow-hidden border border-gray-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 bg-gray-950/40">
                <th className="p-3.5 font-semibold uppercase tracking-wider">Timestamp</th>
                <th className="p-3.5 font-semibold uppercase tracking-wider">Action</th>
                <th className="p-3.5 font-semibold uppercase tracking-wider">Job / Company</th>
                <th className="p-3.5 font-semibold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-semibold uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Loading activity audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No activity logs matching the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-medium text-white">
                          <span className="bg-gray-800 text-gray-300 text-[11px] px-2 py-0.5 rounded font-mono">
                            {formatAction(log.action)}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-300">
                          {log.job_title ? (
                            <div>
                              <div className="font-semibold text-white">{log.job_title}</div>
                              <div className="text-gray-400 text-[11px]">{log.company_name}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">System Scope</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="p-3.5 text-gray-400 max-w-xs truncate">
                          {detailsStr ? (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
                            >
                              {isExpanded ? 'Hide Payload' : 'View Payload'}
                            </button>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && detailsStr && (
                        <tr className="bg-gray-950/80">
                          <td colSpan={5} className="p-3.5 border-t border-gray-800">
                            <pre className="text-[11px] font-mono text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {typeof log.details === 'object'
                                ? JSON.stringify(log.details, null, 2)
                                : log.details}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
            <div>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
