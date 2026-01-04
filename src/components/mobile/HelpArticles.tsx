import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Star,
  Clock,
  RefreshCw,
  ArrowRight,
  Heart,
  AlertTriangle,
  GraduationCap,
  Users,
  DollarSign,
  Home,
  Briefcase,
  Stethoscope
} from "lucide-react";
import { getHelpArticles } from "../../features/mobile/data";
import { ContentArticle } from "../../features/cms/data";
interface HelpArticlesProps {
  onArticleSelect?: (article: ContentArticle) => void;
  category?: string;
  showFeaturedOnly?: boolean;
}
export function HelpArticles({ onArticleSelect, category, showFeaturedOnly }: HelpArticlesProps) {
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const categories = [
    { slug: 'all', name: 'All Articles', icon: FileText, color: '#6b7280' },
    { slug: 'wellbeing', name: 'Wellbeing', icon: Heart, color: '#10b981' },
    { slug: 'crisis', name: 'Crisis Support', icon: AlertTriangle, color: '#ef4444' },
    { slug: 'academic', name: 'Academic', icon: GraduationCap, color: '#3b82f6' },
    { slug: 'student-life', name: 'Student Life', icon: Users, color: '#8b5cf6' },
    { slug: 'financial', name: 'Financial', icon: DollarSign, color: '#f59e0b' },
    { slug: 'housing', name: 'Housing', icon: Home, color: '#06b6d4' },
    { slug: 'career', name: 'Career', icon: Briefcase, color: '#84cc16' },
    { slug: 'health', name: 'Health', icon: Stethoscope, color: '#f97316' }
  ];
  useEffect(() => {
    loadArticles();
  }, [selectedCategory, showFeaturedOnly]);
  const loadArticles = async () => {
    setLoading(true);
    try {
      const articlesData = await getHelpArticles(
        selectedCategory === 'all' ? undefined : selectedCategory,
        showFeaturedOnly
      );
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading help articles:', error);
    } finally {
      setLoading(false);
    }
  };
  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleArticleClick = (article: ContentArticle) => {
    if (onArticleSelect) {
      onArticleSelect(article);
    }
  };
  const getCategoryIcon = (categorySlug?: string) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    if (!category) return FileText;
    return category.icon;
  };
  const getCategoryColor = (categorySlug?: string) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    return category?.color || '#6b7280';
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
        <h2 className="text-xl font-bold">Help & Support</h2>
        <p className="text-sm text-muted-foreground">
          Find answers and guidance for your university experience
        </p>
      </div>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* Category Filter */}
      {!category && (
        <div className="flex overflow-x-auto space-x-2 pb-2">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <Button
                key={cat.slug}
                variant={selectedCategory === cat.slug ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`flex-shrink-0 ${
                  selectedCategory === cat.slug
                    ? 'text-white'
                    : 'text-gray-600'
                }`}
                style={selectedCategory === cat.slug ? { backgroundColor: cat.color } : {}}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {cat.name}
              </Button>
            );
          })}
        </div>
      )}
      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading articles...</p>
        </div>
      )}
      {/* Articles List */}
      {!loading && (
        <div className="space-y-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'No articles available in this category'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredArticles.map((article) => {
              const IconComponent = getCategoryIcon(article.category?.slug);
              const categoryColor = getCategoryColor(article.category?.slug);
              return (
                <Card
                  key={article.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleArticleClick(article)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      {/* Featured Image or Icon */}
                      {article.featured_image ? (
                        <img
                          src={article.featured_image}
                          alt={article.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: categoryColor + '20' }}
                        >
                          <IconComponent
                            className="w-8 h-8"
                            style={{ color: categoryColor }}
                          />
                        </div>
                      )}
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm leading-tight pr-2">
                            {article.title}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        {/* Badges */}
                        <div className="flex items-center space-x-2 mb-2">
                          {article.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {article.category && (
                            <Badge
                              className="text-xs"
                              style={{
                                backgroundColor: categoryColor + '20',
                                color: categoryColor
                              }}
                            >
                              {article.category.name}
                            </Badge>
                          )}
                        </div>
                        {/* Excerpt */}
                        {article.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {article.excerpt}
                          </p>
                        )}
                        {/* Meta */}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{article.view_count}</span>
                          </div>
                          {article.published_at && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(article.published_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
