import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadAPI, checkSubscriptionStatus, isSubscriptionActive } from '../services/api';
import './Downloads.css';

const Downloads = () => {
  const { subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setError('');

    try {
      // First check subscription status (as per API docs recommendation)
      const subStatus = await checkSubscriptionStatus();
      
      if (!subStatus.active) {
        if (subStatus.expired) {
          setError('Your subscription has expired. Please renew to download.');
        } else if (subStatus.noSubscription) {
          setError('No subscription found. Please purchase a subscription to download.');
        } else {
          setError('You need an active subscription to download files.');
        }
        setLoading(false);
        return;
      }

      // Proceed with download
      const blob = await downloadAPI.downloadFile();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jarvis4everyone.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to download file. Please check your subscription status.'
      );
    } finally {
      setLoading(false);
    }
  };

  const canDownload = isSubscriptionActive(subscription);

  return (
    <div className="downloads-page">
      {/* Downloads Section */}
      <section className="downloads-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Downloads</h2>
            <p className="downloads-intro">
              Access the latest source code from our tutorial series. Each download package is complete 
              with all necessary files, documentation, and resources to get you started immediately.
            </p>
            
            <div className="download-content">
              <div className="download-card">
                <h3 className="download-card-title">Download Package</h3>
                
                {canDownload ? (
                  <div className="download-info">
                    <div className="download-status-section">
                      <div className="status-row">
                        <span className="status-label">Subscription Status</span>
                        <span className="status-badge active" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                          ACTIVE
                        </span>
                      </div>
                      <div className="status-row">
                        <span className="status-label">Valid Until</span>
                        <span className="status-value">{new Date(subscription.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="package-contents-section">
                      <h4 className="contents-title">Package Contents</h4>
                      <ul className="contents-checklist">
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Latest Source Code</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Tutorial Videos</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>README Files</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Explanation Documents</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Setup Guides</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="download-action">
                      <button
                        onClick={handleDownload}
                        className="download-button"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Download Now</span>
                          </>
                        )}
                      </button>
                      {error && <div className="error-message">{error}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="download-info">
                    <div className="download-status-section">
                      <div className="status-row">
                        <span className="status-label">Subscription Status</span>
                        <span className="status-badge inactive" style={{ backgroundColor: '#000000', color: '#ffffff', border: '1px solid #ffffff' }}>
                          {subscription
                            ? subscription.status === 'active' && new Date(subscription.end_date) <= new Date()
                              ? 'EXPIRED'
                              : subscription.status.toUpperCase()
                            : 'NO SUBSCRIPTION'}
                        </span>
                      </div>
                      {subscription && (
                        <div className="status-row">
                          <span className="status-label">Valid Until</span>
                          <span className="status-value">{new Date(subscription.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="package-contents-section">
                      <h4 className="contents-title">Package Contents</h4>
                      <ul className="contents-checklist">
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Latest Source Code</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Tutorial Videos</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>README Files</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Explanation Documents</span>
                        </li>
                        <li className="checklist-item">
                          <span className="check-icon">✓</span>
                          <span>Setup Guides</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="download-action">
                      <button className="download-button disabled" disabled>
                        <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span>Download Unavailable</span>
                      </button>
                      {error && <div className="error-message">{error}</div>}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Downloads;

