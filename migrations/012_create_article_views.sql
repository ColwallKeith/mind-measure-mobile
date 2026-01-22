-- Create table to track individual article view events
-- Enables 7-day rolling popularity calculations

CREATE TABLE IF NOT EXISTS article_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL,
  user_id UUID,
  university_id VARCHAR(50),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast 7-day lookups
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON article_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_article_views_university_id ON article_views(university_id);

-- Composite index for 7-day popularity queries
CREATE INDEX IF NOT EXISTS idx_article_views_7day ON article_views(article_id, viewed_at);

COMMENT ON TABLE article_views IS 'Tracks individual article view events for analytics and popularity ranking';
COMMENT ON COLUMN article_views.article_id IS 'References content_articles.id (UUID from Aurora)';
COMMENT ON COLUMN article_views.user_id IS 'Optional: track which user viewed (for personalization)';
COMMENT ON COLUMN article_views.university_id IS 'Track which university context the view occurred in';
COMMENT ON COLUMN article_views.viewed_at IS 'Timestamp of view (for 7-day rolling calculations)';
