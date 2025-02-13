import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.access_key_id!,
      secretAccessKey: config.aws.secret_access_key!,
    },
  });

  const getPublicUrl = (fileKey: string): string => {
    return `https://${config.aws.bucket_name}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;
  };
  

  const uploadToS3 = async (
    file: Express.Multer.File,
    folder: 'applications' | 'vendors' | 'customers' | 'services',
  ): Promise<string> => {
    const fileKey = `${folder}/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: config.aws.bucket_name!,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
  
    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      return getPublicUrl(fileKey);
    } catch (error) {

      console.error('Error uploading to S3:', error);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to upload file to S3');
    }
  };

// Utility function to delete files from S3
export const deleteFromS3 = async (fileKey: string): Promise<void> => {
    const params = {
      Bucket: config.aws.bucket_name!,
      Key: fileKey,
    };
  
    try {
      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);
      console.log(`File deleted successfully: ${fileKey}`);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  };




// Function to upload multiple files to S3
const uploadMultipleFilesToS3 = async (
  files: Express.Multer.File[], // An array of files
  folder: string // The folder in S3 where files will be uploaded
): Promise<string[]> => {
  // Generate upload promises for each file
  const uploadPromises = files.map(async (file) => {
    const fileKey = `${folder}/${Date.now()}-${file.originalname}`; // S3 key with folder and filename

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileKey,
      Body: file.buffer, // Upload file from buffer (memory storage)
      ContentType: file.mimetype,
     
    };

    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command); // Upload file to S3
      return getPublicUrl(fileKey); // Return the public URL of the uploaded file
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error("Failed to upload file to S3");
    }
  });


  const fileUrls = await Promise.all(uploadPromises);

  return fileUrls; // Return array of URLs of all uploaded files
};


  export const S3Helper = {
    uploadToS3,
    deleteFromS3,
    uploadMultipleFilesToS3
  };