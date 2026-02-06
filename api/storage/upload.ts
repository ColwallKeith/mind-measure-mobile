import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import formidable from 'formidable';
import fs from 'fs';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.VITE_AWS_S3_BUCKET_NAME || 'mindmeasure-user-content-459338929203';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use AWS SDK default credential resolution (should work with Vercel's AWS environment)
  // Ensure we use the correct region where buckets were created
  const s3Client = new S3Client({
    region: 'eu-west-2' // Fixed region where all university buckets are created
  });

  try {
    // Parse the uploaded file
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
      allowEmptyFiles: false,
      minFileSize: 1, // Require at least 1 byte
    });

    const [fields, files] = await form.parse(req) as [any, any];
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = Array.isArray(fields.filePath) ? fields.filePath[0] : fields.filePath;
    const bucket = Array.isArray(fields.bucket) ? fields.bucket[0] : fields.bucket;
    
    if (!file || !filePath) {
      console.error('❌ Missing file or filePath:', { hasFile: !!file, filePath });
      return res.status(400).json({ error: 'File and file path are required' });
    }
    
    if (!file.size || file.size === 0) {
      console.error('❌ File is empty:', { size: file.size, name: file.originalFilename });
      return res.status(400).json({ error: 'File is empty or invalid' });
    }

    // Read the file content
    const fileContent = fs.readFileSync(file.filepath);
    
    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket || BUCKET_NAME,
      Key: filePath,
      Body: fileContent,
      ContentType: file.mimetype || 'application/octet-stream',
      CacheControl: 'max-age=3600', // 1 hour cache
    });

    await s3Client.send(uploadCommand);

    // Generate a signed URL for accessing the file
    const getCommand = new GetObjectCommand({
      Bucket: bucket || BUCKET_NAME,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      success: true,
      data: {
        path: filePath,
        url: signedUrl,
        bucket: bucket || BUCKET_NAME
      }
    });

  } catch (error: any) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      details: error.message 
    });
  }
}