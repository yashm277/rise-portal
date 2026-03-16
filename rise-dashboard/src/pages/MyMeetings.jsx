import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import { scheduleAPI } from '../services/api';
import './MyMeetings.css';

const PROGRESS_STAGES = [
  'Topic Finalisation (Week 1)',
  'Literature Review (Week 2)',
  'Research Design & Planning (Week 3)',
  'Data Collection (Week 4)',
  'Data Analysis (Week 5)',
  'Conclusion & Recommendations (Week 6)',
  'Drafting / Finishing Off (Week 7)',
  'Finalisation & Review (Week 8)',
];

const isFeedbackWindowOpen = (utcStartDateTime) => {
  if (!utcStartDateTime) return false;
  const start = new Date(utcStartDateTime);
  const now = new Date();
  const windowEnd = new Date(start.getTime() + 13 * 60 * 60 * 1000);
  return now >= start && now <= windowEnd;
};

const isMeetingFuture = (utcStartDateTime) => {
  if (!utcStartDateTime) return false;
  return new Date() < new Date(utcStartDateTime);
};

const isFeedbackDeadlinePassed = (utcStartDateTime) => {
  if (!utcStartDateTime) return false;
  const deadline = new Date(new Date(utcStartDateTime).getTime() + 12 * 60 * 60 * 1000);
  return new Date() > deadline;
};

const EMPTY_MENTOR_FORM = {
  didStudentAttend: '',
  classNotes: '',
  isOnTrack: '',
  progressStage: '',
  keyTasks: '',
  observations: '',
  writingCoachInstructions: '',
};

const EMPTY_WC_FORM = {
  didStudentAttend: '',
  classNotes: '',
  isOnTrack: '',
  progressStage: '',
  keyTasks: '',
  observations: '',
};

const EMPTY_TEAM_FORM = {
  didStudentAttend: '',
  isOnTrack: '',
  progressStage: '',
  extraSupport: '',
  counsellorMessage: '',
  mentorKeyPoints: '',
  mentorTasks: '',
  wcKeyPoints: '',
  wcTasks: '',
};

const MyMeetings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meetings, setMeetings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [meetingsByProgram, setMeetingsByProgram] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [feedbackModal, setFeedbackModal] = useState(null);
  const [mentorForm, setMentorForm] = useState(EMPTY_MENTOR_FORM);
  const [wcForm, setWcForm] = useState(EMPTY_WC_FORM);
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const [viewFeedbackModal, setViewFeedbackModal] = useState(null);
  const [viewFeedbackData, setViewFeedbackData] = useState(null);
  const [viewFeedbackLoading, setViewFeedbackLoading] = useState(false);

  useEffect(() => {
    if (user?.email && user?.role) {
      if (user.role === 'Student') {
        fetchStudentMeetings();
      } else if (['Mentor', 'Writing Coach', 'Team'].includes(user.role)) {
        fetchHostMeetings();
      }
    }
  }, [user]);

  const fetchStudentMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const eligibilityResponse = await scheduleAPI.checkStudentEligibility(user.email);

      if (!eligibilityResponse.data.success || !eligibilityResponse.data.isActiveStudent) {
        setError('You are not an active student. Please contact admin.');
        setMeetings(null);
        return;
      }

      const { programId } = eligibilityResponse.data.studentData;

      const meetingsResponse = await scheduleAPI.getAllSessions(programId);

      if (meetingsResponse.data.success) {
        const mentorMeetings = meetingsResponse.data.meetings.filter(m => m.meetingType === 'M');
        const coachMeetings = meetingsResponse.data.meetings.filter(m => m.meetingType === 'WC');
        const pmMeetings = meetingsResponse.data.meetings.filter(m => m.meetingType === 'R');

        setMeetings({
          mentor: mentorMeetings,
          writingCoach: coachMeetings,
          programManager: pmMeetings
        });

        setSummary(meetingsResponse.data.summary);
      } else {
        setError('Failed to load meetings. Please try again.');
        setMeetings(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load meetings. Please try again.');
      setMeetings(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleAPI.getHostMeetings(user.email);

      if (response.data.success) {
        setMeetingsByProgram(response.data.meetingsByProgram);
      } else {
        setError('Failed to load meetings. Please try again.');
        setMeetingsByProgram(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load meetings. Please try again.');
      setMeetingsByProgram(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status) => {
    if (!status || status.trim() === '') {
      return { label: 'Scheduled', className: 'scheduled' };
    }
    const statusLower = status.toLowerCase().trim();
    switch (statusLower) {
      case 'completed':
        return { label: 'Completed', className: 'completed' };
      case 'missed':
        return { label: 'Missed', className: 'missed' };
      case 'not valid':
      case 'notvalid':
        return { label: 'Not Valid', className: 'not-valid' };
      default:
        return { label: 'Scheduled', className: 'scheduled' };
    }
  };

  const MeetingTable = ({ meetings, emptyMessage }) => {
    if (!meetings || meetings.length === 0) {
      return (
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="table-wrapper">
        <table className="meeting-table">
          <thead>
            <tr>
              <th>Meeting #</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...meetings].sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0)).map((meeting, index) => (
              <tr key={index}>
                <td>{meeting.meetingNumber}</td>
                <td>{meeting.date ? `${formatDate(meeting.date)} ${meeting.startTime}` : meeting.startTime}</td>
                <td>{meeting.date && meeting.endTime ? `${formatDate(meeting.date)} ${meeting.endTime}` : meeting.endTime}</td>
                <td>
                  {(() => {
                    const { label, className } = getStatusLabel(meeting.status);
                    return (
                      <span className={`status-badge status-${className}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const HostMeetingTable = ({ meetings, programId }) => {
    if (!meetings || meetings.length === 0) {
      return null;
    }

    const now = new Date();
    const filteredMeetings = meetings
      .filter(meeting => {
        if (statusFilter === 'all') return true;
        const start = meeting.utcStartDateTime ? new Date(meeting.utcStartDateTime) : null;
        if (statusFilter === 'scheduled') return start ? start > now : true;
        if (statusFilter === 'completed') return start ? start <= now : false;
        if (statusFilter === 'feedback-pending') return isFeedbackWindowOpen(meeting.utcStartDateTime) && !meeting.status;
        return true;
      })
      .sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0));

    if (filteredMeetings.length === 0) {
      return null;
    }

    return (
      <div className="meeting-section">
        <h2 className="section-title">Program ID: {programId}{meetings[0]?.studentName ? ` | ${meetings[0].studentName}` : ''}</h2>
        <div className="table-wrapper">
          <table className="meeting-table">
            <thead>
              <tr>
                <th>Meeting #</th>
                <th>Start Time</th>
                <th>Class Status</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((meeting, index) => {
                const status = meeting.status ? meeting.status.trim() : '';
                const hasStatus = status !== '';
                const future = isMeetingFuture(meeting.utcStartDateTime);
                const deadlinePassed = isFeedbackDeadlinePassed(meeting.utcStartDateTime);
                const windowOpen = isFeedbackWindowOpen(meeting.utcStartDateTime);
                const statusLower = status.toLowerCase();
                const isNotValid = statusLower === 'not valid' || statusLower === 'notvalid';

                const renderClassStatusCell = () => {
                  if (future) {
                    return <span className="feedback-label feedback-scheduled">Class Scheduled</span>;
                  }
                  if (statusLower === 'completed') {
                    return <span className="feedback-label feedback-submitted">Completed</span>;
                  }
                  if (statusLower === 'missed') {
                    return <span className="feedback-label feedback-missed">Missed by Student</span>;
                  }
                  if (isNotValid) {
                    return <span className="feedback-label feedback-invalid">Class Not Valid</span>;
                  }
                  if (deadlinePassed) {
                    return <span className="feedback-label feedback-invalid">Class Not Valid</span>;
                  }
                  if (windowOpen) {
                    return <span className="feedback-label feedback-pending">Feedback Pending</span>;
                  }
                  return null;
                };

                const renderFeedbackCell = () => {
                  if (hasStatus) {
                    if (isNotValid) {
                      return <span className="feedback-label feedback-missing">Feedback Missing</span>;
                    }
                    return (
                      <button
                        className="btn-feedback btn-view-feedback"
                        onClick={() => openViewFeedbackModal(meeting)}
                      >
                        View Feedback
                      </button>
                    );
                  }
                  if (future) {
                    return <span className="feedback-label feedback-scheduled">Class Scheduled</span>;
                  }
                  if (deadlinePassed) {
                    return <span className="feedback-label feedback-missing">Feedback Missing</span>;
                  }
                  if (windowOpen) {
                    return (
                      <button
                        className="btn-feedback"
                        onClick={() => openFeedbackModal(meeting)}
                      >
                        Submit Feedback
                      </button>
                    );
                  }
                  return null;
                };

                return (
                  <tr key={index}>
                    <td>{meeting.meetingNumber}</td>
                    <td>{meeting.date ? `${formatDate(meeting.date)} ${meeting.startTime}` : meeting.startTime}</td>
                    <td>{renderClassStatusCell()}</td>
                    <td>{renderFeedbackCell()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const hasMeetings = meetings && (meetings.mentor.length > 0 || meetings.writingCoach.length > 0 || meetings.programManager.length > 0);
  const hasHostMeetings = meetingsByProgram && Object.keys(meetingsByProgram).length > 0;
  const isHost = user?.role && ['Mentor', 'Writing Coach', 'Team'].includes(user.role);

  const openFeedbackModal = useCallback((meeting) => {
    setMentorForm(EMPTY_MENTOR_FORM);
    setWcForm(EMPTY_WC_FORM);
    setTeamForm(EMPTY_TEAM_FORM);
    setFeedbackError(null);
    setFeedbackSuccess(false);
    setFeedbackModal(meeting);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    setFeedbackModal(null);
    setFeedbackError(null);
    setFeedbackSuccess(false);
  }, []);

  const openViewFeedbackModal = useCallback(async (meeting) => {
    setViewFeedbackModal(meeting);
    setViewFeedbackData(null);
    setViewFeedbackLoading(true);
    try {
      const response = await scheduleAPI.getFeedback(meeting.programId, meeting.meetingNumber, meeting.meetingType);
      if (response.data.success && response.data.found) {
        setViewFeedbackData(response.data.fields);
      } else {
        setViewFeedbackData(false);
      }
    } catch {
      setViewFeedbackData(false);
    } finally {
      setViewFeedbackLoading(false);
    }
  }, []);

  const closeViewFeedbackModal = useCallback(() => {
    setViewFeedbackModal(null);
    setViewFeedbackData(null);
    setViewFeedbackLoading(false);
  }, []);

  const handleMentorFormChange = (field, value) => {
    setMentorForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMentorFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError(null);

    const { didStudentAttend, classNotes, isOnTrack, progressStage, keyTasks, observations, writingCoachInstructions } = mentorForm;
    const missing = [];
    if (!didStudentAttend) missing.push('Did the student attend?');
    if (!classNotes.trim()) missing.push('Class notes');
    if (!isOnTrack) missing.push('Is student on track?');
    if (!progressStage) missing.push('Progress stage');
    if (!keyTasks.trim()) missing.push('Key tasks');
    if (!observations.trim()) missing.push('Observations');
    if (!writingCoachInstructions.trim()) missing.push('Writing coach instructions');

    if (missing.length > 0) {
      setFeedbackError(`Please fill in all required fields: ${missing.join(', ')}.`);
      return;
    }

    try {
      setFeedbackSubmitting(true);
      const response = await scheduleAPI.submitMentorFeedback({
        meetingRecordId: feedbackModal.id,
        programId: feedbackModal.programId,
        meetingNumber: feedbackModal.meetingNumber,
        didStudentAttend,
        classNotes,
        isOnTrack,
        progressStage,
        keyTasks,
        observations,
        writingCoachInstructions,
        studentName: feedbackModal.studentName,
        mentorName: feedbackModal.mentorName,
        mentorEmail: feedbackModal.mentorEmail,
        wcEmail: feedbackModal.wcEmail,
      });

      if (response.data.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          closeFeedbackModal();
          fetchHostMeetings();
        }, 1800);
      } else {
        setFeedbackError('Submission failed. Please try again.');
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleWCFormChange = (field, value) => {
    setWcForm(prev => ({ ...prev, [field]: value }));
  };

  const handleWCFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError(null);

    const { didStudentAttend, classNotes, isOnTrack, progressStage, keyTasks, observations } = wcForm;
    const missing = [];
    if (!didStudentAttend) missing.push('Did the student attend?');
    if (!classNotes.trim()) missing.push('Class notes');
    if (!isOnTrack) missing.push('Is student on track?');
    if (!progressStage) missing.push('Progress stage');
    if (!keyTasks.trim()) missing.push('Key tasks');
    if (!observations.trim()) missing.push('Observations');

    if (missing.length > 0) {
      setFeedbackError(`Please fill in all required fields: ${missing.join(', ')}.`);
      return;
    }

    try {
      setFeedbackSubmitting(true);
      const response = await scheduleAPI.submitWCFeedback({
        meetingRecordId: feedbackModal.id,
        programId: feedbackModal.programId,
        meetingNumber: feedbackModal.meetingNumber,
        didStudentAttend,
        classNotes,
        isOnTrack,
        progressStage,
        keyTasks,
        observations,
        studentName: feedbackModal.studentName,
        wcEmail: feedbackModal.wcEmail,
      });

      if (response.data.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          closeFeedbackModal();
          fetchHostMeetings();
        }, 1800);
      } else {
        setFeedbackError('Submission failed. Please try again.');
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleTeamFormChange = (field, value) => {
    setTeamForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError(null);

    const { didStudentAttend, isOnTrack, progressStage, extraSupport, counsellorMessage, mentorKeyPoints, mentorTasks, wcKeyPoints, wcTasks } = teamForm;
    const missing = [];
    if (!didStudentAttend) missing.push('Did the student attend?');
    if (!isOnTrack) missing.push('Is student on track?');
    if (!progressStage) missing.push('Progress stage');
    if (!extraSupport.trim()) missing.push('Extra support area');
    if (!counsellorMessage.trim()) missing.push('Counsellor message');
    if (!mentorKeyPoints.trim()) missing.push('Mentor session key points');
    if (!mentorTasks.trim()) missing.push('Mentor assigned tasks');
    if (!wcKeyPoints.trim()) missing.push('Writing Coach session key points');
    if (!wcTasks.trim()) missing.push('Writing Coach assigned tasks');

    if (missing.length > 0) {
      setFeedbackError(`Please fill in all required fields: ${missing.join(', ')}.`);
      return;
    }

    try {
      setFeedbackSubmitting(true);
      const response = await scheduleAPI.submitTeamFeedback({
        meetingRecordId: feedbackModal.id,
        programId: feedbackModal.programId,
        meetingNumber: feedbackModal.meetingNumber,
        didStudentAttend,
        isOnTrack,
        progressStage,
        extraSupport,
        counsellorMessage,
        mentorKeyPoints,
        mentorTasks,
        wcKeyPoints,
        wcTasks,
        studentName: feedbackModal.studentName,
        pmEmail: feedbackModal.pmEmail,
      });

      if (response.data.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          closeFeedbackModal();
          fetchHostMeetings();
        }, 1800);
      } else {
        setFeedbackError('Submission failed. Please try again.');
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleRefresh = () => {
    if (user?.role === 'Student') {
      fetchStudentMeetings();
    } else if (isHost) {
      fetchHostMeetings();
    }
  };

  return (
    <div className="mymeetings-layout">
      <Sidebar />

      {feedbackModal && (
        <div className="feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeFeedbackModal(); }}>
          <div className="feedback-modal">
            <div className="feedback-modal-header">
              <h2>Submit Feedback</h2>
              <p className="feedback-modal-sub">Meeting #{feedbackModal.meetingNumber} &mdash; Program {feedbackModal.programId}</p>
              <button className="feedback-modal-close" onClick={closeFeedbackModal} aria-label="Close">&times;</button>
            </div>

            {feedbackSuccess ? (
              <div className="feedback-success">
                <i className="fas fa-check-circle"></i>
                <p>Feedback submitted successfully! Meeting status has been updated.</p>
              </div>
            ) : user?.role === 'Mentor' ? (
              <form className="feedback-form" onSubmit={handleMentorFeedbackSubmit} noValidate>

                <div className="ff-group">
                  <label className="ff-label">Did the student attend the session? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="didStudentAttend"
                          value={opt}
                          checked={mentorForm.didStudentAttend === opt}
                          onChange={() => handleMentorFormChange('didStudentAttend', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="ff-classNotes">
                    Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="ff-classNotes"
                    className="ff-textarea"
                    rows={3}
                    value={mentorForm.classNotes}
                    onChange={(e) => handleMentorFormChange('classNotes', e.target.value)}
                    placeholder="Paste Google Drive links or notes here"
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label">Is the student on track to complete by the expected date? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="isOnTrack"
                          value={opt}
                          checked={mentorForm.isOnTrack === opt}
                          onChange={() => handleMentorFormChange('isOnTrack', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="ff-progressStage">
                    Please select the student's progress stage <span className="ff-required">*</span>
                  </label>
                  <select
                    id="ff-progressStage"
                    className="ff-select"
                    value={mentorForm.progressStage}
                    onChange={(e) => handleMentorFormChange('progressStage', e.target.value)}
                  >
                    <option value="">-- Select stage --</option>
                    {PROGRESS_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="ff-keyTasks">
                    List the key tasks or goals recommended for the student in the coming week (max 3 lines) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="ff-keyTasks"
                    className="ff-textarea"
                    rows={3}
                    value={mentorForm.keyTasks}
                    onChange={(e) => handleMentorFormChange('keyTasks', e.target.value)}
                    placeholder="1. ...\n2. ...\n3. ..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="ff-observations">
                    Provide your observations on the student's progress, strengths, and areas for improvement. (Internal reference only) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="ff-observations"
                    className="ff-textarea"
                    rows={4}
                    value={mentorForm.observations}
                    onChange={(e) => handleMentorFormChange('observations', e.target.value)}
                    placeholder="Observations..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="ff-wcInstructions">
                    Please put what you want the Writing Coach to do for next week <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="ff-wcInstructions"
                    className="ff-textarea"
                    rows={3}
                    value={mentorForm.writingCoachInstructions}
                    onChange={(e) => handleMentorFormChange('writingCoachInstructions', e.target.value)}
                    placeholder="Instructions for Writing Coach..."
                  />
                </div>

                {feedbackError && (
                  <div className="feedback-error">{feedbackError}</div>
                )}

                <div className="ff-actions">
                  <button type="button" className="ff-btn-cancel" onClick={closeFeedbackModal} disabled={feedbackSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="ff-btn-submit" disabled={feedbackSubmitting}>
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            ) : user?.role === 'Writing Coach' ? (
              <form className="feedback-form" onSubmit={handleWCFeedbackSubmit} noValidate>

                <div className="ff-group">
                  <label className="ff-label">Did the student attend the session? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="wc-didStudentAttend"
                          value={opt}
                          checked={wcForm.didStudentAttend === opt}
                          onChange={() => handleWCFormChange('didStudentAttend', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="wc-classNotes">
                    Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="wc-classNotes"
                    className="ff-textarea"
                    rows={3}
                    value={wcForm.classNotes}
                    onChange={(e) => handleWCFormChange('classNotes', e.target.value)}
                    placeholder="Paste Google Drive links or notes here"
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label">Is the student on track to complete by the expected date? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="wc-isOnTrack"
                          value={opt}
                          checked={wcForm.isOnTrack === opt}
                          onChange={() => handleWCFormChange('isOnTrack', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="wc-progressStage">
                    Please select the student's progress stage <span className="ff-required">*</span>
                  </label>
                  <select
                    id="wc-progressStage"
                    className="ff-select"
                    value={wcForm.progressStage}
                    onChange={(e) => handleWCFormChange('progressStage', e.target.value)}
                  >
                    <option value="">-- Select stage --</option>
                    {PROGRESS_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="wc-keyTasks">
                    List the key tasks or goals recommended for the student in the coming week (max 3 lines) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="wc-keyTasks"
                    className="ff-textarea"
                    rows={3}
                    value={wcForm.keyTasks}
                    onChange={(e) => handleWCFormChange('keyTasks', e.target.value)}
                    placeholder="1. ...\n2. ...\n3. ..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="wc-observations">
                    Provide your observations on the student's progress, strengths, and areas for improvement. (Internal reference only) <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="wc-observations"
                    className="ff-textarea"
                    rows={4}
                    value={wcForm.observations}
                    onChange={(e) => handleWCFormChange('observations', e.target.value)}
                    placeholder="Observations..."
                  />
                </div>

                {feedbackError && (
                  <div className="feedback-error">{feedbackError}</div>
                )}

                <div className="ff-actions">
                  <button type="button" className="ff-btn-cancel" onClick={closeFeedbackModal} disabled={feedbackSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="ff-btn-submit" disabled={feedbackSubmitting}>
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            ) : user?.role === 'Team' ? (
              <form className="feedback-form" onSubmit={handleTeamFeedbackSubmit} noValidate>

                <div className="ff-group">
                  <label className="ff-label">Did the student attend the session? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="team-didStudentAttend"
                          value={opt}
                          checked={teamForm.didStudentAttend === opt}
                          onChange={() => handleTeamFormChange('didStudentAttend', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label">Is the student on track to complete by the expected date? <span className="ff-required">*</span></label>
                  <div className="ff-radio-group">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="ff-radio-label">
                        <input
                          type="radio"
                          name="team-isOnTrack"
                          value={opt}
                          checked={teamForm.isOnTrack === opt}
                          onChange={() => handleTeamFormChange('isOnTrack', opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-progressStage">
                    Please select the student's progress stage <span className="ff-required">*</span>
                  </label>
                  <select
                    id="team-progressStage"
                    className="ff-select"
                    value={teamForm.progressStage}
                    onChange={(e) => handleTeamFormChange('progressStage', e.target.value)}
                  >
                    <option value="">-- Select stage --</option>
                    {PROGRESS_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-extraSupport">
                    Is there any area where the student needs extra support or follow-up (academic, motivation, scheduling, etc.)? <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-extraSupport"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.extraSupport}
                    onChange={(e) => handleTeamFormChange('extraSupport', e.target.value)}
                    placeholder="Describe any areas needing extra support..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-counsellorMessage">
                    Please write a direct message you'd like shared with the counsellor or parent <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-counsellorMessage"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.counsellorMessage}
                    onChange={(e) => handleTeamFormChange('counsellorMessage', e.target.value)}
                    placeholder="Write your message exactly as you'd like it communicated..."
                  />
                </div>

                <div className="ff-section-divider">
                  <span>Mentor Session</span>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-mentorKeyPoints">
                    What key points or updates were discussed in the student's last mentor session? <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-mentorKeyPoints"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.mentorKeyPoints}
                    onChange={(e) => handleTeamFormChange('mentorKeyPoints', e.target.value)}
                    placeholder="Key points from mentor session..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-mentorTasks">
                    What tasks or goals has the mentor assigned for the student to complete before their next session? <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-mentorTasks"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.mentorTasks}
                    onChange={(e) => handleTeamFormChange('mentorTasks', e.target.value)}
                    placeholder="Tasks assigned by mentor..."
                  />
                </div>

                <div className="ff-section-divider">
                  <span>Writing Coach Session</span>
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-wcKeyPoints">
                    What key points or updates were discussed in the student's last WC session? <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-wcKeyPoints"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.wcKeyPoints}
                    onChange={(e) => handleTeamFormChange('wcKeyPoints', e.target.value)}
                    placeholder="Key points from Writing Coach session..."
                  />
                </div>

                <div className="ff-group">
                  <label className="ff-label" htmlFor="team-wcTasks">
                    What tasks or assignments has the WC assigned for the student before the next session? <span className="ff-required">*</span>
                  </label>
                  <textarea
                    id="team-wcTasks"
                    className="ff-textarea"
                    rows={3}
                    value={teamForm.wcTasks}
                    onChange={(e) => handleTeamFormChange('wcTasks', e.target.value)}
                    placeholder="Tasks assigned by Writing Coach..."
                  />
                </div>

                {feedbackError && (
                  <div className="feedback-error">{feedbackError}</div>
                )}

                <div className="ff-actions">
                  <button type="button" className="ff-btn-cancel" onClick={closeFeedbackModal} disabled={feedbackSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="ff-btn-submit" disabled={feedbackSubmitting}>
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {viewFeedbackModal && (
        <div className="feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeViewFeedbackModal(); }}>
          <div className="feedback-modal">
            <div className="feedback-modal-header">
              <h2>Feedback Details</h2>
              <p className="feedback-modal-sub">Meeting #{viewFeedbackModal.meetingNumber} &mdash; Program {viewFeedbackModal.programId}</p>
              <button className="feedback-modal-close" onClick={closeViewFeedbackModal} aria-label="Close">&times;</button>
            </div>
            <div className="feedback-view-body">
              {viewFeedbackLoading ? (
                <div className="feedback-view-loading">
                  <div className="feedback-spinner"></div>
                  <p>Loading feedback...</p>
                </div>
              ) : viewFeedbackData === false ? (
                <div className="feedback-view-not-found">
                  <i className="fas fa-info-circle"></i>
                  <p>Feedback not found. Class was manually marked.</p>
                </div>
              ) : viewFeedbackData ? (
                <div className="feedback-view-fields">
                  {(() => {
                    const f = viewFeedbackData;
                    const type = viewFeedbackModal.meetingType;

                    const mentorFields = [
                      { label: 'Did the student attend?', key: 'Did the student attended the session?' },
                      { label: 'Class Notes / Reference Materials', key: 'Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links)' },
                      { label: 'Is the student on track?', key: 'Is the student on track to complete by the expected date?' },
                      { label: 'Progress Stage', key: "Please select the student's progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)" },
                      { label: 'Key Tasks for Next Week', key: 'List the key tasks or goals recommended for the student in the coming week (max 3 lines)' },
                      { label: 'Observations (Internal)', key: "Provide your observations on the student's progress, strengths, and areas for improvement. (This feedback is for internal reference only)" },
                      { label: 'Instructions for Writing Coach', key: 'Please put what you want the Writing coach to do for next week' },
                    ];

                    const wcFields = [
                      { label: 'Did the student attend?', key: 'Did the student attended the session' },
                      { label: 'Class Notes / Reference Materials', key: 'Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links)' },
                      { label: 'Is the student on track?', key: 'Is the student on track to complete by the expected date?' },
                      { label: 'Progress Stage', key: "Please select the student's progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)" },
                      { label: 'Key Tasks for Next Week', key: 'List the key tasks or goals recommended for the student in the coming week (max 3 lines)' },
                      { label: 'Observations (Internal)', key: "Provide your observations on the student's progress, strengths, and areas for improvement. (This feedback is for internal reference only)" },
                    ];

                    const teamFields = [
                      { label: 'Did the student attend?', key: 'Did the student attend the session?' },
                      { label: 'Is the student on track?', key: 'Is the student on track to complete by the expected date?' },
                      { label: 'Progress Stage', key: "Please select the student's progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)" },
                      { label: 'Extra Support Needed', key: 'Is there any area where the student needs extra support or follow-up (academic, motivation, scheduling, etc.)?' },
                      { label: 'Message for Counsellor', key: 'Write your message that you want the counsellor to know' },
                      { label: 'Mentor Session Key Points', key: "What key points or updates were discussed in the student's last mentor session?" },
                      { label: 'Mentor Assigned Tasks', key: "What tasks or goals has the mentor assigned for the student to complete before their next session?" },
                      { label: 'WC Session Key Points', key: "What key points or updates were discussed in the student's last WC session?" },
                      { label: 'WC Assigned Tasks', key: 'What tasks or assignments has the WCS instructor assigned for the student before the next session?' },
                    ];

                    const fieldMap = type === 'M' ? mentorFields : type === 'WC' ? wcFields : teamFields;

                    return fieldMap.map(({ label, key }) => {
                      const value = f[key];
                      if (!value && value !== 0) return null;
                      return (
                        <div key={key} className="feedback-view-row">
                          <span className="feedback-view-label">{label}</span>
                          <span className="feedback-view-value">{String(value)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <main className="mymeetings-content">
        <header className="mymeetings-header">
          <div>
            <h1 className="page-title">My Meetings</h1>
            <p className="page-subtitle">View all your scheduled meetings</p>
          </div>
          <button
            className="btn-rise btn-refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button className="btn-link" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        )}

        {loading && !meetings && !meetingsByProgram ? (
          <div className="loading-state">
            <p>Loading your meetings...</p>
          </div>
        ) : (
          <>
            {user?.role === 'Student' && (
              <>
                {summary && (
                  <div className="meeting-summary">
                    <div className="summary-card">
                      <h3>Mentor Sessions</h3>
                      <p className="summary-count">{summary.mentor}</p>
                    </div>
                    <div className="summary-card">
                      <h3>Writing Coach Sessions</h3>
                      <p className="summary-count">{summary.writingCoach}</p>
                    </div>
                    <div className="summary-card">
                      <h3>Program Manager Sessions</h3>
                      <p className="summary-count">{summary.programManager}</p>
                    </div>
                  </div>
                )}

                {hasMeetings ? (
                  <div className="meetings-container">
                    {meetings.mentor.length > 0 && (
                      <div className="meeting-section">
                        <h2 className="section-title">📚 Mentor Sessions</h2>
                        <MeetingTable
                          meetings={meetings.mentor}
                          emptyMessage="No mentor sessions scheduled"
                        />
                      </div>
                    )}

                    {meetings.writingCoach.length > 0 && (
                      <div className="meeting-section">
                        <h2 className="section-title">✍️ Writing Coach Sessions</h2>
                        <MeetingTable
                          meetings={meetings.writingCoach}
                          emptyMessage="No writing coach sessions scheduled"
                        />
                      </div>
                    )}

                    {meetings.programManager.length > 0 && (
                      <div className="meeting-section">
                        <h2 className="section-title">🎯 Program Manager Sessions</h2>
                        <MeetingTable
                          meetings={meetings.programManager}
                          emptyMessage="No program manager sessions scheduled"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No meetings scheduled</h3>
                    <p>You don't have any meetings scheduled yet. Use the Scheduling menu to book meetings with mentors, writing coaches, or program managers.</p>
                  </div>
                )}
              </>
            )}

            {isHost && (
              <>
                <div className="meeting-search-bar">
                  <i className="fas fa-search meeting-search-icon"></i>
                  <input
                    type="text"
                    className="meeting-search-input"
                    placeholder="Search by Program ID or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="meeting-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                <div className="meeting-filters">
                  <button
                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All Meetings
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === 'scheduled' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('scheduled')}
                  >
                    Scheduled Meetings
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('completed')}
                  >
                    Completed Meetings
                  </button>
                  <button
                    className={`filter-btn filter-btn-pending ${statusFilter === 'feedback-pending' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('feedback-pending')}
                  >
                    Feedback Pending
                  </button>
                </div>

                {hasHostMeetings ? (
                  <div className="meetings-container">
                    {Object.keys(meetingsByProgram)
                      .filter((programId) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.trim().toLowerCase();
                        const studentName = (meetingsByProgram[programId][0]?.studentName || '').toLowerCase();
                        return programId.toLowerCase().includes(q) || studentName.includes(q);
                      })
                      .map((programId) => (
                        <HostMeetingTable
                          key={programId}
                          programId={programId}
                          meetings={meetingsByProgram[programId]}
                        />
                      ))}
                    {Object.keys(meetingsByProgram).filter((programId) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.trim().toLowerCase();
                      const studentName = (meetingsByProgram[programId][0]?.studentName || '').toLowerCase();
                      return programId.toLowerCase().includes(q) || studentName.includes(q);
                    }).length === 0 && (
                      <div className="empty-state">
                        <h3>No results found</h3>
                        <p>No students match "<strong>{searchQuery}</strong>". Try searching by program ID or name.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No meetings scheduled</h3>
                    <p>You don't have any meetings scheduled yet.</p>
                  </div>
                )}

                <div className="mymeetings-postscript">
                  <p>📝 <strong>Important:</strong> Meeting status is automatically updated in the system. To ensure your session is marked as "Completed" and processed for payment, please submit the feedback form after each session. Sessions without feedback may be marked as "Not Valid" and will not be eligible for payment.</p>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyMeetings;
