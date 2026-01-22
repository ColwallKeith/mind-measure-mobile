import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: NextRequest) {
  let auroraClient: Client | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get('universityId');

    if (!universityId) {
      return NextResponse.json({ error: 'universityId is required' }, { status: 400 });
    }

    // Connect to Aurora using same pattern as working endpoints
    auroraClient = new Client({
      host: process.env.AWS_AURORA_HOST,
      port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
      database: process.env.AWS_AURORA_DATABASE,
      user: process.env.AWS_AURORA_USERNAME,
      password: process.env.AWS_AURORA_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    await auroraClient.connect();

    // Fetch university nudges
    const result = await auroraClient.query(
      `SELECT nudges FROM universities WHERE id = $1`,
      [universityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ nudges: [] });
    }

    const allNudges = result.rows[0].nudges || [];
    
    // Filter active, non-expired nudges
    const now = new Date();
    const activeNudges = allNudges.filter((nudge: any) => {
      if (nudge.status !== 'active') return false;
      if (nudge.expiryDate && new Date(nudge.expiryDate) < now) return false;
      return true;
    });

    // Separate pinned and rotation
    const pinned = activeNudges.find((n: any) => n.isPinned) || null;
    const rotation = activeNudges.filter((n: any) => !n.isPinned);

    // Weight rotation by priority
    const weightedRotation = rotation.flatMap((nudge: any) => {
      const weight = nudge.priority === 'high' ? 3 : nudge.priority === 'low' ? 0.5 : 1;
      return Array(Math.ceil(weight)).fill(nudge);
    });

    // Randomly select one from rotation
    const rotated = weightedRotation.length > 0
      ? weightedRotation[Math.floor(Math.random() * weightedRotation.length)]
      : null;

    return NextResponse.json({
      success: true,
      pinned,
      rotated,
    });
  } catch (error: any) {
    console.error('Error fetching active nudges:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch nudges' }, { status: 500 });
  } finally {
    if (auroraClient) {
      await auroraClient.end();
    }
  }
}
