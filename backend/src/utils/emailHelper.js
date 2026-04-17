//Author : Sathvik Goli
//Email Templates for sending mails
import { sendEmail } from "./sendEmail.js";

export const createAndSendOtp = async (data) => {
  const { email, purpose, otp, expiresAt } = data;
  const html =`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ILP – OTP Verification</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@500&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'DM Sans',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#0f0f13;padding:48px 20px;">
    <tr><td align="center">

      <table width="520" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:520px;width:100%;">

        <!-- Logo Row -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;
                         font-weight:600;letter-spacing:3px;text-transform:uppercase;
                         color:#6366f1;">ILP PLATFORM</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#1a1a24;border-radius:20px;overflow:hidden;
                     border:1px solid #2a2a38;">

            <!-- Top accent line -->
            <div style="height:3px;background:linear-gradient(90deg,#6366f1,#a78bfa,#38bdf8);"></div>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

              <!-- Header -->
              <tr>
                <td style="padding:48px 48px 36px;text-align:center;">
                  <!-- Shield icon area -->
                  <div style="display:inline-block;width:72px;height:72px;
                               background:linear-gradient(135deg,#1e1e2e,#2a2a3e);
                               border-radius:20px;border:1px solid #3a3a52;
                               line-height:72px;font-size:32px;margin-bottom:24px;">
                    🔐
                  </div>
                  <h1 style="margin:0;color:#f1f5f9;font-size:24px;font-weight:600;
                              letter-spacing:-0.3px;line-height:1.3;">
                    Verify your identity
                  </h1>
                  <p style="margin:10px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
                    We received a request for <span style="color:#a78bfa;font-weight:500;">${purpose}</span>
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:0 48px;">
                <div style="height:1px;background:#2a2a38;"></div>
              </td></tr>

              <!-- OTP Block -->
              <tr>
                <td style="padding:40px 48px;text-align:center;">
                  <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;
                             font-weight:500;letter-spacing:2px;text-transform:uppercase;">
                    Your one-time passcode
                  </p>

                  <!-- OTP digits container -->
                  <div style="background:#0f0f13;border:1px solid #2a2a38;
                               border-radius:16px;padding:28px 32px;
                               display:inline-block;margin-bottom:24px;">
                    <span style="font-family:'DM Mono',monospace;font-size:40px;
                                 font-weight:500;letter-spacing:12px;
                                 color:#6366f1;display:inline-block;">
                      ${otp}
                    </span>
                  </div>

                  <!-- Expiry pill -->
                  <div style="display:inline-block;background:#1e1e2e;border:1px solid #2a2a38;
                               border-radius:100px;padding:8px 18px;">
                    <span style="font-size:13px;color:#94a3b8;">
                      ⏱ Expires in <strong style="color:#f1f5f9;">${expiresAt}</strong>
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:0 48px;">
                <div style="height:1px;background:#2a2a38;"></div>
              </td></tr>

              <!-- Warning -->
              <tr>
                <td style="padding:28px 48px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:#1e1a0e;border:1px solid #3d3010;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="margin:0;color:#fbbf24;font-size:13px;line-height:1.7;">
                          <strong>Never share this code.</strong>
                          <span style="color:#92836a;"> ILP team will never ask for your OTP via call or email.</span>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer note -->
              <tr>
                <td style="padding:0 48px 40px;text-align:center;">
                  <p style="margin:0;color:#3a3a52;font-size:12px;line-height:1.6;">
                    Didn't request this? You can safely ignore this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Bottom branding -->
        <tr>
          <td style="padding-top:28px;text-align:center;">
            <p style="margin:0;color:#3a3a52;font-size:12px;">
              © ${new Date().getFullYear()} ILP Platform · Interactive Learning Portal
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
 
  // await sendEmail({
  //   to: email,
  //   subject: `ILP OTP Verification – ${purpose}`,
  //   html
  // });
  console.log(`[OTP] ${purpose} OTP for ${email}: ${otp} ExpiresAt: ${expiresAt}`); // dev only
};

export const sendResetLink = async (data) => {
  const { email, resetLink, expiresAt } = data;
  const html =`
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password – ILP</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:'Sora',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#fafaf9;padding:48px 20px;">
    <tr><td align="center">

      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td style="padding-bottom:32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:8px;">
              <div style="width:32px;height:32px;background:#111;border-radius:8px;
                           display:inline-block;line-height:32px;text-align:center;
                           font-size:16px;">⚡</div>
              <span style="font-size:15px;font-weight:700;color:#111;letter-spacing:-0.3px;">
                ILP Platform
              </span>
            </div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:24px;
                     box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.06);
                     overflow:hidden;">

            <!-- Decorative top -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:linear-gradient(135deg,#111 0%,#1e1e2e 100%);
                           padding:52px 52px 48px;text-align:center;
                           position:relative;">

                  <!-- Subtle grid pattern via borders -->
                  <div style="width:80px;height:80px;margin:0 auto 24px;
                               background:rgba(255,255,255,0.05);
                               border-radius:24px;
                               border:1px solid rgba(255,255,255,0.1);
                               line-height:80px;font-size:36px;">🔑</div>

                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                              letter-spacing:-0.5px;">
                    Password Reset
                  </h1>
                  <p style="margin:10px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                    A reset was requested for your ILP account
                  </p>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:44px 52px;">

                  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                    We received a request to reset the password for your account.
                    Click the button below to create a new password. This link is single-use and time-limited.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="margin-bottom:32px;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}"
                           style="display:inline-block;background:#111;color:#fff;
                                  text-decoration:none;padding:16px 44px;
                                  border-radius:12px;font-size:15px;font-weight:600;
                                  letter-spacing:-0.2px;">
                          Reset my password →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Expiry note -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:#f8f8f7;border-radius:12px;margin-bottom:28px;
                                border:1px solid #ebebea;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="font-size:18px;padding-right:12px;vertical-align:middle;">⏳</td>
                            <td style="color:#6b7280;font-size:13px;line-height:1.6;vertical-align:middle;">
                              This link expires in <strong style="color:#111;">${expiresAt}</strong>.
                              After that, you'll need to request a new one.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback URL -->
                  <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;font-weight:500;
                             text-transform:uppercase;letter-spacing:1px;">
                    Or copy this link
                  </p>
                  <div style="background:#f8f8f7;border:1px solid #ebebea;border-radius:10px;
                               padding:12px 16px;word-break:break-all;
                               font-family:monospace;font-size:12px;color:#6b7280;">
                    ${resetLink}
                  </div>

                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:0 52px;">
                <div style="height:1px;background:#f3f4f6;"></div>
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="padding:24px 52px;">
                  <p style="margin:0;color:#d1d5db;font-size:12px;line-height:1.6;text-align:center;">
                    If you didn't request this, no action is needed. Your password won't change.<br/>
                    © ${new Date().getFullYear()} ILP Platform. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
    `
 
//   await sendEmail({
//     to: email,
//     subject: `eGradTutor Reset Password Link`,
//     html
//   });
  console.log(resetLink);
};

export const credentailsEmail = async( requiredData ) =>{
    const {data, tempPassword } = requiredData;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to ILP – Your Account is Ready</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Plus Jakarta Sans',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f5f3ff;padding:48px 20px;">
    <tr><td align="center">

      <table width="580" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:580px;width:100%;">

        <!-- Hero Card -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%);
                     border-radius:24px 24px 0 0;padding:52px 52px 44px;
                     text-align:center;overflow:hidden;position:relative;">

            <!-- Decorative circles -->
            <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                         background:rgba(255,255,255,0.05);border-radius:50%;"></div>
            <div style="position:absolute;bottom:-60px;left:-30px;width:200px;height:200px;
                         background:rgba(255,255,255,0.04);border-radius:50%;"></div>

            <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;
                       letter-spacing:3px;text-transform:uppercase;font-weight:600;">
              ILP PLATFORM
            </p>
            <h1 style="margin:16px 0 0;color:#ffffff;font-size:32px;font-weight:800;
                        letter-spacing:-0.5px;line-height:1.2;">
              Welcome aboard,<br/>
              <span style="color:#e9d5ff;">${data.first_name}! 🎉</span>
            </h1>
            <p style="margin:14px 0 0;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;">
              Your teacher account is set up and ready to go.
            </p>

          </td>
        </tr>

        <!-- White body card -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 24px 24px;
                     box-shadow:0 16px 48px rgba(79,70,229,0.12);overflow:hidden;">

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

              <!-- Greeting -->
              <tr>
                <td style="padding:44px 52px 0;">
                  <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
                    Dear <strong style="color:#111;">${data.first_name} ${data.last_name}</strong>,
                    your account has been created on the Interactive Learning Portal. Below are your login credentials — please keep them safe.
                  </p>
                </td>
              </tr>

              <!-- Credentials Box -->
              <tr>
                <td style="padding:28px 52px;">

                  <!-- Box header -->
                  <div style="border-radius:16px 16px 0 0;background:#4f46e5;
                               padding:14px 24px;">
                    <span style="color:#fff;font-size:12px;font-weight:700;
                                 letter-spacing:2px;text-transform:uppercase;">
                      🔐 Login Credentials
                    </span>
                  </div>

                  <!-- Box body -->
                  <div style="border:2px solid #4f46e5;border-top:none;
                               border-radius:0 0 16px 16px;overflow:hidden;">

                    <!-- Email row -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr style="border-bottom:1px solid #f3f4f6;">
                        <td width="110" style="padding:16px 20px;background:#fafafa;
                                                color:#9ca3af;font-size:11px;font-weight:700;
                                                text-transform:uppercase;letter-spacing:1px;
                                                vertical-align:middle;">
                          Email
                        </td>
                        <td style="padding:16px 20px;color:#4f46e5;font-size:14px;
                                   font-weight:600;vertical-align:middle;">
                          ${data.email}
                        </td>
                      </tr>
                      <tr style="border-bottom:1px solid #f3f4f6;">
                        <td width="110" style="padding:16px 20px;background:#fafafa;
                                                color:#9ca3af;font-size:11px;font-weight:700;
                                                text-transform:uppercase;letter-spacing:1px;
                                                vertical-align:middle;">
                          Password
                        </td>
                        <td style="padding:16px 20px;vertical-align:middle;">
                          <span style="font-family:monospace;font-size:16px;font-weight:700;
                                       color:#111;background:#f5f3ff;padding:6px 14px;
                                       border-radius:8px;letter-spacing:1px;display:inline-block;">
                            ${tempPassword}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td width="110" style="padding:16px 20px;background:#fafafa;
                                                color:#9ca3af;font-size:11px;font-weight:700;
                                                text-transform:uppercase;letter-spacing:1px;
                                                vertical-align:middle;">
                          Dept.
                        </td>
                        <td style="padding:16px 20px;color:#374151;font-size:14px;
                                   vertical-align:middle;">
                          ${data.department || 'Not Assigned'}
                        </td>
                      </tr>
                    </table>

                  </div>

                </td>
              </tr>

              <!-- Warning strip -->
              <tr>
                <td style="padding:0 52px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;">
                    <tr>
                      <td style="padding:14px 18px;">
                        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                          <strong>Temporary password:</strong> You'll be prompted to change this on first login. Never share your credentials with anyone.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td style="padding:0 52px 36px;text-align:center;">
                  <a href="${process.env.FRONTEND_URL}/login"
                     style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                            color:#fff;text-decoration:none;padding:16px 44px;
                            border-radius:12px;font-size:15px;font-weight:700;
                            letter-spacing:-0.2px;">
                    Login to ILP Platform →
                  </a>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:0 52px;">
                <div style="height:1px;background:#f3f4f6;"></div>
              </td></tr>

              <!-- What you can do -->
              <tr>
                <td style="padding:32px 52px;">
                  <p style="margin:0 0 20px;color:#111;font-size:14px;font-weight:700;
                             letter-spacing:-0.2px;">
                    Here's what you can do on ILP:
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding-bottom:14px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="width:36px;height:36px;background:#ede9fe;border-radius:10px;
                                       text-align:center;vertical-align:middle;font-size:16px;">📚</td>
                            <td style="padding-left:14px;vertical-align:middle;">
                              <strong style="color:#111;font-size:14px;">Create &amp; Manage Courses</strong>
                              <span style="color:#9ca3af;font-size:13px;"> — videos, materials, modules</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:14px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="width:36px;height:36px;background:#ede9fe;border-radius:10px;
                                       text-align:center;vertical-align:middle;font-size:16px;">🎯</td>
                            <td style="padding-left:14px;vertical-align:middle;">
                              <strong style="color:#111;font-size:14px;">Quizzes &amp; Assessments</strong>
                              <span style="color:#9ca3af;font-size:13px;"> — build tests, track scores</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:14px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="width:36px;height:36px;background:#ede9fe;border-radius:10px;
                                       text-align:center;vertical-align:middle;font-size:16px;">🎥</td>
                            <td style="padding-left:14px;vertical-align:middle;">
                              <strong style="color:#111;font-size:14px;">Schedule Live Classes</strong>
                              <span style="color:#9ca3af;font-size:13px;"> — host interactive sessions</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="width:36px;height:36px;background:#ede9fe;border-radius:10px;
                                       text-align:center;vertical-align:middle;font-size:16px;">💬</td>
                            <td style="padding-left:14px;vertical-align:middle;">
                              <strong style="color:#111;font-size:14px;">Answer Student Doubts</strong>
                              <span style="color:#9ca3af;font-size:13px;"> — respond and guide</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#fafafa;border-top:1px solid #f3f4f6;
                           padding:24px 52px;text-align:center;">
                  <p style="margin:0;color:#d1d5db;font-size:12px;line-height:1.6;">
                    This is an automated message. Please do not reply directly.<br/>
                    © ${new Date().getFullYear()} ILP Platform. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
`;

    // await sendEmail({
    //     to : data.email,
    //     subject: 'Welcome to ILP Platform - Your Teacher Account is Ready!',
    //     html
    // })
}

export const sendAdminInvitation = async(data) =>{
    const { email, invitationLink, expiresAt} = data;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin Invitation – ILP Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Manrope',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#09090b;padding:48px 20px;">
    <tr><td align="center">

      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:560px;width:100%;">

        <!-- Top bar -->
        <tr>
          <td style="padding-bottom:36px;text-align:center;">
            <span style="color:#52525b;font-size:12px;font-weight:600;
                         letter-spacing:3px;text-transform:uppercase;">
              ILP · INTERACTIVE LEARNING PORTAL
            </span>
          </td>
        </tr>

        <!-- Main Card -->
        <tr>
          <td style="background:#18181b;border:1px solid #27272a;
                     border-radius:20px;overflow:hidden;">

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

              <!-- Hero section with badge -->
              <tr>
                <td style="padding:52px 52px 44px;text-align:center;
                           border-bottom:1px solid #27272a;">

                  <!-- Badge -->
                  <div style="display:inline-block;background:#18181b;
                               border:1px solid #3f3f46;border-radius:100px;
                               padding:6px 16px;margin-bottom:28px;">
                    <span style="font-size:12px;color:#a1a1aa;font-weight:600;
                                 letter-spacing:1px;text-transform:uppercase;">
                      🛡️ Admin Access Granted
                    </span>
                  </div>

                  <h1 style="margin:0;color:#fafafa;font-size:28px;font-weight:800;
                              letter-spacing:-0.5px;line-height:1.25;">
                    You're invited to lead<br/>
                    <span style="color:#a78bfa;">the ILP Platform</span>
                  </h1>

                  <p style="margin:16px 0 0;color:#71717a;font-size:14px;line-height:1.7;
                             max-width:380px;margin-left:auto;margin-right:auto;">
                    As an administrator, you'll manage users, oversee platform activities, and control system operations.
                  </p>

                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 52px;">

                  <!-- What you get - three pillars -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="margin-bottom:36px;">
                    <tr>
                      <td width="33%" style="padding:0 6px 0 0;vertical-align:top;">
                        <div style="background:#1c1c1f;border:1px solid #27272a;
                                     border-radius:12px;padding:20px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">👥</div>
                          <p style="margin:0;color:#d4d4d8;font-size:12px;font-weight:700;
                                     text-transform:uppercase;letter-spacing:0.5px;">
                            Manage Users
                          </p>
                        </div>
                      </td>
                      <td width="33%" style="padding:0 3px;vertical-align:top;">
                        <div style="background:#1c1c1f;border:1px solid #27272a;
                                     border-radius:12px;padding:20px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">⚙️</div>
                          <p style="margin:0;color:#d4d4d8;font-size:12px;font-weight:700;
                                     text-transform:uppercase;letter-spacing:0.5px;">
                            System Control
                          </p>
                        </div>
                      </td>
                      <td width="33%" style="padding:0 0 0 6px;vertical-align:top;">
                        <div style="background:#1c1c1f;border:1px solid #27272a;
                                     border-radius:12px;padding:20px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">📊</div>
                          <p style="margin:0;color:#d4d4d8;font-size:12px;font-weight:700;
                                     text-transform:uppercase;letter-spacing:0.5px;">
                            Analytics
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <a href="${invitationLink}"
                           style="display:inline-block;
                                  background:linear-gradient(135deg,#6d28d9,#7c3aed);
                                  color:#ffffff;text-decoration:none;
                                  padding:16px 48px;border-radius:12px;
                                  font-size:15px;font-weight:700;
                                  letter-spacing:-0.2px;">
                          Accept Invitation →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info note -->
                  <div style="background:#1c1c1f;border:1px solid #27272a;border-radius:12px;
                               padding:18px 22px;margin-bottom:24px;">
                    <p style="margin:0;color:#71717a;font-size:13px;line-height:1.7;">
                      Once accepted, you'll set up your credentials and gain access to the admin dashboard immediately.
                    </p>
                  </div>

                  <!-- Security warning -->
                  <div style="background:#1a0f0f;border:1px solid #3d1515;border-radius:12px;
                               padding:14px 18px;margin-bottom:28px;">
                    <p style="margin:0;color:#fca5a5;font-size:13px;line-height:1.6;">
                      🔒 <strong>Security:</strong>
                      <span style="color:#dc2626;"> This link is confidential and expires in <strong style="color:#ffffff;">${expiresAt}</strong>. Do not share it.</span>
                    </p>
                  </div>

                  <!-- Fallback link -->
                  <p style="margin:0 0 10px;color:#52525b;font-size:11px;
                             font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                    Backup link
                  </p>
                  <div style="background:#1c1c1f;border:1px solid #27272a;border-radius:10px;
                               padding:12px 16px;word-break:break-all;">
                    <span style="font-family:monospace;font-size:12px;color:#6366f1;">
                      ${invitationLink}
                    </span>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="border-top:1px solid #27272a;padding:24px 52px;text-align:center;">
                  <p style="margin:0;color:#3f3f46;font-size:12px;line-height:1.6;">
                    Didn't expect this? Ignore this email — your account remains unchanged.<br/>
                    © ${new Date().getFullYear()} ILP Platform. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
      `
    //   await sendEmail({
    //     to:email,
    //     subject:'You are invited to join ILP Platform as an Admin',
    //     html
    //   })
} 