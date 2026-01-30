import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import './Auth.css';

// Password rules: min 8 chars, one uppercase, one number, one symbol
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
};

function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (!PASSWORD_RULES.uppercase.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!PASSWORD_RULES.digit.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!PASSWORD_RULES.symbol.test(password)) {
    return 'Password must contain at least one symbol (e.g. !@#$%^&*)';
  }
  return null;
}

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const registrationData = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      contact_number: userData.contact_number.trim(),
      password: userData.password,
    };

    const result = await register(registrationData);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <AnimatedBackground />
      <div className="auth-card">
        <div className="auth-header">
          <h1>Jarvis4Everyone</h1>
          <h2>Sign Up</h2>
          <p>Create your account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              type="tel"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              required
              placeholder="+1234567890"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
            />
            <span className="field-hint">At least 8 characters, one uppercase letter, one number, and one symbol</span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <svg className="button-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span>Sign Up</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

