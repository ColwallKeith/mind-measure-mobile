import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ArrowLeft,
  Eye,
  Clock,
  Share,
  Bookmark,
  RefreshCw,
  Heart,
  AlertTriangle,
  GraduationCap,
  Users,
  DollarSign,
  Home,
  Briefcase,
  Stethoscope
} from "lucide-react";
import { getHelpArticle } from "../../features/mobile/data";
import { ContentArticle } from "../../features/cms/data";
interface ArticleViewerProps {
  articleSlug: string;
  onBack?: () => void;
  onShare?: (article: ContentArticle) => void;
}
export function ArticleViewer({ articleSlug, onBack, onShare }: ArticleViewerProps) {
  const [article, setArticle] = useState<ContentArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    loadArticle();
  }, [articleSlug]);
  const loadArticle = async () => {
    setLoading(true);
    try {
      const articleData = await getHelpArticle(articleSlug);
      setArticle(articleData);
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };
  const getCategoryIcon = (categorySlug?: string) => {
    switch (categorySlug) {
      case 'wellbeing': return Heart;
      case 'crisis': return AlertTriangle;
      case 'academic': return GraduationCap;
      case 'student-life': return Users;
      case 'financial': return DollarSign;
      case 'housing': return Home;
      case 'career': return Briefcase;
      case 'health': return Stethoscope;
      default: return Users;
    }
  };
  const getCategoryColor = (categorySlug?: string) => {
    switch (categorySlug) {
      case 'wellbeing': return '#10b981';
      case 'crisis': return '#ef4444';
      case 'academic': return '#3b82f6';
      case 'student-life': return '#8b5cf6';
      case 'financial': return '#f59e0b';
      case 'housing': return '#06b6d4';
      case 'career': return '#84cc16';
      case 'health': return '#f97316';
      default: return '#6b7280';
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  const handleShare = () => {
    if (article && onShare) {
      onShare(article);
    } else if (article && navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt || article.title,
        url: window.location.href
      });
    }
  };
  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    // TODO: Implement actual bookmarking functionality
  };
  const renderContent = (content: string) => {
    // Simple markdown-to-HTML conversion for mobile display
    let html = content
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 mt-6">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3 mt-5">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 mb-4">$1</ul>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">$1</blockquote>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<[h|u|l|b])/gm, '<p class="mb-4">')
      .replace(/(?<![>])$/gm, '</p>');
    return (
      <div
        className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }
  if (!article) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Article Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or isn't available.
          </p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }
  const IconComponent = getCategoryIcon(article.category?.slug);
  const categoryColor = getCategoryColor(article.category?.slug);
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBookmark}
              className={bookmarked ? 'text-blue-600' : ''}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      {/* Article Content */}
      <div className="px-4 py-6">
        {/* Featured Image */}
        {article.featured_image && (
          <div className="mb-6">
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
        {/* Category and Meta */}
        <div className="flex items-center space-x-3 mb-4">
          {article.category && (
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: categoryColor + '20' }}
              >
                <IconComponent
                  className="w-4 h-4"
                  style={{ color: categoryColor }}
                />
              </div>
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: categoryColor + '20',
                  color: categoryColor
                }}
              >
                {article.category.name}
              </Badge>
            </div>
          )}
          {article.is_featured && (
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              Featured
            </Badge>
          )}
        </div>
        {/* Title */}
        <h1 className="text-2xl font-bold mb-4 leading-tight">
          {article.title}
        </h1>
        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            {article.excerpt}
          </p>
        )}
        {/* Article Meta */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{article.view_count} views</span>
          </div>
          {article.published_at && (
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(article.published_at)}</span>
            </div>
          )}
        </div>
        {/* Article Content */}
        <div className="mb-8">
          {renderContent(article.content)}
        </div>
        {/* Footer */}
        <div className="pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Was this article helpful?
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" size="sm">
                👍 Yes
              </Button>
              <Button variant="outline" size="sm">
                👎 No
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
