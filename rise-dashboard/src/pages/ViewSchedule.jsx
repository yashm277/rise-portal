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
      
      console.log(`📅 Fetching schedules for mentor: ${user.email}`);
      console.log(`👤 User object:`, user);
      
      const response = await scheduleAPI.getMentorSchedules(user.email);
      
      console.log(`📡 API Response:`, response.data);
      
      if (response.data.success) {
        setPrograms(response.data.programs || []);
        setTotalPrograms(response.data.totalPrograms || 0);
        console.log(`✅ Loaded ${response.data.totalPrograms} programs with schedules`);
        console.log(`📋 Programs data:`, response.data.programs);
      } else {
        console.log(`❌ API returned error:`, response.data.message);
        setError(response.data.message || 'Failed to load schedules');
      }
    } catch (err) {
      console.error('❌ Error loading mentor schedules:', err);
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
      // Handle time ranges (e.g., "2:30 PM - 3:30 PM")
      if (timeString.includes(' - ')) {
        const [startTime, endTime] = timeString.split(' - ');
        const convertedStartTime = convertTimeToMentorTimezone(startTime, studentTimezone, dateString);
        const convertedEndTime = convertTimeToMentorTimezone(endTime, studentTimezone, dateString);
        return `${convertedStartTime} - ${convertedEndTime}`;
      }

      // Check if we have UTC time in the string (which we do!)
      const utcMatch = timeString.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (utcMatch) {
        // Use the UTC time directly for accurate conversion
        const [_, startHour, startMin, endHour, endMin] = utcMatch;
        
        console.log(`🌍 Found UTC times: ${startHour}:${startMin} - ${endHour}:${endMin}`);
        
        // Get mentor's timezone
        const mentorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`🌍 Converting from UTC to ${mentorTimezone}`);
        
        // Parse the date for proper conversion
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
          // Create UTC date objects for start and end times
          const startUTC = new Date(targetDate);
          startUTC.setUTCHours(parseInt(startHour), parseInt(startMin), 0, 0);
          
          const endUTC = new Date(targetDate);
          endUTC.setUTCHours(parseInt(endHour), parseInt(endMin), 0, 0);
          
          // Format in mentor's timezone
          const mentorFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: mentorTimezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          const startConverted = mentorFormatter.format(startUTC);
          const endConverted = mentorFormatter.format(endUTC);
          
          const result = `${startConverted} - ${endConverted}`;
          console.log(`✅ Converted UTC to mentor timezone: ${result}`);
          return result;
        }
      }

      // Fallback to parsing the local time if no UTC found
      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        console.log(`❌ Could not parse time: ${timeString}`);
        return timeString;
      }

      console.log(`⚠️ No UTC time found, using original: ${timeString}`);
      return timeString;
      
    } catch (error) {
      console.error('Timezone conversion error:', error, {timeString, studentTimezone, dateString});
      return `${timeString} (needs manual conversion)`;
    }
  };

  const getMentorTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  // Debug function for testing different timezones
  const testTimezoneConversion = (studentTz, mentorTz, time, date) => {
    console.log(`🧪 Testing conversion:`);
    console.log(`Student: ${time} in ${studentTz}`);
    console.log(`Mentor: ${convertTimeToMentorTimezone(time, studentTz, date)} in ${mentorTz}`);
  };

  // Make test function available in console for debugging
  if (typeof window !== 'undefined') {
    window.testTimezone = testTimezoneConversion;
  }

  const parseAvailability = (availabilityText) => {
    if (!availabilityText) {
      console.log('❌ No availability text provided');
      return [];
    }
    
    console.log('🔍 Raw availability text:', availabilityText);
    console.log('🔍 Text length:', availabilityText.length);
    
    const lines = availabilityText.split('\n').filter(line => line.trim());
    console.log('🔍 Split lines:', lines);
    console.log('🔍 Number of lines:', lines.length);
    
    const parsedDays = [];
    let currentDay = null;
    let inTimingsSection = false;
    
    lines.forEach((line, index) => {
      const originalLine = line;
      line = line.trim();
      console.log(`🔍 Line ${index + 1}:`, `"${originalLine}" -> "${line}"`);
      
      if (line.startsWith('Date:')) {
        console.log('📅 Found date line:', line);
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
        console.log('📅 Found day line:', line);
        if (currentDay) {
          currentDay.day = line.replace('Day:', '').trim();
        }
      } else if (line.startsWith('Timezone:')) {
        console.log('🌍 Found timezone line:', line);
        if (currentDay) {
          currentDay.studentTimezone = line.replace('Timezone:', '').trim();
        }
      } else if (line.startsWith('Available Timings')) {
        console.log('📋 Found Available Timings header:', line);
        inTimingsSection = true;
      } else if (inTimingsSection && currentDay && line.length > 0) {
        // This should be a time slot line
        console.log('⏰ Processing potential time slot:', line);
        
        if (line.includes('UTC:')) {
          // Extract local time before UTC info
          const localTimePart = line.split('(UTC:')[0].trim();
          console.log('⏰ Extracted local time from UTC line:', localTimePart);
          currentDay.timeSlots.push(localTimePart);
        } else if (line.includes('AM') || line.includes('PM') || line.includes(':')) {
          // Looks like a time slot without UTC info
          console.log('⏰ Found direct time slot:', line);
          currentDay.timeSlots.push(line);
        } else {
          console.log('❓ Unrecognized time format:', line);
          // Add it anyway in case it's a valid time slot we don't recognize
          currentDay.timeSlots.push(line);
        }
      } else if (line.length > 0) {
        console.log('❓ Unmatched non-empty line:', line);
      }
    });
    
    if (currentDay) {
      parsedDays.push(currentDay);
    }
    
    // Convert all time slots from student timezone to mentor timezone
    parsedDays.forEach(day => {
      day.convertedTimeSlots = day.timeSlots.map(slot => 
        convertTimeToMentorTimezone(slot, day.studentTimezone, day.date)
      );
      console.log(`🌍 Converted ${day.day} from ${day.studentTimezone} to mentor timezone:`, day.convertedTimeSlots);
    });
    
    console.log('✅ Final parsed availability:', parsedDays);
    console.log('✅ Total days parsed:', parsedDays.length);
    parsedDays.forEach((day, index) => {
      console.log(`✅ Day ${index + 1}: ${day.day} (${day.date}) in ${day.studentTimezone} - ${day.timeSlots.length} slots:`, day.timeSlots);
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
          {/* Header Summary */}
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

          {/* Loading State */}
          {loading && (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading mentor schedules...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-container">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button onClick={loadMentorSchedules} className="retry-button">Retry</button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && totalPrograms === 0 && (
            <div className="activity-section">
              <div className="empty-state">
                <i className="fas fa-calendar-times"></i>
                <p>No schedules found</p>
                <span>No students have submitted availability for your programs yet.</span>
              </div>
            </div>
          )}

          {/* Schedule Data */}
          {!loading && !error && totalPrograms > 0 && (
            <div id="schedulesContainer">
              {programs.map((program) => {
                console.log('🔍 Mentor - Program availability data:', program.availability);
                const availabilityData = parseAvailability(program.availability);
                console.log('🔍 Mentor - Parsed availability data:', availabilityData);

                return (
                  <div key={program.programId} className="program-section">
                    {/* Program header */}
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

                    {/* Availability Table */}
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