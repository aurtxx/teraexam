import React, { useState, useEffect } from 'react';
import { platformAdminApi } from '../../api/client';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  ExternalLink,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select, 
  Badge, 
  Table, 
  Modal, 
  ConfirmDialog, 
  Alert,
  Switch
} from '../../components';

export function InstitutionsManager({ showToast }) {
  const [institutions, setInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    slug: '',
    subscription_tier: 'PRO',
    email: '',
    phone: '',
    primary_color: '#4f46e5',
    max_students: 1000,
    max_exams: 50,
    max_questions: 5000,
    is_active: true,
  });

  const fetchInstitutions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await platformAdminApi.listInstitutions();
      setInstitutions(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
      setError(err.message || 'Failed to load institutions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      slug: '',
      subscription_tier: 'PRO',
      email: '',
      phone: '',
      primary_color: '#4f46e5',
      max_students: 1000,
      max_exams: 50,
      max_questions: 5000,
      is_active: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInst(inst);
    setFormData({
      name: inst.name || '',
      code: inst.code || '',
      slug: inst.slug || '',
      subscription_tier: inst.subscription_tier || 'STARTER',
      email: inst.email || '',
      phone: inst.phone || '',
      primary_color: inst.primary_color || '#4f46e5',
      max_students: inst.max_students ?? 500,
      max_exams: inst.max_exams ?? 25,
      max_questions: inst.max_questions ?? 2500,
      is_active: inst.is_active ?? true,
    });
    setIsEditOpen(true);
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Institution name is required', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        slug: formData.slug.trim() || undefined,
        subscription_tier: formData.subscription_tier,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        primary_color: formData.primary_color,
        is_active: formData.is_active,
      };
      await platformAdminApi.createInstitution(payload);
      showToast(`Institution '${formData.name}' created successfully!`, 'success');
      setIsCreateOpen(false);
      fetchInstitutions();
    } catch (err) {
      console.error('Create institution error:', err);
      showToast(err.message || 'Failed to create institution', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInst) return;
    try {
      setIsSubmitting(true);
      await platformAdminApi.updateInstitution(editingInst.id, {
        name: formData.name.trim(),
        subscription_tier: formData.subscription_tier,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        primary_color: formData.primary_color,
        is_active: formData.is_active,
      });
      showToast(`Updated '${formData.name}' successfully!`, 'success');
      setIsEditOpen(false);
      fetchInstitutions();
    } catch (err) {
      console.error('Update institution error:', err);
      showToast(err.message || 'Failed to update institution', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await platformAdminApi.deleteInstitution(deleteTarget.id);
      showToast(`Institution '${deleteTarget.name}' deleted.`, 'success');
      setDeleteTarget(null);
      fetchInstitutions();
    } catch (err) {
      console.error('Delete institution error:', err);
      showToast(err.message || 'Failed to delete institution', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchSearch =
      !search ||
      inst.name?.toLowerCase().includes(search.toLowerCase()) ||
      inst.code?.toLowerCase().includes(search.toLowerCase()) ||
      inst.slug?.toLowerCase().includes(search.toLowerCase());
    const matchTier = !tierFilter || inst.subscription_tier === tierFilter;
    return matchSearch && matchTier;
  });

  const tierColors = {
    FREE: 'default',
    STARTER: 'info',
    PRO: 'purple',
    ENTERPRISE: 'success',
  };

  const columns = [
    {
      key: 'name',
      header: 'Institute Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
            style={{ backgroundColor: row.primary_color || '#4f46e5' }}
          >
            {val ? val.charAt(0).toUpperCase() : 'I'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block text-sm">{val}</span>
            <span className="font-mono text-xs text-slate-400">/{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Institute Code',
      width: '140px',
      render: (val) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
          {val}
        </span>
      ),
    },
    {
      key: 'subscription_tier',
      header: 'Plan Tier',
      width: '120px',
      render: (val) => (
        <Badge variant={tierColors[val] || 'default'} size="xs">
          {val}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '110px',
      render: (val) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
            val ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {val ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {val ? 'Active' : 'Suspended'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Onboarded',
      width: '130px',
      render: (val) => (
        <span className="text-xs text-slate-500 font-mono">
          {val ? new Date(val).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            icon={Edit2}
            title="Edit institution & tier"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row);
            }}
          />
          <Button
            variant="ghost"
            size="xs"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            icon={Trash2}
            title="Delete institution"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="institutions-manager max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Institutions & Multi-Tenancy"
        subtitle="Manage independent coaching institutes, tier limits, white-label branding, and isolation"
        badge={<Badge variant="purple">{institutions.length} Institutes</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchInstitutions}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenCreate}
            >
              New Institution
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="danger" title="Load Failed">
          {error}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by institute name, code, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="">All Subscription Tiers</option>
              <option value="FREE">Free Tier</option>
              <option value="STARTER">Starter Tier</option>
              <option value="PRO">Pro Tier</option>
              <option value="ENTERPRISE">Enterprise Tier</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Institutes Table */}
      <Table
        columns={columns}
        data={filteredInstitutions}
        isLoading={isLoading}
        emptyMessage="No coaching institutes registered. Click 'New Institution' to onboard one."
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard New Coaching Institute"
        maxWidth="560px"
      >
        <form onSubmit={handleSaveCreate} className="space-y-4">
          <Input
            label="Institution / Coaching Name"
            placeholder="e.g. Allen Career Institute, Kota"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              const code = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 6) + '-' + Math.floor(100 + Math.random() * 900);
              setFormData({ ...formData, name, slug: formData.slug || slug, code: formData.code || code });
            }}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institute Code"
              placeholder="e.g. ALLEN-KOTA"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              helperText="Unique tenant code"
              required
            />
            <Input
              label="URL Slug"
              placeholder="e.g. allen-kota"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              helperText="Unique portal slug"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subscription Tier"
              value={formData.subscription_tier}
              onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
              options={[
                { value: 'FREE', label: 'Free (50 Students, 5 Exams)' },
                { value: 'STARTER', label: 'Starter (250 Students, 20 Exams)' },
                { value: 'PRO', label: 'Pro (1,000 Students, 100 Exams)' },
                { value: 'ENTERPRISE', label: 'Enterprise (Unlimited Quotas)' },
              ]}
            />
            <Input
              label="Brand Accent Color"
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Director Email"
              type="email"
              placeholder="director@institute.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Support Phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Switch
            label="Activate Institution Immediately"
            description="Allows teachers and candidates to authenticate"
            checked={formData.is_active}
            onChange={(val) => setFormData({ ...formData, is_active: val })}
          />

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Create Institute
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit ${editingInst?.name || 'Institution'}`}
        maxWidth="560px"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Institution Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subscription Tier"
              value={formData.subscription_tier}
              onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
              options={[
                { value: 'FREE', label: 'Free Tier' },
                { value: 'STARTER', label: 'Starter Tier' },
                { value: 'PRO', label: 'Pro Tier' },
                { value: 'ENTERPRISE', label: 'Enterprise Tier' },
              ]}
            />
            <Input
              label="Brand Accent Color"
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Support Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Switch
            label="Institute Active Status"
            description="Deactivating locks candidate exam access and stops new attempts"
            checked={formData.is_active}
            onChange={(val) => setFormData({ ...formData, is_active: val })}
          />

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Coaching Institute?"
        message={`Are you sure you want to permanently delete '${deleteTarget?.name}' (${deleteTarget?.code})? This will delete all associated batches, questions, exams, and candidate results.`}
        confirmText="Yes, Delete Tenant"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
