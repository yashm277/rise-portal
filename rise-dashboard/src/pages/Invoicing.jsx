import { useState, useEffect } from 'react';
import { classAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import './Invoicing.css';

const Invoicing = () => {
  const { user } = useAuth();
  const [groupedData, setGroupedData] = useState({});
  const [totalClasses, setTotalClasses] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrograms, setSelectedPrograms] = useState(new Map());
  const [validating, setValidating] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [currentDiscrepancy, setCurrentDiscrepancy] = useState({ programId: '', classIds: [] });
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  useEffect(() => {
    loadPendingClasses();
  }, []);

  const loadPendingClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.email) {
        setError('User email not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log(`📋 Fetching pending classes for: ${user.email}`);
      
      const response = await classAPI.getPendingClasses(user.email);
      
      if (response.data) {
        setTotalClasses(response.data.totalClasses || 0);
        setProgramCount(response.data.programCount || 0);
        setDateRange(response.data.dateRange || null);
        setGroupedData(response.data.groupedData || {});
      }
    } catch (err) {
      console.error('❌ Error loading pending classes:', err);
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
      `Are you sure you want to validate ${programCount} program(s) with ${totalClassesCount} class(es)?\n\nThis will create invoice records for payment processing.`
    );
    
    if (!confirmed) return;

    setValidating(true);
    try {
      console.log(`✅ Validating ${programCount} program(s) with ${totalClassesCount} classes`);
      console.log(`👤 Mentor: ${user.name} (${user.email})`);
      
      let totalValidated = 0;
      let invoicesCreated = 0;
      
      for (const [key, programData] of selectedPrograms) {
        const response = await classAPI.validateClasses({
          programId: programData.programId,
          classIds: programData.classIds,
          mentorEmail: user.email,
          mentorName: user.name,
          completedCount: programData.completedCount || 0,
          missedCount: programData.missedCount || 0,
          totalAmount: programData.totalAmount || 0,
          currency: programData.currency || 'USD'
        });
        
        if (response.data) {
          totalValidated += response.data.validatedCount || programData.classIds.length;
          if (response.data.invoiceCreated) {
            invoicesCreated++;
          }
        }
      }
      
      let message = `✅ Success!\n\nValidated ${totalValidated} class(es) across ${programCount} program(s).`;
      
      if (invoicesCreated > 0) {
        message += `\n\n📄 Created ${invoicesCreated} invoice record(s) for payment processing.`;
      }
      
      alert(message);
      
      // Clear selections and reload
      setSelectedPrograms(new Map());
      loadPendingClasses();
      
    } catch (err) {
      console.error('❌ Error validating programs:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const raiseDiscrepancy = (programId, classIds) => {
    setCurrentDiscrepancy({ programId, classIds });
    setDiscrepancyNote('');
    setShowDiscrepancyModal(true);
  };

  const closeDiscrepancyModal = () => {
    setShowDiscrepancyModal(false);
    setCurrentDiscrepancy({ programId: '', classIds: [] });
    setDiscrepancyNote('');
  };

  const submitDiscrepancy = async () => {
    if (!discrepancyNote.trim()) {
      alert('Please enter a description of the issues before submitting.');
      return;
    }
    
    try {
      console.log(`📝 Submitting discrepancy for Program ${currentDiscrepancy.programId}`);
      
      const response = await classAPI.raiseDiscrepancy({
        programId: currentDiscrepancy.programId,
        classIds: currentDiscrepancy.classIds,
        issues: discrepancyNote
      });
      
      closeDiscrepancyModal();
      
      const result = response.data;
      alert(`✅ Discrepancy Submitted!\n\n${result.message}\n\nUpdated ${result.updatedCount} class record(s).`);
      
      loadPendingClasses();
      
    } catch (error) {
      console.error('❌ Error submitting discrepancy:', error);
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
          {/* Date Range Info */}
          {dateRange && (
            <div className="date-range-info">
              <i className="fas fa-calendar-alt"></i>
              <span>Showing classes from <strong>{formatDate(dateRange.start)}</strong> to <strong>{formatDate(dateRange.end)}</strong></span>
            </div>
          )}

          {/* Master Validate Button Section */}
          {selectedCount > 0 && (
            <div className="master-validate-section">
              <div className="selection-info">
                <i className="fas fa-check-square"></i>
                <span><strong>{selectedCount}</strong> program(s) added for validation</span>
              </div>
              <button 
                className={`btn-master-validate ${validating ? 'btn-disabled' : ''}`}
                disabled={validating}
                onClick={validateSelectedClasses}
              >
                <i className="fas fa-check-double"></i>
                {validating ? 'Validating...' : 'Validate All Selected Programs'}
              </button>
            </div>
          )}

          {/* Header Summary */}
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

          {/* Loading State */}
          {loading && (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading pending classes...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-container">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button onClick={loadPendingClasses} className="retry-button">Retry</button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && totalClasses === 0 && (
            <div className="activity-section">
              <div className="empty-state">
                <i className="fas fa-check-circle"></i>
                <p>No pending classes</p>
                <span>All your classes have been processed!</span>
              </div>
            </div>
          )}

          {/* Classes Data */}
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
                    {/* Program header with total amount */}
                    <div className="program-header">
                      <h3>
                        <i className="fas fa-folder"></i>
                        Program ID: {programId}
                      </h3>
                      <div className="program-info">
                        <span className="program-badge">{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
                        <span className="amount-badge">
                          <i className="fas fa-coins"></i>
                          Total: {programData.formattedAmount}
                        </span>
                      </div>
                    </div>

                    {/* Classes Table */}
                    <div className="classes-table">
                      <div className="table-header">
                        <div className="table-row">
                          <div className="table-cell">Meeting #</div>
                          <div className="table-cell">Date</div>
                          <div className="table-cell">Start Time</div>
                          <div className="table-cell">End Time</div>
                          <div className="table-cell">Duration (min)</div>
                          <div className="table-cell">Recording</div>
                          <div className="table-cell">Transcript</div>
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
                              <div className="table-cell">{formatDate(cls.date)}</div>
                              <div className="table-cell">{cls.startTime || '-'}</div>
                              <div className="table-cell">{cls.endTime || '-'}</div>
                              <div className="table-cell">{cls.duration || '-'}</div>
                              <div className="table-cell">
                                {cls.recordingLink ? (
                                  <a href={cls.recordingLink} target="_blank" rel="noopener noreferrer" className="link-btn">
                                    <i className="fas fa-video"></i> View
                                  </a>
                                ) : '-'}
                              </div>
                              <div className="table-cell">
                                {cls.transcriptLink ? (
                                  <a href={cls.transcriptLink} target="_blank" rel="noopener noreferrer" className="link-btn">
                                    <i className="fas fa-file-alt"></i> View
                                  </a>
                                ) : '-'}
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

                    {/* Action Buttons */}
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
        </main>
      </div>

      {/* Discrepancy Modal */}
      {showDiscrepancyModal && (
        <div className="discrepancy-modal" onClick={closeDiscrepancyModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                Raise Discrepancy
              </h2>
              <button className="close-btn" onClick={closeDiscrepancyModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="discrepancy-info">
                <p>You are raising a discrepancy for:</p>
                <div className="info-box">
                  <strong>Program ID:</strong> {currentDiscrepancy.programId}<br />
                  <strong>Month:</strong> {currentMonth}
                </div>
                <p className="instruction">Please add your issues below:</p>
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
