import { sendEmail } from "./sendEmail.js";

/**
 * AUTHORS: Preethi Deevanapelli
 * subjectEmails Utility
 * ==========================
 */

//send mail to subject assigned teacher
export const sendSubjectAssignmentEmail = async (data) => {
  const { teacherEmail, teacherName, subjectName, courseName } = data;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">New Subject Assigned</h2>
       
        <p>Hi ${teacherName},</p>
       
        <p>You have been assigned to teach <strong>${subjectName}</strong> as part of the course:</p>
       
        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${courseName}</h3>
          <p style="margin: 0;">Subject: <strong>${subjectName}</strong></p>
        </div>
       
        <p>Please log in to your dashboard to:</p>
        <ul>
          <li>Create modules for this subject</li>
          <li>Upload video lectures</li>
          <li>Create quizzes and assignments</li>
          <li>Add study materials</li>
        </ul>
       
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/teacher/dashboard"
             style="background: #4F46E5; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Access Dashboard
          </a>
        </div>
       
        <p style="color: #6B7280; font-size: 14px;">
          If you have any questions, contact admin at admin@ilp.com
        </p>
      </div>
    </body>
    </html>
  `;
 
  // await sendEmail({
  //   from: process.env.MAIL_FROM,
  //   to: teacherEmail,
  //   subject: `New Subject Assigned: ${subjectName}`,
  //   html
  // });
   console.log("Subject assignment email sent to:", teacherEmail);
};
 
//send mail to subject unassigned teacher
export const sendTeacherUnassignmentEmail = async (data) => {
  const { teacherEmail, teacherName, subjectName, courseName, reason } = data;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #DC2626;">Subject Assignment Changed</h2>
       
        <p>Hi ${teacherName},</p>
       
        <p>You have been unassigned from <strong>${subjectName}</strong> in the course "${courseName}".</p>
       
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
       
        <p>If you have any questions, please contact the admin.</p>
       
        <p style="color: #6B7280; font-size: 14px;">Admin Contact: admin@ilp.com</p>
      </div>
    </body>
    </html>
  `;
 
  // await sendEmail({
  //   from: process.env.MAIL_FROM,
  //   to: teacherEmail,
  //   subject: `Subject Assignment Removed: ${subjectName}`,
  //   html
  // });
  console.log("Subject Unassignment email sent to:", teacherEmail);
};
 