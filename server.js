// ========================================
// RISE RESEARCH - EXPRESS BACKEND SERVER
// ========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 3002;
// ========================================
// MIDDLEWARE
// ========================================
// CORS configuration for React frontend
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173', 
            'https://riseresearch.vercel.app',
            'https://rise-research-xa8a.vercel.app',
            'https://rise-research.vercel.app',
            'http://portal.riseglobaleducation.com',
            'https://portal.riseglobaleducation.com'
        ];
        
        // Check if origin is allowed or if it's a Vercel preview deployment
        if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Accept', 'x-student-email'],
    optionsSuccessStatus: 200
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.static('.')); // Serve static files (HTML, CSS, JS) - for old app

// ========================================
// AIRTABLE CONFIGURATION
// ========================================
// Helper function to get environment variable with fallback priority:
// 1. process.env (system/platform variables)
// 2. .env file variables (loaded by dotenv)
// 3. undefined (no fallback)
const getEnvVar = (key) => {
  return process.env[key] || undefined;
};

const AIRTABLE_TOKEN = getEnvVar('AIRTABLE_PERSONAL_ACCESS_TOKEN');
const CONTACT_BASE_ID = getEnvVar('CONTACT_BASE_ID'); // Contact base for authentication
const INVOICING_BASE_ID = getEnvVar('INVOICING_BASE_ID'); // Invoicing base for classes
const REPORTS_BASE_ID = getEnvVar('REPORTS_BASE_ID'); // Reports base for student reports
const REPORTS_TABLE_ID = getEnvVar('REPORTS_TABLE_ID'); // Student Reports table

// Scheduling configuration
const SCHEDULE_BASE_ID = getEnvVar('SCHEDULE_BASE_ID'); // Scheduling base
const SCHEDULING_MAIN_TABLE_ID = getEnvVar('SCHEDULING_MAIN_TABLE_ID'); // Main scheduling table
const TIMINGS_TABLE_ID = getEnvVar('TIMINGS_TABLE_ID'); // Timings table

// Meetings configuration
const MEETINGS_BASE_ID = getEnvVar('MEETINGS_BASE_ID'); // Meetings base
const MEETINGS_MAIN_TABLE_ID = getEnvVar('MEETINGS_MAIN_TABLE_ID'); // Meetings main table
const MEETINGS_MASTER_TABLE_ID = getEnvVar('MEETINGS_MASTER_TABLE_ID'); // Meetings master table (student details)

// Student Leaves configuration
const STUDENT_LEAVES_TABLE_ID = getEnvVar('STUDENT_LEAVES_TABLE_ID'); // Student Leaves table (in scheduling base)

// Feedback configuration
const FEEDBACK_BASE_ID = getEnvVar('FEEDBACK_BASE_ID'); // Feedback base
const MENTOR_FEEDBACK_TABLE_ID = getEnvVar('MENTOR_FEEDBACK_TABLE_ID'); // Mentor Feedback Form table
const WC_FEEDBACK_TABLE_ID = getEnvVar('WC_FEEDBACK_TABLE_ID'); // Writing Coach Feedback Form table
const TEAM_FEEDBACK_TABLE_ID = getEnvVar('TEAM_FEEDBACK_TABLE_ID'); // Review Meet Feedback Form table

// Debug: Log environment variables on startup
// Table names for authentication (in CONTACT_BASE_ID)
const AUTH_TABLES = ['Students', 'Parents', 'Mentors', 'Writing Coaches', 'Team'];

// ========================================
// HELPER FUNCTION
// ========================================
function getHeaders() {
  return {
    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// Helper: fetch ALL records from an Airtable endpoint, following pagination offsets
async function fetchAllAirtableRecords(url, params = {}) {
  const allRecords = [];
  let offset = null;
  do {
    const p = new URLSearchParams(params);
    if (offset) p.set('offset', offset);
    const response = await fetch(`${url}?${p}`, { headers: getHeaders() });
    if (!response.ok) throw new Error(`Airtable fetch failed: ${response.status}`);
    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);
  return allRecords;
}

// Helper function to convert UTC ISO timestamp to user's timezone
// Returns object with date, time, and fullDateTime (handles date shifts correctly)
function convertUTCtoUserTimezone(utcDateTimeString, userTimezone) {
  try {
    // If no valid UTC timestamp, return defaults
    if (!utcDateTimeString || utcDateTimeString === '-') {
      return {
        date: '-',
        time: '-',
        fullDateTime: '-'
      };
    }

    // Parse the UTC timestamp (ISO format: "2026-02-07T18:00:00Z")
    const utcDate = new Date(utcDateTimeString);
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid UTC timestamp:', utcDateTimeString);
      return {
        date: '-',
        time: '-',
        fullDateTime: '-'
      };
    }

    // Convert to user's timezone and extract date (YYYY-MM-DD)
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const date = dateFormatter.format(utcDate);

    // Convert to user's timezone and extract time
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const time = timeFormatter.format(utcDate);

    // Full datetime string
    const fullDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const fullDateTime = fullDateTimeFormatter.format(utcDate);

    return {
      date,
      time,
      fullDateTime
    };

  } catch (error) {
    console.error('UTC to User timezone conversion error:', error);
    return {
      date: '-',
      time: '-',
      fullDateTime: '-'
    };
  }
}

// DEPRECATED: Old IST conversion function (kept for MyMeetings/Dashboard which use Meetings Main table)
// Use convertUTCtoUserTimezone() for scheduling base
function convertISTtoUserTimezone(dateString, timeString, userTimezone) {
  try {
    // If no valid date or time, return original
    if (!dateString || !timeString || dateString === '-' || timeString === '-') {
      return timeString;
    }

    // Parse the date and time from IST
    // Combine date and time into a single string
    const dateTimeString = `${dateString}T${timeString}`;
    
    // Create a date object assuming IST (UTC+5:30)
    const date = new Date(dateTimeString);
    
    // IST is UTC+5:30, so we need to adjust
    // If the time doesn't have timezone info, we assume it's IST
    // We'll create a proper IST datetime
    const istOffset = 5.5 * 60; // IST offset in minutes
    
    // Parse time components
    const timeParts = timeString.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!timeParts) {
      return timeString; // Return original if can't parse
    }

    let hours = parseInt(timeParts[1]);
    const minutes = parseInt(timeParts[2]);
    const ampm = timeParts[4];

    // Convert to 24-hour format if AM/PM is present
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    // Create date in IST
    const dateParts = dateString.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);

    // Create UTC date by subtracting IST offset
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes) - (istOffset * 60 * 1000));

    // Convert to user's timezone
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    return formatter.format(utcDate);

  } catch (error) {
    console.error('Timezone conversion error:', error);
    return timeString; // Return original on error
  }
}

// Helper function to convert UTC slots to user timezone with date shifts
function convertUTCSlotsToUserTimezone(utcSlots, requestStartDate, requestEndDate, userTimezone) {
  const slots = [];
  
  try {
    console.log('[UTC CONVERSION] Input:', {
      utcSlots,
      requestStartDate,
      requestEndDate,
      userTimezone
    });
    
    // utcSlots format: [{ date: "2026-02-07", utcHour: 18, utcMinute: 0, duration: 60 }, ...]
    for (const slot of utcSlots) {
      const { date, utcHour, utcMinute, duration } = slot;
      
      // Create UTC ISO timestamp
      const utcStartDateTime = `${date}T${String(utcHour).padStart(2, '0')}:${String(utcMinute).padStart(2, '0')}:00Z`;
      const utcEndDateTime = new Date(new Date(utcStartDateTime).getTime() + duration * 60 * 1000).toISOString();
      
      // Convert to user timezone
      const startConverted = convertUTCtoUserTimezone(utcStartDateTime, userTimezone);
      const endConverted = convertUTCtoUserTimezone(utcEndDateTime, userTimezone);
      
      console.log('[UTC CONVERSION] Slot processed:', {
        originalDate: date,
        convertedDate: startConverted.date,
        requestRange: `${requestStartDate} to ${requestEndDate}`,
        inRange: startConverted.date >= requestStartDate && startConverted.date <= requestEndDate
      });
      
      // Check if converted date falls within requested range
      if (startConverted.date >= requestStartDate && startConverted.date <= requestEndDate) {
        slots.push({
          date: startConverted.date,  // This is the converted date (handles date shifts!)
          startTime: startConverted.time,
          endTime: endConverted.time,
          utcStartDateTime: utcStartDateTime,
          utcEndDateTime: utcEndDateTime,
          timezone: userTimezone
        });
      }
    }
    
    console.log('[UTC CONVERSION] Output:', { totalSlots: slots.length, slots });
    
    return slots;
  } catch (error) {
    console.error('Error converting UTC slots:', error);
    return [];
  }
}

// ========================================
// ROUTES
// ========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'RISE Research Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify booking endpoints are deployed
app.get('/api/verify-booking-deployment', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Booking endpoints should be available',
    bookingEndpointsAvailable: true,
    endpoints: ['/api/book-meeting', '/api/test-booking'],
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check environment variables
app.get('/api/debug/env', (req, res) => {
  const maskValue = (value) => value ? `${value.substring(0, 8)}...` : 'Missing';
  
  res.json({
    CONTACT_BASE_ID: CONTACT_BASE_ID ? '✅ Set: ' + maskValue(CONTACT_BASE_ID) : '❌ Missing',
    INVOICING_BASE_ID: INVOICING_BASE_ID ? '✅ Set: ' + maskValue(INVOICING_BASE_ID) : '❌ Missing',
    SCHEDULE_BASE_ID: SCHEDULE_BASE_ID ? '✅ Set: ' + maskValue(SCHEDULE_BASE_ID) : '❌ Missing',
    SCHEDULING_MAIN_TABLE_ID: SCHEDULING_MAIN_TABLE_ID ? '✅ Set: ' + maskValue(SCHEDULING_MAIN_TABLE_ID) : '❌ Missing',
    TIMINGS_TABLE_ID: TIMINGS_TABLE_ID ? '✅ Set: ' + maskValue(TIMINGS_TABLE_ID) : '❌ Missing',
    AIRTABLE_TOKEN: AIRTABLE_TOKEN ? '✅ Set: ' + maskValue(AIRTABLE_TOKEN) : '❌ Missing',
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? '✅ Set: ' + maskValue(GOOGLE_CLIENT_ID) : '❌ Missing',
    GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? '✅ Set: ' + maskValue(GOOGLE_CLIENT_SECRET) : '❌ Missing',
    GOOGLE_REFRESH_TOKEN: GOOGLE_REFRESH_TOKEN ? '✅ Set: ' + maskValue(GOOGLE_REFRESH_TOKEN) : '❌ Missing',
    GOOGLE_CALENDAR_EMAIL: GOOGLE_CALENDAR_EMAIL ? '✅ Set: ' + maskValue(GOOGLE_CALENDAR_EMAIL) : '❌ Missing',
    MEETINGS_BASE_ID: MEETINGS_BASE_ID ? '✅ Set: ' + maskValue(MEETINGS_BASE_ID) : '❌ Missing',
    MEETINGS_MAIN_TABLE_ID: MEETINGS_MAIN_TABLE_ID ? '✅ Set: ' + maskValue(MEETINGS_MAIN_TABLE_ID) : '❌ Missing',
    MEETINGS_MASTER_TABLE_ID: MEETINGS_MASTER_TABLE_ID ? '✅ Set: ' + maskValue(MEETINGS_MASTER_TABLE_ID) : '❌ Missing',
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
});

// Google OAuth authorization endpoint
app.get('/api/auth/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });
    
    const authUrl = 'https://accounts.google.com/oauth/v2/auth?' + params.toString();
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Click the authUrl to authorize calendar access',
      instructions: 'Copy and visit the authUrl in your browser to proceed'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create authorization URL',
      error: error.message
    });
  }
});

// OAuth callback handler
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.send('<html><body><h1>Authorization Failed</h1><p>Error: ' + error + '</p><a href="/api/auth/google">Try again</a></body></html>');
    }
    
    if (!code) {
      return res.send('<html><body><h1>No Authorization Code</h1><p>No code received from Google.</p><a href="/api/auth/google">Try again</a></body></html>');
    }
    const tokenData = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenData
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return res.send('<html><body><h1>Token Exchange Failed</h1><p>' + (tokens.error_description || tokens.error) + '</p></body></html>');
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + tokens.access_token }
    });
    
    const userInfo = await userResponse.json();
    const html = `
    <html>
    <head><title>Authorization Success</title></head>
    <body style="font-family: Arial; padding: 40px;">
      <h1 style="color: green;">✅ Success!</h1>
      <h2>Your Google Calendar is now connected</h2>
      
      <div style="background: #ffffcc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🔑 Add these to Vercel Environment Variables:</h3>
        <p><strong>GOOGLE_REFRESH_TOKEN</strong><br>
        <textarea style="width: 100%; height: 60px; font-family: monospace;">${tokens.refresh_token}</textarea></p>
        
        <p><strong>GOOGLE_CALENDAR_EMAIL</strong><br>
        <input style="width: 100%; padding: 8px; font-family: monospace;" value="${userInfo.email}" readonly></p>
      </div>
      
      <div style="background: #e8f4ff; padding: 15px; border-radius: 8px;">
        <h3>Next Steps:</h3>
        <ol>
          <li>Copy the refresh token above</li>
          <li>Add both variables to your Vercel project</li>
          <li>Redeploy your application</li>
          <li>Meeting booking will then work!</li>
        </ol>
      </div>
    </body>
    </html>`;
    
    res.send(html);
    
  } catch (error) {
    res.status(500).send('<html><body><h1>Server Error</h1><p>' + error.message + '</p></body></html>');
  }
});

// Simple auth endpoint to test
app.get('/auth/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    const authUrl = 'https://accounts.google.com/oauth/v2/auth?' + new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to authorize calendar access',
      redirectUri: GOOGLE_REDIRECT_URI,
      instructions: 'Click the authUrl to proceed with Google authorization'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create authorization URL',
      error: error.message
    });
  }
});

// OAuth callback endpoint
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.send(`<html><body style="font-family: Arial; padding: 40px;"><h1 style="color: red;">Authorization Failed</h1><p>Error: ${error}</p><a href="/auth/google">Try again</a></body></html>`);
    }
    
    if (!code) {
      return res.send(`<html><body style="font-family: Arial; padding: 40px;"><h1 style="color: red;">No Authorization Code</h1><p>No authorization code received.</p><a href="/auth/google">Try again</a></body></html>`);
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return res.send(`<html><body><h1>Token Exchange Failed</h1><p>Error: ${tokens.error_description || tokens.error}</p><a href="/auth/google">Try again</a></body></html>`);
    }
    
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    
    const userInfo = await userResponse.json();
    res.send(`<html><head><title>Success!</title></head><body style="font-family: Arial; padding: 40px;"><h1 style="color: green;">✅ Authorization Successful!</h1><h2>Your Refresh Token:</h2><textarea style="width: 100%; height: 100px; font-family: monospace;">${tokens.refresh_token}</textarea><h2>Add these to Vercel:</h2><p><strong>GOOGLE_REFRESH_TOKEN</strong>=${tokens.refresh_token}</p><p><strong>GOOGLE_CALENDAR_EMAIL</strong>=${userInfo.email}</p></body></html>`);
    
  } catch (error) {
    res.status(500).send(`<html><body><h1>Server Error</h1><p>An error occurred during authorization.</p><a href="/auth/google">Try again</a></body></html>`);
  }
});

// POST: Verify Google token and extract email (for React frontend)
app.post('/api/verify-google-token', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ 
        success: false,
        message: 'Google credential is required' 
      });
    }

    // Decode the JWT token to get user info
    // Google JWT is in format: header.payload.signature
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString()
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;
    // Check if email exists in any of the auth tables and determine role
    let userRole = null;
    let userFound = false;
    let userEmployeeTypes = [];

    for (const tableName of AUTH_TABLES) {
      try {
        let allRecords = [];
        let offset = null;
        
        // Fetch all records with pagination
        do {
          const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ''}`;
          
          const response = await fetch(tableUrl, {
            headers: getHeaders()
          });

          if (!response.ok) break;

          const data = await response.json();
          allRecords = allRecords.concat(data.records);
          offset = data.offset; // Will be undefined if no more records
          
        } while (offset);
        // Check if email exists in this table
        for (const record of allRecords) {
          if (record.fields.Email && record.fields.Email.toLowerCase() === email.toLowerCase()) {
            userFound = true;
            // Determine role based on table name
            if (tableName === 'Students') {
              userRole = 'Student';
            } else if (tableName === 'Parents') {
              userRole = 'Parent';
            } else if (tableName === 'Mentors') {
              userRole = 'Mentor';
            } else if (tableName === 'Writing Coaches') {
              userRole = 'Writing Coach';
            } else if (tableName === 'Team') {
              userRole = 'Team';
              // Read Employee Type (multi-select) for Team members
              const employeeTypeRaw = record.fields['Employee Type'];
              const employeeTypes = Array.isArray(employeeTypeRaw) ? employeeTypeRaw : [];
              userEmployeeTypes = employeeTypes;
            }
            break;
          }
        }

        if (userFound) break; // Stop searching once user is found
      } catch (error) {
      }
    }

    // Check if user's email is authorized
    if (userFound && userRole) {
      return res.json({
        success: true,
        email: email,
        name: name,
        picture: picture,
        role: userRole,
        employeeTypes: userEmployeeTypes
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'You are not registered in our system. Please contact support.'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
});

// GET: Fetch all authorized emails from multiple tables
app.get('/api/authorized-emails', async (req, res) => {
  try {
    const emailSet = new Set();
    
    // Fetch emails from each table in CONTACT_BASE_ID
    for (const tableName of AUTH_TABLES) {
      try {
        const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}`;
        const response = await fetch(tableUrl, {
          headers: getHeaders()
        });

        if (!response.ok) {
          continue; // Skip this table but continue with others
        }

        const data = await response.json();
        
        // Extract emails from records
        data.records.forEach(record => {
          const email = record.fields['Email'] || record.fields['email'];
          if (email && typeof email === 'string') {
            emailSet.add(email.toLowerCase().trim());
          }
        });
      } catch (tableError) {
      }
    }
    
    const authorizedEmails = Array.from(emailSet);
    res.json({ 
      emails: authorizedEmails,
      count: authorizedEmails.length 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch authorized emails', 
      message: error.message 
    });
  }
});

// POST: Verify if an email is authorized
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Email is required' 
      });
    }
    const emailSet = new Set();
    
    // Fetch emails from each table in CONTACT_BASE_ID
    for (const tableName of AUTH_TABLES) {
      try {
        const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}`;
        
        const response = await fetch(tableUrl, {
          headers: getHeaders()
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        data.records.forEach(record => {
          const recordEmail = record.fields['Email'] || record.fields['email'];
          if (recordEmail && typeof recordEmail === 'string') {
            emailSet.add(recordEmail.toLowerCase().trim());
          }
        });
      } catch (tableError) {
      }
    }
    
    const isAuthorized = emailSet.has(email.toLowerCase().trim());
    res.json({ 
      authorized: isAuthorized,
      email: email
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to verify email', 
      message: error.message 
    });
  }
});

// POST: Login with email and password
app.post('/api/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }
    // Search for user in all auth tables
    let userFound = false;
    let userRole = null;
    let userName = null;
    let userEmployeeTypes = [];

    for (const tableName of AUTH_TABLES) {
      try {
        let allRecords = [];
        let offset = null;

        // Fetch all records with pagination
        do {
          const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ''}`;

          const response = await fetch(tableUrl, {
            headers: getHeaders()
          });

          if (!response.ok) break;

          const data = await response.json();
          allRecords = allRecords.concat(data.records);
          offset = data.offset;

        } while (offset);
        // Check if email and password match
        for (const record of allRecords) {
          const recordEmail = record.fields.Email || record.fields.email;
          const recordPassword = record.fields.Password || record.fields.password;
          const recordName = record.fields.Name || record.fields.name || record.fields['Student Name'] || record.fields['Mentor Name'];

          if (recordEmail && recordEmail.toLowerCase() === email.toLowerCase()) {
            // Check password match
            if (recordPassword && recordPassword === password) {
              userFound = true;
              userName = recordName || email.split('@')[0];

              // Determine role based on table name
              if (tableName === 'Students') {
                userRole = 'Student';
              } else if (tableName === 'Parents') {
                userRole = 'Parent';
              } else if (tableName === 'Mentors') {
                userRole = 'Mentor';
              } else if (tableName === 'Writing Coaches') {
                userRole = 'Writing Coach';
              } else if (tableName === 'Team') {
                userRole = 'Team';
                // Read Employee Type (multi-select) for Team members
                const employeeTypeRaw = record.fields['Employee Type'];
                userEmployeeTypes = Array.isArray(employeeTypeRaw) ? employeeTypeRaw : [];
              }
              break;
            } else {
              // Email found but password doesn't match
              return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
              });
            }
          }
        }

        if (userFound) break;
      } catch (error) {
      }
    }

    if (userFound && userRole) {
      return res.json({
        success: true,
        email: email,
        name: userName,
        role: userRole,
        employeeTypes: userEmployeeTypes
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
});

// POST: Change user password
app.post('/api/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and new password are required' 
      });
    }
    // Search for user in all auth tables
    let userFound = false;
    let recordId = null;
    let tableName = null;
    
    for (const table of AUTH_TABLES) {
      try {
        let allRecords = [];
        let offset = null;
        
        // Fetch all records with pagination
        do {
          const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(table)}${offset ? `?offset=${offset}` : ''}`;
          
          const response = await fetch(tableUrl, {
            headers: getHeaders()
          });

          if (!response.ok) break;

          const data = await response.json();
          allRecords = allRecords.concat(data.records);
          offset = data.offset;
          
        } while (offset);
        // Find user by email
        for (const record of allRecords) {
          const recordEmail = record.fields.Email || record.fields.email;
          
          if (recordEmail && recordEmail.toLowerCase() === email.toLowerCase()) {
            userFound = true;
            recordId = record.id;
            tableName = table;
            break;
          }
        }
        
        if (userFound) break;
      } catch (error) {
      }
    }

    if (!userFound) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password in Airtable
    const updateUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          Password: newPassword
        }
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
    return res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to change password. Please try again.'
    });
  }
});

// ========================================
// BOOKING ENDPOINTS (MOVED FOR DEPLOYMENT)
// ========================================

// POST: Book a meeting slot
app.post('/api/book-meeting', async (req, res) => {
  try {
    const { 
      studentName, 
      studentEmail, 
      mentorName, 
      mentorEmail, 
      date, 
      startTime,  // Old format: time string with UTC info
      endTime,    // Old format: same as startTime
      utcStartDateTime,  // New format: ISO timestamp
      utcEndDateTime,    // New format: ISO timestamp
      programId,
      timezone,
      meetingType = 'M' // Default to 'M' (Mentor), can be 'WC' (Writing Coach)
    } = req.body;
    // Validate required fields
    if (!studentName || !studentEmail || !mentorEmail || !date || !programId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentName, studentEmail, mentorEmail, date, programId'
      });
    }
    
    // Validate that we have either old format (startTime) or new format (utcStartDateTime)
    if (!startTime && !utcStartDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing time information: either startTime or utcStartDateTime is required'
      });
    }

    // Check remaining sessions before proceeding (only for Mentor meetings, not Writing Coach)
    if (meetingType === 'M') {
      if (MEETINGS_BASE_ID && MEETINGS_MASTER_TABLE_ID) {
        try {
          // Get student's program info to determine session limit
          const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
          const masterFilter = `{Program ID}="${programId}"`;
          
          const masterResponse = await fetch(`${masterUrl}?filterByFormula=${encodeURIComponent(masterFilter)}`, {
            headers: getHeaders()
          });
          
          if (masterResponse.ok) {
            const masterData = await masterResponse.json();
            if (masterData.records && masterData.records.length > 0) {
              const studentRecord = masterData.records[0];
              const researchPackage = String(studentRecord.fields['Research Package'] || 'Standard').trim();
              const sessionLimit = researchPackage.toLowerCase() === 'premium' ? 8 : 5;
              
              // Count existing mentor meetings
              const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
              const meetingsFilter = `AND({Program ID}="${programId}", {Meeting Type}="M")`;

              try {
                const meetingsRecords = await fetchAllAirtableRecords(meetingsUrl, { filterByFormula: meetingsFilter });
                const existingCount = meetingsRecords.length;
                const remainingSessions = sessionLimit - existingCount;
                if (remainingSessions <= 0) {
                  return res.status(400).json({
                    success: false,
                    message: '🎉 Congratulations! Your research program is now complete. You have used all your available sessions. No more bookings are allowed.',
                    remainingSessions: 0,
                    programComplete: true
                  });
                }
                
                // Check video submission requirement
                const videoRequiredAfter = researchPackage.toLowerCase() === 'premium' ? 4 : 3;
                if (existingCount >= videoRequiredAfter) {
                  const videoSubmission = studentRecord.fields['Video Submission'];
                  const hasSubmittedVideo = videoSubmission && videoSubmission.length > 0;
                  if (!hasSubmittedVideo) {
                    return res.status(400).json({
                      success: false,
                      message: 'Please upload your testimonial video on the dashboard before booking your next mentor session.',
                      videoRequired: true
                    });
                  }
                }
              } catch (error) {}
            }
          }
        } catch (error) {
        }
      }
    } else {
    }
    
    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID) {
      // For testing - simulate success without actually creating meeting
      return res.json({
        success: true,
        message: 'Meeting booking simulated successfully (missing database config)',
        meetingId: 'TEST_' + Date.now(),
        bookingDetails: {
          studentName,
          mentorName,
          mentorEmail,
          date,
          startTime,
          endTime
        },
        warning: 'Environment variables missing: MEETINGS_BASE_ID, MEETINGS_MAIN_TABLE_ID'
      });
    }
    // First, get the next meeting number by checking existing meetings for this program and type
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const existingMeetingsFilter = `AND({Program ID}="${programId}", {Meeting Type}="${meetingType}")`;

    let nextMeetingNumber = 1; // Default to 1 if no existing meetings
    try {
      const existingRecords = await fetchAllAirtableRecords(meetingsUrl, { filterByFormula: existingMeetingsFilter });
      nextMeetingNumber = existingRecords.length + 1;
    } catch (e) {}
    
    // Convert user timezone times to IST for storage
    const convertToIST = (timeString, userDate, sourceTimezone) => {
      try {
        if (!timeString) return null;
        // Extract UTC times from format: "7:00 PM - 8:00 PM GST (UTC: 15:00 - 16:00)"
        const utcMatch = timeString.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i);
        
        if (utcMatch) {
          const [, utcStartHour, utcStartMin, utcEndHour, utcEndMin] = utcMatch;
          // Create UTC dates and convert to IST
          const startDateStr = `${userDate}T${String(utcStartHour).padStart(2, '0')}:${String(utcStartMin).padStart(2, '0')}:00Z`;
          const endDateStr = `${userDate}T${String(utcEndHour).padStart(2, '0')}:${String(utcEndMin).padStart(2, '0')}:00Z`;
          const startUTC = new Date(startDateStr);
          const endUTC = new Date(endDateStr);
          
          
          const options = { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'Asia/Kolkata'
          };
          
          const startIST = startUTC.toLocaleTimeString('en-US', options);
          const endIST = endUTC.toLocaleTimeString('en-US', options);
          return { start: startIST, end: endIST };
        }
        
        // Fallback: if no UTC info, return original
        return { start: timeString, end: null };
        
      } catch (error) {
        return { start: timeString, end: null };
      }
    };
    
    // Store UTC timestamps as single source of truth
    let utcStart, utcEnd;
    
    if (utcStartDateTime && utcEndDateTime) {
      // New format: Use UTC timestamps directly
      utcStart = utcStartDateTime;
      utcEnd = utcEndDateTime;
      
      console.log('[BOOKING] Storing UTC timestamps:', {
        utcStartDateTime: utcStart,
        utcEndDateTime: utcEnd
      });
    } else {
      // Old format: Convert from time string with UTC info to UTC timestamp
      // Extract UTC times from format like "7:00 PM - 8:00 PM GST (UTC: 15:00 - 16:00)"
      const utcMatch = startTime.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i);
      
      if (utcMatch) {
        const [, utcStartHour, utcStartMin, utcEndHour, utcEndMin] = utcMatch;
        utcStart = `${date}T${String(utcStartHour).padStart(2, '0')}:${String(utcStartMin).padStart(2, '0')}:00Z`;
        utcEnd = `${date}T${String(utcEndHour).padStart(2, '0')}:${String(utcEndMin).padStart(2, '0')}:00Z`;
      } else {
        // Fallback: if no UTC info, assume IST and convert to UTC
        const convertedTimes = convertToIST(startTime, date, timezone);
        throw new Error('Cannot convert old format without UTC info');
      }
      
      console.log('[BOOKING] Converted old format to UTC:', {
        utcStartDateTime: utcStart,
        utcEndDateTime: utcEnd
      });
    }
    
    // Create meeting record with UTC timestamps only
    const meetingData = {
      fields: {
        'Program ID': programId,
        'Host Email': mentorEmail,
        'Student Email': studentEmail,
        'Meeting Number': nextMeetingNumber,
        'UTC Start DateTime': utcStart,
        'UTC End DateTime': utcEnd,
        'Meeting Type': meetingType
      }
    };
    
    const createResponse = await fetch(meetingsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(meetingData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[BOOKING ERROR] Failed to create meeting:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        errorText: errorText,
        meetingData: meetingData
      });
      throw new Error(`Failed to create meeting: ${createResponse.status} - ${errorText}`);
    }
    
    const createdMeeting = await createResponse.json();
    console.log('[BOOKING] Meeting created, about to remove slot');
    
    // Convert UTC to user timezone for display in confirmation
    let displayStartTime = 'UTC';
    let displayEndTime = 'UTC';
    if (timezone) {
      const startConverted = convertUTCtoUserTimezone(utcStart, timezone);
      const endConverted = convertUTCtoUserTimezone(utcEnd, timezone);
      displayStartTime = `${startConverted.date} ${startConverted.time}`;
      displayEndTime = `${endConverted.date} ${endConverted.time}`;
    }
    
    // Now remove the booked slot from mentor's availability
    try {
      console.log('[BOOKING] Calling removeBookedSlot...');
      // Pass UTC timestamps for new format slot removal
      await removeBookedSlot(mentorEmail, utcStart, utcEnd);
      console.log('[BOOKING] Slot removal completed');
    } catch (slotError) {
      console.error('[BOOKING] Error removing slot:', slotError.message);
      // Don't fail the booking if slot removal fails
    }
    console.log('[BOOKING] Sending response to client');
    res.json({
      success: true,
      message: `Meeting booked successfully! Meeting #${nextMeetingNumber} has been scheduled.`,
      meetingId: createdMeeting.id,
      meetingNumber: nextMeetingNumber,
      bookingDetails: {
        studentName,
        mentorName,
        mentorEmail,
        startTime: displayStartTime,
        endTime: displayEndTime,
        timezone: timezone || 'UTC'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to book meeting. Please try again.',
      error: error.message
    });
  }
});

// Test endpoint for booking functionality
app.get('/api/test-booking', (req, res) => {
  res.json({
    success: true,
    message: 'Booking endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// GET: Get remaining mentor sessions for a student
app.post('/api/get-remaining-sessions', async (req, res) => {
  try {
    const { programId } = req.body;
    
    if (!programId) {
      return res.status(400).json({
        success: false,
        message: 'Program ID is required'
      });
    }
    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID || !MEETINGS_MASTER_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials'
      });
    }
    
    // Step 1: Get student details from MEETINGS_MASTER_TABLE_ID to find Research Package
    const meetingsMasterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    const meetingsMasterFilter = `{Program ID}="${programId}"`;
    
    const meetingsMasterResponse = await fetch(`${meetingsMasterUrl}?filterByFormula=${encodeURIComponent(meetingsMasterFilter)}`, {
      headers: getHeaders()
    });
    
    if (!meetingsMasterResponse.ok) {
      throw new Error(`Failed to fetch student details: ${meetingsMasterResponse.status}`);
    }
    
    const meetingsMasterData = await meetingsMasterResponse.json();
    
    if (!meetingsMasterData.records || meetingsMasterData.records.length === 0) {
      return res.json({
        success: false,
        message: 'Student program not found'
      });
    }
    
    const studentRecord = meetingsMasterData.records[0];
    const researchPackageField = studentRecord.fields['Research Package'];
    const researchPackage = researchPackageField ? String(researchPackageField).trim() : 'Standard';
    
    // Determine total sessions based on package
    let totalSessions;
    if (researchPackage.toLowerCase() === 'premium') {
      totalSessions = 8;
    } else {
      totalSessions = 5; // Standard or any other package
    }
    // Step 2: Count completed sessions from MEETINGS_MAIN_TABLE_ID
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const meetingsFilter = `AND({Program ID}="${programId}", {Meeting Type}="M")`;

    const meetingsRecords = await fetchAllAirtableRecords(meetingsUrl, { filterByFormula: meetingsFilter });
    const completedSessions = meetingsRecords.length;
    // Calculate remaining sessions
    const remainingSessions = Math.max(0, totalSessions - completedSessions);
    // Check video submission status
    const videoSubmission = studentRecord.fields['Video Submission'];
    const hasSubmittedVideo = videoSubmission && videoSubmission.length > 0;
    // Determine if video is required (Premium: after 4 sessions, Standard: after 3 sessions)
    const videoRequiredAfter = researchPackage.toLowerCase() === 'premium' ? 4 : 3;
    const isVideoRequired = completedSessions >= videoRequiredAfter && !hasSubmittedVideo;
    
    return res.json({
      success: true,
      programId: programId,
      researchPackage: researchPackage,
      totalSessions: totalSessions,
      completedSessions: completedSessions,
      remainingSessions: remainingSessions,
      videoSubmission: {
        hasSubmitted: hasSubmittedVideo,
        isRequired: isVideoRequired,
        requiredAfter: videoRequiredAfter
      },
      studentData: {
        name: studentRecord.fields['Name'] || 'Student',
        email: studentRecord.fields['Email'] || ''
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get remaining sessions',
      error: error.message
    });
  }
});

// GET: Fetch all meetings for a student (categorized by meeting type)
app.post('/api/get-all-sessions', async (req, res) => {
  try {
    const { programId, userTimezone } = req.body;
    
    if (!programId) {
      return res.status(400).json({
        success: false,
        message: 'Program ID is required'
      });
    }
    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials'
      });
    }
    
    // Fetch all meetings for this program
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const filterFormula = `{Program ID}="${programId}"`;

    const meetingsRecords = await fetchAllAirtableRecords(meetingsUrl, { filterByFormula: filterFormula });
    // Format and categorize meetings by type
    const meetings = meetingsRecords.map(record => {
      const fields = record.fields;
      const meetingTypeCode = fields['Meeting Type'] || 'M';
      
      // Map meeting type code to label
      let meetingTypeLabel = 'Mentor';
      if (meetingTypeCode === 'WC') {
        meetingTypeLabel = 'Writing Coach';
      } else if (meetingTypeCode === 'R') {
        meetingTypeLabel = 'Program Manager';
      }

      // Read UTC timestamps
      const utcStartDateTime = fields['UTC Start DateTime'] || null;
      const utcEndDateTime = fields['UTC End DateTime'] || null;

      // Convert UTC timestamps to user timezone
      let date = '-';
      let startTime = '-';
      let endTime = '-';

      if (utcStartDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcStartDateTime, userTimezone);
        date = converted.date;
        startTime = converted.time;
      } else if (utcStartDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcStartDateTime, 'Asia/Kolkata');
        date = converted.date;
        startTime = converted.time;
      }

      if (utcEndDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcEndDateTime, userTimezone);
        endTime = converted.time;
      } else if (utcEndDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcEndDateTime, 'Asia/Kolkata');
        endTime = converted.time;
      }
      
      return {
        id: record.id,
        meetingNumber: fields['Meeting Number'] || '-',
        date: date,
        startTime: startTime,
        endTime: endTime,
        meetingType: meetingTypeCode,
        meetingTypeLabel: meetingTypeLabel,
        status: fields['Meeting Status'] || '',
        hostEmail: fields['Host Email'] || '-',
        studentEmail: fields['Student Email'] || '-'
      };
    }) || [];
    return res.json({
      success: true,
      programId: programId,
      totalMeetings: meetings.length,
      meetings: meetings,
      summary: {
        mentor: meetings.filter(m => m.meetingType === 'M').length,
        writingCoach: meetings.filter(m => m.meetingType === 'WC').length,
        programManager: meetings.filter(m => m.meetingType === 'R').length
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
});

// GET: Fetch all meetings for a host (mentor/writing coach/program manager)
app.post('/api/get-host-meetings', async (req, res) => {
  try {
    const { email, userTimezone } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials'
      });
    }
    
    // Fetch all meetings where Host Email matches (paginated)
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const filterFormula = `LOWER({Host Email})=LOWER("${email}")`;

    const allRecords = [];
    let offset = null;
    do {
      const params = new URLSearchParams({ filterByFormula: filterFormula });
      if (offset) params.set('offset', offset);
      const meetingsResponse = await fetch(`${meetingsUrl}?${params}`, { headers: getHeaders() });
      if (!meetingsResponse.ok) throw new Error(`Failed to fetch meetings: ${meetingsResponse.status}`);
      const page = await meetingsResponse.json();
      allRecords.push(...(page.records || []));
      offset = page.offset || null;
    } while (offset);

    const meetingsData = { records: allRecords };

    // Collect unique program IDs to fetch master table data
    const programIds = [...new Set(
      (meetingsData.records || []).map(r => r.fields['Program ID']).filter(Boolean)
    )];

    // Fetch master table records for all program IDs in one query
    const masterMap = {};
    if (programIds.length > 0) {
      const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
      const masterFormula = programIds.length === 1
        ? `{Program ID}="${programIds[0]}"`
        : `OR(${programIds.map(id => `{Program ID}="${id}"`).join(',')})`;
      const masterFields = ['Program ID', 'Name', 'Mentor Email', 'WC Email', 'Program Manager Email', 'Mentor Name', 'WC Name', 'Program Manager Name'];
      const masterFieldsParams = Object.fromEntries(masterFields.map((f, i) => [`fields[${i}]`, f]));
      try {
        const masterRecords = await fetchAllAirtableRecords(masterUrl, { filterByFormula: masterFormula, ...masterFieldsParams });
        masterRecords.forEach(record => {
          const pid = record.fields['Program ID'];
          if (pid) masterMap[pid] = record.fields;
        });
      } catch (e) {}
    }

    // Format meetings
    const meetings = meetingsData.records?.map(record => {
      const fields = record.fields;
      const programId = fields['Program ID'] || '-';
      const master = masterMap[programId] || {};

      // Read UTC timestamps
      const utcStartDateTime = fields['UTC Start DateTime'] || null;
      const utcEndDateTime = fields['UTC End DateTime'] || null;

      // Convert UTC timestamps to user timezone
      let date = '-';
      let startTime = '-';
      let endTime = '-';

      if (utcStartDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcStartDateTime, userTimezone);
        date = converted.date;
        startTime = converted.time;
      } else if (utcStartDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcStartDateTime, 'Asia/Kolkata');
        date = converted.date;
        startTime = converted.time;
      }

      if (utcEndDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcEndDateTime, userTimezone);
        endTime = converted.time;
      } else if (utcEndDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcEndDateTime, 'Asia/Kolkata');
        endTime = converted.time;
      }

      return {
        id: record.id,
        programId,
        meetingNumber: fields['Meeting Number'] || '-',
        date: date,
        startTime: startTime,
        endTime: endTime,
        status: fields['Meeting Status'] || '',
        studentEmail: fields['Student Email'] || '-',
        meetingType: fields['Meeting Type'] || '-',
        utcStartDateTime: utcStartDateTime,
        utcEndDateTime: utcEndDateTime,
        // Master table enrichment
        studentName: master['Name'] || '',
        mentorEmail: master['Mentor Email'] || '',
        mentorName: master['Mentor Name'] || '',
        wcEmail: master['WC Email'] || '',
        wcName: master['WC Name'] || '',
        pmEmail: master['Program Manager Email'] || '',
        pmName: master['Program Manager Name'] || '',
      };
    }) || [];

    // Group by Program ID and sort by date
    const groupedByProgram = {};
    meetings.forEach(meeting => {
      const programId = meeting.programId;
      if (!groupedByProgram[programId]) {
        groupedByProgram[programId] = [];
      }
      groupedByProgram[programId].push(meeting);
    });

    // Sort meetings within each program by date
    Object.keys(groupedByProgram).forEach(programId => {
      groupedByProgram[programId].sort((a, b) => {
        if (a.date === '-' || !a.date) return 1;
        if (b.date === '-' || !b.date) return 1;
        return new Date(a.date) - new Date(b.date);
      });
    });

    return res.json({
      success: true,
      totalMeetings: meetings.length,
      programCount: Object.keys(groupedByProgram).length,
      meetingsByProgram: groupedByProgram
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch host meetings',
      error: error.message
    });
  }
});

// POST: Fetch all students mapped to a mentor or writing coach
app.post('/api/get-my-students', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    if (!MEETINGS_BASE_ID || !MEETINGS_MASTER_TABLE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - missing database credentials.' });
    }

    // Determine which column to filter on based on role
    const emailColumn = role === 'Writing Coach' ? 'WC Email'
      : role === 'Team' ? 'Program Manager Email'
      : 'Mentor Email';
    const filterFormula = `LOWER({${emailColumn}})=LOWER("${email.trim()}")`;

    const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    let allRecords = [];
    let offset = null;

    do {
      const url = `${masterUrl}?filterByFormula=${encodeURIComponent(filterFormula)}&fields[]=Program ID&fields[]=Name&fields[]=Active Student&fields[]=Drive Link&fields[]=Program Manager Name&fields[]=Mentor Name&fields[]=WC Name${offset ? `&offset=${offset}` : ''}`;
      const response = await fetch(url, { headers: getHeaders() });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    const students = allRecords.map(record => {
      const activeRaw = record.fields['Active Student'];
      const isActive = activeRaw === 'Yes' || activeRaw === true;
      return {
        programId: record.fields['Program ID'] || '-',
        name: record.fields['Name'] || '-',
        isActive,
        driveLink: record.fields['Drive Link'] || null,
        programManagerName: record.fields['Program Manager Name'] || '-',
        mentorName: record.fields['Mentor Name'] || '-',
        wcName: record.fields['WC Name'] || '-',
      };
    });

    // Sort: active students first, then alphabetically by name
    students.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return res.json({ success: true, students, total: students.length });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch students.', error: error.message });
  }
});

// POST: Reschedule a meeting
app.post('/api/reschedule-meeting', async (req, res) => {
  try {
    const { meetingId, newDate, utcStartDateTime: incomingUtcStart, timezone } = req.body;

    if (!meetingId || !newDate || !incomingUtcStart) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: meetingId, newDate, utcStartDateTime',
        received: { meetingId, newDate, utcStartDateTime: incomingUtcStart, timezone }
      });
    }

    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials'
      });
    }

    const startDateTime = new Date(incomingUtcStart);

    // Validate the date is valid
    if (isNaN(startDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid utcStartDateTime provided',
        received: { incomingUtcStart }
      });
    }

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

    const utcStartDateTime = startDateTime.toISOString();
    const utcEndDateTime = endDateTime.toISOString();

    console.log('[RESCHEDULE] UTC timestamps:', {
      input: { newDate, utcStartDateTime: incomingUtcStart, timezone },
      output: { utcStartDateTime, utcEndDateTime }
    });

    // Update meeting record with UTC timestamps
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}/${meetingId}`;
    
    const updateData = {
      fields: {
        'UTC Start DateTime': utcStartDateTime,
        'UTC End DateTime': utcEndDateTime
      }
    };

    const updateResponse = await fetch(meetingsUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update meeting: ${updateResponse.status}`);
    }

    const updatedMeeting = await updateResponse.json();

    return res.json({
      success: true,
      message: 'Meeting rescheduled successfully',
      meeting: updatedMeeting
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reschedule meeting',
      error: error.message
    });
  }
});

// Helper function to remove booked slot from mentor availability
async function removeBookedSlot(mentorEmail, utcStartDateTime, utcEndDateTime) {
  try {
    console.log('[removeBookedSlot] Starting...', { mentorEmail, utcStartDateTime, utcEndDateTime });
    
    // Get mentor's availability records
    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    const filterFormula = `LOWER({Email})=LOWER("${mentorEmail}")`;

    const records = await fetchAllAirtableRecords(timingsUrl, { filterByFormula: filterFormula });
    console.log('[removeBookedSlot] Found records:', records.length);

    if (records.length === 0) {
      console.log('[removeBookedSlot] No availability records found for mentor');
      return;
    }

    const data = { records };
    
    // Extract date and time from UTC timestamp for matching
    const utcDate = new Date(utcStartDateTime);
    const bookedDate = utcStartDateTime.split('T')[0]; // "2026-02-07"
    const bookedHour = utcDate.getUTCHours();
    const bookedMinute = utcDate.getUTCMinutes();
    
    console.log('[removeBookedSlot] Looking for slot:', { bookedDate, bookedHour, bookedMinute });
    
    // Find the record containing this date
    for (const record of data.records) {
      const weekString = record.fields['Week'];
      const utcSlotsJSON = record.fields['UTC Slots'];
      
      console.log('[removeBookedSlot] Checking record:', { week: weekString, hasUTCSlots: !!utcSlotsJSON });
      
      if (!weekString) continue;
      
      // Check if this record's week contains the booked date
      if (weekString.includes(' to ')) {
        const [weekStart, weekEnd] = weekString.split(' to ');
        
        console.log('[removeBookedSlot] Week range:', { weekStart, weekEnd, bookedDate });
        
        if (bookedDate >= weekStart && bookedDate <= weekEnd) {
          if (!utcSlotsJSON) break;

          try {
            const utcSlots = JSON.parse(utcSlotsJSON);
            const filteredSlots = utcSlots.filter(slot =>
              !(slot.date === bookedDate && slot.utcHour === bookedHour && slot.utcMinute === bookedMinute)
            );

            if (filteredSlots.length === utcSlots.length) {
              console.log('[removeBookedSlot] Slot not found in UTC Slots');
              break;
            }

            if (filteredSlots.length === 0) {
              // No slots left — delete the whole record
              const deleteResponse = await fetch(`${timingsUrl}/${record.id}`, {
                method: 'DELETE',
                headers: getHeaders()
              });
              if (deleteResponse.ok) {
                console.log('[removeBookedSlot] Record deleted (no slots remaining)');
              } else {
                console.error('[removeBookedSlot] Delete failed:', await deleteResponse.text());
              }
            } else {
              // Update UTC Slots with remaining slots
              const updateResponse = await fetch(`${timingsUrl}/${record.id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ fields: { 'UTC Slots': JSON.stringify(filteredSlots) } })
              });
              if (updateResponse.ok) {
                console.log('[removeBookedSlot] UTC Slots updated, removed 1 slot');
              } else {
                console.error('[removeBookedSlot] Update failed:', await updateResponse.text());
              }
            }
          } catch (parseError) {
            console.error('[removeBookedSlot] Failed to parse UTC Slots:', parseError);
          }

          break;
        }
      }
    }
    
  } catch (error) {
    console.error('[removeBookedSlot] Error:', error.message);
    // Don't throw - meeting is already created, this is cleanup
  }
}


// ========================================
// STUDENT ENDPOINTS
// ========================================

// GET: Fetch all students from Contact base
app.get('/api/students', async (req, res) => {
  try {
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students`;
    
    let allRecords = [];
    let offset = null;
    
    // Fetch all records with pagination
    do {
      const url = `${studentsUrl}${offset ? `?offset=${offset}` : ''}`;
      
      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
      
    } while (offset);
    res.json(allRecords);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch students', 
      message: error.message 
    });
  }
});

// POST: Create new student (if needed in future)
app.post('/api/students', async (req, res) => {
  try {
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students`;
    
    const response = await fetch(studentsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: req.body
      })
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create student', 
      message: error.message 
    });
  }
});

// PUT: Update student (if needed in future)
app.put('/api/students/:id', async (req, res) => {
  try {
    const recordId = req.params.id;
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students/${recordId}`;
    
    const response = await fetch(studentsUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: req.body
      })
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update student', 
      message: error.message 
    });
  }
});

// DELETE: Delete student (if needed in future)
app.delete('/api/students/:id', async (req, res) => {
  try {
    const recordId = req.params.id;
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students/${recordId}`;
    
    const response = await fetch(studentsUrl, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete student', 
      message: error.message 
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Helper function to get mentor/coach rate from Contact base
async function getMentorRate(email) {
  try {
    // Check Mentors table
    const mentorsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Mentors`;
    const mentorsFilter = `LOWER({Email})=LOWER('${email}')`;
    const mentorsResponse = await fetch(`${mentorsUrl}?filterByFormula=${encodeURIComponent(mentorsFilter)}`, {
      headers: getHeaders()
    });
    
    if (mentorsResponse.ok) {
      const mentorsData = await mentorsResponse.json();
      if (mentorsData.records.length > 0) {
        const rate = mentorsData.records[0].fields['Rate'];
        return rate || null;
      }
    }
    
    // Check Writing Coaches table
    const coachesUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Writing Coaches`;
    const coachesFilter = `LOWER({Email})=LOWER('${email}')`;
    const coachesResponse = await fetch(`${coachesUrl}?filterByFormula=${encodeURIComponent(coachesFilter)}`, {
      headers: getHeaders()
    });
    
    if (coachesResponse.ok) {
      const coachesData = await coachesResponse.json();
      if (coachesData.records.length > 0) {
        const rate = coachesData.records[0].fields['Rate'];
        return rate || null;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// GET: Fetch pending classes for invoicing
app.get('/api/pending-classes/:email', async (req, res) => {
  try {
    const hostEmail = req.params.email;
    
    if (!hostEmail) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Email parameter is required' 
      });
    }
    // Get mentor/coach rate first
    const rateString = await getMentorRate(hostEmail);
    
    // Calculate date range: (end of last month - 3) to (end of current month - 4)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get last day of previous month
    const endOfLastMonth = new Date(currentYear, currentMonth, 0); // Day 0 = last day of previous month
    // Start date: end of last month - 3 days
    const startDate = new Date(endOfLastMonth);
    startDate.setDate(endOfLastMonth.getDate() - 3);
    
    // Get last day of current month
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0); // Day 0 = last day of current month
    // End date: end of current month - 4 days
    const endDate = new Date(endOfCurrentMonth);
    endDate.setDate(endOfCurrentMonth.getDate() - 4);
    
    // Format dates as YYYY-MM-DD for Airtable
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Build filter formula for Airtable
    // Filter: Host Email = hostEmail 
    //     AND Payment Status = "Pending" 
    //     AND UTC Start DateTime between range (including 27th of both months)
    //     AND Meeting Status = "Completed" OR "Missed"
    const filterFormula = `AND(
      LOWER({Host Email})=LOWER('${hostEmail}'),
      {Payment Status}='Pending',
      IS_AFTER({UTC Start DateTime}, DATEADD('${startDateStr}', -1, 'days')),
      IS_BEFORE({UTC Start DateTime}, DATEADD('${endDateStr}', 1, 'days')),
      OR({Meeting Status}='Completed', {Meeting Status}='Missed')
    )`;
    let allRecords = [];
    let offset = null;
    
    // Fetch all records with pagination
    do {
      const url = `${classesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`;
      
      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
      
    } while (offset);
    const data = { records: allRecords };
    
    if (data.records && data.records.length > 0) {
    }
    
    // Parse rate (e.g., "50 GBP", "100 USD", "3000 INR")
    let rateAmount = 0;
    let currency = 'USD';
    
    if (rateString) {
      const rateMatch = rateString.match(/^([\d.]+)\s*([A-Z]{3})$/i);
      if (rateMatch) {
        rateAmount = parseFloat(rateMatch[1]);
        currency = rateMatch[2].toUpperCase();
      }
    }
    
    // Group records by Program ID and calculate totals
    const groupedByProgram = {};
    
    data.records.forEach(record => {
      const fields = record.fields;
      const programId = fields['Program ID'] || 'No Program';
      const meetingStatus = fields['Meeting Status'] || '';
      const studentName = fields['Student Name'] || '';
      const studentId = fields['Student ID'] || '';
      
      // Read UTC timestamps and convert to IST for display
      const utcStartDateTime = fields['UTC Start DateTime'] || null;
      const utcEndDateTime = fields['UTC End DateTime'] || null;
      
      let startDateTime = '';
      let endDateTime = '';
      
      if (utcStartDateTime) {
        const converted = convertUTCtoUserTimezone(utcStartDateTime, 'Asia/Kolkata');
        startDateTime = converted.fullDateTime; // Date + Time combined
      }
      
      if (utcEndDateTime) {
        const converted = convertUTCtoUserTimezone(utcEndDateTime, 'Asia/Kolkata');
        endDateTime = converted.fullDateTime; // Date + Time combined
      }
      
      if (!groupedByProgram[programId]) {
        groupedByProgram[programId] = {
          classes: [],
          completedCount: 0,
          missedCount: 0,
          totalAmount: 0,
          studentName: studentName,
          studentId: studentId
        };
      }
      
      // Update student info if missing (in case first record didn't have it)
      if (!groupedByProgram[programId].studentName && studentName) {
        groupedByProgram[programId].studentName = studentName;
      }
      if (!groupedByProgram[programId].studentId && studentId) {
        groupedByProgram[programId].studentId = studentId;
      }
      
      // Count completed and missed sessions
      if (meetingStatus === 'Completed') {
        groupedByProgram[programId].completedCount++;
      } else if (meetingStatus === 'Missed') {
        groupedByProgram[programId].missedCount++;
      }
      
      groupedByProgram[programId].classes.push({
        id: record.id,
        meetingNumber: fields['Meeting Number'] || '',
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        programId: programId,
        meetingStatus: meetingStatus,
        studentName: studentName,
        studentId: studentId,
        issues: fields['Issues'] || '',
        mentorConfirmation: fields['Mentor Confirmation'] || ''
      });
    });
    
    // Fetch student names from INVOICING_BASE_ID/Students table
    const allProgramIds = Object.keys(groupedByProgram).filter(id => id !== 'No Program');
    const studentNameMap = {};
    if (allProgramIds.length > 0) {
      try {
        const studentsUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Students`;
        const orClauses = allProgramIds.map(id => `{Student ID}="${id}"`).join(',');
        const studentsFilter = allProgramIds.length === 1
          ? `{Student ID}="${allProgramIds[0]}"`
          : `OR(${orClauses})`;
        let sOffset = null;
        do {
          const sUrl = `${studentsUrl}?filterByFormula=${encodeURIComponent(studentsFilter)}&fields[]=Name&fields[]=Student ID${sOffset ? `&offset=${sOffset}` : ''}`;
          const sResponse = await fetch(sUrl, { headers: getHeaders() });
          if (sResponse.ok) {
            const sData = await sResponse.json();
            sData.records.forEach(r => {
              const sid = r.fields['Student ID'];
              const sname = r.fields['Name'];
              if (sid && sname) studentNameMap[sid] = sname;
            });
            sOffset = sData.offset;
          } else {
            sOffset = null;
          }
        } while (sOffset);
      } catch (e) {
        // Non-fatal: student names just won't be populated
      }
    }

    // Patch student names from lookup map
    Object.keys(groupedByProgram).forEach(programId => {
      if (studentNameMap[programId]) {
        groupedByProgram[programId].studentName = studentNameMap[programId];
        groupedByProgram[programId].classes.forEach(cls => {
          cls.studentName = studentNameMap[programId];
        });
      }
    });

    // Calculate total amount for each program
    Object.keys(groupedByProgram).forEach(programId => {
      const program = groupedByProgram[programId];
      
      // Completed sessions: full rate
      const completedAmount = program.completedCount * rateAmount;
      
      // Missed sessions: half rate (0.5x)
      const missedAmount = program.missedCount * rateAmount * 0.5;
      
      // Total amount
      program.totalAmount = completedAmount + missedAmount;
      program.currency = currency;
      program.formattedAmount = `${program.totalAmount.toFixed(2)} ${currency}`;
      
      // Check if any class has "Issue Raised" status
      program.hasIssues = program.classes.some(cls => cls.mentorConfirmation === 'Issue Raised');
      
      // Sort classes by start date time (ascending - earliest first)
      program.classes.sort((a, b) => {
        const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
        const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
        return dateA - dateB;
      });
    });
    
    
    res.json({ 
      success: true,
      totalClasses: data.records.length,
      programCount: Object.keys(groupedByProgram).length,
      groupedData: groupedByProgram,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      },
      rateInfo: {
        rate: rateAmount,
        currency: currency,
        rateString: rateString
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch pending classes', 
      message: error.message 
    });
  }
});

// POST: Validate all programs at once (creates one consolidated invoice)
app.post('/api/validate-all-programs', async (req, res) => {
  try {
    const { programs, mentorEmail, mentorName } = req.body;
    
    if (!programs || !Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Programs array is required' 
      });
    }

    if (!mentorEmail || !mentorName) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Mentor email and name are required' 
      });
    }

    
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Track totals across all programs
    let totalValidated = 0;
    let grandTotalCompleted = 0;
    let grandTotalMissed = 0;
    let grandTotalAmount = 0;
    let currency = 'USD';
    
    // Update all classes across all programs
    for (const program of programs) {
      const { programId, classIds, completedCount, missedCount, totalAmount } = program;
      currency = program.currency || currency; // Use first currency found
      // Update each class
      const updatePromises = classIds.map(async (recordId) => {
        try {
          const response = await fetch(`${classesUrl}/${recordId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
              fields: {
                'Mentor Confirmation': 'Class Confirmed',
                'Payment Status': 'Processed'
              }
            })
          });
          
          if (response.ok) {
            totalValidated++;
          } else {
          }
          
          return response.ok;
        } catch (error) {
          return false;
        }
      });
      
      await Promise.all(updatePromises);
      
      // Accumulate totals
      grandTotalCompleted += completedCount || 0;
      grandTotalMissed += missedCount || 0;
      grandTotalAmount += totalAmount || 0;
    }
    // Calculate total classes (completed + 0.5 × missed)
    const totalClasses = grandTotalCompleted + (grandTotalMissed * 0.5);
    
    // Get current month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    // Create ONE consolidated invoice
    try {
      const invoicesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Invoices`;
      
      const invoiceResponse = await fetch(invoicesUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fields: {
            'Name': mentorName,
            'Email': mentorEmail,
            'Month': currentMonth,
            'Classes This Month': totalClasses,
            'Total Amount': `${grandTotalAmount} ${currency}`
          }
        })
      });

      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json();
        res.json({ 
          success: true,
          message: `Successfully validated ${totalValidated} class(es) across ${programs.length} program(s) and created consolidated invoice.`,
          totalValidated: totalValidated,
          programCount: programs.length,
          invoiceCreated: true,
          invoiceId: invoiceData.id,
          totalAmount: grandTotalAmount.toFixed(2),
          currency: currency,
          invoiceDetails: {
            name: mentorName,
            email: mentorEmail,
            month: currentMonth,
            classesThisMonth: totalClasses,
            totalAmount: `${grandTotalAmount} ${currency}`
          }
        });
      } else {
        const errorText = await invoiceResponse.text();
        res.json({ 
          success: true,
          message: `Validated ${totalValidated} class(es) but failed to create invoice.`,
          totalValidated: totalValidated,
          programCount: programs.length,
          invoiceCreated: false,
          invoiceError: errorText
        });
      }
    } catch (invoiceError) {
      res.json({ 
        success: true,
        message: `Validated ${totalValidated} class(es) but encountered error creating invoice.`,
        totalValidated: totalValidated,
        programCount: programs.length,
        invoiceCreated: false,
        invoiceError: invoiceError.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to validate programs', 
      message: error.message 
    });
  }
});

// POST: Validate classes
app.post('/api/validate-classes', async (req, res) => {
  try {
    const { programId, classIds, mentorEmail, mentorName, completedCount, missedCount, totalAmount, currency } = req.body;
    
    if (!programId || !classIds || !Array.isArray(classIds)) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Program ID and class IDs array are required' 
      });
    }

    if (!mentorEmail || !mentorName) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Mentor email and name are required' 
      });
    }
    
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Update each class record with "Class Confirmed" and Payment Status "Processed"
    let updatedCount = 0;
    const updatePromises = classIds.map(async (recordId) => {
      try {
        const response = await fetch(`${classesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            fields: {
              'Mentor Confirmation': 'Class Confirmed',
              'Payment Status': 'Processed'
            }
          })
        });
        
        if (response.ok) {
          updatedCount++;
        } else {
        }
        
        return response.ok;
      } catch (error) {
        return false;
      }
    });
    
    await Promise.all(updatePromises);
    // Calculate classes this month (completed + 0.5 × missed)
    const classesThisMonth = completedCount + (missedCount * 0.5);
    
    // Get current month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    // Create invoice record in Invoices table
    try {
      const invoicesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Invoices`;
      
      const invoiceResponse = await fetch(invoicesUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fields: {
            'Name': mentorName,
            'Email': mentorEmail,
            'Month': currentMonth,
            'Classes This Month': classesThisMonth,
            'Total Amount': `${totalAmount} ${currency}`
          }
        })
      });

      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json();
        res.json({ 
          success: true,
          message: `Successfully validated ${updatedCount} class(es) and created invoice for ${mentorName}.`,
          programId: programId,
          validatedCount: updatedCount,
          invoiceCreated: true,
          invoiceId: invoiceData.id,
          invoiceDetails: {
            name: mentorName,
            email: mentorEmail,
            month: currentMonth,
            classesThisMonth: classesThisMonth,
            totalAmount: `${totalAmount} ${currency}`
          }
        });
      } else {
        const errorText = await invoiceResponse.text();
        // Still return success for class validation even if invoice fails
        res.json({ 
          success: true,
          message: `Validated ${updatedCount} class(es) but failed to create invoice.`,
          programId: programId,
          validatedCount: updatedCount,
          invoiceCreated: false,
          invoiceError: errorText
        });
      }
    } catch (invoiceError) {
      // Still return success for class validation
      res.json({ 
        success: true,
        message: `Validated ${updatedCount} class(es) but encountered error creating invoice.`,
        programId: programId,
        validatedCount: updatedCount,
        invoiceCreated: false,
        invoiceError: invoiceError.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to validate classes', 
      message: error.message 
    });
  }
});

// POST: Raise discrepancy
app.post('/api/raise-discrepancy', async (req, res) => {
  try {
    const { programId, classIds, issues } = req.body;
    
    if (!programId || !classIds || !Array.isArray(classIds) || !issues) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Program ID, class IDs array, and issues are required' 
      });
    }
    
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Update each class record with the issue and mentor confirmation
    let updatedCount = 0;
    const updatePromises = classIds.map(async (recordId) => {
      try {
        const response = await fetch(`${classesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            fields: {
              'Issues': issues,
              'Mentor Confirmation': 'Issue Raised'
            }
          })
        });
        
        if (response.ok) {
          updatedCount++;
        } else {
        }
        
        return response.ok;
      } catch (error) {
        return false;
      }
    });
    
    await Promise.all(updatePromises);
    res.json({ 
      success: true,
      message: `Discrepancy has been recorded for Program ${programId}.`,
      programId: programId,
      updatedCount: updatedCount,
      totalClasses: classIds.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to raise discrepancy', 
      message: error.message 
    });
  }
});

// POST: Raise general discrepancy (save to Discrepancy table in Meetings base)
app.post('/api/raise-general-discrepancy', async (req, res) => {
  try {
    const { email, name, issue } = req.body;
    
    if (!email || !name || !issue) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Email, name, and issue are required' 
      });
    }
    
    const discrepancyUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/Discrepancy`;
    
    // Create a new record in the Discrepancy table
    const response = await fetch(discrepancyUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          'Email': email,
          'Name': name,
          'Issue': issue
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create discrepancy record');
    }
    
    const data = await response.json();
    
    res.json({ 
      success: true,
      message: 'Discrepancy has been submitted successfully.',
      recordId: data.id
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to raise general discrepancy', 
      message: error.message 
    });
  }
});

// GET: Fetch pending student reports grouped by counselor
app.get('/api/pending-reports', async (req, res) => {
  try {
    const reportsUrl = `https://api.airtable.com/v0/${REPORTS_BASE_ID}/${REPORTS_TABLE_ID}`;
    
    // Filter for Status = "Pending"
    const filterFormula = `{Status}='Pending'`;
    
    let allRecords = [];
    let offset = null;
    
    // Fetch all records with pagination
    do {
      const url = `${reportsUrl}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`;
      
      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
      
    } while (offset);
    
    const data = { records: allRecords };
    // Group by Counselor Email
    const groupedByCounselor = {};
    
    data.records.forEach(record => {
      const fields = record.fields;
      const counselorEmail = fields['Counselor Email'] || 'No Email';
      
      if (!groupedByCounselor[counselorEmail]) {
        groupedByCounselor[counselorEmail] = {
          counselorEmail: counselorEmail,
          reports: [],
          totalReports: 0
        };
      }
      
      groupedByCounselor[counselorEmail].reports.push({
        id: record.id,
        programId: fields['Program ID'] || '',
        studentName: fields['Student Name'] || '',
        counselorMessage: fields['Counsellor Message'] || '',
        meetingsTable: fields['Meetings HTML Table'] || '',
        weeklySummary: fields['Weekly Summary'] || '',
        status: fields['Status'] || ''
      });
      
      groupedByCounselor[counselorEmail].totalReports++;
    });
    
    // Log grouped data
    Object.keys(groupedByCounselor).forEach(email => {
      const counselor = groupedByCounselor[email];
    });
    
    
    res.json({
      success: true,
      totalReports: data.records.length,
      counselorCount: Object.keys(groupedByCounselor).length,
      groupedData: groupedByCounselor
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch pending reports',
      message: error.message
    });
  }
});

// ========================================
// SCHEDULING ENDPOINTS
// ========================================

// POST: Check if student is eligible for booking
app.post('/api/check-student-eligibility', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!MEETINGS_BASE_ID || !MEETINGS_MASTER_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials.'
      });
    }

    const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;

    // Fetch student record from meetings master table by Email ID
    const masterRecords = await fetchAllAirtableRecords(masterUrl, {
      filterByFormula: `LOWER({Email ID})=LOWER("${email}")`
    });

    if (!masterRecords || masterRecords.length === 0) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const studentRecord = masterRecords[0];
    const fields = studentRecord.fields;

    const activeRaw = fields['Active Student'];
    const isActive = activeRaw === 'Yes' || activeRaw === true;
    if (!isActive) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const mentorEmail = fields['Mentor Email'];
    if (!mentorEmail) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'No mentor assigned to your account. Please contact admin for support.'
      });
    }

    const programId = fields['Program ID'] || 'PROG001';
    const researchPackage = String(fields['Research Package'] || 'Standard').trim();
    const driveLink = fields['Drive Link'] || null;
    // End Date may be a plain string "M/D/YYYY", an ISO date "YYYY-MM-DD", or an array (linked record)
    let endDateRaw = fields['End Date'] || null;
    if (Array.isArray(endDateRaw)) endDateRaw = endDateRaw[0] || null;
    let endDate = null;
    if (endDateRaw) {
      if (/^\d{4}-\d{2}-\d{2}/.test(String(endDateRaw))) {
        const [y, m, d] = String(endDateRaw).split('T')[0].split('-').map(Number);
        endDate = `${m}/${d}/${y}`;
      } else {
        endDate = String(endDateRaw);
      }
    }
    const videoSubmissionField = fields['Video Submission'];
    const hasSubmittedVideo = videoSubmissionField && videoSubmissionField.length > 0;

    // Fetch M and R meeting records in parallel
    const meetingsRecords = await fetchAllAirtableRecords(meetingsUrl, {
      filterByFormula: `AND({Program ID}="${programId}", OR({Meeting Type}="M", {Meeting Type}="R"))`
    });

    const mentorRecords = meetingsRecords.filter(r => r.fields['Meeting Type'] === 'M');
    const reviewRecords = meetingsRecords.filter(r => r.fields['Meeting Type'] === 'R');

    const totalSessions = researchPackage.toLowerCase() === 'premium' ? 8 : 5;
    const completedSessions = mentorRecords.length;
    const remainingSessions = Math.max(0, totalSessions - completedSessions);

    const videoRequiredAfter = researchPackage.toLowerCase() === 'premium' ? 4 : 3;
    const videoSubmission = {
      hasSubmitted: hasSubmittedVideo,
      isRequired: completedSessions >= videoRequiredAfter && !hasSubmittedVideo,
      requiredAfter: videoRequiredAfter
    };

    const lastMentorTime = mentorRecords.reduce((latest, r) => {
      const t = r.fields['UTC Start DateTime'] ? new Date(r.fields['UTC Start DateTime']).getTime() : 0;
      return t > latest ? t : latest;
    }, 0);

    const lastReviewTime = reviewRecords.reduce((latest, r) => {
      const t = r.fields['UTC Start DateTime'] ? new Date(r.fields['UTC Start DateTime']).getTime() : 0;
      return t > latest ? t : latest;
    }, 0);

    const reviewRequired = lastReviewTime === 0 || lastMentorTime > lastReviewTime;

    return res.json({
      success: true,
      isActiveStudent: true,
      mentorEmail,
      studentName: fields['Name'] || email.split('@')[0],
      mentorName: fields['Mentor Name'] || 'Your Mentor',
      programId,
      remainingSessions,
      completedSessions,
      videoSubmission,
      driveLink,
      endDate,
      reviewRequired,
      studentData: {
        name: fields['Name'] || email.split('@')[0],
        email,
        programId,
        mentorName: fields['Mentor Name'] || 'Your Mentor'
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while checking eligibility. Please try again.'
    });
  }
});

// POST: Check if student is eligible for booking with writing coach
app.post('/api/check-student-writing-coach-eligibility', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    if (!MEETINGS_BASE_ID || !MEETINGS_MASTER_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials.'
      });
    }

    // Check if student exists in meetings master table (same as mentor eligibility)
    const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    const allRecords = await fetchAllAirtableRecords(masterUrl, {
      filterByFormula: `LOWER({Email ID})=LOWER("${email}")`
    });

    if (!allRecords || allRecords.length === 0) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const studentRecord = allRecords[0];
    const activeRaw = studentRecord.fields['Active Student'];
    const isActive = activeRaw === 'Yes' || activeRaw === true;
    if (!isActive) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const coachEmail = studentRecord.fields['WC Email'];
    if (!coachEmail) {
      return res.json({ 
        success: true,
        isActiveStudent: false,
        message: 'No writing coach assigned to your account. Please contact admin for support.' 
      });
    }
    // Step 2: Count completed mentor sessions
    const programId = studentRecord.fields['Program ID'] || 'PROG001';
    
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const meetingsFilter = `AND({Program ID}="${programId}", {Meeting Type}="M")`;
    
    const meetingsResponse = await fetch(`${meetingsUrl}?filterByFormula=${encodeURIComponent(meetingsFilter)}`, {
      headers: getHeaders()
    });
    
    if (!meetingsResponse.ok) {
    }
    
    const meetingsData = await meetingsResponse.json();
    const completedMentorSessions = meetingsData.records ? meetingsData.records.length : 0;
    return res.json({ 
      success: true,
      isActiveStudent: true,
      coachEmail: coachEmail,
      studentName: studentRecord.fields['Name'] || email.split('@')[0],
      coachName: studentRecord.fields['WC Name'] || 'Your Writing Coach',
      programId: programId,
      completedMentorSessions: completedMentorSessions,
      studentData: {
        name: studentRecord.fields['Name'] || email.split('@')[0],
        email: email,
        programId: programId,
        coachName: studentRecord.fields['WC Name'] || 'Your Writing Coach'
      }
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while checking eligibility. Please try again.' 
    });
  }
});

// POST: Check if student is eligible for booking with program manager
app.post('/api/check-student-program-manager-eligibility', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    if (!MEETINGS_BASE_ID || !MEETINGS_MASTER_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials.'
      });
    }

    // Check if student exists in meetings master table (same as mentor eligibility)
    const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    const allRecords = await fetchAllAirtableRecords(masterUrl, {
      filterByFormula: `LOWER({Email ID})=LOWER("${email}")`
    });

    if (!allRecords || allRecords.length === 0) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const studentRecord = allRecords[0];
    const activeRaw = studentRecord.fields['Active Student'];
    const isActive = activeRaw === 'Yes' || activeRaw === true;
    if (!isActive) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }

    const pmEmail = studentRecord.fields['Program Manager Email'];
    if (!pmEmail) {
      return res.json({
        success: true,
        isActiveStudent: false,
        message: 'No program manager assigned to your account. Please contact admin for support.'
      });
    }
    return res.json({
      success: true,
      isActiveStudent: true,
      pmEmail: pmEmail,
      studentName: studentRecord.fields['Name'] || email.split('@')[0],
      pmName: studentRecord.fields['Program Manager Name'] || 'Your Program Manager',
      programId: studentRecord.fields['Program ID'] || 'PROG001',
      studentData: {
        name: studentRecord.fields['Name'] || email.split('@')[0],
        email: email,
        programId: studentRecord.fields['Program ID'] || 'PROG001',
        pmName: studentRecord.fields['Program Manager Name'] || 'Your Program Manager'
      }
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while checking eligibility. Please try again.' 
    });
  }
});

// POST: Get mentor availability for student booking
app.post('/api/get-mentor-availability', async (req, res) => {
  try {
    const { mentorEmail, startDate, endDate, userTimezone } = req.body;
    
    if (!mentorEmail || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mentor email, start date, and end date are required' 
      });
    }
    // Validate required environment variables
    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing timings database credentials.'
      });
    }
    
    // Get mentor's availability from Timings table
    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    const timingsFilterFormula = `LOWER({Email})=LOWER("${mentorEmail}")`;
    let allRecords = [];
    let offset = null;
    
    // Fetch all records with pagination
    do {
      const url = `${timingsUrl}?filterByFormula=${encodeURIComponent(timingsFilterFormula)}${offset ? `&offset=${offset}` : ''}`;
      
      const timingsResponse = await fetch(url, {
        headers: getHeaders()
      });
      
      if (!timingsResponse.ok) {
        const errorText = await timingsResponse.text();
        throw new Error(`Timings API error: ${timingsResponse.status} - ${errorText}`);
      }
      
      const data = await timingsResponse.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
      
    } while (offset);
    
    const timingsData = { records: allRecords };
    if (!timingsData.records || timingsData.records.length === 0) {
      return res.json({ 
        success: true,
        availableSlots: [],
        message: 'No availability found for this mentor.' 
      });
    }
    
    // Process availability and filter for the requested date range
    const availableSlots = [];
    
    console.log('[GET AVAILABILITY] Processing records:', {
      totalRecords: timingsData.records.length,
      requestedRange: `${startDate} to ${endDate}`,
      userTimezone
    });
    
    for (const record of timingsData.records) {
      const weekString = record.fields['Week'];
      const utcSlotsJSON = record.fields['UTC Slots'];

      console.log('[GET AVAILABILITY] Processing record:', {
        weekString,
        hasUTCSlots: !!utcSlotsJSON
      });
      
      if (!weekString) {
        console.log('[GET AVAILABILITY] Skipping - no week string');
        continue;
      }
      
      // Parse week string (e.g., "2025-12-01 to 2025-12-07")
      if (weekString.includes(' to ')) {
        const [weekStart, weekEnd] = weekString.split(' to ');
        
        // Check if any of the requested dates fall within this availability period
        const requestStart = new Date(startDate + 'T00:00:00');
        const requestEnd = new Date(endDate + 'T23:59:59');
        const availStart = new Date(weekStart + 'T00:00:00');
        const availEnd = new Date(weekEnd + 'T23:59:59');
        
        // Check for overlap between requested range and available range
        const hasOverlap = requestStart <= availEnd && requestEnd >= availStart;
        
        console.log('[GET AVAILABILITY] Week overlap check:', {
          weekStart,
          weekEnd,
          requestStart: requestStart.toISOString(),
          requestEnd: requestEnd.toISOString(),
          availStart: availStart.toISOString(),
          availEnd: availEnd.toISOString(),
          hasOverlap
        });
        
        if (hasOverlap && utcSlotsJSON) {
          try {
            const utcSlots = JSON.parse(utcSlotsJSON);
            const convertedSlots = convertUTCSlotsToUserTimezone(utcSlots, startDate, endDate, userTimezone);
            availableSlots.push(...convertedSlots);
          } catch (error) {
            console.error('[GET AVAILABILITY] Failed to parse UTC Slots:', error);
          }
        }
      }
    }
    
    console.log('[GET AVAILABILITY] Final result:', {
      totalSlots: availableSlots.length,
      slots: availableSlots
    });
    
    return res.json({ 
      success: true,
      availableSlots: availableSlots,
      mentorEmail: mentorEmail
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching availability. Please try again.' 
    });
  }
});


// POST: Check if mentor is eligible for scheduling
app.post('/api/check-mentor-eligibility', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    // Validate required environment variables first
    if (!CONTACT_BASE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing contact database credentials.'
      });
    }
    
    // Check if mentor exists in Contact base (Mentors, Writing Coaches, or Team table)
    const mentorTables = ['Mentors', 'Writing Coaches', 'Team'];
    let mentor = null;
    let userType = 'Mentor'; // Default type
    
    for (const tableName of mentorTables) {
      try {
        let allRecords = [];
        let offset = null;
        
        // Fetch all records with pagination
        do {
          const contactUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ''}`;
          const contactResponse = await fetch(contactUrl, {
            method: 'GET',
            headers: getHeaders()
          });
          if (!contactResponse.ok) {
            const errorText = await contactResponse.text();
            break;
          }
          
          const contactData = await contactResponse.json();
          allRecords = allRecords.concat(contactData.records);
          offset = contactData.offset; // Will be undefined if no more records
          
        } while (offset);
        if (allRecords.length > 0) {
        }
        
        // Find mentor by email (case-insensitive and trim whitespace)
        mentor = allRecords.find(record => {
          const recordEmail = record.fields['Email']?.trim();
          const searchEmail = email?.trim();
          return recordEmail && searchEmail && recordEmail.toLowerCase() === searchEmail.toLowerCase();
        });
        
        if (mentor) {
            // Set user type based on which table they were found in
            if (tableName === 'Writing Coaches') {
              userType = 'Writing Coach';
            } else if (tableName === 'Team') {
              userType = 'Team';
            } else {
              userType = 'Mentor';
            }
            
            // Try different possible name field variations
            const possibleNameFields = ['Name', 'Full Name', 'name', 'full_name', 'Mentor Name', 'First Name'];
            let mentorName = null;
            
            for (const fieldName of possibleNameFields) {
              if (mentor.fields[fieldName]) {
                mentorName = mentor.fields[fieldName];
                break;
              }
            }
            
            if (!mentorName) {
              mentorName = 'Unknown Name';
            }
            
            // Store the found name back to the mentor object for consistency
            mentor.fields['Name'] = mentorName;
            
            break;
          } else {
          }
      } catch (error) {
        continue;
      }
    }
    
    if (!mentor) {
      return res.json({ 
        success: false, 
        message: 'You are not an active mentor. Kindly contact admin for support.' 
      });
    }
    
    // Check if mentor has already submitted for current week
    if (!SCHEDULE_BASE_ID || !SCHEDULING_MAIN_TABLE_ID) {
      return res.status(400).json({
        success: false,
        message: 'Server configuration error - missing scheduling database credentials.'
      });
    }
    
    const url = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${SCHEDULING_MAIN_TABLE_ID}`;
    const filterFormula = `LOWER({Mentor Email})=LOWER("${email}")`;
    const allScheduleRecords = await fetchAllAirtableRecords(url, { filterByFormula: filterFormula });
    const data = { records: allScheduleRecords };
    // Calculate 7-day range starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999); // End of 7th day
    
    const weekString = `${today.toISOString().split('T')[0]} to ${sevenDaysLater.toISOString().split('T')[0]}`; 
    // Check existing submissions in Timings table for overlapping periods
    // Add validation for required environment variables
    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      // Skip timings check if environment variables are missing
      
      const mentorName = mentor.fields['Name'] || 'Unknown User';
      const mentorEmail = mentor.fields['Email'] || email;
      
      return res.json({ 
        success: true, 
        hasExistingSubmission: false,
        userType: userType,
        mentorData: {
          name: mentorName,
          email: mentorEmail
        }
      });
    }
    
    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    const timingsFilterFormula = `LOWER({Email})=LOWER("${email}")`;
    try {
      const timingsRecords = await fetchAllAirtableRecords(timingsUrl, { filterByFormula: timingsFilterFormula });
      {
        const timingsData = { records: timingsRecords };
        const todayDateString = today.toISOString().split('T')[0];

        // Collect all future (non-expired) submissions, sorted by start date
        const futureSubmissions = [];
        if (timingsData.records) {
          for (const record of timingsData.records) {
            const weekString = record.fields['Week'];
            if (weekString && weekString.includes(' to ')) {
              const [, weekEnd] = weekString.split(' to ');
              // Keep if end date is today or in the future
              if (weekEnd >= todayDateString) {
                futureSubmissions.push({
                  week: weekString,
                  utcSlots: record.fields['UTC Slots'],
                  submittedAt: record.createdTime,
                  recordId: record.id
                });
              }
            }
          }
        }
        // Sort by start date ascending
        futureSubmissions.sort((a, b) => a.week.localeCompare(b.week));

        const mentorName = mentor.fields['Name'] || 'Unknown User';
        const mentorEmail = mentor.fields['Email'] || email;
        return res.json({
          success: true,
          hasExistingSubmission: futureSubmissions.length > 0,
          submissions: futureSubmissions,
          // Legacy field — first submission (for backward compat with edit mode)
          existingAvailability: futureSubmissions.length > 0 ? futureSubmissions[0] : null,
          userType: userType,
          mentorData: { name: mentorName, email: mentorEmail }
        });
      }
    } catch (timingsError) {
    }
    const mentorName = mentor.fields['Name'] || 'Unknown User';
    const mentorEmail = mentor.fields['Email'] || email;
    return res.json({
      success: true,
      hasExistingSubmission: false,
      submissions: [],
      existingAvailability: null,
      userType: userType,
      mentorData: {
        name: mentorName,
        email: mentorEmail
      }
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while checking eligibility. Please try again.' 
    });
  }
});

// POST: Submit mentor availability
app.post('/api/submit-availability', async (req, res) => {
  try {
    const { email, name, week, userType, utcSlots } = req.body;
    if (!email || !name || !week || !utcSlots) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, name, week, utcSlots'
      });
    }

    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing Timings table credentials.'
      });
    }

    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];

    // Fetch all existing records for this email
    let existingData;
    try {
      const existingRecords = await fetchAllAirtableRecords(timingsUrl, { filterByFormula: `LOWER({Email})=LOWER("${email}")` });
      existingData = { records: existingRecords };
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to check existing submissions.' });
    }

    // Count future (non-expired) submissions
    const futureRecords = (existingData.records || []).filter(r => {
      const w = r.fields['Week'];
      if (!w || !w.includes(' to ')) return false;
      const [, weekEnd] = w.split(' to ');
      return weekEnd >= todayDateString;
    });

    if (futureRecords.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'You already have 2 upcoming availability submissions. Please wait for your current week to expire before adding more.'
      });
    }

    // Check the requested week doesn't overlap any existing future record
    const [newStart, newEnd] = week.split(' to ');
    const overlap = futureRecords.find(r => {
      const [exStart, exEnd] = r.fields['Week'].split(' to ');
      return newStart <= exEnd && newEnd >= exStart;
    });
    if (overlap) {
      return res.status(400).json({
        success: false,
        message: `The requested week overlaps with an existing submission (${overlap.fields['Week']}). Please choose a different week.`
      });
    }

    const response = await fetch(timingsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          'Email': email,
          'Name': name,
          'Week': week,
          'Type': userType || 'Mentor',
          'UTC Slots': JSON.stringify(utcSlots)
        }
      })
    });

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to submit schedule to Timings table. Please try again.'
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      message: 'Availability submitted successfully!',
      recordId: data.id
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting availability. Please try again.'
    });
  }
});

// POST: Update (replace) mentor availability in-place
app.post('/api/update-availability', async (req, res) => {
  try {
    const { email, name, week, userType, utcSlots } = req.body;
    if (!email || !name || !week || !utcSlots) {
      return res.status(400).json({ success: false, message: 'Missing required fields: email, name, week, utcSlots' });
    }
    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - missing Timings table credentials.' });
    }

    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;

    // Delete existing record(s) for this email + week
    const filterFormula = `AND(LOWER({Email})=LOWER("${email}"), {Week}="${week}")`;
    try {
      const existingToDelete = await fetchAllAirtableRecords(timingsUrl, { filterByFormula: filterFormula });
      if (existingToDelete.length) {
        await Promise.all(existingToDelete.map(r =>
          fetch(`${timingsUrl}/${r.id}`, { method: 'DELETE', headers: getHeaders() })
        ));
      }
    } catch (e) {}

    // Insert updated record
    const insertResp = await fetch(timingsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          'Email': email,
          'Name': name,
          'Week': week,
          'Type': userType || 'Mentor',
          'UTC Slots': JSON.stringify(utcSlots)
        }
      })
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text();
      return res.status(500).json({ success: false, message: 'Failed to save updated availability. Please try again.' });
    }

    const insertData = await insertResp.json();
    return res.json({ success: true, message: 'Availability updated successfully!', recordId: insertData.id });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error while updating availability. Please try again.' });
  }
});

// POST: Delete mentor availability
app.post('/api/delete-availability', async (req, res) => {
  try {
    const { email, week } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Missing database credentials.'
      });
    }
    
    // Find the record(s) to delete
    const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    const filterFormula = week 
      ? `AND(LOWER({Email})=LOWER('${email}'), {Week}='${week}')`
      : `LOWER({Email})=LOWER('${email}')`;
    
    let searchData;
    try {
      const searchRecords = await fetchAllAirtableRecords(timingsUrl, { filterByFormula: filterFormula });
      searchData = { records: searchRecords };
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to find availability records' });
    }
    
    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No availability found to delete'
      });
    }
    
    // Delete all matching records
    const deletePromises = searchData.records.map(record => 
      fetch(`${timingsUrl}/${record.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
    );
    
    const deleteResults = await Promise.all(deletePromises);
    
    // Check if all deletes were successful
    const allSuccess = deleteResults.every(result => result.ok);
    
    if (allSuccess) {
      return res.json({
        success: true,
        message: `Successfully deleted ${searchData.records.length} availability record(s)`,
        deletedCount: searchData.records.length
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Some records failed to delete'
      });
    }
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting availability. Please try again.'
    });
  }
});

// ========================================
// MENTOR SCHEDULE ENDPOINTS
// ========================================

// GET: Get mentor's program schedules
app.get('/api/mentor-schedules/:email', async (req, res) => {
  try {
    const mentorEmail = req.params.email;
    
    if (!mentorEmail) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Mentor email is required' 
      });
    }
    // Check if environment variables are set
    if (!SCHEDULE_BASE_ID || !SCHEDULING_MAIN_TABLE_ID || !TIMINGS_TABLE_ID) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Missing scheduling database credentials. Please check environment variables.'
      });
    }

    // Step 1: Get all program IDs for this mentor from the scheduling main table
    const schedulingUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${SCHEDULING_MAIN_TABLE_ID}`;
    
    let allSchedulingRecords = [];
    let offset = null;
    
    // Fetch all records with pagination
    do {
      const url = `${schedulingUrl}${offset ? `?offset=${offset}` : ''}`;
      
      const schedulingResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!schedulingResponse.ok) {
        throw new Error(`Failed to fetch scheduling data: ${schedulingResponse.status}`);
      }

      const data = await schedulingResponse.json();
      allSchedulingRecords = allSchedulingRecords.concat(data.records);
      offset = data.offset;
      
    } while (offset);
    
    const schedulingData = { records: allSchedulingRecords };
    // Debug: Show first few records to understand the data structure
    if (schedulingData.records && schedulingData.records.length > 0) {
    }
    
    // Filter records where Mentor Email matches
    const mentorPrograms = schedulingData.records
      .filter(record => {
        const recordMentorEmail = record.fields['Mentor Email'];
        return recordMentorEmail && mentorEmail && recordMentorEmail.toLowerCase() === mentorEmail.toLowerCase();
      })
      .map(record => record.fields['Program ID'])
      .filter(programId => programId); // Remove undefined values


    if (mentorPrograms.length === 0) {
      return res.json({
        success: true,
        programs: [],
        message: 'No programs found for this mentor'
      });
    }

    // Step 2: Get timings for each program from the TIMINGS table
    const timingsBaseUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    
    let allTimingsRecords = [];
    let timingsOffset = null;
    
    // Fetch all records with pagination
    do {
      const timingsUrl = `${timingsBaseUrl}${timingsOffset ? `?offset=${timingsOffset}` : ''}`;
      
      const timingsResponse = await fetch(timingsUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!timingsResponse.ok) {
        throw new Error(`Failed to fetch timings data: ${timingsResponse.status}`);
      }

      const data = await timingsResponse.json();
      allTimingsRecords = allTimingsRecords.concat(data.records);
      timingsOffset = data.offset;
      
    } while (timingsOffset);
    
    const timingsData = { records: allTimingsRecords };
    
    // Group timings by program ID and find the latest for each program
    const programSchedules = {};
    
    mentorPrograms.forEach(programId => {
      // Get all timings for this program
      const programTimings = timingsData.records
        .filter(record => record.fields['Program ID'] === programId)
        .map(record => ({
          id: record.id,
          programId: record.fields['Program ID'],
          studentName: record.fields['Student Name'],
          week: record.fields['Week'],
          availability: record.fields['Availability'], // Fixed field name
          type: record.fields['Type'] || 'Mentor', // Get the type
          createdTime: record.createdTime
        }));

      if (programTimings.length > 0) {
        // Sort by Week (latest first), then by Created Time (latest first)
        programTimings.sort((a, b) => {
          // First sort by week
          const weekComparison = (b.week || '').localeCompare(a.week || '');
          if (weekComparison !== 0) return weekComparison;
          
          // If weeks are the same, sort by created time
          return new Date(b.createdTime) - new Date(a.createdTime);
        });

        // Take the latest one
        const latestTiming = programTimings[0];
        // Parse availability to structured slots
        let parsedSlots = [];
        if (latestTiming.availability && latestTiming.week && latestTiming.week.includes(' to ')) {
            try {
                const [weekStart, weekEnd] = latestTiming.week.split(' to ');
                // Use the existing parseAvailabilityText function, pass type for correct slot granularity
                parsedSlots = parseAvailabilityText(latestTiming.availability, weekStart, weekEnd, weekStart, weekEnd, latestTiming.type);
            } catch (err) {
            }
        }

        programSchedules[programId] = {
          programId: programId,
          studentName: latestTiming.studentName,
          week: latestTiming.week,
          availability: latestTiming.availability,
          type: latestTiming.type, // Include type in response
          parsedSlots: parsedSlots, // Send parsed slots to frontend
          createdTime: latestTiming.createdTime,
          totalSubmissions: programTimings.length
        };
      }
    });


    res.json({
      success: true,
      programs: Object.values(programSchedules),
      totalPrograms: Object.keys(programSchedules).length
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch mentor schedules', 
      message: error.message 
    });
  }
});

// ========================================
// LEAVE APPLICATION ENDPOINTS
// ========================================

// POST: Submit a leave application
app.post('/api/submit-leave', async (req, res) => {
  try {
    const { email, name, programId, startDate, endDate, reason } = req.body;

    if (!email || !programId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, programId, startDate, endDate, reason'
      });
    }

    if (!SCHEDULE_BASE_ID || !STUDENT_LEAVES_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials for student leaves.'
      });
    }

    const leavesUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${STUDENT_LEAVES_TABLE_ID}`;

    const fields = {
      'Email': email,
      'Program ID': programId,
      'Start Date': startDate,
      'End Date': endDate,
      'Reason': reason
    };
    if (name) fields['Name'] = name;

    const createResponse = await fetch(leavesUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ fields })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to submit leave: ${createResponse.status} - ${errorText}`);
    }

    const createdRecord = await createResponse.json();

    res.json({
      success: true,
      message: 'Leave application submitted successfully.',
      recordId: createdRecord.id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave application. Please try again.',
      error: error.message
    });
  }
});

// POST: Get all leaves for a student by email
app.post('/api/get-my-leaves', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!SCHEDULE_BASE_ID || !STUDENT_LEAVES_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials for student leaves.'
      });
    }

    const leavesUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${STUDENT_LEAVES_TABLE_ID}`;
    const filterFormula = `LOWER({Email})=LOWER("${email.trim()}")`;

    let allRecords = [];
    let offset = null;

    do {
      const url = `${leavesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;

    } while (offset);

    const leaves = allRecords.map(record => ({
      id: record.id,
      programId: record.fields['Program ID'] || '',
      startDate: record.fields['Start Date'] || '',
      endDate: record.fields['End Date'] || '',
      reason: record.fields['Reason'] || '',
      status: record.fields['Status'] || 'Pending',
      denialReason: record.fields['Approval/Denial Reason'] || ''
    }));

    leaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    res.json({
      success: true,
      leaves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave applications. Please try again.',
      error: error.message
    });
  }
});

// POST: Get all leaves (for Program Manager L2 review)
app.post('/api/get-all-leaves', async (req, res) => {
  try {
    if (!SCHEDULE_BASE_ID || !STUDENT_LEAVES_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials for student leaves.'
      });
    }

    const leavesUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${STUDENT_LEAVES_TABLE_ID}`;

    let allRecords = [];
    let offset = null;

    do {
      const url = `${leavesUrl}${offset ? `?offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;

    } while (offset);

    const leaves = allRecords.map(record => ({
      id: record.id,
      email: record.fields['Email'] || '',
      studentName: record.fields['Name'] || '',
      programId: record.fields['Program ID'] || '',
      startDate: record.fields['Start Date'] || '',
      endDate: record.fields['End Date'] || '',
      reason: record.fields['Reason'] || '',
      status: record.fields['Status'] || 'Pending',
      denialReason: record.fields['Approval/Denial Reason'] || '',
      approvedBy: record.fields['Approved By'] || ''
    }));

    leaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    res.json({
      success: true,
      leaves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave applications. Please try again.',
      error: error.message
    });
  }
});

// POST: Update leave status (approve or deny) — for Program Manager L2
app.post('/api/update-leave-status', async (req, res) => {
  try {
    const { recordId, status, reason, approvedBy } = req.body;

    if (!recordId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recordId, status'
      });
    }

    if (!['Approved', 'Denied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "Approved" or "Denied"'
      });
    }

    if (!SCHEDULE_BASE_ID || !STUDENT_LEAVES_TABLE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - missing database credentials for student leaves.'
      });
    }

    const recordUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${STUDENT_LEAVES_TABLE_ID}/${recordId}`;

    const updateResponse = await fetch(recordUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          'Status': status,
          'Approval/Denial Reason': reason || '',
          'Approved By': approvedBy || ''
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update leave status: ${updateResponse.status} - ${errorText}`);
    }

    res.json({
      success: true,
      message: `Leave application ${status.toLowerCase()} successfully.`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update leave status. Please try again.',
      error: error.message
    });
  }
});

// ========================================
// POST: Get bank details for a mentor or writing coach
// ========================================
app.post('/api/get-bank-details', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }
    if (role !== 'Mentor' && role !== 'Writing Coach') {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be Mentor or Writing Coach.' });
    }
    if (!CONTACT_BASE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    const tableName = role === 'Writing Coach' ? 'Writing Coaches' : 'Mentors';
    const filterFormula = `LOWER({Email})=LOWER("${email.trim()}")`;
    const url = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ success: false, message: `Airtable error: ${errText}` });
    }

    const data = await response.json();
    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ success: false, message: 'No record found for this email.' });
    }

    const fields = data.records[0].fields;
    return res.json({
      success: true,
      data: {
        fullAddress: fields['Full Address'] || '',
        accountHolderName: fields['Account Holder Name'] || '',
        accountNumber: fields['Account Number'] || '',
        bankName: fields['Bank Name'] || '',
        swiftCode: fields['SWIFT Code'] || '',
        bankBranch: fields['Bank Branch'] || '',
        specialNumber: fields['Special Number'] || '',
        specialNumberType: fields['Special Number Type'] || '',
        lastBankUpdate: fields['Last Bank Update'] || '',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// POST: Update bank details for a mentor or writing coach
// ========================================
app.post('/api/update-bank-details', async (req, res) => {
  try {
    const { email, role, fullAddress, accountHolderName, accountNumber, bankName, swiftCode, bankBranch, specialNumber, specialNumberType } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }
    if (role !== 'Mentor' && role !== 'Writing Coach') {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (!CONTACT_BASE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    const tableName = role === 'Writing Coach' ? 'Writing Coaches' : 'Mentors';

    // First fetch record ID
    const filterFormula = `LOWER({Email})=LOWER("${email.trim()}")`;
    const fetchUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filterFormula)}`;
    const fetchResponse = await fetch(fetchUrl, { headers: getHeaders() });
    if (!fetchResponse.ok) {
      const errText = await fetchResponse.text();
      return res.status(500).json({ success: false, message: `Airtable error: ${errText}` });
    }
    const fetchData = await fetchResponse.json();
    if (!fetchData.records || fetchData.records.length === 0) {
      return res.status(404).json({ success: false, message: 'No record found for this email.' });
    }

    const recordId = fetchData.records[0].id;
    const patchUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`;
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          'Full Address': fullAddress || '',
          'Account Holder Name': accountHolderName || '',
          'Account Number': accountNumber || '',
          'Bank Name': bankName || '',
          'SWIFT Code': swiftCode || '',
          'Bank Branch': bankBranch || '',
          'Special Number': specialNumber || '',
          'Special Number Type': specialNumberType || '',
          'Last Bank Update': new Date().toISOString().split('T')[0],
        }
      })
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text();
      let airtableError = errText;
      try { airtableError = JSON.parse(errText); } catch {}
      return res.status(500).json({
        success: false,
        message: `Airtable error (${patchResponse.status}): ${typeof airtableError === 'object' ? JSON.stringify(airtableError) : airtableError}`
      });
    }

    return res.json({ success: true, message: 'Bank details updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// FEEDBACK ENDPOINTS
// ========================================

app.post('/api/get-feedback', async (req, res) => {
  try {
    const { programId, meetingNumber, meetingType } = req.body;

    if (!programId || !meetingNumber || !meetingType) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (!FEEDBACK_BASE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - feedback base not configured.' });
    }

    let tableId;
    if (meetingType === 'M') tableId = MENTOR_FEEDBACK_TABLE_ID;
    else if (meetingType === 'WC') tableId = WC_FEEDBACK_TABLE_ID;
    else if (meetingType === 'R') tableId = TEAM_FEEDBACK_TABLE_ID;
    else return res.status(400).json({ success: false, message: 'Invalid meeting type.' });

    if (!tableId) {
      return res.status(500).json({ success: false, message: 'Server configuration error - feedback table not configured.' });
    }

    const formula = encodeURIComponent(`AND({Program ID}="${programId}",{Meeting Number}=${meetingNumber})`);
    const url = `https://api.airtable.com/v0/${FEEDBACK_BASE_ID}/${encodeURIComponent(tableId)}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.records || data.records.length === 0) {
      return res.json({ success: true, found: false });
    }

    return res.json({ success: true, found: true, fields: data.records[0].fields });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/submit-mentor-feedback', async (req, res) => {
  try {
    const {
      meetingRecordId,
      programId,
      meetingNumber,
      didStudentAttend,
      classNotes,
      isOnTrack,
      progressStage,
      keyTasks,
      observations,
      writingCoachInstructions,
      studentName,
      mentorName,
      mentorEmail: mentorEmailField,
      wcEmail,
    } = req.body;

    if (!meetingRecordId || !programId || !meetingNumber || !didStudentAttend || !isOnTrack || !progressStage) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (!FEEDBACK_BASE_ID || !MENTOR_FEEDBACK_TABLE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - feedback base not configured.' });
    }

    // Write to Mentor Feedback Form table
    const feedbackUrl = `https://api.airtable.com/v0/${FEEDBACK_BASE_ID}/${encodeURIComponent(MENTOR_FEEDBACK_TABLE_ID)}`;
    const feedbackBody = {
      fields: {
        'Program ID': programId,
        'Student Name': studentName || '',
        'Mentor Name': mentorName || '',
        'Mentor Email ID': mentorEmailField || '',
        'WC Email': wcEmail || '',
        'Meeting Number': meetingNumber,
        'Did the student attended the session?': didStudentAttend,
        'Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links)': classNotes || '',
        'Is the student on track to complete by the expected date?': isOnTrack,
        'Please select the student\'s progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)': progressStage,
        'List the key tasks or goals recommended for the student in the coming week (max 3 lines)': keyTasks || '',
        'Provide your observations on the student\'s progress, strengths, and areas for improvement. (This feedback is for internal reference only)': observations || '',
        'Please put what you want the Writing coach to do for next week': writingCoachInstructions || '',
      },
    };

    const feedbackResponse = await fetch(feedbackUrl, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackBody),
    });

    if (!feedbackResponse.ok) {
      const errData = await feedbackResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Feedback write failed: ${feedbackResponse.status}`);
    }

    // Update meeting status in MEETINGS_MAIN_TABLE
    const newStatus = didStudentAttend === 'Yes' ? 'Completed' : 'Missed';
    const meetingUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}/${meetingRecordId}`;
    const meetingUpdateResponse = await fetch(meetingUrl, {
      method: 'PATCH',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Meeting Status': newStatus } }),
    });

    if (!meetingUpdateResponse.ok) {
      const errData = await meetingUpdateResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Meeting status update failed: ${meetingUpdateResponse.status}`);
    }

    return res.json({ success: true, status: newStatus });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/submit-wc-feedback', async (req, res) => {
  try {
    const {
      meetingRecordId,
      programId,
      meetingNumber,
      didStudentAttend,
      classNotes,
      isOnTrack,
      progressStage,
      keyTasks,
      observations,
      studentName,
      wcEmail,
    } = req.body;

    if (!meetingRecordId || !programId || !meetingNumber || !didStudentAttend || !isOnTrack || !progressStage) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (!FEEDBACK_BASE_ID || !WC_FEEDBACK_TABLE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - WC feedback table not configured.' });
    }

    // Write to Writing Coach Feedback Form table
    const feedbackUrl = `https://api.airtable.com/v0/${FEEDBACK_BASE_ID}/${encodeURIComponent(WC_FEEDBACK_TABLE_ID)}`;
    const feedbackBody = {
      fields: {
        'Program ID': programId,
        'Student Name': studentName || '',
        'Writing Coach Email ID': wcEmail || '',
        'Meeting Number': meetingNumber,
        'Did the student attended the session': didStudentAttend,
        'Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links)': classNotes || '',
        'Is the student on track to complete by the expected date?': isOnTrack,
        'Please select the student\'s progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)': progressStage,
        'List the key tasks or goals recommended for the student in the coming week (max 3 lines)': keyTasks || '',
        'Provide your observations on the student\'s progress, strengths, and areas for improvement. (This feedback is for internal reference only)': observations || '',
      },
    };

    const feedbackResponse = await fetch(feedbackUrl, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackBody),
    });

    if (!feedbackResponse.ok) {
      const errData = await feedbackResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Feedback write failed: ${feedbackResponse.status}`);
    }

    // Update meeting status in MEETINGS_MAIN_TABLE
    const newStatus = didStudentAttend === 'Yes' ? 'Completed' : 'Missed';
    const meetingUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}/${meetingRecordId}`;
    const meetingUpdateResponse = await fetch(meetingUrl, {
      method: 'PATCH',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Meeting Status': newStatus } }),
    });

    if (!meetingUpdateResponse.ok) {
      const errData = await meetingUpdateResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Meeting status update failed: ${meetingUpdateResponse.status}`);
    }

    return res.json({ success: true, status: newStatus });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/submit-team-feedback', async (req, res) => {
  try {
    const {
      meetingRecordId,
      programId,
      meetingNumber,
      didStudentAttend,
      isOnTrack,
      progressStage,
      extraSupport,
      counsellorMessage,
      mentorKeyPoints,
      mentorTasks,
      wcKeyPoints,
      wcTasks,
      studentName,
      pmEmail,
    } = req.body;

    if (!meetingRecordId || !programId || !meetingNumber || !didStudentAttend || !isOnTrack || !progressStage) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (!FEEDBACK_BASE_ID || !TEAM_FEEDBACK_TABLE_ID) {
      return res.status(500).json({ success: false, message: 'Server configuration error - team feedback table not configured.' });
    }

    // Write to Review Meet Feedback Form table
    const feedbackUrl = `https://api.airtable.com/v0/${FEEDBACK_BASE_ID}/${encodeURIComponent(TEAM_FEEDBACK_TABLE_ID)}`;
    const feedbackBody = {
      fields: {
        'Program ID': programId,
        'Student Name': studentName || '',
        'Program Manager Email ID': pmEmail || '',
        'Meeting Number': meetingNumber,
        'Did the student attend the session?': didStudentAttend,
        'Is the student on track to complete by the expected date?': isOnTrack,
        'Please select the student\'s progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)': progressStage,
        'Is there any area where the student needs extra support or follow-up (academic, motivation, scheduling, etc.)?': extraSupport || '',
        'Write your message that you want the counsellor to know': counsellorMessage || '',
        'What key points or updates were discussed in the student\'s last mentor session?': mentorKeyPoints || '',
        'What tasks or goals has the mentor assigned for the student to complete before their next session?': mentorTasks || '',
        'What key points or updates were discussed in the student\'s last WC session?': wcKeyPoints || '',
        'What tasks or assignments has the WCS instructor assigned for the student before the next session?': wcTasks || '',
      },
    };

    const feedbackResponse = await fetch(feedbackUrl, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackBody),
    });

    if (!feedbackResponse.ok) {
      const errData = await feedbackResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Feedback write failed: ${feedbackResponse.status}`);
    }

    // Update meeting status in MEETINGS_MAIN_TABLE
    const newStatus = didStudentAttend === 'Yes' ? 'Completed' : 'Missed';
    const meetingUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}/${meetingRecordId}`;
    const meetingUpdateResponse = await fetch(meetingUrl, {
      method: 'PATCH',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Meeting Status': newStatus } }),
    });

    if (!meetingUpdateResponse.ok) {
      const errData = await meetingUpdateResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Meeting status update failed: ${meetingUpdateResponse.status}`);
    }

    return res.json({ success: true, status: newStatus });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ========================================
// NOTE: Server is started at the end of file after all routes are defined
// ========================================
/* COMMENTED OUT - Server will start at the end after all routes defined
app.listen(PORT, () => {
  // Verify environment variables
  if (!AIRTABLE_TOKEN || !CONTACT_BASE_ID || !INVOICING_BASE_ID) {
  } else {
  }
});
*/ // End of commented out listen block

// All routes defined below - Server will start listening at the end of this file

// POST: Book a meeting slot
app.post('/api/book-meeting', async (req, res) => {
  try {
    const { 
      studentName, 
      studentEmail, 
      mentorName, 
      mentorEmail, 
      date, 
      startTime,  // Old format: time string with UTC info
      endTime,    // Old format: same as startTime
      utcStartDateTime,  // New format: ISO timestamp
      utcEndDateTime,    // New format: ISO timestamp
      programId,
      timezone,
      meetingType = 'M' // Default to 'M' (Mentor), can be 'WC' (Writing Coach)
    } = req.body;
    // Validate required fields
    if (!studentName || !studentEmail || !mentorEmail || !date || !programId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentName, studentEmail, mentorEmail, date, programId'
      });
    }
    
    // Validate that we have either old format (startTime) or new format (utcStartDateTime)
    if (!startTime && !utcStartDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing time information: either startTime or utcStartDateTime is required'
      });
    }
    
    // Validate environment variables
    if (!MEETINGS_BASE_ID || !MEETINGS_MAIN_TABLE_ID) {
      // For testing - simulate success without actually creating meeting
      return res.json({
        success: true,
        message: 'Meeting booking simulated successfully (missing database config)',
        meetingId: 'TEST_' + Date.now(),
        bookingDetails: {
          studentName,
          mentorName,
          mentorEmail,
          date,
          startTime,
          endTime
        },
        warning: 'Environment variables missing: MEETINGS_BASE_ID, MEETINGS_MAIN_TABLE_ID'
      });
    }

    // Store UTC timestamps as single source of truth
    let utcStart, utcEnd;
    
    if (utcStartDateTime && utcEndDateTime) {
      // New format: Use UTC timestamps directly
      utcStart = utcStartDateTime;
      utcEnd = utcEndDateTime;
      
      console.log('[BOOKING] Storing UTC timestamps:', {
        utcStartDateTime: utcStart,
        utcEndDateTime: utcEnd
      });
    } else {
      // Old format: Convert from time string with UTC info to UTC timestamp
      // Extract UTC times from format like "7:00 PM - 8:00 PM GST (UTC: 15:00 - 16:00)"
      const utcMatch = startTime.match(/UTC:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i);
      
      if (utcMatch) {
        const [, utcStartHour, utcStartMin, utcEndHour, utcEndMin] = utcMatch;
        utcStart = `${date}T${String(utcStartHour).padStart(2, '0')}:${String(utcStartMin).padStart(2, '0')}:00Z`;
        utcEnd = `${date}T${String(utcEndHour).padStart(2, '0')}:${String(utcEndMin).padStart(2, '0')}:00Z`;
      } else {
        throw new Error('Cannot convert old format without UTC info');
      }
      
      console.log('[BOOKING] Converted old format to UTC:', {
        utcStartDateTime: utcStart,
        utcEndDateTime: utcEnd
      });
    }

    // Create meeting record with UTC timestamps only
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    
    const meetingData = {
      fields: {
        'Program ID': programId,
        'Host Email': mentorEmail,
        'Student Email': studentEmail,
        'Meeting Number': 1,
        'UTC Start DateTime': utcStart,
        'UTC End DateTime': utcEnd,
        'Meeting Type': meetingType
      }
    };

    const createResponse = await fetch(meetingsUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(meetingData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create meeting: ${createResponse.status}`);
    }
    
    const createdMeeting = await createResponse.json();

    // Now remove the booked slot from mentor's availability
    await removeBookedSlot(mentorEmail, date, startTime);

    res.json({
      success: true,
      message: `Meeting booked successfully! Meeting scheduled for ${date} at ${startTime}${endTime ? ` - ${endTime}` : ''} (your timezone).`,
      meetingId: createdMeeting.id,
      meetingNumber: 1,
      bookingDetails: {
        studentName,
        mentorName,
        mentorEmail,
        date,
        startTime, // User's timezone for display
        endTime,   // User's timezone for display
        timezone: timezone || 'UTC'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to book meeting. Please try again.',
      error: error.message
    });
  }
});

// Test endpoint for booking functionality
app.get('/api/test-booking', (req, res) => {
  res.json({
    success: true,
    message: 'Booking endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// GOOGLE CALENDAR ENDPOINTS  
// ========================================

// ========================================
// STUDENT MEETINGS VIEW
// ========================================

/**
 * GET /api/students/my-meetings
 * Fetch all meetings for a logged-in student
 * Verifies student details (active status, package, emails) and returns meetings grouped by type
 */
app.get('/api/students/my-meetings', async (req, res) => {
  try {
    // Get student email from query or authorization header
    const studentEmail = req.query.email || req.headers['x-student-email'];
    
    if (!studentEmail) {
      return res.status(400).json({
        error: 'Student email is required',
        message: 'Please provide student email'
      });
    }
    // Step 1: Fetch student details from Meetings Master table
    const masterUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MASTER_TABLE_ID}`;
    const masterParams = new URLSearchParams({
      filterByFormula: `LOWER({Email ID})=LOWER('${studentEmail}')`,
      maxRecords: '1'
    });

    const masterResponse = await fetch(`${masterUrl}?${masterParams}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!masterResponse.ok) {
      throw new Error(`Failed to fetch student details: ${masterResponse.statusText}`);
    }

    const masterData = await masterResponse.json();
    
    if (!masterData.records || masterData.records.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'No student record found with this email'
      });
    }

    const studentRecord = masterData.records[0];
    const studentDetails = {
      id: studentRecord.id,
      name: studentRecord.fields['Name'] || '',
      email: studentRecord.fields['Email ID'] || '',
      isActive: studentRecord.fields['Active Student'] === 'Yes',
      package: studentRecord.fields['Research Package'] || 'Standard',
      mentorEmail: studentRecord.fields['Mentor Email'] || '',
      wcEmail: studentRecord.fields['WC Email'] || '',
      pmEmail: studentRecord.fields['Program Manager Email'] || ''
    };

    // Step 2: Fetch all meetings for this student from Meetings Main table
    const meetingsUrl = `https://api.airtable.com/v0/${MEETINGS_BASE_ID}/${MEETINGS_MAIN_TABLE_ID}`;
    const meetingsRecords = await fetchAllAirtableRecords(meetingsUrl, {
      filterByFormula: `LOWER({Student Email})=LOWER('${studentEmail}')`
    });
    const meetingsData = { records: meetingsRecords };
    
    // Get user timezone from query parameters (optional)
    const userTimezone = req.query.timezone;
    
    // Step 3: Process and group meetings by type (M = Mentor, WC = Writing Center, R = Research, etc.)
    const allMeetings = meetingsData.records.map(record => {
      const fields = record.fields;
      
      // Read UTC timestamps
      const utcStartDateTime = fields['UTC Start DateTime'] || null;
      const utcEndDateTime = fields['UTC End DateTime'] || null;

      // Convert UTC timestamps to user timezone
      let date = '';
      let startTime = '';
      let endTime = '';

      if (utcStartDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcStartDateTime, userTimezone);
        date = converted.date;
        startTime = converted.time;
      } else if (utcStartDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcStartDateTime, 'Asia/Kolkata');
        date = converted.date;
        startTime = converted.time;
      }

      if (utcEndDateTime && userTimezone) {
        const converted = convertUTCtoUserTimezone(utcEndDateTime, userTimezone);
        endTime = converted.time;
      } else if (utcEndDateTime) {
        // No user timezone provided, show in IST as fallback
        const converted = convertUTCtoUserTimezone(utcEndDateTime, 'Asia/Kolkata');
        endTime = converted.time;
      }

      return {
        id: record.id,
        studentEmail: fields['Student Email'] || '',
        meetingType: fields['Meeting Type'] || '',
        date: date,
        startTime: startTime,
        endTime: endTime,
        status: fields['Status'] || 'Pending',
        meetingNumber: parseInt(fields['Meeting Number']) || 0
      };
    });
    // Filter mentor meetings (status = M)
    const mentorMeetings = allMeetings.filter(m => m.meetingType && m.meetingType.trim() === 'M');
    // Step 4: Determine max meetings based on package
    const maxMentorMeetings = studentDetails.package.toLowerCase().includes('premium') ? 8 : 5;

    // Step 5: Create meeting slots (filled or available)
    const mentorSlots = [];
    for (let i = 1; i <= maxMentorMeetings; i++) {
      const meeting = mentorMeetings.find(m => m.meetingNumber === i);
      
      if (meeting) {
        // Determine display status based on meeting status field
        let displayStatus = 'booked';
        if (meeting.status === 'Completed') {
          displayStatus = 'completed';
        } else if (meeting.status === 'Missed') {
          displayStatus = 'missed';
        } else if (meeting.status === '') {
          displayStatus = 'scheduled';
        }
        mentorSlots.push({
          meetingNumber: i,
          status: displayStatus,
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          meetingId: meeting.id,
          rawStatus: meeting.status
        });
      } else {
        mentorSlots.push({
          meetingNumber: i,
          status: 'available',
          date: null,
          startTime: null,
          endTime: null,
          meetingId: null,
          rawStatus: null
        });
      }
    }

    // Step 6: Return response
    res.json({
      success: true,
      student: studentDetails,
      meetings: {
        mentor: mentorSlots
      },
      summary: {
        totalMentorMeetings: mentorMeetings.length,
        maxMentorMeetings: maxMentorMeetings,
        availableMentorSlots: maxMentorMeetings - mentorMeetings.length
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch meetings',
      message: error.message,
      details: {
        meetingsBaseId: MEETINGS_BASE_ID ? 'Set' : 'Missing',
        meetingsMainTableId: MEETINGS_MAIN_TABLE_ID ? 'Set' : 'Missing',
        meetingsMasterTableId: MEETINGS_MASTER_TABLE_ID ? 'Set' : 'Missing',
        airtableToken: AIRTABLE_TOKEN ? 'Set' : 'Missing'
      }
    });
  }
});

// ========================================
// ERROR HANDLING
// ========================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
});
