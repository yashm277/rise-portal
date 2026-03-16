import React, { useState } from 'react';
import './BookingPopup.css';

const BookingPopup = ({
  isOpen,
  onClose,
  slotData,
  onConfirm
}) => {
  const [isBooking, setIsBooking] = useState(false);

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    try {
      await onConfirm(slotData);
    } catch (error) {
    } finally {
      setIsBooking(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen || !slotData) return null;

  return (
    <div className="booking-popup-overlay" onClick={onClose}>
      <div className="booking-popup" onClick={(e) => e.stopPropagation()}>
        <div className="booking-popup-header">
          <h2>🎯 Confirm Your Booking</h2>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isBooking}
          >
            ×
          </button>
        </div>

        <div className="booking-popup-content">
          <div className="booking-details">

            <div className="detail-section">
              <div className="detail-icon">👤</div>
              <div className="detail-content">
                <div className="detail-label">Student</div>
                <div className="detail-value">{slotData.studentName}</div>
                <div className="detail-email">{slotData.studentEmail}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-icon">👨‍🏫</div>
              <div className="detail-content">
                <div className="detail-label">
                  {slotData.meetingType === 'WC' ? 'Writing Coach' : slotData.meetingType === 'R' ? 'Program Manager' : 'Mentor'}
                </div>
                <div className="detail-value">{slotData.mentorName}</div>
                <div className="detail-email">{slotData.mentorEmail}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-icon">📅</div>
              <div className="detail-content">
                <div className="detail-label">Session Date</div>
                <div className="detail-value">{formatDate(slotData.date)}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-icon">⏰</div>
              <div className="detail-content">
                <div className="detail-label">Time Slot</div>
                <div className="detail-value">
                  {slotData.displayTime || `${formatTime(slotData.startTime)} - ${formatTime(slotData.endTime)}`}
                </div>
                <div className="detail-timezone">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-icon">🎓</div>
              <div className="detail-content">
                <div className="detail-label">Program</div>
                <div className="detail-value">ID: {slotData.programId}</div>
              </div>
            </div>

          </div>

          <div className="confirmation-message">
            <div className="message-icon">✨</div>
            <div className="message-text">
              <strong>Ready to book this {slotData.meetingType === 'WC' ? 'writing coach' : slotData.meetingType === 'R' ? 'Review Meet' : 'mentoring'} session?</strong>
              <br />
              <span>Your {slotData.meetingType === 'WC' ? 'writing coach' : slotData.meetingType === 'R' ? 'program manager' : 'mentor'} will be notified and the session will be added to both calendars.</span>
            </div>
          </div>
        </div>

        <div className="booking-popup-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isBooking}
          >
            Cancel
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirmBooking}
            disabled={isBooking}
          >
            {isBooking ? (
              <>
                <div className="spinner"></div>
                Booking...
              </>
            ) : (
              <>
                <span>📅</span>
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPopup;
