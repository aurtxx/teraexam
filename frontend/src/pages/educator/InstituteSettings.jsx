import React, { useState, useEffect } from 'react';
import { examsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Palette, 
  Mail, 
  Phone, 
  MapPin, 
  Check, 
  Save, 
  Sparkles, 
  GraduationCap,
  Eye,
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../../components/Badge';

export function InstituteSettings({ showToast }) {
  const { refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'subscription' | 'audit'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [inst, setInst] = useState({
    name: '',
    code: '',
    tagline: '',
    logo_url: '',
    primary_color: '#4f46e5',
    contact_email: '',
    contact_phone: '',
    address: '',
    subscription_tier: 'PRO_EDUCATOR',
  });

  const [usage, setUsage] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [instData, usageData] = await Promise.allSettled([
        examsApi.getInstitution(),
        examsApi.getSubscriptionUsage()
      ]);

      if (instData.status === 'fulfilled') {
        setInst(instData.value);
      }
      if (usageData.status === 'fulfilled') {
        setUsage(usageData.value);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const logs = await examsApi.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'audit' && auditLogs.length === 0) {
      loadAuditLogs();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await examsApi.updateBranding(inst);
      showToast?.('Institute branding & settings updated!', 'success');
      await refreshUser();
    } catch (err) {
      console.error('Failed to update branding:', err);
      alert('Update failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const presetColors = [
    { name: 'Indigo Accent', hex: '#4f46e5' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Deep Teal', hex: '#0f766e' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Violet Purple', hex: '#7c3aed' },
  ];

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-on-surface-variant">Loading institute configuration & subscription parameters...</p>
      </div>
    );
  }

  return (
    <div className="institute-settings-page max-w-5xl mx-auto flex flex-col gap-6 text-on-surface font-body-md">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Institute Settings & SaaS Subscriptions</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Manage your coaching institute's branding, custom colors, tier quotas, and immutable security audit logs.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-xs font-bold">
          Tenant Code: {inst.code || 'INST-DEL'}
        </span>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-outline-variant pb-1">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-sm font-semibold transition-all ${
            activeTab === 'branding' 
              ? 'bg-primary text-on-primary shadow-sm' 
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
          onClick={() => handleTabChange('branding')}
        >
          Branding & Identity
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-sm font-semibold transition-all ${
            activeTab === 'subscription' 
              ? 'bg-primary text-on-primary shadow-sm' 
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
          onClick={() => handleTabChange('subscription')}
        >
          SaaS Quota & Subscription
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-sm font-semibold transition-all ${
            activeTab === 'audit' 
              ? 'bg-primary text-on-primary shadow-sm' 
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
          onClick={() => handleTabChange('audit')}
        >
          Institutional Audit Logs
        </button>
      </div>

      {/* TAB 1: BRANDING & IDENTITY */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
            <div>
              <label className="font-label-md text-xs font-bold uppercase tracking-wider block mb-1">Institute Full Name</label>
              <input 
                type="text"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-semibold"
                value={inst.name}
                onChange={(e) => setInst({ ...inst, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-label-md text-xs font-bold uppercase tracking-wider block mb-1">Institute Code</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-xs font-mono font-bold text-on-surface-variant cursor-not-allowed"
                  value={inst.code}
                  disabled
                />
                <span className="text-[11px] text-on-surface-variant mt-0.5 block">Unique tenant subdomain / identifier</span>
              </div>
              <div>
                <label className="font-label-md text-xs font-bold uppercase tracking-wider block mb-1">Active Plan</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-xs font-bold text-secondary cursor-not-allowed"
                  value={inst.subscription_tier}
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="font-label-md text-xs font-bold uppercase tracking-wider block mb-1">Tagline / Mission Statement</label>
              <input 
                type="text"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm"
                value={inst.tagline}
                onChange={(e) => setInst({ ...inst, tagline: e.target.value })}
              />
            </div>

            <div>
              <label className="font-label-md text-xs font-bold uppercase tracking-wider block mb-1">Logo Image URL</label>
              <input 
                type="url"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm"
                placeholder="https://example.com/logo.png"
                value={inst.logo_url}
                onChange={(e) => setInst({ ...inst, logo_url: e.target.value })}
              />
            </div>

            {/* Theme Color Picker */}
            <div>
              <label className="font-label-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Palette size={14} />
                Institute Accent Color
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {presetColors.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition flex items-center justify-center ${
                      inst.primary_color === c.hex ? 'border-on-surface scale-110 shadow-md ring-2 ring-primary ring-offset-2' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setInst({ ...inst, primary_color: c.hex })}
                    title={c.name}
                  >
                    {inst.primary_color === c.hex && <Check size={14} className="text-white" />}
                  </button>
                ))}
                <input 
                  type="color"
                  className="w-8 h-8 rounded cursor-pointer border border-outline-variant"
                  value={inst.primary_color || '#4f46e5'}
                  onChange={(e) => setInst({ ...inst, primary_color: e.target.value })}
                  title="Custom color picker"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label className="font-label-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Mail size={12} /> Contact Email
                </label>
                <input 
                  type="email"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-xs"
                  value={inst.contact_email}
                  onChange={(e) => setInst({ ...inst, contact_email: e.target.value })}
                />
              </div>
              <div>
                <label className="font-label-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Phone size={12} /> Contact Phone
                </label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-xs"
                  value={inst.contact_phone}
                  onChange={(e) => setInst({ ...inst, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-label-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                <MapPin size={12} /> Campus Address
              </label>
              <textarea 
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-xs"
                rows={2}
                value={inst.address}
                onChange={(e) => setInst({ ...inst, address: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-outline-variant">
              <button 
                type="submit" 
                className="btn btn-primary font-bold shadow-sm"
                disabled={saving}
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Updating Branding...' : 'Save Branding Changes'}
              </button>
            </div>
          </form>

          {/* Live Student Terminal Preview */}
          <div className="lg:col-span-1">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm sticky top-4">
              <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <Eye size={16} className="text-primary" />
                Live Student Portal Preview
              </h4>

              {/* Mockup Header */}
              <div 
                className="p-4 rounded-t-xl text-white shadow-sm transition-colors"
                style={{ backgroundColor: inst.primary_color || '#4f46e5' }}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={24} />
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-tight truncate">{inst.name || 'Apex National Institute'}</div>
                    <div className="text-xs opacity-90 truncate">{inst.tagline || 'Excellence in Coaching'}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface-container-low border border-t-0 border-outline-variant rounded-b-xl text-xs text-on-surface-variant flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                  <span className="font-semibold text-on-surface">Test Code:</span>
                  <span className="font-mono bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant font-bold">JEE-MOCK-01</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                  <span className="font-semibold text-on-surface">CBT Timer:</span>
                  <span className="font-timer-display font-bold text-secondary text-sm">02:59:45</span>
                </div>
                <p className="text-[11px] text-on-surface-variant italic leading-relaxed">
                  Candidate test papers, CBT terminals, and official printable scorecards will automatically reflect this styling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAAS QUOTA & SUBSCRIPTION */}
      {activeTab === 'subscription' && usage && (
        <div className="flex flex-col gap-6">
          {/* Plan Summary Card */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-xs font-bold w-fit uppercase">
                Active Tier
              </span>
              <h3 className="font-headline-lg text-2xl font-black text-on-surface">
                {usage.tier?.name || 'INSTITUTE_PLUS'} Plan
              </h3>
              <p className="text-xs text-on-surface-variant">
                Enforcing multi-tenant hard ceilings for student enrolments, mock assessments, and question bank limits.
              </p>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant text-center shrink-0 min-w-44">
              <span className="text-xs text-on-surface-variant block font-medium">Billed Monthly</span>
              <span className="text-2xl font-black text-primary">₹{usage.tier?.price_inr_monthly || 0}</span>
              <span className="text-xs text-on-surface-variant block">/ month</span>
            </div>
          </div>

          {/* Quota Progress Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Students Limit</span>
                <span className="font-code-formula text-xs font-bold text-secondary">{usage.usage?.students?.percent}%</span>
              </div>
              <div className="text-xl font-black text-on-surface font-code-formula">
                {usage.usage?.students?.current} <span className="text-xs text-on-surface-variant font-normal">/ {usage.usage?.students?.limit}</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-secondary rounded-full"
                  style={{ width: `${usage.usage?.students?.percent}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Monthly Exams</span>
                <span className="font-code-formula text-xs font-bold text-primary">{usage.usage?.exams_this_month?.percent}%</span>
              </div>
              <div className="text-xl font-black text-on-surface font-code-formula">
                {usage.usage?.exams_this_month?.current} <span className="text-xs text-on-surface-variant font-normal">/ {usage.usage?.exams_this_month?.limit}</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${usage.usage?.exams_this_month?.percent}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Question Bank</span>
                <span className="font-code-formula text-xs font-bold text-tertiary">{usage.usage?.questions?.percent}%</span>
              </div>
              <div className="text-xl font-black text-on-surface font-code-formula">
                {usage.usage?.questions?.current} <span className="text-xs text-on-surface-variant font-normal">/ {usage.usage?.questions?.limit}</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-tertiary rounded-full"
                  style={{ width: `${usage.usage?.questions?.percent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Feature Matrix */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
            <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-secondary" />
              Included Plan Capabilities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                'Negative Marking Engine',
                'NTA Percentile & Rank Calculation',
                'Question Randomization',
                'Real-Time Proctoring Stream',
                'Printable Official Scorecards',
                'Master Merit List Exports',
                'Custom Institute Branding',
                'Immutable Audit Logging'
              ].map(feat => (
                <div key={feat} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-medium">
                  <Check size={14} className="text-secondary shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTITUTIONAL AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wider">
                Administrative Security Audit Log
              </h3>
            </div>
            <button 
              type="button"
              className="btn btn-xs btn-outline"
              onClick={loadAuditLogs}
            >
              Refresh Logs
            </button>
          </div>

          {auditLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-on-surface-variant">Loading security trail...</p>
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="border border-outline-variant rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider">
                  <tr className="border-b border-outline-variant">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-on-surface-variant">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-on-surface">{log.username}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-on-surface-variant">{log.resource_type} #{log.resource_id}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-on-surface-variant" title={log.details}>
                        {log.details || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-on-surface-variant">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-on-surface-variant">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-40 text-secondary" />
              <p className="font-semibold text-sm">No administrative audit events recorded yet.</p>
              <p className="text-xs text-on-surface-variant mt-1">Actions such as publishing results, resetting attempts, or modifying branding are logged here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
