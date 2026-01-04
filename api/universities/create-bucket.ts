import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutBucketVersioningCommand, PutBucketEncryptionCommand, PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';

const REGION = 'eu-west-2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { universitySlug, universityName } = req.body;

    if (!universitySlug) {
      return res.status(400).json({ error: 'University slug is required' });
    }

    // Generate bucket name: mindmeasure-{slug}
    const bucketName = `mindmeasure-${universitySlug.toLowerCase()}`;

    console.log(`🏗️ Creating S3 bucket for university: ${universityName || universitySlug}`);
    console.log(`📦 Bucket name: ${bucketName}`);

    // Configure S3 client
    const s3Client = new S3Client({
      region: REGION
    });

    // 1. Create the bucket
    const createCommand = new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: REGION
      }
    });

    await s3Client.send(createCommand);
    console.log('✅ Bucket created successfully');

    // 2. Configure CORS for web uploads
    const corsCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: [
              'https://admin.mindmeasure.co.uk',
              'https://mobile.mindmeasure.app',
              'http://localhost:3000',
              'http://localhost:5173'
            ],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    });

    await s3Client.send(corsCommand);
    console.log('✅ CORS configuration applied');

    // 3. Enable versioning
    const versioningCommand = new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    });

    await s3Client.send(versioningCommand);
    console.log('✅ Versioning enabled');

    // 4. Enable server-side encryption
    const encryptionCommand = new PutBucketEncryptionCommand({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            },
            BucketKeyEnabled: true
          }
        ]
      }
    });

    await s3Client.send(encryptionCommand);
    console.log('✅ Server-side encryption enabled');

    // 5. Block public access (security best practice)
    const publicAccessCommand = new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true
      }
    });

    await s3Client.send(publicAccessCommand);
    console.log('✅ Public access blocked (security configured)');

    // Return success response
    res.status(200).json({
      success: true,
      bucketName,
      region: REGION,
      message: `S3 bucket created successfully for ${universityName || universitySlug}`,
      bucketUrl: `https://${bucketName}.s3.${REGION}.amazonaws.com/`
    });

  } catch (error: any) {
    console.error('❌ Error creating university bucket:', error);

    // Handle specific AWS errors
    if (error.name === 'BucketAlreadyExists') {
      return res.status(409).json({ 
        error: 'Bucket already exists', 
        details: 'This bucket name is already taken by another AWS account'
      });
    } else if (error.name === 'BucketAlreadyOwnedByYou') {
      return res.status(200).json({
        success: true,
        message: 'Bucket already exists and is owned by you',
        bucketName: req.body.universitySlug ? `mindmeasure-${req.body.universitySlug.toLowerCase()}` : null
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to create university bucket', 
        details: error.message 
      });
    }
  }
}
