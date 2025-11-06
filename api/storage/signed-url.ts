import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.VITE_AWS_S3_BUCKET_NAME || 'mindmeasure-user-content-459338929203';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, expiresIn = 3600, bucket } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Get AWS credentials (prioritize standard AWS env vars)
    const accessKey = process.env.AWS_ACCESS_KEY_ID || process.env.VITE_AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.VITE_AWS_SECRET_ACCESS_KEY;
    
    if (!accessKey || !secretKey) {
      return res.status(500).json({ 
        error: 'AWS credentials not configured',
        details: 'Missing AWS access key or secret key in environment variables'
      });
    }

            // Configure AWS S3 client with fresh credentials (including session token for temporary credentials)
            const sessionToken = process.env.AWS_SESSION_TOKEN;
            const s3Client = new S3Client({
              region: 'eu-west-2', // Fixed region where all university buckets are created
              credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
                ...(sessionToken && { sessionToken })
              }
            });

    // Generate signed URL for accessing the file
    const command = new GetObjectCommand({
      Bucket: bucket || BUCKET_NAME,
      Key: path,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    res.status(200).json({
      success: true,
      url: signedUrl
    });

  } catch (error: any) {
    console.error('❌ Signed URL generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate signed URL',
      details: error.message 
    });
  }
}