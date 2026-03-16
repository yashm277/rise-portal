import { useState, useEffect } from 'react';
import { classAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import BankDetailsBlocker from '../components/shared/BankDetailsBlocker';
import useBankCheck from '../hooks/useBankCheck';
import './Invoicing.css';

const getInvoicingWindowInfo = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
  const windowStart = new Date(endOfCurrentMonth);
  windowStart.setDate(endOfCurrentMonth.getDate() - 3);

  const isOpen = today >= windowStart;

  return { isOpen, windowStart };
};

const Invoicing = () => {
  const { user } = useAuth();
  const { bankMissing, bankChecking } = useBankCheck();
  const [groupedData, setGroupedData] = useState({});
  const [totalClasses, setTotalClasses] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrograms, setSelectedPrograms] = useState(new Map());
  const [validating, setValidating] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [currentDiscrepancy, setCurrentDiscrepancy] = useState({ programId: '', classIds: [], isGeneral: false });
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  const { isOpen: invoicingOpen, windowStart } = getInvoicingWindowInfo();

  useEffect(() => {
    if (!bankChecking && !bankMissing && invoicingOpen) loadPendingClasses();
    else if (!bankChecking) setLoading(false);
  }, [bankChecking]);

  const convertISTToUserTimezone = (timeString, dateString) => {
    if (!timeString || timeString === '-') return timeString;

    try {
      const cleanTime = timeString.replace(/\s*IST\s*$/, '').trim();

      const dateTime = new Date(`${dateString} ${cleanTime}`);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userTime = dateTime.toLocaleString('en-US', {
        timeZone: userTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return userTime;
    } catch (error) {
      return timeString;
    }
  };

  const loadPendingClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.email) {
        setError('User email not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await classAPI.getPendingClasses(user.email);

      if (response.data) {
        setTotalClasses(response.data.totalClasses || 0);
        setProgramCount(response.data.programCount || 0);
        setDateRange(response.data.dateRange || null);
        setGroupedData(response.data.groupedData || {});
      }
    } catch (err) {
      setError(err.message || 'Failed to load classes. Please try again.');
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
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const toggleProgramForValidation = (programId) => {
    const programKey = `program-${programId}`;
    const newSelected = new Map(selectedPrograms);

    if (newSelected.has(programKey)) {
      newSelected.delete(programKey);
    } else {
      const programData = groupedData[programId];
      newSelected.set(programKey, {
        programId: programId,
        classIds: programData.classes.map(c => c.id),
        completedCount: programData.completedCount,
        missedCount: programData.missedCount,
        totalAmount: programData.totalAmount,
        currency: programData.currency
      });
    }

    setSelectedPrograms(newSelected);
  };

  const validateSelectedClasses = async () => {
    if (selectedPrograms.size === 0) {
      alert('Please add at least one program to validate.');
      return;
    }

    if (!user?.email || !user?.name) {
      alert('Session expired. Please login again.');
      return;
    }

    const programCount = selectedPrograms.size;
    let totalClassesCount = 0;
    selectedPrograms.forEach(prog => {
      totalClassesCount += prog.classIds.length;
    });

    const confirmed = window.confirm(
      `Are you sure you want to validate ${programCount} program(s) with ${totalClassesCount} class(es)?\n\nThis will create one consolidated invoice for payment processing.`
    );

    if (!confirmed) return;

    setValidating(true);
    try {
      const programsData = Array.from(selectedPrograms.values()).map(prog => ({
        programId: prog.programId,
        classIds: prog.classIds,
        completedCount: prog.completedCount || 0,
        missedCount: prog.missedCount || 0,
        totalAmount: prog.totalAmount || 0,
        currency: prog.currency || 'USD'
      }));

      const response = await classAPI.validateAllPrograms({
        programs: programsData,
        mentorEmail: user.email,
        mentorName: user.name
      });

      if (response.data) {
        const { totalValidated, totalAmount, currency, invoiceCreated } = response.data;

        let message = `✅ Success!\n\nValidated ${totalValidated} class(es) across ${programCount} program(s).`;

        if (invoiceCreated) {
          message += `\n\n📄 Created consolidated invoice: ${totalAmount} ${currency}`;
        }

        alert(message);

        setSelectedPrograms(new Map());
        loadPendingClasses();
      }

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const raiseDiscrepancy = (programId, classIds) => {
    setCurrentDiscrepancy({ programId, classIds, isGeneral: false });
    setDiscrepancyNote('');
    setShowDiscrepancyModal(true);
  };

  const raiseGeneralDiscrepancy = () => {
    setCurrentDiscrepancy({ programId: '', classIds: [], isGeneral: true });
    setDiscrepancyNote('');
    setShowDiscrepancyModal(true);
  };

  const closeDiscrepancyModal = () => {
    setShowDiscrepancyModal(false);
    setCurrentDiscrepancy({ programId: '', classIds: [], isGeneral: false });
    setDiscrepancyNote('');
  };

  const submitDiscrepancy = async () => {
    if (!discrepancyNote.trim()) {
      alert('Please enter a description of the issues before submitting.');
      return;
    }

    try {
      if (currentDiscrepancy.isGeneral) {
        const response = await classAPI.raiseGeneralDiscrepancy({
          email: user.email,
          name: user.name,
          issue: discrepancyNote
        });

        closeDiscrepancyModal();

        const result = response.data;
        alert(`✅ Discrepancy Submitted!\n\n${result.message}`);
      } else {
        const response = await classAPI.raiseDiscrepancy({
          programId: currentDiscrepancy.programId,
          classIds: currentDiscrepancy.classIds,
          issues: discrepancyNote
        });

        closeDiscrepancyModal();

        const result = response.data;
        alert(`✅ Discrepancy Submitted!\n\n${result.message}\n\nUpdated ${result.updatedCount} class record(s).`);

        loadPendingClasses();
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const programIds = Object.keys(groupedData).sort();
  const selectedCount = selectedPrograms.size;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[new Date().getMonth()];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="main-content">
        <header className="top-bar">
          <h1>Invoicing</h1>
        </header>

        <main className="dashboard-content">
          {!bankChecking && bankMissing && (
            <BankDetailsBlocker featureName="invoicing" />
          )}

          {!bankMissing && !invoicingOpen && (
            <div className="invoicing-blocked">
              <div className="invoicing-blocked-icon">
                <i className="fas fa-calendar-lock"></i>
              </div>
              <h2>Invoicing hasn't begun yet for this cycle</h2>
              <p>
                Please come back on{' '}
                <strong>
                  {windowStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </strong>{' '}
                to validate your classes.
              </p>
              <span className="invoicing-blocked-note">
                The validation window opens during the last 4 days of each month.
              </span>
            </div>
          )}

          {!bankMissing && invoicingOpen && <>

          {dateRange && (
            <div className="date-range-info">
              <i className="fas fa-calendar-alt"></i>
              <span>Showing classes from <strong>{formatDate(dateRange.start)}</strong> to <strong>{formatDate(dateRange.end)}</strong></span>
            </div>
          )}

          {selectedCount > 0 && (
            <div className="master-validate-section">
              <div className="selection-info">
                <i className="fas fa-check-square"></i>
                <span>
                  <strong>{selectedCount} of {programCount}</strong> program(s) added for validation
                  {selectedCount < programCount && (
                    <span className="requirement-note"> - Add all programs to validate</span>
                  )}
                </span>
              </div>
              <button
                className={`btn-master-validate ${(validating || selectedCount < programCount) ? 'btn-disabled' : ''}`}
                disabled={validating || selectedCount < programCount}
                onClick={validateSelectedClasses}
              >
                <i className="fas fa-check-double"></i>
                {validating ? 'Validating...' : selectedCount < programCount ? `Add ${programCount - selectedCount} More Program(s)` : 'Validate All Selected Programs'}
              </button>
            </div>
          )}

          <div className="invoicing-header">
            <div className="summary-card">
              <h3>Total Pending Classes</h3>
              <p className="summary-number">{totalClasses}</p>
            </div>
            <div className="summary-card">
              <h3>Total Programs</h3>
              <p className="summary-number">{programCount}</p>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading pending classes...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-container">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button onClick={loadPendingClasses} className="retry-button">Retry</button>
            </div>
          )}

          {!loading && !error && totalClasses === 0 && (
            <div className="activity-section">
              <div className="empty-state">
                <i className="fas fa-check-circle"></i>
                <p>No pending classes</p>
                <span>All your classes have been processed!</span>
                <button
                  className="btn-add-discrepancy"
                  onClick={raiseGeneralDiscrepancy}
                >
                  <i className="fas fa-exclamation-triangle"></i>
                  Add Discrepancy
                </button>
              </div>
            </div>
          )}

          {!loading && !error && totalClasses > 0 && (
            <div id="classesContainer">
              {programIds.map((programId) => {
                const programData = groupedData[programId];
                const classes = programData.classes;
                const programKey = `program-${programId}`;
                const isAdded = selectedPrograms.has(programKey);
                const hasIssues = programData.hasIssues;
                const allClassesConfirmed = classes.every(cls => cls.mentorConfirmation === 'Class Confirmed');

                return (
                  <div key={programId} className="program-section">
                    <div className="program-header">
                      <div className="program-title-group">
                        <h3>
                          <i className="fas fa-folder"></i>
                          Program ID: {programId}
                        </h3>
                        {(programData.studentName || programData.studentId) && (
                          <div className="student-info">
                            <i className="fas fa-user-graduate"></i>
                            {programData.studentName && <span className="student-name">{programData.studentName}</span>}
                            {programData.studentId && <span className="student-id">({programData.studentId})</span>}
                          </div>
                        )}
                      </div>
                      <div className="program-info">
                        <span className="program-badge">{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
                        <span className="amount-badge">
                          <i className="fas fa-coins"></i>
                          Total: {programData.formattedAmount}
                        </span>
                      </div>
                    </div>

                    <div className="classes-table">
                      <div className="table-header">
                        <div className="table-row">
                          <div className="table-cell">Meeting #</div>
                          <div className="table-cell">Start Time</div>
                          <div className="table-cell">End Time</div>
                          <div className="table-cell">Status</div>
                        </div>
                      </div>
                      <div className="table-body">
                        {classes.map((cls) => {
                          const hasIssue = cls.mentorConfirmation === 'Issue Raised';
                          const isConfirmed = cls.mentorConfirmation === 'Class Confirmed';

                          return (
                            <div
                              key={cls.id}
                              className={`table-row${hasIssue ? ' row-has-issue' : ''}${isConfirmed ? ' row-confirmed' : ''}`}
                            >
                              <div className="table-cell">{cls.meetingNumber || '-'}</div>
                              <div className="table-cell">
                                {cls.startDateTime || '-'}
                              </div>
                              <div className="table-cell">
                                {cls.endDateTime || '-'}
                              </div>
                              <div className="table-cell">
                                {cls.meetingStatus || '-'}
                              </div>
                              {hasIssue && (
                                <div className="table-cell issue-indicator" title={cls.issues}>
                                  <i className="fas fa-exclamation-circle"></i> Issue Raised
                                </div>
                              )}
                              {isConfirmed && (
                                <div className="table-cell confirmed-indicator">
                                  <i className="fas fa-check-circle"></i> Confirmed
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="action-buttons">
                      {hasIssues ? (
                        <>
                          <div className="issue-warning">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>This program has pending discrepancies. Resolve issues before validating.</span>
                          </div>
                          <button
                            className="btn-discrepancy"
                            onClick={() => raiseDiscrepancy(programId, classes.map(c => c.id))}
                          >
                            <i className="fas fa-exclamation-triangle"></i>
                            Raise Discrepancy
                          </button>
                        </>
                      ) : allClassesConfirmed ? (
                        <div className="success-info">
                          <i className="fas fa-check-circle"></i>
                          <span>All classes in this program have been validated and confirmed.</span>
                        </div>
                      ) : (
                        <>
                          <button
                            className={`btn-add-validate ${isAdded ? 'btn-added' : ''}`}
                            onClick={() => toggleProgramForValidation(programId)}
                            disabled={isAdded}
                          >
                            <i className={`fas ${isAdded ? 'fa-check' : 'fa-plus-circle'}`}></i>
                            {isAdded ? 'Added to Validate' : 'Add to Validate'}
                          </button>
                          <button
                            className="btn-discrepancy"
                            onClick={() => raiseDiscrepancy(programId, classes.map(c => c.id))}
                          >
                            <i className="fas fa-exclamation-triangle"></i>
                            Raise Discrepancy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </>}

          <div className="invoicing-footer-message">
            <p>
              📋 <strong>Billing Period:</strong> Sessions are calculated from the last day of the previous month minus 3 days through the last day of the current month minus 4 days.
            </p>
            <p>
              ⚠️ <strong>Important:</strong> Sessions booked outside the portal or added manually are not eligible for billing. Additionally, sessions without a properly submitted feedback form will not be processed for payment.
            </p>
            <p>
              💬 For any billing issues or questions, please contact support or <a href="/policies-dashboard" style={{ color: 'var(--primary-green)', textDecoration: 'underline' }}>read our policies</a>.
            </p>
          </div>
        </main>
      </div>

      {showDiscrepancyModal && (
        <div className="discrepancy-modal" onClick={closeDiscrepancyModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                {currentDiscrepancy.isGeneral ? 'Add Discrepancy' : 'Raise Discrepancy'}
              </h2>
              <button className="close-btn" onClick={closeDiscrepancyModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="discrepancy-info">
                {!currentDiscrepancy.isGeneral && (
                  <>
                    <p>You are raising a discrepancy for:</p>
                    <div className="info-box">
                      <strong>Program ID:</strong> {currentDiscrepancy.programId}<br />
                      <strong>Month:</strong> {currentMonth}
                    </div>
                  </>
                )}
                <p className="instruction">Please add your {currentDiscrepancy.isGeneral ? 'issue' : 'issues'} below:</p>
              </div>
              <textarea
                className="discrepancy-textarea"
                placeholder="Describe the issues or discrepancies you've found with these classes..."
                rows="6"
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                autoFocus
              ></textarea>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDiscrepancyModal}>
                Cancel
              </button>
              <button className="btn-submit" onClick={submitDiscrepancy}>
                <i className="fas fa-paper-plane"></i>
                Submit Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
