// ========================================
// RISE RESEARCH - EXPRESS BACKEND SERVER
// ========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3002;
console.log('🔧 PORT configured as:', PORT);

// ========================================
// MIDDLEWARE
// ========================================
// CORS configuration for React frontend
app.use(cors({
    origin: [
        'http://localhost:3000', // Local React dev server (updated port)
        'http://localhost:5173', // Old Vite default port (keep for compatibility)
        'https://riseresearch.vercel.app', // Production frontend (correct URL)
        'https://rise-research-xa8a.vercel.app', // Old URL (keep for now)
        'https://*.vercel.app' // Allow all Vercel preview deployments
    ],
    credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.static('.')); // Serve static files (HTML, CSS, JS) - for old app

// ========================================
// AIRTABLE CONFIGURATION
// ========================================
const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const CONTACT_BASE_ID = process.env.CONTACT_BASE_ID; // Contact base for authentication
const INVOICING_BASE_ID = process.env.INVOICING_BASE_ID; // Invoicing base for classes
const REPORTS_BASE_ID = process.env.REPORTS_BASE_ID; // Reports base for student reports
const REPORTS_TABLE_ID = process.env.REPORTS_TABLE_ID; // Student Reports table

// Scheduling configuration
const SCHEDULE_BASE_ID = process.env.SCHEDULE_BASE_ID; // Scheduling base
const SCHEDULING_MAIN_TABLE_ID = process.env.SCHEDULING_MAIN_TABLE_ID; // Main scheduling table
const TIMINGS_TABLE_ID = process.env.TIMINGS_TABLE_ID; // Timings table

// Debug: Log environment variables on startup
console.log('🔧 Environment Variables Check:');
console.log(`   SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   SCHEDULING_MAIN_TABLE_ID: ${SCHEDULING_MAIN_TABLE_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID ? '✅ Set' : '❌ Missing'}`);

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
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
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

    console.log(`🔍 Verifying Google user: ${email}`);

    // Check if email exists in any of the auth tables and determine role
    let userRole = null;
    let userFound = false;
    
    for (const tableName of AUTH_TABLES) {
      try {
        const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}`;
        
        const response = await fetch(tableUrl, {
          headers: getHeaders()
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        // Check if email exists in this table
        for (const record of data.records) {
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
            }
            break;
          }
        }
        
        if (userFound) break; // Stop searching once user is found
      } catch (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
      }
    }

    // Check if user's email is authorized
    if (userFound && userRole) {
      console.log(`✅ User authorized: ${email} (Role: ${userRole})`);
      return res.json({
        success: true,
        email: email,
        name: name,
        picture: picture,
        role: userRole
      });
    } else {
      console.log(`❌ User not authorized: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'You are not registered in our system. Please contact support.'
      });
    }

  } catch (error) {
    console.error('❌ Error verifying Google token:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
});

// GET: Fetch all authorized emails from multiple tables
app.get('/api/authorized-emails', async (req, res) => {
  try {
    console.log('📋 Fetching authorized emails from Airtable...');
    
    const emailSet = new Set();
    
    // Fetch emails from each table in CONTACT_BASE_ID
    for (const tableName of AUTH_TABLES) {
      try {
        const tableUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/${encodeURIComponent(tableName)}`;
        console.log(`   📋 Fetching from table: ${tableName}`);
        
        const response = await fetch(tableUrl, {
          headers: getHeaders()
        });

        if (!response.ok) {
          console.error(`   ❌ Error fetching ${tableName}: ${response.status}`);
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
        
        console.log(`   ✅ Found emails in ${tableName}`);
      } catch (tableError) {
        console.error(`   ❌ Error processing ${tableName}:`, tableError.message);
      }
    }
    
    const authorizedEmails = Array.from(emailSet);
    console.log(`✅ Total authorized emails: ${authorizedEmails.length}`);
    
    res.json({ 
      emails: authorizedEmails,
      count: authorizedEmails.length 
    });
  } catch (error) {
    console.error('❌ Error fetching authorized emails:', error.message);
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

    console.log(`🔍 Verifying email: ${email}`);
    
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
        console.error(`   ❌ Error processing ${tableName}:`, tableError.message);
      }
    }
    
    const isAuthorized = emailSet.has(email.toLowerCase().trim());
    
    console.log(`${isAuthorized ? '✅' : '❌'} Email ${email} is ${isAuthorized ? 'authorized' : 'not authorized'}`);
    
    res.json({ 
      authorized: isAuthorized,
      email: email
    });
  } catch (error) {
    console.error('❌ Error verifying email:', error.message);
    res.status(500).json({ 
      error: 'Failed to verify email', 
      message: error.message 
    });
  }
});

// ========================================
// STUDENT ENDPOINTS
// ========================================

// GET: Fetch all students from Contact base
app.get('/api/students', async (req, res) => {
  try {
    console.log('📋 Fetching all students...');
    
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students`;
    
    const response = await fetch(studentsUrl, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.records.length} students`);
    
    res.json(data.records);
  } catch (error) {
    console.error('❌ Error fetching students:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch students', 
      message: error.message 
    });
  }
});

// POST: Create new student (if needed in future)
app.post('/api/students', async (req, res) => {
  try {
    console.log('➕ Creating new student...');
    
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
    console.log(`✅ Student created: ${data.id}`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error creating student:', error.message);
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
    console.log(`✏️ Updating student: ${recordId}`);
    
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
    console.log(`✅ Student updated: ${recordId}`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error updating student:', error.message);
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
    console.log(`🗑️ Deleting student: ${recordId}`);
    
    const studentsUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Students/${recordId}`;
    
    const response = await fetch(studentsUrl, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Student deleted: ${recordId}`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error deleting student:', error.message);
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
    const mentorsFilter = `{Email}='${email}'`;
    const mentorsResponse = await fetch(`${mentorsUrl}?filterByFormula=${encodeURIComponent(mentorsFilter)}`, {
      headers: getHeaders()
    });
    
    if (mentorsResponse.ok) {
      const mentorsData = await mentorsResponse.json();
      if (mentorsData.records.length > 0) {
        const rate = mentorsData.records[0].fields['Rate'];
        console.log(`💰 Found rate in Mentors table: ${rate}`);
        return rate || null;
      }
    }
    
    // Check Writing Coaches table
    const coachesUrl = `https://api.airtable.com/v0/${CONTACT_BASE_ID}/Writing Coaches`;
    const coachesFilter = `{Email}='${email}'`;
    const coachesResponse = await fetch(`${coachesUrl}?filterByFormula=${encodeURIComponent(coachesFilter)}`, {
      headers: getHeaders()
    });
    
    if (coachesResponse.ok) {
      const coachesData = await coachesResponse.json();
      if (coachesData.records.length > 0) {
        const rate = coachesData.records[0].fields['Rate'];
        console.log(`💰 Found rate in Writing Coaches table: ${rate}`);
        return rate || null;
      }
    }
    
    console.warn(`⚠️ No rate found for email: ${email}`);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching rate: ${error.message}`);
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

    console.log(`📋 Fetching pending classes for: ${hostEmail}`);
    console.log(`⏱️  Filtering: Duration >= 45 minutes only`);
    
    // Get mentor/coach rate first
    const rateString = await getMentorRate(hostEmail);
    
    // Calculate date range: 27th of previous month to 27th of current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Start date: 27th of previous month
    const startDate = new Date(currentYear, currentMonth - 1, 27);
    
    // End date: 27th of current month
    const endDate = new Date(currentYear, currentMonth, 27);
    
    // Format dates as YYYY-MM-DD for Airtable
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);
    
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Build filter formula for Airtable
    // Filter: Host Email = hostEmail 
    //     AND Payment Status = "Pending" 
    //     AND Date between range
    //     AND Meeting Status = "Completed" OR "Missed"
    //     AND Duration >= 45 minutes
    const filterFormula = `AND(
      {Host Email}='${hostEmail}',
      {Payment Status}='Pending',
      IS_AFTER({Date}, '${startDateStr}'),
      IS_BEFORE({Date}, DATEADD('${endDateStr}', 1, 'days')),
      OR({Meeting Status}='Completed', {Meeting Status}='Missed'),
      {Duration (Minutes)}>=45
    )`;
    
    const url = `${classesUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    const response = await fetch(url, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse rate (e.g., "50 GBP", "100 USD", "3000 INR")
    let rateAmount = 0;
    let currency = 'USD';
    
    if (rateString) {
      const rateMatch = rateString.match(/^([\d.]+)\s*([A-Z]{3})$/i);
      if (rateMatch) {
        rateAmount = parseFloat(rateMatch[1]);
        currency = rateMatch[2].toUpperCase();
        console.log(`💰 Parsed rate: ${rateAmount} ${currency}`);
      }
    }
    
    // Group records by Program ID and calculate totals
    const groupedByProgram = {};
    
    data.records.forEach(record => {
      const fields = record.fields;
      const programId = fields['Program ID'] || 'No Program';
      const meetingStatus = fields['Meeting Status'] || '';
      
      if (!groupedByProgram[programId]) {
        groupedByProgram[programId] = {
          classes: [],
          completedCount: 0,
          missedCount: 0,
          totalAmount: 0
        };
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
        recordingLink: fields['Recording Link'] || '',
        transcriptLink: fields['Transcript Link'] || '',
        date: fields['Date'] || '',
        startTime: fields['Start Time'] || '',
        endTime: fields['End Time'] || '',
        duration: fields['Duration (Minutes)'] || 0,
        programId: programId,
        meetingStatus: meetingStatus,
        issues: fields['Issues'] || '',
        mentorConfirmation: fields['Mentor Confirmation'] || ''
      });
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
      
      // Sort classes by date (ascending - earliest first)
      program.classes.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
      
      console.log(`📊 Program ${programId}: ${program.completedCount} completed + ${program.missedCount} missed = ${program.formattedAmount}${program.hasIssues ? ' ⚠️ HAS ISSUES' : ''}`);
    });
    
    console.log(`✅ Found ${data.records.length} pending classes in ${Object.keys(groupedByProgram).length} programs`);
    
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
    console.error('❌ Error fetching pending classes:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch pending classes', 
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

    console.log(`✅ Validating ${classIds.length} classes for Program ${programId}`);
    console.log(`👤 Mentor: ${mentorName} (${mentorEmail})`);
    
    const classesUrl = `https://api.airtable.com/v0/${INVOICING_BASE_ID}/Classes`;
    
    // Update each class record with "Class Confirmed"
    let updatedCount = 0;
    const updatePromises = classIds.map(async (recordId) => {
      try {
        const response = await fetch(`${classesUrl}/${recordId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            fields: {
              'Mentor Confirmation': 'Class Confirmed'
            }
          })
        });
        
        if (response.ok) {
          updatedCount++;
          console.log(`   ✅ Updated record: ${recordId}`);
        } else {
          console.error(`   ❌ Failed to update record: ${recordId}`);
        }
        
        return response.ok;
      } catch (error) {
        console.error(`   ❌ Error updating record ${recordId}:`, error.message);
        return false;
      }
    });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Updated ${updatedCount}/${classIds.length} class records to 'Class Confirmed'`);
    
    // Calculate classes this month (completed + 0.5 × missed)
    const classesThisMonth = completedCount + (missedCount * 0.5);
    
    // Get current month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    
    console.log(`📊 Invoice calculation: ${completedCount} completed + ${missedCount} × 0.5 missed = ${classesThisMonth} classes`);
    console.log(`💰 Total amount: ${totalAmount} ${currency}`);
    console.log(`📅 Month: ${currentMonth}`);
    
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
        console.log(`✅ Created invoice record: ${invoiceData.id}`);
        
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
        console.error(`❌ Failed to create invoice: ${invoiceResponse.status}`, errorText);
        
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
      console.error(`❌ Error creating invoice:`, invoiceError.message);
      
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
    console.error('❌ Error validating classes:', error.message);
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

    console.log(`📝 Raising discrepancy for ${classIds.length} classes in Program ${programId}`);
    console.log(`   Issue: ${issues.substring(0, 100)}...`);
    
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
          console.log(`   ✅ Updated record: ${recordId}`);
        } else {
          console.error(`   ❌ Failed to update record: ${recordId}`);
        }
        
        return response.ok;
      } catch (error) {
        console.error(`   ❌ Error updating record ${recordId}:`, error.message);
        return false;
      }
    });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Updated ${updatedCount}/${classIds.length} class records with discrepancy`);
    
    res.json({ 
      success: true,
      message: `Discrepancy has been recorded for Program ${programId}.`,
      programId: programId,
      updatedCount: updatedCount,
      totalClasses: classIds.length
    });
  } catch (error) {
    console.error('❌ Error raising discrepancy:', error.message);
    res.status(500).json({ 
      error: 'Failed to raise discrepancy', 
      message: error.message 
    });
  }
});

// GET: Fetch pending student reports grouped by counselor
app.get('/api/pending-reports', async (req, res) => {
  try {
    console.log('📋 Fetching pending student reports...');
    
    const reportsUrl = `https://api.airtable.com/v0/${REPORTS_BASE_ID}/${REPORTS_TABLE_ID}`;
    
    // Filter for Status = "Pending"
    const filterFormula = `{Status}='Pending'`;
    const url = `${reportsUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    const response = await fetch(url, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`📊 Found ${data.records.length} pending reports`);
    
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
      console.log(`📧 ${email}: ${counselor.totalReports} pending reports`);
    });
    
    console.log(`✅ Grouped into ${Object.keys(groupedByCounselor).length} counselors`);
    
    res.json({
      success: true,
      totalReports: data.records.length,
      counselorCount: Object.keys(groupedByCounselor).length,
      groupedData: groupedByCounselor
    });
  } catch (error) {
    console.error('❌ Error fetching pending reports:', error.message);
    res.status(500).json({
      error: 'Failed to fetch pending reports',
      message: error.message
    });
  }
});

// ========================================
// SCHEDULING ENDPOINTS
// ========================================

// POST: Check if student is eligible for scheduling
app.post('/api/check-student-eligibility', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    console.log(`🔍 Checking student eligibility for: ${email}`);
    console.log(`📋 Using SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
    console.log(`📋 Using SCHEDULING_MAIN_TABLE_ID: ${SCHEDULING_MAIN_TABLE_ID || 'UNDEFINED'}`);
    console.log(`📋 Using TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
    
    // Check if environment variables are set
    if (!SCHEDULE_BASE_ID || !SCHEDULING_MAIN_TABLE_ID || !TIMINGS_TABLE_ID) {
      console.error('❌ Missing environment variables');
      console.error(`   SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
      console.error(`   SCHEDULING_MAIN_TABLE_ID: ${SCHEDULING_MAIN_TABLE_ID || 'UNDEFINED'}`);
      console.error(`   TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
      return res.status(400).json({
        success: false,
        message: 'Server configuration error - missing scheduling database credentials. Please check environment variables.'
      });
    }
    
    // Fetch from SCHEDULING_MAIN_TABLE_ID
    const url = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${SCHEDULING_MAIN_TABLE_ID}`;
    console.log(`🌐 API URL: ${url}`);
    
    const filterFormula = `{Student Email}="${email}"`;
    console.log(`🔍 Filter formula: ${filterFormula}`);
    
    const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
      headers: getHeaders()
    });
    
    console.log(`📡 Airtable response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`📊 Records found: ${data.records ? data.records.length : 0}`);
    
    if (data.records && data.records.length > 0) {
      const studentRecord = data.records[0];
      console.log('📝 Student record fields:', Object.keys(studentRecord.fields));
      
      const studentData = {
        programId: studentRecord.fields['Program ID'] || 'Unknown',
        studentName: studentRecord.fields['Student Name'] || 'Unknown',
        studentEmail: studentRecord.fields['Student Email'] || email
      };
      
      console.log('✅ Student found:', studentData);
      
      // Now check if student has ANY existing booking that would prevent new booking
      console.log('🔍 Checking if student has any existing bookings...');
      
      // Check TIMINGS table for ANY existing submission for this student
      const timingsUrl = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
      const timingsFilter = `{Student Name}="${studentData.studentName}"`;
      
      console.log(`🔍 Checking timings with filter: ${timingsFilter}`);
      
      const timingsResponse = await fetch(`${timingsUrl}?filterByFormula=${encodeURIComponent(timingsFilter)}`, {
        headers: getHeaders()
      });
      
      if (timingsResponse.ok) {
        const timingsData = await timingsResponse.json();
        console.log(`📊 Total availability records found: ${timingsData.records ? timingsData.records.length : 0}`);
        
        if (timingsData.records && timingsData.records.length > 0) {
          // Find the most recent booking
          const sortedRecords = timingsData.records.sort((a, b) => {
            // Sort by Week (latest first), then by Created Time (latest first)
            const weekComparison = (b.fields.Week || '').localeCompare(a.fields.Week || '');
            if (weekComparison !== 0) return weekComparison;
            return new Date(b.createdTime) - new Date(a.createdTime);
          });
          
          const latestRecord = sortedRecords[0];
          const existingWeek = latestRecord.fields.Week;
          
          console.log(`📅 Latest existing booking week: ${existingWeek}`);
          
          if (existingWeek) {
            // Parse the existing week to get start date
            const weekParts = existingWeek.split(' to ');
            if (weekParts.length === 2) {
              const existingStartDate = new Date(weekParts[0] + 'T00:00:00Z');
              const todayUTC = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
              
              console.log(`🔍 Existing booking start: ${existingStartDate.toISOString().split('T')[0]}`);
              console.log(`🔍 Today's date: ${todayUTC.toISOString().split('T')[0]}`);
              
              // If today is before the existing booking start date, prevent new booking
              if (todayUTC < existingStartDate) {
                console.log('❌ Cannot book - today is before existing booking start date');
                console.log('🔍 Returning availability data:', latestRecord.fields.Availability);
                console.log('🔍 Availability data length:', latestRecord.fields.Availability?.length || 'undefined');
                
                const responseData = {
                  success: true,
                  isActiveStudent: true,
                  studentData: studentData,
                  hasExistingSubmission: true,
                  existingAvailability: {
                    id: latestRecord.id,
                    week: latestRecord.fields.Week,
                    availability: latestRecord.fields.Availability,
                    createdTime: latestRecord.createdTime
                  },
                  message: 'You have a future booking. Cannot create duplicate booking.'
                };
                
                console.log('🔍 Full response being sent to frontend:', JSON.stringify(responseData, null, 2));
                return res.json(responseData);
              } else {
                // Today is on or after existing booking start - check if there's a booking for the target week
                console.log('✅ Today is on/after existing booking - checking target week');
                
                // Calculate the target Monday-Sunday week for booking
                const today = new Date();
                const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                let daysUntilMonday;
                
                if (currentDay === 0) { // Sunday
                  daysUntilMonday = 1;
                } else if (currentDay === 1) { // Monday
                  daysUntilMonday = 0; // Today is Monday
                } else { // Tuesday to Saturday
                  daysUntilMonday = 8 - currentDay; // Days until next Monday
                }
                
                const targetMonday = new Date(today);
                targetMonday.setUTCDate(today.getUTCDate() + daysUntilMonday);
                const targetSunday = new Date(targetMonday);
                targetSunday.setUTCDate(targetMonday.getUTCDate() + 6);
                
                const targetWeekRange = `${targetMonday.toISOString().split('T')[0]} to ${targetSunday.toISOString().split('T')[0]}`;
                console.log(`📅 Target week for booking: ${targetWeekRange}`);
                
                // Check if there's already a booking for the target week
                const targetWeekFilter = `AND({Student Name}="${studentData.studentName}", {Week}="${targetWeekRange}")`;
                const targetWeekResponse = await fetch(`${timingsUrl}?filterByFormula=${encodeURIComponent(targetWeekFilter)}`, {
                  headers: getHeaders()
                });
                
                if (targetWeekResponse.ok) {
                  const targetWeekData = await targetWeekResponse.json();
                  
                  if (targetWeekData.records && targetWeekData.records.length > 0) {
                    console.log('❌ Already has booking for target week');
                    
                    return res.json({
                      success: true,
                      isActiveStudent: true,
                      studentData: studentData,
                      hasExistingSubmission: true,
                      existingAvailability: {
                        id: targetWeekData.records[0].id,
                        week: targetWeekData.records[0].fields.Week,
                        availability: targetWeekData.records[0].fields.Availability,
                        createdTime: targetWeekData.records[0].createdTime
                      },
                      message: 'You already have availability submitted for this week.'
                    });
                  }
                }
              }
            }
          }
          
          console.log('✅ Can book new availability - no conflicts found');
        }
        
        // If we reach here, student has existing bookings but no conflicts for new booking
        console.log('✅ No conflicts found, allowing new submission');
        return res.json({
          success: true,
          isActiveStudent: true,
          studentData: studentData,
          hasExistingSubmission: false
        });
      }
      
      // No existing submission found at all, allow new submission
      console.log('✅ No existing submission found, allowing new submission');
      res.json({
        success: true,
        isActiveStudent: true,
        studentData: studentData,
        hasExistingSubmission: false
      });
    } else {
      console.log('❌ Student not found in scheduling database');
      res.json({
        success: false,
        message: 'You are not an active student. Kindly contact admin for support.'
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking student eligibility:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to verify student status: ${error.message}`
    });
  }
});

// POST: Submit student availability
app.post('/api/submit-availability', async (req, res) => {
  try {
    const { programId, studentName, week, availability } = req.body;
    
    if (!programId || !studentName || !week || !availability) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    console.log(`📝 Submitting availability for: ${studentName} (${programId})`);
    console.log(`📋 Using SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
    console.log(`📋 Using TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
    console.log(`📋 Week: ${week}`);
    console.log(`📋 Availability length: ${availability.length} characters`);
    
    // Check if environment variables are set
    if (!SCHEDULE_BASE_ID || !TIMINGS_TABLE_ID) {
      console.error('❌ Missing environment variables for submission');
      console.error(`   SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
      console.error(`   TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
      return res.status(400).json({
        success: false,
        message: 'Server configuration error - missing scheduling submission credentials.'
      });
    }
    
    // Create record in TIMINGS_TABLE_ID
    const url = `https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`;
    console.log(`🌐 Submission URL: ${url}`);
    
    const requestBody = {
      fields: {
        'Program ID': programId,
        'Student Name': studentName,
        'Week': week,
        'Availability': availability
      }
    };
    
    console.log('📤 Request payload:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    console.log(`📡 Airtable submission response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Availability submitted successfully:', data.id);
    
    res.json({
      success: true,
      message: 'Availability submitted successfully',
      recordId: data.id
    });
    
  } catch (error) {
    console.error('❌ Error submitting availability:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to submit availability: ${error.message}`
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

    console.log(`📅 Fetching schedules for mentor: ${mentorEmail}`);
    console.log(`📋 Using SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
    console.log(`📋 Using SCHEDULING_MAIN_TABLE_ID: ${SCHEDULING_MAIN_TABLE_ID || 'UNDEFINED'}`);
    console.log(`📋 Using TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
    
    // Check if environment variables are set
    if (!SCHEDULE_BASE_ID || !SCHEDULING_MAIN_TABLE_ID || !TIMINGS_TABLE_ID) {
      console.error('❌ Missing environment variables for mentor schedules');
      console.error(`   SCHEDULE_BASE_ID: ${SCHEDULE_BASE_ID || 'UNDEFINED'}`);
      console.error(`   SCHEDULING_MAIN_TABLE_ID: ${SCHEDULING_MAIN_TABLE_ID || 'UNDEFINED'}`);
      console.error(`   TIMINGS_TABLE_ID: ${TIMINGS_TABLE_ID || 'UNDEFINED'}`);
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Missing scheduling database credentials. Please check environment variables.'
      });
    }

    // Step 1: Get all program IDs for this mentor from the scheduling main table
    const schedulingResponse = await fetch(`https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${SCHEDULING_MAIN_TABLE_ID}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!schedulingResponse.ok) {
      throw new Error(`Failed to fetch scheduling data: ${schedulingResponse.status}`);
    }

    const schedulingData = await schedulingResponse.json();
    
    console.log(`📊 Total scheduling records fetched: ${schedulingData.records?.length || 0}`);
    console.log(`🔍 Looking for mentor email: "${mentorEmail}"`);
    
    // Debug: Show first few records to understand the data structure
    if (schedulingData.records && schedulingData.records.length > 0) {
      console.log(`📄 Sample record structure:`, JSON.stringify(schedulingData.records[0].fields, null, 2));
    }
    
    // Filter records where Mentor Email matches
    const mentorPrograms = schedulingData.records
      .filter(record => {
        const recordMentorEmail = record.fields['Mentor Email'];
        console.log(`🔍 Checking record with Mentor Email: "${recordMentorEmail}" vs "${mentorEmail}"`);
        return recordMentorEmail === mentorEmail;
      })
      .map(record => record.fields['Program ID'])
      .filter(programId => programId); // Remove undefined values

    console.log(`📋 Found ${mentorPrograms.length} programs for mentor: ${mentorPrograms.join(', ')}`);

    if (mentorPrograms.length === 0) {
      return res.json({
        success: true,
        programs: [],
        message: 'No programs found for this mentor'
      });
    }

    // Step 2: Get timings for each program from the TIMINGS table
    const timingsResponse = await fetch(`https://api.airtable.com/v0/${SCHEDULE_BASE_ID}/${TIMINGS_TABLE_ID}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!timingsResponse.ok) {
      throw new Error(`Failed to fetch timings data: ${timingsResponse.status}`);
    }

    const timingsData = await timingsResponse.json();
    
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
        
        console.log(`🔍 Mentor API - Latest timing availability for program ${programId}:`, latestTiming.availability);
        console.log(`🔍 Mentor API - Availability length:`, latestTiming.availability?.length || 'undefined');
        
        programSchedules[programId] = {
          programId: programId,
          studentName: latestTiming.studentName,
          week: latestTiming.week,
          availability: latestTiming.availability,
          createdTime: latestTiming.createdTime,
          totalSubmissions: programTimings.length
        };
      }
    });

    console.log(`✅ Processed schedules for ${Object.keys(programSchedules).length} programs`);

    res.json({
      success: true,
      programs: Object.values(programSchedules),
      totalPrograms: Object.keys(programSchedules).length
    });

  } catch (error) {
    console.error('❌ Error fetching mentor schedules:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch mentor schedules', 
      message: error.message 
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

app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   RISE Research Backend Server`);
  console.log('   ========================================');
  console.log(`   📡 Server running on: http://localhost:${PORT}`);
  console.log(`   🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log('   ========================================');
  console.log('   🔐 AUTHENTICATION ENDPOINTS:');
  console.log(`   POST /api/verify-google-token - Verify Google OAuth`);
  console.log(`   POST /api/verify-email - Check email authorization`);
  console.log(`   GET  /api/authorized-emails - List all authorized emails`);
  console.log('   ========================================');
  console.log('   � STUDENT ENDPOINTS:');
  console.log(`   GET    /api/students - Fetch all students`);
  console.log(`   POST   /api/students - Create new student`);
  console.log(`   PUT    /api/students/:id - Update student`);
  console.log(`   DELETE /api/students/:id - Delete student`);
  console.log('   ========================================');
  console.log('   📊 INVOICING ENDPOINTS:');
  console.log(`   GET  /api/pending-classes/:email - Get pending classes`);
  console.log(`   POST /api/validate-classes - Validate and create invoices`);
  console.log(`   POST /api/raise-discrepancy - Report class issues`);
  console.log('   ========================================');
  console.log('   📝 REPORTS ENDPOINTS:');
  console.log(`   GET  /api/pending-reports - Get pending student reports`);
  console.log('   ========================================\n');
  
  // Verify environment variables
  if (!AIRTABLE_TOKEN || !CONTACT_BASE_ID || !INVOICING_BASE_ID) {
    console.warn('⚠️  WARNING: Missing environment variables!');
    console.warn('   Please check your .env file configuration.');
  } else {
    console.log('✅ Environment variables loaded successfully');
    console.log(`📋 Contact Base ID: ${CONTACT_BASE_ID}`);
    console.log(`📋 Invoicing Base ID: ${INVOICING_BASE_ID}`);
    console.log(`📋 Auth tables: ${AUTH_TABLES.join(', ')}\n`);
  }
});
