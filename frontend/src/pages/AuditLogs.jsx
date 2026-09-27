import React, { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../api/client';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Search, RefreshCw, Loader2, ShieldCheck, History } from 'lucide-react';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.list({
        page,
        search,
      });
      setLogs(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Security & Administrative Audit Trail</h2>
          <p className="section-subheading">
            Immutable log of administrative access, modifications, and system events recorded by Django.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={14} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search audit trail by action, resource type, or details..."
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
      </div>

      <div className="card table-card mt-4">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Resource Target</th>
                <th>Details</th>
                <th>Client IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Loader2 size={24} className="animate-spin inline mr-2 text-primary" />
                    <span>Loading audit records from Django...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    No audit records matching query found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm font-mono text-muted whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className="font-semibold text-main">
                        {log.username ? `@${log.username}` : 'System'}
                      </span>
                    </td>
                    <td>
                      <Badge size="xs" variant={log.action.includes('DELETED') ? 'danger' : 'info'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-sm font-medium">
                        {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {log.details || '—'}
                    </td>
                    <td className="text-xs font-mono text-muted">
                      {log.ip_address || '—'}
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
    </div>
  );
}
