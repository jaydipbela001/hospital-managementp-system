import multer from "multer";

const storage = multer.memoryStorage();

export const uploadSingleImage = (fieldName = "image") => {
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"), false);
      }
    },
  }).single(fieldName);
};

