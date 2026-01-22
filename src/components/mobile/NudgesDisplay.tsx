import React from 'react';
import { Calendar, Lightbulb, BookOpen, ExternalLink, MapPin, Clock } from 'lucide-react';

interface EventNudge {
  template: 'event';
  eventTitle: string;
  eventDescription?: string;
  eventLocation?: string;
  eventDateTime?: string;
  eventButtonText?: string;
  eventButtonLink?: string;
}

interface ServiceNudge {
  template: 'service';
  serviceTitle: string;
  serviceDescription?: string;
  serviceAccess?: string;
  serviceLink?: string;
}

interface TipNudge {
  template: 'tip';
  tipText: string;
  tipArticleLink?: string;
}

type Nudge = (EventNudge | ServiceNudge | TipNudge) & {
  id: string;
  isPinned: boolean;
};

interface NudgesDisplayProps {
  pinned: Nudge | null;
  rotated: Nudge | null;
  onNudgeClick?: (nudge: Nudge) => void;
}

export function NudgesDisplay({ pinned, rotated, onNudgeClick }: NudgesDisplayProps) {
  if (!pinned && !rotated) return null;

  const handleButtonClick = (link?: string) => {
    if (link) {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Pinned Nudge */}
      {pinned && (
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg z-10">
            📌 Featured
          </div>
          {renderNudgeCard(pinned, handleButtonClick, onNudgeClick, true)}
        </div>
      )}

      {/* Rotated Nudge */}
      {rotated && !pinned && renderNudgeCard(rotated, handleButtonClick, onNudgeClick, false)}
    </div>
  );
}

function renderNudgeCard(
  nudge: Nudge,
  handleButtonClick: (link?: string) => void,
  onNudgeClick?: (nudge: Nudge) => void,
  isPinned: boolean = false
) {
  const baseStyles: React.CSSProperties = {
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s',
    border: isPinned ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid',
    ...(isPinned && { backgroundColor: 'rgba(255, 247, 237, 0.5)' })
  };

  if (nudge.template === 'event') {
    return (
      <div style={{
        ...baseStyles,
        borderColor: '#BFDBFE',
        backgroundColor: '#EFF6FF'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <Calendar style={{ width: '24px', height: '24px', color: '#2563EB', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: '700', fontSize: '18px', color: '#111827', marginBottom: '8px' }}>{nudge.eventTitle}</h3>
            {nudge.eventDescription && (
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', lineHeight: '1.6' }}>{nudge.eventDescription}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {nudge.eventLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4B5563' }}>
                  <MapPin style={{ width: '16px', height: '16px' }} />
                  <span><strong>Where:</strong> {nudge.eventLocation}</span>
                </div>
              )}
              {nudge.eventDateTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4B5563' }}>
                  <Clock style={{ width: '16px', height: '16px' }} />
                  <span><strong>When:</strong> {nudge.eventDateTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {nudge.eventButtonText && (
          <button
            onClick={() => handleButtonClick(nudge.eventButtonLink)}
            style={{
              width: '100%',
              background: '#2563EB',
              color: 'white',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {nudge.eventButtonText}
          </button>
        )}
      </div>
    );
  }

  if (nudge.template === 'service') {
    return (
      <div style={{
        ...baseStyles,
        borderColor: '#E9D5FF',
        backgroundColor: '#FAF5FF'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <Lightbulb style={{ width: '24px', height: '24px', color: '#9333EA', flexShrink: 0, marginTop: '4px' }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: '700', fontSize: '18px', color: '#111827', marginBottom: '8px' }}>{nudge.serviceTitle}</h3>
            {nudge.serviceDescription && (
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', lineHeight: '1.6' }}>{nudge.serviceDescription}</p>
            )}
            {nudge.serviceAccess && (
              <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '12px', backgroundColor: 'rgba(255, 255, 255, 0.5)', padding: '12px', borderRadius: '8px' }}>
                <strong>How to access:</strong> {nudge.serviceAccess}
              </div>
            )}
          </div>
        </div>
        {nudge.serviceLink && (
          <button
            onClick={() => handleButtonClick(nudge.serviceLink)}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#9333EA',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              border: '2px solid #9333EA',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ExternalLink style={{ width: '16px', height: '16px' }} />
            More Info
          </button>
        )}
      </div>
    );
  }

  if (nudge.template === 'tip') {
    return (
      <div style={{
        ...baseStyles,
        borderColor: '#BBF7D0',
        backgroundColor: '#F0FDF4',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <BookOpen style={{ width: '20px', height: '20px', color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '8px' }}>{nudge.tipText}</p>
            {nudge.tipArticleLink && (
              <button
                onClick={() => handleButtonClick(nudge.tipArticleLink)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#16A34A',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#15803D'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#16A34A'}
              >
                Read more →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
