// Security Awareness Training Service
// Medical-grade security implementation for staff training and awareness
import { createAuditLogger, AuditLogger } from './AuditLogger';
import { DatabaseService } from '../database/DatabaseService';
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: TrainingCategory;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number; // minutes
  mandatory: boolean;
  content: TrainingContent[];
  assessments: TrainingAssessment[];
  prerequisites: string[]; // Module IDs
  tags: string[];
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
}
export type TrainingCategory =
  | 'HIPAA_COMPLIANCE' | 'GDPR_COMPLIANCE' | 'PASSWORD_SECURITY' | 'PHISHING_AWARENESS'
  | 'DATA_PROTECTION' | 'INCIDENT_RESPONSE' | 'SOCIAL_ENGINEERING' | 'MOBILE_SECURITY'
  | 'EMAIL_SECURITY' | 'PHYSICAL_SECURITY' | 'CLOUD_SECURITY' | 'GENERAL_AWARENESS';
export interface TrainingContent {
  id: string;
  type: 'TEXT' | 'VIDEO' | 'INTERACTIVE' | 'QUIZ' | 'SIMULATION' | 'DOCUMENT';
  title: string;
  content: string; // HTML content, video URL, or document path
  duration: number; // minutes
  order: number;
  metadata: Record<string, any>;
}
export interface TrainingAssessment {
  id: string;
  title: string;
  type: 'QUIZ' | 'SCENARIO' | 'PRACTICAL' | 'CERTIFICATION';
  questions: AssessmentQuestion[];
  passingScore: number; // percentage
  timeLimit?: number; // minutes
  maxAttempts: number;
  mandatory: boolean;
}
export interface AssessmentQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SCENARIO' | 'DRAG_DROP';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  category: string;
}
export interface UserTrainingRecord {
  id: string;
  userId: string;
  moduleId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  startedAt?: string;
  completedAt?: string;
  lastAccessedAt?: string;
  progress: number; // percentage
  timeSpent: number; // minutes
  attempts: TrainingAttempt[];
  certificateId?: string;
  expiresAt?: string; // For mandatory training
  assignedBy?: string;
  assignedAt?: string;
}
export interface TrainingAttempt {
  id: string;
  assessmentId: string;
  startedAt: string;
  completedAt?: string;
  score: number; // percentage
  passed: boolean;
  answers: AssessmentAnswer[];
  timeSpent: number; // minutes
}
export interface AssessmentAnswer {
  questionId: string;
  userAnswer: string | string[];
  correct: boolean;
  points: number;
  timeSpent: number; // seconds
}
export interface TrainingCampaign {
  id: string;
  name: string;
  description: string;
  modules: string[]; // Module IDs
  targetAudience: string[]; // Role names or user groups
  startDate: string;
  endDate: string;
  mandatory: boolean;
  reminderSchedule: string[]; // Days before deadline to send reminders
  createdBy: string;
  createdAt: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
export interface TrainingReport {
  id: string;
  type: 'INDIVIDUAL' | 'DEPARTMENT' | 'ORGANIZATION' | 'COMPLIANCE';
  generatedAt: string;
  generatedBy: string;
  period: {
    startDate: string;
    endDate: string;
  };
  filters: {
    userId?: string;
    department?: string;
    role?: string;
    moduleId?: string;
    campaignId?: string;
  };
  metrics: TrainingMetrics;
  recommendations: string[];
}
export interface TrainingMetrics {
  totalUsers: number;
  completedUsers: number;
  inProgressUsers: number;
  overdueUsers: number;
  averageScore: number;
  averageCompletionTime: number; // minutes
  completionRate: number; // percentage
  passRate: number; // percentage
  moduleMetrics: ModuleMetrics[];
  complianceStatus: ComplianceStatus;
}
export interface ModuleMetrics {
  moduleId: string;
  moduleName: string;
  totalAssigned: number;
  completed: number;
  averageScore: number;
  averageTime: number;
  passRate: number;
}
export interface ComplianceStatus {
  hipaaCompliant: number; // percentage of users compliant
  gdprCompliant: number;
  overallCompliant: number;
  expiringCertifications: number;
  overdueTraining: number;
}
export class SecurityTrainingService {
  private auditLogger: AuditLogger;
  private databaseService: DatabaseService;
  private trainingModules: Map<string, TrainingModule>;
  private activeCampaigns: Map<string, TrainingCampaign>;
  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.auditLogger = createAuditLogger(databaseService);
    this.trainingModules = new Map();
    this.activeCampaigns = new Map();
    this.initializeDefaultModules();
    this.startTrainingMonitoring();
  }
  // ===== MODULE MANAGEMENT =====
  async createTrainingModule(
    moduleData: Omit<TrainingModule, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<{ success: boolean; module?: TrainingModule; error?: string }> {
    try {
      const module: TrainingModule = {
        ...moduleData,
        id: `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = await this.databaseService.insert('training_modules', {
        id: module.id,
        title: module.title,
        description: module.description,
        category: module.category,
        difficulty: module.difficulty,
        estimated_duration: module.estimatedDuration,
        mandatory: module.mandatory,
        content: JSON.stringify(module.content),
        assessments: JSON.stringify(module.assessments),
        prerequisites: JSON.stringify(module.prerequisites),
        tags: JSON.stringify(module.tags),
        version: module.version,
        created_by: createdBy,
        created_at: module.createdAt,
        updated_at: module.updatedAt,
        published: module.published,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      if (module.published) {
        this.trainingModules.set(module.id, module);
      }
      await this.auditLogger.log({
        userId: createdBy,
        action: 'TRAINING_MODULE_CREATE',
        resource: 'training',
        resourceId: module.id,
        details: { title: module.title, category: module.category },
        success: true,
        riskLevel: 'MEDIUM',
      });
      return { success: true, module };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async assignTrainingToUser(
    userId: string,
    moduleId: string,
    assignedBy: string,
    dueDate?: string
  ): Promise<{ success: boolean; record?: UserTrainingRecord; error?: string }> {
    try {
      const module = this.trainingModules.get(moduleId);
      if (!module) {
        return { success: false, error: 'Training module not found' };
      }
      const record: UserTrainingRecord = {
        id: `record-${Date.now()}-${userId}-${moduleId}`,
        userId,
        moduleId,
        status: 'NOT_STARTED',
        progress: 0,
        timeSpent: 0,
        attempts: [],
        assignedBy,
        assignedAt: new Date().toISOString(),
        expiresAt: dueDate,
      };
      const result = await this.databaseService.insert('user_training_records', {
        id: record.id,
        user_id: userId,
        module_id: moduleId,
        status: record.status,
        progress: record.progress,
        time_spent: record.timeSpent,
        attempts: JSON.stringify(record.attempts),
        assigned_by: assignedBy,
        assigned_at: record.assignedAt,
        expires_at: dueDate,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      await this.auditLogger.log({
        userId: assignedBy,
        action: 'TRAINING_ASSIGN',
        resource: 'training',
        resourceId: record.id,
        details: { targetUserId: userId, moduleId, moduleTitle: module.title },
        success: true,
        riskLevel: 'MEDIUM',
      });
      return { success: true, record };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  // ===== TRAINING PROGRESS =====
  async startTraining(userId: string, moduleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.update('user_training_records',
        `${userId}-${moduleId}`, {
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      await this.auditLogger.log({
        userId,
        action: 'TRAINING_START',
        resource: 'training',
        resourceId: moduleId,
        details: { moduleId },
        success: true,
        riskLevel: 'LOW',
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async updateTrainingProgress(
    userId: string,
    moduleId: string,
    progress: number,
    timeSpent: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.update('user_training_records',
        `${userId}-${moduleId}`, {
        progress,
        time_spent: timeSpent,
        last_accessed_at: new Date().toISOString(),
        status: progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
        completed_at: progress >= 100 ? new Date().toISOString() : null,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      if (progress >= 100) {
        await this.auditLogger.log({
          userId,
          action: 'TRAINING_COMPLETE',
          resource: 'training',
          resourceId: moduleId,
          details: { moduleId, timeSpent },
          success: true,
          riskLevel: 'LOW',
        });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  // ===== ASSESSMENTS =====
  async submitAssessment(
    userId: string,
    moduleId: string,
    assessmentId: string,
    answers: AssessmentAnswer[]
  ): Promise<{ success: boolean; attempt?: TrainingAttempt; error?: string }> {
    try {
      const module = this.trainingModules.get(moduleId);
      if (!module) {
        return { success: false, error: 'Training module not found' };
      }
      const assessment = module.assessments.find(a => a.id === assessmentId);
      if (!assessment) {
        return { success: false, error: 'Assessment not found' };
      }
      // Calculate score
      const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = answers.reduce((sum, answer) => sum + (answer.correct ? answer.points : 0), 0);
      const score = Math.round((earnedPoints / totalPoints) * 100);
      const passed = score >= assessment.passingScore;
      const attempt: TrainingAttempt = {
        id: `attempt-${Date.now()}-${userId}-${assessmentId}`,
        assessmentId,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        score,
        passed,
        answers,
        timeSpent: answers.reduce((sum, answer) => sum + answer.timeSpent, 0) / 60, // Convert to minutes
      };
      // Update user training record
      const recordResult = await this.databaseService.select('user_training_records', {
        filters: { user_id: userId, module_id: moduleId },
        limit: 1,
      });
      if (recordResult.data && recordResult.data.length > 0) {
        const record = recordResult.data[0];
        const attempts = JSON.parse(record.attempts || '[]');
        attempts.push(attempt);
        await this.databaseService.update('user_training_records', record.id, {
          attempts: JSON.stringify(attempts),
          status: passed ? 'COMPLETED' : 'FAILED',
          completed_at: passed ? attempt.completedAt : null,
        });
      }
      await this.auditLogger.log({
        userId,
        action: 'ASSESSMENT_SUBMIT',
        resource: 'training',
        resourceId: assessmentId,
        details: {
          moduleId,
          assessmentId,
          score,
          passed,
          timeSpent: attempt.timeSpent
        },
        success: passed,
        riskLevel: passed ? 'LOW' : 'MEDIUM',
      });
      return { success: true, attempt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  // ===== CAMPAIGNS =====
  async createTrainingCampaign(
    campaignData: Omit<TrainingCampaign, 'id' | 'createdAt'>,
    createdBy: string
  ): Promise<{ success: boolean; campaign?: TrainingCampaign; error?: string }> {
    try {
      const campaign: TrainingCampaign = {
        ...campaignData,
        id: `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      const result = await this.databaseService.insert('training_campaigns', {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        modules: JSON.stringify(campaign.modules),
        target_audience: JSON.stringify(campaign.targetAudience),
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        mandatory: campaign.mandatory,
        reminder_schedule: JSON.stringify(campaign.reminderSchedule),
        created_by: createdBy,
        created_at: campaign.createdAt,
        status: campaign.status,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      if (campaign.status === 'ACTIVE') {
        this.activeCampaigns.set(campaign.id, campaign);
        await this.assignCampaignToUsers(campaign);
      }
      await this.auditLogger.log({
        userId: createdBy,
        action: 'TRAINING_CAMPAIGN_CREATE',
        resource: 'training',
        resourceId: campaign.id,
        details: { name: campaign.name, modules: campaign.modules.length },
        success: true,
        riskLevel: 'MEDIUM',
      });
      return { success: true, campaign };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  private async assignCampaignToUsers(campaign: TrainingCampaign): Promise<void> {
    try {
      // Get users matching target audience
      const users = await this.getUsersByAudience(campaign.targetAudience);
      for (const user of users) {
        for (const moduleId of campaign.modules) {
          await this.assignTrainingToUser(
            user.id,
            moduleId,
            'SYSTEM',
            campaign.endDate
          );
        }
      }
    } catch (error) {
      console.error('Failed to assign campaign to users:', error);
    }
  }
  private async getUsersByAudience(audience: string[]): Promise<any[]> {
    // In production, this would query users by roles/departments
    // For now, return empty array
    return [];
  }
  // ===== REPORTING =====
  async generateTrainingReport(
    type: TrainingReport['type'],
    filters: TrainingReport['filters'],
    period: { startDate: string; endDate: string },
    generatedBy: string
  ): Promise<TrainingReport> {
    const report: TrainingReport = {
      id: `report-${Date.now()}-${type}`,
      type,
      generatedAt: new Date().toISOString(),
      generatedBy,
      period,
      filters,
      metrics: await this.calculateTrainingMetrics(filters, period),
      recommendations: [],
    };
    // Generate recommendations based on metrics
    report.recommendations = this.generateRecommendations(report.metrics);
    // Store report
    await this.storeTrainingReport(report);
    await this.auditLogger.log({
      userId: generatedBy,
      action: 'TRAINING_REPORT',
      resource: 'training',
      resourceId: report.id,
      details: { type, filters },
      success: true,
      riskLevel: 'LOW',
    });
    return report;
  }
  private async calculateTrainingMetrics(
    filters: TrainingReport['filters'],
    period: { startDate: string; endDate: string }
  ): Promise<TrainingMetrics> {
    // In production, this would query actual training data
    // For demo purposes, return mock metrics
    return {
      totalUsers: 150,
      completedUsers: 120,
      inProgressUsers: 25,
      overdueUsers: 5,
      averageScore: 87,
      averageCompletionTime: 45,
      completionRate: 80,
      passRate: 92,
      moduleMetrics: [
        {
          moduleId: 'hipaa-basics',
          moduleName: 'HIPAA Basics',
          totalAssigned: 150,
          completed: 140,
          averageScore: 89,
          averageTime: 30,
          passRate: 95,
        },
        {
          moduleId: 'phishing-awareness',
          moduleName: 'Phishing Awareness',
          totalAssigned: 150,
          completed: 135,
          averageScore: 85,
          averageTime: 25,
          passRate: 90,
        },
      ],
      complianceStatus: {
        hipaaCompliant: 93,
        gdprCompliant: 88,
        overallCompliant: 90,
        expiringCertifications: 12,
        overdueTraining: 5,
      },
    };
  }
  private generateRecommendations(metrics: TrainingMetrics): string[] {
    const recommendations: string[] = [];
    if (metrics.completionRate < 90) {
      recommendations.push('Increase training completion rate through automated reminders and manager engagement');
    }
    if (metrics.averageScore < 80) {
      recommendations.push('Review training content quality and consider additional support materials');
    }
    if (metrics.complianceStatus.overallCompliant < 95) {
      recommendations.push('Focus on compliance training to meet regulatory requirements');
    }
    if (metrics.complianceStatus.expiringCertifications > 10) {
      recommendations.push('Implement proactive renewal process for expiring certifications');
    }
    return recommendations;
  }
  // ===== MONITORING =====
  private startTrainingMonitoring(): void {
    // Check for overdue training daily
    setInterval(async () => {
      try {
        await this.checkOverdueTraining();
        await this.sendTrainingReminders();
      } catch (error) {
        console.error('Training monitoring failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    console.log('📚 Training monitoring started');
  }
  private async checkOverdueTraining(): Promise<void> {
    console.log('📚 Checking for overdue training...');
    try {
      const now = new Date().toISOString();
      const overdueRecords = await this.databaseService.select('user_training_records', {
        filters: {
          expires_at: `<${now}`,
          status: ['NOT_STARTED', 'IN_PROGRESS'],
        },
      });
      for (const record of overdueRecords.data || []) {
        await this.auditLogger.log({
          userId: record.user_id,
          action: 'TRAINING_OVERDUE',
          resource: 'training',
          resourceId: record.module_id,
          details: { moduleId: record.module_id, dueDate: record.expires_at },
          success: false,
          riskLevel: 'HIGH',
        });
      }
    } catch (error) {
      console.error('Failed to check overdue training:', error);
    }
  }
  private async sendTrainingReminders(): Promise<void> {
    console.log('📧 Sending training reminders...');
    // In production, this would send actual email/notification reminders
    // For now, just log the action
    console.log('Training reminders sent to users with upcoming deadlines');
  }
  // ===== INITIALIZATION =====
  private initializeDefaultModules(): void {
    const defaultModules: Partial<TrainingModule>[] = [
      {
        title: 'HIPAA Fundamentals',
        description: 'Essential HIPAA compliance training for healthcare workers',
        category: 'HIPAA_COMPLIANCE',
        difficulty: 'BEGINNER',
        estimatedDuration: 30,
        mandatory: true,
        content: [
          {
            id: 'content-1',
            type: 'TEXT',
            title: 'Introduction to HIPAA',
            content: '<h2>What is HIPAA?</h2><p>The Health Insurance Portability and Accountability Act...</p>',
            duration: 10,
            order: 1,
            metadata: {},
          },
          {
            id: 'content-2',
            type: 'VIDEO',
            title: 'PHI Protection Best Practices',
            content: 'https://example.com/hipaa-video',
            duration: 15,
            order: 2,
            metadata: {},
          },
        ],
        assessments: [
          {
            id: 'assessment-1',
            title: 'HIPAA Knowledge Check',
            type: 'QUIZ',
            questions: [
              {
                id: 'q1',
                type: 'MULTIPLE_CHOICE',
                question: 'What does PHI stand for?',
                options: ['Personal Health Information', 'Protected Health Information', 'Private Health Information'],
                correctAnswer: 'Protected Health Information',
                explanation: 'PHI stands for Protected Health Information under HIPAA.',
                points: 10,
                category: 'definitions',
              },
            ],
            passingScore: 80,
            maxAttempts: 3,
            mandatory: true,
          },
        ],
        prerequisites: [],
        tags: ['compliance', 'healthcare', 'privacy'],
        version: '1.0',
        createdBy: 'SYSTEM',
        published: true,
      },
      {
        title: 'Phishing Awareness Training',
        description: 'Learn to identify and respond to phishing attacks',
        category: 'PHISHING_AWARENESS',
        difficulty: 'BEGINNER',
        estimatedDuration: 25,
        mandatory: true,
        content: [
          {
            id: 'content-1',
            type: 'INTERACTIVE',
            title: 'Phishing Simulation',
            content: 'Interactive phishing email examples',
            duration: 15,
            order: 1,
            metadata: {},
          },
        ],
        assessments: [
          {
            id: 'assessment-1',
            title: 'Phishing Identification Test',
            type: 'SCENARIO',
            questions: [
              {
                id: 'q1',
                type: 'TRUE_FALSE',
                question: 'This email asking for password reset is legitimate.',
                correctAnswer: 'false',
                explanation: 'Always verify password reset requests through official channels.',
                points: 10,
                category: 'identification',
              },
            ],
            passingScore: 85,
            maxAttempts: 2,
            mandatory: true,
          },
        ],
        prerequisites: [],
        tags: ['security', 'email', 'awareness'],
        version: '1.0',
        createdBy: 'SYSTEM',
        published: true,
      },
    ];
    console.log(`📚 Initialized ${defaultModules.length} default training modules`);
  }
  // ===== UTILITY METHODS =====
  private async storeTrainingReport(report: TrainingReport): Promise<void> {
    try {
      await this.databaseService.insert('training_reports', {
        id: report.id,
        type: report.type,
        generated_at: report.generatedAt,
        generated_by: report.generatedBy,
        period: JSON.stringify(report.period),
        filters: JSON.stringify(report.filters),
        metrics: JSON.stringify(report.metrics),
        recommendations: JSON.stringify(report.recommendations),
      });
    } catch (error) {
      console.error('Failed to store training report:', error);
    }
  }
  // Public methods for external access
  async getTrainingModules(category?: TrainingCategory): Promise<TrainingModule[]> {
    const modules = Array.from(this.trainingModules.values());
    return category ? modules.filter(m => m.category === category) : modules;
  }
  async getUserTrainingRecords(userId: string): Promise<UserTrainingRecord[]> {
    try {
      const result = await this.databaseService.select<any>('user_training_records', {
        filters: { user_id: userId },
        orderBy: [{ column: 'assigned_at', ascending: false }],
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get user training records:', error);
      return [];
    }
  }
  async getTrainingStatistics(): Promise<{
    totalModules: number;
    activeModules: number;
    totalUsers: number;
    completionRate: number;
    averageScore: number;
    complianceRate: number;
  }> {
    const modules = Array.from(this.trainingModules.values());
    const activeModules = modules.filter(m => m.published);
    // In production, these would be calculated from actual data
    return {
      totalModules: modules.length,
      activeModules: activeModules.length,
      totalUsers: 150,
      completionRate: 85,
      averageScore: 87,
      complianceRate: 92,
    };
  }
}
// Factory function to create security training service
export function createSecurityTrainingService(databaseService: DatabaseService): SecurityTrainingService {
  return new SecurityTrainingService(databaseService);
}
