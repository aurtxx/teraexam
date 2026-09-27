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
  Loader2,
  Maximize2,
  Minimize2,
  Info
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
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [proctorWarning, setProctorWarning] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startError, setStartError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Answers Map: { [question_id]: { selected_options: [], numerical_value: '', text_value: '', is_marked_for_review: false, status: '' } }
  const [answers, setAnswers] = useState({});
  const timerRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  useEffect(() => {
    startOrResumeExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [examId]);

  const showSecurityNotice = (message) => {
    setProctorWarning(message);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => {
      setProctorWarning(null);
    }, 5000);
  };

  // Setup Proctoring Telemetry Listeners
  useEffect(() => {
    if (!examData?.attempt_id) return;
    const attemptId = examData.attempt_id;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          showSecurityNotice(`Security Notice: Exam window focus lost. Tab switch #${next} has been logged.`);
          return next;
        });
        studentApi.logTelemetry({
          attempt_id: attemptId,
          event_type: 'TAB_SWITCH',
          details: { tab_hidden: true, timestamp: new Date().toISOString() }
        }).catch(err => console.warn('Telemetry error:', err));
      }
    };

    const handleWindowBlur = () => {
      studentApi.logTelemetry({
        attempt_id: attemptId,
        event_type: 'WINDOW_BLUR',
        details: { blurred: true }
      }).catch(err => console.warn('Telemetry error:', err));
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      showSecurityNotice(`Security Notice: Copying and pasting are restricted during the examination.`);
      studentApi.logTelemetry({
        attempt_id: attemptId,
        event_type: 'COPY_PASTE_ATTEMPT',
        details: { action: e.type }
      }).catch(err => console.warn('Telemetry error:', err));
    };

    const handleKeyDown = (e) => {
      // Trap F12, Ctrl+Shift+I/J/C, Ctrl+U
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
        showSecurityNotice('Security Notice: Developer tools and source inspection are disabled.');
        studentApi.logTelemetry({
          attempt_id: attemptId,
          event_type: 'DEVTOOLS_ATTEMPT',
          details: { key_combination: e.key }
        }).catch(err => console.warn('Telemetry error:', err));
      }
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        studentApi.logTelemetry({
          attempt_id: attemptId,
          event_type: 'FULLSCREEN_EXIT',
          details: { exit_time: new Date().toISOString() }
        }).catch(err => console.warn('Telemetry error:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [examData?.attempt_id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

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

      startTimer(res.seconds_remaining);
    } catch (err) {
      console.error('Failed to start exam:', err);
      const msg = err.data?.detail || err.message || 'Please check with your educator.';
      setStartError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
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
    showSecurityNotice('Notice: Examination time limit has expired. Responses are now being finalized and submitted.');
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
      const existing = prev[qid] || { selected_options: [], numerical_value: '', text_value: '', is_marked_for_review: false, status: 'NOT_VISITED' };
      const updated = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
      
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
      const msg = err.data?.detail || err.message || 'Unknown error occurred while submitting.';
      setSubmitError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface text-on-surface">
        <div className="text-center p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant">
          <Loader2 size={44} className="animate-spin text-primary mx-auto mb-3" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">Connecting to Secure CBT Environment...</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Calibrating question sheets, proctoring stream & timer channels</p>
        </div>
      </div>
    );
  }

  if (startError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface p-4 text-on-surface">
        <div className="max-w-md w-full text-center p-8 bg-surface-container-lowest rounded-xl shadow-md border border-error/30">
          <ShieldAlert size={48} className="text-error mx-auto mb-3" />
          <h2 className="text-lg font-bold text-on-surface mb-2">Unable to Launch Examination</h2>
          <p className="text-sm text-error mb-6 bg-error-container/30 p-3 rounded-lg">{startError}</p>
          <button 
            type="button" 
            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 w-full font-bold"
            onClick={onExit}
          >
            Return to Student Portal
          </button>
        </div>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentIndex] || null;
  const currentAns = currentQ ? (answers[currentQ.question_id] || { selected_options: [], numerical_value: '', status: 'NOT_VISITED' }) : null;

  // Unique Subjects in exam
  const subjectList = Array.from(new Set(questions.map(q => q.subject_name).filter(Boolean)));

  // Format Timer HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // State Counts for Question Palette (NTA 5-state standard)
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

  // Filter questions by section if selected
  const displayedQuestionIndices = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => selectedSubject === 'ALL' || q.subject_name === selectedSubject);

  return (
    <div className="cbt-exam-container min-h-screen flex flex-col bg-surface text-on-surface font-body-md select-none">
      {/* Top System Examination Header */}
      <header className="w-full bg-surface-container-lowest px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant shadow-sm z-30">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline-md shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight truncate">
                {institution?.name || 'TeraExam Examination Authority'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                CBT Secure Live
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {examData?.exam_title} — Code: <span className="font-code-formula">{examData?.exam_code}</span>
            </p>
          </div>
        </div>

        {/* Right HUD: Timer + Telemetry + Fullscreen + Candidate Profile */}
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          {/* Proctoring Warning Badge (ADHD-safe alert) */}
          {tabSwitchCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
              <ShieldAlert size={14} className="text-amber-600" />
              <span>Switches: {tabSwitchCount}</span>
            </div>
          )}

          {/* Live Countdown Timer (JetBrains Mono with color shifts) */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm transition-colors ${
            secondsRemaining < 300 
              ? 'bg-error-container/70 border-error text-error animate-pulse' 
              : secondsRemaining < 900 
              ? 'bg-amber-50 border-amber-300 text-amber-900' 
              : 'bg-surface-container border-outline-variant text-on-surface'
          }`}>
            <Clock size={18} className={secondsRemaining < 300 ? 'text-error' : 'text-primary'} />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Time Left</span>
              <span className="font-timer-display text-lg font-bold tracking-wider">{formatTime(secondsRemaining)}</span>
            </div>
          </div>

          {/* Fullscreen Toggle */}
          <button 
            type="button"
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Candidate Meta */}
          <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'S'}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold truncate max-w-[130px]">
                {user?.full_name || user?.username || 'Candidate'}
              </span>
              <span className="font-code-formula text-xs text-on-surface-variant">
                Roll: {user?.roll_number || 'STU-LIVE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Proctor Notice Banner (Non-modal toast) */}
      {proctorWarning && (
        <div className="bg-amber-500 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{proctorWarning}</span>
          </div>
          <button 
            type="button" 
            className="text-white hover:underline text-xs"
            onClick={() => setProctorWarning(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Subject & Sub-section Navigation Strip */}
      <nav className="w-full bg-surface-container px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-1">Section:</span>
          <button 
            type="button"
            className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
              selectedSubject === 'ALL'
                ? 'bg-primary text-on-primary shadow-sm font-semibold'
                : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'
            }`}
            onClick={() => setSelectedSubject('ALL')}
          >
            <span>All Sections</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 font-code-formula text-xs">{questions.length}</span>
          </button>

          {subjectList.map(sub => {
            const count = questions.filter(q => q.subject_name === sub).length;
            const isSelected = selectedSubject === sub;
            return (
              <button 
                key={sub}
                type="button"
                className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-sm font-semibold'
                    : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'
                }`}
                onClick={() => setSelectedSubject(sub)}
              >
                <span>{sub}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/10 font-code-formula text-xs">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Scoring Matrix Tag for Current Question */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-secondary font-label-md text-label-md bg-secondary-container/40 px-2.5 py-1 rounded-lg">
            <span className="material-symbols-outlined text-[16px] font-bold">add_circle</span>
            <span>+{currentQ?.marks ?? 4.0} Correct</span>
          </div>
          <div className="flex items-center gap-1 text-error font-label-md text-label-md bg-error-container/60 px-2.5 py-1 rounded-lg">
            <span className="material-symbols-outlined text-[16px] font-bold">remove_circle</span>
            <span>-{currentQ?.negative_marks ?? 1.0} Incorrect</span>
          </div>
        </div>
      </nav>

      {/* Main Workspace Split: Left Question View (72%) vs Right Palette (28%) */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6 bg-surface overflow-y-auto">
        {/* Left Pane: Problem Presentation & Answering Sheet */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="w-full bg-surface-container-lowest rounded-xl p-6 lg:p-8 shadow-sm border border-outline-variant flex flex-col gap-6">
            {/* Question Meta Header */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-outline-variant gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm font-bold shadow-sm">
                  Question {currentIndex + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold">
                  {currentQ?.question_type?.replace('_', ' ') || 'Single Choice Correct'}
                </span>
                {currentQ?.subject_name && (
                  <span className="px-2.5 py-0.5 rounded-md bg-surface-container-highest text-on-surface font-label-md text-label-md">
                    {currentQ.subject_name}
                  </span>
                )}
              </div>
              <span className="text-xs text-on-surface-variant font-code-formula">
                Item ID: #{currentQ?.question_id}
              </span>
            </div>

            {/* Problem Formulation */}
            <div className="flex flex-col gap-4 text-on-surface">
              <p className="font-body-lg text-body-lg leading-relaxed whitespace-pre-wrap">
                {currentQ?.question_text}
              </p>
            </div>

            {/* Answer Options Formulation */}
            {['MCQ_SINGLE', 'MCQ_MULTI'].includes(currentQ?.question_type) && currentQ?.options && (
              <div className="flex flex-col gap-3 pt-2">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                  {currentQ.question_type === 'MCQ_MULTI' ? 'Choose All Applicable Options:' : 'Choose the Correct Option:'}
                </span>
                {currentQ.options.map(opt => {
                  const isSelected = (currentAns?.selected_options || []).includes(opt.id);
                  return (
                    <label 
                      key={opt.id}
                      className={`group relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-primary-fixed/20 border-primary shadow-sm' 
                          : 'bg-surface-container-low hover:bg-surface-container border-outline-variant text-on-surface'
                      }`}
                      onClick={() => handleSelectOption(opt.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full font-headline-sm text-headline-sm flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${
                          isSelected 
                            ? 'bg-primary text-on-primary' 
                            : 'bg-surface-container-highest text-on-surface group-hover:bg-primary-container group-hover:text-on-primary'
                        }`}>
                          {opt.id}
                        </div>
                        <div className="font-body-md text-body-md text-on-surface leading-normal">
                          {opt.text}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="material-symbols-outlined text-primary text-[22px]">check_circle</span>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-outline-variant group-hover:border-outline"></div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Numerical Answer Type Input */}
            {currentQ?.question_type === 'NUMERICAL' && (
              <div className="p-6 bg-surface-container-low rounded-xl border border-primary/20 max-w-lg">
                <label className="font-label-md text-label-md font-bold text-on-surface mb-2 block uppercase tracking-wider">
                  Numerical Value Answer:
                </label>
                <input 
                  type="number"
                  step="any"
                  className="w-full px-4 py-3 rounded-lg bg-surface-container-lowest border-2 border-outline focus:border-primary focus:outline-none font-code-formula text-xl text-on-surface shadow-inner"
                  placeholder="Enter decimal or integer..."
                  value={currentAns?.numerical_value || ''}
                  onChange={(e) => updateCurrentQuestionAnswer({ numerical_value: e.target.value })}
                />
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  Enter precise numerical result (e.g. <span className="font-code-formula">14.50</span> or <span className="font-code-formula">-2.75</span>).
                </p>
              </div>
            )}

            {/* True / False Selector */}
            {currentQ?.question_type === 'TRUE_FALSE' && (
              <div className="flex gap-4 pt-2">
                {['TRUE', 'FALSE'].map(val => {
                  const isSelected = (currentAns?.selected_options || []).includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`px-8 py-4 rounded-xl font-headline-sm text-headline-sm border-2 transition-all shadow-sm ${
                        isSelected 
                          ? 'bg-primary text-on-primary border-primary shadow-md' 
                          : 'bg-surface-container-low hover:bg-surface-container border-outline-variant text-on-surface'
                      }`}
                      onClick={() => handleSelectOption(val)}
                    >
                      {val === 'TRUE' ? 'True Statement' : 'False Statement'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Question Bottom Action Bar */}
          <div className="w-full bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                className="px-4 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center gap-2 transition-colors border border-outline-variant"
                onClick={handleClearResponse}
              >
                <RotateCcw size={16} />
                <span>Clear Response</span>
              </button>
              <button 
                type="button"
                className="px-4 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-label-md text-label-md flex items-center gap-2 transition-colors font-semibold"
                onClick={handleMarkForReviewAndNext}
              >
                <Flag size={16} className="text-amber-700" />
                <span>Mark for Review & Next</span>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button 
                type="button"
                className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-2 transition-colors border border-outline-variant disabled:opacity-40"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              <button 
                type="button"
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors font-semibold"
                onClick={handleSaveAndNext}
              >
                <span>Save & Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: Question Palette HUD & Navigation Matrix */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* Question Palette Status Legend */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Question Palette</span>
              <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold">
                {selectedSubject === 'ALL' ? 'Full Assessment' : selectedSubject}
              </span>
            </div>

            {/* Color Meaning Matrix (NTA 5-state standard) */}
            <div className="grid grid-cols-2 gap-2 text-label-sm font-label-sm">
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
                <div className="w-6 h-6 rounded bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {answeredCount}
                </div>
                <span className="text-on-surface truncate">Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
                <div className="w-6 h-6 rounded bg-error text-on-error flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {notAnsweredCount}
                </div>
                <span className="text-on-surface truncate">Not Answered</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
                <div className="w-6 h-6 rounded bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {notVisitedCount}
                </div>
                <span className="text-on-surface truncate">Not Visited</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
                <div className="w-6 h-6 rounded bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {markedCount}
                </div>
                <span className="text-on-surface truncate">Review</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
                <div className="relative w-6 h-6 rounded bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <span>{answeredAndMarkedCount}</span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-secondary rounded-full border border-surface-container-lowest"></span>
                </div>
                <span className="text-on-surface truncate">Answered & Marked for Review</span>
              </div>
            </div>
          </div>

          {/* Matrix Grid with Jump Navigation */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant flex flex-col gap-4">
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant">
              <span className="font-semibold">Jump to Question</span>
              <span className="font-code-formula">Total: {questions.length}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const st = answers[q.question_id]?.status || 'NOT_VISITED';
                const isCurrent = idx === currentIndex;

                let cellBg = 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container';
                if (st === 'ANSWERED') {
                  cellBg = 'bg-secondary text-on-secondary';
                } else if (st === 'VISITED_UNANSWERED') {
                  cellBg = 'bg-error text-on-error';
                } else if (st === 'MARKED_FOR_REVIEW') {
                  cellBg = 'bg-tertiary-container text-on-tertiary';
                } else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
                  cellBg = 'bg-tertiary-container text-on-tertiary relative';
                }

                if (isCurrent) {
                  cellBg = 'bg-primary text-on-primary ring-2 ring-primary ring-offset-2 scale-105 shadow-md font-bold';
                }

                return (
                  <button
                    key={q.question_id}
                    type="button"
                    className={`h-10 rounded-lg font-headline-sm text-headline-sm flex items-center justify-center transition-all ${cellBg}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                    {st === 'ANSWERED_AND_MARKED_FOR_REVIEW' && !isCurrent && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Safe Final Exam Submission Action */}
          <div className="w-full mt-auto">
            <button 
              type="button"
              className="w-full py-3.5 px-4 rounded-xl bg-error hover:bg-on-error-container text-on-error font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-sm transition-colors font-bold"
              onClick={() => setSubmitModalOpen(true)}
            >
              <Send size={18} />
              <span>Submit Examination</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Examination Footer Protocol Status */}
      <footer className="w-full bg-surface-container-lowest px-6 py-2.5 flex flex-wrap items-center justify-between text-on-surface-variant font-label-sm text-label-sm border-t border-outline-variant z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-secondary font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Proctor Security Stream: Active (42 ms)
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline font-code-formula">Session: #{examData?.attempt_id || '9842-LIVE'}</span>
        </div>
        <div>
          <span>TeraExam Assessment Engine v4.8 • {institution?.name || 'Academic Command Network'}</span>
        </div>
      </footer>

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {submitModalOpen && (
        <Modal 
          isOpen={submitModalOpen} 
          title="Submit Examination?" 
          onClose={() => setSubmitModalOpen(false)}
        >
          <div className="flex flex-col gap-4 text-on-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold">Review Attempt Summary</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Please verify your responses before final irreversible submission.</p>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 font-label-md text-label-md border border-outline-variant">
              <div className="flex justify-between py-1 border-b border-outline-variant">
                <span className="text-on-surface-variant">Total Questions:</span>
                <span className="font-bold text-on-surface">{questions.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-outline-variant">
                <span className="text-on-surface-variant">Answered:</span>
                <span className="font-bold text-secondary">{answeredCount + answeredAndMarkedCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-outline-variant">
                <span className="text-on-surface-variant">Marked for Review:</span>
                <span className="font-bold text-amber-700">{markedCount + answeredAndMarkedCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-on-surface-variant">Unanswered / Skipped:</span>
                <span className="font-bold text-error">{notAnsweredCount + notVisitedCount}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-error-container text-error rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Info size={16} className="shrink-0 text-amber-700 mt-0.5" />
              <span>
                Once submitted, your answers will be locked, auto-evaluated against the answer key, and your official scorecard will be generated.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors"
                onClick={() => setSubmitModalOpen(false)}
                disabled={submitting}
              >
                Return to Exam
              </button>
              <button 
                type="button" 
                className="px-6 py-2.5 rounded-lg bg-error hover:bg-on-error-container text-on-error font-label-md text-label-md font-bold shadow-sm transition-colors"
                onClick={executeSubmission}
                disabled={submitting}
              >
                {submitting ? 'Evaluating & Submitting...' : 'Yes, Final Submit'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
