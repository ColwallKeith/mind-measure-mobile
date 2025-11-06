import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'pg';

const dbConfig = {
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, universityId } = req.body;

  if (!userId || !universityId) {
    return res.status(400).json({ error: 'Missing userId or universityId' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('📊 Connected to database for user university update');

    // Update user's university assignment
    const updateQuery = `
      UPDATE profiles 
      SET university_id = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, university_id, first_name, last_name, email;
    `;

    const result = await client.query(updateQuery, [universityId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    console.log('✅ User university updated:', updatedUser);

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.email} updated to university ${universityId}`,
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Database update error:', error);
    res.status(500).json({ 
      error: 'Database update failed',
      details: (error as Error).message 
    });
  } finally {
    await client.end();
  }
}





