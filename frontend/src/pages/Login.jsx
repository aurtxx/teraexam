import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, GraduationCap, ArrowRight, Loader2, Sparkles, Building2, UserCheck, BookOpen } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      const msg = err.data?.detail || err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
    setLoading(true);
    try {
      await login(user, pass);
    } catch (err) {
      const msg = err.data?.detail || err.message || 'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card login-card-wide">
        <div className="login-header">
          <div className="login-icon-badge bg-indigo-50">
            <GraduationCap size={32} className="text-indigo" />
          </div>
          <h2 className="login-title">TeraExam SaaS Platform</h2>
          <p className="login-subtitle">
            Online examination, question bank & assessment infrastructure for Indian educators, coaching institutes & students.
          </p>
        </div>

        {error && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username or Roll Number
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="e.g. educator_apex or student_arjun"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                <span>Signing in to portal...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="login-demo-helper mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-indigo" />
            <p className="demo-helper-title font-semibold text-xs text-muted uppercase tracking-wider">
              1-Click Demo Personas:
            </p>
          </div>
          
          <div className="demo-personas-grid">
            <button
              type="button"
              className="persona-card"
              onClick={() => handleQuickLogin('educator_apex', 'ApexPass123!')}
              disabled={loading}
            >
              <div className="persona-icon bg-indigo-100 text-indigo">
                <Building2 size={18} />
              </div>
              <div className="persona-info text-left">
                <span className="persona-name">Dr. Rajesh Sharma</span>
                <span className="persona-role">Institute Director (Apex Kota)</span>
              </div>
            </button>

            <button
              type="button"
              className="persona-card"
              onClick={() => handleQuickLogin('teacher_verma', 'TeacherPass123!')}
              disabled={loading}
            >
              <div className="persona-icon bg-blue-100 text-blue-600">
                <BookOpen size={18} />
              </div>
              <div className="persona-info text-left">
                <span className="persona-name">H. C. Verma</span>
                <span className="persona-role">Senior Physics Faculty</span>
              </div>
            </button>

            <button
              type="button"
              className="persona-card"
              onClick={() => handleQuickLogin('student_arjun', 'StudentPass123!')}
              disabled={loading}
            >
              <div className="persona-icon bg-emerald-100 text-emerald-600">
                <UserCheck size={18} />
              </div>
              <div className="persona-info text-left">
                <span className="persona-name">Arjun Mehta (Rank #1)</span>
                <span className="persona-role">Student · View Scorecard</span>
              </div>
            </button>

            <button
              type="button"
              className="persona-card"
              onClick={() => handleQuickLogin('student_rohit', 'StudentPass123!')}
              disabled={loading}
            >
              <div className="persona-icon bg-amber-100 text-amber-600">
                <GraduationCap size={18} />
              </div>
              <div className="persona-info text-left">
                <span className="persona-name">Rohit Gupta</span>
                <span className="persona-role">Student · Take Live CBT Exam</span>
              </div>
            </button>

            <button
              type="button"
              className="persona-card"
              onClick={() => handleQuickLogin('admin', 'AdminPass123!')}
              disabled={loading}
            >
              <div className="persona-icon bg-purple-100 text-purple-600">
                <Sparkles size={18} />
              </div>
              <div className="persona-info text-left">
                <span className="persona-name">Platform Admin</span>
                <span className="persona-role">Global SaaS Operator</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
