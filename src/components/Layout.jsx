import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FileImport from './FileImport';
import { useData } from '../contexts/DataContext';
import './Layout.css';

const Layout = ({ children }) => {
  const [showImport, setShowImport] = useState(false);
  const { isDataLoaded } = useData();
  const location = useLocation();

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo-title">
            <div className="logo">SCAI</div>
            <div className="title-section">
              <h1>SCAI Architecture Visualization</h1>
              <p>Interactive Content Generation System Explorer</p>
            </div>
          </div>

          <nav className="nav-menu">
            <Link
              to="/flow-brain"
              className={`nav-link ${location.pathname === '/flow-brain' ? 'active' : ''}`}
            >
              Flow Brain
            </Link>
            <Link
              to="/diagram"
              className={`nav-link ${location.pathname === '/diagram' ? 'active' : ''}`}
            >
              Interactive Diagram
            </Link>
          </nav>

          <div className="header-actions">
            <div className="status-indicator">
              <div className={`status-dot ${isDataLoaded ? 'loaded' : 'not-loaded'}`}></div>
              <span className="status-text">
                {isDataLoaded ? 'Data Loaded' : 'No Data'}
              </span>
            </div>
            <button className="import-btn" onClick={() => setShowImport(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Import Files
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      {showImport && <FileImport onClose={() => setShowImport(false)} />}
    </div>
  );
};

export default Layout;
