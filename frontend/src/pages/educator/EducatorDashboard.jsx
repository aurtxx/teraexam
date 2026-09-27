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
  Sparkles
} from 'lucide-react';
import { Badge } from '../../components/Badge';

export function EducatorDashboard({ onNavigate }) {
  const { user, institution } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await examsApi.getDashboardStats();
      setStats(data);
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
      <div className="flex justify-center items-center py-12">
        <div className="loader-inner text-center">
          <div className="spinner mb-3"></div>
          <p className="text-muted text-sm">Loading institute analytics & operations...</p>
        </div>
      </div>
    );
  }

  const instName = stats?.institution?.name || institution?.name || 'Educator Institute';
  const tagline = stats?.institution?.tagline || institution?.tagline || 'Online Examination Infrastructure';

  return (
    <div className="educator-dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner mb-6">
        <div className="banner-content">
          <div className="flex items-center gap-2 mb-1">
            <span className="institute-badge-pill">
              <Sparkles size={14} className="mr-1 inline" />
              {stats?.institution?.tier || 'INSTITUTE_PLUS'} TIER
            </span>
            <span className="text-xs text-white/80">Code: {stats?.institution?.code || 'INST'}</span>
          </div>
          <h2 className="banner-title">{instName}</h2>
          <p className="banner-subtitle">{tagline}</p>
        </div>
        <div className="banner-actions">
          <button 
            className="btn btn-white font-semibold"
            onClick={() => onNavigate('exams')}
          >
            <Calendar size={16} className="mr-2" />
            Schedule Exam
          </button>
          <button 
            className="btn btn-outline-white"
            onClick={() => onNavigate('questions')}
          >
            <PlusCircle size={16} className="mr-2" />
            Add Question
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Enrolled Students</span>
            <div className="stat-icon-wrapper bg-blue-50 text-blue-600">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.total_students ?? 0}</div>
          <div className="stat-footer text-muted text-xs">
            Across {stats?.total_batches ?? 0} active batches
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Question Bank</span>
            <div className="stat-icon-wrapper bg-purple-50 text-purple-600">
              <HelpCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{stats?.total_questions ?? 0}</div>
          <div className="stat-footer text-muted text-xs">
            MCQs, MSQs, and Numerical items
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Active / Live Tests</span>
            <div className="stat-icon-wrapper bg-emerald-50 text-emerald-600">
              <FileText size={20} />
            </div>
          </div>
          <div className="stat-value text-emerald-600">{stats?.active_exams ?? 0}</div>
          <div className="stat-footer text-muted text-xs">
            {stats?.total_exams ?? 0} total scheduled
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Submissions Today</span>
            <div className="stat-icon-wrapper bg-amber-50 text-amber-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value text-amber-600">{stats?.today_submissions ?? 0}</div>
          <div className="stat-footer text-muted text-xs">
            Auto-evaluated & ranked
          </div>
        </div>
      </div>

      {/* Quick Operations & Recent Attempts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Quick Launchers */}
        <div className="card p-5 col-span-1">
          <h3 className="text-base font-semibold mb-4 text-main flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo" />
            Quick Operations
          </h3>
          <div className="flex flex-col gap-3">
            <button 
              className="quick-action-btn"
              onClick={() => onNavigate('questions')}
            >
              <div className="quick-action-icon bg-indigo-50 text-indigo">
                <PlusCircle size={20} />
              </div>
              <div className="quick-action-text text-left">
                <div className="font-semibold text-sm">Question Bank Manager</div>
                <div className="text-xs text-muted">Create questions or import via CSV</div>
              </div>
              <ArrowUpRight size={16} className="text-muted ml-auto" />
            </button>

            <button 
              className="quick-action-btn"
              onClick={() => onNavigate('exams')}
            >
              <div className="quick-action-icon bg-emerald-50 text-emerald-600">
                <Calendar size={20} />
              </div>
              <div className="quick-action-text text-left">
                <div className="font-semibold text-sm">Exam Scheduling & Live Hub</div>
                <div className="text-xs text-muted">Create mock tests and publish results</div>
              </div>
              <ArrowUpRight size={16} className="text-muted ml-auto" />
            </button>

            <button 
              className="quick-action-btn"
              onClick={() => onNavigate('students')}
            >
              <div className="quick-action-icon bg-blue-50 text-blue-600">
                <Users size={20} />
              </div>
              <div className="quick-action-text text-left">
                <div className="font-semibold text-sm">Student Roster & Batches</div>
                <div className="text-xs text-muted">Enroll students or bulk import from CSV</div>
              </div>
              <ArrowUpRight size={16} className="text-muted ml-auto" />
            </button>

            <button 
              className="quick-action-btn"
              onClick={() => onNavigate('branding')}
            >
              <div className="quick-action-icon bg-purple-50 text-purple-600">
                <Sparkles size={20} />
              </div>
              <div className="quick-action-text text-left">
                <div className="font-semibold text-sm">Custom Institute Branding</div>
                <div className="text-xs text-muted">Logo, theme color & student portal look</div>
              </div>
              <ArrowUpRight size={16} className="text-muted ml-auto" />
            </button>
          </div>
        </div>

        {/* Recent Submissions Feed */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-main flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Recent Live Submissions
            </h3>
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => onNavigate('exams')}
            >
              View All Exams
            </button>
          </div>

          {stats?.recent_attempts && stats.recent_attempts.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Time Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_attempts.map((att) => (
                    <tr key={att.id}>
                      <td className="font-medium text-main">{att.student_name}</td>
                      <td className="text-muted text-sm">{att.exam_title}</td>
                      <td>
                        <span className="font-bold text-indigo">{att.score} pts</span>
                      </td>
                      <td>
                        <Badge variant={att.status === 'EVALUATED' || att.status === 'SUBMITTED' ? 'success' : 'warning'} size="xs">
                          {att.status}
                        </Badge>
                      </td>
                      <td className="text-muted text-sm font-mono">
                        {Math.floor(att.time_spent_seconds / 60)}m {att.time_spent_seconds % 60}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state py-8 text-center">
              <CheckCircle2 size={36} className="text-muted mx-auto mb-2 opacity-50" />
              <p className="text-muted text-sm">No exam submissions recorded yet today.</p>
              <p className="text-xs text-muted mt-1">When students complete tests, their real-time evaluation will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
