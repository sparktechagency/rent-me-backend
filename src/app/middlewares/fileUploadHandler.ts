import { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import ApiError from '../../errors/ApiError';

/**
 * File upload handler middleware
 */
const fileUploadHandler = () => {
  // Configure storage
  const storage = multer.memoryStorage(); // Store files in memory as buffers

  // File filter
  const filterFilter = async (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    try {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const allowedMediaTypes = ['video/mp4', 'audio/mpeg'];
      const allowedDocTypes = ['application/pdf'];

      if (
        ['image', 'license', 'signature', 'businessProfile'].includes(
          file.fieldname
        )
      ) {
        if (allowedImageTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              'Only .jpeg, .png, .jpg file supported'
            )
          );
        }
      } else if (file.fieldname === 'media') {
        if (allowedMediaTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              'Only .mp4, .mp3 file supported'
            )
          );
        }
      } else if (file.fieldname === 'doc') {
        if (allowedDocTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only pdf supported'));
        }
      } else {
        cb(new ApiError(StatusCodes.BAD_REQUEST, 'This file is not supported'));
      }
    } catch (error) {
      cb(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'File validation failed'));
    }
  };

  // Configure multer
  const upload = multer({
    storage: storage,
    fileFilter: filterFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB (adjust as needed)
      files: 10, // Maximum number of files allowed
    },
  }).fields([
    { name: 'image', maxCount: 5 },
    { name: 'media', maxCount: 3 },
    { name: 'doc', maxCount: 3 },
    { name: 'license', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
    { name: 'businessProfile', maxCount: 1 },
  ]);

  return upload;
};

export default fileUploadHandler;