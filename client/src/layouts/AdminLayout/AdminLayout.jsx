import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../app/providers/AuthContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from '../../components/common/PwaInstallModal/PwaInstallModal';
import './AdminLayout.css';

export function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { canInstall, triggerInstall, showGuideModal, setShowGuideModal, isIOS } = usePwaInstall();
  const profileContainerRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileOpen &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    toast.info('Signed out successfully.');
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['ALL'] },
    { label: 'Appointments', path: '/appointments', icon: '📅', roles: ['RECEPTIONIST', 'DOCTOR'] },
    { label: 'My Schedule', path: '/schedule', icon: '⏰', roles: ['DOCTOR'] },
    { label: 'Patients', path: '/patients', icon: '🏥', roles: ['RECEPTIONIST', 'DOCTOR'] },
    { label: 'Doctors & Staff', path: '/doctors', icon: '👨‍⚕️', roles: ['RECEPTIONIST'] },
  ];

  // Filter navigation items by current user role
  const isPatient = user?.role === 'PATIENT';
  const filteredNavItems = isPatient
    ? [
        { label: 'Dashboard', path: '/appointments', icon: null },
        { label: 'Book a visit', path: '/appointments?tab=book', icon: null },
        { label: 'My appointments', path: '/appointments?tab=my', icon: null },
      ]
    : navItems.filter((item) => {
        if (!user) return false;
        if (item.roles.includes('ALL')) return true;
        return item.roles.includes(user.role);
      });

  const isNavActive = (itemPath) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (itemPath.includes('?')) {
      return currentPath + currentSearch === itemPath;
    }

    if (currentPath === itemPath) {
      if (!currentSearch) return true;
      const isChildQueryActive = filteredNavItems.some(
        (other) =>
          other.path !== itemPath &&
          other.path.startsWith(itemPath) &&
          currentPath + currentSearch === other.path
      );
      return !isChildQueryActive;
    }

    return false;
  };

  return (
    <div className="admin-shell">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${isPatient ? 'sidebar-patient' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">+</div>
          <div className="brand-info">
            <span className="brand-title">LifeCare HMS</span>
            <span className="brand-badge">{isPatient ? 'Patient portal' : 'MCA Final'}</span>
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
              key={item.label}
              to={item.path}
              className={() => `nav-link ${isNavActive(item.path) ? 'nav-link-active' : ''}`}
              onClick={closeSidebar}
            >
              {item.icon && <span className="nav-icon" aria-hidden="true">{item.icon}</span>}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info-brief">
            <span className="user-role-tag">Signed in as</span>
            <span className="user-name">{user?.name || 'User'}</span>
          </div>
          {canInstall && (
            <button
              type="button"
              className="sidebar-pwa-install-btn"
              onClick={triggerInstall}
            >
              📲 Install App on Phone
            </button>
          )}
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
            {canInstall && (
              <button
                type="button"
                className="btn-pwa-install"
                onClick={triggerInstall}
                title="Install application on your device"
              >
                📲 Install App
              </button>
            )}
            <div className="topbar-profile-container" ref={profileContainerRef}>
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

      <PwaInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
      />
    </div>
  );
}

export default AdminLayout;
