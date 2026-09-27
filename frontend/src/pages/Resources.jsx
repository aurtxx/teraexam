import React, { useState, useEffect, useCallback } from 'react';
import { resourcesApi, usersApi } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { 
  PlusCircle, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  Filter,
  Layers
} from 'lucide-react';

export function Resources({ showToast }) {
  const [items, setItems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'General',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    summary: '',
    assigned_to: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resourcesApi.list({
        page,
        search,
        status: statusFilter,
        priority: priorityFilter,
      });
      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  const loadStaffUsers = async () => {
    try {
      const res = await usersApi.list({ is_staff: 'true', page_size: 50 });
      setUsersList(res.results || []);
    } catch (err) {
      console.warn('Could not load user list for assignment dropdown', err);
    }
  };

  useEffect(() => {
    fetchItems();
    loadStaffUsers();
  }, [fetchItems]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    setFormData({
      title: '',
      slug: '',
      category: 'General',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      summary: '',
      assigned_to: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      category: item.category,
      status: item.status,
      priority: item.priority,
      summary: item.summary || '',
      assigned_to: item.assigned_to ? String(item.assigned_to) : '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    const payload = {
      ...formData,
      assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
    };
    if (!payload.slug) {
      delete payload.slug;
    }

    try {
      if (modalMode === 'create') {
        await resourcesApi.create(payload);
        showToast('Resource item created in Django.', 'success');
      } else {
        await resourcesApi.update(selectedItem.id, payload);
        showToast(`Resource "${payload.title}" updated successfully.`, 'success');
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        setFormErrors(err.data);
      } else {
        showToast(err.message || 'Operation failed.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await resourcesApi.delete(itemToDelete.id);
      showToast(`Resource "${itemToDelete.title}" deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (err) {
      showToast(err.data?.detail || err.message || 'Failed to delete resource.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Operational Resource Items</h2>
          <p className="section-subheading">
            Manage system services, infrastructure components, and active administrative items.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <PlusCircle size={16} className="mr-2" />
          <span>New Resource</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by title, category, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-dropdown-group">
          <Filter size={16} className="text-muted mr-1" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            className="form-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <button
            className="btn btn-secondary btn-icon-only"
            onClick={fetchItems}
            title="Refresh resource list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert mt-4">
          <AlertTriangle size={18} className="mr-2 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="card table-card mt-4">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title & Slug</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned Staff</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <Loader2 size={24} className="animate-spin inline mr-2 text-primary" />
                    <span>Loading resources from Django REST API...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No resource records found matching filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <span className="font-semibold text-main block">{item.title}</span>
                        <span className="text-xs text-muted font-mono">{item.slug}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>
                      <Badge size="xs">{item.status}</Badge>
                    </td>
                    <td>
                      <Badge size="xs">{item.priority}</Badge>
                    </td>
                    <td className="text-sm">
                      {item.assigned_to_username ? (
                        <span className="font-medium text-main">@{item.assigned_to_username}</span>
                      ) : (
                        <span className="text-muted text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="action-buttons-group">
                        <button
                          className="btn-action-icon"
                          onClick={() => openEditModal(item)}
                          title="Edit resource"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-action-icon text-danger"
                          onClick={() => openDeleteModal(item)}
                          title="Delete resource"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          count={count}
          currentPage={page}
          pageSize={10}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create New Resource' : `Edit: ${selectedItem?.title}`}
      >
        <form onSubmit={handleFormSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Resource Title <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className={`form-input ${formErrors.title ? 'input-error' : ''}`}
              placeholder="e.g., Redis Cache Instance"
              value={formData.title}
              onChange={handleFormChange}
              required
            />
            {formErrors.title && (
              <span className="field-error-msg">{formErrors.title[0] || formErrors.title}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="slug">
                Custom Slug <span className="text-muted text-xs">(auto-generated if empty)</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                className={`form-input font-mono text-sm ${formErrors.slug ? 'input-error' : ''}`}
                placeholder="redis-cache-instance"
                value={formData.slug}
                onChange={handleFormChange}
              />
              {formErrors.slug && (
                <span className="field-error-msg">{formErrors.slug[0] || formErrors.slug}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <input
                id="category"
                name="category"
                type="text"
                className="form-input"
                placeholder="Infrastructure, Security, etc."
                value={formData.category}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleFormChange}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleFormChange}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="assigned_to">Assignee (Staff User)</label>
            <select
              id="assigned_to"
              name="assigned_to"
              className="form-select"
              value={formData.assigned_to}
              onChange={handleFormChange}
            >
              <option value="">Unassigned</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} {u.first_name ? `(${u.first_name} ${u.last_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="summary">Description / Notes</label>
            <textarea
              id="summary"
              name="summary"
              rows={3}
              className="form-textarea"
              placeholder="Operational details and architecture notes..."
              value={formData.summary}
              onChange={handleFormChange}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{modalMode === 'create' ? 'Create Resource' : 'Save Changes'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        maxWidth="440px"
      >
        <div className="delete-modal-body">
          <AlertTriangle size={36} className="text-danger mb-3" />
          <p className="delete-warning-text">
            Are you sure you want to delete resource <strong>{itemToDelete?.title}</strong>?
          </p>
          <p className="delete-subwarning-text">
            This operational record will be permanently deleted from the Django database.
          </p>
          <div className="modal-footer mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Yes, Delete Resource</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
