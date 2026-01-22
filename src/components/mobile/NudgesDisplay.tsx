import React from 'react';
import { Button } from "@/components/ui/button";
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
  const baseClasses = `glass-surface rounded-2xl border p-6 shadow-lg transition-all ${
    isPinned ? 'border-orange-500/30 bg-orange-50/50' : ''
  }`;

  if (nudge.template === 'event') {
    return (
      <div className={`${baseClasses} border-blue-200 bg-blue-50`}>
        <div className="flex items-start gap-3 mb-4">
          <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{nudge.eventTitle}</h3>
            {nudge.eventDescription && (
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{nudge.eventDescription}</p>
            )}
            <div className="space-y-1">
              {nudge.eventLocation && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span><strong>Where:</strong> {nudge.eventLocation}</span>
                </div>
              )}
              {nudge.eventDateTime && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span><strong>When:</strong> {nudge.eventDateTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {nudge.eventButtonText && (
          <Button
            onClick={() => handleButtonClick(nudge.eventButtonLink)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl font-medium"
          >
            {nudge.eventButtonText}
          </Button>
        )}
      </div>
    );
  }

  if (nudge.template === 'service') {
    return (
      <div className={`${baseClasses} border-purple-200 bg-purple-50`}>
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{nudge.serviceTitle}</h3>
            {nudge.serviceDescription && (
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{nudge.serviceDescription}</p>
            )}
            {nudge.serviceAccess && (
              <div className="text-xs text-gray-600 mb-3 bg-white/50 p-3 rounded-lg">
                <strong>How to access:</strong> {nudge.serviceAccess}
              </div>
            )}
          </div>
        </div>
        {nudge.serviceLink && (
          <Button
            onClick={() => handleButtonClick(nudge.serviceLink)}
            variant="outline"
            className="w-full h-11 rounded-xl font-medium border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            More Info
          </Button>
        )}
      </div>
    );
  }

  if (nudge.template === 'tip') {
    return (
      <div className={`${baseClasses} border-green-200 bg-green-50 p-4`}>
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 leading-relaxed mb-2">{nudge.tipText}</p>
            {nudge.tipArticleLink && (
              <Button
                onClick={() => handleButtonClick(nudge.tipArticleLink)}
                variant="link"
                className="px-0 h-auto text-green-600 hover:text-green-700 font-medium"
              >
                Read more →
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
