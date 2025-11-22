import axios from 'axios';

// API base URL - update for production deployment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  verifyGoogleToken: (credential) => {
    return apiClient.post('/api/verify-google-token', { credential });
  },
};

// Student API
export const studentAPI = {
  getStudents: () => {
    return apiClient.get('/api/students');
  },
  createStudent: (studentData) => {
    return apiClient.post('/api/students', studentData);
  },
  updateStudent: (recordId, studentData) => {
    return apiClient.put(`/api/students/${recordId}`, studentData);
  },
  deleteStudent: (recordId) => {
    return apiClient.delete(`/api/students/${recordId}`);
  },
};

// Class API (for invoicing)
export const classAPI = {
  getPendingClasses: (email) => {
    return apiClient.get(`/api/pending-classes/${encodeURIComponent(email)}`);
  },
  validateClasses: (validationData) => {
    return apiClient.post('/api/validate-classes', validationData);
  },
  raiseDiscrepancy: (discrepancyData) => {
    return apiClient.post('/api/raise-discrepancy', discrepancyData);
  },
};

// Invoice API (if you add more invoice endpoints)
export const invoiceAPI = {
  getInvoices: () => {
    return apiClient.get('/api/invoices');
  },
};

// Reports API
export const reportsAPI = {
  getPendingReports: () => {
    return apiClient.get('/api/pending-reports');
  },
};

// Schedule API
export const scheduleAPI = {
  checkStudentEligibility: (email) => {
    return apiClient.post('/api/check-student-eligibility', { email });
  },
  submitAvailability: (availabilityData) => {
    return apiClient.post('/api/submit-availability', availabilityData);
  },
  getMentorSchedules: (email) => {
    return apiClient.get(`/api/mentor-schedules/${encodeURIComponent(email)}`);
  },
};

export default apiClient;
