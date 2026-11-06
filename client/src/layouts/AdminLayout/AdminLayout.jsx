import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import './AdminLayout.css';

export function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['ALL'] },
    { label: 'Patients', path: '/patients', icon: '🏥', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'] },
    { label: 'Doctors', path: '/doctors', icon: '👨‍⚕️', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'] },
    { label: 'Appointments', path: '/appointments', icon: '📅', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'] },
    { label: 'Departments', path: '/departments', icon: '🏢', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'] },
    { label: 'OPD Consultation', path: '/opd', icon: '🩺', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
    { label: 'IPD / Wards', path: '/ipd', icon: '🛏️', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN'] },
    { label: 'Pharmacy', path: '/pharmacy', icon: '💊', roles: ['SUPER_ADMIN', 'PHARMACIST', 'HOSPITAL_ADMIN'] },
    { label: 'Laboratory', path: '/laboratory', icon: '🔬', roles: ['SUPER_ADMIN', 'LAB_TECHNICIAN', 'HOSPITAL_ADMIN'] },
    { label: 'Billing', path: '/billing', icon: '🧾', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'] },
    { label: 'Settings', path: '/settings', icon: '⚙️', roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'] },
  ];

  // Filter navigation items by current user role
  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || item.roles.includes('ALL')) return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className="admin-shell">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">✚</div>
          <div className="brand-info">
            <span className="brand-title">LifeCare HMS</span>
            <span className="brand-badge">MCA Final</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            &times;
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info-brief">
            <span className="user-role-tag">{user?.role || 'Guest'}</span>
            <span className="user-name">{user?.name || 'Authorized User'}</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={toggleSidebar}
              aria-label="Toggle navigation drawer"
            >
              ☰
            </button>
            <span className="topbar-hospital-name">Main Hospital Campus</span>
          </div>

          <div className="topbar-right">
            <div className="topbar-profile-container">
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                <div className="profile-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="profile-name">{user?.name || 'User'}</span>
                <span className="dropdown-arrow" aria-hidden="true">▾</span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-user-name">{user?.name || 'User'}</p>
                    <p className="dropdown-user-role">{user?.role || 'Role'}</p>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                  >
                    Hospital Settings
                  </button>
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
