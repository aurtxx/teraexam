import React, { useState, useEffect } from 'react';
import { statsApi } from '../api/client';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { 
  Users, 
  Layers, 
  CheckCircle, 
  Clock, 
  Server, 
  Cpu, 
  ShieldCheck, 
  RefreshCw,
  PlusCircle,
  UserPlus,
  ExternalLink,
  Loader2
} from 'lucide-react';

export function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await statsApi.getOverview();
      setData(res);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p>Loading real-time administrative statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state-card">
        <p className="text-danger font-medium">{error}</p>
        <button className="btn btn-secondary mt-3" onClick={() => fetchStats(true)}>
          <RefreshCw size={16} className="mr-2" />
          Retry Connection
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const sys = data?.system_info || {};
  const logs = data?.recent_logs || [];

  return (
    <div className="dashboard-page">
      {/* Dashboard Top Bar */}
      <div className="dashboard-header-bar">
        <div>
          <h2 className="section-heading">Operational Overview</h2>
          <p className="section-subheading">
            Live telemetry and entity status from the Django backend.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          title="Refresh statistics from Django"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin mr-1' : 'mr-1'} />
          <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Resources"
          value={metrics.total_resources ?? 0}
          icon={Layers}
          color="blue"
          subtitle={`${metrics.active_resources ?? 0} active, ${metrics.draft_resources ?? 0} drafts`}
        />
        <StatCard
          title="Total Users"
          value={metrics.total_users ?? 0}
          icon={Users}
          color="indigo"
          subtitle={`${metrics.staff_users ?? 0} staff members`}
        />
        <StatCard
          title="Active Resources"
          value={metrics.active_resources ?? 0}
          icon={CheckCircle}
          color="green"
          subtitle="Operational services & modules"
        />
        <StatCard
          title="Security Audits"
          value={logs.length}
          icon={ShieldCheck}
          color="amber"
          subtitle="Recent logged administrative events"
        />
      </div>

      {/* Quick Action Bar */}
      <div className="quick-actions-card mt-6">
        <div className="card-header">
          <h3 className="card-title">Quick Administrative Actions</h3>
        </div>
        <div className="quick-actions-grid">
          <button 
            className="action-tile"
            onClick={() => onNavigate('resources')}
          >
            <PlusCircle size={20} className="action-tile-icon text-primary" />
            <div className="action-tile-text">
              <strong>Manage Resources</strong>
              <span>Create, edit, or filter system items</span>
            </div>
          </button>

          <button 
            className="action-tile"
            onClick={() => onNavigate('users')}
          >
            <UserPlus size={20} className="action-tile-icon text-indigo" />
            <div className="action-tile-text">
              <strong>User Directory</strong>
              <span>Add staff users & manage roles</span>
            </div>
          </button>

          <button 
            className="action-tile"
            onClick={() => onNavigate('audit-logs')}
          >
            <Clock size={20} className="action-tile-icon text-amber" />
            <div className="action-tile-text">
              <strong>Audit Trail</strong>
              <span>Review full system security logs</span>
            </div>
          </button>

          <a 
            href="/admin/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="action-tile"
          >
            <ExternalLink size={20} className="action-tile-icon text-gray" />
            <div className="action-tile-text">
              <strong>Django Admin Fallback</strong>
              <span>Open default model admin in new tab</span>
            </div>
          </a>
        </div>
      </div>

      {/* Two-Column Details Grid */}
      <div className="dashboard-split-grid mt-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Administrative Activity</h3>
            <span className="text-xs text-muted">Audited by Django</span>
          </div>
          <div className="activity-list">
            {logs.length === 0 ? (
              <p className="empty-text">No administrative events recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-item-main">
                    <span className="activity-badge">
                      <Badge size="xs" variant={log.action.includes('DELETED') ? 'danger' : 'info'}>
                        {log.action}
                      </Badge>
                    </span>
                    <span className="activity-details">{log.details || log.resource_type}</span>
                  </div>
                  <div className="activity-meta">
                    <span className="activity-user">{log.username || 'System'}</span>
                    <span className="activity-time">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backend System Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Backend Architecture Info</h3>
            <span className="text-xs text-muted">Verified Environment</span>
          </div>
          <div className="sys-info-table">
            <div className="sys-info-row">
              <span className="sys-info-label">
                <Cpu size={16} className="inline mr-2 text-muted" /> Python Runtime
              </span>
              <span className="sys-info-val">{sys.python_version || '3.12'}</span>
            </div>
            <div className="sys-info-row">
              <span className="sys-info-label">
                <Server size={16} className="inline mr-2 text-muted" /> Django Core
              </span>
              <span className="sys-info-val">v{sys.django_version || '5.2'}</span>
            </div>
            <div className="sys-info-row">
              <span className="sys-info-label">
                <ShieldCheck size={16} className="inline mr-2 text-muted" /> Database Driver
              </span>
              <span className="sys-info-val font-mono">{sys.database || 'sqlite3'}</span>
            </div>
            <div className="sys-info-row">
              <span className="sys-info-label">
                <Clock size={16} className="inline mr-2 text-muted" /> Server Time (UTC)
              </span>
              <span className="sys-info-val font-mono text-xs">
                {sys.server_time ? new Date(sys.server_time).toLocaleString() : 'Live'}
              </span>
            </div>
            <div className="sys-info-row">
              <span className="sys-info-label">Auth Authority</span>
              <span className="sys-info-val text-success font-semibold">Django Sessions + CSRF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
