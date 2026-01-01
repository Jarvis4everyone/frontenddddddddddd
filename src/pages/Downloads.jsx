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
              Download the complete Jarvis4Everyone application package.
              This includes all necessary files to get started.
            </p>
            
            <div className="download-content">
              <div className="download-card">
                <h3 className="download-card-title">Download Package</h3>
                
                {canDownload ? (
                  <div className="download-info">
                    <div className="package-info-grid">
                      <div className="info-item">
                        <span className="info-label">Package Name</span>
                        <span className="info-value">Jarvis4Everyone Application</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Subscription Status</span>
                        <span className="info-value status-badge" style={{ backgroundColor: '#28a745' }}>
                          ACTIVE
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Valid Until</span>
                        <span className="info-value">{new Date(subscription.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="package-contents-item">
                      <span className="info-label">Package Contents</span>
                      <span className="info-value">Source Code, Documentation, Setup Guides</span>
                    </div>
                    
                    <div className="download-action">
                      <button
                        onClick={handleDownload}
                        className="download-button"
                        disabled={loading}
                      >
                        {loading ? 'Downloading...' : 'Download Now'}
                      </button>
                      {error && <div className="error-message">{error}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="download-info">
                    <div className="package-info-grid">
                      <div className="info-item">
                        <span className="info-label">Package Name</span>
                        <span className="info-value">Jarvis4Everyone Application</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Subscription Status</span>
                        <span className="info-value status-badge" style={{ backgroundColor: '#dc3545' }}>
                          {subscription
                            ? subscription.status === 'active' && new Date(subscription.end_date) <= new Date()
                              ? 'EXPIRED'
                              : subscription.status.toUpperCase()
                            : 'NO SUBSCRIPTION'}
                        </span>
                      </div>
                      {subscription ? (
                        <div className="info-item">
                          <span className="info-label">Valid Until</span>
                          <span className="info-value">{new Date(subscription.end_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <div className="info-item">
                          <span className="info-label">Status</span>
                          <span className="info-value">No Subscription</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="package-contents-item">
                      <span className="info-label">Package Contents</span>
                      <span className="info-value">Source Code, Documentation, Setup Guides</span>
                    </div>
                    
                    <div className="download-action">
                      <button className="download-button disabled" disabled>
                        Download Unavailable
                      </button>
                      {error && <div className="error-message">{error}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="download-card">
                <h3 className="download-card-title">System Requirements</h3>
                <div className="requirements-grid">
                  <div className="info-item">
                    <span className="info-label">Operating System</span>
                    <span className="info-value">Windows 10 or later</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">RAM</span>
                    <span className="info-value">Minimum 4GB</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Storage</span>
                    <span className="info-value">500MB free space</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Internet</span>
                    <span className="info-value">Required for setup</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Downloads;

