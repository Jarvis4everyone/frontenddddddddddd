import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from './AnimatedBackground';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout, subscription } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      <AnimatedBackground />
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/dashboard" className="nav-logo" onClick={handleLinkClick}>
            <h2>Jarvis4Everyone</h2>
          </Link>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
          </button>

          {/* Navigation Links */}
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link
              to="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              Profile
            </Link>
            <Link
              to="/downloads"
              className={`nav-link ${isActive('/downloads') ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              Downloads
            </Link>
            {user?.is_admin && (
              <Link
                to="/admin"
                className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                Admin
              </Link>
            )}
            <button onClick={handleLogout} className="nav-button" title="Logout">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="nav-button-text">Logout</span>
            </button>
          </div>
        </div>
      </nav>


      <main className={`main-content ${location.pathname === '/admin' ? 'admin-main-content' : ''} ${location.pathname === '/dashboard' ? 'dashboard-main-content' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;

