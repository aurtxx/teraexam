import React, { useState, useEffect } from 'react';
import { examsApi } from '../../api/client';
import { 
  HelpCircle, 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Download,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function QuestionBank({ showToast }) {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState({});

  // Question Form State
  const [formData, setFormData] = useState({
    subject: '',
    question_text: '',
    question_type: 'MCQ_SINGLE',
    difficulty: 'MEDIUM',
    default_marks: '4.00',
    default_negative_marks: '1.00',
    explanation: '',
    tags: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    correct_single: 'A',
    correct_multi: ['A'],
    numerical_value: '',
    numerical_tolerance: '0.05',
    true_false_val: 'TRUE',
  });

  // Bulk CSV state
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    loadSubjects();
    loadQuestions();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedDifficulty, selectedType, search]);

  const loadSubjects = async () => {
    try {
      const res = await examsApi.listSubjects();
      setSubjects(res.results || res);
      if (res.length > 0 && !formData.subject) {
        setFormData(prev => ({ ...prev, subject: res[0].id }));
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await examsApi.listQuestions({
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        question_type: selectedType,
        search: search.trim(),
      });
      setQuestions(res.results || res);
    } catch (err) {
      console.error('Error fetching questions:', err);
      showToast?.('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExplanation = (qid) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [qid]: !prev[qid]
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question? It will be removed from all future exams.')) {
      return;
    }
    try {
      await examsApi.deleteQuestion(id);
      showToast?.('Question deleted successfully', 'success');
      loadQuestions();
    } catch (err) {
      showToast?.('Failed to delete question', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.question_text.trim()) {
      alert('Question text is required');
      return;
    }

    let formattedCorrectAnswers = [];
    if (formData.question_type === 'MCQ_SINGLE') {
      formattedCorrectAnswers = [formData.correct_single];
    } else if (formData.question_type === 'MCQ_MULTI') {
      formattedCorrectAnswers = formData.correct_multi;
    } else if (formData.question_type === 'TRUE_FALSE') {
      formattedCorrectAnswers = [formData.true_false_val];
    } else if (formData.question_type === 'NUMERICAL') {
      formattedCorrectAnswers = {
        value: parseFloat(formData.numerical_value || 0),
        tolerance: parseFloat(formData.numerical_tolerance || 0.05),
      };
    }

    const payload = {
      subject: formData.subject || (subjects[0] ? subjects[0].id : null),
      question_text: formData.question_text,
      question_type: formData.question_type,
      difficulty: formData.difficulty,
      default_marks: formData.default_marks,
      default_negative_marks: formData.default_negative_marks,
      explanation: formData.explanation,
      options: ['MCQ_SINGLE', 'MCQ_MULTI'].includes(formData.question_type) 
        ? formData.options.filter(o => o.text.trim())
        : (formData.question_type === 'TRUE_FALSE' ? [{ id: 'TRUE', text: 'True' }, { id: 'FALSE', text: 'False' }] : []),
      correct_answers: formattedCorrectAnswers,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
    };

    try {
      await examsApi.createQuestion(payload);
      showToast?.('Question created in Question Bank!', 'success');
      setCreateModalOpen(false);
      loadQuestions();
      // Reset form
      setFormData({
        subject: subjects[0]?.id || '',
        question_text: '',
        question_type: 'MCQ_SINGLE',
        difficulty: 'MEDIUM',
        default_marks: '4.00',
        default_negative_marks: '1.00',
        explanation: '',
        tags: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correct_single: 'A',
        correct_multi: ['A'],
        numerical_value: '',
        numerical_tolerance: '0.05',
        true_false_val: 'TRUE',
      });
    } catch (err) {
      console.error('Error creating question:', err);
      alert('Failed to save question: ' + (err.message || 'Unknown error'));
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      alert('Please enter or paste CSV content');
      return;
    }
    try {
      setImporting(true);
      const res = await examsApi.bulkImportQuestions(csvText);
      setBulkResult(res);
      if (res.created_count > 0) {
        showToast?.(`Imported ${res.created_count} questions successfully!`, 'success');
        loadQuestions();
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const toggleMultiSelect = (optId) => {
    setFormData(prev => {
      const exists = prev.correct_multi.includes(optId);
      const next = exists 
        ? prev.correct_multi.filter(x => x !== optId) 
        : [...prev.correct_multi, optId];
      return { ...prev, correct_multi: next };
    });
  };

  return (
    <div className="question-bank-page">
      {/* Header and Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-main">Central Question Bank</h2>
          <p className="text-muted text-sm">
            Curate, tag, and organize multi-format questions for mock exams and test series.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline"
            onClick={() => {
              setBulkResult(null);
              setBulkModalOpen(true);
            }}
          >
            <Upload size={16} className="mr-2" />
            Bulk CSV Import
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            New Question
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar card p-4 mb-6">
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted" />
            <input 
              type="text"
              placeholder="Search question text or solution..."
              className="form-input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <select 
              className="form-input"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects ({subjects.length})</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              className="form-input"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Question Types</option>
              <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
              <option value="MCQ_MULTI">Multiple Correct (MSQ)</option>
              <option value="NUMERICAL">Numerical Value</option>
              <option value="TRUE_FALSE">True / False</option>
            </select>
          </div>

          <div>
            <select 
              className="form-input"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Cards Feed */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mb-2"></div>
          <p className="text-muted text-sm">Loading questions from repository...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card empty-state text-center py-12">
          <HelpCircle size={44} className="mx-auto text-muted mb-2 opacity-50" />
          <h3 className="font-semibold text-main mb-1">No questions found</h3>
          <p className="text-muted text-sm mb-4">
            Create your first question or import question sets using CSV templates.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Create First Question
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => {
            const isExpanded = Boolean(expandedExplanations[q.id]);
            return (
              <div key={q.id} className="card question-card p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-indigo bg-indigo-50 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <Badge variant="purple" size="xs">
                      {q.subject_name} ({q.subject_code})
                    </Badge>
                    <Badge variant={q.difficulty === 'HARD' ? 'danger' : q.difficulty === 'MEDIUM' ? 'warning' : 'success'} size="xs">
                      {q.difficulty}
                    </Badge>
                    <Badge variant="info" size="xs">
                      {q.question_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      +{parseFloat(q.default_marks)} / -{parseFloat(q.default_negative_marks)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      className="btn-icon text-muted hover:text-danger"
                      onClick={() => handleDelete(q.id)}
                      title="Delete Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="question-body text-main text-base font-medium mb-4 whitespace-pre-wrap">
                  {q.question_text}
                </div>

                {/* Options / Answer Keys Preview */}
                {q.options && q.options.length > 0 && (
                  <div className="options-preview-grid grid grid-cols-2 gap-2 mb-4">
                    {q.options.map(opt => {
                      const isCorrect = Array.isArray(q.correct_answers) && q.correct_answers.includes(opt.id);
                      return (
                        <div 
                          key={opt.id}
                          className={`option-chip p-2.5 rounded border text-sm flex items-center gap-2 ${
                            isCorrect 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium' 
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`option-letter w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                          {isCorrect && <Check size={16} className="text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical / True-False answer display */}
                {q.question_type === 'NUMERICAL' && (
                  <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-sm mb-4 text-blue-900 flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-600" />
                    <span>Target Value: <strong>{q.correct_answers?.value ?? JSON.stringify(q.correct_answers)}</strong> (±{q.correct_answers?.tolerance ?? 0.05} tolerance)</span>
                  </div>
                )}

                {/* Explanation Toggle */}
                {q.explanation && (
                  <div className="mt-2 border-t pt-3">
                    <button 
                      className="text-xs font-semibold text-indigo flex items-center gap-1 hover:underline"
                      onClick={() => toggleExplanation(q.id)}
                    >
                      <span>{isExpanded ? 'Hide Solution' : 'View Teacher Solution & Explanation'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isExpanded && (
                      <div className="solution-box mt-2 p-3 bg-indigo-50/60 rounded border border-indigo-100 text-sm text-slate-800">
                        <strong className="block text-indigo-900 text-xs mb-1 uppercase tracking-wide">Detailed Solution:</strong>
                        <p className="whitespace-pre-wrap">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE QUESTION MODAL */}
      {createModalOpen && (
        <Modal 
          isOpen={createModalOpen} 
          title="Create Question in Bank" 
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Subject</label>
                <select 
                  className="form-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Question Type</label>
                <select 
                  className="form-input"
                  value={formData.question_type}
                  onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                >
                  <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
                  <option value="MCQ_MULTI">Multiple Choice (MSQ)</option>
                  <option value="NUMERICAL">Numerical Value</option>
                  <option value="TRUE_FALSE">True / False</option>
                </select>
              </div>

              <div>
                <label className="form-label">Difficulty</label>
                <select 
                  className="form-input"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Question Text (Markdown & LaTeX supported)</label>
              <textarea 
                className="form-input"
                rows={4}
                placeholder="Enter detailed question statement..."
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                required
              />
            </div>

            {/* Dynamic Options for MCQ */}
            {['MCQ_SINGLE', 'MCQ_MULTI'].includes(formData.question_type) && (
              <div className="options-builder bg-slate-50 p-4 rounded border">
                <label className="form-label mb-2">Options & Correct Key</label>
                <div className="flex flex-col gap-2">
                  {formData.options.map((opt, i) => {
                    const isSingleSelected = formData.correct_single === opt.id;
                    const isMultiSelected = formData.correct_multi.includes(opt.id);
                    return (
                      <div key={opt.id} className="flex items-center gap-2">
                        {formData.question_type === 'MCQ_SINGLE' ? (
                          <input 
                            type="radio"
                            name="correct_single"
                            checked={isSingleSelected}
                            onChange={() => setFormData({ ...formData, correct_single: opt.id })}
                            title="Mark as correct answer"
                          />
                        ) : (
                          <input 
                            type="checkbox"
                            checked={isMultiSelected}
                            onChange={() => toggleMultiSelect(opt.id)}
                            title="Toggle correct answer"
                          />
                        )}
                        <span className="font-bold text-sm w-5">{opt.id}</span>
                        <input 
                          type="text"
                          className="form-input flex-1"
                          placeholder={`Option ${opt.id} text`}
                          value={opt.text}
                          onChange={(e) => {
                            const newOpts = [...formData.options];
                            newOpts[i].text = e.target.value;
                            setFormData({ ...formData, options: newOpts });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-2">
                  Select the radio/checkbox next to the correct answer.
                </p>
              </div>
            )}

            {/* Numerical Target */}
            {formData.question_type === 'NUMERICAL' && (
              <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded border border-blue-200">
                <div>
                  <label className="form-label">Correct Numerical Value</label>
                  <input 
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 15.91"
                    value={formData.numerical_value}
                    onChange={(e) => setFormData({ ...formData, numerical_value: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Acceptable Tolerance (±)</label>
                  <input 
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 0.05"
                    value={formData.numerical_tolerance}
                    onChange={(e) => setFormData({ ...formData, numerical_tolerance: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* True False */}
            {formData.question_type === 'TRUE_FALSE' && (
              <div className="bg-slate-50 p-3 rounded border">
                <label className="form-label">Correct Option</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="tf_correct" 
                      checked={formData.true_false_val === 'TRUE'}
                      onChange={() => setFormData({ ...formData, true_false_val: 'TRUE' })}
                    />
                    <span>True</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="tf_correct" 
                      checked={formData.true_false_val === 'FALSE'}
                      onChange={() => setFormData({ ...formData, true_false_val: 'FALSE' })}
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Default Marks (+)</label>
                <input 
                  type="number"
                  step="0.25"
                  className="form-input"
                  value={formData.default_marks}
                  onChange={(e) => setFormData({ ...formData, default_marks: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Negative Marks (-)</label>
                <input 
                  type="number"
                  step="0.25"
                  className="form-input"
                  value={formData.default_negative_marks}
                  onChange={(e) => setFormData({ ...formData, default_negative_marks: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Step-by-Step Solution / Explanation</label>
              <textarea 
                className="form-input"
                rows={3}
                placeholder="Explain the concepts and calculations for student feedback..."
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              />
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
                Save to Question Bank
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {bulkModalOpen && (
        <Modal 
          isOpen={bulkModalOpen} 
          title="Bulk Import Questions via CSV" 
          onClose={() => setBulkModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <FileSpreadsheet size={16} />
                Supported CSV Format:
              </p>
              <code className="text-xs block font-mono bg-white p-2 rounded border border-blue-100 mt-1">
                subject_code,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
              </code>
            </div>

            <div>
              <label className="form-label">Paste CSV Content Below</label>
              <textarea 
                className="form-input font-mono text-xs"
                rows={8}
                placeholder={`PHY,"What is the SI unit of force?",MCQ_SINGLE,EASY,Newton,Joule,Pascal,Watt,A,4.00,1.00,"Newton is named after Sir Isaac Newton."\nMTH,"Evaluate limit of sin(x)/x as x->0",NUMERICAL,EASY,,,,,1.0,4.00,0.00,"Standard limit"`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>

            {bulkResult && (
              <div className={`p-3 rounded border text-sm ${bulkResult.created_count > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-danger-light border-danger text-danger'}`}>
                <p className="font-bold">
                  {bulkResult.created_count > 0 ? `Successfully imported ${bulkResult.created_count} questions!` : 'No questions were imported.'}
                </p>
                {bulkResult.errors && bulkResult.errors.length > 0 && (
                  <ul className="text-xs mt-1 list-disc pl-4 text-danger">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <a 
                href="/api/questions/sample_csv/" 
                download 
                className="btn btn-outline btn-sm text-indigo"
              >
                <Download size={14} className="mr-1" />
                Download Sample CSV Template
              </a>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setBulkModalOpen(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleBulkImport}
                  disabled={importing}
                >
                  {importing ? 'Processing CSV...' : 'Import Questions'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
