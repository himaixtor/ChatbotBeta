/**
 * Multer config for file uploads (chat attachments and training documents).
 */
const multer = require('multer');

const MAX_FILE_SIZE_CHAT = 5 * 1024 * 1024;
const MAX_FILE_SIZE_TRAINING = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES_CHAT = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_MIME_TYPES_TRAINING = new Set([
  // Text
  'text/plain',
  'text/markdown',
  'text/html',
  'application/pdf',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Spreadsheets
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  // Documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Chat upload - strict, small files
const uploadChat = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_CHAT, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES_CHAT.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image or PDF files are allowed'));
  },
});

// Training upload - flexible, large files
const uploadTraining = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_TRAINING, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES_TRAINING.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('File type not supported for training'));
  },
});

module.exports = {
  upload: uploadChat,
  uploadTraining,
  MAX_FILE_SIZE_CHAT,
  MAX_FILE_SIZE_TRAINING,
  ALLOWED_MIME_TYPES_CHAT,
  ALLOWED_MIME_TYPES_TRAINING,
};
