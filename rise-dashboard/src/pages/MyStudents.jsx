import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import axios from 'axios';
import './MyStudents.css';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const roleLabel = {
  'Mentor': 'Mentor',
  'Writing Coach': 'Writing Coach',
  'Team': 'Program Manager',
};

const MyStudents = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (user?.email && user?.role) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/api/get-my-students', {
        email: user.email,
        role: user.role,
      });

      if (response.data.success) {
        setStudents(response.data.students.filter(s => s.isActive));
      } else {
        setError(response.data.message || 'Failed to load students.');
      }
    } catch (err) {
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const label = roleLabel[user?.role] || user?.role;

  return (
    <div className="mystudents-layout">
      <Sidebar />
      <div className="mystudents-content">
        <header className="mystudents-header">
          <div>
            <h1 className="page-title">My Students</h1>
            <p className="page-subtitle">
              Active Students assigned to you as a {label}
            </p>
          </div>
          <button className="btn-refresh" onClick={fetchStudents} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className="mystudents-body">
          {loading ? (
            <div className="mystudents-loading">
              <div className="loading-spinner"></div>
              <p>Loading students...</p>
            </div>
          ) : error ? (
            <div className="mystudents-error">
              <p>{error}</p>
              <button className="btn-refresh" onClick={fetchStudents}>Try Again</button>
            </div>
          ) : students.length === 0 ? (
            <div className="mystudents-empty">
              <p>Sorry, there aren't any active students mapped to you currently.</p>
            </div>
          ) : (
            <div className="mystudents-table-wrapper">
              <table className="mystudents-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Program ID</th>
                    {user?.role === 'Team' ? (
                      <>
                        <th>Mentor</th>
                        <th>Writing Coach</th>
                      </>
                    ) : (
                      <th>Program Manager</th>
                    )}
                    <th>Drive</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.programId + index}>
                      <td className="col-index">{index + 1}</td>
                      <td className="col-name">{student.name}</td>
                      <td className="col-program">{student.programId}</td>
                      {user?.role === 'Team' ? (
                        <>
                          <td>{student.mentorName}</td>
                          <td>{student.wcName}</td>
                        </>
                      ) : (
                        <td>{student.programManagerName}</td>
                      )}
                      <td className="col-drive">
                        {student.driveLink ? (
                          <a
                            href={student.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="drive-link"
                          >
                            Open Drive
                          </a>
                        ) : (
                          <span className="no-drive">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyStudents;
