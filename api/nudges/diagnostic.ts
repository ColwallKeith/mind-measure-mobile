import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// Aurora Serverless v2 configuration
const getAuroraConfig = () => ({
  host: process.env.AWS_AURORA_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  let auroraClient: Client | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get('universityId') || 'worcester';

    // Connect to Aurora
    auroraClient = new Client(getAuroraConfig());
    await auroraClient.connect();

    // Check if nudges column exists
    const columnCheck = await auroraClient.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'universities' AND column_name = 'nudges'`
    );

    // Fetch university data
    const universityResult = await auroraClient.query(
      `SELECT id, name, slug, nudges FROM universities WHERE id = $1 OR slug = $1`,
      [universityId]
    );

    return NextResponse.json({
      success: true,
      universityId,
      columnExists: columnCheck.rows.length > 0,
      columnInfo: columnCheck.rows[0] || null,
      universityFound: universityResult.rows.length > 0,
      university: universityResult.rows[0] || null,
      nudges: universityResult.rows[0]?.nudges || null,
      nudgesType: typeof universityResult.rows[0]?.nudges,
      nudgesIsArray: Array.isArray(universityResult.rows[0]?.nudges),
      nudgesLength: Array.isArray(universityResult.rows[0]?.nudges) 
        ? universityResult.rows[0]?.nudges.length 
        : 'N/A',
    });
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Diagnostic failed',
      stack: error.stack 
    }, { status: 500 });
  } finally {
    if (auroraClient) {
      await auroraClient.end();
    }
  }
}
