interface MessageCardProps {
  id: string;
  type: 'nudge' | 'announcement' | 'reminder' | 'emergency' | 'wellbeing';
  title: string;
  body: string;
  ctaText?: string;
  ctaLink?: string;
  timestamp?: string;
  onDismiss?: (messageId: string) => void;
  onClick?: (messageId: string) => void;
  onCtaClick?: (messageId: string) => void;
}

export function MessageCard({
  id,
  type,
  title,
  body,
  ctaText,
  ctaLink,
  timestamp,
  onDismiss,
  onClick,
  onCtaClick
}: MessageCardProps) {
  
  const getTypeStyles = (messageType: string) => {
    const styles = {
      nudge: {
        gradient: 'linear-gradient(135deg, #5B8FED, #7BA3F0)',
        iconColor: '#5B8FED',
        bgLight: '#EFF6FF'
      },
      announcement: {
        gradient: 'linear-gradient(135deg, #A855F7, #C084FC)',
        iconColor: '#A855F7',
        bgLight: '#FAF5FF'
      },
      reminder: {
        gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
        iconColor: '#F59E0B',
        bgLight: '#FFFBEB'
      },
      emergency: {
        gradient: 'linear-gradient(135deg, #EF4444, #F87171)',
        iconColor: '#EF4444',
        bgLight: '#FEF2F2'
      },
      wellbeing: {
        gradient: 'linear-gradient(135deg, #10B981, #34D399)',
        iconColor: '#10B981',
        bgLight: '#F0FDF4'
      }
    };
    return styles[messageType as keyof typeof styles] || styles.nudge;
  };

  const getTypeIcon = (messageType: string) => {
    const icons = {
      nudge: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      announcement: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      reminder: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      emergency: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      wellbeing: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )
    };
    return icons[messageType as keyof typeof icons] || icons.nudge;
  };

  const typeStyles = getTypeStyles(type);

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCtaClick) {
      onCtaClick(id);
    }
    if (ctaLink) {
      window.open(ctaLink, '_blank');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
      }}
    >
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: 0.6
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#E5E7EB';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#F3F4F6';
            e.currentTarget.style.opacity = '0.6';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      {/* Header with Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '12px',
        paddingRight: onDismiss ? '28px' : '0'
      }}>
        {/* Icon Circle */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: typeStyles.bgLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: typeStyles.iconColor
        }}>
          {getTypeIcon(type)}
        </div>

        {/* Title */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 4px 0',
            lineHeight: '1.3'
          }}>
            {title}
          </h3>
          {timestamp && (
            <div style={{
              fontSize: '12px',
              color: '#999999',
              marginTop: '2px'
            }}>
              {timestamp}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <p style={{
        fontSize: '14px',
        color: '#666666',
        lineHeight: '1.5',
        margin: '0 0 16px 0'
      }}>
        {body}
      </p>

      {/* CTA Button */}
      {ctaText && (
        <button
          onClick={handleCtaClick}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: typeStyles.gradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          {ctaText}
        </button>
      )}
    </div>
  );
}
