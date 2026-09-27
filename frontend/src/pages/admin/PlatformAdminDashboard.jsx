import React, { useState, useEffect } from 'react';
import { platformAdminApi } from '../../api/client';
import { 
  Building2, 
  Users, 
  BookOpen, 
  FileCheck2, 
  Layers, 
  Server, 
  Activity, 
  ShieldCheck, 
  ArrowUpRight, 
  Clock,
  Plus,
  RefreshCw
} from 'lucide-react';
import { 
  PageHeader, 
  KpiCard, 
  Card, 
  Button, 
  Badge, 
  Table, 
  Skeleton, 
  BarChart, 
  Alert 
} from '../../components';

export function PlatformAdminDashboard({ onNavigate, showToast }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await platformAdminApi.getStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load platform admin stats:', err);
      setError(err.message || 'Failed to fetch platform dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const metrics = data?.metrics || {};
  const sysInfo = data?.system_info || {};
  const recentLogs = data?.recent_logs || [];
  const tierCounts = metrics.tier_counts || { FREE: 0, STARTER: 0, PRO: 0, ENTERPRISE: 0 };

  const tierChartData = [
    { label: 'Free', value: tierCounts.FREE || 0, color: '#94a3b8' },
    { label: 'Starter', value: tierCounts.STARTER || 0, color: '#38bdf8' },
    { label: 'Pro', value: tierCounts.PRO || 0, color: '#4f46e5' },
    { label: 'Enterprise', value: tierCounts.ENTERPRISE || 0, color: '#059669' },
  ];

  const logColumns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: '160px',
      render: (val) => (
        <span className="font-mono text-xs text-slate-500">
          {val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      width: '140px',
      render: (val) => (
        <span className="font-medium text-slate-900 text-xs">
          {val ? val.username : 'System / Anonymous'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '150px',
      render: (val) => {
        const isAuth = val?.includes('LOGIN') || val?.includes('AUTH');
        const isDelete = val?.includes('DELETE');
        return (
          <Badge variant={isDelete ? 'danger' : isAuth ? 'info' : 'purple'} size="xs">
            {val}
          </Badge>
        );
      },
    },
    {
      key: 'details',
      header: 'Operation Details',
      render: (val) => <span className="text-xs text-slate-600 truncate block max-w-md">{val || '-'}</span>,
    },
    {
      key: 'ip_address',
      header: 'Source IP',
      width: '120px',
      render: (val) => <span className="font-mono text-[11px] text-slate-400">{val || '127.0.0.1'}</span>,
    },
  ];

  return (
    <div className="platform-admin-dashboard max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Platform Control Plane"
        subtitle="Global multi-tenant governance, subscription quotas, and live infrastructure telemetry"
        badge={<Badge variant="purple">Root Admin</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchStats}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => onNavigate && onNavigate('institutions')}
            >
              Onboard Institution
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="danger" title="Telemetry Sync Failed">
          {error}
        </Alert>
      )}

      {/* Top Multi-Tenant Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" />)
        ) : (
          <>
            <KpiCard
              title="Active Institutions"
              value={metrics.active_institutions ?? metrics.total_institutions ?? 0}
              subtitle={`${metrics.total_institutions ?? 0} total registered institutes`}
              icon={Building2}
              color="primary"
              onClick={() => onNavigate && onNavigate('institutions')}
            />
            <KpiCard
              title="Enrolled Students"
              value={metrics.total_students ?? 0}
              subtitle="Across all coaching batches"
              icon={Users}
              color="teal"
            />
            <KpiCard
              title="Published Exams"
              value={metrics.total_exams ?? 0}
              subtitle="CBT and Mock assessments"
              icon={BookOpen}
              color="amber"
            />
            <KpiCard
              title="Total Attempts"
              value={metrics.total_attempts ?? 0}
              subtitle="Evaluated candidate submissions"
              icon={FileCheck2}
              color="emerald"
            />
          </>
        )}
      </div>

      {/* Second Row: Tier Breakdown + Infrastructure Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        <Card
          title="Tenant Subscription Tiers"
          subtitle="Active educator institutions grouped by plan"
          className="lg:col-span-2"
        >
          <div className="py-2">
            <BarChart data={tierChartData} height={180} />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-center">
            {tierChartData.map((t) => (
              <div key={t.label} className="p-2 rounded-lg bg-slate-50">
                <span className="block text-xs font-semibold text-slate-500">{t.label}</span>
                <span className="block text-lg font-bold font-mono text-slate-800 mt-0.5">{t.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Server & Engine Telemetry */}
        <Card
          title="System Telemetry"
          subtitle="Host execution environment"
          action={
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Django Engine</span>
              <span className="font-mono font-semibold text-slate-800">{sysInfo.django_version || '5.x'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Python Runtime</span>
              <span className="font-mono font-semibold text-slate-800">{sysInfo.python_version || '3.12'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Database Layer</span>
              <span className="font-mono font-semibold text-slate-800 uppercase">{sysInfo.database || 'SQLite'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Server Clock (UTC)</span>
              <span className="font-mono text-slate-700">
                {sysInfo.server_time ? new Date(sysInfo.server_time).toTimeString().split(' ')[0] : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-medium">Total System Users</span>
              <span className="font-mono font-bold text-indigo-600">{metrics.total_users ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Third Row: Recent Global Audit Log Stream */}
      <Card
        title="Global Security & Administrative Trail"
        subtitle="Recent administrative events, logins, and resource modifications"
        action={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onNavigate && onNavigate('audit-logs')}
          >
            View Full Trail &rarr;
          </Button>
        }
      >
        <Table
          columns={logColumns}
          data={recentLogs}
          isLoading={isLoading}
          emptyMessage="No administrative actions logged yet."
        />
      </Card>
    </div>
  );
}
