// //Vamshi
// import cron from "node-cron";
// import pool from "../config/database.config.js";

// cron.schedule("*/10 * * * *", async () => {
//   await pool.execute(
//     `UPDATE doubt_posts
//      SET status='closed'
//      WHERE status='open'
//      AND deadline_at < NOW()
//      AND first_teacher_reply_at IS NULL`
//   );
// });
