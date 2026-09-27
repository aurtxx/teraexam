import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  HelpCircle, 
  Calendar, 
  Users, 
  Bell, 
  Palette, 
  Layers, 
  History, 
  LogOut, 
  Menu, 
  X, 
  ExternalLink, 
  GraduationCap, 
  Award,
  Sparkles,
  Server,
  UserCheck
} from 'lucide-react';
import { Badge } from '../components/Badge';

export function AdminLayout({ activeTab, onTabChange, children }) {
  const { user, role, isStudent, isEducator, isInstituteAdmin, isPlatformAdmin, institution, logout, login } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic Navigation Items based on role
  let navItems = [];
  if (isStudent) {
    navItems = [
      { id: 'student-portal', label: 'My Assessments', icon: GraduationCap },
      { id: 'student-analytics', label: 'Performance Analytics', icon: Award },
      { id: 'student-announcements', label: 'Notices & Alerts', icon: Bell },
    ];
  } else if (isPlatformAdmin) {
    navItems = [
      { id: 'platform-dashboard', label: 'Platform Overview', icon: Server },
      { id: 'institutions', label: 'Institutions & Tenants', icon: GraduationCap },
      { id: 'users', label: 'User Directory & RBAC', icon: Users },
      { id: 'resources', label: 'Resource Catalog', icon: Layers },
      { id: 'audit-logs', label: 'Security & Audit Trail', icon: History },
    ];
  } else {
    navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'questions', label: 'Question Bank', icon: HelpCircle },
      { id: 'exams', label: 'Exams & Live Hub', icon: Calendar },
      { id: 'students', label: 'Students & Batches', icon: Users },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'branding', label: 'Institute Branding', icon: Palette },
      { id: 'audit-logs', label: 'Security & Audit Logs', icon: History },
    ];
  }

  const handleNavClick = (tabId) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  const instName = institution?.name || (isStudent ? 'Apex IIT-JEE & NEET Academy' : 'Apex Academy');
  const primaryColor = institution?.primary_color || '#4f46e5';

  return (
    <div className="admin-container">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div 
            className="brand-logo-icon shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <GraduationCap size={22} className="text-white" />
          </div>
          <div className="brand-text">
            <h2 className="truncate">{instName}</h2>
            <span>{isStudent ? 'Student Testing Portal' : 'Educator Control Plane'}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isStudent ? 'Student Workspace' : 'Institute Management'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {!isStudent && (
            <>
              <div className="nav-section-title mt-6">System Links</div>
              <a 
                href="/admin/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nav-item nav-item-external"
                title="Open Django admin interface"
              >
                <ExternalLink size={18} className="nav-icon" />
                <span>Django Admin Panel</span>
              </a>
            </>
          )}
        </nav>

        {/* Sidebar Footer with Active Persona */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div 
              className="user-avatar"
              style={{ backgroundColor: isStudent ? '#059669' : '#4f46e5' }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.username?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div className="user-info truncate">
              <span className="user-name truncate">{user?.full_name || user?.username}</span>
              <div className="user-roles">
                <Badge variant={isStudent ? 'success' : isInstituteAdmin ? 'purple' : 'info'} size="xs">
                  {role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <button 
            className="btn-logout" 
            onClick={logout} 
            title="Sign out of portal"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="admin-main">
        {/* Top Navbar */}
        <header className="admin-header">
          <div className="header-left">
            <button 
              className="btn-mobile-menu" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="header-title-container">
              <h1 className="header-title">
                {navItems.find((n) => n.id === activeTab)?.label || 'Overview'}
              </h1>
              <span className="header-breadcrumbs">
                {instName} • {isStudent ? 'Student Assessment Mode' : 'Examination Management System'}
              </span>
            </div>
          </div>

          {/* Quick Persona Switcher in Header */}
          <div className="header-right flex items-center gap-3">
            <div className="system-health-pill hidden sm:flex items-center">
              <span className="pulse-indicator"></span>
              <Server size={14} className="mr-1" />
              <span>Django REST API Connected</span>
            </div>

            {/* Persona Switcher for Quick Demos */}
            <div className="persona-switcher-dropdown hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border text-xs">
              <span className="text-muted font-bold text-2xs uppercase px-1">Switch:</span>
              <button 
                className={`px-2 py-0.5 rounded font-medium ${user?.username === 'educator_apex' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'}`}
                onClick={() => login('educator_apex', 'ApexPass123!')}
                title="Switch to Educator Admin"
              >
                Director
              </button>
              <button 
                className={`px-2 py-0.5 rounded font-medium ${user?.username === 'teacher_verma' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'}`}
                onClick={() => login('teacher_verma', 'TeacherPass123!')}
                title="Switch to Teacher"
              >
                Faculty
              </button>
              <button 
                className={`px-2 py-0.5 rounded font-medium ${user?.username === 'student_arjun' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'}`}
                onClick={() => login('student_arjun', 'StudentPass123!')}
                title="Switch to Student Arjun (Rank 1)"
              >
                Arjun (Rank 1)
              </button>
              <button 
                className={`px-2 py-0.5 rounded font-medium ${user?.username === 'student_rohit' ? 'bg-amber-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-200'}`}
                onClick={() => login('student_rohit', 'StudentPass123!')}
                title="Switch to Student Rohit (Take Live Exam)"
              >
                Rohit (Student)
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="admin-content-body">
          {children}
        </main>
      </div>
    </div>
  );
}
