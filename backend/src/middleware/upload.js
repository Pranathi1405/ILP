//Author - Vamshi
import multer from "multer";
import path from "path";
//used to store doubt-attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "src/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});