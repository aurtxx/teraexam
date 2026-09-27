import React, { useState, useEffect } from 'react';
import { examsApi } from '../../api/client';
import { 
  Calendar, 
  Plus, 
  Clock, 
  Award, 
  BarChart3, 
  FileText, 
  Share2, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Trash2, 
  Eye, 
  BookOpen,
  Sparkles,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  ShieldAlert,
  Printer,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function ExamsManager({ showToast }) {
  const [exams, setExams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addQuestionsModalOpen, setAddQuestionsModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [proctorModalOpen, setProctorModalOpen] = useState(false);
  const [proctorLoading, setProctorLoading] = useState(false);
  const [proctorData, setProctorData] = useState(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    reason: 'Technical glitch / disconnection allowance',
    max_attempts: 2,
    valid_until: '',
  });
  
  // Selected Exam for actions
  const [activeExam, setActiveExam] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Question Selector Modal state
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [assignMarks, setAssignMarks] = useState('4.00');
  const [assignNegMarks, setAssignNegMarks] = useState('1.00');

  // Exam Form
  const [examForm, setExamForm] = useState({
    title: '',
    code: '',
    description: 'Instructions: Read questions carefully. Negative marking applies for wrong answers.',
    exam_mode: 'FLEXIBLE',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    duration_minutes: 180,
    passing_percentage: '35.00',
    enable_negative_marking: true,
    shuffle_questions: true,
    status: 'LIVE',
    selected_batches: [],
  });

  useEffect(() => {
    loadBatches();
    loadExams();
  }, [selectedStatus]);

  const loadBatches = async () => {
    try {
      const res = await examsApi.listBatches();
      setBatches(res.results || res);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await examsApi.listExams({ status: selectedStatus });
      setExams(res.results || res);
    } catch (err) {
      console.error('Error loading exams:', err);
      showToast?.('Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: examForm.title,
        code: examForm.code,
        description: examForm.description,
        exam_mode: examForm.exam_mode,
        start_time: new Date(examForm.start_time).toISOString(),
        end_time: new Date(examForm.end_time).toISOString(),
        duration_minutes: parseInt(examForm.duration_minutes),
        passing_percentage: examForm.passing_percentage,
        enable_negative_marking: examForm.enable_negative_marking,
        shuffle_questions: examForm.shuffle_questions,
        status: examForm.status,
        batches: examForm.selected_batches,
      };

      const created = await examsApi.createExam(payload);
      showToast?.('Exam scheduled successfully!', 'success');
      setCreateModalOpen(false);
      loadExams();
      
      // Prompt to add questions right away
      openAddQuestionsModal(created);
    } catch (err) {
      console.error('Error creating exam:', err);
      alert('Failed to schedule exam: ' + (err.message || 'Unknown error'));
    }
  };

  const openAddQuestionsModal = async (exam) => {
    setActiveExam(exam);
    try {
      const qRes = await examsApi.listQuestions();
      setBankQuestions(qRes.results || qRes);
      // Pre-select already assigned questions
      const examDetails = await examsApi.getExam(exam.id);
      const existingIds = (examDetails.exam_questions || []).map(eq => eq.question);
      setSelectedQuestionIds(existingIds);
      setAddQuestionsModalOpen(true);
    } catch (err) {
      console.error('Error loading questions for assignment:', err);
      showToast?.('Failed to load question bank', 'error');
    }
  };

  const handleSaveAssignedQuestions = async () => {
    if (!activeExam) return;
    try {
      await examsApi.addQuestionsToExam(
        activeExam.id, 
        selectedQuestionIds, 
        assignMarks, 
        assignNegMarks
      );
      showToast?.(`Assigned questions to ${activeExam.code}!`, 'success');
      setAddQuestionsModalOpen(false);
      loadExams();
    } catch (err) {
      console.error('Failed to assign questions:', err);
      alert('Failed to assign questions: ' + err.message);
    }
  };

  const handleTogglePublish = async (exam) => {
    const nextState = !exam.results_published;
    try {
      await examsApi.publishResults(exam.id, nextState);
      showToast?.(
        nextState 
          ? `Results published for ${exam.code}! Students can now view their rank & scorecards.` 
          : `Results hidden for ${exam.code}.`,
        'success'
      );
      loadExams();
    } catch (err) {
      showToast?.('Failed to update result publication status', 'error');
    }
  };

  const openAnalyticsModal = async (exam) => {
    setActiveExam(exam);
    setAnalyticsModalOpen(true);
    setAnalyticsLoading(true);
    try {
      const data = await examsApi.getExamAnalytics(exam.id);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      showToast?.('Failed to load exam analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRecalculateRanks = async () => {
    if (!activeExam) return;
    try {
      await examsApi.recalculateRanks(activeExam.id);
      showToast?.('Ranks & Percentiles recalculated!', 'success');
      const updated = await examsApi.getExamAnalytics(activeExam.id);
      setAnalyticsData(updated);
    } catch (err) {
      showToast?.('Failed to recalculate ranks', 'error');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam? All student attempts will also be deleted.')) {
      return;
    }
    try {
      await examsApi.deleteExam(id);
      showToast?.('Exam deleted', 'success');
      loadExams();
    } catch (err) {
      showToast?.('Failed to delete exam', 'error');
    }
  };

  const openProctorModal = async (exam) => {
    setActiveExam(exam);
    setProctorModalOpen(true);
    setProctorLoading(true);
    try {
      const data = await examsApi.getProctoringReport(exam.id);
      setProctorData(data);
    } catch (err) {
      console.error('Error loading proctoring report:', err);
      showToast?.('Failed to load proctoring report', 'error');
    } finally {
      setProctorLoading(false);
    }
  };

  const handleResetAttempt = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to reset all test attempts for ${studentName}? Their current submission will be removed and they can retake the test.`)) {
      return;
    }
    try {
      await examsApi.resetStudentAttempt(activeExam.id, {
        student_id: studentId,
        reason: 'Educator authorized reset from proctoring console'
      });
      showToast?.(`Attempt reset successfully for ${studentName}`, 'success');
      const updated = await examsApi.getProctoringReport(activeExam.id);
      setProctorData(updated);
      loadExams();
    } catch (err) {
      console.error('Error resetting attempt:', err);
      showToast?.('Failed to reset attempt: ' + (err.message || 'Error'), 'error');
    }
  };

  const openOverrideDialog = (student) => {
    setSelectedStudentForOverride(student);
    setOverrideForm({
      reason: 'Technical glitch / disconnection allowance',
      max_attempts: 2,
      valid_until: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16),
    });
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!activeExam || !selectedStudentForOverride) return;
    try {
      await examsApi.grantReattempt(activeExam.id, {
        student_id: selectedStudentForOverride.student_id,
        reason: overrideForm.reason,
        max_attempts: parseInt(overrideForm.max_attempts),
        valid_until: overrideForm.valid_until ? new Date(overrideForm.valid_until).toISOString() : null,
      });
      showToast?.(`Re-attempt override granted to ${selectedStudentForOverride.student_name}!`, 'success');
      setOverrideModalOpen(false);
      const updated = await examsApi.getProctoringReport(activeExam.id);
      setProctorData(updated);
    } catch (err) {
      console.error('Error granting override:', err);
      showToast?.('Failed to grant override: ' + (err.message || 'Error'), 'error');
    }
  };

  return (
    <div className="exams-manager-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-main">Exams & Assessment Center</h2>
          <p className="text-muted text-sm">
            Schedule live assessments, configure negative marking, publish scorecards, and analyze performance.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={16} className="mr-2" />
          Schedule New Exam
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['', 'LIVE', 'SCHEDULED', 'COMPLETED', 'DRAFT'].map(st => (
          <button 
            key={st}
            className={`btn btn-sm ${selectedStatus === st ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedStatus(st)}
          >
            {st === '' ? 'All Statuses' : st}
          </button>
        ))}
      </div>

      {/* Exams Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mb-2"></div>
          <p className="text-muted text-sm">Loading scheduled examinations...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={44} className="mx-auto text-muted mb-2 opacity-50" />
          <h3 className="font-semibold text-main mb-1">No examinations found</h3>
          <p className="text-muted text-sm mb-4">
            Schedule your first mock test or competitive assessment.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Schedule New Exam
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {exams.map(exam => (
            <div key={exam.id} className="card exam-row-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {exam.code}
                    </span>
                    <Badge variant={exam.status === 'LIVE' ? 'success' : exam.status === 'SCHEDULED' ? 'info' : 'secondary'} size="xs">
                      {exam.status}
                    </Badge>
                    {exam.results_published ? (
                      <Badge variant="purple" size="xs">Scorecards Published</Badge>
                    ) : (
                      <Badge variant="secondary" size="xs">Scorecards Hidden</Badge>
                    )}
                    {exam.enable_negative_marking && (
                      <span className="text-xs text-danger font-semibold bg-danger-light px-2 py-0.5 rounded border border-danger/30">
                        Negative Marking
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-main mb-1">{exam.title}</h3>
                  <p className="text-xs text-muted mb-3 line-clamp-2">{exam.description}</p>

                  <div className="flex items-center gap-6 text-xs text-muted">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={14} className="text-indigo" />
                      {exam.duration_minutes} Minutes
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <BookOpen size={14} className="text-emerald-600" />
                      {exam.question_count} Questions ({exam.total_marks} Marks)
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Users size={14} className="text-blue-600" />
                      {exam.attempt_count} Student Attempts
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Window: {new Date(exam.start_time).toLocaleDateString()} to {new Date(exam.end_time).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Operations & Analytics */}
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button 
                      type="button"
                      className="btn btn-sm btn-outline text-indigo"
                      onClick={() => openAddQuestionsModal(exam)}
                      title="Manage exam questions"
                    >
                      <Plus size={14} className="mr-1" />
                      Questions ({exam.question_count})
                    </button>

                    <button 
                      type="button"
                      className="btn btn-sm btn-outline text-secondary"
                      onClick={() => openProctorModal(exam)}
                      title="View live proctoring telemetry & integrity events"
                    >
                      <Shield size={14} className="mr-1 text-secondary" />
                      Proctoring
                    </button>

                    <button 
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => openAnalyticsModal(exam)}
                    >
                      <BarChart3 size={14} className="mr-1" />
                      Analytics & Ranks
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-1 flex-wrap">
                    <button 
                      type="button"
                      className={`btn btn-xs ${exam.results_published ? 'btn-outline text-purple-700' : 'btn-outline text-muted'}`}
                      onClick={() => handleTogglePublish(exam)}
                      title="Toggle student scorecard publication"
                    >
                      {exam.results_published ? 'Hide Results' : 'Publish Results'}
                    </button>

                    <a 
                      href={examsApi.getPrintableMeritListUrl(exam.id)} 
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-xs btn-outline text-primary font-semibold"
                      title="Open Official Print-Ready Master Merit List"
                    >
                      <Printer size={12} className="mr-1" />
                      Print Merit List
                    </a>

                    <a 
                      href={examsApi.exportResultsCsvUrl(exam.id)} 
                      download 
                      className="btn btn-xs btn-outline text-muted hover:text-main"
                      title="Export Merit List to CSV"
                    >
                      <Download size={12} className="mr-1" />
                      CSV
                    </a>

                    <button 
                      type="button"
                      className="btn-icon text-muted hover:text-danger ml-1"
                      onClick={() => handleDeleteExam(exam.id)}
                      title="Delete Exam"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {createModalOpen && (
        <Modal 
          isOpen={createModalOpen} 
          title="Schedule New Examination" 
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Exam Title</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. All India JEE Main Mock 02"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Exam Unique Code</label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. JEE-MOCK-02"
                  value={examForm.code}
                  onChange={(e) => setExamForm({ ...examForm, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Instructions & Rules for Students</label>
              <textarea 
                className="form-input text-xs"
                rows={2}
                value={examForm.description}
                onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Duration (Minutes)</label>
                <input 
                  type="number"
                  className="form-input"
                  value={examForm.duration_minutes}
                  onChange={(e) => setExamForm({ ...examForm, duration_minutes: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Passing Mark (%)</label>
                <input 
                  type="number"
                  className="form-input"
                  value={examForm.passing_percentage}
                  onChange={(e) => setExamForm({ ...examForm, passing_percentage: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Initial Status</label>
                <select 
                  className="form-input"
                  value={examForm.status}
                  onChange={(e) => setExamForm({ ...examForm, status: e.target.value })}
                >
                  <option value="LIVE">LIVE (Immediate Access)</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Start Time</label>
                <input 
                  type="datetime-local"
                  className="form-input"
                  value={examForm.start_time}
                  onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">End Time</label>
                <input 
                  type="datetime-local"
                  className="form-input"
                  value={examForm.end_time}
                  onChange={(e) => setExamForm({ ...examForm, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={examForm.enable_negative_marking}
                  onChange={(e) => setExamForm({ ...examForm, enable_negative_marking: e.target.checked })}
                />
                <span className="text-sm font-medium text-main">Enable Negative Marking</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={examForm.shuffle_questions}
                  onChange={(e) => setExamForm({ ...examForm, shuffle_questions: e.target.checked })}
                />
                <span className="text-sm font-medium text-main">Shuffle Questions per Student</span>
              </label>
            </div>

            <div>
              <label className="form-label">Eligible Batches (Leave empty for all batches)</label>
              <div className="flex flex-wrap gap-2">
                {batches.map(b => {
                  const isChecked = examForm.selected_batches.includes(b.id);
                  return (
                    <label key={b.id} className={`chip-checkbox px-3 py-1.5 rounded border text-xs cursor-pointer flex items-center gap-1.5 ${isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked 
                            ? examForm.selected_batches.filter(id => id !== b.id)
                            : [...examForm.selected_batches, b.id];
                          setExamForm({ ...examForm, selected_batches: next });
                        }}
                      />
                      <span>{b.name} ({b.code})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Schedule & Assign Questions
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD QUESTIONS MODAL */}
      {addQuestionsModalOpen && activeExam && (
        <Modal 
          isOpen={addQuestionsModalOpen} 
          title={`Assign Questions to Exam: ${activeExam.code}`} 
          onClose={() => setAddQuestionsModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-900 flex justify-between items-center">
              <span>Select questions to include in <strong>{activeExam.title}</strong></span>
              <span className="font-bold text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                Selected: {selectedQuestionIds.length} questions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Marks per Question</label>
                <input 
                  type="number"
                  step="0.25"
                  className="form-input"
                  value={assignMarks}
                  onChange={(e) => setAssignMarks(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Negative Marks per Wrong Answer</label>
                <input 
                  type="number"
                  step="0.25"
                  className="form-input"
                  value={assignNegMarks}
                  onChange={(e) => setAssignNegMarks(e.target.value)}
                />
              </div>
            </div>

            <div className="questions-selection-list max-h-80 overflow-y-auto flex flex-col gap-2 border rounded p-2">
              {bankQuestions.map((q, idx) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <label 
                    key={q.id}
                    className={`p-3 rounded border text-xs flex items-start gap-3 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/60 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="checkbox"
                      className="mt-1"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedQuestionIds(prev => 
                          isSelected ? prev.filter(id => id !== q.id) : [...prev, q.id]
                        );
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="purple" size="xs">{q.subject_code}</Badge>
                        <Badge variant="info" size="xs">{q.question_type}</Badge>
                        <Badge variant={q.difficulty === 'HARD' ? 'danger' : 'warning'} size="xs">{q.difficulty}</Badge>
                      </div>
                      <p className="font-medium text-slate-800 line-clamp-2">{q.question_text}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted">
                Calculated Exam Marks: {selectedQuestionIds.length * parseFloat(assignMarks || 0)} pts
              </span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setAddQuestionsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveAssignedQuestions}
                >
                  Save Question Assignments
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ANALYTICS & LEADERBOARD MODAL */}
      {analyticsModalOpen && activeExam && (
        <Modal 
          isOpen={analyticsModalOpen} 
          title={`Exam Analytics & Leaderboard: ${activeExam.title}`} 
          onClose={() => setAnalyticsModalOpen(false)}
        >
          {analyticsLoading ? (
            <div className="text-center py-12">
              <div className="spinner mb-2"></div>
              <p className="text-muted text-sm">Aggregating exam scores & calculating ranks...</p>
            </div>
          ) : analyticsData ? (
            <div className="flex flex-col gap-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center">
                  <div className="text-xs text-muted font-medium">Total Candidates</div>
                  <div className="text-xl font-bold text-blue-900">{analyticsData.total_attempts}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-center">
                  <div className="text-xs text-muted font-medium">Highest Score</div>
                  <div className="text-xl font-bold text-emerald-800">{analyticsData.highest_score}</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded text-center">
                  <div className="text-xs text-muted font-medium">Average Score</div>
                  <div className="text-xl font-bold text-purple-900">{analyticsData.average_score}</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
                  <div className="text-xs text-muted font-medium">Actual Passing Rate</div>
                  <div className="text-xl font-bold text-amber-900">{analyticsData.pass_percentage_actual}%</div>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-main flex items-center gap-1.5">
                    <Award size={16} className="text-amber-500" />
                    Top Rankers Merit List
                  </h4>
                  <button 
                    className="btn btn-xs btn-outline text-indigo"
                    onClick={handleRecalculateRanks}
                  >
                    <RefreshCw size={12} className="mr-1" />
                    Recalculate Ranks
                  </button>
                </div>

                {analyticsData.leaderboard.length > 0 ? (
                  <div className="table-responsive border rounded max-h-56 overflow-y-auto">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Student</th>
                          <th>Roll Number</th>
                          <th>Score</th>
                          <th>Percentile</th>
                          <th>Accuracy</th>
                          <th>Time</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.leaderboard.map(lb => (
                          <tr key={lb.rank + lb.username}>
                            <td>
                              <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold ${
                                lb.rank === 1 ? 'bg-amber-100 text-amber-800 font-extrabold' : 
                                lb.rank === 2 ? 'bg-slate-200 text-slate-800' : 
                                lb.rank === 3 ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
                              }`}>
                                #{lb.rank}
                              </span>
                            </td>
                            <td className="font-semibold text-main">{lb.student_name}</td>
                            <td className="font-mono text-muted">{lb.roll_number || '-'}</td>
                            <td>
                              <span className="font-bold text-indigo">{lb.score} / {lb.max_score}</span>
                            </td>
                            <td className="font-bold text-emerald-700">{lb.percentile}%</td>
                            <td className="text-muted">{lb.accuracy}%</td>
                            <td className="font-mono text-muted">{Math.floor(lb.time_spent_seconds / 60)}m {lb.time_spent_seconds % 60}s</td>
                            <td className="text-right">
                              {lb.attempt_id && (
                                <a 
                                  href={examsApi.getPrintableScorecardUrl(activeExam.id, lb.attempt_id)} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                                  title="Print Official NTA Scorecard"
                                >
                                  <Printer size={12} />
                                  <span>Scorecard</span>
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No evaluated student attempts recorded for this exam yet.</p>
                )}
              </div>

              {/* Question Discrimination Analysis */}
              {analyticsData.question_stats.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-main mb-2 flex items-center gap-1.5">
                    <HelpCircle size={16} className="text-indigo" />
                    Question Performance & Discrimination Index
                  </h4>
                  <div className="table-responsive border rounded max-h-52 overflow-y-auto">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Subject</th>
                          <th>Question</th>
                          <th>Difficulty</th>
                          <th>Students Correct</th>
                          <th>Accuracy %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.question_stats.map(qs => (
                          <tr key={qs.question_id}>
                            <td className="font-bold">{qs.order}</td>
                            <td><Badge variant="purple" size="xs">{qs.subject}</Badge></td>
                            <td className="line-clamp-1">{qs.question_text}</td>
                            <td><Badge variant={qs.difficulty === 'HARD' ? 'danger' : 'warning'} size="xs">{qs.difficulty}</Badge></td>
                            <td className="font-semibold">{qs.correct_count} / {qs.attempt_count}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${qs.accuracy_percentage > 70 ? 'bg-emerald-500' : qs.accuracy_percentage > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${qs.accuracy_percentage}%` }}
                                  />
                                </div>
                                <span className="font-mono">{qs.accuracy_percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-2 border-t pt-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <a 
                    href={examsApi.getPrintableMeritListUrl(activeExam.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm text-primary font-semibold"
                  >
                    <Printer size={14} className="mr-1" />
                    Print Master Merit List
                  </a>
                  <a 
                    href={examsApi.exportResultsCsvUrl(activeExam.id)}
                    download
                    className="btn btn-outline btn-sm text-muted"
                  >
                    <Download size={14} className="mr-1" />
                    CSV Export
                  </a>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setAnalyticsModalOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* PROCTORING & INTEGRITY AUDIT MODAL */}
      {proctorModalOpen && activeExam && (
        <Modal 
          isOpen={proctorModalOpen} 
          title={`Proctoring & Integrity Stream: ${activeExam.title}`} 
          onClose={() => setProctorModalOpen(false)}
        >
          {proctorLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-muted">Retrieving candidate proctoring events & security logs...</p>
            </div>
          ) : proctorData ? (
            <div className="flex flex-col gap-5 text-on-surface">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-surface-container-low border border-outline-variant rounded-xl text-center">
                  <span className="text-xs text-on-surface-variant font-medium block">Candidates Monitored</span>
                  <span className="text-xl font-bold text-on-surface">{proctorData.total_candidates}</span>
                </div>
                <div className="p-3 bg-error-container/60 border border-error/30 rounded-xl text-center">
                  <span className="text-xs text-error font-medium block">Flagged Integrity Risks</span>
                  <span className="text-xl font-bold text-error">{proctorData.flagged_candidates_count}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-center">
                  <span className="text-xs text-amber-900 font-medium block">Total Security Warnings</span>
                  <span className="text-xl font-bold text-amber-800">{proctorData.total_warnings_issued}</span>
                </div>
              </div>

              {/* Student Telemetry Table */}
              <div>
                <h4 className="font-bold text-sm text-on-surface mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-primary" />
                  Candidate Event Breakdown & Audit Controls
                </h4>

                {proctorData.attempts && proctorData.attempts.length > 0 ? (
                  <div className="border border-outline-variant rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                        <tr className="border-b border-outline-variant">
                          <th className="py-2.5 px-3">Candidate</th>
                          <th className="py-2.5 px-2 text-center">Tab Switches</th>
                          <th className="py-2.5 px-2 text-center">Fullscreen Exits</th>
                          <th className="py-2.5 px-2 text-center">Copy/Paste</th>
                          <th className="py-2.5 px-2 text-center">Integrity Status</th>
                          <th className="py-2.5 px-3 text-right">Overrides</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                        {proctorData.attempts.map((att) => (
                          <tr key={att.attempt_id} className="hover:bg-surface-container-low transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-on-surface">{att.student_name}</div>
                              <div className="text-[11px] text-on-surface-variant font-mono">Roll: {att.roll_number || att.username}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`font-mono font-bold ${att.tab_switch_count >= 3 ? 'text-error' : 'text-on-surface'}`}>
                                {att.tab_switch_count}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono">
                              {att.fullscreen_exit_count}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`font-mono font-bold ${att.copy_paste_count > 0 ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                                {att.copy_paste_count}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {att.is_flagged ? (
                                <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-bold text-[10px] uppercase">
                                  HIGH RISK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold text-[10px] uppercase">
                                  NORMAL
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  type="button"
                                  className="btn btn-xs btn-outline text-primary font-semibold"
                                  onClick={() => openOverrideDialog(att)}
                                  title="Grant re-attempt override without modifying global rules"
                                >
                                  <UserCheck size={12} className="mr-1" />
                                  Re-Attempt
                                </button>
                                <button 
                                  type="button"
                                  className="btn btn-xs btn-outline text-error hover:bg-error hover:text-white"
                                  onClick={() => handleResetAttempt(att.student_id, att.student_name)}
                                  title="Wipe submitted state and allow fresh attempt"
                                >
                                  <RotateCcw size={12} className="mr-1" />
                                  Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No proctoring attempts logged for this examination yet.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-outline-variant">
                <button 
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setProctorModalOpen(false)}
                >
                  Close Console
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* GRANT RE-ATTEMPT OVERRIDE MODAL */}
      {overrideModalOpen && selectedStudentForOverride && (
        <Modal 
          isOpen={overrideModalOpen} 
          title={`Grant Re-Attempt Override: ${selectedStudentForOverride.student_name}`} 
          onClose={() => setOverrideModalOpen(false)}
        >
          <form onSubmit={handleSaveOverride} className="flex flex-col gap-4 text-on-surface">
            <p className="text-xs text-on-surface-variant">
              This authorizes a single-student override for <strong>{selectedStudentForOverride.student_name}</strong> (Roll: {selectedStudentForOverride.roll_number || selectedStudentForOverride.username}) on <strong>{activeExam.title}</strong> without changing rules for other candidates in the batch.
            </p>

            <div>
              <label className="form-label text-xs font-bold">Reason for Retake Authorization</label>
              <input 
                type="text"
                className="form-input text-xs"
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                placeholder="e.g. Wi-Fi failure during submission window"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs font-bold">Allowed Max Attempts</label>
                <input 
                  type="number"
                  min="1"
                  max="5"
                  className="form-input text-xs font-mono font-bold"
                  value={overrideForm.max_attempts}
                  onChange={(e) => setOverrideForm({ ...overrideForm, max_attempts: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label text-xs font-bold">Valid Until (Optional)</label>
                <input 
                  type="datetime-local"
                  className="form-input text-xs"
                  value={overrideForm.valid_until}
                  onChange={(e) => setOverrideForm({ ...overrideForm, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <button 
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setOverrideModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary btn-sm font-bold"
              >
                Grant & Save Override
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

