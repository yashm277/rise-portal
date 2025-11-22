import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';
import Sidebar from '../components/shared/Sidebar';
import './AddSchedule.css';

const AddSchedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActiveStudent, setIsActiveStudent] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [availability, setAvailability] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [existingAvailability, setExistingAvailability] = useState(null);
  const [userTimezone, setUserTimezone] = useState('UTC');

  // Generate time slots in user's local timezone (filtering out past slots for today)
  const generateTimeSlots = (forDate = null) => {
    const now = new Date();
    const currentHour = new Date().toLocaleString('en-US', {
      timeZone: userTimezone,
      hour12: false,
      hour: '2-digit'
    });
    const currentHourNumber = parseInt(currentHour);
    
    // Check if the date is today in user's timezone
    const isToday = forDate ? (() => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD format
      return forDate === today;
    })() : false;
    
    return Array.from({ length: 24 }, (_, i) => {
      const utcHour = i;
      
      // Create UTC times for this hour slot
      const startTime = new Date();
      startTime.setUTCHours(utcHour, 0, 0, 0);
      const endTime = new Date();
      endTime.setUTCHours(utcHour + 1, 0, 0, 0);
      
      // Get the local hour for this UTC slot
      const localHour = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        hour12: false
      }).format(startTime));
      
      // Skip past hours for today
      const isPastSlot = isToday && localHour <= currentHourNumber;
      
      // Format in user's timezone
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const timezoneFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        timeZoneName: 'short'
      });
      
      const startLocal = timeFormatter.format(startTime);
      const endLocal = timeFormatter.format(endTime);
      const tzName = timezoneFormatter.formatToParts(startTime).find(part => part.type === 'timeZoneName')?.value || 'Local';
      
      return {
        id: i,
        utcHour: utcHour, // Keep UTC hour for backend
        label: `${startLocal} - ${endLocal} ${tzName}`,
        start: startLocal,
        end: endLocal,
        timezone: tzName,
        isPast: isPastSlot
      };
    }).filter(slot => !slot.isPast); // Filter out past slots
  };

  // Generate default time slots (for modal display)
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    // Detect user's timezone
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(detectedTimezone);
      console.log(`🌍 Detected user timezone: ${detectedTimezone}`);
    } catch (error) {
      console.warn('Could not detect timezone, defaulting to UTC:', error);
      setUserTimezone('UTC');
    }
    
    if (user?.email) {
      checkStudentEligibility();
      // calculateCurrentWeek will be called after eligibility check completes
    }
  }, [user]);

  const checkStudentEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Checking if student ${user.email} is active...`);
      
      const response = await scheduleAPI.checkStudentEligibility(user.email);
      
      if (response.data.success) {
        setIsActiveStudent(true);
        setStudentData(response.data.studentData);
        
        // Check if student has already submitted for this week
        if (response.data.hasExistingSubmission) {
          setHasExistingSubmission(true);
          setExistingAvailability(response.data.existingAvailability);
          console.log('✅ Student has existing submission:', response.data.existingAvailability);
        } else {
          setHasExistingSubmission(false);
          console.log('✅ Student is active, can submit new availability:', response.data.studentData);
        }
        
        // Recalculate the week after setting existing submission data
        setTimeout(() => calculateCurrentWeek(), 100);
      } else {
        setIsActiveStudent(false);
        setError(response.data.message || 'You are not an active student. Kindly contact admin for support.');
      }
    } catch (err) {
      console.error('❌ Error checking student eligibility:', err);
      setError('Failed to verify student status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentWeek = () => {
    const today = new Date();
    let targetMondayOffset = 0;
    
    // Check if student has existing booking and if we need to skip to next week
    if (hasExistingSubmission && existingAvailability?.week) {
      const existingWeekParts = existingAvailability.week.split(' to ');
      if (existingWeekParts.length === 2) {
        const existingStartDate = new Date(existingWeekParts[0] + 'T00:00:00Z');
        const todayUTC = new Date(today.toISOString().split('T')[0] + 'T00:00:00Z');
        
        console.log('🔍 Existing booking start date:', existingStartDate.toISOString().split('T')[0]);
        console.log('🔍 Today\'s date:', todayUTC.toISOString().split('T')[0]);
        
        // If today is before the existing booking start date, show next week after existing booking
        if (todayUTC < existingStartDate) {
          console.log('⚠️ Today is before existing booking - showing week after existing booking');
          targetMondayOffset = 7; // Show week after existing booking
        }
      }
    }
    
    const currentWeekDays = [];
    
    // Find the upcoming Monday (or today if it's Monday)
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let daysUntilMonday;
    
    if (currentDay === 0) { // Sunday
      daysUntilMonday = 1;
    } else if (currentDay === 1) { // Monday
      daysUntilMonday = 0; // Today is Monday
    } else { // Tuesday to Saturday
      daysUntilMonday = 8 - currentDay; // Days until next Monday
    }
    
    // Add the target monday offset for existing bookings
    daysUntilMonday += targetMondayOffset;
    
    // Calculate the target Monday
    const targetMonday = new Date(today);
    targetMonday.setUTCDate(today.getUTCDate() + daysUntilMonday);
    
    // Generate Monday to Sunday (7 days starting from target Monday)
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetMonday);
      date.setUTCDate(targetMonday.getUTCDate() + i);
      
      // Check if this date is today
      const isToday = date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      
      currentWeekDays.push({
        date: date,
        dateString: date.toISOString().split('T')[0], // YYYY-MM-DD
        displayDate: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric',
          timeZone: 'UTC'
        }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
        isToday: isToday
      });
    }
    
    setCurrentWeek(currentWeekDays);
    console.log('📅 Target Monday-Sunday week calculated:', currentWeekDays);
    console.log('📅 Target Monday offset applied:', targetMondayOffset);
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowTimeSlotModal(true);
  };

  const closeTimeSlotModal = () => {
    setShowTimeSlotModal(false);
    setSelectedDay(null);
  };

  const toggleTimeSlot = (dayDate, slotId) => {
    setAvailability(prev => {
      const dayKey = dayDate;
      const currentDay = prev[dayKey] || {};
      
      return {
        ...prev,
        [dayKey]: {
          ...currentDay,
          [slotId]: !currentDay[slotId]
        }
      };
    });
  };

  const getAvailabilityText = () => {
    let consolidatedText = '';
    
    currentWeek.forEach(day => {
      const dayAvailability = availability[day.dateString] || {};
      const availableSlots = [];
      
      timeSlots.forEach(slot => {
        if (dayAvailability[slot.id]) {
          // Store both local time (for display) and UTC hour (for backend processing)
          availableSlots.push({
            localLabel: slot.label,
            utcHour: slot.utcHour,
            timezone: slot.timezone
          });
        }
      });
      
      // Only add day info if there are available slots
      if (availableSlots.length > 0) {
        consolidatedText += `Date: ${day.displayDate}\n`;
        consolidatedText += `Day: ${day.dayName}\n`;
        consolidatedText += `Timezone: ${userTimezone}\n`;
        consolidatedText += `Available Timings (Local Time):\n`;
        
        availableSlots.forEach(slot => {
          // Convert to UTC for storage while showing local time
          const utcStart = slot.utcHour.toString().padStart(2, '0') + ':00';
          const utcEnd = ((slot.utcHour + 1) % 24).toString().padStart(2, '0') + ':00';
          consolidatedText += ` ${slot.localLabel} (UTC: ${utcStart} - ${utcEnd})\n`;
        });
        
        consolidatedText += '\n';
      }
    });
    
    return consolidatedText;
  };

  const submitAvailability = async () => {
    try {
      setSubmitting(true);
      
      const weekRange = `${currentWeek[0]?.dateString} to ${currentWeek[6]?.dateString}`;
      const consolidatedAvailability = getAvailabilityText();
      
      const submissionData = {
        programId: studentData.programId,
        studentName: studentData.studentName,
        week: weekRange,
        availability: consolidatedAvailability
      };
      
      console.log('📝 Submitting availability:', submissionData);
      
      const response = await scheduleAPI.submitAvailability(submissionData);
      
      if (response.data.success) {
        alert('✅ Availability submitted successfully!');
        // Reset availability
        setAvailability({});
        // Reload the page to show the submitted availability
        window.location.reload();
      } else {
        throw new Error(response.data.message || 'Failed to submit availability');
      }
      
    } catch (err) {
      console.error('❌ Error submitting availability:', err);
      alert('Error submitting availability. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyAvailability = () => {
    return Object.values(availability).some(daySlots => 
      Object.values(daySlots).some(isSelected => isSelected)
    );
  };

  const parseExistingAvailability = () => {
    console.log('🔍 Student side - existingAvailability object:', existingAvailability);
    console.log('🔍 Student side - existingAvailability.availability:', existingAvailability?.availability);
    
    if (!existingAvailability?.availability) {
      console.log('❌ Student side - No availability data');
      return [];
    }
    
    const availabilityText = existingAvailability.availability;
    console.log('🔍 Student side - Raw availability text:', availabilityText);
    console.log('🔍 Student side - Text length:', availabilityText.length);
    
    const lines = availabilityText.split('\n').filter(line => line.trim());
    console.log('🔍 Student side - Split lines:', lines);
    console.log('🔍 Student side - Number of lines:', lines.length);
    
    const parsedDays = [];
    let currentDay = null;
    let submittedTimezone = 'UTC'; // Default fallback
    let inTimingsSection = false;
    
    lines.forEach((line, index) => {
      const originalLine = line;
      line = line.trim();
      console.log(`🔍 Student Line ${index + 1}:`, `"${originalLine}" -> "${line}"`);
      
      if (line.startsWith('Date:')) {
        console.log('📅 Student - Found date line:', line);
        if (currentDay) {
          parsedDays.push(currentDay);
        }
        currentDay = {
          date: line.replace('Date:', '').trim(),
          day: '',
          timezone: submittedTimezone,
          timeSlots: []
        };
        inTimingsSection = false;
      } else if (line.startsWith('Day:')) {
        console.log('📅 Student - Found day line:', line);
        if (currentDay) {
          currentDay.day = line.replace('Day:', '').trim();
        }
      } else if (line.startsWith('Timezone:')) {
        console.log('🌍 Student - Found timezone line:', line);
        submittedTimezone = line.replace('Timezone:', '').trim();
        if (currentDay) {
          currentDay.timezone = submittedTimezone;
        }
      } else if (line.startsWith('Available Timings')) {
        console.log('📋 Student - Found Available Timings header:', line);
        inTimingsSection = true;
      } else if (inTimingsSection && currentDay && line.length > 0) {
        console.log('⏰ Student - Processing potential time slot:', line);
        
        if (line.includes('UTC:')) {
          // Parse the line to extract UTC time and convert to current user's timezone
          const utcMatch = line.match(/UTC:\s*(\d{2}):00\s*-\s*(\d{2}):00/);
          if (utcMatch) {
            const utcStartHour = parseInt(utcMatch[1]);
            
            // Convert UTC time to user's current timezone
            const utcTime = new Date();
            utcTime.setUTCHours(utcStartHour, 0, 0, 0);
            
            const timeFormatter = new Intl.DateTimeFormat('en-US', {
              timeZone: userTimezone,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            const timezoneFormatter = new Intl.DateTimeFormat('en-US', {
              timeZone: userTimezone,
              timeZoneName: 'short'
            });
            
            const startLocal = timeFormatter.format(utcTime);
            const endTime = new Date(utcTime.getTime() + 60 * 60 * 1000); // Add 1 hour
            const endLocal = timeFormatter.format(endTime);
            const tzName = timezoneFormatter.formatToParts(utcTime).find(part => part.type === 'timeZoneName')?.value || 'Local';
            
            currentDay.timeSlots.push(`${startLocal} - ${endLocal} ${tzName}`);
            console.log('⏰ Student - Converted time slot:', `${startLocal} - ${endLocal} ${tzName}`);
          } else {
            // Fallback: Extract just the local time part before (UTC:...)
            const localTimePart = line.split('(UTC:')[0].trim();
            currentDay.timeSlots.push(localTimePart);
            console.log('⏰ Student - Fallback time slot:', localTimePart);
          }
        } else if (line.includes('AM') || line.includes('PM') || line.includes(':')) {
          // Looks like a time slot without UTC info
          console.log('⏰ Student - Found direct time slot:', line);
          currentDay.timeSlots.push(line);
        } else {
          console.log('❓ Student - Unrecognized time format:', line);
          currentDay.timeSlots.push(line);
        }
      } else if (line.length > 0) {
        console.log('❓ Student - Unmatched non-empty line:', line);
      }
    });
    
    if (currentDay) {
      parsedDays.push(currentDay);
    }
    
    console.log('✅ Student side - Final parsed availability:', parsedDays);
    console.log('✅ Student side - Total days parsed:', parsedDays.length);
    parsedDays.forEach((day, index) => {
      console.log(`✅ Student Day ${index + 1}: ${day.day} (${day.date}) - ${day.timeSlots.length} slots:`, day.timeSlots);
    });
    
    return parsedDays;
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div className="spinner-large"></div>
            <p>Checking student eligibility...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !isActiveStudent) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content">
          <header className="page-header">
            <h1>Add Schedule</h1>
          </header>
          <div className="error-container">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Access Denied</h3>
            <p>{error || 'You are not an active student. Kindly contact admin for support.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <div className="main-content">
        <header className="page-header">
          <h1>Add Schedule</h1>
          <p className="page-subtitle">
            {hasExistingSubmission 
              ? 'Your availability for this week has already been submitted' 
              : 'Select your availability for this week'
            }
          </p>
        </header>

        <div className="dashboard-content">
          <div className="schedule-container">
          <div className="week-info">
            <h3>{hasExistingSubmission && existingAvailability?.week && 
                (() => {
                  const existingWeekParts = existingAvailability.week.split(' to ');
                  if (existingWeekParts.length === 2) {
                    const existingStartDate = new Date(existingWeekParts[0] + 'T00:00:00Z');
                    const todayUTC = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
                    return todayUTC < existingStartDate;
                  }
                  return false;
                })() ? 'Next Available Week' : 'Upcoming Week'}</h3>
            <p>Monday, {currentWeek[0]?.displayDate} - Sunday, {currentWeek[6]?.displayDate}</p>
            <p className="timezone-info">Current Timezone: {userTimezone}</p>
            {hasExistingSubmission && (
              <p className="submission-status">
                <i className="fas fa-check-circle"></i>
                Availability submitted for week: {existingAvailability?.week}
              </p>
            )}
          </div>

          {hasExistingSubmission ? (
            // Show existing availability in a nice table
            <div className="existing-availability">
              <div className="availability-header">
                <h4>Your Submitted Availability</h4>
                <p>You have already submitted your availability for this week. Here's what you submitted:</p>
              </div>
              
              <div className="availability-table-container">
                <table className="availability-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Date</th>
                      <th>Available Time Slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseExistingAvailability().map((dayData, index) => (
                      <tr key={index}>
                        <td className="day-cell">
                          <strong>{dayData.day}</strong>
                        </td>
                        <td className="date-cell">
                          {dayData.date}
                        </td>
                        <td className="slots-cell">
                          {dayData.timeSlots.length > 0 ? (
                            <div className="slots-grid">
                              {dayData.timeSlots.map((slot, slotIndex) => (
                                <span key={slotIndex} className="time-slot-badge">
                                  {slot}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-slots">No availability</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="availability-actions">
                <div className="info-note">
                  <i className="fas fa-info-circle"></i>
                  <p>To modify your availability, please contact your program coordinator.</p>
                </div>
              </div>
            </div>
          ) : (
            // Show the submission form
            <>
              <div className="calendar-table">
                <div className="calendar-header">
                  <h4>Click on a day to set your availability</h4>
                </div>
                
                <div className="submission-table-container">
                  <table className="submission-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentWeek.map((day, index) => (
                        <tr 
                          key={day.dateString}
                          className={`submission-row ${day.isToday ? 'today-row' : ''} ${availability[day.dateString] ? 'has-availability-row' : ''}`}
                        >
                          <td className={`day-cell ${day.isToday ? 'today-day' : ''}`}>
                            <strong>{day.dayName}</strong>
                          </td>
                          <td className="date-cell">
                            {day.displayDate}
                          </td>
                          <td className="status-cell">
                            {availability[day.dateString] && Object.values(availability[day.dateString]).some(Boolean) ? (
                              <span className="status-badge available">
                                {Object.values(availability[day.dateString] || {}).filter(Boolean).length} slots selected
                              </span>
                            ) : (
                              <span className="status-badge empty">No availability set</span>
                            )}
                          </td>
                          <td className="action-cell">
                            <button 
                              className="set-availability-btn"
                              onClick={() => handleDayClick(day)}
                            >
                              {availability[day.dateString] && Object.values(availability[day.dateString]).some(Boolean) 
                                ? 'Edit Times' 
                                : 'Set Times'
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {hasAnyAvailability() && (
                <div className="submit-section">
                  <button 
                    className="btn-submit"
                    onClick={submitAvailability}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Availability'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Time Slot Selection Modal */}
      {showTimeSlotModal && selectedDay && (
        <div className="modal-overlay" onClick={closeTimeSlotModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Time Slots</h3>
              <p>{selectedDay.displayDate} ({selectedDay.dayName})</p>
              <button className="close-btn" onClick={closeTimeSlotModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="time-slots-grid">
                {generateTimeSlots(selectedDay.dateString).map(slot => (
                  <label key={slot.id} className="time-slot-item">
                    <input
                      type="checkbox"
                      checked={availability[selectedDay.dateString]?.[slot.id] || false}
                      onChange={() => toggleTimeSlot(selectedDay.dateString, slot.id)}
                    />
                    <span className="checkmark"></span>
                    <span className="slot-label">{slot.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeTimeSlotModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    );
};

export default AddSchedule;