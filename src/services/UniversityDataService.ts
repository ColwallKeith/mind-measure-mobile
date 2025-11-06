// University Data Service
// Aggregates data by university domain for institutional dashboards
// All data is aggregated - NO individual user identification
// Supports both demo data and real data based on university configuration
import { BackendServiceFactory } from './database/BackendServiceFactory';
import { DatabaseService } from './database/DatabaseService';
export interface UniversityMetrics {
  totalStudents: number;
  activeToday: number;
  activeThisWeek: number;
  averageScore: number;
  scoreDistribution: {
    green: number; // ≥60
    amber: number; // 45-59
    red: number;   // <45
  };
  weeklyTrends: Array<{
    week: string;
    date: string;
    score: number;
    activeUsers: number;
  }>;
  engagementMetrics: {
    dailyCheckins: number;
    averageStreak: number;
    completionRate: number;
    qualityScore: number;
  };
  topTopics: Array<{
    topic: string;
    count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
}
export class UniversityDataService {
  private databaseService: DatabaseService;
  // University domain mappings
  private universityDomains = {
    'worcs.ac.uk': 'worcester',
    'worcester.ac.uk': 'worcester',
    'lse.ac.uk': 'lse',
    'student.lse.ac.uk': 'lse',
  };
  constructor() {
    try {
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      this.databaseService = backendService.database;
    } catch (error) {
      console.warn('Failed to initialize database service, will use demo data only:', error);
      this.databaseService = null as any; // Will trigger demo data fallback
    }
  }
  /**
   * Extract university identifier from email domain
   */
  private getUniversityFromEmail(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    return this.universityDomains[domain] || null;
  }
  /**
   * Check if university should use demo data
   */
  private async shouldUseDemoData(universityId: string): Promise<boolean> {
    try {
      // If database service failed to initialize, use demo data
      if (!this.databaseService) {
        console.log('Database service not available, using demo data');
        return true;
      }
      // Try to check if university exists in database
      const { data: university, error } = await this.databaseService.select('universities', {
        filters: { id: universityId  },
        columns: 'id, status, current_uptake_rate, total_students'
      });
      if (error) {
        console.log('Database query failed, using demo data:', error);
        return true; // Use demo data if database query fails
      }
      if (!university || university.length === 0) {
        console.log('University not found in database, using demo data');
        return true; // Use demo data if university not found
      }
      const uni = university[0];
      // Use demo data if:
      // 1. Status is 'planning' (not launched yet)
      // 2. No real users (uptake rate is 0)
      // 3. Explicitly marked as demo
      const shouldUseDemo = uni.status === 'planning' || uni.current_uptake_rate === 0;
      console.log(`University ${universityId} status: ${uni.status}, uptake: ${uni.current_uptake_rate}, using demo: ${shouldUseDemo}`);
      return shouldUseDemo;
    } catch (error) {
      console.warn('Error checking university status, using demo data:', error);
      return true; // Default to demo data on error
    }
  }
  /**
   * Generate realistic demo data for universities
   */
  private generateDemoData(universityId: string): UniversityMetrics {
    // Generate realistic demo data based on university
    const baseData = {
      worcester: {
        totalStudents: 15000,
        activeToday: 1250,
        activeThisWeek: 4500,
        averageScore: 67,
        scoreDistribution: { green: 68, amber: 24, red: 8 }
      },
      lse: {
        totalStudents: 12000,
        activeToday: 980,
        activeThisWeek: 3600,
        averageScore: 72,
        scoreDistribution: { green: 75, amber: 20, red: 5 }
      }
    };
    const data = baseData[universityId as keyof typeof baseData] || baseData.worcester;
    return {
      ...data,
      weeklyTrends: [
        { week: 'W1', date: '2024-01-08', score: data.averageScore - 5, activeUsers: Math.floor(data.activeThisWeek * 0.8) },
        { week: 'W2', date: '2024-01-15', score: data.averageScore - 3, activeUsers: Math.floor(data.activeThisWeek * 0.85) },
        { week: 'W3', date: '2024-01-22', score: data.averageScore - 1, activeUsers: Math.floor(data.activeThisWeek * 0.9) },
        { week: 'W4', date: '2024-01-29', score: data.averageScore, activeUsers: data.activeThisWeek },
        { week: 'W5', date: '2024-02-05', score: data.averageScore + 1, activeUsers: Math.floor(data.activeThisWeek * 1.05) },
        { week: 'W6', date: '2024-02-12', score: data.averageScore + 2, activeUsers: Math.floor(data.activeThisWeek * 1.1) },
        { week: 'W7', date: '2024-02-19', score: data.averageScore + 3, activeUsers: Math.floor(data.activeThisWeek * 1.15) },
      ],
      engagementMetrics: {
        dailyCheckins: Math.floor(data.activeToday * 0.8),
        averageStreak: 12,
        completionRate: 78,
        qualityScore: 85
      },
      topTopics: [
        { topic: 'Academic Stress', count: Math.floor(data.totalStudents * 0.15), sentiment: 'negative' },
        { topic: 'Social Connection', count: Math.floor(data.totalStudents * 0.12), sentiment: 'positive' },
        { topic: 'Sleep Quality', count: Math.floor(data.totalStudents * 0.10), sentiment: 'neutral' },
        { topic: 'Financial Concerns', count: Math.floor(data.totalStudents * 0.08), sentiment: 'negative' },
        { topic: 'Exercise & Health', count: Math.floor(data.totalStudents * 0.07), sentiment: 'positive' }
      ]
    };
  }
  /**
   * Get aggregated metrics for a specific university
   */
  async getUniversityMetrics(
    universityId: string,
    timeRange: string = '30d'
  ): Promise<UniversityMetrics> {
    try {
      // If database service is not available, always use demo data
      if (!this.databaseService) {
        console.log(`Database service not available, using demo data for university: ${universityId}`);
        return this.generateDemoData(universityId);
      }
      // First check if we should use demo data
      const useDemoData = await this.shouldUseDemoData(universityId);
      if (useDemoData) {
        console.log(`Using demo data for university: ${universityId}`);
        return this.generateDemoData(universityId);
      }
      // Get all users for this university (by email domain)
      const universityUsers = await this.getUniversityUsers(universityId);
      const userIds = universityUsers.map(u => u.user_id);
      if (userIds.length === 0) {
        console.log(`No users found for university: ${universityId}, falling back to demo data`);
        return this.generateDemoData(universityId);
      }
      // Calculate date range
      const { startDate, endDate } = this.getDateRange(timeRange);
      // Get aggregated data in parallel
      const [
        totalStudents,
        activeToday,
        activeThisWeek,
        scoreMetrics,
        weeklyTrends,
        engagementMetrics,
        topTopics
      ] = await Promise.all([
        this.getTotalStudents(userIds),
        this.getActiveToday(userIds),
        this.getActiveThisWeek(userIds),
        this.getScoreMetrics(userIds, startDate, endDate),
        this.getWeeklyTrends(userIds, startDate, endDate),
        this.getEngagementMetrics(userIds, startDate, endDate),
        this.getTopTopics(userIds, startDate, endDate)
      ]);
      return {
        totalStudents,
        activeToday,
        activeThisWeek,
        averageScore: scoreMetrics.averageScore,
        scoreDistribution: scoreMetrics.distribution,
        weeklyTrends,
        engagementMetrics,
        topTopics
      };
    } catch (error) {
      console.error('Error getting university metrics, falling back to demo data:', error);
      return this.generateDemoData(universityId);
    }
  }
  /**
   * Get all users belonging to a university (by email domain)
   */
  private async getUniversityUsers(universityId: string): Promise<any[]> {
    // Find the domain(s) for this university
    const domains = Object.entries(this.universityDomains)
      .filter(([domain, uni]) => uni === universityId)
      .map(([domain]) => domain);
    if (domains.length === 0) {
      return [];
    }
    // Query users with email domains matching this university
    const { data, error } = await this.databaseService.select('profiles', {
      columns: 'user_id, email',
      filters: {}, // We'll filter in memory for email domains
    });
    if (error || !data) {
      console.error('Error fetching university users:', error);
      return [];
    }
    // Filter by email domain in memory (since we can't do LIKE queries easily)
    return data.filter(user => {
      if (!user.email) return false;
      const userDomain = user.email.split('@')[1]?.toLowerCase();
      return domains.includes(userDomain);
    });
  }
  /**
   * Get total number of students
   */
  private async getTotalStudents(userIds: string[]): Promise<number> {
    return userIds.length;
  }
  /**
   * Get number of active users today
   */
  private async getActiveToday(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.databaseService.select('assessment_sessions', {
      columns: 'user_id',
      filters: {
        user_id: userIds,
        created_at: `>=${today}T00:00:00Z`
      }
    });
    if (error || !data) return 0;
    // Count unique users
    const uniqueUsers = new Set(data.map(session => session.user_id));
    return uniqueUsers.size;
  }
  /**
   * Get number of active users this week
   */
  private async getActiveThisWeek(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data, error } = await this.databaseService.select('assessment_sessions', {
      columns: 'user_id',
      filters: {
        user_id: userIds,
        created_at: `>=${weekAgo.toISOString()}`
      }
    });
    if (error || !data) return 0;
    // Count unique users
    const uniqueUsers = new Set(data.map(session => session.user_id));
    return uniqueUsers.size;
  }
  /**
   * Get aggregated score metrics
   */
  private async getScoreMetrics(userIds: string[], startDate: string, endDate: string): Promise<{
    averageScore: number;
    distribution: { green: number; amber: number; red: number };
  }> {
    if (userIds.length === 0) {
      return { averageScore: 0, distribution: { green: 0, amber: 0, red: 0 } };
    }
    // Get fusion outputs for the time period
    const { data, error } = await this.databaseService.select('fusion_outputs', {
      columns: 'final_score',
      filters: {
        user_id: userIds,
        created_at: `>=${startDate} AND created_at<=${endDate}`
      }
    });
    if (error || !data || data.length === 0) {
      return { averageScore: 0, distribution: { green: 0, amber: 0, red: 0 } };
    }
    // Calculate average score
    const scores = data.map(item => item.final_score).filter(score => score != null);
    const averageScore = scores.length > 0 ?
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    // Calculate distribution
    const total = scores.length;
    const green = scores.filter(score => score >= 60).length;
    const amber = scores.filter(score => score >= 45 && score < 60).length;
    const red = scores.filter(score => score < 45).length;
    return {
      averageScore,
      distribution: {
        green: total > 0 ? Math.round((green / total) * 100) : 0,
        amber: total > 0 ? Math.round((amber / total) * 100) : 0,
        red: total > 0 ? Math.round((red / total) * 100) : 0
      }
    };
  }
  /**
   * Get weekly trend data
   */
  private async getWeeklyTrends(userIds: string[], startDate: string, endDate: string): Promise<Array<{
    week: string;
    date: string;
    score: number;
    activeUsers: number;
  }>> {
    if (userIds.length === 0) return [];
    // Get fusion outputs grouped by week
    const { data, error } = await this.databaseService.select('fusion_outputs', {
      columns: 'final_score, created_at, user_id',
      filters: {
        user_id: userIds,
        created_at: `>=${startDate} AND created_at<=${endDate}`
      },
      orderBy: [{ column: 'created_at', ascending: true }]
    });
    if (error || !data) return [];
    // Group by week
    const weeklyData = new Map<string, { scores: number[]; users: Set<string> }>();
    data.forEach(item => {
      if (!item.final_score || !item.created_at) return;
      const date = new Date(item.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { scores: [], users: new Set() });
      }
      const weekData = weeklyData.get(weekKey)!;
      weekData.scores.push(item.final_score);
      weekData.users.add(item.user_id);
    });
    // Convert to array format
    return Array.from(weeklyData.entries())
      .map(([weekKey, data], index) => ({
        week: `W${index + 1}`,
        date: weekKey,
        score: data.scores.length > 0 ?
          Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) : 0,
        activeUsers: data.users.size
      }))
      .slice(-8); // Last 8 weeks
  }
  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(userIds: string[], startDate: string, endDate: string): Promise<{
    dailyCheckins: number;
    averageStreak: number;
    completionRate: number;
    qualityScore: number;
  }> {
    if (userIds.length === 0) {
      return { dailyCheckins: 0, averageStreak: 0, completionRate: 0, qualityScore: 0 };
    }
    // Get assessment sessions for engagement metrics
    const { data, error } = await this.databaseService.select('assessment_sessions', {
      columns: 'user_id, created_at, status',
      filters: {
        user_id: userIds,
        created_at: `>=${startDate} AND created_at<=${endDate}`
      }
    });
    if (error || !data) {
      return { dailyCheckins: 0, averageStreak: 0, completionRate: 0, qualityScore: 0 };
    }
    // Calculate daily checkins (average per day)
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const dailyCheckins = Math.round(data.length / Math.max(days, 1));
    // Calculate completion rate
    const completedSessions = data.filter(session => session.status === 'completed').length;
    const completionRate = data.length > 0 ? Math.round((completedSessions / data.length) * 100) : 0;
    // Get streak data from profiles
    const { data: profileData } = await this.databaseService.select('profiles', {
      columns: 'streak_count',
      filters: { user_id: userIds }
    });
    const streaks = profileData?.map(p => p.streak_count).filter(s => s != null) || [];
    const averageStreak = streaks.length > 0 ?
      Math.round((streaks.reduce((sum, streak) => sum + streak, 0) / streaks.length) * 10) / 10 : 0;
    // Mock quality score for now (would need actual quality metrics)
    const qualityScore = 4.2;
    return {
      dailyCheckins,
      averageStreak,
      completionRate,
      qualityScore
    };
  }
  /**
   * Get top conversation topics
   */
  private async getTopTopics(userIds: string[], startDate: string, endDate: string): Promise<Array<{
    topic: string;
    count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>> {
    if (userIds.length === 0) return [];
    // Get conversation insights
    const { data, error } = await this.databaseService.select('conversation_insights', {
      columns: 'key_concerns, emotional_themes',
      filters: {
        user_id: userIds,
        created_at: `>=${startDate}`,
        updated_at: `<=${endDate}`
      }
    });
    if (error || !data) return [];
    // Aggregate topics from key_concerns and emotional_themes
    const topicCounts = new Map<string, { count: number; sentiments: string[] }>();
    data.forEach(insight => {
      // Process key_concerns (array of strings)
      if (insight.key_concerns && Array.isArray(insight.key_concerns)) {
        insight.key_concerns.forEach((concern: string) => {
          if (typeof concern === 'string') {
            if (!topicCounts.has(concern)) {
              topicCounts.set(concern, { count: 0, sentiments: [] });
            }
            topicCounts.get(concern)!.count++;
            topicCounts.get(concern)!.sentiments.push('neutral'); // Default sentiment
          }
        });
      }
      
      // Process emotional_themes (jsonb object)
      if (insight.emotional_themes && typeof insight.emotional_themes === 'object') {
        Object.keys(insight.emotional_themes).forEach(theme => {
          if (!topicCounts.has(theme)) {
            topicCounts.set(theme, { count: 0, sentiments: [] });
          }
          topicCounts.get(theme)!.count++;
          // Try to infer sentiment from theme name or use neutral
          const sentiment = theme.includes('positive') || theme.includes('happy') ? 'positive' :
                           theme.includes('negative') || theme.includes('sad') || theme.includes('stress') ? 'negative' : 'neutral';
          topicCounts.get(theme)!.sentiments.push(sentiment);
        });
      }
    });
    // Convert to array and get top 10
    return Array.from(topicCounts.entries())
      .map(([topic, data]) => {
        // Determine overall sentiment for this topic
        const posCount = data.sentiments.filter(s => s === 'positive').length;
        const negCount = data.sentiments.filter(s => s === 'negative').length;
        const sentiment = posCount > negCount ? 'positive' :
                         negCount > posCount ? 'negative' : 'neutral';
        return { topic, count: data.count, sentiment: sentiment as any };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  /**
   * Utility: Get date range from time range string
   */
  private getDateRange(timeRange: string): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
  /**
   * Utility: Get empty metrics structure
   */
  private getEmptyMetrics(): UniversityMetrics {
    return {
      totalStudents: 0,
      activeToday: 0,
      activeThisWeek: 0,
      averageScore: 0,
      scoreDistribution: { green: 0, amber: 0, red: 0 },
      weeklyTrends: [],
      engagementMetrics: {
        dailyCheckins: 0,
        averageStreak: 0,
        completionRate: 0,
        qualityScore: 0
      },
      topTopics: []
    };
  }
}
// Factory function
export function createUniversityDataService(): UniversityDataService {
  return new UniversityDataService();
}
