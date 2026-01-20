-- Content Distribution Architecture: Aurora Schema Update
-- Purpose: Add tracking for imported vs original content

-- Add source column to track whether content was imported or created by university
ALTER TABLE content_articles 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'original' 
CHECK (source IN ('imported', 'original'));

-- Add source_article_id to link back to Marketing CMS article (for imported content)
ALTER TABLE content_articles 
ADD COLUMN IF NOT EXISTS source_article_id UUID NULL;

-- Add comment for clarity
COMMENT ON COLUMN content_articles.source IS 'Type of content: "imported" from central library or "original" created by university';
COMMENT ON COLUMN content_articles.source_article_id IS 'ID of source article in Marketing CMS if imported, NULL if original';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_articles_source 
ON content_articles(source);

CREATE INDEX IF NOT EXISTS idx_content_articles_source_article_id 
ON content_articles(source_article_id);

-- Create index for common query pattern (university + status)
CREATE INDEX IF NOT EXISTS idx_content_articles_university_status 
ON content_articles(university_id, status);

-- Verify schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'content_articles'
AND column_name IN ('source', 'source_article_id')
ORDER BY ordinal_position;
