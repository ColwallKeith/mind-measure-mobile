# Article View Tracking System - Implementation Complete

## Overview
Comprehensive article view tracking system for Mind Measure's content distribution, enabling data-driven Featured Article selection based on 7-day rolling popularity.

## Components Implemented

### 1. Database Schema (`/mind-measure-mobile-final`)
**File:** `migrations/012_create_article_views.sql`
- New `article_views` table for tracking individual view events
- Columns: `id`, `article_id`, `user_id`, `university_id`, `viewed_at`
- Indexes for fast 7-day lookups and popularity queries
- Supports anonymous tracking (user_id optional)

### 2. Mobile App View Tracking (`/mind-measure-mobile-final`)

#### API Endpoint
**File:** `api/content/track-view.ts`
- POST endpoint to record article views
- Body: `{ articleId, userId?, universityId }`
- Increments `content_articles.view_count` (lifetime total)
- Inserts timestamped event in `article_views` (for 7-day calculations)

#### Frontend Integration
**File:** `src/components/mobile/ArticleDetailPage.tsx`
- Added `useEffect` hook to track views on component mount
- Calls `/api/content/track-view` when article opens
- Passes article ID, user ID, and university ID
- Silent failure (doesn't interrupt user experience)

### 3. Marketing CMS Featured Article (`/mind-measure-marketing-cms`)

#### API Endpoint
**File:** `app/api/content/featured-article/route.ts`
- GET endpoint to fetch most popular article in last 7 days
- Queries `content_articles` joined with `article_views`
- Filters: published, shared/imported articles only
- Orders by view count (DESC), then publish date (DESC)
- Returns article with `views_last_7_days` count

#### Frontend Integration
**File:** `app/university/content/magazine/page.tsx`
- Added `featuredArticle` state variable
- Fetches from `/api/content/featured-article` on page load
- Displays as "Featured Article" in magazine layout
- Fallback to first shared article if no views data

### 4. Migration Helper (`/mind-measure-mobile-final`)
**File:** `api/admin/run-migration-012.ts`
- POST endpoint to execute migration 012
- Creates `article_views` table in Aurora
- Sets up all necessary indexes

## Key Features

### Privacy-Conscious
- User ID is optional (supports anonymous tracking)
- No PII stored in view tracking
- University-scoped analytics available

### Performance Optimized
- Composite index on `(article_id, viewed_at)` for 7-day queries
- Separate indexes on `article_id`, `viewed_at`, `university_id`
- Efficient COUNT with JOIN in featured article query

### Accurate Metrics
- **Lifetime views:** `content_articles.view_count` (simple counter)
- **Rolling 7-day views:** Calculated from `article_views` timestamps
- Featured Article uses 7-day window for relevancy

### Fallback Strategy
- If no articles have views in last 7 days, returns NULL
- Frontend falls back to first shared article
- Graceful degradation ensures UI never breaks

## Data Flow

```
Student opens article
  ↓
ArticleDetailPage.tsx useEffect fires
  ↓
POST /api/content/track-view
  ↓
Insert into article_views (timestamped event)
  ↓
Increment content_articles.view_count
  ↓
Return success
```

```
Marketing CMS magazine page loads
  ↓
GET /api/content/featured-article
  ↓
Query: SELECT COUNT(av.id) WHERE av.viewed_at >= NOW() - INTERVAL '7 days'
  ↓
GROUP BY article, ORDER BY count DESC
  ↓
Return top article with views_last_7_days
  ↓
Display as Featured Article
```

## SQL Queries

### Track View (Write)
```sql
-- Insert event
INSERT INTO article_views (article_id, user_id, university_id, viewed_at)
VALUES ($1, $2, $3, NOW());

-- Increment counter
UPDATE content_articles 
SET view_count = view_count + 1 
WHERE id = $1;
```

### Get Featured Article (Read)
```sql
SELECT 
  ca.id, ca.title, ca.excerpt, ca.featured_image,
  ca.category_id, ca.university_id, ca.author,
  ca.read_time, ca.published_at,
  COUNT(av.id) as views_last_7_days
FROM content_articles ca
LEFT JOIN article_views av 
  ON ca.id = av.article_id 
  AND av.viewed_at >= NOW() - INTERVAL '7 days'
WHERE 
  ca.status = 'published'
  AND ca.source IN ('imported', 'shared')
GROUP BY ca.id
ORDER BY views_last_7_days DESC, ca.published_at DESC
LIMIT 1;
```

## Deployment Steps

### 1. Mobile App
```bash
cd /mind-measure-mobile-final
git add -A
git commit -m "feat: Implement article view tracking system"
git push origin main
```

### 2. Marketing CMS
```bash
cd /mind-measure-marketing-cms
git add -A
git commit -m "feat: Add featured article based on 7-day view count"
git push origin main
```

### 3. Run Migration
After both deployments complete:
```bash
curl -X POST https://mobile.mindmeasure.app/api/admin/run-migration-012
```

Expected response:
```json
{
  "success": true,
  "message": "Migration 012 (article_views table) executed successfully"
}
```

## Testing Checklist

- [ ] Open several articles in mobile app at https://mobile.mindmeasure.app
- [ ] Check console logs for "📊 Tracked view for article: [title]"
- [ ] Verify `article_views` table populates in Aurora
- [ ] Verify `content_articles.view_count` increments
- [ ] Wait 1 minute, refresh Marketing CMS magazine page
- [ ] Verify "Featured Article" shows most-viewed article
- [ ] Check browser console for "[Featured Article] Loaded: [title] (X views in 7 days)"
- [ ] Test with no views (should fallback to first shared article)
- [ ] Test university-scoped analytics (query `article_views` by `university_id`)

## Future Enhancements

1. **University-Specific Featured Articles:** Allow each university to see their own "top article"
2. **Category-Based Rankings:** Most popular in each category (Anxiety, Sleep, etc.)
3. **User Engagement Metrics:** Track time spent reading, scroll depth
4. **A/B Testing:** Track which thumbnails/titles get more clicks
5. **Analytics Dashboard:** Visualize view trends over time in admin panel
6. **Unique User Tracking:** Use user_id to count unique viewers (not just page views)
7. **Auto-Cleanup:** Archive old `article_views` records (>90 days) for performance

## Files Changed

### Mobile App
- `migrations/012_create_article_views.sql` (NEW)
- `api/content/track-view.ts` (NEW)
- `api/admin/run-migration-012.ts` (NEW)
- `src/components/mobile/ArticleDetailPage.tsx` (MODIFIED)

### Marketing CMS
- `app/api/content/featured-article/route.ts` (NEW)
- `app/university/content/magazine/page.tsx` (MODIFIED)

## Status
✅ **COMPLETE** - Ready for deployment and testing
