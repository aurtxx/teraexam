import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle,
  Loader2,
  ShieldCheck,
  Shield,
  Filter
} from 'lucide-react';

export function Users({ showToast }) {
  const { user: currentUser, isSuperuser } = useAuth();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_staff: false,
    is_superuser: false,
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list({
        page,
        search,
        is_staff: staffFilter,
      });
      setUsers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Failed to load user list.');
    } finally {
      setLoading(false);
    }
  }, [page, search, staffFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      is_staff: true,
      is_superuser: false,
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (targetUser) => {
    setModalMode('edit');
    setSelectedUser(targetUser);
    setFormData({
      username: targetUser.username,
      email: targetUser.email || '',
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      password: '',
      is_staff: targetUser.is_staff,
      is_superuser: targetUser.is_superuser,
      is_active: targetUser.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    const payload = { ...formData };
    if (modalMode === 'edit' && !payload.password) {
      delete payload.password;
    }

    try {
      if (modalMode === 'create') {
        await usersApi.create(payload);
        showToast('User created successfully in Django.', 'success');
      } else {
        await usersApi.update(selectedUser.id, payload);
        showToast(`User ${payload.username} updated successfully.`, 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
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

  const openDeleteModal = (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      showToast('You cannot delete your own administrative account.', 'error');
      return;
    }
    setUserToDelete(targetUser);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await usersApi.delete(userToDelete.id);
      showToast(`User ${userToDelete.username} deleted successfully.`, 'success');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      showToast(err.data?.detail || err.message || 'Failed to delete user.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">User Directory & Roles</h2>
          <p className="section-subheading">
            Manage Django administrative staff, superusers, and user access controls.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={16} className="mr-2" />
          <span>New User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by username, email, or name..."
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
            value={staffFilter}
            onChange={(e) => {
              setStaffFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Account Types</option>
            <option value="true">Staff / Admins Only</option>
            <option value="false">Regular Users Only</option>
          </select>

          <button
            className="btn btn-secondary btn-icon-only"
            onClick={fetchUsers}
            title="Refresh user list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
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
                <th>Username</th>
                <th>Full Name & Email</th>
                <th>Privileges</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Loader2 size={24} className="animate-spin inline mr-2 text-primary" />
                    <span>Loading users from Django...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    No users matching the current filter criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={isCurrent ? 'row-highlight' : ''}>
                      <td>
                        <div className="user-table-cell">
                          <span className="user-table-avatar">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-semibold text-main">{u.username}</span>
                            {isCurrent && (
                              <span className="text-xs text-primary font-medium block">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>{u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : '—'}</div>
                          <div className="text-muted text-xs">{u.email || 'No email set'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="badge-group">
                          {u.is_superuser && (
                            <Badge variant="purple" size="xs">
                              <ShieldCheck size={12} className="inline mr-1" /> Superuser
                            </Badge>
                          )}
                          {u.is_staff && !u.is_superuser && (
                            <Badge variant="info" size="xs">
                              <Shield size={12} className="inline mr-1" /> Staff
                            </Badge>
                          )}
                          {!u.is_staff && !u.is_superuser && (
                            <Badge variant="default" size="xs">Regular</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        {u.is_active ? (
                          <Badge variant="success" size="xs">Active</Badge>
                        ) : (
                          <Badge variant="danger" size="xs">Disabled</Badge>
                        )}
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="btn-action-icon"
                            onClick={() => openEditModal(u)}
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-action-icon text-danger"
                            onClick={() => openDeleteModal(u)}
                            title={isCurrent ? 'Cannot delete self' : 'Delete user'}
                            disabled={isCurrent}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
        title={modalMode === 'create' ? 'Create New User' : `Edit User: ${selectedUser?.username}`}
      >
        <form onSubmit={handleFormSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username <span className="text-danger">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-input ${formErrors.username ? 'input-error' : ''}`}
              value={formData.username}
              onChange={handleFormChange}
              required
            />
            {formErrors.username && (
              <span className="field-error-msg">{formErrors.username[0] || formErrors.username}</span>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className="form-input"
                value={formData.first_name}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                className="form-input"
                value={formData.last_name}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${formErrors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleFormChange}
            />
            {formErrors.email && (
              <span className="field-error-msg">{formErrors.email[0] || formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password {modalMode === 'create' ? <span className="text-danger">*</span> : <span className="text-muted text-xs">(leave blank to keep unchanged)</span>}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${formErrors.password ? 'input-error' : ''}`}
              placeholder={modalMode === 'create' ? 'Min 6 characters' : '••••••••'}
              value={formData.password}
              onChange={handleFormChange}
              required={modalMode === 'create'}
            />
            {formErrors.password && (
              <span className="field-error-msg">{formErrors.password[0] || formErrors.password}</span>
            )}
          </div>

          <div className="permissions-checkbox-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="is_staff"
                checked={formData.is_staff}
                onChange={handleFormChange}
              />
              <div>
                <span className="checkbox-label font-semibold">Staff Status</span>
                <span className="checkbox-subtext">Allows access to this React Admin dashboard</span>
              </div>
            </label>

            {isSuperuser && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="is_superuser"
                  checked={formData.is_superuser}
                  onChange={handleFormChange}
                />
                <div>
                  <span className="checkbox-label font-semibold">Superuser Status</span>
                  <span className="checkbox-subtext">Grants all permissions without explicitly assigning them</span>
                </div>
              </label>
            )}

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleFormChange}
              />
              <div>
                <span className="checkbox-label font-semibold">Active Account</span>
                <span className="checkbox-subtext">Uncheck to immediately suspend access</span>
              </div>
            </label>
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
                <span>{modalMode === 'create' ? 'Create User' : 'Save Changes'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm User Deletion"
        maxWidth="440px"
      >
        <div className="delete-modal-body">
          <AlertTriangle size={36} className="text-danger mb-3" />
          <p className="delete-warning-text">
            Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?
          </p>
          <p className="delete-subwarning-text">
            This action cannot be undone. All associated records and permissions will be permanently removed.
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
                <span>Yes, Delete User</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
