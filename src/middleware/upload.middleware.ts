import multer from "multer";

// Store files in memory as Buffers instead of saving them to disk
const storage = multer.memoryStorage();

export const uploadMemory = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit each image file size to 5MB max
  },
});