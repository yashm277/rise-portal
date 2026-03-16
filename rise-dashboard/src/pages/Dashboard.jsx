import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import { scheduleAPI } from '../services/api';
import axios from 'axios';
import './Dashboard.css';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [driveLink, setDriveLink] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [bankMissing, setBankMissing] = useState(false);

  useEffect(() => {
    if (user?.email && user?.role === 'Student') {
      fetchStudentData();
    } else if (user?.email && ['Mentor', 'Writing Coach'].includes(user?.role)) {
      fetchHostUpcomingMeetings();
      checkBankDetails();
    } else if (user?.email && user?.role === 'Team') {
      fetchHostUpcomingMeetings();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const eligibilityResponse = await scheduleAPI.checkStudentEligibility(user.email);

      if (eligibilityResponse.data.success && eligibilityResponse.data.isActiveStudent) {
        const responseData = eligibilityResponse.data;
        setStudentInfo(responseData.studentData);
        if (responseData.driveLink) setDriveLink(responseData.driveLink);
        if (responseData.endDate) setEndDate(responseData.endDate);

        if (responseData.remainingSessions !== null && responseData.remainingSessions !== undefined) {
          setSessionData({
            remainingSessions: responseData.remainingSessions,
            completedSessions: responseData.completedSessions,
            totalSessions: responseData.remainingSessions + responseData.completedSessions,
            researchPackage: 'Standard',
            videoSubmission: responseData.videoSubmission,
            studentData: responseData.studentData
          });

          if (responseData.studentData?.programId) {
            try {
              const sessionsResponse = await scheduleAPI.getRemainingSessions(responseData.studentData.programId);
              if (sessionsResponse.data.success) {
                setSessionData(sessionsResponse.data);
              }
            } catch (err) {}
          }
        } else {
          const sessionsResponse = await scheduleAPI.getRemainingSessions(responseData.studentData.programId);
          if (sessionsResponse.data.success) {
            setSessionData(sessionsResponse.data);
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchHostUpcomingMeetings = async () => {
    try {
      setLoadingMeetings(true);
      const response = await scheduleAPI.getHostMeetings(user.email);

      if (response.data.success) {
        const meetingsByProgram = response.data.meetingsByProgram;
        const allMeetings = [];
        Object.keys(meetingsByProgram).forEach(programId => {
          meetingsByProgram[programId].forEach(meeting => allMeetings.push(meeting));
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = allMeetings
          .filter(meeting => {
            if (!meeting.date || meeting.date === '-') return false;
            const meetingDate = new Date(meeting.date);
            meetingDate.setHours(0, 0, 0, 0);
            return meetingDate >= today;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setUpcomingMeetings(upcoming);
      }
    } catch (error) {
    } finally {
      setLoadingMeetings(false);
    }
  };

  const checkBankDetails = async () => {
    try {
      const response = await apiClient.post('/api/get-bank-details', {
        email: user.email,
        role: user.role,
      });
      if (response.data.success) {
        const d = response.data.data;
        const hasData = !!(d.fullAddress || d.accountHolderName || d.accountNumber ||
          d.bankName || d.swiftCode || d.bankBranch || d.specialNumber);
        setBankMissing(!hasData);
      }
    } catch {
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const parseEndDate = (dateString) => {
    if (!dateString) return null;
    const [month, day, year] = dateString.split('/').map(Number);
    if (!month || !day || !year) return null;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return { date, daysLeft };
  };

  const formatDeadlineDate = (dateString) => {
    const parsed = parseEndDate(dateString);
    if (!parsed) return null;
    const d = parsed.date.getDate();
    const suffix = d === 1 || d === 21 || d === 31 ? 'st'
      : d === 2 || d === 22 ? 'nd'
      : d === 3 || d === 23 ? 'rd'
      : 'th';
    return `${d}${suffix} ${parsed.date.toLocaleDateString('en-US', { month: 'long' })} ${parsed.date.getFullYear()}`;
  };

  const sessionCountClass = () => {
    if (loading) return 'session-count session-count--loading';
    if (!sessionData) return 'session-count session-count--loading';
    return `session-count ${sessionData.remainingSessions === 0 ? 'session-count--depleted' : 'session-count--normal'}`;
  };

  const progressPct = sessionData
    ? Math.round((sessionData.completedSessions / sessionData.totalSessions) * 100)
    : 0;

  const deadlineParsed = parseEndDate(endDate);
  const showDeadlineWarning = deadlineParsed
    && sessionData
    && sessionData.remainingSessions > 0
    && deadlineParsed.daysLeft >= 0
    && deadlineParsed.daysLeft <= 30;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {user?.role === 'Student' ? 'Your research program at a glance' : 'Student Management Overview'}
            </p>
          </div>
        </header>

        {showDeadlineWarning && (
          <div className="deadline-warning-banner">
            <span className="deadline-warning-icon">⚠️</span>
            <div>
              <strong>Deadline Approaching in {deadlineParsed.daysLeft} day{deadlineParsed.daysLeft !== 1 ? 's' : ''}</strong>
              <p>Please note that the deadline for submitting your paper is approaching. Make sure to schedule any remaining sessions before this date.</p>
            </div>
          </div>
        )}

        <div className="summary-cards">
          {user?.role === 'Student' ? (
            <>
              <div className="card-rise summary-card">
                <h3>Remaining Mentor Sessions</h3>
                {loading ? (
                  <span className="session-count session-count--loading">…</span>
                ) : sessionData ? (
                  <>
                    <span className={sessionCountClass()}>
                      {sessionData.remainingSessions}
                    </span>
                    <p className="session-meta">of {sessionData.totalSessions} sessions</p>
                    <p className="session-package">
                      {sessionData.researchPackage === 'Premium' ? 'Publication' : sessionData.researchPackage} Package
                    </p>
                  </>
                ) : (
                  <span className="session-count session-count--loading" style={{ fontSize: '15px' }}>
                    Data unavailable
                  </span>
                )}
              </div>

              {sessionData?.videoSubmission?.isRequired && (
                <div className="card-rise summary-card info-card--warning">
                  <h3>🎥 Video Submission Required</h3>
                  <p className="card-body-text">
                    Thank you for taking {sessionData.completedSessions} sessions! Please upload your testimonial video.
                  </p>
                  <a
                    href="https://airtable.com/appTEjth26azczzBC/pag460LIHIAoVEAjr/form"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-action-btn card-action-btn--warning"
                  >
                    Upload Testimonial Video
                  </a>
                </div>
              )}

              {driveLink && (
                <div className="card-rise summary-card info-card--blue">
                  <h3>📁 My Drive</h3>
                  <p className="card-body-text">Access your research files and documents.</p>
                  <a
                    href={driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-action-btn card-action-btn--blue"
                  >
                    Open My Drive
                  </a>
                </div>
              )}

              {sessionData?.remainingSessions === 0 && (
                <div className="card-rise summary-card info-card--success">
                  <h3>🎉 Program Completed!</h3>
                  <p className="card-body-text">Congratulations! You've completed your program.</p>
                  <a
                    href="https://forms.gle/QvkbCneQwTe9c3NA6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-action-btn card-action-btn--success"
                  >
                    Submit Publication
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="card-rise summary-card">
              <h3>This Month</h3>
              <p className="summary-value" style={{ fontSize: '22px' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {user?.role === 'Student' && studentInfo ? (
          <>
            <div className="student-info-row">
              <div className="card-rise student-info-card">
                <h3>Program Information</h3>
                <p><strong>Program ID:</strong> {studentInfo.programId}</p>
                <p><strong>Mentor:</strong> {studentInfo.mentorName}</p>
                {sessionData && (
                  <p>
                    <strong>Package:</strong>{' '}
                    {sessionData.researchPackage === 'Premium' ? 'Publication' : sessionData.researchPackage}
                  </p>
                )}
              </div>

              {endDate && formatDeadlineDate(endDate) && (
                <div className="card-rise student-info-card student-deadline-card">
                  <h3>Program Deadline</h3>
                  <p className="deadline-date-value">{formatDeadlineDate(endDate)}</p>
                  <p className="deadline-note">
                    Kindly ensure that your paper is submitted on or before the above deadline.
                  </p>
                  <p className="deadline-note">
                    No further sessions or support will be provided after the deadline. Please plan accordingly.
                  </p>
                </div>
              )}
            </div>

            <div className="card-rise dashboard-main-card">
              <h3>Session Progress</h3>
              {sessionData ? (
                <>
                  <p><strong>Completed:</strong> {sessionData.completedSessions} sessions</p>
                  <p><strong>Remaining:</strong> {sessionData.remainingSessions} sessions</p>
                  <div className="progress-bar-container">
                    <div
                      className={`progress-bar-fill${sessionData.remainingSessions === 0 ? ' progress-bar-fill--complete' : ''}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {sessionData.remainingSessions === 0 && (
                    <p className="success-message">🎉 Your research program is complete!</p>
                  )}
                </>
              ) : loading ? (
                <p className="loading-text">Loading session data…</p>
              ) : (
                <p className="loading-text">Session data unavailable</p>
              )}
            </div>

            <p className="dashboard-nav-hint">
              Navigate using the sidebar to book sessions or view your schedule.
            </p>
          </>

        ) : user?.role === 'Parent' ? (
          <div className="card-rise parent-card">
            <h2>Welcome to RISE Research Dashboard</h2>
            <p>
              Thank you for being part of the RISE Research family. If you have any questions,
              please reach out to our support team.
            </p>
            <a href="mailto:wahiq@riseglobaleducation.com" className="contact-link">
              📧 wahiq@riseglobaleducation.com
            </a>
          </div>

        ) : ['Mentor', 'Writing Coach', 'Team'].includes(user?.role) ? (
          <>
          {bankMissing && (
            <div className="card-rise summary-card info-card--warning" style={{ cursor: 'default' }}>
              <h3>⚠️ Bank Details Missing</h3>
              <p className="card-body-text">
                Your bank details are missing. Kindly add them to ensure timely payments.
              </p>
              <button
                className="card-action-btn card-action-btn--warning"
                onClick={() => navigate('/bank-details')}
              >
                Add Bank Details
              </button>
            </div>
          )}
          <div className="card-rise upcoming-card">
            <h2>Upcoming Meetings</h2>
            {loadingMeetings ? (
              <div className="state-container">
                <div className="spinner" />
                <p>Loading meetings…</p>
              </div>
            ) : upcomingMeetings.length > 0 ? (
              <div className="rise-table-wrap">
                <table className="rise-table">
                  <thead>
                    <tr>
                      <th>Program ID</th>
                      <th>Meeting #</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingMeetings.map((meeting, index) => (
                      <tr key={index}>
                        <td>{meeting.programId}</td>
                        <td>{meeting.meetingNumber}</td>
                        <td>
                          {meeting.date
                            ? `${formatDate(meeting.date)} ${meeting.startTime}`
                            : meeting.startTime}
                        </td>
                        <td>
                          {meeting.date && meeting.endTime
                            ? `${formatDate(meeting.date)} ${meeting.endTime}`
                            : meeting.endTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-meetings">No upcoming meetings scheduled.</p>
            )}
          </div>
          </>

        ) : (
          <div className="card-rise default-card">
            <h2>Welcome to RISE Research Dashboard</h2>
            <p>Navigate using the sidebar to access available features.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
