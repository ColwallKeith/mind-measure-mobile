// API Endpoint: Run Aurora Migration
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const getAuroraClient = () => {
  return new Client({
    host: process.env.AWS_AURORA_HOST,
    port: parseInt(process.env.AWS_AURORA_PORT || '5432'),
    database: process.env.AWS_AURORA_DATABASE,
    user: process.env.AWS_AURORA_USERNAME,
    password: process.env.AWS_AURORA_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
};

export async function POST(request: NextRequest) {
  const client = getAuroraClient();
  
  try {
    await client.connect();
    
    const migration = `
      -- Add source column
      ALTER TABLE content_articles 
      ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'original' 
      CHECK (source IN ('imported', 'original'));

      -- Add source_article_id column
      ALTER TABLE content_articles 
      ADD COLUMN IF NOT EXISTS source_article_id UUID NULL;

      -- Add comments
      COMMENT ON COLUMN content_articles.source IS 'Type of content: "imported" from central library or "original" created by university';
      COMMENT ON COLUMN content_articles.source_article_id IS 'ID of source article in Marketing CMS if imported, NULL if original';

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_content_articles_source 
      ON content_articles(source);

      CREATE INDEX IF NOT EXISTS idx_content_articles_source_article_id 
      ON content_articles(source_article_id);

      CREATE INDEX IF NOT EXISTS idx_content_articles_university_status 
      ON content_articles(university_id, status);
    `;
    
    await client.query(migration);
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'content_articles'
      AND column_name IN ('source', 'source_article_id')
      ORDER BY ordinal_position
    `);
    
    await client.end();
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: result.rows,
    });
    
  } catch (error: any) {
    await client.end();
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
