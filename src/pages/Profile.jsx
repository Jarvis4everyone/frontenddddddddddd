import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, isSubscriptionActive } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, subscription, refreshUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        contact_number: user.contact_number || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const updatedUser = await profileAPI.updateMyProfile(formData);
      await refreshUser();
      setProfileSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusColor = (status, subscription) => {
    // Check if subscription is actually active (not expired)
    if (status === 'active' && subscription) {
      const isActive = isSubscriptionActive(subscription);
      if (!isActive) {
        return '#dc3545'; // Show as expired if past end_date
      }
    }
    
    switch (status) {
      case 'active':
        return '#28a745';
      case 'expired':
        return '#dc3545';
      case 'cancelled':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getDisplayStatus = (subscription) => {
    if (!subscription) return 'No Subscription';
    
    if (subscription.status === 'active') {
      const isActive = isSubscriptionActive(subscription);
      return isActive ? 'ACTIVE' : 'EXPIRED';
    }
    
    return subscription.status.toUpperCase();
  };

  return (
    <div className="profile-page">
      {/* Profile Section */}
      <section className="profile-section">
        <div className="section-container">
          <div className="section-box">
            <h2 className="section-title">Profile</h2>
            <p className="profile-intro">
              Manage your account and subscription information
            </p>
            
            <div className="profile-content-grid">
              {/* Subscription Information - Left */}
              <div className="profile-card">
                <h3 className="profile-card-title">Subscription Information</h3>
                {subscription ? (
                  <div className="subscription-details">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span
                          className="info-value status-badge"
                          style={{ backgroundColor: getStatusColor(subscription.status, subscription) }}
                        >
                          {getDisplayStatus(subscription)}
                        </span>
                      </div>
                      {subscription.status === 'active' && !isSubscriptionActive(subscription) && (
                        <div className="expiry-warning">
                          ⚠️ Your subscription has expired. Please renew to continue using the service.
                        </div>
                      )}
                      <div className="info-item">
                        <span className="info-label">Plan</span>
                        <span className="info-value">{subscription.plan_id}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Start Date</span>
                        <span className="info-value">
                          {new Date(subscription.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">End Date</span>
                        <span className="info-value">
                          {new Date(subscription.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Created At</span>
                        <span className="info-value">
                          {new Date(subscription.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {subscription.cancelled_at && (
                        <div className="info-item">
                          <span className="info-label">Cancelled At</span>
                          <span className="info-value">
                            {new Date(subscription.cancelled_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="no-subscription">
                    <p>No subscription found.</p>
                    <p>Please purchase a subscription to access downloads.</p>
                  </div>
                )}
              </div>

              {/* Account Information - Right */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3 className="profile-card-title">Account Information</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="edit-button"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
                {user ? (
                  <div className="account-details">
                    {!isEditing ? (
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Name</span>
                          <span className="info-value">{user.name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Contact Number</span>
                          <span className="info-value">{user.contact_number || 'Not provided'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Account Type</span>
                          <span className="info-value">
                            {user.is_admin ? 'Administrator' : 'User'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Member Since</span>
                          <span className="info-value">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {user.last_login && (
                          <div className="info-item">
                            <span className="info-label">Last Login</span>
                            <span className="info-value">
                              {new Date(user.last_login).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleProfileUpdate} className="profile-form">
                        <div className="form-group">
                          <label htmlFor="name">Name</label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your name"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact_number">Contact Number</label>
                          <input
                            type="tel"
                            id="contact_number"
                            name="contact_number"
                            value={formData.contact_number}
                            onChange={handleInputChange}
                            placeholder="+1234567890"
                          />
                        </div>
                        <div className="form-note">
                          <p>Note: Email and account type cannot be changed.</p>
                        </div>
                        <div className="form-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(false);
                              setFormData({
                                name: user.name || '',
                                contact_number: user.contact_number || '',
                              });
                              setProfileError('');
                              setProfileSuccess('');
                            }}
                            className="cancel-button"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="save-button"
                            disabled={profileLoading}
                          >
                            {profileLoading ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                        {profileError && <div className="error-message">{profileError}</div>}
                        {profileSuccess && <div className="success-message">{profileSuccess}</div>}
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="account-details">
                    <p>Loading profile information...</p>
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

export default Profile;

