import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
  Eye,
  Sliders,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { agentsAPI } from '../../api/auth';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

interface AgentInfo {
  name: string;
  responsibility: string;
  status: string;
  description: string;
  version: string;
}

interface CustomAgent {
  id: string;
  name: string;
  role: string;
  location?: string;
  min_match_score?: number;
  auto_apply?: number;
  instructions?: string;
  status: string;
}

export const AgentsStudio: React.FC = () => {
  const toast = useToast();
  const [systemAgents, setSystemAgents] = useState<AgentInfo[]>([]);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStep, setTestStep] = useState<number>(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating custom agent
  const [agentName, setAgentName] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Frontend Engineer');
  const [location, setLocation] = useState('Remote');
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [autoApply, setAutoApply] = useState(false);
  const [instructions, setInstructions] = useState('');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await agentsAPI.getAgents();
      setSystemAgents(res.data?.systemAgents || []);
      setCustomAgents(res.data?.customAgents || []);
    } catch (err) {
      console.error('Failed to load agents list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleTestAsUser = async (customRole?: string) => {
    try {
      setTestingAgent(true);
      setTestResult(null);
      setTestStep(1); // Planning

      setTimeout(() => setTestStep(2), 300); // Discovery
      setTimeout(() => setTestStep(3), 600); // Scoring
      setTimeout(() => setTestStep(4), 900); // Draft Prep

      const res = await agentsAPI.testAsUser({
        fastTest: true,
        limitJobs: 2,
        role: customRole || targetRole,
      });

      setTestStep(5); // Complete
      setTestResult(res.data);
      fetchAgents();
    } catch (err: any) {
      console.error('Agent test failed', err);
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Failed to complete agent execution',
      });
    } finally {
      setTestingAgent(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      await agentsAPI.createCustomAgent({
        name: agentName,
        role: targetRole,
        location,
        minMatchScore,
        autoApply,
        instructions,
      });
      setShowCreateModal(false);
      setAgentName('');
      fetchAgents();
      toast.success('Custom agent created!');
    } catch (err) {
      console.error('Failed to create agent', err);
      toast.error('Failed to create custom agent');
    } finally {
      setCreateLoading(false);
    }
  };

  const getAgentIcon = (name: string) => {
    if (name.includes('Discovery')) return <Search size={18} className="text-cyan-400" />;
    if (name.includes('Deduplication')) return <Filter size={18} className="text-blue-400" />;
    if (name.includes('Ranking')) return <Sparkles size={18} className="text-amber-400" />;
    if (name.includes('Browser')) return <Eye size={18} className="text-purple-400" />;
    if (name.includes('Resume')) return <FileText size={18} className="text-indigo-400" />;
    if (name.includes('CoverLetter')) return <FileText size={18} className="text-rose-400" />;
    if (name.includes('Review')) return <ShieldCheck size={18} className="text-emerald-400" />;
    return <Bot size={18} className="text-indigo-400" />;
  };

  return (
    <div className="content fade-in space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-gray-200">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Bot size={20} />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Agents Studio</h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              Active Network (11/11 Healthy)
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Create, configure, and execute autonomous AI agents for job discovery and application workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleTestAsUser()}
            disabled={testingAgent}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            <Zap size={14} className={testingAgent ? 'animate-spin' : ''} />
            <span>{testingAgent ? 'Running Pipeline...' : 'Run Agent Pipeline'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Custom Agent</span>
          </button>
        </div>
      </div>

      {/* Live Stepper when running test */}
      {testingAgent && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-indigo-400" />
              Executing Multi-Agent Workflow as Candidate...
            </span>
            <span className="text-[11px] font-mono text-gray-400">Phase {testStep} of 5</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className={`p-2.5 rounded-lg border ${testStep >= 1 ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-gray-500'}`}>
              <div className="font-semibold">1. Search Plan</div>
              <div className="text-[10px] text-gray-400">Role & Location</div>
            </div>
            <div className={`p-2.5 rounded-lg border ${testStep >= 2 ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-gray-500'}`}>
              <div className="font-semibold">2. Discovery</div>
              <div className="text-[10px] text-gray-400">Scrape & Normalize</div>
            </div>
            <div className={`p-2.5 rounded-lg border ${testStep >= 3 ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-gray-500'}`}>
              <div className="font-semibold">3. AI Matching</div>
              <div className="text-[10px] text-gray-400">ATS Scoring & Rank</div>
            </div>
            <div className={`p-2.5 rounded-lg border ${testStep >= 4 ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300' : 'bg-slate-950/40 border-slate-800 text-gray-500'}`}>
              <div className="font-semibold">4. Cover Letter</div>
              <div className="text-[10px] text-gray-400">Tailored Synthesis</div>
            </div>
            <div className={`p-2.5 rounded-lg border ${testStep >= 5 ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-gray-500'}`}>
              <div className="font-semibold">5. Review Queue</div>
              <div className="text-[10px] text-gray-400">Human Approval Draft</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Execution Result Banner */}
      {testResult && (
        <div className={`p-4 rounded-xl border shadow-lg ${testResult.success ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-bold text-white">{testResult.message}</h4>
                {testResult.summary && (
                  <p className="text-[11px] text-gray-300 mt-1">
                    Workflow <span className="font-mono text-indigo-300">{testResult.summary.workflowId}</span> finished in{' '}
                    <span className="font-semibold text-white">{testResult.summary.durationMs}ms</span> •{' '}
                    Discovered: <span className="text-white font-medium">{testResult.summary.jobsDiscovered}</span> •{' '}
                    Ranked: <span className="text-white font-medium">{testResult.summary.jobsRanked}</span> •{' '}
                    Drafts Queued: <span className="text-emerald-300 font-medium">{testResult.summary.draftsQueuedForReview}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/review-queue"
                className="text-xs px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                View Review Queue
              </Link>
              <button
                onClick={() => setTestResult(null)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Agents Section (if any created) */}
      {customAgents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders size={16} className="text-indigo-400" />
              Candidate Custom Agents ({customAgents.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customAgents.map((agent) => (
              <div
                key={agent.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                        <Bot size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-[170px]">{agent.name}</h4>
                        <span className="text-[10px] text-indigo-400 font-medium">{agent.role}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {agent.status || 'Ready'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-400 my-2">
                    <div className="flex justify-between">
                      <span>Target Location:</span>
                      <span className="text-gray-200 font-medium">{agent.location || 'Remote'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Match Score:</span>
                      <span className="text-amber-300 font-medium">{agent.min_match_score || 80}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">Custom Runner</span>
                  <button
                    onClick={() => handleTestAsUser(agent.role)}
                    disabled={testingAgent}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <Play size={10} />
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Autonomous Agent Network Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bot size={16} className="text-indigo-400" />
            Core Autonomous Agent Network ({systemAgents.length})
          </h3>
          <span className="text-xs text-gray-400">Contract-first execution pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {systemAgents.map((agent) => (
            <div
              key={agent.name}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getAgentIcon(agent.name)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {agent.status}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white tracking-tight">{agent.name}</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-gray-500">
                <span className="font-mono">{agent.responsibility.replace(/_/g, ' ')}</span>
                <span className="text-indigo-400 font-semibold">v{agent.version}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Custom Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot size={18} className="text-indigo-400" />
                Configure Custom Candidate Agent
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote Lead Scout"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Target Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full Stack Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Min Match Score</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Custom Directives / Prompts</label>
                <textarea
                  rows={2}
                  placeholder="Focus on React 18, Next.js, and TypeScript roles at venture-backed startups."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoApply"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="autoApply" className="text-gray-300 text-xs">
                  Auto-queue applications directly for Human Review
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
                >
                  {createLoading ? 'Deploying...' : 'Save & Deploy Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsStudio;
