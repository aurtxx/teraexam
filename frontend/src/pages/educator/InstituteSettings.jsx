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
  Eye
} from 'lucide-react';

export function InstituteSettings({ showToast }) {
  const { refreshUser } = useAuth();
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

  useEffect(() => {
    loadInstitution();
  }, []);

  const loadInstitution = async () => {
    try {
      setLoading(true);
      const data = await examsApi.getInstitution();
      setInst(data);
    } catch (err) {
      console.error('Error loading institution settings:', err);
    } finally {
      setLoading(false);
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
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Teal Cyan', hex: '#0891b2' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Violet Purple', hex: '#7c3aed' },
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mb-2"></div>
        <p className="text-muted text-sm">Loading institute profile & branding...</p>
      </div>
    );
  }

  return (
    <div className="institute-settings-page max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-main">Institute Branding & Profile</h2>
        <p className="text-muted text-sm">
          Customize your coaching center's identity, logo, theme colors, and student examination portal appearance.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="col-span-2 card p-6 flex flex-col gap-4">
          <div>
            <label className="form-label">Institute Name</label>
            <input 
              type="text"
              className="form-input"
              value={inst.name}
              onChange={(e) => setInst({ ...inst, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Institute Code</label>
              <input 
                type="text"
                className="form-input font-mono"
                value={inst.code}
                disabled
              />
              <span className="text-xs text-muted">Unique tenant identifier</span>
            </div>
            <div>
              <label className="form-label">Subscription Tier</label>
              <input 
                type="text"
                className="form-input"
                value={inst.subscription_tier}
                disabled
              />
            </div>
          </div>

          <div>
            <label className="form-label">Tagline / Motto</label>
            <input 
              type="text"
              className="form-input"
              value={inst.tagline}
              onChange={(e) => setInst({ ...inst, tagline: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Logo Image URL</label>
            <input 
              type="url"
              className="form-input"
              placeholder="https://example.com/logo.png"
              value={inst.logo_url}
              onChange={(e) => setInst({ ...inst, logo_url: e.target.value })}
            />
          </div>

          {/* Theme Color Picker */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-2">
              <Palette size={16} />
              Brand Theme Color
            </label>
            <div className="flex items-center gap-3">
              {presetColors.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition flex items-center justify-center ${
                    inst.primary_color === c.hex ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent'
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
                className="w-8 h-8 rounded cursor-pointer border"
                value={inst.primary_color || '#4f46e5'}
                onChange={(e) => setInst({ ...inst, primary_color: e.target.value })}
                title="Custom color"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="form-label flex items-center gap-1">
                <Mail size={14} /> Contact Email
              </label>
              <input 
                type="email"
                className="form-input"
                value={inst.contact_email}
                onChange={(e) => setInst({ ...inst, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label flex items-center gap-1">
                <Phone size={14} /> Contact Phone
              </label>
              <input 
                type="text"
                className="form-input"
                value={inst.contact_phone}
                onChange={(e) => setInst({ ...inst, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label flex items-center gap-1">
              <MapPin size={14} /> Campus Address
            </label>
            <textarea 
              className="form-input"
              rows={2}
              value={inst.address}
              onChange={(e) => setInst({ ...inst, address: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save Branding Changes'}
            </button>
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="col-span-1">
          <div className="card p-4 sticky top-4">
            <h4 className="font-bold text-sm text-main mb-3 flex items-center gap-1.5">
              <Eye size={16} className="text-indigo" />
              Live Student View Preview
            </h4>

            {/* Student Exam Header Mockup */}
            <div 
              className="preview-header p-4 rounded-t text-white mb-0"
              style={{ backgroundColor: inst.primary_color || '#4f46e5' }}
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={24} />
                <div>
                  <div className="font-bold text-sm leading-tight">{inst.name || 'Your Institute Name'}</div>
                  <div className="text-xs opacity-90">{inst.tagline || 'Excellence in Coaching'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-t-0 rounded-b text-xs text-muted flex flex-col gap-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-slate-700">Exam Code:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border">JEE-MOCK-01</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-slate-700">Timer Display:</span>
                <span className="font-mono font-bold text-emerald-700">02:59:45</span>
              </div>
              <p className="text-slate-500 italic mt-1">
                This shows how students will see your branded banner during computer-based tests and on their scorecard printouts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
