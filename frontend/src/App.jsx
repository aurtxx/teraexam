import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';

// Educator Views
import { EducatorDashboard } from './pages/educator/EducatorDashboard';
import { QuestionBank } from './pages/educator/QuestionBank';
import { ExamsManager } from './pages/educator/ExamsManager';
import { StudentManager } from './pages/educator/StudentManager';
import { AnnouncementsManager } from './pages/educator/AnnouncementsManager';
import { InstituteSettings } from './pages/educator/InstituteSettings';

// Student Views
import { StudentPortal } from './pages/student/StudentPortal';
import { CbtExamView } from './pages/student/CbtExamView';
import { ScorecardView } from './pages/student/ScorecardView';

// Platform Control Plane Views
import { Resources } from './pages/Resources';
import { AuditLogs } from './pages/AuditLogs';

import { Toast } from './components/Toast';
import { Loader2 } from 'lucide-react';

function TeraExamApp() {
  const { isAuthenticated, isLoading, isStudent } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Live CBT Exam & Scorecard full-screen states
  const [liveExamId, setLiveExamId] = useState(null);
  const [scorecardAttemptId, setScorecardAttemptId] = useState(null);

  // Auto-switch default tab when role changes
  useEffect(() => {
    if (isStudent) {
      setActiveTab('student-portal');
    } else {
      setActiveTab('dashboard');
    }
  }, [isStudent]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  if (isLoading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-inner text-center">
          <Loader2 size={40} className="animate-spin text-primary mb-3 mx-auto" />
          <h3 className="font-bold text-main">Connecting to TeraExam Session...</h3>
          <p className="text-muted text-sm mt-1">Validating credentials & tenant permissions</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Full-screen Indian CBT Examination Interface
  if (liveExamId) {
    return (
      <CbtExamView 
        examId={liveExamId}
        onComplete={(attemptId) => {
          setLiveExamId(null);
          setScorecardAttemptId(attemptId);
        }}
        onExit={() => setLiveExamId(null)}
      />
    );
  }

  // Full-screen Scorecard Review View
  if (scorecardAttemptId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <ScorecardView 
          attemptId={scorecardAttemptId} 
          onBack={() => setScorecardAttemptId(null)} 
        />
      </div>
    );
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Student Views */}
      {isStudent && (
        <>
          {(activeTab === 'student-portal' || activeTab === 'student-announcements') && (
            <StudentPortal 
              onStartExam={(examId) => setLiveExamId(examId)}
              onViewScorecard={(attemptId) => setScorecardAttemptId(attemptId)}
            />
          )}
        </>
      )}

      {/* Educator Views */}
      {!isStudent && (
        <>
          {activeTab === 'dashboard' && <EducatorDashboard onNavigate={setActiveTab} />}
          {activeTab === 'questions' && <QuestionBank showToast={showToast} />}
          {activeTab === 'exams' && <ExamsManager showToast={showToast} />}
          {activeTab === 'students' && <StudentManager showToast={showToast} />}
          {activeTab === 'announcements' && <AnnouncementsManager showToast={showToast} />}
          {activeTab === 'branding' && <InstituteSettings showToast={showToast} />}
          {activeTab === 'resources' && <Resources showToast={showToast} />}
          {activeTab === 'audit-logs' && <AuditLogs />}
        </>
      )}

      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TeraExamApp />
    </AuthProvider>
  );
}
