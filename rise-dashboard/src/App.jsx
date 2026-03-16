import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoicing from './pages/Invoicing';
import AddSchedule from './pages/AddSchedule';
import ViewSchedule from './pages/ViewSchedule';
import BookSchedule from './pages/BookSchedule';
import BookScheduleWritingCoach from './pages/BookScheduleWritingCoach';
import BookScheduleProgramManager from './pages/BookScheduleProgramManager';
import MyMeetings from './pages/MyMeetings';
import MyStudents from './pages/MyStudents';
import LeaveApplication from './pages/LeaveApplication';
import LeaveManagement from './pages/LeaveManagement';
import BankDetails from './pages/BankDetails';
import Reschedule from './pages/Reschedule';
import ChangePassword from './pages/ChangePassword';
import Policies from './pages/Policies';
import PoliciesDashboard from './pages/PoliciesDashboard';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SecurityPolicy from './pages/SecurityPolicy';
import './styles/rise-theme.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const NonStudentRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'Student') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoicing"
            element={
              <NonStudentRoute>
                <Invoicing />
              </NonStudentRoute>
            }
          />
          <Route
            path="/scheduling/add"
            element={
              <ProtectedRoute>
                <AddSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduling/view"
            element={
              <ProtectedRoute>
                <ViewSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduling/book"
            element={
              <ProtectedRoute>
                <BookSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduling/book-writing-coach"
            element={
              <ProtectedRoute>
                <BookScheduleWritingCoach />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduling/book-program-manager"
            element={
              <ProtectedRoute>
                <BookScheduleProgramManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-meetings"
            element={
              <ProtectedRoute>
                <MyMeetings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-students"
            element={
              <NonStudentRoute>
                <MyStudents />
              </NonStudentRoute>
            }
          />
          <Route
            path="/reschedule"
            element={
              <NonStudentRoute>
                <Reschedule />
              </NonStudentRoute>
            }
          />
          <Route
            path="/leave-application"
            element={
              <ProtectedRoute>
                <LeaveApplication />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-management"
            element={
              <ProtectedRoute>
                <LeaveManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bank-details"
            element={
              <NonStudentRoute>
                <BankDetails />
              </NonStudentRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/policies-dashboard"
            element={
              <ProtectedRoute>
                <PoliciesDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/policies" element={<Policies />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/security-policy" element={<SecurityPolicy />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
