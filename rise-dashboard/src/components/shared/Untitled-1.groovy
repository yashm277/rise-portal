// ========================================
// STUDENT PROGRESS REPORT GENERATOR
// Custom script for RISE Research
// ========================================

// Configuration
const STUDENTS_TABLE = 'Students';
const MEETINGS_TABLE = 'Meetings';
const MENTOR_FEEDBACK_TABLE = 'Mentor Feedback';
const WC_FEEDBACK_TABLE = 'Writing Coach (WC) Feedback';
const REVIEW_FEEDBACK_TABLE = 'Review Feedback';
const REPORTS_TABLE = 'Student Reports';

// Get all tables
let studentsTable = base.getTable(STUDENTS_TABLE);
let meetingsTable = base.getTable(MEETINGS_TABLE);
let mentorFeedbackTable = base.getTable(MENTOR_FEEDBACK_TABLE);
let wcFeedbackTable = base.getTable(WC_FEEDBACK_TABLE);
let reviewFeedbackTable = base.getTable(REVIEW_FEEDBACK_TABLE);
let reportsTable = base.getTable(REPORTS_TABLE);

// Fetch all records
console.log('📥 Fetching all records...');
let studentsQuery = await studentsTable.selectRecordsAsync();
let meetingsQuery = await meetingsTable.selectRecordsAsync();
let mentorFeedbackQuery = await mentorFeedbackTable.selectRecordsAsync();
let wcFeedbackQuery = await wcFeedbackTable.selectRecordsAsync();
let reviewFeedbackQuery = await reviewFeedbackTable.selectRecordsAsync();

let allStudents = studentsQuery.records;
let allMeetings = meetingsQuery.records;
let allMentorFeedback = mentorFeedbackQuery.records;
let allWCFeedback = wcFeedbackQuery.records;
let allReviewFeedback = reviewFeedbackQuery.records;

console.log(`✅ Found ${allStudents.length} students`);
console.log(`✅ Found ${allMeetings.length} total meetings`);

// Calculate date 1 week ago
let oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

console.log(`📅 Filtering records from: ${oneWeekAgo.toDateString()}`);

// ========================================
// Build Reports for Each Active Student
// ========================================
let recordsToCreate = [];
let meetingsToUpdate = [];

for (let student of allStudents) {
    let programId = student.getCellValue('Program ID');
    let studentName = student.getCellValue('Name');
    let isActive = student.getCellValue('Active Student');
    
    // Only process active students
    if (!isActive) continue;
    
    // ========================================
    // 1. Get meetings from last week WHERE Report Generated is NOT "Yes"
    // ========================================
    let recentMeetings = allMeetings.filter(meeting => {
        let meetingProgramId = meeting.getCellValue('Program ID');
        let meetingDateStr = meeting.getCellValue('Meeting Date');
        let reportGenerated = meeting.getCellValue('Report Generated');
        
        if (!meetingDateStr || !meetingProgramId) return false;
        
        let meetingDate = new Date(meetingDateStr);
        let isReportGenerated = reportGenerated === 'Yes' || reportGenerated === true;
        
        return meetingProgramId === programId && 
               meetingDate >= oneWeekAgo && 
               !isReportGenerated;
    });
    
    // Skip this student if they have no new meetings
    if (recentMeetings.length === 0) {
        console.log(`⏭️  Skipping ${studentName} - no new meetings to report`);
        continue;
    }
    
    // Sort meetings by date (newest first)
    recentMeetings.sort((a, b) => {
        let dateA = new Date(a.getCellValue('Meeting Date'));
        let dateB = new Date(b.getCellValue('Meeting Date'));
        return dateB - dateA;
    });
    
    // Add these meetings to the update list
    recentMeetings.forEach(meeting => {
        meetingsToUpdate.push(meeting.id);
    });
    
    // ========================================
    // 2. Get counsellor message from Review Feedback (LAST WEEK ONLY)
    // ========================================
    let counsellorMessage = '';
    
    let studentReviewFeedback = allReviewFeedback.filter(feedback => {
        let feedbackProgramId = feedback.getCellValue('Program ID');
        let createdTimeStr = feedback.getCellValue('Created Time');
        
        if (!feedbackProgramId) return false;
        
        // Filter by student AND last week
        if (createdTimeStr) {
            let createdDate = new Date(createdTimeStr);
            return feedbackProgramId === programId && createdDate >= oneWeekAgo;
        }
        
        return feedbackProgramId === programId;
    });
    
    if (studentReviewFeedback.length > 0) {
        // Sort by date and get the most recent
        studentReviewFeedback.sort((a, b) => {
            let dateA = new Date(a.getCellValue('Created Time'));
            let dateB = new Date(b.getCellValue('Created Time'));
            return dateB - dateA;
        });
        
        counsellorMessage = studentReviewFeedback[0].getCellValue('Message to Counsellor') || 
                           studentReviewFeedback[0].getCellValue('Summary') || 
                           'No message provided';
    } else {
        counsellorMessage = 'No message from student this week';
    }
    
    // ========================================
    // 3. Build CUMULATIVE FEEDBACK SUMMARY
    // ========================================
    let cumulativeFeedback = '';
    
    for (let meeting of recentMeetings) {
        let meetingNum = meeting.getCellValue('Meeting Number') || 'N/A';
        let meetingType = meeting.getCellValue('Meeting Type') || 'N/A';
        let meetingDateStr = meeting.getCellValue('Meeting Date');
        let meetingDate = meetingDateStr ? new Date(meetingDateStr).toLocaleDateString() : 'Unknown';
        
        cumulativeFeedback += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        cumulativeFeedback += `📅 Meeting #${meetingNum} | ${meetingDate} | Type: ${meetingType}\n`;
        cumulativeFeedback += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // Get feedback for this meeting
        let mentorFeedbackForMeeting = allMentorFeedback.filter(fb => 
            fb.getCellValue('Program ID') === programId && 
            fb.getCellValue('Meeting Number') === meetingNum
        );
        
        let wcFeedbackForMeeting = allWCFeedback.filter(fb => 
            fb.getCellValue('Program ID') === programId && 
            fb.getCellValue('Meeting Number') === meetingNum
        );
        
        // Add Mentor Feedback
        if (mentorFeedbackForMeeting.length > 0) {
            cumulativeFeedback += `🎓 MENTOR FEEDBACK:\n`;
            mentorFeedbackForMeeting.forEach(fb => {
                let summary = fb.getCellValue('Summary') || '';
                cumulativeFeedback += `   ${summary}\n`;
            });
            cumulativeFeedback += `\n`;
        }
        
        // Add Writing Coach Feedback
        if (wcFeedbackForMeeting.length > 0) {
            cumulativeFeedback += `✍️ WRITING COACH FEEDBACK:\n`;
            wcFeedbackForMeeting.forEach(fb => {
                let summary = fb.getCellValue('Summary') || '';
                cumulativeFeedback += `   ${summary}\n`;
            });
            cumulativeFeedback += `\n`;
        }
        
        // If no feedback
        if (mentorFeedbackForMeeting.length === 0 && wcFeedbackForMeeting.length === 0) {
            cumulativeFeedback += `   No feedback recorded yet.\n\n`;
        }
    }
    
    if (!cumulativeFeedback) {
        cumulativeFeedback = 'No feedback available for the reported period.';
    }
    
    // ========================================
    // 4. Build HTML Table (Meeting #, Type, Recording Link ONLY)
    // ========================================
    let htmlTable = `
<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h3 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        📊 Meetings - Last Week (${recentMeetings.length} meeting${recentMeetings.length !== 1 ? 's' : ''})
    </h3>
    
    <table border="1" cellpadding="12" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
        <thead>
            <tr style="background-color: #4CAF50; color: white;">
                <th style="text-align: left;">Meeting #</th>
                <th style="text-align: left;">Meeting Type</th>
                <th style="text-align: left;">Recording Link</th>
            </tr>
        </thead>
        <tbody>`;
    
    for (let meeting of recentMeetings) {
        let meetingNum = meeting.getCellValue('Meeting Number') || 'N/A';
        let meetingTypeRaw = meeting.getCellValue('Meeting Type');
        let transcriptLink = meeting.getCellValue('Transcript Link') || 'No link';
        
        // Handle Single Select field - extract the name property
        let meetingType = 'N/A';
        if (meetingTypeRaw) {
            if (typeof meetingTypeRaw === 'string') {
                meetingType = meetingTypeRaw;
            } else if (meetingTypeRaw.name) {
                meetingType = meetingTypeRaw.name;
            }
        }
        
        // DEBUG: Log the actual meeting type value
        console.log(`Meeting #${meetingNum}: Type = "${meetingType}"`);
        
        // Format the recording link
        let linkHTML = transcriptLink;
        if (transcriptLink.startsWith('http')) {
            linkHTML = `<a href="${transcriptLink}" target="_blank" style="color: #4CAF50; text-decoration: none;">🔗 View Recording</a>`;
        }
        
        // Format meeting type (trim spaces and handle case)
        let meetingTypeClean = meetingType.trim().toUpperCase();
        let meetingTypeDisplay = '';
        let meetingTypeColor = '#9C27B0'; // default purple
        
        if (meetingTypeClean === 'M') {
            meetingTypeDisplay = '🎓 Mentor';
            meetingTypeColor = '#2196F3';
        } else if (meetingTypeClean === 'WC') {
            meetingTypeDisplay = '✍️ Writing Coach';
            meetingTypeColor = '#FF9800';
        } else if (meetingTypeClean === 'R') {
            meetingTypeDisplay = '📝 Review';
            meetingTypeColor = '#9C27B0';
        } else {
            meetingTypeDisplay = meetingType; // Show original if unknown
            meetingTypeColor = '#999999';
        }
        
        // Add the row
        htmlTable += `
        <tr style="background-color: ${recentMeetings.indexOf(meeting) % 2 === 0 ? '#f9f9f9' : 'white'};">
            <td style="font-weight: bold; font-size: 16px;">${meetingNum}</td>
            <td>
                <span style="
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 4px;
                    background-color: ${meetingTypeColor};
                    color: white;
                    font-size: 13px;
                    font-weight: bold;
                ">
                    ${meetingTypeDisplay}
                </span>
            </td>
            <td>${linkHTML}</td>
        </tr>`;
    }
    
    htmlTable += `
        </tbody>
    </table>
</div>`;
    
    // ========================================
    // 5. Create the report record
    // ========================================
    recordsToCreate.push({
        fields: {
            'Program ID': programId,
            'Student Name': studentName,
            'Counsellor Message': counsellorMessage,
            'Meetings HTML Table': htmlTable,
            'Cumulative Feedback Summary': cumulativeFeedback
        }
    });
    
    console.log(`✅ Generated report for ${studentName} (${recentMeetings.length} new meetings)`);
}

// ========================================
// Save all reports
// ========================================
if (recordsToCreate.length > 0) {
    console.log(`\n📤 Creating ${recordsToCreate.length} reports...\n`);
    
    while (recordsToCreate.length > 0) {
        let batch = recordsToCreate.splice(0, 50);
        await reportsTable.createRecordsAsync(batch);
        console.log(`✅ Created batch of ${batch.length} reports`);
    }
} else {
    console.log('\n⚠️  No new meetings to report!');
}

// ========================================
// Update meetings
// ========================================
if (meetingsToUpdate.length > 0) {
    console.log(`\n🔄 Updating ${meetingsToUpdate.length} meetings to mark as reported...\n`);
    
    while (meetingsToUpdate.length > 0) {
        let batch = meetingsToUpdate.splice(0, 50);
        
        let updates = batch.map(meetingId => ({
            id: meetingId,
            fields: {
                'Report Generated': 'Yes'
            }
        }));
        
        await meetingsTable.updateRecordsAsync(updates);
        console.log(`✅ Updated batch of ${updates.length} meetings`);
    }
}

console.log('\n🎉 ========================================');
console.log('   ALL REPORTS GENERATED SUCCESSFULLY!');
console.log('   ========================================\n');