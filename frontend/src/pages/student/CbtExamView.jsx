import React, { useState, useEffect, useRef } from 'react';
import { studentApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  RotateCcw, 
  Check, 
  Send, 
  GraduationCap, 
  User, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function CbtExamView({ examId, onComplete, onExit }) {
  const { user, institution } = useAuth();
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  // Answers Map: { [question_id]: { selected_options: [], numerical_value: '', is_marked_for_review: false, status: '' } }
  const [answers, setAnswers] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    startOrResumeExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  const startOrResumeExam = async () => {
    try {
      setLoading(true);
      const res = await studentApi.startAttempt(examId);
      setExamData(res);
      setSecondsRemaining(res.seconds_remaining);

      // Initialize answers state from payload
      const initialAnswers = {};
      (res.questions || []).forEach(q => {
        initialAnswers[q.question_id] = {
          selected_options: q.student_answer?.selected_options || [],
          numerical_value: q.student_answer?.numerical_value || '',
          text_value: q.student_answer?.text_value || '',
          is_marked_for_review: Boolean(q.student_answer?.is_marked_for_review),
          status: q.student_answer?.status || 'NOT_VISITED',
        };
      });
      setAnswers(initialAnswers);

      // Start countdown
      startTimer(res.seconds_remaining);
    } catch (err) {
      console.error('Failed to start exam:', err);
      alert('Could not start exam: ' + (err.message || 'Please check with your educator.'));
      onExit();
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialSeconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsRemaining(initialSeconds);

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAutoSubmit = async () => {
    alert('Time limit reached! Your examination has been automatically submitted.');
    await executeSubmission();
  };

  const saveCurrentAnswerToBackend = async (qId, answerData) => {
    if (!examData?.attempt_id) return;
    try {
      await studentApi.saveAnswer({
        attempt_id: examData.attempt_id,
        question_id: qId,
        selected_options: answerData.selected_options,
        numerical_value: answerData.numerical_value,
        text_value: answerData.text_value,
        is_marked_for_review: answerData.is_marked_for_review,
        time_spent_delta: 2,
      });
    } catch (err) {
      console.warn('Background auto-save error:', err);
    }
  };

  const updateCurrentQuestionAnswer = (updater) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const qid = currentQ.question_id;

    setAnswers(prev => {
      const existing = prev[qid] || { selected_options: [], numerical_value: '', is_marked_for_review: false, status: 'NOT_VISITED' };
      const updated = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
      
      // Determine CBT status
      const hasVal = Boolean(
        (updated.selected_options && updated.selected_options.length > 0) ||
        (updated.numerical_value !== '' && updated.numerical_value !== null && updated.numerical_value !== undefined) ||
        (updated.text_value && updated.text_value.trim() !== '')
      );

      if (hasVal && updated.is_marked_for_review) {
        updated.status = 'ANSWERED_AND_MARKED_FOR_REVIEW';
      } else if (hasVal) {
        updated.status = 'ANSWERED';
      } else if (updated.is_marked_for_review) {
        updated.status = 'MARKED_FOR_REVIEW';
      } else {
        updated.status = 'VISITED_UNANSWERED';
      }

      // Auto-save to backend
      saveCurrentAnswerToBackend(qid, updated);
      return { ...prev, [qid]: updated };
    });
  };

  const handleSelectOption = (optId) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    if (currentQ.question_type === 'MCQ_SINGLE' || currentQ.question_type === 'TRUE_FALSE') {
      updateCurrentQuestionAnswer({ selected_options: [optId] });
    } else if (currentQ.question_type === 'MCQ_MULTI') {
      const existing = answers[currentQ.question_id]?.selected_options || [];
      const next = existing.includes(optId) ? existing.filter(x => x !== optId) : [...existing, optId];
      updateCurrentQuestionAnswer({ selected_options: next });
    }
  };

  const handleClearResponse = () => {
    updateCurrentQuestionAnswer({
      selected_options: [],
      numerical_value: '',
      text_value: '',
      is_marked_for_review: false,
    });
  };

  const handleMarkForReviewAndNext = () => {
    updateCurrentQuestionAnswer(prev => ({
      ...prev,
      is_marked_for_review: true,
    }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSaveAndNext = () => {
    const currentQ = questions[currentIndex];
    const currAns = answers[currentQ?.question_id];
    // If user hasn't selected anything, mark as visited unanswered
    if (!currAns || (currAns.selected_options.length === 0 && !currAns.numerical_value && !currAns.text_value)) {
      updateCurrentQuestionAnswer({ is_marked_for_review: false });
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const executeSubmission = async () => {
    if (!examData?.attempt_id) return;
    try {
      setSubmitting(true);
      const res = await studentApi.submitAttempt(examData.attempt_id);
      if (timerRef.current) clearInterval(timerRef.current);
      setSubmitModalOpen(false);
      onComplete(examData.attempt_id);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Submission failed: ' + (err.message || 'Unknown error'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="cbt-fullscreen-loader flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-1">Launching CBT Testing Environment...</h2>
          <p className="text-sm text-slate-400">Loading questions, proctoring security & timers</p>
        </div>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentIndex] || null;
  const currentAns = currentQ ? (answers[currentQ.question_id] || { selected_options: [], numerical_value: '', status: 'NOT_VISITED' }) : null;

  // Subjects in exam
  const subjectList = Array.from(new Set(questions.map(q => q.subject_name)));

  // Format Timer HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // State Counts for Question Palette
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;
  let markedCount = 0;
  let answeredAndMarkedCount = 0;

  questions.forEach(q => {
    const st = answers[q.question_id]?.status || 'NOT_VISITED';
    if (st === 'ANSWERED') answeredCount++;
    else if (st === 'VISITED_UNANSWERED') notAnsweredCount++;
    else if (st === 'MARKED_FOR_REVIEW') markedCount++;
    else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW') answeredAndMarkedCount++;
    else notVisitedCount++;
  });

  return (
    <div className="cbt-exam-container min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* CBT Top Examination Bar */}
      <header className="cbt-top-bar bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg text-slate-950 shadow-inner">
            {institution?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">{examData?.exam_title}</h1>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{examData?.exam_code}</span>
              <span>•</span>
              <span>{institution?.name || 'Apex Academy'}</span>
            </div>
          </div>
        </div>

        {/* Candidate Profile & Countdown Timer */}
        <div className="flex items-center gap-6">
          <div className="candidate-info hidden md:flex items-center gap-3 border-r border-slate-700 pr-6">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
              <User size={18} />
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-white">{user?.full_name || user?.username}</div>
              <div className="text-2xs text-slate-400 font-mono">Roll: {user?.roll_number || 'APEX-001'}</div>
            </div>
          </div>

          {/* Strict Countdown Timer */}
          <div className={`cbt-timer flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg shadow-inner ${
            secondsRemaining < 300 ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' :
            secondsRemaining < 600 ? 'bg-amber-950 text-amber-300 border border-amber-800' :
            'bg-slate-800 text-emerald-400 border border-slate-700'
          }`}>
            <Clock size={20} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button 
            className="btn btn-sm btn-primary bg-emerald-600 hover:bg-emerald-700 border-none font-bold"
            onClick={() => setSubmitModalOpen(true)}
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* CBT Section Bar */}
      <div className="cbt-sections-bar bg-white border-b px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Sections:</span>
          <button 
            className={`btn btn-xs ${selectedSubject === 'ALL' ? 'btn-primary' : 'btn-outline text-slate-700'}`}
            onClick={() => setSelectedSubject('ALL')}
          >
            All Questions ({questions.length})
          </button>
          {subjectList.map(sub => (
            <button 
              key={sub}
              className={`btn btn-xs ${selectedSubject === sub ? 'btn-primary' : 'btn-outline text-slate-700'}`}
              onClick={() => setSelectedSubject(sub)}
            >
              {sub} ({questions.filter(q => q.subject_name === sub).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Correct: +{currentQ?.marks ?? 4.0}
          </span>
          <span className="font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            Negative: -{currentQ?.negative_marks ?? 1.0}
          </span>
        </div>
      </div>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Area: Question Viewer & Answer Selector */}
        <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
          {currentQ ? (
            <div className="question-content-box max-w-4xl mx-auto w-full">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-indigo bg-indigo-50 px-3 py-1 rounded">
                    Question {currentIndex + 1}
                  </span>
                  <Badge variant="purple" size="xs">{currentQ.subject_name}</Badge>
                  <Badge variant="info" size="xs">{currentQ.question_type.replace('_', ' ')}</Badge>
                  <Badge variant={currentQ.difficulty === 'HARD' ? 'danger' : 'warning'} size="xs">
                    {currentQ.difficulty}
                  </Badge>
                </div>
                <span className="text-xs text-muted font-mono">ID: #{currentQ.question_id}</span>
              </div>

              {/* Question Text Statement */}
              <div className="question-statement text-slate-900 text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                {currentQ.question_text}
              </div>

              {/* Options Selector */}
              {['MCQ_SINGLE', 'MCQ_MULTI'].includes(currentQ.question_type) && currentQ.options && (
                <div className="options-container flex flex-col gap-3">
                  {currentQ.options.map(opt => {
                    const isSelected = (currentAns?.selected_options || []).includes(opt.id);
                    return (
                      <div 
                        key={opt.id}
                        className={`cbt-option-item p-4 rounded-xl border-2 transition cursor-pointer flex items-center gap-4 ${
                          isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        onClick={() => handleSelectOption(opt.id)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {opt.id}
                        </div>
                        <div className="text-base text-slate-800 flex-1">{opt.text}</div>
                        {isSelected && <Check size={20} className="text-indigo-600" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical Response Keypad */}
              {currentQ.question_type === 'NUMERICAL' && (
                <div className="p-6 bg-white rounded-xl border-2 border-indigo-200 max-w-md">
                  <label className="form-label text-sm font-bold text-indigo-900 mb-2 block">
                    Enter Numerical Value Answer:
                  </label>
                  <input 
                    type="number"
                    step="any"
                    className="form-input text-lg font-mono font-bold p-3"
                    placeholder="Enter decimal or integer value..."
                    value={currentAns?.numerical_value || ''}
                    onChange={(e) => updateCurrentQuestionAnswer({ numerical_value: e.target.value })}
                  />
                  <p className="text-xs text-muted mt-2">
                    Enter your calculated decimal answer (e.g. 15.91 or -2.5).
                  </p>
                </div>
              )}

              {/* True False Selector */}
              {currentQ.question_type === 'TRUE_FALSE' && (
                <div className="flex gap-4">
                  {['TRUE', 'FALSE'].map(val => {
                    const isSelected = (currentAns?.selected_options || []).includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        className={`px-8 py-4 rounded-xl font-bold text-base border-2 transition ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => handleSelectOption(val)}
                      >
                        {val === 'TRUE' ? 'True' : 'False'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted">No question selected.</p>
          )}

          {/* Bottom Action Controls */}
          <div className="cbt-bottom-bar max-w-4xl mx-auto w-full pt-6 mt-6 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="btn btn-outline text-slate-700 bg-white"
                onClick={handleClearResponse}
              >
                <RotateCcw size={16} className="mr-1.5" />
                Clear Response
              </button>
              <button 
                type="button"
                className="btn btn-outline text-purple-700 border-purple-300 bg-purple-50/50 hover:bg-purple-100"
                onClick={handleMarkForReviewAndNext}
              >
                <Flag size={16} className="mr-1.5 text-purple-600" />
                Mark for Review & Next
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="btn btn-outline bg-white"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                <ChevronLeft size={16} className="mr-1" />
                Previous
              </button>
              <button 
                type="button"
                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 font-bold px-6"
                onClick={handleSaveAndNext}
              >
                <span>Save & Next</span>
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Indian CBT Question Palette */}
        <aside className="cbt-sidebar w-80 bg-white border-l flex flex-col justify-between p-4 shadow-sm">
          <div>
            {/* Status Legend & Counts */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Question Palette Status
            </h3>

            <div className="grid grid-cols-2 gap-2 text-2xs mb-4">
              <div className="flex items-center gap-2 p-1.5 rounded bg-emerald-50 border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  {answeredCount}
                </span>
                <span className="font-semibold text-emerald-900">Answered</span>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded bg-red-50 border border-red-200">
                <span className="w-5 h-5 rounded-full bg-red-500 text-white font-bold flex items-center justify-center">
                  {notAnsweredCount}
                </span>
                <span className="font-semibold text-red-900">Not Answered</span>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center">
                  {notVisitedCount}
                </span>
                <span className="font-semibold text-slate-700">Not Visited</span>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded bg-purple-50 border border-purple-200">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center">
                  {markedCount}
                </span>
                <span className="font-semibold text-purple-900">Review</span>
              </div>
            </div>

            {/* Answered & Marked for Review Special Badge */}
            {answeredAndMarkedCount > 0 && (
              <div className="p-1.5 bg-purple-100/70 border border-purple-300 rounded text-2xs mb-3 flex items-center gap-2 text-purple-950 font-semibold">
                <span className="w-5 h-5 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center relative">
                  {answeredAndMarkedCount}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border border-white"></span>
                </span>
                <span>Answered & Marked (Evaluated)</span>
              </div>
            )}

            {/* Question Grid */}
            <h4 className="text-xs font-bold text-slate-700 mb-2">
              Choose Question:
            </h4>
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const st = answers[q.question_id]?.status || 'NOT_VISITED';
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (st === 'ANSWERED') {
                  btnClass = 'bg-emerald-600 text-white border-emerald-700';
                } else if (st === 'VISITED_UNANSWERED') {
                  btnClass = 'bg-red-500 text-white border-red-600';
                } else if (st === 'MARKED_FOR_REVIEW') {
                  btnClass = 'bg-purple-600 text-white border-purple-700';
                } else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
                  btnClass = 'bg-purple-700 text-white border-purple-900 relative';
                }

                return (
                  <button
                    key={q.question_id}
                    type="button"
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center border-2 transition ${btnClass} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : 'hover:opacity-90'
                    }`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                    {st === 'ANSWERED_AND_MARKED_FOR_REVIEW' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-0.5 right-0.5 border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Final Submit Trigger */}
          <div className="border-t pt-4 mt-4">
            <button 
              type="button"
              className="btn btn-primary btn-block bg-emerald-600 hover:bg-emerald-700 border-none font-bold py-3 text-sm flex items-center justify-center gap-2"
              onClick={() => setSubmitModalOpen(true)}
            >
              <Send size={16} />
              Submit Assessment
            </button>
          </div>
        </aside>
      </div>

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {submitModalOpen && (
        <Modal 
          isOpen={submitModalOpen} 
          title="Submit Examination Confirmation" 
          onClose={() => setSubmitModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700">
              Please review your question attempt summary before submitting your examination:
            </p>

            <div className="card p-3 bg-slate-50 border table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Total Questions</th>
                    <th className="text-emerald-700">Answered</th>
                    <th className="text-red-700">Not Answered</th>
                    <th className="text-purple-700">Marked for Review</th>
                    <th className="text-slate-600">Not Visited</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-sm">
                    <td>{questions.length}</td>
                    <td className="text-emerald-700">{answeredCount + answeredAndMarkedCount}</td>
                    <td className="text-red-700">{notAnsweredCount}</td>
                    <td className="text-purple-700">{markedCount + answeredAndMarkedCount}</td>
                    <td className="text-slate-600">{notVisitedCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 text-amber-600" />
              <span>
                Once submitted, you cannot resume or modify any of your responses. Results will be evaluated and recorded immediately.
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setSubmitModalOpen(false)}
                disabled={submitting}
              >
                Back to Examination
              </button>
              <button 
                type="button" 
                className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-none font-bold"
                onClick={executeSubmission}
                disabled={submitting}
              >
                {submitting ? 'Submitting & Evaluating...' : 'Confirm Final Submission'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
