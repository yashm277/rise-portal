import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import { authAPI } from '../services/api';
import { FaEye, FaEyeSlash, FaCheck } from 'react-icons/fa';
import './ChangePassword.css';

const ChangePassword = () => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    if (confirmPassword) {
      setPasswordsMatch(value === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    setPasswordsMatch(value === newPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setPasswordsMatch(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);

      const response = await authAPI.changePassword(user.email, newPassword);

      if (response.data.success) {
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordsMatch(true);

        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(response.data.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Change Password</h1>
            <p className="page-subtitle">Update your account password</p>
          </div>
        </header>

        <div className="change-password-container">
          <div className="card-rise change-password-card">
            <div className="card-header">
              <h2>Set New Password</h2>
              <p className="card-subtitle">Choose a strong password to secure your account</p>
            </div>

            {success && (
              <div className="success-message">
                <FaCheck /> Password changed successfully!
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="change-password-form">
              <div className="form-group">
                <label htmlFor="newPassword">Enter New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={handleNewPasswordChange}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Re-enter New Password</label>
                <div className={`password-input-wrapper ${!passwordsMatch && confirmPassword ? 'error' : ''}`}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    className={`form-input ${!passwordsMatch && confirmPassword ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {!passwordsMatch && confirmPassword && (
                  <p className="password-mismatch-text">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary change-password-btn"
                disabled={loading || !passwordsMatch || !newPassword || !confirmPassword}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>

              <div className="password-requirements">
                <p className="requirements-title">Password Requirements:</p>
                <ul>
                  <li className={newPassword.length >= 6 ? 'valid' : ''}>
                    At least 6 characters long
                  </li>
                  <li className={newPassword === confirmPassword && newPassword ? 'valid' : ''}>
                    Both passwords match
                  </li>
                </ul>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
