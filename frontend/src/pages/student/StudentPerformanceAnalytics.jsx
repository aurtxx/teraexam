import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/client';
import { 
  Award, 
  Target, 
  TrendingUp, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { 
  PageHeader, 
  KpiCard, 
  Card, 
  Button, 
  Badge, 
  Table, 
  LineTrendChart, 
  RadialScoreChart, 
  ProgressIndicator, 
  Skeleton, 
  Alert,
  EmptyState
} from '../../components';

export function StudentPerformanceAnalytics({ onBack, onViewScorecard }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPerformance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await studentApi.getPerformanceSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load performance summary:', err);
      setError(err.message || 'Failed to fetch student performance summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const trends = data?.recent_trends || [];
  const subjectBreakdown = data?.subject_breakdown || [];
  const strongAreas = data?.strong_areas || [];
  const weakAreas = data?.weak_areas || [];

  const trendChartData = [...trends].reverse().map((t) => ({
    label: t.exam_code || t.exam_title?.slice(0, 10),
    value: Math.round(t.percentage),
  }));

  const historyColumns = [
    {
      key: 'exam_title',
      header: 'Exam Assessment',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">{val}</span>
          <span className="font-mono text-[11px] text-slate-400">{row.exam_code}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date Attempted',
      width: '130px',
      render: (val) => (
        <span className="font-mono text-xs text-slate-500">
          {val ? new Date(val).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      width: '110px',
      render: (val, row) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {val} / {row.max_score}
        </span>
      ),
    },
    {
      key: 'percentage',
      header: 'Percentage',
      width: '110px',
      render: (val) => (
        <Badge variant={val >= 75 ? 'success' : val >= 50 ? 'info' : 'warning'} size="xs">
          {val}%
        </Badge>
      ),
    },
    {
      key: 'rank',
      header: 'Merit Rank',
      width: '100px',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-indigo-700">
          {val ? `#${val}` : '-'}
        </span>
      ),
    },
    {
      key: 'accuracy_rate',
      header: 'Accuracy',
      width: '100px',
      render: (val) => (
        <span className="font-mono text-xs text-slate-600">
          {val}%
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Scorecard',
      width: '110px',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="xs"
          icon={FileText}
          onClick={() => onViewScorecard && onViewScorecard(row.attempt_id)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="student-analytics max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Candidate Performance & Growth Analytics"
        subtitle="Historical progression, subject mastery breakdown, and diagnostic scorecards"
        badge={<Badge variant="purple">Academic Diagnostic</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" size="sm" icon={ArrowLeft} onClick={onBack}>
                Assessments Hub
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchPerformance}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="danger" title="Error loading performance data">
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" />)
        ) : (
          <>
            <KpiCard
              title="Exams Completed"
              value={data?.total_exams_attempted || 0}
              subtitle={`out of ${data?.total_exams_assigned || 0} assigned exams`}
              icon={BookOpen}
              color="primary"
            />
            <KpiCard
              title="Average Score %"
              value={`${data?.average_percentage || 0}%`}
              subtitle="Cumulative percentage score"
              icon={Target}
              color="teal"
            />
            <KpiCard
              title="Average Accuracy"
              value={`${data?.average_accuracy || 0}%`}
              subtitle="Correct vs total attempted questions"
              icon={CheckCircle2}
              color="emerald"
            />
            <KpiCard
              title="Peak Percentile"
              value={`${data?.highest_percentile || 0}%ile`}
              subtitle="Highest rank standing across all tests"
              icon={Award}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Second Row: Performance Trend Line + Subject Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Score Trajectory Over Time"
          subtitle="Percentage scored across your last 10 examination attempts"
          className="lg:col-span-2"
        >
          {trendChartData.length > 0 ? (
            <div className="pt-2">
              <LineTrendChart
                data={trendChartData}
                unit="%"
                strokeColor="#4f46e5"
                areaColor="rgba(79, 70, 229, 0.12)"
                height={210}
              />
            </div>
          ) : (
            <EmptyState
              title="No attempt trend yet"
              description="Complete your first examination assessment to generate your performance curve."
            />
          )}
        </Card>

        <Card title="Subject Mastery Breakdown" subtitle="Accuracy rate per academic subject">
          {subjectBreakdown.length > 0 ? (
            <div className="space-y-4 pt-1">
              {subjectBreakdown.map((subj) => (
                <div key={subj.subject} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{subj.subject}</span>
                    <span className="font-mono text-slate-500 font-medium">
                      {subj.correct_answers}/{subj.total_questions} ({subj.accuracy}%)
                    </span>
                  </div>
                  <ProgressIndicator
                    value={subj.accuracy}
                    max={100}
                    showPercentage={false}
                    variant={subj.accuracy >= 70 ? 'success' : subj.accuracy >= 45 ? 'primary' : 'warning'}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No subject data"
              description="Subject statistics will appear once your exam submissions are evaluated."
            />
          )}

          {/* Diagnostic Focus Pill Tags */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            {strongAreas.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1.5">
                  Strong Areas (Accuracy &ge; 70%)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {strongAreas.map((s) => (
                    <Badge key={s} variant="success" size="xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {weakAreas.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1.5">
                  Focus Areas (Accuracy &lt; 50%)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {weakAreas.map((w) => (
                    <Badge key={w} variant="warning" size="xs">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Third Row: Recent Attempts Table */}
      <Card
        title="Complete Assessment Records"
        subtitle="Individual examination submissions, awarded marks, percentiles, and printable scorecards"
      >
        <Table
          columns={historyColumns}
          data={trends}
          isLoading={isLoading}
          emptyMessage="No examination attempts recorded yet."
        />
      </Card>
    </div>
  );
}
