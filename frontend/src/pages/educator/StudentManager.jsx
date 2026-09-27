import React, { useState, useEffect } from 'react';
import { examsApi } from '../../api/client';
import { 
  Users, 
  Plus, 
  Upload, 
  Search, 
  FileSpreadsheet, 
  Download, 
  FolderPlus, 
  GraduationCap, 
  Phone, 
  Mail,
  UserCheck
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function StudentManager({ showToast }) {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  // Modals
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Forms
  const [enrollForm, setEnrollForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: 'StudentPass123!',
    roll_number: '',
    phone: '',
    batch_id: '',
  });

  const [batchForm, setBatchForm] = useState({
    name: '',
    code: '',
    description: '',
    academic_year: '2025-2026',
  });

  // Bulk CSV state
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    loadBatches();
    loadStudents();
  }, []);

  const loadBatches = async () => {
    try {
      const res = await examsApi.listBatches();
      setBatches(res.results || res);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await examsApi.listStudents();
      setStudents(res.results || res);
    } catch (err) {
      console.error('Error fetching students:', err);
      showToast?.('Failed to load students roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    try {
      await examsApi.enrollStudent(enrollForm);
      showToast?.(`Student ${enrollForm.username} enrolled successfully!`, 'success');
      setEnrollModalOpen(false);
      loadStudents();
      loadBatches();
      setEnrollForm({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: 'StudentPass123!',
        roll_number: '',
        phone: '',
        batch_id: '',
      });
    } catch (err) {
      alert('Enrollment failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await examsApi.createBatch(batchForm);
      showToast?.(`Batch ${batchForm.name} created!`, 'success');
      setBatchModalOpen(false);
      loadBatches();
      setBatchForm({ name: '', code: '', description: '', academic_year: '2025-2026' });
    } catch (err) {
      alert('Failed to create batch: ' + (err.message || 'Unknown error'));
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      alert('Please provide CSV data');
      return;
    }
    try {
      setImporting(true);
      const res = await examsApi.bulkImportStudents(csvText);
      setBulkResult(res);
      if (res.created_count > 0) {
        showToast?.(`Successfully imported ${res.created_count} students!`, 'success');
        loadStudents();
        loadBatches();
      }
    } catch (err) {
      alert('Bulk import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = !search || 
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase());
    const matchesBatch = !selectedBatch || (s.batch && s.batch.toString() === selectedBatch);
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="student-manager-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-main">Student Roster & Batches</h2>
          <p className="text-muted text-sm">
            Organize students into coaching batches, manage roll numbers, and bulk import rosters.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline"
            onClick={() => setBatchModalOpen(true)}
          >
            <FolderPlus size={16} className="mr-2" />
            Create Batch
          </button>
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
            onClick={() => setEnrollModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Batches Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {batches.map(b => (
          <div 
            key={b.id} 
            className={`card p-4 cursor-pointer transition border ${selectedBatch === b.id.toString() ? 'border-indigo-600 bg-indigo-50/30' : 'hover:border-slate-300'}`}
            onClick={() => setSelectedBatch(prev => prev === b.id.toString() ? '' : b.id.toString())}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold text-indigo bg-indigo-50 px-2 py-0.5 rounded">
                {b.code}
              </span>
              <span className="text-xs text-muted font-medium">{b.academic_year}</span>
            </div>
            <h4 className="font-bold text-sm text-main mb-1">{b.name}</h4>
            <div className="flex items-center justify-between text-xs text-muted mt-2">
              <span className="flex items-center gap-1">
                <Users size={14} className="text-blue-600" />
                {b.student_count} Enrolled Students
              </span>
              {selectedBatch === b.id.toString() && (
                <span className="text-indigo font-semibold">Filtered (Click to reset)</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input 
            type="text"
            className="form-input pl-9"
            placeholder="Search by student name, roll number, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-64">
          <select 
            className="form-input"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">All Batches ({batches.length})</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mb-2"></div>
          <p className="text-muted text-sm">Loading student directory...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card text-center py-12">
          <GraduationCap size={44} className="mx-auto text-muted mb-2 opacity-50" />
          <h3 className="font-semibold text-main mb-1">No students found</h3>
          <p className="text-muted text-sm mb-4">
            Enroll students manually or import an entire batch via CSV.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setEnrollModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Enroll Student
          </button>
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Enrolled Batch</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(stu => (
                <tr key={stu.id}>
                  <td className="font-mono font-bold text-indigo">{stu.roll_number || 'STU-' + stu.id}</td>
                  <td className="font-medium text-main">
                    {stu.first_name} {stu.last_name}
                  </td>
                  <td className="text-muted text-sm font-mono">{stu.username}</td>
                  <td>
                    <Badge variant="purple" size="xs">
                      {stu.batch_name || 'General Batch'}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted">
                    {stu.phone && <div className="flex items-center gap-1"><Phone size={12} /> {stu.phone}</div>}
                    {stu.email && <div className="flex items-center gap-1"><Mail size={12} /> {stu.email}</div>}
                  </td>
                  <td>
                    <Badge variant="success" size="xs">ACTIVE</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ENROLL STUDENT MODAL */}
      {enrollModalOpen && (
        <Modal 
          isOpen={enrollModalOpen} 
          title="Enroll Single Student" 
          onClose={() => setEnrollModalOpen(false)}
        >
          <form onSubmit={handleEnrollSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">First Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Arjun"
                  value={enrollForm.first_name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mehta"
                  value={enrollForm.last_name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Username</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. arjun_mehta"
                  value={enrollForm.username}
                  onChange={(e) => setEnrollForm({ ...enrollForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Roll Number</label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. APEX-2026-005"
                  value={enrollForm.roll_number}
                  onChange={(e) => setEnrollForm({ ...enrollForm, roll_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Email</label>
                <input 
                  type="email"
                  className="form-input"
                  placeholder="arjun@example.com"
                  value={enrollForm.email}
                  onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={enrollForm.phone}
                  onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Assign Batch</label>
                <select 
                  className="form-input"
                  value={enrollForm.batch_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, batch_id: e.target.value })}
                >
                  <option value="">Select Batch (Optional)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Initial Password</label>
                <input 
                  type="password"
                  className="form-input"
                  value={enrollForm.password}
                  onChange={(e) => setEnrollForm({ ...enrollForm, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setEnrollModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Enroll Student
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE BATCH MODAL */}
      {batchModalOpen && (
        <Modal 
          isOpen={batchModalOpen} 
          title="Create New Coaching Batch" 
          onClose={() => setBatchModalOpen(false)}
        >
          <form onSubmit={handleBatchSubmit} className="flex flex-col gap-4">
            <div>
              <label className="form-label">Batch Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Target JEE Advanced 2027 - Super 30"
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Batch Code</label>
                <input 
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. JEE-ADV-27"
                  value={batchForm.code}
                  onChange={(e) => setBatchForm({ ...batchForm, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Academic Year</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="2026-2027"
                  value={batchForm.academic_year}
                  onChange={(e) => setBatchForm({ ...batchForm, academic_year: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Batch Description</label>
              <textarea 
                className="form-input"
                rows={2}
                placeholder="Details regarding syllabus coverage and test schedules..."
                value={batchForm.description}
                onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setBatchModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Batch
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {bulkModalOpen && (
        <Modal 
          isOpen={bulkModalOpen} 
          title="Bulk Import Students via CSV" 
          onClose={() => setBulkModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <FileSpreadsheet size={16} />
                Supported CSV Format:
              </p>
              <code className="text-xs block font-mono bg-white p-2 rounded border border-blue-100 mt-1">
                username,email,first_name,last_name,password,roll_number,batch_code,phone
              </code>
            </div>

            <div>
              <label className="form-label">Paste CSV Content Below</label>
              <textarea 
                className="form-input font-mono text-xs"
                rows={8}
                placeholder={`rahul_kumar,rahul@example.com,Rahul,Kumar,StudentPass123!,JEE26-005,JEE-ALPHA-26,9876543210\npriya_sharma,priya@example.com,Priya,Sharma,StudentPass123!,JEE26-006,JEE-ALPHA-26,9876543211`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>

            {bulkResult && (
              <div className={`p-3 rounded border text-sm ${bulkResult.created_count > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-danger-light border-danger text-danger'}`}>
                <p className="font-bold">
                  {bulkResult.created_count > 0 ? `Successfully imported ${bulkResult.created_count} students!` : 'No students were imported.'}
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
                href="/api/students/sample_csv/" 
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
                  {importing ? 'Importing Students...' : 'Import Students'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
