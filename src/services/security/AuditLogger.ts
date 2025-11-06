// Comprehensive Audit Logging Service
// Medical-grade security implementation for HIPAA compliance
import { DatabaseService } from '../database/DatabaseService';
export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  userId: string;
  userEmail?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceFlags?: string[];
}
export type AuditAction =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'MFA_SUCCESS' | 'MFA_FAILURE'
  | 'PHI_VIEW' | 'PHI_EXPORT' | 'PHI_CREATE' | 'PHI_UPDATE' | 'PHI_DELETE'
  | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'ROLE_ASSIGN'
  | 'SECURITY_BREACH' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  | 'FILE_UPLOAD' | 'FILE_DOWNLOAD' | 'FILE_DELETE';
export class AuditLogger {
  private databaseService: DatabaseService;
  private tableName = 'audit_logs';
  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> | any): Promise<void> {
    try {
      // Handle both new and legacy audit log formats
      const auditEntry: AuditLogEntry = {
        userId: entry.userId || entry.user_id || 'SYSTEM',
        userEmail: entry.userEmail || entry.user_email,
        action: entry.action || entry.event_type || 'UNKNOWN',
        resource: entry.resource || entry.resource_type || 'unknown',
        resourceId: entry.resourceId || entry.resource_id,
        details: entry.details || {},
        ipAddress: entry.ipAddress || entry.ip_address,
        userAgent: entry.userAgent || entry.user_agent,
        sessionId: entry.sessionId || entry.session_id,
        success: entry.success !== undefined ? entry.success : true,
        errorMessage: entry.errorMessage || entry.error,
        riskLevel: entry.riskLevel || this.calculateRiskLevel(entry.action || 'UNKNOWN', entry.success !== false),
        timestamp: new Date().toISOString(),
        complianceFlags: this.getComplianceFlags(entry.action || 'UNKNOWN', entry.resource || 'unknown'),
      };
      // Map to database column names (lowercase for compatibility)
      const dbEntry = {
        userid: auditEntry.userId,
        user_email: auditEntry.userEmail,
        action: auditEntry.action,
        resource: auditEntry.resource,
        resource_id: auditEntry.resourceId,
        details: JSON.stringify(auditEntry.details),
        ip_address: auditEntry.ipAddress,
        user_agent: auditEntry.userAgent,
        session_id: auditEntry.sessionId,
        success: auditEntry.success,
        error_message: auditEntry.errorMessage,
        risk_level: auditEntry.riskLevel,
        timestamp: auditEntry.timestamp,
        compliance_flags: JSON.stringify(auditEntry.complianceFlags)
      };
      
      await this.databaseService.insert(this.tableName, dbEntry);
      if (auditEntry.riskLevel === 'CRITICAL') {
        console.warn('CRITICAL SECURITY EVENT:', auditEntry);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }
  // Legacy method for backward compatibility with new services
  async logAdminAction(
    action: string,
    adminUserId: string,
    targetUserId: string,
    resourceId: string,
    details: object
  ): Promise<void> {
    await this.log({
      userId: adminUserId,
      action: action as AuditAction,
      resource: 'admin_action',
      resourceId,
      details: { ...details, targetUserId },
      success: true,
      riskLevel: 'HIGH',
    });
  }
  async logAuth(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'MFA_SUCCESS' | 'MFA_FAILURE',
    userId: string,
    userEmail?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      userEmail,
      action,
      resource: 'authentication',
      ipAddress,
      success: action.includes('SUCCESS'),
      riskLevel: action.includes('FAILURE') ? 'HIGH' : 'MEDIUM',
    });
  }
  async logPHIAccess(
    action: 'PHI_VIEW' | 'PHI_EXPORT' | 'PHI_CREATE' | 'PHI_UPDATE' | 'PHI_DELETE',
    userId: string,
    userEmail: string,
    resourceId: string,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      userId,
      userEmail,
      action,
      resource: 'phi_data',
      resourceId,
      success,
      riskLevel: action === 'PHI_DELETE' ? 'HIGH' : 'MEDIUM',
    });
  }
  private calculateRiskLevel(action: AuditAction, success: boolean): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (!success && (action.includes('SECURITY') || action.includes('PHI'))) return 'CRITICAL';
    if (action.includes('DELETE') || action.includes('SECURITY')) return 'HIGH';
    if (action.includes('PHI') || action.includes('LOGIN')) return 'MEDIUM';
    return 'LOW';
  }
  private getComplianceFlags(action: AuditAction, resource: string): string[] {
    const flags: string[] = [];
    if (resource === 'phi_data' || action.includes('PHI')) flags.push('HIPAA_RELEVANT');
    if (action.includes('DELETE') || action.includes('EXPORT')) flags.push('GDPR_RELEVANT');
    return flags;
  }
}
export function createAuditLogger(databaseService: DatabaseService): AuditLogger {
  return new AuditLogger(databaseService);
}