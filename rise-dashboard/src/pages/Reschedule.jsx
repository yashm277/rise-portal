import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import { scheduleAPI } from '../services/api';
import BankDetailsBlocker from '../components/shared/BankDetailsBlocker';
import useBankCheck from '../hooks/useBankCheck';
import './Reschedule.css';

const Reschedule = () => {
  const { user } = useAuth();
  const { bankMissing, bankChecking } = useBankCheck();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [userTimezone, setUserTimezone] = useState('UTC');

  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(detectedTimezone);
    } catch (error) {
      setUserTimezone('UTC');
    }

    if (user?.email && ['Mentor', 'Writing Coach', 'Team'].includes(user?.role)) {
      fetchUpcomingMeetings();
    }
  }, [user]);

  const fetchUpcomingMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleAPI.getHostMeetings(user.email);

      if (response.data.success) {
        const meetingsByProgram = response.data.meetingsByProgram;

        const allMeetings = [];
        Object.keys(meetingsByProgram).forEach(programId => {
          meetingsByProgram[programId].forEach(meeting => {
            allMeetings.push(meeting);
          });
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = allMeetings.filter(meeting => {
          if (!meeting.date || meeting.date === '-') return false;
          if (meeting.status && meeting.status.trim() !== '') return false;
          const meetingDate = new Date(meeting.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate >= today;
        });

        upcoming.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        setUpcomingMeetings(upcoming);
      }
    } catch (error) {
      setError('Failed to fetch upcoming meetings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openRescheduleModal = (meeting) => {
    setSelectedMeeting(meeting);
    setSelectedDate(meeting.date);
    setSelectedTimeSlot('');
    setShowRescheduleModal(true);
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setSelectedMeeting(null);
    setSelectedDate('');
    setSelectedTimeSlot('');
  };

  const getAvailableDates = () => {
    if (!selectedMeeting) return [];

    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    return dates;
  };

  const localToUTC = (dateString, localHour, localMinute) => {
    const [y, mo, d] = dateString.split('-').map(Number);
    const candidateMs = Date.UTC(y, mo - 1, d, localHour, localMinute, 0);
    const candidate = new Date(candidateMs);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(candidate);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = parseInt(value); });
    const representedLocalMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const wantedLocalMs = Date.UTC(y, mo - 1, d, localHour, localMinute, 0);
    return new Date(candidateMs + (wantedLocalMs - representedLocalMs));
  };

  const generateTimeSlots = () => {
    const slots = [];

    if (selectedMeeting && selectedMeeting.utcStartDateTime) {
      const origUtc = new Date(selectedMeeting.utcStartDateTime);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(origUtc);
      const p = {};
      parts.forEach(({ type, value }) => { p[type] = parseInt(value); });
      slots.push({
        label: `${selectedMeeting.startTime} - ${selectedMeeting.endTime || 'N/A'} (Original Time)`,
        value: selectedMeeting.startTime,
        localHour: p.hour,
        localMinute: p.minute,
        isOriginal: true
      });
    }

    const formatHour12 = (h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    return slots.concat(Array.from({ length: 24 }, (_, i) => {
      const startLabel = formatHour12(i, 0);
      const endLabel = formatHour12((i + 1) % 24, 0);
      return {
        id: i,
        localHour: i,
        localMinute: 0,
        label: `${startLabel} - ${endLabel}`,
        value: startLabel,
        endValue: endLabel,
        isOriginal: false
      };
    }));
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      alert('Please select both date and time slot');
      return;
    }

    try {
      setRescheduling(true);

      const slots = generateTimeSlots();
      const selectedSlot = slots.find(slot => slot.value === selectedTimeSlot);

      if (!selectedSlot) {
        alert('Invalid time slot selected');
        return;
      }

      const utcStartDateTime = localToUTC(selectedDate, selectedSlot.localHour, selectedSlot.localMinute).toISOString();

      const reschedulData = {
        meetingId: selectedMeeting.id,
        newDate: selectedDate,
        utcStartDateTime,
        timezone: userTimezone,
        userRole: user.role
      };

      const response = await scheduleAPI.rescheduleMeeting(reschedulData);

      if (response.data.success) {
        alert('Meeting rescheduled successfully!');
        closeRescheduleModal();
        fetchUpcomingMeetings();
      } else {
        alert(`Failed to reschedule: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Failed to reschedule meeting: ${errorMsg}`);
    } finally {
      setRescheduling(false);
    }
  };

  if (!bankChecking && bankMissing) {
    return (
      <div className="reschedule-layout">
        <Sidebar />
        <main className="reschedule-content">
          <header className="reschedule-header">
            <div>
              <h1 className="page-title">Reschedule Meetings</h1>
              <p className="page-subtitle">Manage your upcoming scheduled meetings</p>
            </div>
          </header>
          <BankDetailsBlocker featureName="rescheduling your classes" />
        </main>
      </div>
    );
  }

  return (
    <div className="reschedule-layout">
      <Sidebar />

      <main className="reschedule-content">
        <header className="reschedule-header">
          <div>
            <h1 className="page-title">Reschedule Meetings</h1>
            <p className="page-subtitle">Manage your upcoming scheduled meetings</p>
          </div>
          <button
            className="btn-rise btn-refresh"
            onClick={fetchUpcomingMeetings}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button className="btn-link" onClick={fetchUpcomingMeetings}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <p>Loading your meetings...</p>
          </div>
        ) : (
          <div className="reschedule-container">
            {upcomingMeetings.length > 0 ? (
              <div className="table-wrapper">
                <table className="reschedule-table">
                  <thead>
                    <tr>
                      <th>Meeting #</th>
                      <th>Program ID</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingMeetings.map((meeting, index) => (
                      <tr key={index}>
                        <td>{meeting.meetingNumber}</td>
                        <td>{meeting.programId}</td>
                        <td>{meeting.date ? `${formatDate(meeting.date)} ${meeting.startTime}` : meeting.startTime}</td>
                        <td>{meeting.endTime ? (meeting.date ? `${formatDate(meeting.date)} ${meeting.endTime}` : meeting.endTime) : '-'}</td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => openRescheduleModal(meeting)}
                            title="Reschedule meeting"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3>No upcoming meetings</h3>
                <p>You don't have any scheduled meetings that can be rescheduled.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {showRescheduleModal && selectedMeeting && (
        <div className="modal-overlay" onClick={closeRescheduleModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reschedule Meeting</h2>
              <button className="btn-close" onClick={closeRescheduleModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="meeting-info">
                <p><strong>Program ID:</strong> {selectedMeeting.programId}</p>
                <p><strong>Original Date:</strong> {formatDate(selectedMeeting.date)}</p>
                <p><strong>Original Time:</strong> {selectedMeeting.startTime}</p>
              </div>

              <div className="form-group">
                <label>Select New Date</label>
                <select
                  className="form-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {getAvailableDates().map(date => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                      {date === selectedMeeting.date ? ' (Original)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select New Time Slot</label>
                <select
                  className="form-select"
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                >
                  <option value="">-- Select Time Slot --</option>
                  {generateTimeSlots().map((slot, index) => (
                    <option
                      key={index}
                      value={slot.value}
                      style={slot.isOriginal ? { fontWeight: 'bold', color: 'var(--primary-green)' } : {}}
                    >
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={closeRescheduleModal}
                disabled={rescheduling}
              >
                Cancel
              </button>
              <button
                className="btn-reschedule"
                onClick={handleReschedule}
                disabled={rescheduling || !selectedDate || !selectedTimeSlot}
              >
                {rescheduling ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reschedule;
