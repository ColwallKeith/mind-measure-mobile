interface ArticleDetailPageProps {
  article: {
    id: string;
    category: 'Anxiety' | 'Sleep' | 'Stress' | 'Relationships' | 'Exercise' | 'Study';
    title: string;
    description: string;
    readTime: number;
    thumbnail: string;
    fullContent: string;
    author?: string;
    publishDate?: string;
  };
  onBack: () => void;
  universityName?: string;
  universityLogo?: string;
}

export function ArticleDetailPage({ 
  article, 
  onBack,
  universityName = 'University Wellbeing Team',
  universityLogo
}: ArticleDetailPageProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'Anxiety': { bg: '#FEE2E2', text: '#DC2626' },
      'Sleep': { bg: '#E0E7FF', text: '#4338CA' },
      'Stress': { bg: '#FED7E2', text: '#BE185D' },
      'Relationships': { bg: '#D1FAE5', text: '#065F46' },
      'Exercise': { bg: '#FFE4E6', text: '#BE123C' },
      'Study': { bg: '#DBEAFE', text: '#1E40AF' }
    };
    return colors[category] || { bg: '#F3F4F6', text: '#4B5563' };
  };

  const categoryColors = getCategoryColor(article.category);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px'
    }}>
      {/* Header with Back Button */}
      <div style={{
        backgroundColor: '#FFFFFF',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #F0F0F0',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <button
            onClick={onBack}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              background: '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#E5E5E5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              {universityName}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div style={{
        width: '100%',
        height: '240px',
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
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)'
        }} />
      </div>

      {/* Article Content */}
      <div style={{
        padding: '24px 20px'
      }}>
        {/* Category & Meta Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            padding: '6px 14px',
            background: categoryColors.bg,
            color: categoryColors.text,
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
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
            {article.readTime} min read
          </div>
          {article.publishDate && (
            <div style={{
              color: '#999999',
              fontSize: '13px'
            }}>
              {article.publishDate}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1a1a1a',
          margin: '0 0 12px 0',
          lineHeight: '1.2'
        }}>
          {article.title}
        </h1>

        {/* Author */}
        {article.author && (
          <div style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '24px',
            fontStyle: 'italic'
          }}>
            By {article.author}
          </div>
        )}

        {/* Divider */}
        <div style={{
          height: '1px',
          background: '#E0E0E0',
          margin: '24px 0'
        }} />

        {/* Summary */}
        <div style={{
          padding: '16px',
          background: '#F9FAFB',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: '4px solid #5B8FED'
        }}>
          <p style={{
            fontSize: '15px',
            color: '#1a1a1a',
            lineHeight: '1.6',
            margin: 0,
            fontWeight: '500'
          }}>
            {article.description}
          </p>
        </div>

        {/* Full Content */}
        <div style={{
          fontSize: '15px',
          color: '#333333',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap'
        }}>
          {article.fullContent}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'linear-gradient(135deg, #5B8FED, #7BA3F0)',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            margin: '0 0 8px 0'
          }}>
            Need Support?
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0 0 16px 0'
          }}>
            Our wellbeing team is here to help
          </p>
          <button style={{
            padding: '12px 24px',
            background: 'white',
            color: '#5B8FED',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            Contact Wellbeing Team
          </button>
        </div>
      </div>
    </div>
  );
}
