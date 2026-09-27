import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { examsApi } from '../../api/client';
import { 
  Users, 
  Layers, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Award, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Upload,
  Calendar,
  Sparkles,
  ShieldCheck,
  Activity,
  HardDrive,
  Printer
} from 'lucide-react';
import { Badge } from '../../components/Badge';

export function EducatorDashboard({ onNavigate }) {
  const { user, institution } = useAuth();
  const [stats, setStats] = useState(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, usageData] = await Promise.allSettled([
        examsApi.getDashboardStats(),
        examsApi.getSubscriptionUsage()
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        console.error('Failed to load dashboard stats:', statsData.reason);
      }

      if (usageData.status === 'fulfilled') {
        setSubscriptionUsage(usageData.value);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not fetch institute dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Syncing command center telemetry & quotas...</p>
        </div>
      </div>
    );
  }

  const instName = stats?.institution?.name || institution?.name || 'Apex National Institute';
  const tagline = stats?.institution?.tagline || institution?.tagline || 'Online Examination Infrastructure';
  const tierName = subscriptionUsage?.tier?.name || stats?.institution?.tier || 'INSTITUTE_PLUS';

  // Compute Quota percentages
  const studentLimit = subscriptionUsage?.usage?.students?.limit || 500;
  const currentStudents = subscriptionUsage?.usage?.students?.current || stats?.total_students || 0;
  const studentPercent = Math.min(100, Math.round((currentStudents / studentLimit) * 100));

  const examLimit = subscriptionUsage?.usage?.exams_this_month?.limit || 50;
  const currentExamsMonth = subscriptionUsage?.usage?.exams_this_month?.current || stats?.active_exams || 0;
  const examPercent = Math.min(100, Math.round((currentExamsMonth / examLimit) * 100));

  const questionLimit = subscriptionUsage?.usage?.questions?.limit || 10000;
  const currentQuestions = subscriptionUsage?.usage?.questions?.current || stats?.total_questions || 0;
  const questionPercent = Math.min(100, Math.round((currentQuestions / questionLimit) * 100));

  return (
    <div className="educator-dashboard flex flex-col gap-6 font-body-md text-on-surface">
      {/* Institute Ambient Hero & Controller Identity Banner */}
      <section className="relative w-full overflow-hidden bg-surface-container-low rounded-2xl p-6 lg:p-8 border border-outline-variant shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm uppercase tracking-wider font-bold">
                Institutional Command Hub
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                {tierName.replace('_', ' ')}
              </span>
              <span className="font-code-formula text-xs text-on-surface-variant font-semibold bg-surface-container px-2 py-0.5 rounded">
                Code: {stats?.institution?.code || institution?.code || 'INST-01'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mt-1">
              {instName}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
              {tagline}
            </p>
          </div>

          {/* Quick Center Telemetry Badges */}
          <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm shrink-0">
            <div className="flex items-center gap-3 pr-4 border-r border-outline-variant">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <Activity size={22} />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">Center Health</span>
                <span className="font-headline-sm text-sm text-secondary font-bold">Operational 100%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-container/50 flex items-center justify-center text-secondary">
                <ShieldCheck size={22} />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold">Proctor Engine</span>
                <span className="font-code-formula text-sm text-on-surface font-semibold">Active & Synced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations Launcher */}
        <div className="relative z-10 mt-6 pt-4 border-t border-outline-variant/60 flex flex-wrap items-center gap-3">
          <button 
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm"
            onClick={() => onNavigate('questions')}
          >
            <PlusCircle size={18} />
            <span>+ Create Question</span>
          </button>
          <button 
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors border border-outline-variant shadow-sm"
            onClick={() => onNavigate('exams')}
          >
            <Calendar size={18} className="text-primary" />
            <span>Schedule Exam</span>
          </button>
          <button 
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors border border-outline-variant shadow-sm"
            onClick={() => onNavigate('students')}
          >
            <Users size={18} className="text-secondary" />
            <span>Enrol Students</span>
          </button>
          <button 
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors border border-outline-variant shadow-sm"
            onClick={() => onNavigate('branding')}
          >
            <Sparkles size={18} className="text-amber-600" />
            <span>Institute Branding</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2 font-semibold">
          <AlertCircle size={20} className="shrink-0 text-error" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metrics Section (4 academic performance cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Total Enrolled Students */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[12px] uppercase font-bold text-on-surface-variant tracking-wider">Enrolled Students</span>
              <span className="font-display text-2xl font-black text-on-surface mt-1">{stats?.total_students ?? 0}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Across {stats?.total_batches ?? 0} active batches</span>
            <span className="font-semibold text-secondary">Active</span>
          </div>
        </div>

        {/* Metric 2: Question Bank Items */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[12px] uppercase font-bold text-on-surface-variant tracking-wider">Question Bank</span>
              <span className="font-display text-2xl font-black text-on-surface mt-1">{stats?.total_questions ?? 0}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
              <HelpCircle size={20} />
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>MCQs, MSQs & Numerical items</span>
            <span className="font-code-formula text-primary font-semibold">Ready</span>
          </div>
        </div>

        {/* Metric 3: Active Live Tests */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[12px] uppercase font-bold text-on-surface-variant tracking-wider">Live Assessments</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-display text-2xl font-black text-secondary">{stats?.active_exams ?? 0}</span>
                <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-bold uppercase">
                  Active
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>{stats?.total_exams ?? 0} total scheduled</span>
            <span className="font-semibold text-secondary">CBT Synced</span>
          </div>
        </div>

        {/* Metric 4: Auto-Evaluated Submissions Today */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[12px] uppercase font-bold text-on-surface-variant tracking-wider">Submissions Today</span>
              <span className="font-display text-2xl font-black text-amber-700 mt-1">{stats?.today_submissions ?? 0}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Rank & Percentile Computed</span>
            <span className="font-semibold text-amber-700">Real-time</span>
          </div>
        </div>
      </section>

      {/* Subscription Quota Utilization Bar (Tenant protection) */}
      <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-primary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wider">
              Tenant Quota & Subscription Utilization
            </h3>
          </div>
          <span className="font-label-sm text-xs text-on-surface-variant font-medium">
            Tier: <strong className="text-primary">{tierName}</strong> (Max limits enforced)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Quota */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface font-semibold">Student Roster</span>
              <span className="font-code-formula text-on-surface-variant">{currentStudents} / {studentLimit} ({studentPercent}%)</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${studentPercent > 90 ? 'bg-error' : studentPercent > 70 ? 'bg-amber-500' : 'bg-secondary'}`}
                style={{ width: `${studentPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Monthly Exams Quota */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface font-semibold">Exams This Month</span>
              <span className="font-code-formula text-on-surface-variant">{currentExamsMonth} / {examLimit} ({examPercent}%)</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${examPercent > 90 ? 'bg-error' : 'bg-primary'}`}
                style={{ width: `${examPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Questions Bank Quota */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface font-semibold">Question Bank Items</span>
              <span className="font-code-formula text-on-surface-variant">{currentQuestions} / {questionLimit} ({questionPercent}%)</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${questionPercent > 90 ? 'bg-error' : 'bg-tertiary'}`}
                style={{ width: `${questionPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Launchers & Recent Live Submissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launchers List */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-headline-sm text-sm font-bold mb-4 text-on-surface flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp size={18} className="text-primary" />
              Operational Modules
            </h3>
            
            <div className="flex flex-col gap-2.5">
              <button 
                type="button"
                className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center gap-3 transition-colors text-left"
                onClick={() => onNavigate('questions')}
              >
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <PlusCircle size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-md text-sm font-bold text-on-surface truncate">Question Bank Studio</span>
                  <span className="text-xs text-on-surface-variant truncate">Create questions or bulk CSV import</span>
                </div>
                <ArrowUpRight size={16} className="text-on-surface-variant shrink-0" />
              </button>

              <button 
                type="button"
                className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center gap-3 transition-colors text-left"
                onClick={() => onNavigate('exams')}
              >
                <div className="w-9 h-9 rounded-lg bg-secondary-container/50 flex items-center justify-center text-secondary shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-md text-sm font-bold text-on-surface truncate">Exam Scheduler & Live CBT Hub</span>
                  <span className="text-xs text-on-surface-variant truncate">Schedule exams, proctor & publish ranks</span>
                </div>
                <ArrowUpRight size={16} className="text-on-surface-variant shrink-0" />
              </button>

              <button 
                type="button"
                className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center gap-3 transition-colors text-left"
                onClick={() => onNavigate('students')}
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary shrink-0">
                  <Users size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-md text-sm font-bold text-on-surface truncate">Student Roster & Batches</span>
                  <span className="text-xs text-on-surface-variant truncate">Manage students, cohorts and passwords</span>
                </div>
                <ArrowUpRight size={16} className="text-on-surface-variant shrink-0" />
              </button>

              <button 
                type="button"
                className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center gap-3 transition-colors text-left"
                onClick={() => onNavigate('branding')}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200 shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-md text-sm font-bold text-on-surface truncate">Custom Institute Branding</span>
                  <span className="text-xs text-on-surface-variant truncate">Institute logo, custom colors & portal theme</span>
                </div>
                <ArrowUpRight size={16} className="text-on-surface-variant shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Live Submissions Feed */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2 uppercase tracking-wider">
              <Clock size={18} className="text-secondary" />
              Recent Examination Submissions
            </h3>
            <button 
              type="button"
              className="text-xs font-bold text-primary hover:underline"
              onClick={() => onNavigate('exams')}
            >
              View All Scheduled Tests →
            </button>
          </div>

          {stats?.recent_attempts && stats.recent_attempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Assessment</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time Spent</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {stats.recent_attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-on-surface">{att.student_name}</td>
                      <td className="py-2.5 px-3 text-on-surface-variant">{att.exam_title}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-primary font-code-formula">{att.score} pts</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold text-[10px] uppercase">
                          {att.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-code-formula text-on-surface-variant">
                        {Math.floor(att.time_spent_seconds / 60)}m {att.time_spent_seconds % 60}s
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a 
                          href={examsApi.getPrintableScorecardUrl(att.exam || att.exam_id || 1, att.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          title="Print official scorecard"
                        >
                          <Printer size={13} />
                          <span>Scorecard</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-on-surface-variant">
              <CheckCircle2 size={36} className="mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-semibold text-sm">No exam submissions recorded yet today.</p>
              <p className="text-xs text-on-surface-variant mt-1">When students complete mock tests, evaluations appear here automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
