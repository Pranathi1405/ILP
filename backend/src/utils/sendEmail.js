//Author : Sathvik Goli
//This Function helps to send mail to partivular user using nodemailer package. It is used in courses.service.js to send mail to teachers when they are assigned or unassigned from a subject.

import nodemailer from "nodemailer";

export const sendEmail = async ({to, subject, text, html}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // Use Gmail App Password (not account password)
    },
  });

  await transporter.sendMail({
    from: `"ILP Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
};