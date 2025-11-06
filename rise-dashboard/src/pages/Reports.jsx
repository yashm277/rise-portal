import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const [groupedData, setGroupedData] = useState({});
  const [totalReports, setTotalReports] = useState(0);
  const [counselorCount, setCounselorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCounselors, setExpandedCounselors] = useState(new Set());

  // Role-based access control - only "Team" can access
  if (user?.role !== 'Team') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadPendingReports();
  }, []);

  const loadPendingReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching pending reports...');
      
      const response = await reportsAPI.getPendingReports();
      
      if (response.data) {
        setTotalReports(response.data.totalReports || 0);
        setCounselorCount(response.data.counselorCount || 0);
        setGroupedData(response.data.groupedData || {});
      }
    } catch (err) {
      console.error('❌ Error loading pending reports:', err);
      setError(err.message || 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCounselor = (counselorEmail) => {
    const newExpanded = new Set(expandedCounselors);
    if (newExpanded.has(counselorEmail)) {
      newExpanded.delete(counselorEmail);
    } else {
      newExpanded.add(counselorEmail);
    }
    setExpandedCounselors(newExpanded);
  };

  const renderHTMLTable = (htmlString) => {
    if (!htmlString) return <p>No meeting data available</p>;
    return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content">
          <div className="top-bar">
            <h1>Student Reports</h1>
          </div>
          <div className="dashboard-content">
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading pending reports...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content">
          <div className="top-bar">
            <h1>Student Reports</h1>
          </div>
          <div className="dashboard-content">
            <div className="error-container">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Reports</h3>
              <p>{error}</p>
              <button onClick={loadPendingReports} className="retry-button">
                <i className="fas fa-redo"></i> Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content">
        <div className="top-bar">
          <h1>Student Reports</h1>
        </div>

        <div className="dashboard-content">
          {/* Summary Cards */}
          <div className="reports-header">
            <div className="summary-card">
              <h3>Total Counselors</h3>
              <p className="summary-number">{counselorCount}</p>
            </div>
            <div className="summary-card">
              <h3>Pending Reports</h3>
              <p className="summary-number">{totalReports}</p>
            </div>
          </div>

          {/* Reports by Counselor */}
          {totalReports === 0 ? (
            <div className="activity-section">
              <div className="empty-state">
                <i className="fas fa-check-circle"></i>
                <p>All reports have been processed!</p>
                <span>No pending reports at the moment.</span>
              </div>
            </div>
          ) : (
            <div className="counselors-list">
              {Object.entries(groupedData).map(([counselorEmail, counselorData]) => (
                <div key={counselorEmail} className="counselor-section">
                  <div 
                    className="counselor-header"
                    onClick={() => toggleCounselor(counselorEmail)}
                  >
                    <div className="counselor-info">
                      <h3>
                        <i className="fas fa-user-tie"></i>
                        {counselorEmail}
                      </h3>
                      <span className="report-count-badge">
                        {counselorData.totalReports} {counselorData.totalReports === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                    <button className="expand-btn">
                      <i className={`fas fa-chevron-${expandedCounselors.has(counselorEmail) ? 'up' : 'down'}`}></i>
                    </button>
                  </div>

                  {expandedCounselors.has(counselorEmail) && (
                    <div className="reports-list">
                      {counselorData.reports.map((report, index) => (
                        <div key={report.id} className="report-card">
                          <div className="report-header">
                            <h4>
                              <i className="fas fa-user-graduate"></i>
                              {report.studentName}
                            </h4>
                            <span className="program-badge">{report.programId}</span>
                          </div>

                          <div className="report-section">
                            <h5><i className="fas fa-comment-dots"></i> Counselor Message</h5>
                            <p className="message-text">{report.counselorMessage || 'No message provided'}</p>
                          </div>

                          <div className="report-section">
                            <h5><i className="fas fa-calendar-alt"></i> Meetings</h5>
                            <div className="meetings-table">
                              {renderHTMLTable(report.meetingsTable)}
                            </div>
                          </div>

                          <div className="report-section">
                            <h5><i className="fas fa-file-alt"></i> Weekly Summary</h5>
                            <p className="summary-text">{report.weeklySummary || 'No summary available'}</p>
                          </div>

                          <div className="report-footer">
                            <span className="status-badge pending">
                              <i className="fas fa-clock"></i> {report.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;
