import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import axios from 'axios';
import './LeaveApplication.css';

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
  return <span className={`leave-status-badge ${cls}`}>{status || 'Pending'}</span>;
};

const LeaveApplication = () => {
  const { user } = useAuth();

  const [programId, setProgramId] = useState('');
  const [programIdLoading, setProgramIdLoading] = useState(true);
  const [programIdError, setProgramIdError] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [leavesError, setLeavesError] = useState(null);

  const totalDays = calcTotalDays(startDate, endDate);

  useEffect(() => {
    if (user?.email) {
      fetchProgramId();
      fetchLeaves();
    }
  }, [user]);

  const fetchProgramId = async () => {
    try {
      setProgramIdLoading(true);
      setProgramIdError(null);
      const response = await apiClient.post('/api/check-student-eligibility', { email: user.email });
      if (response.data.success && response.data.programId) {
        setProgramId(response.data.programId);
      } else {
        setProgramIdError('Could not load Program ID. Please contact admin.');
      }
    } catch {
      setProgramIdError('Could not load Program ID. Please try again.');
    } finally {
      setProgramIdLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLeavesLoading(true);
      setLeavesError(null);
      const response = await apiClient.post('/api/get-my-leaves', { email: user.email });
      if (response.data.success) {
        setLeaves(response.data.leaves);
      } else {
        setLeavesError(response.data.message || 'Failed to load leave applications.');
      }
    } catch {
      setLeavesError('Failed to load leave applications. Please try again.');
    } finally {
      setLeavesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!programId) {
      setSubmitError('Program ID not loaded. Please refresh the page.');
      return;
    }

    if (totalDays === null || totalDays < 1) {
      setSubmitError('End date must be on or after the start date.');
      return;
    }

    try {
      setSubmitLoading(true);
      const response = await apiClient.post('/api/submit-leave', {
        email: user.email,
        name: user.name || '',
        programId,
        startDate,
        endDate,
        reason
      });

      if (response.data.success) {
        setSubmitSuccess(true);
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        setSubmitError(response.data.message || 'Failed to submit leave application.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit leave application. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="leave-layout">
      <Sidebar />
      <div className="leave-content">
        <header className="leave-header">
          <div>
            <h1 className="page-title">Leave Application</h1>
            <p className="page-subtitle">Submit and track your leave requests</p>
          </div>
          <div className="leave-notice">
            <p>
              Students requesting leave must submit this form <strong>at least one week in advance</strong>.
              All leave is subject to approval by the RISE Team. Only <strong>one leave per program</strong> is allowed.
            </p>
            <p>
              If a student fails to inform us in time by not filling this form, the missed mentor session will be counted as completed even if they do not attend it.
            </p>
          </div>
        </header>

        <div className="leave-body">

          <div className="leave-card">
            <h2 className="leave-card-title">Apply for Leave</h2>

            <div className="leave-student-info">
              <div className="leave-info-row">
                <span className="leave-info-label">Name</span>
                <span className="leave-info-value">{user?.name || '—'}</span>
              </div>
              <div className="leave-info-row">
                <span className="leave-info-label">Email</span>
                <span className="leave-info-value">{user?.email || '—'}</span>
              </div>
              <div className="leave-info-row">
                <span className="leave-info-label">Program ID</span>
                <span className="leave-info-value">
                  {programIdLoading ? (
                    <span className="leave-loading-inline">Loading...</span>
                  ) : programIdError ? (
                    <span className="leave-error-inline">{programIdError}</span>
                  ) : (
                    <span className="leave-program-id">{programId}</span>
                  )}
                </span>
              </div>
            </div>

            <form className="leave-form" onSubmit={handleSubmit}>
              <div className="leave-form-row">
                <div className="leave-form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="leave-form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || today}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                {totalDays !== null && (
                  <div className="leave-days-badge">
                    <span className="leave-days-number">{totalDays}</span>
                    <span className="leave-days-label">{totalDays === 1 ? 'day' : 'days'}</span>
                  </div>
                )}
              </div>

              <div className="leave-form-group">
                <label htmlFor="reason">Reason for Leave</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe the reason for your leave..."
                  rows={4}
                  required
                />
              </div>

              {submitError && (
                <div className="leave-form-error">{submitError}</div>
              )}
              {submitSuccess && (
                <div className="leave-form-success">Leave application submitted successfully!</div>
              )}

              <button
                type="submit"
                className="leave-submit-btn"
                disabled={submitLoading || programIdLoading || !!programIdError}
              >
                {submitLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>

          <div className="leave-card">
            <div className="leave-card-header">
              <h2 className="leave-card-title">My Leaves</h2>
              <button
                className="btn-refresh"
                onClick={fetchLeaves}
                disabled={leavesLoading}
              >
                {leavesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {leavesLoading ? (
              <div className="leave-state-box">
                <div className="loading-spinner"></div>
                <p>Loading your leave applications...</p>
              </div>
            ) : leavesError ? (
              <div className="leave-state-box leave-error-box">
                <p>{leavesError}</p>
                <button className="btn-refresh" onClick={fetchLeaves}>Try Again</button>
              </div>
            ) : leaves.length === 0 ? (
              <div className="leave-state-box">
                <p>You haven't submitted any leave applications yet.</p>
              </div>
            ) : (
              <div className="leave-table-wrapper">
                <table className="leave-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Program ID</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave, index) => (
                      <tr key={leave.id}>
                        <td className="col-index">{index + 1}</td>
                        <td className="col-program">{leave.programId || '—'}</td>
                        <td className="col-date">{formatDate(leave.startDate)}</td>
                        <td className="col-date">{formatDate(leave.endDate)}</td>
                        <td className="col-days">
                          {calcTotalDays(leave.startDate, leave.endDate) ?? '—'}
                        </td>
                        <td className="col-reason">{leave.reason || '—'}</td>
                        <td className="col-status">
                          <StatusBadge status={leave.status} />
                        </td>
                        <td className="col-note">{leave.denialReason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeaveApplication;
