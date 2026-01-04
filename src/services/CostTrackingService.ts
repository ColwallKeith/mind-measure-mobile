import { DatabaseService } from './database/DatabaseService';
import { BackendServiceFactory } from './database/BackendServiceFactory';
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
export class CostTrackingService {
  private databaseService: DatabaseService;
  constructor() {
    const backendService = BackendServiceFactory.createService(
      BackendServiceFactory.getEnvironmentConfig()
    );
    this.databaseService = backendService.database;
  }
  /**
   * Log a cost entry for tracking
   */
  async logCost(entry: Omit<CostEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const costEntry: CostEntry = {
        ...entry,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      await this.databaseService.insert('cost_tracking', costEntry);
      // Check for budget alerts
      await this.checkBudgetAlerts(entry.service_type, entry.cost_usd);
    } catch (error) {
      console.error('Error logging cost:', error);
    }
  }
  /**
   * Get cost summaries by service and time period
   */
  async getCostSummaries(
    startDate?: string,
    endDate?: string,
    universityId?: string
  ): Promise<CostSummary[]> {
    try {
      const filters: any = {};
      if (startDate) {
        filters.created_at = { operator: 'gte', value: startDate };
      }
      if (endDate) {
        filters.created_at = {
          ...filters.created_at,
          and: { operator: 'lte', value: endDate }
        };
      }
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_tracking', {
        filters,
        columns: 'service_type, cost_usd, created_at'
      });
      if (error) throw error;
      // Group by service type and month
      const summaries = this.groupCostsByServiceAndMonth(data || []);
      return summaries;
    } catch (error) {
      console.error('Error getting cost summaries:', error);
      return [];
    }
  }
  /**
   * Get recent cost entries
   */
  async getRecentCosts(limit: number = 50, universityId?: string): Promise<CostEntry[]> {
    try {
      const filters: any = {};
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_tracking', {
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent costs:', error);
      return [];
    }
  }
  /**
   * Get current month's total cost
   */
  async getCurrentMonthCost(universityId?: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const filters: any = {
        created_at: { operator: 'gte', value: startOfMonth.toISOString() }
      };
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_tracking', {
        filters,
        columns: 'cost_usd'
      });
      if (error) throw error;
      return (data || []).reduce((sum, entry) => sum + entry.cost_usd, 0);
    } catch (error) {
      console.error('Error getting current month cost:', error);
      return 0;
    }
  }
  /**
   * Set budget limits for services
   */
  async setBudget(budget: Omit<CostBudget, 'id' | 'created_at' | 'current_spend_usd'>): Promise<void> {
    try {
      const currentSpend = await this.getCurrentMonthCost(budget.university_id);
      const budgetEntry: CostBudget = {
        ...budget,
        id: crypto.randomUUID(),
        current_spend_usd: currentSpend,
        created_at: new Date().toISOString()
      };
      // Upsert budget (update if exists, insert if not)
      const existingBudget = await this.getBudget(budget.service_type, budget.university_id);
      if (existingBudget) {
        await this.databaseService.update('cost_budgets',
          { id: existingBudget.id },
          budgetEntry
        );
      } else {
        await this.databaseService.insert('cost_budgets', budgetEntry);
      }
    } catch (error) {
      console.error('Error setting budget:', error);
    }
  }
  /**
   * Get budget for a service
   */
  async getBudget(serviceType: string, universityId?: string): Promise<CostBudget | null> {
    try {
      const filters: any = {
        service_type: serviceType 
      };
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_budgets', {
        filters,
        limit: 1
      });
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting budget:', error);
      return null;
    }
  }
  /**
   * Get all budgets
   */
  async getAllBudgets(universityId?: string): Promise<CostBudget[]> {
    try {
      const filters: any = {};
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_budgets', {
        filters
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting budgets:', error);
      return [];
    }
  }
  /**
   * Get cost alerts
   */
  async getCostAlerts(universityId?: string): Promise<CostAlert[]> {
    try {
      const filters: any = {
        acknowledged: false 
      };
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_alerts', {
        filters,
        orderBy: { column: 'created_at', ascending: false }
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting cost alerts:', error);
      return [];
    }
  }
  /**
   * Acknowledge a cost alert
   */
  async acknowledgeCostAlert(alertId: string): Promise<void> {
    try {
      await this.databaseService.update('cost_alerts',
        { id: alertId },
        { acknowledged: true }
      );
    } catch (error) {
      console.error('Error acknowledging cost alert:', error);
    }
  }
  /**
   * Get cost predictions based on current usage
   */
  async getCostPredictions(universityId?: string): Promise<{
    dailyAverage: number;
    weeklyProjection: number;
    monthlyProjection: number;
    yearlyProjection: number;
  }> {
    try {
      // Get last 30 days of costs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filters: any = {
        created_at: { operator: 'gte', value: thirtyDaysAgo.toISOString() }
      };
      if (universityId) {
        filters.university_id = { operator: 'eq', value: universityId };
      }
      const { data, error } = await this.databaseService.select('cost_tracking', {
        filters,
        columns: 'cost_usd, created_at'
      });
      if (error) throw error;
      const totalCost = (data || []).reduce((sum, entry) => sum + entry.cost_usd, 0);
      const dailyAverage = totalCost / 30;
      return {
        dailyAverage,
        weeklyProjection: dailyAverage * 7,
        monthlyProjection: dailyAverage * 30,
        yearlyProjection: dailyAverage * 365
      };
    } catch (error) {
      console.error('Error getting cost predictions:', error);
      return {
        dailyAverage: 0,
        weeklyProjection: 0,
        monthlyProjection: 0,
        yearlyProjection: 0
      };
    }
  }
  /**
   * Private method to group costs by service and month
   */
  private groupCostsByServiceAndMonth(costs: any[]): CostSummary[] {
    const grouped = costs.reduce((acc, cost) => {
      const date = new Date(cost.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const serviceKey = `${cost.service_type}-${monthKey}`;
      if (!acc[serviceKey]) {
        acc[serviceKey] = {
          service_type: cost.service_type,
          month: monthKey,
          total_cost_usd: 0,
          total_operations: 0,
          costs: []
        };
      }
      acc[serviceKey].total_cost_usd += cost.cost_usd;
      acc[serviceKey].total_operations += 1;
      acc[serviceKey].costs.push(cost);
      return acc;
    }, {} as Record<string, any>);
    return Object.values(grouped).map((group: any) => ({
      service_type: group.service_type,
      month: group.month,
      total_cost_usd: group.total_cost_usd,
      total_operations: group.total_operations,
      avg_cost_per_operation: group.total_cost_usd / group.total_operations
    }));
  }
  /**
   * Private method to check budget alerts
   */
  private async checkBudgetAlerts(serviceType: string, costAmount: number): Promise<void> {
    try {
      const budget = await this.getBudget(serviceType);
      if (!budget) return;
      const currentSpend = await this.getCurrentMonthCost();
      const spendPercent = (currentSpend / budget.monthly_limit_usd) * 100;
      // Check if we've exceeded the alert threshold
      if (spendPercent >= budget.alert_threshold_percent) {
        const alert: Omit<CostAlert, 'id' | 'created_at'> = {
          service_type: serviceType,
          alert_type: spendPercent >= 100 ? 'budget_exceeded' : 'threshold_reached',
          message: spendPercent >= 100
            ? `Budget exceeded for ${serviceType}: $${currentSpend.toFixed(2)} / $${budget.monthly_limit_usd}`
            : `Budget threshold reached for ${serviceType}: ${spendPercent.toFixed(1)}% of monthly limit`,
          cost_amount: currentSpend,
          threshold_percent: spendPercent,
          acknowledged: false
        };
        await this.databaseService.insert('cost_alerts', {
          ...alert,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }
}
export function createCostTrackingService(): CostTrackingService {
  return new CostTrackingService();
}
