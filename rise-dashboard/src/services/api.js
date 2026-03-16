import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  verifyGoogleToken: (credential) => {
    return apiClient.post('/api/verify-google-token', { credential });
  },
  loginWithEmail: (email, password) => {
    return apiClient.post('/api/login-email', { email, password });
  },
  changePassword: (email, newPassword) => {
    return apiClient.post('/api/change-password', { email, newPassword });
  },
};

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

export const classAPI = {
  getPendingClasses: (email) => {
    return apiClient.get(`/api/pending-classes/${encodeURIComponent(email)}`);
  },
  validateClasses: (validationData) => {
    return apiClient.post('/api/validate-classes', validationData);
  },
  validateAllPrograms: (validationData) => {
    return apiClient.post('/api/validate-all-programs', validationData);
  },
  raiseDiscrepancy: (discrepancyData) => {
    return apiClient.post('/api/raise-discrepancy', discrepancyData);
  },
  raiseGeneralDiscrepancy: (discrepancyData) => {
    return apiClient.post('/api/raise-general-discrepancy', discrepancyData);
  },
};

export const invoiceAPI = {
  getInvoices: () => {
    return apiClient.get('/api/invoices');
  },
};

export const reportsAPI = {
  getPendingReports: () => {
    return apiClient.get('/api/pending-reports');
  },
};

export const scheduleAPI = {
  checkMentorEligibility: (email) => {
    return apiClient.post('/api/check-mentor-eligibility', { email });
  },
  submitAvailability: (availabilityData) => {
    return apiClient.post('/api/submit-availability', availabilityData);
  },
  deleteAvailability: (email, week) => {
    return apiClient.post('/api/delete-availability', { email, week });
  },
  updateAvailability: (availabilityData) => {
    return apiClient.post('/api/update-availability', availabilityData);
  },
  getMentorSchedules: (email) => {
    return apiClient.get(`/api/mentor-schedules/${encodeURIComponent(email)}`);
  },
  checkStudentEligibility: (email) => {
    return apiClient.post('/api/check-student-eligibility', { email });
  },
  getMentorAvailability: (mentorEmail, startDate, endDate) => {
    return apiClient.post('/api/get-mentor-availability', {
      mentorEmail,
      startDate,
      endDate
    });
  },
  bookMeeting: (bookingData) => {
    return apiClient.post('/api/book-meeting', bookingData);
  },
  getRemainingSessions: (programId) => {
    return apiClient.post('/api/get-remaining-sessions', { programId });
  },
  getAllSessions: (programId) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return apiClient.post('/api/get-all-sessions', { programId, userTimezone });
  },
  getHostMeetings: (email) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return apiClient.post('/api/get-host-meetings', { email, userTimezone });
  },
  rescheduleMeeting: (reschedulData) => {
    return apiClient.post('/api/reschedule-meeting', reschedulData);
  },
  submitMentorFeedback: (feedbackData) => {
    return apiClient.post('/api/submit-mentor-feedback', feedbackData);
  },
  submitWCFeedback: (feedbackData) => {
    return apiClient.post('/api/submit-wc-feedback', feedbackData);
  },
  submitTeamFeedback: (feedbackData) => {
    return apiClient.post('/api/submit-team-feedback', feedbackData);
  },
  getFeedback: (programId, meetingNumber, meetingType) => {
    return apiClient.post('/api/get-feedback', { programId, meetingNumber, meetingType });
  },
};

export default apiClient;
