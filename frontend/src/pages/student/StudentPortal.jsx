import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentApi, examsApi } from '../../api/client';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  Play, 
  FileText, 
  Bell, 
  ArrowRight, 
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Printer
} from 'lucide-react';
import { Badge } from '../../components/Badge';

export function StudentPortal({ onStartExam, onViewScorecard }) {
  const { user, institution } = useAuth();
  const [exams, setExams] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [examsRes, annRes, histRes] = await Promise.all([
        studentApi.getAvailableExams(),
        examsApi.listAnnouncements(),
        studentApi.getHistory()
      ]);
      setExams(examsRes || []);
      setAnnouncements(annRes.results || annRes || []);
      setHistory(histRes || []);
    } catch (err) {
      console.error('Error loading student portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const instName = institution?.name || 'Apex IIT-JEE & NEET Academy';
  const instTagline = institution?.tagline || 'Excellence in Test Preparation';
  const primaryColor = institution?.primary_color || '#4f46e5';

  return (
    <div className="student-portal">
      {/* Branded Student Header Banner */}
      <div 
        className="student-banner mb-6 p-6 rounded-xl text-white shadow-md relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm">
                Student Examination Portal
              </span>
              <span className="text-white/80 text-xs">
                Roll No: <strong>{user?.roll_number || 'STU-001'}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black mb-1">{instName}</h1>
            <p className="text-white/80 text-sm">{instTagline}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/90">
              <span>Candidate: <strong>{user?.full_name || user?.username}</strong></span>
              <span>Batch: <strong>{user?.batch_name || 'Class 12 - Target JEE 2026'}</strong></span>
            </div>
          </div>
          <div className="hidden sm:block opacity-20">
            <GraduationCap size={96} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: Available Assessments & History */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Active / Available Assessments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-main flex items-center gap-2">
                <FileText size={20} className="text-indigo" />
                Assigned Online Examinations
              </h2>
              <span className="text-xs text-muted font-medium">
                {exams.filter(e => e.status === 'AVAILABLE' || e.status === 'IN_PROGRESS').length} Active Assessments
              </span>
            </div>

            {loading ? (
              <div className="card text-center py-8">
                <div className="spinner mb-2"></div>
                <p className="text-muted text-sm">Checking exam schedules...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="card text-center py-8">
                <CheckCircle2 size={36} className="text-muted mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-main text-sm">No pending examinations</p>
                <p className="text-xs text-muted mt-1">You are all caught up! Check announcements for upcoming test schedules.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {exams.map(exam => {
                  const isAvailable = exam.status === 'AVAILABLE';
                  const isInProgress = exam.status === 'IN_PROGRESS';
                  const isCompleted = exam.status === 'COMPLETED';

                  return (
                    <div 
                      key={exam.id}
                      className={`card exam-student-card p-5 border transition ${
                        isAvailable ? 'border-emerald-300 hover:border-emerald-500 shadow-sm' :
                        isInProgress ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {exam.code}
                            </span>
                            {isAvailable && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                LIVE NOW
                              </span>
                            )}
                            {isInProgress && (
                              <Badge variant="warning" size="xs">IN PROGRESS (Resume)</Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="success" size="xs">SUBMITTED</Badge>
                            )}
                            {exam.enable_negative_marking && (
                              <span className="text-xs text-danger font-medium bg-red-50 px-2 py-0.5 rounded">
                                Negative Marking Applies
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-main mb-1">{exam.title}</h3>
                          <p className="text-xs text-muted mb-3 line-clamp-1">{exam.description}</p>

                          <div className="flex items-center gap-5 text-xs text-muted">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Clock size={14} className="text-indigo" />
                              {exam.duration_minutes} Mins Duration
                            </span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Award size={14} className="text-emerald-600" />
                              {exam.total_marks} Total Marks
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar size={14} />
                              Until {exam.end_time ? new Date(exam.end_time).toLocaleDateString() : 'Open'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {isAvailable && (
                            <button 
                              className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-none font-bold shadow-sm"
                              onClick={() => onStartExam(exam.id)}
                            >
                              <Play size={16} className="mr-1 fill-white" />
                              Start Exam
                            </button>
                          )}

                          {isInProgress && (
                            <button 
                              className="btn btn-warning font-bold"
                              onClick={() => onStartExam(exam.id)}
                            >
                              <Clock size={16} className="mr-1" />
                              Resume Test
                            </button>
                          )}

                          {isCompleted && (
                            <div className="flex flex-col items-end gap-1">
                              {exam.results_published ? (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <button 
                                    type="button"
                                    className="btn btn-sm btn-outline text-indigo font-semibold"
                                    onClick={() => onViewScorecard(exam.latest_attempt_id)}
                                  >
                                    <Award size={14} className="mr-1 text-amber-500" />
                                    Analysis
                                  </button>
                                  <a 
                                    href={studentApi.getPrintableScorecardUrl(exam.latest_attempt_id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-primary bg-indigo-600 hover:bg-indigo-700 font-semibold"
                                    title="Open Official Print-Ready NTA Scorecard"
                                  >
                                    <Printer size={13} className="mr-1" />
                                    Print Scorecard
                                  </a>
                                </div>
                              ) : (
                                <span className="text-xs text-muted bg-slate-100 px-2 py-1 rounded">
                                  Evaluation in Progress
                                </span>
                              )}
                              {exam.results_published && exam.latest_attempt_score !== null && (
                                <div className="text-xs font-bold text-slate-800">
                                  Score: <span className="text-indigo">{exam.latest_attempt_score} pts</span>
                                  {exam.latest_attempt_rank && (
                                    <span className="ml-2 text-emerald-700">Rank #{exam.latest_attempt_rank}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Assessment Attempts History */}
          {history.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-main mb-3 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                My Assessment History
              </h2>
              <div className="card table-responsive">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Submitted On</th>
                      <th>Score</th>
                      <th>Percentile</th>
                      <th>Rank</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(att => (
                      <tr key={att.id}>
                        <td>
                          <div className="font-semibold text-main">{att.exam_title}</div>
                          <span className="font-mono text-muted text-xs">{att.exam_code}</span>
                        </td>
                        <td className="text-muted">
                          {att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <span className="font-bold text-indigo">{att.total_score} / {att.max_possible_score}</span>
                          <span className="text-xs text-muted block">({att.percentage}%)</span>
                        </td>
                        <td className="font-bold text-emerald-700">{att.percentile}%</td>
                        <td>
                          {att.rank ? (
                            <span className="font-bold text-amber-700">#{att.rank}</span>
                          ) : '-'}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button"
                              className="btn btn-xs btn-outline text-indigo"
                              onClick={() => onViewScorecard(att.id)}
                            >
                              Scorecard
                            </button>
                            <a 
                              href={studentApi.getPrintableScorecardUrl(att.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-xs btn-outline text-primary font-semibold"
                              title="Print Official NTA Scorecard"
                            >
                              <Printer size={12} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Institute Notice Board & Quick Tips */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Notice Board */}
          <div className="card p-5">
            <h3 className="text-base font-bold text-main mb-3 flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              Institute Notice Board
            </h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-muted italic">No active announcements.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-3 bg-slate-50 border rounded text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{ann.title}</span>
                      {ann.priority === 'HIGH' && (
                        <span className="text-danger font-bold text-2xs uppercase">Important</span>
                      )}
                    </div>
                    <p className="text-slate-600 line-clamp-3">{ann.content}</p>
                    <span className="text-2xs text-muted mt-1">{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CBT Instructions Card */}
          <div className="card p-5 bg-indigo-50/40 border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
              <HelpCircle size={16} className="text-indigo" />
              CBT Examination Guidelines
            </h3>
            <ul className="text-xs text-slate-700 flex flex-col gap-1.5 list-disc pl-4">
              <li>Ensure stable internet connectivity during tests.</li>
              <li>Timer auto-submits when countdown reaches 00:00:00.</li>
              <li>Use <strong>Save & Next</strong> to persist each answer.</li>
              <li>Mark questions for review if you wish to revisit them later.</li>
              <li>Detailed solutions and rankings are published upon educator release.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
