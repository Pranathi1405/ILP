//Author : Sathvik Goli
//Used to Clean Up Database for every ten minutes
import cron from 'node-cron';
import pool from '../config/database.config.js';

cron.schedule('*/10 * * * *', async () => {
  console.log('Running daily cleanup task for expired OTPs and tokens...');
  try {
    await pool.execute('DELETE FROM otp_verification WHERE expires_at < NOW()');
    await pool.execute('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    await pool.execute(
      'DELETE FROM users where is_email_verified = false and created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    await pool.execute('DELETE FROM password_resets WHERE expires_at < NOW()');
    await pool.execute('DELETE FROM admin_invitations WHERE expires_at < NOW()');
    await pool.execute('DELETE FROM refresh_tokens WHERE is_revoked=1');
    await pool.execute('DELETE FROM activity_logs WHERE created_at + INTERVAL 7 DAY < NOW()');
    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
});