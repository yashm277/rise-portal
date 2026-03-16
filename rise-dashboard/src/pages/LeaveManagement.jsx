import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import axios from 'axios';
import './LeaveManagement.css';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const calcTotalDays = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (e < s) return null;
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
};

const StatusBadge = ({ status }) => {
  const cls = status?.toLowerCase() || 'pending';
  return <span className={`lm-status-badge ${cls}`}>{status || 'Pending'}</span>;
};

const FILTERS = ['All', 'Pending', 'Approved', 'Denied'];

const ActionPopup = ({ leave, onClose, onSubmit }) => {
  const [decision, setDecision] = useState('Approved');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const overlayRef = useRef(null);

  const days = calcTotalDays(leave.startDate, leave.endDate);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(leave.id, decision, reason);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="lm-popup">
        <div className="lm-popup-header">
          <h3>Take Action on Leave</h3>
          <button className="lm-popup-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="lm-popup-info">
          <div className="lm-popup-row">
            <span className="lm-popup-label">Student</span>
            <span className="lm-popup-value">
              {leave.studentName || leave.email}
              {leave.studentName && <span className="lm-popup-email"> · {leave.email}</span>}
            </span>
          </div>
          <div className="lm-popup-row">
            <span className="lm-popup-label">Program ID</span>
            <span className="lm-popup-value lm-mono">{leave.programId || '—'}</span>
          </div>
          <div className="lm-popup-row">
            <span className="lm-popup-label">Period</span>
            <span className="lm-popup-value">
              {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
              {days !== null && (
                <span className="lm-days-inline"> ({days} day{days !== 1 ? 's' : ''})</span>
              )}
            </span>
          </div>
          <div className="lm-popup-row lm-popup-row-top">
            <span className="lm-popup-label">Reason</span>
            <span className="lm-popup-value lm-reason-text">{leave.reason || '—'}</span>
          </div>
        </div>

        <form className="lm-popup-form" onSubmit={handleSubmit}>
          <div className="lm-radio-group">
            <label className={`lm-radio-option ${decision === 'Approved' ? 'selected approved' : ''}`}>
              <input
                type="radio"
                name="decision"
                value="Approved"
                checked={decision === 'Approved'}
                onChange={() => setDecision('Approved')}
              />
              <span>Approve</span>
            </label>
            <label className={`lm-radio-option ${decision === 'Denied' ? 'selected denied' : ''}`}>
              <input
                type="radio"
                name="decision"
                value="Denied"
                checked={decision === 'Denied'}
                onChange={() => setDecision('Denied')}
              />
              <span>Deny</span>
            </label>
          </div>

          <div className="lm-popup-field">
            <label htmlFor="action-reason">
              Note <span className="lm-optional">(optional)</span>
            </label>
            <textarea
              id="action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={decision === 'Approved' ? 'Add an approval note...' : 'Provide a reason for denial...'}
              rows={3}
            />
          </div>

          {error && <div className="lm-popup-error">{error}</div>}

          <div className="lm-popup-actions">
            <button type="button" className="lm-btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className={`lm-btn-submit ${decision === 'Approved' ? 'approve' : 'deny'}`}
              disabled={loading}
            >
              {loading ? 'Submitting...' : decision === 'Approved' ? 'Approve Leave' : 'Deny Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailsPopup = ({ leave, onClose }) => {
  const overlayRef = useRef(null);
  const days = calcTotalDays(leave.startDate, leave.endDate);
  const isApproved = leave.status === 'Approved';

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div className="lm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="lm-popup">
        <div className="lm-popup-header">
          <h3>Leave Details</h3>
          <button className="lm-popup-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="lm-popup-info">
          <div className="lm-popup-row">
            <span className="lm-popup-label">Student</span>
            <span className="lm-popup-value">
              {leave.studentName || leave.email}
              {leave.studentName && <span className="lm-popup-email"> · {leave.email}</span>}
            </span>
          </div>
          <div className="lm-popup-row">
            <span className="lm-popup-label">Program ID</span>
            <span className="lm-popup-value lm-mono">{leave.programId || '—'}</span>
          </div>
          <div className="lm-popup-row">
            <span className="lm-popup-label">Period</span>
            <span className="lm-popup-value">
              {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
              {days !== null && (
                <span className="lm-days-inline"> ({days} day{days !== 1 ? 's' : ''})</span>
              )}
            </span>
          </div>
          <div className="lm-popup-row lm-popup-row-top">
            <span className="lm-popup-label">Reason</span>
            <span className="lm-popup-value lm-reason-text">{leave.reason || '—'}</span>
          </div>

          <div className="lm-popup-divider" />

          <div className="lm-popup-row">
            <span className="lm-popup-label">Status</span>
            <span className="lm-popup-value"><StatusBadge status={leave.status} /></span>
          </div>
          <div className="lm-popup-row lm-popup-row-top">
            <span className="lm-popup-label">{isApproved ? 'Approval Note' : 'Denial Reason'}</span>
            <span className="lm-popup-value lm-reason-text">{leave.denialReason || '—'}</span>
          </div>
          <div className="lm-popup-row">
            <span className="lm-popup-label">{isApproved ? 'Approved By' : 'Denied By'}</span>
            <span className="lm-popup-value">{leave.approvedBy || '—'}</span>
          </div>
        </div>

        <div className="lm-popup-form">
          <div className="lm-popup-actions">
            <button type="button" className="lm-btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaveManagement = () => {
  const { user } = useAuth();

  const isPML2 = Array.isArray(user?.employeeTypes) && user.employeeTypes.includes('Program Manager L2');

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [actionLeave, setActionLeave] = useState(null);
  const [detailLeave, setDetailLeave] = useState(null);

  useEffect(() => {
    if (isPML2) fetchLeaves();
  }, [isPML2]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post('/api/get-all-leaves');
      if (response.data.success) {
        setLeaves(response.data.leaves);
      } else {
        setError(response.data.message || 'Failed to load leave applications.');
      }
    } catch {
      setError('Failed to load leave applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (recordId, status, reason) => {
    const response = await apiClient.post('/api/update-leave-status', {
      recordId,
      status,
      reason,
      approvedBy: user?.name || user?.email || ''
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update status.');
    }
    setLeaves(prev => prev.map(l =>
      l.id === recordId
        ? { ...l, status, denialReason: reason, approvedBy: user?.name || user?.email || '' }
        : l
    ));
  };

  const filteredLeaves = filter === 'All'
    ? leaves
    : leaves.filter(l => (l.status || 'Pending') === filter);

  const counts = {
    All: leaves.length,
    Pending: leaves.filter(l => (l.status || 'Pending') === 'Pending').length,
    Approved: leaves.filter(l => l.status === 'Approved').length,
    Denied: leaves.filter(l => l.status === 'Denied').length,
  };

  if (!isPML2) {
    return (
      <div className="lm-layout">
        <Sidebar />
        <div className="lm-content">
          <header className="lm-header">
            <div>
              <h1 className="page-title">Leave Applications</h1>
              <p className="page-subtitle">Manage student leave requests</p>
            </div>
          </header>
          <div className="lm-body">
            <div className="lm-state-box">
              <p>You do not have permission to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lm-layout">
      <Sidebar />
      <div className="lm-content">
        <header className="lm-header">
          <div>
            <h1 className="page-title">Leave Applications</h1>
            <p className="page-subtitle">Review and manage student leave requests</p>
          </div>
          <button className="btn-refresh" onClick={fetchLeaves} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className="lm-body">

          <div className="lm-filters">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`lm-filter-btn ${filter === f ? 'active' : ''} ${f.toLowerCase()}`}
                onClick={() => setFilter(f)}
              >
                {f}
                <span className="lm-filter-count">{counts[f]}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="lm-state-box">
              <div className="loading-spinner"></div>
              <p>Loading leave applications...</p>
            </div>
          ) : error ? (
            <div className="lm-state-box lm-error-box">
              <p>{error}</p>
              <button className="btn-refresh" onClick={fetchLeaves}>Try Again</button>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="lm-state-box">
              <p>No {filter !== 'All' ? filter.toLowerCase() : ''} leave applications found.</p>
            </div>
          ) : (
            <div className="lm-table-wrapper">
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Start Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave, index) => {
                    const days = calcTotalDays(leave.startDate, leave.endDate);
                    const status = leave.status || 'Pending';
                    return (
                      <tr key={leave.id}>
                        <td className="col-index">{index + 1}</td>
                        <td className="col-name">
                          {leave.studentName || leave.email}
                        </td>
                        <td className="col-date">{formatDate(leave.startDate)}</td>
                        <td className="col-days">{days ?? '—'}</td>
                        <td className="col-status"><StatusBadge status={status} /></td>
                        <td className="col-action">
                          {status === 'Pending' ? (
                            <button
                              className="lm-action-btn"
                              onClick={() => setActionLeave(leave)}
                            >
                              Take Action
                            </button>
                          ) : (
                            <button
                              className="lm-view-btn"
                              onClick={() => setDetailLeave(leave)}
                              aria-label="View details"
                            >
                              View →
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {actionLeave && (
        <ActionPopup
          leave={actionLeave}
          onClose={() => setActionLeave(null)}
          onSubmit={handleAction}
        />
      )}

      {detailLeave && (
        <DetailsPopup
          leave={detailLeave}
          onClose={() => setDetailLeave(null)}
        />
      )}
    </div>
  );
};

export default LeaveManagement;
