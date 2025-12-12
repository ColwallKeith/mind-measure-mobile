import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Heart, 
  Brain, 
  Moon, 
  Users, 
  Sparkles,
  Clock,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface WellbeingTip {
  id: string;
  title: string;
  content: string;
  category: string;
  isNew?: boolean;
  readTime?: string;
  publishedAt?: string;
  isActive?: boolean;
}

// Category icon and color mapping - matches CMS categories
const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
  // CMS categories
  stress: { icon: Brain, color: 'purple', label: 'Stress' },
  sleep: { icon: Moon, color: 'indigo', label: 'Sleep' },
  study: { icon: BookOpen, color: 'blue', label: 'Study' },
  relationships: { icon: Users, color: 'pink', label: 'Relationships' },
  anxiety: { icon: Brain, color: 'orange', label: 'Anxiety' },
  depression: { icon: Heart, color: 'slate', label: 'Depression' },
  exercise: { icon: Heart, color: 'red', label: 'Exercise' },
  nutrition: { icon: Sparkles, color: 'green', label: 'Nutrition' },
  mindfulness: { icon: Brain, color: 'teal', label: 'Mindfulness' },
  general: { icon: Sparkles, color: 'amber', label: 'Wellbeing' },
  // Legacy categories for backwards compatibility
  social: { icon: Users, color: 'pink', label: 'Social' },
};

// Default tips - shown only when no CMS content is configured
// These use CMS-compatible category names
const defaultTips: WellbeingTip[] = [
  {
    id: 'default-1',
    title: 'The 5-4-3-2-1 Grounding Technique',
    content: 'When feeling anxious, try this: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This technique helps bring you back to the present moment.',
    category: 'anxiety',
    isNew: true,
    readTime: '2 min',
  },
  {
    id: 'default-2',
    title: 'Sleep Hygiene: Creating Your Wind-Down Routine',
    content: 'Try to disconnect from screens 30 minutes before bed. Replace scrolling with reading, gentle stretching, or listening to calm music. Consistent sleep schedules improve both mood and concentration.',
    category: 'sleep',
    readTime: '3 min',
  },
  {
    id: 'default-3',
    title: 'The Power of Micro-Connections',
    content: 'A brief chat with a classmate, a smile at a stranger, or a quick message to a friend can significantly boost your mood throughout the day. Small social interactions matter.',
    category: 'relationships',
    isNew: true,
    readTime: '2 min',
  },
  {
    id: 'default-4',
    title: '10-Minute Movement Breaks',
    content: 'Short bursts of movement between study sessions can improve focus and reduce stress. Try a quick walk, some stretches, or dancing to your favourite song. Your body and mind will thank you.',
    category: 'exercise',
    readTime: '2 min',
  },
  {
    id: 'default-5',
    title: 'The Pomodoro Technique for Better Focus',
    content: 'Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break. This helps maintain concentration and prevents burnout during revision periods.',
    category: 'study',
    readTime: '3 min',
  },
  {
    id: 'default-6',
    title: 'Box Breathing for Instant Calm',
    content: 'Breathe in for 4 counts, hold for 4 counts, breathe out for 4 counts, hold for 4 counts. Repeat 4 times. This simple technique activates your parasympathetic nervous system.',
    category: 'stress',
    readTime: '2 min',
  },
];

export function MobileContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<WellbeingTip[]>(defaultTips);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, [user]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Get user's university from their email domain
      const email = user?.email || '';
      const domain = email.split('@')[1]?.toLowerCase();
      
      // Try to load university-specific content
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      
      // Find university by domain
      const { data: universities } = await backendService.database.select('universities', {
        columns: ['id', 'wellbeing_tips', 'content_cycles']
      });
      
      if (universities && universities.length > 0) {
        // Find matching university by domain
        const university = universities.find((u: any) => {
          return u.id === 'worcester' || domain?.includes('worc');
        }) || universities[0];
        
        if (university?.wellbeing_tips && Array.isArray(university.wellbeing_tips)) {
          // Map CMS data to mobile format, filtering for active tips only
          const cmsTips = university.wellbeing_tips
            .filter((tip: any) => tip.isActive !== false) // Only show active tips
            .map((tip: any) => ({
              id: tip.id || crypto.randomUUID(),
              title: tip.title,
              content: tip.content,
              category: tip.category || 'general',
              isNew: tip.isNew || isRecent(tip.lastReviewed || tip.publishedAt),
              readTime: tip.estimatedReadTime ? `${tip.estimatedReadTime} min` : (tip.readTime || '2 min'),
              publishedAt: tip.lastReviewed || tip.publishedAt,
              isActive: tip.isActive,
            }));
          
          if (cmsTips.length > 0) {
            setTips(cmsTips);
          }
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      // Keep default tips on error
    } finally {
      setLoading(false);
    }
  };
  
  // Check if content was published in the last 7 days
  const isRecent = (dateStr?: string) => {
    if (!dateStr) return false;
    const published = new Date(dateStr);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return published > weekAgo;
  };

  const filteredTips = selectedCategory 
    ? tips.filter(tip => tip.category === selectedCategory)
    : tips;

  const newContentCount = tips.filter(tip => tip.isNew).length;

  const getCategoryStyle = (category: string) => {
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.general;
    return {
      bg: `bg-${config.color}-100`,
      text: `text-${config.color}-700`,
      icon: config.icon,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-8">
        <div className="pt-8 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pt-8">
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
          <img
            src={mindMeasureLogo}
            alt="Mind Measure"
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <h1 className="text-gray-900 text-center mb-2 text-lg font-medium">Wellbeing Content</h1>
        <p className="text-gray-600 text-sm text-center">Tips, resources & insights for your wellbeing</p>
        
        {newContentCount > 0 && (
          <div className="flex justify-center mt-3">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              {newContentCount} new {newContentCount === 1 ? 'article' : 'articles'}
            </Badge>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={selectedCategory === null 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shrink-0' 
            : 'shrink-0'}
        >
          All
        </Button>
        {Object.entries(categoryConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = tips.filter(t => t.category === key).length;
          if (count === 0) return null;
          
          return (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className={`shrink-0 ${selectedCategory === key 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0' 
                : ''}`}
            >
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Content Cards */}
      <div className="space-y-4">
        {filteredTips.map((tip) => {
          const style = getCategoryStyle(tip.category);
          const Icon = style.icon;
          const isExpanded = expandedTip === tip.id;
          
          return (
            <Card 
              key={tip.id}
              className="border-0 shadow-lg backdrop-blur-xl bg-white/80 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl"
              onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <Badge variant="secondary" className={`${style.bg} ${style.text} border-0 text-xs`}>
                      {categoryConfig[tip.category as keyof typeof categoryConfig]?.label || 'Wellbeing'}
                    </Badge>
                    {tip.isNew && (
                      <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {tip.readTime}
                  </div>
                </div>
                
                <h3 className="text-gray-900 font-medium mb-2">{tip.title}</h3>
                
                <p className={`text-gray-600 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {tip.content}
                </p>
                
                <div className="flex items-center justify-end mt-3 text-purple-600 text-sm">
                  <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTips.length === 0 && (
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/80 p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No content in this category yet.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setSelectedCategory(null)}
          >
            View all content
          </Button>
        </Card>
      )}

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}

