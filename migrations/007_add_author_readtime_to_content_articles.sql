-- Migration 007: Add author and read_time to content_articles
-- This supports displaying article metadata from Marketing CMS in the mobile app

ALTER TABLE content_articles 
  ADD COLUMN IF NOT EXISTS author VARCHAR(255),
  ADD COLUMN IF NOT EXISTS read_time INTEGER DEFAULT 5;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_articles_author ON content_articles(author);

COMMENT ON COLUMN content_articles.author IS 'Article author name (from Marketing CMS)';
COMMENT ON COLUMN content_articles.read_time IS 'Estimated reading time in minutes (calculated from word count)';
