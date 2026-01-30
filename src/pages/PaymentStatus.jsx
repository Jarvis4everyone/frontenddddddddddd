import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import './PaymentStatus.css';

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status'); // 'success' or 'failed'
  const orderId = searchParams.get('order_id');
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    // Refresh subscription data if payment was successful
    if (status === 'success') {
      refreshSubscription();
    }
    setLoading(false);
  }, [status, refreshSubscription]);

  if (loading) {
    return (
      <div className="payment-status-container">
        <AnimatedBackground />
        <div className="payment-status-card">
          <div className="status-loader">
            <div className="loader-spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className="payment-status-container">
      <AnimatedBackground />
      <div className="payment-status-card">
        <div className="status-icon-wrapper">
          {isSuccess ? (
            <div className="status-icon success">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          ) : (
            <div className="status-icon failed">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          )}
        </div>

        <div className="status-content">
          <h1 className="status-title">
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </h1>
          
          <p className="status-message">
            {isSuccess ? (
              <>
                Congratulations! Your subscription has been activated successfully.
                <br />
                You now have full access to download the latest source code and all premium features.
              </>
            ) : (
              <>
                {errorMessage || 'We encountered an issue processing your payment.'}
                <br />
                Please try again or contact support if the problem persists.
              </>
            )}
          </p>

          {orderId && (
            <div className="order-info">
              <p className="order-label">Order ID:</p>
              <p className="order-value">{orderId}</p>
            </div>
          )}

          <div className="status-actions">
            {isSuccess ? (
              <>
                <button 
                  onClick={() => navigate('/downloads')}
                  className="status-button primary"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download Source Code</span>
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="status-button secondary"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Go to Dashboard</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="status-button primary"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Back to Dashboard</span>
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="status-button secondary"
                >
                  <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>Try Again</span>
                </button>
              </>
            )}
          </div>

          <div className="status-footer">
            <p>
              Need help? <a href="/dashboard#contact">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
