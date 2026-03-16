import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';
import Sidebar from '../components/shared/Sidebar';
import './ViewSchedule.css';

const ViewSchedule = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.email) {
      loadMentorSchedules();
    }
  }, [user]);

  const loadMentorSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleAPI.getMentorSchedules(user.email);

      if (response.data.success) {
        setPrograms(response.data.programs || []);
        setTotalPrograms(response.data.totalPrograms || 0);
      } else {
        setError(response.data.message || 'Failed to load schedules');
      }
    } catch (err) {
      setError('Failed to load schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const convertTimeToMentorTimezone = (timeString, studentTimezone, dateString) => {
    if (!timeString || !studentTimezone || !dateString) {
      return timeString;
    }

    try {
      if (timeString.includes(' - ')) {
        const [startTime, endTime] = timeString.split(' - ');
        const convertedStartTime = convertTimeToMentorTimezone(startTime, studentTimezone, dateString);
        const convertedEndTime = convertTimeToMentorTimezone(endTime, studentTimezone, dateString);
        return `${convertedStartTime} - ${convertedEndTime}`;
      }

      const utcMatch = timeString.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (utcMatch) {
        const [_, startHour, startMin, endHour, endMin] = utcMatch;

        const mentorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const currentYear = new Date().getFullYear();
        let targetDate;

        if (dateString.includes(',')) {
          const dateMatch = dateString.match(/(\w+),\s*(\w+)\s*(\d+)/);
          if (dateMatch) {
            const [_, dayName, monthName, day] = dateMatch;
            const monthMap = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            targetDate = new Date(Date.UTC(currentYear, monthMap[monthName], parseInt(day)));
          }
        }

        if (targetDate) {
          const startUTC = new Date(targetDate);
          startUTC.setUTCHours(parseInt(startHour), parseInt(startMin), 0, 0);

          const endUTC = new Date(targetDate);
          endUTC.setUTCHours(parseInt(endHour), parseInt(endMin), 0, 0);

          const mentorFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: mentorTimezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const startConverted = mentorFormatter.format(startUTC);
          const endConverted = mentorFormatter.format(endUTC);

          const result = `${startConverted} - ${endConverted}`;
          return result;
        }
      }

      if (timeString.match(/GMT|UTC/i)) {
        const timeMatch = timeString.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-)?\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:GMT|UTC)/i);

        const times = timeString.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi);
        if (times && times.length >= 2) {
        }
      }

      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        return timeString;
      }

      return timeString;

    } catch (error) {
      return `${timeString} (needs manual conversion)`;
    }
  };

  const getMentorTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const parseAvailability = (availabilityText, parsedSlotsFromBackend) => {
    if (parsedSlotsFromBackend && parsedSlotsFromBackend.length > 0) {
      const daysMap = {};

      parsedSlotsFromBackend.forEach(slot => {
        if (!daysMap[slot.date]) {
          const dateObj = new Date(slot.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

          daysMap[slot.date] = {
            date: slot.date,
            day: dayName,
            studentTimezone: slot.timezone || 'UTC',
            timeSlots: [],
            convertedTimeSlots: []
          };
        }

        daysMap[slot.date].timeSlots.push(slot.time);
      });

      const parsedDays = Object.values(daysMap);

      parsedDays.forEach(day => {
        day.convertedTimeSlots = day.timeSlots.map(slot =>
          convertTimeToMentorTimezone(slot, day.studentTimezone, day.date)
        );
      });

      return parsedDays;
    }

    if (!availabilityText) {
      return [];
    }

    const lines = availabilityText.split('\n').filter(line => line.trim());

    const parsedDays = [];
    let currentDay = null;
    let inTimingsSection = false;

    lines.forEach((line, index) => {
      const originalLine = line;
      line = line.trim();

      if (line.startsWith('Date:')) {
        if (currentDay) {
          parsedDays.push(currentDay);
        }
        currentDay = {
          date: line.replace('Date:', '').trim(),
          day: '',
          studentTimezone: 'UTC',
          timeSlots: [],
          convertedTimeSlots: []
        };
        inTimingsSection = false;
      } else if (line.startsWith('Day:')) {
        if (currentDay) {
          currentDay.day = line.replace('Day:', '').trim();
        }
      } else if (line.startsWith('Timezone:')) {
        if (currentDay) {
          currentDay.studentTimezone = line.replace('Timezone:', '').trim();
        }
      } else if (line.startsWith('Available Timings')) {
        inTimingsSection = true;
      } else if (inTimingsSection && currentDay && line.length > 0) {
        if (line.includes('UTC:')) {
          currentDay.timeSlots.push(line);
        } else if (line.includes('AM') || line.includes('PM') || line.includes(':')) {
          currentDay.timeSlots.push(line);
        } else {
          currentDay.timeSlots.push(line);
        }
      } else if (line.length > 0) {
      }
    });

    if (currentDay) {
      parsedDays.push(currentDay);
    }

    parsedDays.forEach(day => {
      day.convertedTimeSlots = day.timeSlots.map(slot =>
        convertTimeToMentorTimezone(slot, day.studentTimezone, day.date)
      );
    });

    parsedDays.forEach((day, index) => {
    });

    return parsedDays;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="main-content">
        <header className="top-bar">
          <h1>View Schedules</h1>
        </header>

        <main className="dashboard-content">
          <div className="schedule-header">
            <div className="summary-card">
              <h3>Total Programs</h3>
              <p className="summary-number">{totalPrograms}</p>
            </div>
            <div className="summary-card">
              <h3>Active Students</h3>
              <p className="summary-number">{programs.length}</p>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading mentor schedules...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-container">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button onClick={loadMentorSchedules} className="retry-button">Retry</button>
            </div>
          )}

          {!loading && !error && totalPrograms === 0 && (
            <div className="activity-section">
              <div className="empty-state">
                <i className="fas fa-calendar-times"></i>
                <p>No schedules found</p>
                <span>No students have submitted availability for your programs yet.</span>
              </div>
            </div>
          )}

          {!loading && !error && totalPrograms > 0 && (
            <div id="schedulesContainer">
              {programs.map((program) => {
                const availabilityData = parseAvailability(program.availability, program.parsedSlots);

                return (
                  <div key={program.programId} className="program-section">
                    <div className="program-header">
                      <h3>
                        <i className="fas fa-folder"></i>
                        Program ID: {program.programId}
                      </h3>
                      <div className="program-info">
                        <span className="student-badge">
                          <i className="fas fa-user"></i>
                          {program.studentName}
                        </span>
                        <span className="week-badge">
                          <i className="fas fa-calendar-week"></i>
                          Week: {program.week}
                        </span>
                        <span className="submissions-badge">
                          <i className="fas fa-clock"></i>
                          {program.totalSubmissions} submission{program.totalSubmissions !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="availability-section">
                      <div className="availability-header">
                        <h4>Student Availability</h4>
                        <p className="last-updated">
                          Last updated: {formatDate(program.createdTime)}
                        </p>
                      </div>

                      <div className="availability-table-container">
                        <table className="availability-table">
                          <thead>
                            <tr>
                              <th>Day</th>
                              <th>Date</th>
                              <th>Available Time Slots (Your Time)</th>
                              <th>Student Timezone</th>
                              <th>Your Timezone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availabilityData.length > 0 ? (
                              availabilityData.map((dayData, index) => (
                                <tr key={index}>
                                  <td className="day-cell">
                                    <strong>{dayData.day}</strong>
                                  </td>
                                  <td className="date-cell">
                                    {dayData.date}
                                  </td>
                                  <td className="slots-cell">
                                    {dayData.convertedTimeSlots && dayData.convertedTimeSlots.length > 0 ? (
                                      <div className="slots-grid">
                                        {dayData.convertedTimeSlots.map((slot, slotIndex) => (
                                          <span key={slotIndex} className="time-slot-badge">
                                            {slot}
                                          </span>
                                        ))}
                                        {dayData.studentTimezone !== getMentorTimezone() && (
                                          <div style={{width: '100%', fontSize: '0.75rem', color: '#1c7c54', fontStyle: 'italic', marginTop: '4px'}}>
                                            ✅ Times converted to your timezone
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="no-slots">No availability</span>
                                    )}
                                  </td>
                                  <td className="timezone-cell">
                                    <span className="timezone-badge student-tz">{dayData.studentTimezone}</span>
                                  </td>
                                  <td className="timezone-cell">
                                    <span className="timezone-badge mentor-tz">{getMentorTimezone()}</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="empty-availability">
                                  <i className="fas fa-info-circle"></i>
                                  No availability data found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ViewSchedule;
