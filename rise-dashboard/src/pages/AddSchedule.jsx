import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';
import Sidebar from '../components/shared/Sidebar';
import BankDetailsBlocker from '../components/shared/BankDetailsBlocker';
import useBankCheck from '../hooks/useBankCheck';
import './AddSchedule.css';

const localDateTimeToUTC = (dateStr, hour, minute, tz) => {
  const pad = n => String(n).padStart(2, '0');
  const [y, mo, d] = dateStr.split('-').map(Number);
  const candidateUTC = new Date(Date.UTC(y, mo - 1, d, hour, minute, 0));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(candidateUTC);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = parseInt(value); });
  const wantedMs  = Date.UTC(y,     mo - 1,     d,     hour,  minute);
  const gotMs     = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(candidateUTC.getTime() + (wantedMs - gotMs));
};

const utcToLocalDateStr = (utcDate, tz) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(utcDate);

const utcToLocalTimeKey = (utcDate, tz) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(utcDate);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const h = parseInt(p.hour) % 24;
  return `${String(h).padStart(2, '0')}:${p.minute}`;
};

const timeKeyToLabel = (key) => {
  const [h, m] = key.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${ampm}`;
};

const AddSchedule = () => {
  const { user } = useAuth();
  const { bankMissing, bankChecking } = useBankCheck();

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [isActiveMentor, setIsActiveMentor] = useState(false);
  const [mentorData, setMentorData]     = useState(null);
  const [userType, setUserType]         = useState(null);
  const [userTimezone, setUserTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  });
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [submissions, setSubmissions]   = useState([]);

  const [days, setDays]                 = useState([]);

  const [availability, setAvailability] = useState({});

  const [selectedDay, setSelectedDay]   = useState(null);

  const [editMode, setEditMode]         = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  const slotDuration = userType === 'Team' ? 15 : 60;
  const slotsPerDay  = userType === 'Team' ? 96 : 24;
  const isEditing    = editMode === 'new' || editMode === 'edit';
  const roleLabel    = userType === 'Writing Coach' ? 'Writing Coach'
                     : userType === 'Team' ? 'Team' : 'Mentor';

  const allTimeKeys = Array.from({ length: slotsPerDay }, (_, i) => {
    const totalMin  = i * slotDuration;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  const getTimeSlotsForDay = (dateStr) => {
    const todayStr = utcToLocalDateStr(new Date(), userTimezone);
    if (dateStr !== todayStr) return allTimeKeys;
    const nowH = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone, hour: '2-digit', hour12: false
    }).format(new Date()));
    return allTimeKeys.filter(key => parseInt(key.split(':')[0]) > nowH);
  };

  const buildDaysFrom = (startDateStr) => {
    const todayStr = utcToLocalDateStr(new Date(), userTimezone);
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const utcNoon = new Date(Date.UTC(sy, sm - 1, sd + i, 12, 0, 0));
      const dateStr = utcToLocalDateStr(utcNoon, userTimezone);
      return {
        dateStr,
        dayAbbr:   new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, weekday: 'short' }).format(utcNoon),
        dayNum:    new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, day: 'numeric' }).format(utcNoon),
        monthAbbr: new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, month: 'short' }).format(utcNoon),
        displayDate: new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, weekday: 'long', month: 'short', day: 'numeric' }).format(utcNoon),
        isToday: dateStr === todayStr,
        isPast:  dateStr < todayStr,
      };
    });
  };

  const getNewSubmissionStart = (subs) => {
    const todayStr = utcToLocalDateStr(new Date(), userTimezone);
    if (!subs || subs.length === 0) return todayStr;
    let latest = '';
    for (const sub of subs) {
      const end = sub.week?.split(' to ')[1];
      if (end && end > latest) latest = end;
    }
    if (!latest) return todayStr;
    const [ey, em, ed] = latest.split('-').map(Number);
    const next = new Date(Date.UTC(ey, em - 1, ed + 1, 12, 0, 0));
    return utcToLocalDateStr(next, userTimezone);
  };

  const utcSlotsToAvailability = (utcSlotsRaw) => {
    let utcSlots;
    try {
      utcSlots = typeof utcSlotsRaw === 'string' ? JSON.parse(utcSlotsRaw) : utcSlotsRaw;
    } catch { return {}; }

    const result = {};
    utcSlots.forEach(slot => {
      const utcDate = new Date(
        `${slot.date}T${String(slot.utcHour).padStart(2, '0')}:${String(slot.utcMinute).padStart(2, '0')}:00Z`
      );
      const localDate = utcToLocalDateStr(utcDate, userTimezone);
      const localKey  = utcToLocalTimeKey(utcDate, userTimezone);
      if (!result[localDate]) result[localDate] = {};
      result[localDate][localKey] = true;
    });
    return result;
  };

  const buildUTCSlots = () => {
    const utcSlots = [];
    days.forEach(day => {
      const dayAvail = availability[day.dateStr] || {};
      Object.entries(dayAvail).forEach(([timeKey, selected]) => {
        if (!selected) return;
        const [h, m] = timeKey.split(':').map(Number);
        const utcDate = localDateTimeToUTC(day.dateStr, h, m, userTimezone);
        utcSlots.push({
          date:       utcDate.toISOString().split('T')[0],
          utcHour:    utcDate.getUTCHours(),
          utcMinute:  utcDate.getUTCMinutes(),
          duration:   slotDuration,
        });
      });
    });
    return utcSlots;
  };

  const parseSubmissionDays = (sub) => {
    let utcSlots;
    try {
      utcSlots = typeof sub.utcSlots === 'string' ? JSON.parse(sub.utcSlots) : sub.utcSlots;
    } catch { return []; }
    if (!utcSlots?.length) return [];

    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone, hour: 'numeric', minute: '2-digit', hour12: true
    });

    const dayMap = {};
    utcSlots.forEach(slot => {
      const utcStart = new Date(`${slot.date}T${String(slot.utcHour).padStart(2, '0')}:${String(slot.utcMinute).padStart(2, '0')}:00Z`);
      const utcEnd   = new Date(utcStart.getTime() + slot.duration * 60000);
      const localDate = utcToLocalDateStr(utcStart, userTimezone);
      if (!dayMap[localDate]) {
        dayMap[localDate] = {
          dayAbbr:   new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, weekday: 'short' }).format(utcStart),
          dayNum:    new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, day: 'numeric' }).format(utcStart),
          monthAbbr: new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, month: 'short' }).format(utcStart),
          timeSlots: [],
        };
      }
      dayMap[localDate].timeSlots.push(`${timeFmt.format(utcStart)} – ${timeFmt.format(utcEnd)}`);
    });

    return Object.keys(dayMap).sort().map(d => dayMap[d]);
  };

  const checkMentorEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await scheduleAPI.checkMentorEligibility(user.email);
      if (response.data.success) {
        setIsActiveMentor(true);
        setMentorData(response.data.mentorData);
        setUserType(response.data.userType || 'Mentor');
        const subs = response.data.submissions || [];
        setSubmissions(subs);
        const startStr = getNewSubmissionStart(subs);
        setDays(buildDaysFrom(startStr));
      } else {
        setIsActiveMentor(false);
        setError(response.data.message || 'You are not authorized. Kindly contact admin for support.');
      }
    } catch (err) {
      let msg = 'Failed to verify status. Please try again.';
      if (err.message === 'API call timed out after 30 seconds')
        msg = 'Connection timeout. Please check your internet connection and try again.';
      else if (err.response?.status === 500)
        msg = 'Server error. The backend service may be down. Please try again later.';
      else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error'))
        msg = 'Cannot connect to server. Please check if the backend service is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitAvailability = async () => {
    try {
      setSubmitting(true);
      if (!isActiveMentor || !mentorData?.name || !mentorData?.email) {
        alert('Mentor data is incomplete. Please refresh and try again.');
        return;
      }
      const utcSlots = buildUTCSlots();
      if (utcSlots.length === 0) {
        alert('Please select at least one time slot before submitting.');
        return;
      }
      const weekRange = `${days[0].dateStr} to ${days[6].dateStr}`;
      const response = await scheduleAPI.submitAvailability({
        email: user.email, name: mentorData.name, week: weekRange, userType, utcSlots
      });
      if (response.data.success) {
        alert('✅ Availability submitted successfully!');
        window.location.reload();
      } else {
        throw new Error(response.data.message || 'Failed to submit availability');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error submitting availability.';
      if (msg.includes('already submitted')) {
        alert(`❌ ${msg}\n\nPlease refresh the page to see your existing submission.`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        alert(`Error: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateAvailability = async () => {
    try {
      setSubmitting(true);
      const sub = submissions[editingIndex];
      if (!sub) { alert('Could not find the submission to update. Please refresh.'); return; }
      const utcSlots = buildUTCSlots();
      if (utcSlots.length === 0) {
        alert('Please select at least one time slot before saving.');
        return;
      }
      const response = await scheduleAPI.updateAvailability({
        email: user.email, name: mentorData.name, week: sub.week, userType, utcSlots
      });
      if (response.data.success) {
        alert('✅ Availability updated successfully!');
        window.location.reload();
      } else {
        throw new Error(response.data.message || 'Failed to update availability');
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message || 'Error updating availability.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnterEditMode = (idx) => {
    const sub = submissions[idx];
    if (!sub) return;
    const startStr = sub.week.split(' to ')[0];
    setDays(buildDaysFrom(startStr));
    setAvailability(utcSlotsToAvailability(sub.utcSlots));
    setEditMode('edit');
    setEditingIndex(idx);
    setSelectedDay(null);
  };

  const handleEnterNewMode = () => {
    const startStr = getNewSubmissionStart(submissions);
    setDays(buildDaysFrom(startStr));
    setAvailability({});
    setEditMode('new');
    setEditingIndex(null);
    setSelectedDay(null);
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setEditingIndex(null);
    setAvailability({});
    setSelectedDay(null);
    const startStr = getNewSubmissionStart(submissions);
    setDays(buildDaysFrom(startStr));
  };

  const toggleSlot = (dateStr, timeKey) => {
    setAvailability(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [timeKey]: !(prev[dateStr] || {})[timeKey],
      }
    }));
  };

  const clearDay = (dateStr) => {
    setAvailability(prev => ({ ...prev, [dateStr]: {} }));
  };

  const hasAnyAvailability = () =>
    Object.values(availability).some(d => Object.values(d).some(Boolean));

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentDateTime(new Date()), 1000);
    if (user?.email) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setError('Connection timeout. Please refresh the page and try again.');
      }, 10000);
      checkMentorEligibility().finally(() => clearTimeout(timeout));
    } else {
      setLoading(false);
      setError('User authentication required. Please log in again.');
    }
    return () => clearInterval(timeInterval);
  }, [user]);

  const getCurrentDateTime = () =>
    currentDateTime.toLocaleString('en-US', {
      timeZone: userTimezone, weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

  const getNextAvailableDate = () => {
    if (submissions.length === 0) return null;
    let latest = '';
    for (const sub of submissions) {
      const end = sub.week?.split(' to ')[1];
      if (end && end > latest) latest = end;
    }
    if (!latest) return null;
    const [ey, em, ed] = latest.split('-').map(Number);
    const next = new Date(Date.UTC(ey, em - 1, ed + 1, 12, 0, 0));
    const day = next.getUTCDate();
    const suffix = [1,21,31].includes(day) ? 'st' : [2,22].includes(day) ? 'nd' : [3,23].includes(day) ? 'rd' : 'th';
    return next.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
               .replace(/^(\d+)/, `$1${suffix}`);
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content add-schedule-content">
          <div className="loading-container">
            <div className="spinner-large"></div>
            <p>Checking eligibility...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !isActiveMentor) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content add-schedule-content">
          <header className="page-header"><h1>Add {roleLabel} Schedule</h1></header>
          <div className="error-container">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Access Denied</h3>
            <p>{error || 'You are not authorized. Kindly contact admin for support.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bankChecking && bankMissing) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content add-schedule-content">
          <header className="page-header"><h1>Add {roleLabel} Schedule</h1></header>
          <div className="dashboard-content">
            <BankDetailsBlocker featureName="adding your schedule" />
          </div>
        </div>
      </div>
    );
  }

  const weekLabels = ['This Week', 'Upcoming Week'];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="main-content add-schedule-content">
        <header className="page-header">
          <h1>Add {roleLabel} Schedule</h1>
          <p className="current-datetime">{getCurrentDateTime()}</p>
          <p className="page-subtitle">
            {isEditing
              ? editMode === 'edit'
                ? `Editing ${weekLabels[editingIndex] || 'availability'} — click any day to adjust its time slots`
                : 'Adding upcoming week availability — click any day to add time slots'
              : `Manage your ${roleLabel.toLowerCase()} availability`}
          </p>
        </header>

        <div className="dashboard-content">
          <div className="schedule-container">

            {!isEditing && (
              <>
                {submissions.length === 0 && (
                  <div className="week-info">
                    <h3>Your 7-Day Window</h3>
                    <p>{days[0]?.displayDate} &ndash; {days[6]?.displayDate}</p>
                    <p className="timezone-info">{userTimezone}</p>
                  </div>
                )}

                {submissions.map((sub, idx) => {
                  const subDays = parseSubmissionDays(sub);
                  const [weekStart, weekEnd] = sub.week.split(' to ');
                  return (
                    <div key={idx} className="existing-availability">
                      <div className="availability-header">
                        <div>
                          <span className="avail-week-label">{weekLabels[idx] || `Week ${idx + 1}`}</span>
                          <h4>{weekStart} &ndash; {weekEnd}</h4>
                        </div>
                        <button className="btn-change-availability" onClick={() => handleEnterEditMode(idx)}>
                          <i className="fas fa-edit"></i> Edit
                        </button>
                      </div>
                      <div className="day-strip">
                        {subDays.map((dayData, di) => (
                          <div key={di} className="day-strip-col">
                            <div className="day-strip-header">
                              <span className="ds-abbr">{dayData.dayAbbr}</span>
                              <span className="ds-num">{dayData.dayNum}</span>
                              <span className="ds-month">{dayData.monthAbbr}</span>
                            </div>
                            <div className="ds-slots">
                              {dayData.timeSlots.length > 0
                                ? dayData.timeSlots.map((s, si) => (
                                    <span key={si} className="ds-slot-pill">{s}</span>
                                  ))
                                : <span className="ds-empty">—</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {submissions.length === 0 && (
                  <div className="sched-card">
                    <p className="sched-card-hint">Click a day to add time slots for that day.</p>
                    <div className="day-selector-strip">
                      {days.map((day) => {
                        const slotCount = Object.values(availability[day.dateStr] || {}).filter(Boolean).length;
                        return (
                          <button
                            key={day.dateStr}
                            className={`day-selector-col ${day.isToday ? 'dsc-today' : ''} ${slotCount > 0 ? 'dsc-has-slots' : ''}`}
                            onClick={() => setSelectedDay(day)}
                          >
                            <span className="dsc-abbr">{day.dayAbbr}</span>
                            <span className="dsc-num">{day.dayNum}</span>
                            <span className="dsc-month">{day.monthAbbr}</span>
                            {slotCount > 0 && <span className="dsc-badge">{slotCount}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="submit-section">
                      {hasAnyAvailability() && (
                        <button className="btn-submit" onClick={submitAvailability} disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Submit Availability'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {submissions.length > 0 && submissions.length < 2 && (
                  <div className="add-next-week-section">
                    <button className="btn-add-next-week" onClick={handleEnterNewMode}>
                      <i className="fas fa-plus"></i> Add Upcoming Week Availability
                    </button>
                  </div>
                )}

                {submissions.length >= 2 && (
                  <div className="avail-limit-notice">
                    <i className="fas fa-info-circle"></i>
                    You can only add availability for a maximum of 2 weeks at one time. Please wait for your current week submission to expire or all slots to be booked before adding more.
                  </div>
                )}
              </>
            )}

            {isEditing && (
              <>
                <div className="week-info">
                  <h3>{editMode === 'edit' ? `Editing: ${weekLabels[editingIndex] || 'Week'}` : 'New Upcoming Week'}</h3>
                  <p>{days[0]?.displayDate} &ndash; {days[6]?.displayDate}</p>
                  <p className="timezone-info">{userTimezone}</p>
                </div>

                <div className="sched-card">
                  <p className="sched-card-hint">
                    {editMode === 'edit'
                      ? 'Click a day to edit its slots. Days with slots are highlighted.'
                      : 'Click a day to add time slots for that day.'}
                  </p>
                  <div className="day-selector-strip">
                    {days.map((day) => {
                      const slotCount = Object.values(availability[day.dateStr] || {}).filter(Boolean).length;
                      const locked = editMode === 'edit' && day.isPast;
                      return (
                        <button
                          key={day.dateStr}
                          className={`day-selector-col ${day.isToday ? 'dsc-today' : ''} ${slotCount > 0 ? 'dsc-has-slots' : ''} ${locked ? 'dsc-locked' : ''}`}
                          onClick={() => !locked && setSelectedDay(day)}
                          disabled={locked}
                          title={locked ? 'This day is in the past and cannot be edited' : undefined}
                        >
                          <span className="dsc-abbr">{day.dayAbbr}</span>
                          <span className="dsc-num">{day.dayNum}</span>
                          <span className="dsc-month">{day.monthAbbr}</span>
                          {locked
                            ? <span className="dsc-lock-icon"><i className="fas fa-lock"></i></span>
                            : slotCount > 0 && <span className="dsc-badge">{slotCount}</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="submit-section">
                  <button className="btn-secondary" onClick={handleCancelEdit} disabled={submitting}>
                    Cancel
                  </button>
                  {hasAnyAvailability() && (
                    <button
                      className="btn-submit"
                      onClick={editMode === 'edit' ? updateAvailability : submitAvailability}
                      disabled={submitting}
                    >
                      {submitting
                        ? (editMode === 'edit' ? 'Saving...' : 'Submitting...')
                        : (editMode === 'edit' ? 'Save Changes' : 'Submit Availability')}
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>

        {selectedDay && (
          <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
            <div className="modal-content ts-modal" onClick={e => e.stopPropagation()}>

              <div className="ts-modal-day-strip">
                {days.map((day) => {
                  const isActive  = day.dateStr === selectedDay.dateStr;
                  const slotCount = Object.values(availability[day.dateStr] || {}).filter(Boolean).length;
                  const locked    = editMode === 'edit' && day.isPast;
                  return (
                    <button
                      key={day.dateStr}
                      className={`ts-day-col ${isActive ? 'ts-day-active' : ''} ${slotCount > 0 && !isActive ? 'ts-day-has' : ''} ${locked ? 'ts-day-locked' : ''}`}
                      onClick={() => !locked && setSelectedDay(day)}
                      disabled={locked}
                      title={locked ? 'Past day — cannot be edited' : undefined}
                    >
                      <span className="ts-day-abbr">{day.dayAbbr}</span>
                      <span className="ts-day-num">{day.dayNum}</span>
                      <span className="ts-day-month">{day.monthAbbr}</span>
                      {locked
                        ? <span className="ts-lock-icon"><i className="fas fa-lock"></i></span>
                        : slotCount > 0 && <span className="ts-day-badge">{slotCount}</span>
                      }
                    </button>
                  );
                })}
              </div>

              <div className="ts-modal-body">
                <div className="ts-modal-meta">
                  <span className="ts-tz-label">
                    <i className="fas fa-globe"></i> {userTimezone}
                  </span>
                  <span className="ts-duration-label">
                    <i className="fas fa-clock"></i>
                    {userType === 'Team' ? '15 min' : '60 min'} session
                  </span>
                </div>

                <div className="ts-select-header">
                  <p className="ts-select-label">Select time slots</p>
                  {(() => {
                    const cnt = Object.values(availability[selectedDay.dateStr] || {}).filter(Boolean).length;
                    return cnt > 0
                      ? <button className="ts-clear-day-btn" onClick={() => clearDay(selectedDay.dateStr)}>
                          Clear day ({cnt})
                        </button>
                      : null;
                  })()}
                </div>

                <div className="ts-grid">
                  {getTimeSlotsForDay(selectedDay.dateStr).map(timeKey => {
                    const isSelected = availability[selectedDay.dateStr]?.[timeKey] || false;
                    return (
                      <button
                        key={timeKey}
                        className={`ts-pill ${isSelected ? 'ts-pill-selected' : ''}`}
                        onClick={() => toggleSlot(selectedDay.dateStr, timeKey)}
                      >
                        {timeKeyToLabel(timeKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ts-modal-footer">
                <button className="btn-secondary" onClick={() => setSelectedDay(null)}>Done</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AddSchedule;
