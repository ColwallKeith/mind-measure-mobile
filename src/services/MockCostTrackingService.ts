// Mock Cost Tracking Service - Always Works
// This provides reliable demo data for the cost monitoring dashboard
export interface CostEntry {
  id: string;
  service_type: 'openai' | 'elevenlabs' | 'aws' | 'vercel' | 'backendService';
  operation_type: string;
  cost_usd: number;
  tokens_used?: number;
  model_used?: string;
  audio_duration_seconds?: number;
  user_id?: string;
  university_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}
export interface CostSummary {
  service_type: string;
  total_cost_usd: number;
  total_operations: number;
  avg_cost_per_operation: number;
  month: string;
  daily_breakdown?: Array<{
    date: string;
    cost: number;
    operations: number;
  }>;
}
export interface CostBudget {
  id: string;
  service_type: string;
  monthly_limit_usd: number;
  current_spend_usd: number;
  alert_threshold_percent: number;
  university_id?: string;
  created_at: string;
}
export interface CostAlert {
  id: string;
  service_type: string;
  alert_type: 'budget_exceeded' | 'threshold_reached' | 'unusual_spike' | 'service_down';
  message: string;
  cost_amount?: number;
  threshold_percent?: number;
  created_at: string;
  acknowledged: boolean;
}
export class MockCostTrackingService {
  private mockSummaries: CostSummary[] = [
    {
      service_type: 'OpenAI GPT-4',
      total_cost_usd: 127.45,
      total_operations: 15420,
      avg_cost_per_operation: 0.0083,
      month: '2024-01',
      daily_breakdown: [
        { date: '2024-01-01', cost: 4.23, operations: 512 },
        { date: '2024-01-02', cost: 3.87, operations: 468 },
        { date: '2024-01-03', cost: 5.12, operations: 621 }
      ]
    },
    {
      service_type: 'ElevenLabs TTS',
      total_cost_usd: 89.32,
      total_operations: 12350,
      avg_cost_per_operation: 0.0072,
      month: '2024-01',
      daily_breakdown: [
        { date: '2024-01-01', cost: 2.95, operations: 410 },
        { date: '2024-01-02', cost: 3.21, operations: 446 },
        { date: '2024-01-03', cost: 2.78, operations: 386 }
      ]
    },
    {
      service_type: 'AWS Services',
      total_cost_usd: 34.67,
      total_operations: 8900,
      avg_cost_per_operation: 0.0039,
      month: '2024-01',
      daily_breakdown: [
        { date: '2024-01-01', cost: 1.15, operations: 295 },
        { date: '2024-01-02', cost: 1.23, operations: 315 },
        { date: '2024-01-03', cost: 1.08, operations: 277 }
      ]
    }
  ];
  private mockRecentCosts: CostEntry[] = [
    {
      id: '1',
      service_type: 'openai',
      operation_type: 'chat_completion',
      cost_usd: 0.12,
      tokens_used: 1500,
      model_used: 'gpt-4-turbo',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      service_type: 'elevenlabs',
      operation_type: 'text_to_speech',
      cost_usd: 0.08,
      audio_duration_seconds: 45,
      model_used: 'eleven_monolingual_v1',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      service_type: 'aws',
      operation_type: 'rds_query',
      cost_usd: 0.003,
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '4',
      service_type: 'openai',
      operation_type: 'chat_completion',
      cost_usd: 0.15,
      tokens_used: 1800,
      model_used: 'gpt-4-turbo',
      created_at: new Date(Date.now() - 10800000).toISOString()
    },
    {
      id: '5',
      service_type: 'elevenlabs',
      operation_type: 'text_to_speech',
      cost_usd: 0.06,
      audio_duration_seconds: 32,
      model_used: 'eleven_monolingual_v1',
      created_at: new Date(Date.now() - 14400000).toISOString()
    }
  ];
  private mockAlerts: CostAlert[] = [
    {
      id: '1',
      service_type: 'OpenAI GPT-4',
      alert_type: 'threshold_reached',
      message: 'Monthly spending has reached 80% of budget limit',
      cost_amount: 127.45,
      threshold_percent: 80,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      acknowledged: false
    }
  ];
  private mockBudgets: CostBudget[] = [
    {
      id: '1',
      service_type: 'OpenAI GPT-4',
      monthly_limit_usd: 150.00,
      current_spend_usd: 127.45,
      alert_threshold_percent: 80,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      service_type: 'ElevenLabs TTS',
      monthly_limit_usd: 100.00,
      current_spend_usd: 89.32,
      alert_threshold_percent: 75,
      created_at: '2024-01-01T00:00:00Z'
    }
  ];
  /**
   * Get cost summaries - always returns mock data
   */
  async getCostSummaries(
    startDate?: string,
    endDate?: string,
    universityId?: string
  ): Promise<CostSummary[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('MockCostTrackingService: Returning cost summaries');
    return [...this.mockSummaries];
  }
  /**
   * Get recent costs - always returns mock data
   */
  async getRecentCosts(limit: number = 10): Promise<CostEntry[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('MockCostTrackingService: Returning recent costs');
    return this.mockRecentCosts.slice(0, limit);
  }
  /**
   * Get cost alerts - always returns mock data
   */
  async getCostAlerts(): Promise<CostAlert[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('MockCostTrackingService: Returning cost alerts');
    return [...this.mockAlerts];
  }
  /**
   * Get all budgets - always returns mock data
   */
  async getAllBudgets(): Promise<CostBudget[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('MockCostTrackingService: Returning budgets');
    return [...this.mockBudgets];
  }
  /**
   * Get cost predictions - always returns mock data
   */
  async getCostPredictions(): Promise<{
    dailyAverage: number;
    weeklyProjection: number;
    monthlyProjection: number;
    yearlyProjection: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('MockCostTrackingService: Returning cost predictions');
    return {
      dailyAverage: 8.12,
      weeklyProjection: 56.84,
      monthlyProjection: 243.36,
      yearlyProjection: 2920.32
    };
  }
  /**
   * Get current month cost - always returns mock data
   */
  async getCurrentMonthCost(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('MockCostTrackingService: Returning current month cost');
    return 251.44;
  }
  /**
   * Add cost entry - mock implementation
   */
  async addCostEntry(entry: Omit<CostEntry, 'id' | 'created_at'>): Promise<CostEntry> {
    const newEntry: CostEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    this.mockRecentCosts.unshift(newEntry);
    console.log('MockCostTrackingService: Added cost entry');
    return newEntry;
  }
}
/**
 * Create a mock cost tracking service instance
 */
export function createMockCostTrackingService(): MockCostTrackingService {
  console.log('Creating MockCostTrackingService - guaranteed to work');
  return new MockCostTrackingService();
}
