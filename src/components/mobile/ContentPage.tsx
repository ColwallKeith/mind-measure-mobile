import { useState, useEffect } from 'react';
import { ArticleDetailPage } from './ArticleDetailPage';
import { getHelpArticles } from '../../features/mobile/data';
import type { ContentArticle as CMSArticle } from '../../features/cms/data';

interface ContentArticle {
  id: string;
  category: 'Anxiety' | 'Sleep' | 'Stress' | 'Relationships' | 'Exercise' | 'Study';
  title: string;
  description: string;
  readTime: number;
  isNew?: boolean;
  thumbnail: string;
  fullContent: string;
  author?: string;
  publishDate?: string;
}

interface ContentPageProps {
  universityName?: string;
  universityLogo?: string;
}

export function ContentPage({
  universityName = 'University of Worcester',
  universityLogo
}: ContentPageProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<ContentArticle | null>(null);
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Load articles from CMS on mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const cmsArticles = await getHelpArticles();
      
      // Map CMS articles to ContentPage format
      const mappedArticles: ContentArticle[] = cmsArticles.map((article: CMSArticle) => ({
        id: article.id,
        category: mapCategory(article.category?.slug),
        title: article.title,
        description: article.excerpt || '',
        readTime: 5, // TODO: Calculate from content
        isNew: isRecent(article.published_at),
        thumbnail: article.featured_image || 'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1080',
        fullContent: article.content,
        author: 'Student Wellbeing Team',
        publishDate: article.published_at ? new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      }));

      setArticles(mappedArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]); // Show empty state on error
    } finally {
      setLoading(false);
    }
  };

  // Helper: Map CMS category slugs to ContentPage categories
  const mapCategory = (slug?: string): ContentArticle['category'] => {
    const mapping: Record<string, ContentArticle['category']> = {
      'anxiety': 'Anxiety',
      'sleep': 'Sleep',
      'stress': 'Stress',
      'relationships': 'Relationships',
      'exercise': 'Exercise',
      'study': 'Study',
    };
    return mapping[slug?.toLowerCase() || ''] || 'Study';
  };

  // Helper: Check if article is recent (within 7 days)
  const isRecent = (publishedAt?: string): boolean => {
    if (!publishedAt) return false;
    const publishDate = new Date(publishedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  const filters = ['All', 'Stress', 'Sleep', 'Study', 'Relationships', 'Exercise', 'Anxiety'];

  const filteredArticles = activeFilter === 'All' 
    ? articles 
    : articles.filter(article => article.category === activeFilter);

  const newArticlesCount = articles.filter(a => a.isNew).length;

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E0E0E0',
            borderTopColor: '#5B8FED',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#666666', fontSize: '14px' }}>Loading articles...</p>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      'Anxiety': { bg: '#FEE2E2', text: '#DC2626', icon: '#EF4444' },
      'Sleep': { bg: '#E0E7FF', text: '#4338CA', icon: '#6366F1' },
      'Stress': { bg: '#FED7E2', text: '#BE185D', icon: '#EC4899' },
      'Relationships': { bg: '#D1FAE5', text: '#065F46', icon: '#10B981' },
      'Exercise': { bg: '#FFE4E6', text: '#BE123C', icon: '#F43F5E' },
      'Study': { bg: '#DBEAFE', text: '#1E40AF', icon: '#3B82F6' }
    };
    return colors[category] || { bg: '#F3F4F6', text: '#4B5563', icon: '#6B7280' };
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      'Anxiety': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
      ),
      'Sleep': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      ),
      'Stress': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/>
        </svg>
      ),
      'Relationships': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      'Exercise': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5l11 11M6.5 17.5l11-11M2 12h4m16 0h-4M12 2v4m0 16v-4"/>
        </svg>
      ),
      'Study': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      )
    };
    return icons[category] || null;
  };

  // If an article is selected, show detail view
  if (selectedArticle) {
    return (
      <ArticleDetailPage 
        article={selectedArticle} 
        onBack={() => setSelectedArticle(null)}
        universityName={universityName}
        universityLogo={universityLogo}
      />
    );
  }

  // Otherwise show article list
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {/* University Branding */}
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            {universityLogo && (
              <img 
                src={universityLogo} 
                alt={universityName} 
                style={{
                  maxWidth: '96px',
                  maxHeight: '96px',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{
              fontSize: universityLogo ? '18px' : '20px',
              color: '#1a1a1a',
              fontWeight: '500',
              letterSpacing: '0.3px',
              textAlign: universityLogo ? 'left' : 'center'
            }}>
              {universityName}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 4px 0',
            lineHeight: '1.2'
          }}>
            Wellbeing Content
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Expert tips, resources and insights from your student wellbeing team
          </p>
          {newArticlesCount > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #A855F7, #C084FC)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {newArticlesCount} new article{newArticlesCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{
        padding: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          minWidth: 'min-content'
        }}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '10px 20px',
                background: activeFilter === filter ? '#5B8FED' : 'white',
                color: activeFilter === filter ? 'white' : '#666666',
                border: activeFilter === filter ? 'none' : '1px solid #E0E0E0',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: activeFilter === filter ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxShadow: activeFilter === filter ? '0 2px 8px rgba(91, 143, 237, 0.3)' : 'none'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div style={{
        padding: '0 20px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {filteredArticles.map((article) => {
          const categoryColors = getCategoryColor(article.category);
          
          return (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              style={{
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Thumbnail Image */}
              <div style={{
                width: '100%',
                height: '200px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <img 
                  src={article.thumbnail}
                  alt={article.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                {article.isNew && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #10B981, #34D399)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}>
                    New
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                {/* Category Badge and Time */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: categoryColors.bg,
                    color: categoryColors.text,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    <span style={{ color: categoryColors.icon, display: 'flex', alignItems: 'center' }}>
                      {getCategoryIcon(article.category)}
                    </span>
                    {article.category}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#999999',
                    fontSize: '13px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {article.readTime} min
                  </div>
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: '0 0 10px 0',
                  lineHeight: '1.3'
                }}>
                  {article.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '14px',
                  color: '#666666',
                  lineHeight: '1.6',
                  margin: '0 0 16px 0'
                }}>
                  {article.description}
                </p>

                {/* Read More Link */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#5B8FED',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'gap 0.2s'
                }}>
                  Read full article
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            background: '#F3F4F6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            No articles found
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#999999',
            margin: 0
          }}>
            Try selecting a different category
          </p>
        </div>
      )}
    </div>
  );
}