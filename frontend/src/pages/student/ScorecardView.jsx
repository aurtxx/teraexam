import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/client';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Clock, 
  ArrowLeft, 
  Printer, 
  HelpCircle, 
  TrendingUp, 
  BookOpen,
  Share2,
  Sparkles
} from 'lucide-react';
import { Badge } from '../../components/Badge';

export function ScorecardView({ attemptId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScorecard();
  }, [attemptId]);

  const loadScorecard = async () => {
    try {
      setLoading(true);
      const res = await studentApi.getScorecard(attemptId);
      setData(res);
    } catch (err) {
      console.error('Error fetching scorecard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner mb-2"></div>
        <p className="text-muted text-sm">Generating comprehensive examination scorecard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12 max-w-lg mx-auto">
        <p className="text-muted mb-4">Scorecard not found or attempt is still in progress.</p>
        <button className="btn btn-primary" onClick={onBack}>
          <ArrowLeft size={16} className="mr-1" />
          Back to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="scorecard-container max-w-4xl mx-auto py-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} className="mr-1.5" />
          Back to Dashboard
        </button>
        <button className="btn btn-outline text-indigo" onClick={() => window.print()}>
          <Printer size={16} className="mr-1.5" />
          Print / Save PDF
        </button>
      </div>

      {/* Main Scorecard Banner */}
      <div className="card scorecard-header-card p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl mb-6 shadow-lg border-none">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-500/30 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-indigo-400/20">
                Official Examination Scorecard
              </span>
              <span className="text-xs text-slate-300 font-mono">Code: {data.exam_code}</span>
            </div>
            <h1 className="text-2xl font-black mb-1">{data.exam_title}</h1>
            <p className="text-sm text-slate-300">
              Candidate: <strong>{data.student_name}</strong> (Roll: {data.roll_number || 'STU-001'})
            </p>
          </div>

          {/* Ranks & Percentile Pill */}
          <div className="flex gap-3">
            {data.rank && (
              <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-center min-w-24">
                <span className="text-2xs text-amber-300 font-bold uppercase block">All-India Rank</span>
                <span className="text-2xl font-black text-amber-400">#{data.rank}</span>
              </div>
            )}
            <div className="p-3 bg-emerald-400/10 border border-emerald-400/30 rounded-xl text-center min-w-24">
              <span className="text-2xs text-emerald-300 font-bold uppercase block">Percentile</span>
              <span className="text-2xl font-black text-emerald-400">{data.percentile}%</span>
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Total Score</span>
            <span className="text-2xl font-black text-white">
              {data.total_score} <span className="text-sm text-slate-400 font-normal">/ {data.max_possible_score}</span>
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Percentage</span>
            <span className="text-2xl font-black text-white">{data.percentage}%</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Accuracy Rate</span>
            <span className="text-2xl font-black text-emerald-400">{data.accuracy_rate}%</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Time Taken</span>
            <span className="text-2xl font-black text-white font-mono">
              {Math.floor(data.time_spent_seconds / 60)}m {data.time_spent_seconds % 60}s
            </span>
          </div>
        </div>
      </div>

      {/* Answer Distribution Strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 bg-emerald-50 border-emerald-200 flex items-center gap-3">
          <CheckCircle size={28} className="text-emerald-600" />
          <div>
            <span className="text-xs text-emerald-800 font-semibold block">Correct Answers</span>
            <span className="text-xl font-bold text-emerald-950">{data.correct_count}</span>
          </div>
        </div>

        <div className="card p-4 bg-red-50 border-red-200 flex items-center gap-3">
          <XCircle size={28} className="text-red-500" />
          <div>
            <span className="text-xs text-red-800 font-semibold block">Incorrect Answers</span>
            <span className="text-xl font-bold text-red-950">{data.incorrect_count}</span>
          </div>
        </div>

        <div className="card p-4 bg-slate-50 border-slate-200 flex items-center gap-3">
          <MinusCircle size={28} className="text-slate-400" />
          <div>
            <span className="text-xs text-slate-700 font-semibold block">Unattempted Questions</span>
            <span className="text-xl font-bold text-slate-900">{data.unattempted_count}</span>
          </div>
        </div>
      </div>

      {/* Subject-Wise Performance Breakdown */}
      {data.subject_breakdown && data.subject_breakdown.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-bold text-base text-main mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo" />
            Subject-Wise Score Breakdown
          </h3>
          <div className="table-responsive">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Questions</th>
                  <th>Attempted</th>
                  <th>Correct</th>
                  <th>Score</th>
                  <th>Score %</th>
                </tr>
              </thead>
              <tbody>
                {data.subject_breakdown.map((sb, i) => (
                  <tr key={i}>
                    <td className="font-bold text-main">{sb.subject}</td>
                    <td>{sb.total_questions}</td>
                    <td>{sb.attempted}</td>
                    <td className="text-emerald-700 font-semibold">{sb.correct}</td>
                    <td>
                      <span className="font-bold text-indigo">{sb.score} / {sb.max_score}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${sb.percentage >= 60 ? 'bg-emerald-500' : sb.percentage >= 35 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, sb.percentage))}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold">{sb.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Question-By-Question Detailed Solutions Review */}
      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-base text-main flex items-center gap-2">
          <BookOpen size={18} className="text-indigo" />
          Question-by-Question Solution & Explanations Review
        </h3>

        {data.questions_review.map((item, idx) => {
          const isCorrect = item.is_correct;
          const isAttempted = item.status === 'ANSWERED' || item.status === 'ANSWERED_AND_MARKED_FOR_REVIEW';

          return (
            <div 
              key={item.question_id}
              className={`card p-5 border-2 ${
                !isAttempted ? 'border-slate-200 bg-white' :
                isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-indigo bg-indigo-50 px-2.5 py-0.5 rounded">
                    Q{item.order}
                  </span>
                  <Badge variant="purple" size="xs">{item.subject}</Badge>
                  <Badge variant="info" size="xs">{item.question_type}</Badge>
                </div>

                <div>
                  {!isAttempted ? (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Unattempted (0 pts)
                    </span>
                  ) : isCorrect ? (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded flex items-center gap-1">
                      <CheckCircle size={14} /> Correct (+{item.marks_awarded} pts)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-800 bg-red-100 px-2.5 py-1 rounded flex items-center gap-1">
                      <XCircle size={14} /> Incorrect ({item.marks_awarded} pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className="text-base text-slate-900 font-medium mb-4 whitespace-pre-wrap">
                {item.question_text}
              </div>

              {/* Options Breakdown */}
              {item.options && item.options.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  {item.options.map(opt => {
                    const isStudentPick = (item.student_selected_options || []).includes(opt.id);
                    const isCorrectAnswer = Array.isArray(item.correct_answers) && item.correct_answers.includes(opt.id);

                    let chipStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                    if (isCorrectAnswer) {
                      chipStyle = 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold';
                    } else if (isStudentPick && !isCorrectAnswer) {
                      chipStyle = 'bg-red-100 border-red-300 text-red-950 font-medium';
                    }

                    return (
                      <div key={opt.id} className={`p-2.5 rounded border flex items-center gap-2 ${chipStyle}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-2xs ${
                          isCorrectAnswer ? 'bg-emerald-700 text-white' : isStudentPick ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {opt.id}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isStudentPick && <span className="text-2xs font-semibold px-1 rounded bg-black/10">Your Choice</span>}
                        {isCorrectAnswer && <span className="text-2xs font-bold text-emerald-800">Correct Key</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical Response Breakdown */}
              {item.question_type === 'NUMERICAL' && (
                <div className="p-3 bg-slate-50 rounded border mb-4 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-muted block">Your Numerical Response:</span>
                    <strong className="font-mono text-sm">{item.student_numerical_value || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-muted block">Official Target Key:</span>
                    <strong className="font-mono text-sm text-emerald-800">
                      {item.correct_answers?.value ?? JSON.stringify(item.correct_answers)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Detailed Teacher Solution */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-slate-800">
                <strong className="block text-indigo-950 font-bold mb-1 uppercase tracking-wider text-2xs">
                  Educator Solution & Explanation:
                </strong>
                <p className="whitespace-pre-wrap leading-relaxed">{item.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
