import React, { useState, useEffect } from 'react';
import { examsApi } from '../../api/client';
import { Bell, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export function AnnouncementsManager({ showToast }) {
  const [announcements, setAnnouncements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    target_batches: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [annRes, batchRes] = await Promise.all([
        examsApi.listAnnouncements(),
        examsApi.listBatches()
      ]);
      setAnnouncements(annRes.results || annRes || []);
      setBatches(batchRes.results || batchRes || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await examsApi.createAnnouncement(form);
      showToast?.('Announcement published to student portal!', 'success');
      setCreateModalOpen(false);
      loadData();
      setForm({ title: '', content: '', priority: 'NORMAL', target_batches: [] });
    } catch (err) {
      alert('Failed to post announcement: ' + err.message);
    }
  };

  return (
    <div className="announcements-page max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-main">Institute Announcements & Notices</h2>
          <p className="text-muted text-sm">
            Communicate mock exam dates, syllabus revisions, and admit card notices to students.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={16} className="mr-2" />
          Post Announcement
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mb-2"></div>
          <p className="text-muted text-sm">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={44} className="mx-auto text-muted mb-2 opacity-50" />
          <h3 className="font-semibold text-main mb-1">No announcements posted yet</h3>
          <p className="text-muted text-sm mb-4">
            Post your first announcement to notify students across all batches.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Post Announcement
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map(ann => (
            <div key={ann.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-main">{ann.title}</h3>
                  <Badge variant={ann.priority === 'URGENT' ? 'danger' : ann.priority === 'HIGH' ? 'warning' : 'info'} size="xs">
                    {ann.priority}
                  </Badge>
                </div>
                <span className="text-xs text-muted flex items-center gap-1">
                  <Calendar size={13} />
                  {new Date(ann.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{ann.content}</p>

              <div className="flex items-center justify-between text-xs text-muted border-t pt-2">
                <span>Posted by: <strong>{ann.created_by_name || 'Institute Faculty'}</strong></span>
                <span>
                  Target: {ann.batch_names && ann.batch_names.length > 0 ? ann.batch_names.join(', ') : 'All Batches'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {createModalOpen && (
        <Modal 
          isOpen={createModalOpen} 
          title="Post Announcement to Students" 
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="form-label">Announcement Title</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Admit cards released for Mock #01"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">Priority Level</label>
              <select 
                className="form-input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="NORMAL">Normal Notice</option>
                <option value="HIGH">High / Important Notice</option>
                <option value="URGENT">Urgent Exam Alert</option>
              </select>
            </div>

            <div>
              <label className="form-label">Notice Message Details</label>
              <textarea 
                className="form-input"
                rows={4}
                placeholder="Write message for students..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">Target Batches (Leave empty for All Students)</label>
              <div className="flex flex-wrap gap-2">
                {batches.map(b => {
                  const isChecked = form.target_batches.includes(b.id);
                  return (
                    <label key={b.id} className={`chip-checkbox px-2.5 py-1 rounded border text-xs cursor-pointer ${isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' : 'bg-white'}`}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked 
                            ? form.target_batches.filter(id => id !== b.id)
                            : [...form.target_batches, b.id];
                          setForm({ ...form, target_batches: next });
                        }}
                      />
                      <span className="ml-1">{b.name}</span>
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
                Post Announcement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
