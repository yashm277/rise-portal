import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Student Management Overview</p>
          </div>
        </header>

        <div className="summary-cards">
          <div className="card-apple summary-card">
            <h3>Welcome</h3>
            <p className="summary-value">RISE Research</p>
          </div>
          <div className="card-apple summary-card">
            <h3>Role</h3>
            <p className="summary-value" style={{ fontSize: '32px' }}>
              {user?.role || 'User'}
            </p>
          </div>
          <div className="card-apple summary-card">
            <h3>This Month</h3>
            <p className="summary-value" style={{ fontSize: '28px' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="card-apple" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
            Welcome to RISE Research Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Navigate using the sidebar to access Invoicing, Analytics, and Settings.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
