import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, TrendingUp, FileText, CheckCircle2 } from 'lucide-react';
import ResumeSidebar from './ResumeSidebar';
import ResumeVariant from './ResumeVariant';
import SkillsGapAnalysis, { Skill } from './SkillsGapAnalysis';
import { resumeAPI, resumeVersionsAPI, jobsAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';

interface Variant {
  id: string;
  title: string;
  jobTitle: string;
  company?: string;
  matchScore: number;
  improvement: number;
  createdAt: string;
  keywordsAdded: string[];
  sectionsOptimized: string[];
  metrics: {
    originalMatch: number;
    improvedMatch: number;
    keywordsAdded: number;
    sectionsOptimized: number;
  };
  isPinned?: boolean;
}

function parseJsonArray(val: any): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

const ResumeManager: React.FC = () => {
  const toast = useToast();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [baseResume, setBaseResume] = useState<any>(null);
  const [currentSkills, setCurrentSkills] = useState<Skill[]>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<Skill[]>([]);
  const [targetRole, setTargetRole] = useState<string>('Target Role');
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'variants' | 'skills'>('variants');
  const [sortBy, setSortBy] = useState<'recent' | 'match' | 'improvement'>('recent');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumeData = useCallback(async () => {
    try {
      setLoading(true);
      const [resumeRes, versionsRes, jobsRes] = await Promise.all([
        resumeAPI.getResume().catch(() => ({ data: null })),
        resumeVersionsAPI.getVersions().catch(() => ({ data: [] })),
        jobsAPI.getJobs(100).catch(() => ({ data: [] })),
      ]);

      const resume = resumeRes.data;
      setBaseResume(resume);

      const rawVersions = Array.isArray(versionsRes.data) ? versionsRes.data : [];
      const rawJobs = Array.isArray(jobsRes.data)
        ? jobsRes.data
        : Array.isArray(jobsRes.data?.jobs)
        ? jobsRes.data.jobs
        : [];

      const avgJobScore =
        rawJobs.length > 0
          ? Math.round(
              rawJobs.reduce((sum: number, j: any) => sum + (typeof j.match_score === 'number' ? j.match_score : 0), 0) /
                Math.max(1, rawJobs.filter((j: any) => typeof j.match_score === 'number').length)
            )
          : 0;

      const mappedVariants: Variant[] = rawVersions.map((v: any) => {
        const skills = parseJsonArray(v.skills || resume?.skills);
        const keywords = parseJsonArray(v.keywords || resume?.keywords);
        const allKeywords = Array.from(new Set([...skills, ...keywords])).slice(0, 8);
        const score = typeof v.match_score === 'number' ? Math.round(v.match_score) : avgJobScore;
        const label = v.label || v.file_name || 'Resume Version';
        const parts = label.split(' at ');
        const jobTitle = parts[0]?.replace(/^Tailored:\s*/i, '') || label;
        const company = parts[1] || undefined;

        return {
          id: v.id,
          title: label,
          jobTitle,
          company,
          matchScore: score,
          improvement: v.is_default ? 0 : Math.max(0, score - Math.max(0, avgJobScore - 5)),
          createdAt: v.updated_at || v.created_at
            ? `Updated ${new Date(v.updated_at || v.created_at).toLocaleDateString()}`
            : 'Recently saved',
          keywordsAdded: allKeywords,
          sectionsOptimized: ['Summary', 'Skills', 'Experience'],
          metrics: {
            originalMatch: Math.max(0, score - 5),
            improvedMatch: score,
            keywordsAdded: allKeywords.length,
            sectionsOptimized: 3,
          },
          isPinned: Boolean(v.is_default),
        };
      });

      setVariants(mappedVariants);

      // Compute dynamic current skills & gap skills from real resume + discovered jobs
      const resumeSkillsList = Array.from(
        new Set([...parseJsonArray(resume?.skills), ...parseJsonArray(resume?.keywords)])
      );
      const resumeSkillLower = new Set(resumeSkillsList.map((s) => s.toLowerCase()));

      setCurrentSkills(
        resumeSkillsList.slice(0, 12).map((name, idx) => ({
          name,
          proficiency: Math.max(70, 95 - idx * 2),
          relevance: 90,
          priority: idx < 4 ? 'high' : 'medium',
        }))
      );

      // Extract frequently required keywords from discovered jobs that aren't yet on the resume
      const missingFreq = new Map<string, number>();
      if (rawJobs.length > 0 && rawJobs[0]?.title) {
        setTargetRole(rawJobs[0].title);
      }
      for (const job of rawJobs) {
        const reqList = parseJsonArray(job.requirements);
        for (const req of reqList) {
          const clean = req.trim();
          if (clean.length >= 2 && clean.length <= 40 && !resumeSkillLower.has(clean.toLowerCase())) {
            missingFreq.set(clean, (missingFreq.get(clean) || 0) + 1);
          }
        }
      }

      const gapSkills: Skill[] = Array.from(missingFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({
          name,
          proficiency: 0,
          relevance: Math.min(100, 65 + count * 10),
          priority: count >= 2 ? 'high' : 'medium',
        }));

      setRecommendedSkills(gapSkills);
    } catch (error) {
      console.error('Failed to load resume data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumeData();
  }, [loadResumeData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      await resumeAPI.uploadResume(formData);
      await loadResumeData();
      toast.success(`"${file.name}" uploaded and parsed successfully!`);
    } catch (error: any) {
      console.error('Failed to upload resume', error);
      toast.error(error?.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sortedVariants = [...variants].sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    if (sortBy === 'improvement') return b.improvement - a.improvement;
    return 0;
  });

  const pinnedVariants = sortedVariants.filter((v) => v.isPinned);
  const unpinnedVariants = sortedVariants.filter((v) => !v.isPinned);

  const handleDeleteVariant = async (id: string) => {
    try {
      await resumeVersionsAPI.deleteVersion(id);
      setVariants((prev) => prev.filter((v) => v.id !== id));
      toast.success('Resume version deleted.');
    } catch (error) {
      console.error('Failed to delete resume version', error);
      toast.error('Failed to delete resume version');
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await resumeVersionsAPI.setDefault(id);
      setVariants((prev) => prev.map((v) => ({ ...v, isPinned: v.id === id })));
      toast.success('Default resume version updated.');
    } catch (error) {
      console.error('Failed to set default resume version', error);
      toast.error('Failed to update default resume version.');
    }
  };

  const averageMatch =
    variants.length > 0
      ? Math.round(variants.reduce((sum, v) => sum + v.matchScore, 0) / variants.length)
      : 0;

  const totalKeywordsAdded = variants.reduce((sum, v) => sum + v.metrics.keywordsAdded, 0);

  const baseKeywords = parseJsonArray(baseResume?.keywords);
  const baseSkills = parseJsonArray(baseResume?.skills);
  const completionRate =
    currentSkills.length + recommendedSkills.length > 0
      ? Math.round((currentSkills.length / (currentSkills.length + recommendedSkills.length)) * 100)
      : 0;

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Resume Manager
          </h1>
          <p className="text-gray-400 text-sm">
            Upload your resume, manage AI-tailored versions, and inspect real skills gaps
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="neumo-btn inline-flex items-center gap-2 text-sm bg-accent-primary text-white shadow-glow-blue"
        >
          <Plus size={16} />
          {uploading ? 'Uploading...' : 'Upload Base Resume'}
        </button>
      </div>

      {/* Active Uploaded Base Resume Banner */}
      {baseResume && baseResume.file_name && (
        <div className="neumo-card p-5 border border-emerald-500/30 bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Uploaded Base Resume
                </span>
                <span className="text-xs text-gray-400">
                  · {baseResume.uploaded_at ? new Date(baseResume.uploaded_at).toLocaleString() : 'Active'}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-0.5">{baseResume.file_name}</div>
              {baseSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {baseSkills.slice(0, 10).map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {baseSkills.length > 10 && (
                    <span className="text-[11px] px-2 py-0.5 text-gray-400">
                      +{baseSkills.length - 10} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/resume-builder"
              className="neumo-btn text-xs px-3 py-2 text-indigo-300 hover:text-white"
            >
              Open in Builder
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="neumo-btn text-xs px-3 py-2 text-white"
            >
              Replace File
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-primary/10">
            <FileText className="w-6 h-6 text-accent-primary" />
          </div>
          <h3 className="kpi-label">Resume Variants</h3>
          <div className="kpi-value text-3xl mt-2">{variants.length}</div>
          <p className="text-xs text-gray-500 mt-2">Saved versions in database</p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <TrendingUp className="w-6 h-6 text-accent-success" />
          </div>
          <h3 className="kpi-label">Avg Match Score</h3>
          <div className="kpi-value text-3xl mt-2">{averageMatch > 0 ? `${averageMatch}%` : '—'}</div>
          <p className="text-xs text-gray-500 mt-2">Based on discovered jobs</p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-info/10">
            <Sparkles className="w-6 h-6 text-accent-info" />
          </div>
          <h3 className="kpi-label">Extracted Keywords</h3>
          <div className="kpi-value text-3xl mt-2">{totalKeywordsAdded || baseKeywords.length}</div>
          <p className="text-xs text-gray-500 mt-2">Parsed from your resume</p>
        </div>

        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-warning/10">
            <span className="text-xl">📚</span>
          </div>
          <h3 className="kpi-label">Skills to Add</h3>
          <div className="kpi-value text-3xl mt-2">{recommendedSkills.length}</div>
          <p className="text-xs text-gray-500 mt-2">From job requirements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-neumo-border">
        <button
          onClick={() => setActiveTab('variants')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'variants'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <FileText className="inline mr-2" size={16} />
          Resume Variants ({variants.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'skills'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <span className="inline mr-2">📊</span>
          Skills Gap Analysis
        </button>
      </div>

      {/* Content */}
      {activeTab === 'variants' && (
        <div className="space-y-8">
          {loading ? (
            <div className="neumo-card p-12 text-center text-gray-400 text-sm">
              Loading your resume versions...
            </div>
          ) : variants.length === 0 ? (
            <div className="neumo-card p-12 text-center border border-dashed border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">No resumes uploaded yet</h3>
              <p className="text-sm text-gray-400 mb-6">
                Upload your PDF or DOCX resume to parse your skills, match jobs, and generate tailored resume versions.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="neumo-btn inline-flex items-center gap-2 text-sm bg-accent-primary text-white"
              >
                <Plus size={16} />
                Upload Base Resume
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'recent' ? 'bg-accent-primary text-white shadow-glow-blue' : 'neumo-btn'
                  }`}
                >
                  Most Recent
                </button>
                <button
                  onClick={() => setSortBy('match')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'match' ? 'bg-accent-primary text-white shadow-glow-blue' : 'neumo-btn'
                  }`}
                >
                  Highest Match
                </button>
                <button
                  onClick={() => setSortBy('improvement')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === 'improvement' ? 'bg-accent-primary text-white shadow-glow-blue' : 'neumo-btn'
                  }`}
                >
                  Most Improved
                </button>
              </div>

              {pinnedVariants.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-accent-primary">⭐</span>
                    Default Resume ({pinnedVariants.length})
                  </h2>
                  <div className="space-y-4">
                    {pinnedVariants.map((variant) => (
                      <ResumeVariant
                        key={variant.id}
                        {...variant}
                        isPinned={true}
                        onPin={() => handleTogglePin(variant.id)}
                        onDelete={() => handleDeleteVariant(variant.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unpinnedVariants.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-semibold text-white mb-4">
                    Tailored & Saved Versions ({unpinnedVariants.length})
                  </h2>
                  <div className="space-y-4">
                    {unpinnedVariants.map((variant) => (
                      <ResumeVariant
                        key={variant.id}
                        {...variant}
                        isPinned={false}
                        onPin={() => handleTogglePin(variant.id)}
                        onDelete={() => handleDeleteVariant(variant.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SkillsGapAnalysis
              targetRole={targetRole}
              currentSkills={currentSkills}
              recommendedSkills={recommendedSkills}
              completionRate={completionRate}
            />
          </div>

          <div>
            <ResumeSidebar
              resumeTitle={baseResume?.file_name || 'No base resume uploaded'}
              lastUpdated={
                baseResume?.uploaded_at
                  ? `Uploaded ${new Date(baseResume.uploaded_at).toLocaleDateString()}`
                  : 'Upload a PDF to begin'
              }
              matchScore={averageMatch}
              keywordsCount={baseKeywords.length}
              skillsCount={baseSkills.length}
              experienceSummary={baseResume?.experience ? 'Parsed' : 'Not uploaded'}
              educationSummary={baseResume?.education ? 'Parsed' : 'Not uploaded'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeManager;
