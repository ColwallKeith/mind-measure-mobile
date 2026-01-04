// Dynamic Security Policy Service
// Medical-grade security implementation for automated policy enforcement
import { createAuditLogger, AuditLogger } from './AuditLogger';
import { DatabaseService } from '../database/DatabaseService';
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  type: PolicyType;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  priority: number; // Higher number = higher priority
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
}
export type PolicyCategory =
  | 'ACCESS_CONTROL' | 'DATA_PROTECTION' | 'AUTHENTICATION'
  | 'COMPLIANCE' | 'INCIDENT_RESPONSE' | 'MONITORING';
export type PolicyType =
  | 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'COMPENSATING';
export interface PolicyCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN' | 'REGEX';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}
export interface PolicyAction {
  type: ActionType;
  parameters: Record<string, any>;
  delay?: number; // Delay in seconds before executing
}
export type ActionType =
  | 'BLOCK_ACCESS' | 'REQUIRE_MFA' | 'LOG_EVENT' | 'SEND_ALERT'
  | 'DISABLE_USER' | 'QUARANTINE_DATA' | 'BACKUP_DATA' | 'NOTIFY_ADMIN'
  | 'REDIRECT_USER' | 'APPLY_RATE_LIMIT' | 'ENCRYPT_DATA' | 'AUDIT_TRAIL';
export interface PolicyEvaluation {
  policyId: string;
  matched: boolean;
  conditions: ConditionResult[];
  actions: ActionResult[];
  evaluatedAt: string;
  context: Record<string, any>;
}
export interface ConditionResult {
  condition: PolicyCondition;
  matched: boolean;
  actualValue: any;
  reason?: string;
}
export interface ActionResult {
  action: PolicyAction;
  executed: boolean;
  result?: any;
  error?: string;
  executedAt?: string;
}
export interface PolicyTemplate {
  name: string;
  description: string;
  category: PolicyCategory;
  type: PolicyType;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  priority: number;
}
export class SecurityPolicyService {
  private auditLogger: AuditLogger;
  private databaseService: DatabaseService;
  private activePolicies: Map<string, SecurityPolicy>;
  private policyCache: Map<string, PolicyEvaluation[]>;
  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.auditLogger = createAuditLogger(databaseService);
    this.activePolicies = new Map();
    this.policyCache = new Map();
    this.initializePolicies();
  }
  // ===== POLICY MANAGEMENT =====
  async createPolicy(
    policyData: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>,
    createdBy: string
  ): Promise<{ success: boolean; policy?: SecurityPolicy; error?: string }> {
    try {
      const policy: SecurityPolicy = {
        ...policyData,
        id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      };
      const result = await this.databaseService.insert('security_policies', {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        category: policy.category,
        type: policy.type,
        conditions: JSON.stringify(policy.conditions),
        actions: JSON.stringify(policy.actions),
        priority: policy.priority,
        enabled: policy.enabled,
        created_by: createdBy,
        created_at: policy.createdAt,
        updated_at: policy.updatedAt,
        trigger_count: policy.triggerCount,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      // Add to active policies if enabled
      if (policy.enabled) {
        this.activePolicies.set(policy.id, policy);
      }
      // Log policy creation
      await this.auditLogger.logAdminAction(
        'SECURITY_POLICY_CREATE',
        createdBy,
        createdBy,
        policy.id,
        { policyName: policy.name, category: policy.category }
      );
      return { success: true, policy };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async updatePolicy(
    policyId: string,
    updates: Partial<SecurityPolicy>,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.update('security_policies', policyId, {
        ...updates,
        updated_at: new Date().toISOString(),
        conditions: updates.conditions ? JSON.stringify(updates.conditions) : undefined,
        actions: updates.actions ? JSON.stringify(updates.actions) : undefined,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      // Update active policies cache
      if (this.activePolicies.has(policyId)) {
        const existingPolicy = this.activePolicies.get(policyId)!;
        const updatedPolicy = { ...existingPolicy, ...updates, updatedAt: new Date().toISOString() };
        if (updatedPolicy.enabled) {
          this.activePolicies.set(policyId, updatedPolicy);
        } else {
          this.activePolicies.delete(policyId);
        }
      }
      // Log policy update
      await this.auditLogger.logAdminAction(
        'SECURITY_POLICY_UPDATE',
        updatedBy,
        updatedBy,
        policyId,
        { updates: Object.keys(updates) }
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async deletePolicy(policyId: string, deletedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.delete('security_policies', policyId);
      if (result.error) {
        return { success: false, error: result.error };
      }
      // Remove from active policies
      this.activePolicies.delete(policyId);
      // Log policy deletion
      await this.auditLogger.logAdminAction(
        'SECURITY_POLICY_DELETE',
        deletedBy,
        deletedBy,
        policyId,
        { action: 'delete' }
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async getPolicies(filters?: {
    category?: PolicyCategory;
    type?: PolicyType;
    enabled?: boolean;
  }): Promise<SecurityPolicy[]> {
    try {
      const dbFilters: Record<string, any> = {};
      if (filters?.category) dbFilters.category = filters.category;
      if (filters?.type) dbFilters.type = filters.type;
      if (filters?.enabled !== undefined) dbFilters.enabled = filters.enabled;
      const result = await this.databaseService.select<any>('security_policies', {
        filters: dbFilters,
        orderBy: [{ column: 'priority', ascending: false }, { column: 'created_at', ascending: false }],
      });
      return (result.data || []).map(this.mapDatabaseToPolicy);
    } catch (error) {
      console.error('Failed to get policies:', error);
      return [];
    }
  }
  // ===== POLICY EVALUATION =====
  async evaluateContext(context: Record<string, any>): Promise<PolicyEvaluation[]> {
    const evaluations: PolicyEvaluation[] = [];
    // Get policies sorted by priority
    const policies = Array.from(this.activePolicies.values()).sort((a, b) => b.priority - a.priority);
    for (const policy of policies) {
      const evaluation = await this.evaluatePolicy(policy, context);
      evaluations.push(evaluation);
      // If policy matched and has blocking actions, stop evaluation
      if (evaluation.matched && this.hasBlockingActions(policy)) {
        break;
      }
    }
    return evaluations;
  }
  private async evaluatePolicy(policy: SecurityPolicy, context: Record<string, any>): Promise<PolicyEvaluation> {
    const evaluation: PolicyEvaluation = {
      policyId: policy.id,
      matched: false,
      conditions: [],
      actions: [],
      evaluatedAt: new Date().toISOString(),
      context,
    };
    // Evaluate all conditions
    let overallMatch = true;
    let currentLogicalOperator: 'AND' | 'OR' = 'AND';
    for (let i = 0; i < policy.conditions.length; i++) {
      const condition = policy.conditions[i];
      const conditionResult = this.evaluateCondition(condition, context);
      evaluation.conditions.push(conditionResult);
      if (i === 0) {
        overallMatch = conditionResult.matched;
      } else {
        if (currentLogicalOperator === 'AND') {
          overallMatch = overallMatch && conditionResult.matched;
        } else {
          overallMatch = overallMatch || conditionResult.matched;
        }
      }
      // Update logical operator for next condition
      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }
    evaluation.matched = overallMatch;
    // Execute actions if policy matched
    if (overallMatch) {
      evaluation.actions = await this.executeActions(policy, context);
      // Update trigger count
      await this.updateTriggerCount(policy.id);
    }
    return evaluation;
  }
  private evaluateCondition(condition: PolicyCondition, context: Record<string, any>): ConditionResult {
    const actualValue = this.getNestedValue(context, condition.field);
    let matched = false;
    let reason = '';
    try {
      switch (condition.operator) {
        case 'EQUALS':
          matched = actualValue === condition.value;
          break;
        case 'NOT_EQUALS':
          matched = actualValue !== condition.value;
          break;
        case 'CONTAINS':
          matched = String(actualValue).includes(String(condition.value));
          break;
        case 'NOT_CONTAINS':
          matched = !String(actualValue).includes(String(condition.value));
          break;
        case 'GREATER_THAN':
          matched = Number(actualValue) > Number(condition.value);
          break;
        case 'LESS_THAN':
          matched = Number(actualValue) < Number(condition.value);
          break;
        case 'IN':
          matched = Array.isArray(condition.value) && condition.value.includes(actualValue);
          break;
        case 'NOT_IN':
          matched = Array.isArray(condition.value) && !condition.value.includes(actualValue);
          break;
        case 'REGEX':
          const regex = new RegExp(condition.value);
          matched = regex.test(String(actualValue));
          break;
        default:
          reason = `Unknown operator: ${condition.operator}`;
      }
    } catch (error: any) {
      reason = `Evaluation error: ${error.message}`;
    }
    return {
      condition,
      matched,
      actualValue,
      reason: reason || undefined,
    };
  }
  private async executeActions(policy: SecurityPolicy, context: Record<string, any>): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of policy.actions) {
      const result: ActionResult = {
        action,
        executed: false,
      };
      try {
        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
        }
        switch (action.type) {
          case 'BLOCK_ACCESS':
            result.result = await this.blockAccess(context, action.parameters);
            break;
          case 'REQUIRE_MFA':
            result.result = await this.requireMFA(context, action.parameters);
            break;
          case 'LOG_EVENT':
            result.result = await this.logEvent(context, action.parameters);
            break;
          case 'SEND_ALERT':
            result.result = await this.sendAlert(context, action.parameters);
            break;
          case 'DISABLE_USER':
            result.result = await this.disableUser(context, action.parameters);
            break;
          case 'NOTIFY_ADMIN':
            result.result = await this.notifyAdmin(context, action.parameters);
            break;
          case 'APPLY_RATE_LIMIT':
            result.result = await this.applyRateLimit(context, action.parameters);
            break;
          case 'AUDIT_TRAIL':
            result.result = await this.createAuditTrail(context, action.parameters);
            break;
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }
        result.executed = true;
        result.executedAt = new Date().toISOString();
      } catch (error: any) {
        result.executed = false;
        result.error = error.message;
      }
      results.push(result);
    }
    return results;
  }
  // ===== ACTION IMPLEMENTATIONS =====
  private async blockAccess(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const userId = context.userId || context.user_id;
    const resource = parameters.resource || context.resource;
    console.log(`🚫 POLICY ACTION: Blocking access for user ${userId} to resource ${resource}`);
    // In production, this would:
    // - Add user to blocked list
    // - Revoke current session
    // - Update access control rules
    return `Access blocked for user ${userId}`;
  }
  private async requireMFA(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const userId = context.userId || context.user_id;
    console.log(`🔐 POLICY ACTION: Requiring MFA for user ${userId}`);
    // In production, this would:
    // - Force MFA challenge
    // - Update session requirements
    // - Redirect to MFA setup if needed
    return `MFA required for user ${userId}`;
  }
  private async logEvent(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const eventType = parameters.eventType || 'POLICY_TRIGGERED';
    const message = parameters.message || 'Security policy triggered';
    await this.auditLogger.log({
      userId: context.userId || 'SYSTEM',
      action: eventType,
      resource: 'security_policy',
      details: { message, context, parameters },
      success: true,
      riskLevel: parameters.riskLevel || 'MEDIUM',
    });
    return `Event logged: ${eventType}`;
  }
  private async sendAlert(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const alertType = parameters.alertType || 'SECURITY_POLICY';
    const message = parameters.message || 'Security policy violation detected';
    console.log(`🚨 POLICY ALERT: ${alertType} - ${message}`);
    // In production, this would:
    // - Send email notifications
    // - Create Slack/Teams alerts
    // - Update security dashboard
    // - Trigger PagerDuty if critical
    return `Alert sent: ${alertType}`;
  }
  private async disableUser(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const userId = context.userId || context.user_id;
    const reason = parameters.reason || 'Security policy violation';
    console.log(`🚫 POLICY ACTION: Disabling user ${userId} - ${reason}`);
    // In production, this would:
    // - Disable user in Cognito
    // - Revoke all active sessions
    // - Update user status in database
    // - Send notification to user and admins
    return `User ${userId} disabled: ${reason}`;
  }
  private async notifyAdmin(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const adminRole = parameters.adminRole || 'security_team';
    const message = parameters.message || 'Security policy requires admin attention';
    console.log(`📧 POLICY NOTIFICATION: ${adminRole} - ${message}`);
    // In production, this would:
    // - Query users with admin role
    // - Send email notifications
    // - Create dashboard notifications
    // - Log notification in audit trail
    return `Admin notification sent to ${adminRole}`;
  }
  private async applyRateLimit(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const userId = context.userId || context.user_id;
    const limit = parameters.limit || 10;
    const window = parameters.window || 3600; // 1 hour
    console.log(`⏱️ POLICY ACTION: Applying rate limit ${limit}/${window}s for user ${userId}`);
    // In production, this would:
    // - Update rate limiting rules
    // - Store rate limit state
    // - Apply limits at API gateway level
    return `Rate limit applied: ${limit}/${window}s for user ${userId}`;
  }
  private async createAuditTrail(context: Record<string, any>, parameters: Record<string, any>): Promise<string> {
    const trailType = parameters.trailType || 'POLICY_ENFORCEMENT';
    await this.auditLogger.log({
      userId: context.userId || 'SYSTEM',
      action: trailType,
      resource: 'security_policy',
      details: {
        policyTriggered: true,
        context,
        parameters,
        timestamp: new Date().toISOString()
      },
      success: true,
      riskLevel: 'HIGH',
    });
    return `Audit trail created: ${trailType}`;
  }
  // ===== POLICY TEMPLATES =====
  getDefaultPolicyTemplates(): PolicyTemplate[] {
    return [
      {
        name: 'Brute Force Protection',
        description: 'Block users after multiple failed login attempts',
        category: 'AUTHENTICATION',
        type: 'PREVENTIVE',
        conditions: [
          { field: 'action', operator: 'EQUALS', value: 'LOGIN_FAILURE' },
          { field: 'failureCount', operator: 'GREATER_THAN', value: 5, logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'BLOCK_ACCESS', parameters: { duration: 3600, reason: 'Brute force protection' } },
          { type: 'SEND_ALERT', parameters: { alertType: 'BRUTE_FORCE', severity: 'HIGH' } }
        ],
        priority: 90,
      },
      {
        name: 'Off-Hours PHI Access',
        description: 'Alert on PHI access outside business hours',
        category: 'DATA_PROTECTION',
        type: 'DETECTIVE',
        conditions: [
          { field: 'resource', operator: 'EQUALS', value: 'phi_data' },
          { field: 'hour', operator: 'NOT_IN', value: [9, 10, 11, 12, 13, 14, 15, 16, 17], logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'LOG_EVENT', parameters: { eventType: 'OFF_HOURS_PHI_ACCESS', riskLevel: 'MEDIUM' } },
          { type: 'NOTIFY_ADMIN', parameters: { adminRole: 'compliance_officer', message: 'Off-hours PHI access detected' } }
        ],
        priority: 70,
      },
      {
        name: 'Admin Role Assignment',
        description: 'Require approval for admin role assignments',
        category: 'ACCESS_CONTROL',
        type: 'PREVENTIVE',
        conditions: [
          { field: 'action', operator: 'EQUALS', value: 'ROLE_ASSIGN' },
          { field: 'roleLevel', operator: 'GREATER_THAN', value: 80, logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'REQUIRE_MFA', parameters: { reason: 'Admin role assignment requires MFA' } },
          { type: 'NOTIFY_ADMIN', parameters: { adminRole: 'super_admin', message: 'Admin role assignment requires approval' } }
        ],
        priority: 95,
      },
      {
        name: 'Bulk Data Export',
        description: 'Monitor and control bulk data exports',
        category: 'DATA_PROTECTION',
        type: 'DETECTIVE',
        conditions: [
          { field: 'action', operator: 'EQUALS', value: 'PHI_EXPORT' },
          { field: 'recordCount', operator: 'GREATER_THAN', value: 100, logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'SEND_ALERT', parameters: { alertType: 'BULK_EXPORT', severity: 'CRITICAL' } },
          { type: 'AUDIT_TRAIL', parameters: { trailType: 'BULK_DATA_EXPORT' } },
          { type: 'NOTIFY_ADMIN', parameters: { adminRole: 'compliance_officer' } }
        ],
        priority: 85,
      },
      {
        name: 'Suspicious IP Access',
        description: 'Block access from suspicious IP addresses',
        category: 'ACCESS_CONTROL',
        type: 'PREVENTIVE',
        conditions: [
          { field: 'ipAddress', operator: 'IN', value: ['192.168.1.100', '10.0.0.50'] }
        ],
        actions: [
          { type: 'BLOCK_ACCESS', parameters: { reason: 'Suspicious IP address' } },
          { type: 'SEND_ALERT', parameters: { alertType: 'SUSPICIOUS_IP', severity: 'HIGH' } }
        ],
        priority: 100,
      }
    ];
  }
  async createPolicyFromTemplate(
    templateName: string,
    customizations: Partial<SecurityPolicy>,
    createdBy: string
  ): Promise<{ success: boolean; policy?: SecurityPolicy; error?: string }> {
    const template = this.getDefaultPolicyTemplates().find(t => t.name === templateName);
    if (!template) {
      return { success: false, error: `Template not found: ${templateName}` };
    }
    const policyData: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'> = {
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      category: customizations.category || template.category,
      type: customizations.type || template.type,
      conditions: customizations.conditions || template.conditions,
      actions: customizations.actions || template.actions,
      priority: customizations.priority || template.priority,
      enabled: customizations.enabled !== undefined ? customizations.enabled : true,
      createdBy,
    };
    return await this.createPolicy(policyData, createdBy);
  }
  // ===== UTILITY METHODS =====
  private async initializePolicies(): Promise<void> {
    try {
      const policies = await this.getPolicies({ enabled: true });
      this.activePolicies.clear();
      for (const policy of policies) {
        this.activePolicies.set(policy.id, policy);
      }
      console.log(`🛡️ Loaded ${policies.length} active security policies`);
    } catch (error) {
      console.error('Failed to initialize security policies:', error);
    }
  }
  private hasBlockingActions(policy: SecurityPolicy): boolean {
    const blockingActions = ['BLOCK_ACCESS', 'DISABLE_USER'];
    return policy.actions.some(action => blockingActions.includes(action.type));
  }
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  private async updateTriggerCount(policyId: string): Promise<void> {
    try {
      await this.databaseService.update('security_policies', policyId, {
        trigger_count: 'trigger_count + 1', // SQL expression
        last_triggered: new Date().toISOString(),
      });
      // Update cache
      const policy = this.activePolicies.get(policyId);
      if (policy) {
        policy.triggerCount += 1;
        policy.lastTriggered = new Date().toISOString();
      }
    } catch (error) {
      console.error('Failed to update trigger count:', error);
    }
  }
  private mapDatabaseToPolicy(dbRow: any): SecurityPolicy {
    return {
      id: dbRow.id,
      name: dbRow.name,
      description: dbRow.description,
      category: dbRow.category,
      type: dbRow.type,
      conditions: JSON.parse(dbRow.conditions || '[]'),
      actions: JSON.parse(dbRow.actions || '[]'),
      priority: dbRow.priority,
      enabled: dbRow.enabled,
      createdBy: dbRow.created_by,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      lastTriggered: dbRow.last_triggered,
      triggerCount: dbRow.trigger_count || 0,
    };
  }
  // Public method to evaluate policies for a given context
  async evaluatePoliciesForContext(context: Record<string, any>): Promise<PolicyEvaluation[]> {
    return await this.evaluateContext(context);
  }
  // Public method to get policy statistics
  async getPolicyStatistics(): Promise<{
    totalPolicies: number;
    enabledPolicies: number;
    policiesByCategory: Record<string, number>;
    policiesByType: Record<string, number>;
    mostTriggeredPolicies: Array<{ policyId: string; name: string; triggerCount: number }>;
  }> {
    const allPolicies = await this.getPolicies();
    const enabledPolicies = allPolicies.filter(p => p.enabled);
    const policiesByCategory = allPolicies.reduce((acc, policy) => {
      acc[policy.category] = (acc[policy.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const policiesByType = allPolicies.reduce((acc, policy) => {
      acc[policy.type] = (acc[policy.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostTriggeredPolicies = allPolicies
      .sort((a, b) => b.triggerCount - a.triggerCount)
      .slice(0, 5)
      .map(p => ({ policyId: p.id, name: p.name, triggerCount: p.triggerCount }));
    return {
      totalPolicies: allPolicies.length,
      enabledPolicies: enabledPolicies.length,
      policiesByCategory,
      policiesByType,
      mostTriggeredPolicies,
    };
  }
}
// Factory function to create security policy service
export function createSecurityPolicyService(databaseService: DatabaseService): SecurityPolicyService {
  return new SecurityPolicyService(databaseService);
}
