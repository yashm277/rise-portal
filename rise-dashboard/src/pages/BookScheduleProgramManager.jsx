import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import BookingPopup from '../components/shared/BookingPopup';
import axios from 'axios';
import './BookSchedule.css';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const BookScheduleProgramManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActiveStudent, setIsActiveStudent] = useState(false);
  const [pmEmail, setPmEmail] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isProgramComplete, setIsProgramComplete] = useState(false);

  useEffect(() => {
    if (user?.email) {
      checkStudentEligibility();
    }
  }, [user]);

  const checkStudentEligibility = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/api/check-student-program-manager-eligibility', {
        email: user.email
      });

      const data = response.data;

      if (data.success && data.remainingSessions === 0) {
        setError('🎉 Congratulations! You have used all your available program manager sessions.');
        setIsActiveStudent(false);
        setIsProgramComplete(true);
        setLoading(false);
        return;
      }

      if (data.success) {
        if (data.isActiveStudent) {
          setIsActiveStudent(true);
          setPmEmail(data.pmEmail);
          setStudentInfo({
            name: data.studentName || user.email.split('@')[0],
            email: user.email,
            programId: data.programId,
            pmName: data.pmName || 'Your Program Manager',
            pmEmail: data.pmEmail
          });

          await loadPmAvailability(data.pmEmail);
        } else {
          setIsActiveStudent(false);
          setError('You do not have a program manager assigned. Please contact admin for support.');
        }
      } else {
        setError(data.message || 'Failed to verify student status');
      }
    } catch (err) {
      setError('Failed to verify student status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPmAvailability = async (pmEmailParam) => {
    try {
      const today = new Date();
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const response = await apiClient.post('/api/get-mentor-availability', {
        mentorEmail: pmEmailParam,
        startDate: formatLocalDate(today),
        endDate: formatLocalDate(sevenDaysLater),
        userTimezone: userTimezone
      });

      const data = response.data;

      if (data.success) {
        setAvailableSlots(data.availableSlots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      setAvailableSlots([]);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    return now.toLocaleString('en-US', options);
  };

  const getNext7Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      days.push({
        date: localDateString,
        displayName: i === 0 ? 'Today' :
                    i === 1 ? 'Tomorrow' :
                    date.toLocaleDateString('en-US', { weekday: 'long' }),
        fullDate: date
      });
    }
    return days;
  };

  const isSlotBookable = (slot) => {
    try {
      if (slot.utcStartDateTime) {
        const slotDateObj = new Date(slot.utcStartDateTime);
        const now = new Date();
        const minBookingTime = new Date(now.getTime() + (12 * 60 * 60 * 1000));
        return slotDateObj > minBookingTime;
      }

      const slotDate = slot.date;
      const slotTime = slot.time;
      const timezone = slot.timezone || 'IST';

      if (!slotTime || !slotDate) return false;

      let startTimeStr = slotTime;
      if (slotTime.startsWith('UTC:')) {
        startTimeStr = slotTime.replace('UTC:', '').trim();
      }

      const [startTime] = startTimeStr.split(' - ');

      let hour, minute;

      if (timezone === 'UTC') {
        const [h, m] = startTime.split(':');
        hour = parseInt(h, 10);
        minute = parseInt(m, 10);
      } else {
        const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) return false;
        const [, hourStr, minuteStr, ampm] = timeMatch;
        hour = parseInt(hourStr, 10);
        minute = parseInt(minuteStr, 10);
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      }

      let isoString;
      if (timezone === 'UTC') {
        isoString = `${slotDate}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`;
      } else {
        isoString = `${slotDate}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+05:30`;
      }

      const slotDateObj = new Date(isoString);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + (12 * 60 * 60 * 1000));
      return slotDateObj > minBookingTime;
    } catch (error) {
      return false;
    }
  };

  const getSlotsForDate = (dateString) => {
    return availableSlots.filter(slot => {
      return slot.date === dateString && isSlotBookable(slot);
    });
  };

  const handleSlotClick = (slot, dayDate) => {
    if (!studentInfo) {
      setError('Student information not available. Please refresh the page.');
      return;
    }

    let displayTime, bookingData;

    if (slot.utcStartDateTime && slot.utcEndDateTime) {
      displayTime = `${slot.startTime} - ${slot.endTime}`;
      bookingData = {
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        mentorName: studentInfo.pmName,
        mentorEmail: studentInfo.pmEmail,
        date: slot.date,
        utcStartDateTime: slot.utcStartDateTime,
        utcEndDateTime: slot.utcEndDateTime,
        timezone: slot.timezone,
        displayTime: displayTime,
        programId: studentInfo.programId,
        meetingType: 'R'
      };
    } else {
      const fullTimeString = slot.time;
      displayTime = convertTimeToStudentTimezone(slot.time, dayDate, slot.timezone);
      bookingData = {
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        mentorName: studentInfo.pmName,
        mentorEmail: studentInfo.pmEmail,
        date: dayDate,
        startTime: fullTimeString,
        endTime: fullTimeString,
        timezone: slot.timezone,
        displayTime: displayTime,
        programId: studentInfo.programId,
        meetingType: 'R'
      };
    }

    setSelectedSlot(bookingData);
    setShowBookingPopup(true);
  };

  const handleConfirmBooking = async (bookingData) => {
    try {
      const response = await apiClient.post('/api/book-meeting', bookingData);

      if (response.data.success) {
        setShowBookingPopup(false);
        setSelectedSlot(null);

        if (pmEmail) {
          await loadPmAvailability(pmEmail);
        }

        const responseData = response.data;
        const meetingNumber = responseData.meetingNumber || bookingData.meetingNumber || '1';
        const bookingDate = responseData.bookingDetails?.date || bookingData.date;

        alert(`✅ Review Meet Session #${meetingNumber} Scheduled for ${bookingDate} has been booked.\n\nPlease check your email for more details. In case you don't see it, please reach out to us at support.`);

      } else {
        throw new Error(response.data.message || 'Booking failed');
      }

    } catch (error) {
      if (error.response?.data?.programComplete) {
        alert(error.response.data.message || '🎉 You have used all your available program manager sessions!');
        checkStudentEligibility();
      } else {
        alert(`❌ Booking failed: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const convertTimeToStudentTimezone = (timeString, dateString, timezone = 'IST') => {
    try {
      const studentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const utcMatch = timeString.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);

      if (!utcMatch) {
        return timeString;
      }

      const [, utcStartH, utcStartM, utcEndH, utcEndM] = utcMatch;

      const startUTC = new Date(`${dateString}T${String(utcStartH).padStart(2, '0')}:${String(utcStartM).padStart(2, '0')}:00Z`);
      let endUTC = new Date(`${dateString}T${String(utcEndH).padStart(2, '0')}:${String(utcEndM).padStart(2, '0')}:00Z`);

      if (endUTC < startUTC) {
        endUTC.setDate(endUTC.getDate() + 1);
      }

      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: studentTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: studentTimezone,
        timeZoneName: 'short'
      });

      const startInStudent = timeFormatter.format(startUTC);
      const endInStudent = timeFormatter.format(endUTC);
      const studentTzShort = tzFormatter.formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || studentTimezone;

      const result = `${startInStudent} - ${endInStudent} ${studentTzShort}`;

      return result;

    } catch (error) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Checking eligibility...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        {!isProgramComplete && <Sidebar />}
        <div className="main-content" style={isProgramComplete ? { paddingLeft: 0, maxWidth: '100%', display: 'flex', justifyContent: 'center' } : {}}>
          <div className="error-container">
            <div className="error-message">
              <h3>{isProgramComplete ? 'Sessions Complete' : 'Unable to Load Booking Page'}</h3>
              <p>{error}</p>
              {!isProgramComplete && (
                <button onClick={checkStudentEligibility} className="retry-btn">
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isActiveStudent) {
    return (
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="error-container">
            <div className="error-message">
              <h3>Access Restricted</h3>
              <p>You do not have a program manager assigned. Please contact admin for support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const next7Days = getNext7Days();

  return (
    <div className="page-container">
      {!isProgramComplete && <Sidebar />}
      <div className="main-content" style={isProgramComplete ? { paddingLeft: 0, maxWidth: '100%', display: 'flex', justifyContent: 'center' } : {}}>
        <div className="content-wrapper">
          <header className="page-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="page-title">Book Schedule with Program Manager</h1>
                <p className="page-subtitle">
                  Book a session with your program manager: {studentInfo?.pmName || pmEmail}
                </p>
              </div>
              <div className="header-right">
                <div className="current-datetime">
                  <span className="datetime-label">Current Date & Time:</span>
                  <span className="datetime-value">{getCurrentDateTime()}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="page-main">
            <div className="booking-container">
              <div className="booking-header">
                <h2>Available Slots - Next 7 Days</h2>
                <p>Choose from available time slots for the next 7 days</p>
              </div>

              <div className="booking-notice-banner">
                <span>⚠️</span>
                <div>
                  <strong>Important Notice</strong>
                  <p>Sessions must be booked at least 12 hours in advance. Slots available within the next 12 hours are not bookable.</p>
                </div>
              </div>

              <div className="booking-table-container">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Date</th>
                      <th>Available Time Slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {next7Days.map(day => {
                      const slotsForDay = getSlotsForDate(day.date);
                      const isToday = day.displayName === 'Today';

                      return (
                        <tr key={day.date} className={`booking-row ${isToday ? 'today-row' : ''}`}>
                          <td className="day-cell">
                            <strong>{day.displayName}</strong>
                          </td>
                          <td className="date-cell">
                            {formatDate(day.date)}
                          </td>
                          <td className="slots-cell">
                            {slotsForDay.length > 0 ? (
                              <div className="slots-grid">
                                {slotsForDay.map((slot, index) => (
                                  <button
                                    key={index}
                                    className="time-slot-btn"
                                    onClick={() => handleSlotClick(slot, day.date)}
                                  >
                                    {slot.utcStartDateTime
                                      ? `${slot.startTime} - ${slot.endTime}`
                                      : convertTimeToStudentTimezone(slot.time, slot.date, slot.timezone)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="no-slots-text">No slots available</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>

      <BookingPopup
        isOpen={showBookingPopup}
        onClose={() => {
          setShowBookingPopup(false);
          setSelectedSlot(null);
        }}
        slotData={selectedSlot}
        onConfirm={handleConfirmBooking}
      />
    </div>
  );
};

export default BookScheduleProgramManager;
