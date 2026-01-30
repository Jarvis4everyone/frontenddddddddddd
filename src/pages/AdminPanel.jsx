import { useState, useEffect } from 'react';
import { adminAPI, isSubscriptionActive } from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all'); // 'all', 'active', 'expired', 'none'
  const [contactStatusFilter, setContactStatusFilter] = useState('all'); // 'all', 'new', 'read', 'replied', 'archived'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // User management states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState(null); // 'activate' or 'extend'
  const [subscriptionMonths, setSubscriptionMonths] = useState(1);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    password: '',
    is_admin: false,
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'contacts') {
      loadContacts();
    }
  }, [activeTab, contactStatusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const status = contactStatusFilter === 'all' ? null : contactStatusFilter;
      const data = await adminAPI.getAllContacts(0, 100, status);
      setContacts(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserFormData({
      name: '',
      email: '',
      contact_number: '',
      password: '',
      is_admin: false,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      contact_number: user.contact_number || '',
      password: '',
      is_admin: user.is_admin,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (selectedUser) {
        // For update, send all fields including is_admin
        const updateData = {
          name: userFormData.name,
          email: userFormData.email,
          contact_number: userFormData.contact_number,
          is_admin: userFormData.is_admin,
        };
        await adminAPI.updateUser(selectedUser.id, updateData);
        setSuccess('User updated successfully');
      } else {
        // For create, is_admin is optional and defaults to false
        const createData = {
          name: userFormData.name,
          email: userFormData.email,
          contact_number: userFormData.contact_number,
          password: userFormData.password,
          ...(userFormData.is_admin && { is_admin: true }), // Only include if true
        };
        await adminAPI.createUser(createData);
        setSuccess('User created successfully');
      }
      setShowUserModal(false);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await adminAPI.deleteUser(userId);
      setSuccess('User deleted successfully');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.resetUserPassword(selectedUser.id, newPassword);
      setSuccess('Password reset successfully');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserDetails = async (user) => {
    setLoading(true);
    setError('');
    try {
      const details = await adminAPI.getUserById(user.id);
      setUserDetails(details);
      setShowUserDetailsModal(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscriptionModal = (userId, action) => {
    setSelectedUser({ id: userId });
    setSubscriptionAction(action);
    setSubscriptionMonths(1);
    setShowSubscriptionModal(true);
  };

  const handleSubmitSubscriptionAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (subscriptionAction === 'activate') {
        await adminAPI.activateSubscription(selectedUser.id, subscriptionMonths);
        setSuccess('Subscription activated successfully');
      } else if (subscriptionAction === 'extend') {
        await adminAPI.extendSubscription(selectedUser.id, subscriptionMonths);
        setSuccess('Subscription extended successfully');
      }
      setShowSubscriptionModal(false);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubscription = async (userId) => {
    handleOpenSubscriptionModal(userId, 'activate');
  };

  const handleExtendSubscription = async (userId) => {
    handleOpenSubscriptionModal(userId, 'extend');
  };

  const handleCancelSubscription = async (userId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.cancelSubscription(userId);
      setSuccess('Subscription cancelled successfully');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContactStatus = async (contactId, newStatus) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.updateContactStatus(contactId, newStatus);
      setSuccess('Contact status updated successfully');
      await loadContacts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update contact status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact message?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.deleteContact(contactId);
      setSuccess('Contact deleted successfully');
      await loadContacts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete contact');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContactDetails = async (contact) => {
    setLoading(true);
    setError('');
    try {
      const details = await adminAPI.getContactById(contact.id);
      setContactDetails(details);
      setShowContactDetailsModal(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-top">
          <div>
            <h1>Admin Panel</h1>
            <p>Manage users and subscriptions</p>
          </div>
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className={`admin-tabs ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('users');
            setMobileMenuOpen(false);
          }}
        >
          <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Users</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('contacts');
            setMobileMenuOpen(false);
          }}
        >
          <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Contacts</span>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'users' && (
        <div className="admin-content">
          <div className="content-header">
            <h2>User Management</h2>
            <div className={`header-actions ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Users</option>
                <option value="active">Active Subscription</option>
                <option value="expired">Expired/Cancelled</option>
                <option value="none">No Subscription</option>
              </select>
              <button onClick={handleCreateUser} className="create-button">
                <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Create User</span>
              </button>
            </div>
          </div>

          {loading && !users.length ? (
            <div className="loading">Loading users...</div>
          ) : (
            <>
              <div className="stats-summary">
                <div className="stat-card">
                  <div className="stat-value">{users.length}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card stat-active">
                  <div className="stat-value">
                    {users.filter((u) => u.has_active_subscription).length}
                  </div>
                  <div className="stat-label">Active Subscriptions</div>
                </div>
                <div className="stat-card stat-expired">
                  <div className="stat-value">
                    {users.filter((u) => u.has_subscription && !u.has_active_subscription).length}
                  </div>
                  <div className="stat-label">Expired/Cancelled</div>
                </div>
                <div className="stat-card stat-none">
                  <div className="stat-value">{users.filter((u) => !u.has_subscription).length}</div>
                  <div className="stat-label">No Subscription</div>
                </div>
              </div>
              <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Admin</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>End Date</th>
                    <th>Created</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((user) => {
                      if (subscriptionFilter === 'all') return true;
                      if (subscriptionFilter === 'active') return user.has_active_subscription;
                      if (subscriptionFilter === 'expired')
                        return user.has_subscription && !user.has_active_subscription;
                      if (subscriptionFilter === 'none') return !user.has_subscription;
                      return true;
                    })
                    .map((user) => (
                    <tr key={user.id} className={user.is_admin ? 'admin-row' : ''}>
                      <td>
                        {user.name}
                        {user.is_admin && <span className="admin-badge">Admin</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>{user.contact_number || '-'}</td>
                      <td>
                        <span className={user.is_admin ? 'admin-indicator' : 'user-indicator'}>
                          {user.is_admin ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        {user.has_subscription ? (
                          <span className="subscription-badge has-subscription">
                            {user.subscription?.plan_id || 'N/A'}
                          </span>
                        ) : (
                          <span className="subscription-badge no-subscription">None</span>
                        )}
                      </td>
                      <td>
                        {user.subscription ? (
                          <span
                            className={`subscription-status subscription-${user.subscription.status.toLowerCase()}`}
                            title={
                              user.subscription.status === 'active' && !isSubscriptionActive(user.subscription)
                                ? 'Subscription expired'
                                : user.subscription.status
                            }
                          >
                            {user.subscription.status === 'active' && !isSubscriptionActive(user.subscription)
                              ? 'EXPIRED'
                              : user.subscription.status.toUpperCase()}
                            {user.has_active_subscription && (
                              <span className="active-indicator" title="Active and not expired">✓</span>
                            )}
                          </span>
                        ) : (
                          <span className="subscription-status subscription-none">-</span>
                        )}
                      </td>
                      <td>
                        {user.subscription ? (
                          <span
                            className={user.has_active_subscription ? 'active-date' : 'expired-date'}
                            title={
                              user.has_active_subscription
                                ? 'Subscription is active'
                                : 'Subscription has expired or is cancelled'
                            }
                          >
                            {new Date(user.subscription.end_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="no-date">-</span>
                        )}
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewUserDetails(user)}
                            className="action-btn view-btn"
                            title="View Details"
                          >
                            <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="action-btn delete-btn"
                            title="Delete User"
                          >
                            <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="admin-content">
          <div className="content-header">
            <h2>Contact Messages</h2>
            <div className={`header-actions ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {loading && !contacts.length ? (
            <div className="loading">Loading contacts...</div>
          ) : (
            <div className="table-container">
              <table className="admin-table contacts-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.name}</td>
                      <td>{contact.email}</td>
                      <td>{contact.subject || 'General Inquiry'}</td>
                      <td className="message-cell">
                        <div className="message-preview">
                          {contact.message.length > 50 
                            ? `${contact.message.substring(0, 50)}...` 
                            : contact.message}
                        </div>
                      </td>
                      <td>
                        <span className={`contact-status contact-${contact.status}`}>
                          {contact.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewContactDetails(contact)}
                            className="action-btn view-btn"
                            title="View Details"
                          >
                            <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="action-btn delete-btn"
                            title="Delete Contact"
                          >
                            <svg className="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedUser ? 'Edit User' : 'Create User'}</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveUser} className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                  disabled={!!selectedUser}
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  value={userFormData.contact_number}
                  onChange={(e) => setUserFormData({ ...userFormData, contact_number: e.target.value })}
                />
              </div>
              {!selectedUser && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required={!selectedUser}
                  />
                </div>
              )}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={userFormData.is_admin}
                    onChange={(e) => setUserFormData({ ...userFormData, is_admin: e.target.checked })}
                  />
                  <span style={{ marginLeft: '8px', fontWeight: '500' }}>Admin User</span>
                </label>
                <div className="form-note" style={{ marginTop: '8px' }}>
                  <p>
                    {selectedUser
                      ? '⚠️ Changing admin status will grant/revoke full administrative access.'
                      : 'Only admins can create other admin users. Admin users have full access to the admin panel.'}
                  </p>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowUserModal(false)} className="cancel-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancel</span>
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? (
                    <>
                      <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password for {selectedUser.name}</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-body">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-note">
                <p>⚠️ This will log the user out from all devices.</p>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="cancel-button">
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancel</span>
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? (
                    <>
                      <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Action Modal */}
      {showSubscriptionModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowSubscriptionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {subscriptionAction === 'activate' ? 'Activate' : 'Extend'} Subscription
              </h2>
              <button className="modal-close" onClick={() => setShowSubscriptionModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitSubscriptionAction} className="modal-body">
              <div className="form-group">
                <label>Number of Months</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={subscriptionMonths}
                  onChange={(e) => setSubscriptionMonths(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div className="form-note">
                <p>
                  {subscriptionAction === 'activate'
                    ? 'This will create a new subscription for the user.'
                    : 'This will extend the user\'s current subscription.'}
                </p>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSubscriptionModal(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Processing...' : subscriptionAction === 'activate' ? 'Activate' : 'Extend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && userDetails && (
        <div className="modal-overlay" onClick={() => setShowUserDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close" onClick={() => setShowUserDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{userDetails.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{userDetails.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact Number:</span>
                  <span className="detail-value">{userDetails.contact_number || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Admin Status:</span>
                  <span className="detail-value">
                    {userDetails.is_admin ? (
                      <span className="admin-badge">Administrator</span>
                    ) : (
                      'Regular User'
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Created:</span>
                  <span className="detail-value">
                    {new Date(userDetails.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Updated:</span>
                  <span className="detail-value">
                    {new Date(userDetails.updated_at).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">
                    {userDetails.last_login
                      ? new Date(userDetails.last_login).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                {userDetails.subscription && (
                  <>
                    <div className="detail-divider"></div>
                    <div className="detail-section-title">Subscription Information</div>
                    <div className="detail-item">
                      <span className="detail-label">Plan:</span>
                      <span className="detail-value">{userDetails.subscription.plan_id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value">
                        <span
                          className={`subscription-status subscription-${userDetails.subscription.status.toLowerCase()}`}
                        >
                          {userDetails.subscription.status.toUpperCase()}
                          {userDetails.has_active_subscription && (
                            <span className="active-indicator">✓</span>
                          )}
                        </span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Start Date:</span>
                      <span className="detail-value">
                        {new Date(userDetails.subscription.start_date).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">End Date:</span>
                      <span className="detail-value">
                        <span className={userDetails.has_active_subscription ? 'active-date' : 'expired-date'}>
                          {new Date(userDetails.subscription.end_date).toLocaleString()}
                        </span>
                      </span>
                    </div>
                    {userDetails.subscription.cancelled_at && (
                      <div className="detail-item">
                        <span className="detail-label">Cancelled At:</span>
                        <span className="detail-value">
                          {new Date(userDetails.subscription.cancelled_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {!userDetails.subscription && (
                  <>
                    <div className="detail-divider"></div>
                    <div className="detail-section-title">Subscription Information</div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value">
                        <span className="subscription-status subscription-none">No Subscription</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    handleEditUser(userDetails);
                  }}
                  className="save-button"
                >
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit User</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserDetailsModal(false)}
                  className="cancel-button"
                >
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {showContactDetailsModal && contactDetails && (
        <div className="modal-overlay" onClick={() => setShowContactDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Contact Message Details</h2>
              <button className="modal-close" onClick={() => setShowContactDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{contactDetails.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{contactDetails.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Subject:</span>
                  <span className="detail-value">{contactDetails.subject || 'General Inquiry'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    <span className={`contact-status contact-${contactDetails.status}`}>
                      {contactDetails.status.toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">
                    {new Date(contactDetails.created_at).toLocaleString()}
                  </span>
                </div>
                {contactDetails.user_id && (
                  <div className="detail-item">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{contactDetails.user_id}</span>
                  </div>
                )}
                <div className="detail-divider"></div>
                <div className="detail-section-title">Message</div>
                <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', width: '100%' }}>
                    {contactDetails.message}
                  </span>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this contact message?')) {
                      setShowContactDetailsModal(false);
                      handleDeleteContact(contactDetails.id);
                    }
                  }}
                  className="action-btn delete-btn"
                  style={{ flex: 1, marginRight: '10px' }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactDetailsModal(false)}
                  className="cancel-button"
                  style={{ flex: 1 }}
                >
                  <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

