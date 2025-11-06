// Incident Response & Security Monitoring Service
// Medical-grade security implementation for automated threat detection and response
import { createAuditLogger, AuditLogger } from './AuditLogger';
import { DatabaseService } from '../database/DatabaseService';
export interface SecurityIncident {
  id: string;
  type: IncidentType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string;
  detectedAt: string;
  detectedBy: 'SYSTEM' | 'USER' | 'EXTERNAL';
  affectedSystems: string[];
  affectedUsers: string[];
  indicators: SecurityIndicator[];
  response: IncidentResponse;
  timeline: IncidentTimelineEntry[];
  metadata: Record<string, any>;
}
export type IncidentType =
  | 'UNAUTHORIZED_ACCESS' | 'DATA_BREACH' | 'MALWARE' | 'PHISHING'
  | 'BRUTE_FORCE' | 'PRIVILEGE_ESCALATION' | 'DATA_EXFILTRATION'
  | 'SYSTEM_COMPROMISE' | 'COMPLIANCE_VIOLATION' | 'INSIDER_THREAT'
  | 'DDOS_ATTACK' | 'VULNERABILITY_EXPLOITATION' | 'SUSPICIOUS_ACTIVITY';
export interface SecurityIndicator {
  type: 'IP_ADDRESS' | 'USER_AGENT' | 'GEOLOCATION' | 'BEHAVIOR' | 'PATTERN' | 'ANOMALY';
  value: string;
  confidence: number; // 0-100
  source: string;
  timestamp: string;
}
export interface IncidentResponse {
  automated: AutomatedResponse[];
  manual: ManualResponse[];
  containmentActions: string[];
  recoveryActions: string[];
  preventionMeasures: string[];
}
export interface AutomatedResponse {
  action: 'BLOCK_IP' | 'DISABLE_USER' | 'QUARANTINE_SYSTEM' | 'ALERT_ADMIN' | 'BACKUP_DATA' | 'ISOLATE_NETWORK';
  executed: boolean;
  executedAt?: string;
  result?: string;
  error?: string;
}
export interface ManualResponse {
  action: string;
  assignedTo: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  notes?: string;
}
export interface IncidentTimelineEntry {
  timestamp: string;
  event: string;
  actor: string;
  details: string;
}
export interface ThreatIntelligence {
  source: string;
  type: 'IOC' | 'TTPs' | 'VULNERABILITY' | 'CAMPAIGN';
  indicators: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  lastUpdated: string;
}
export interface SecurityAlert {
  id: string;
  type: 'ANOMALY' | 'THRESHOLD' | 'PATTERN' | 'RULE_VIOLATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  source: string;
  timestamp: string;
  metadata: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}
export class IncidentResponseService {
  private auditLogger: AuditLogger;
  private databaseService: DatabaseService;
  private alertThresholds: Map<string, number>;
  private blockedIPs: Set<string>;
  private suspiciousUsers: Set<string>;
  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.auditLogger = createAuditLogger(databaseService);
    this.alertThresholds = new Map();
    this.blockedIPs = new Set();
    this.suspiciousUsers = new Set();
    this.initializeThresholds();
    this.startContinuousMonitoring();
  }
  // ===== INCIDENT DETECTION =====
  async detectSecurityIncidents(): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    try {
      // Analyze recent audit logs for suspicious patterns
      const recentLogs = await this.getRecentAuditLogs();
      // Detect various threat patterns
      incidents.push(...await this.detectBruteForceAttacks(recentLogs));
      incidents.push(...await this.detectUnauthorizedAccess(recentLogs));
      incidents.push(...await this.detectPrivilegeEscalation(recentLogs));
      incidents.push(...await this.detectDataExfiltration(recentLogs));
      incidents.push(...await this.detectAnomalousActivity(recentLogs));
      incidents.push(...await this.detectComplianceViolations(recentLogs));
      // Create incidents for new threats
      for (const incident of incidents) {
        await this.createIncident(incident);
      }
      return incidents;
    } catch (error: any) {
      console.error('Incident detection failed:', error);
      return [];
    }
  }
  private async detectBruteForceAttacks(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    const failedLogins = logs.filter(log => log.action === 'LOGIN_FAILURE');
    // Group by IP address
    const ipFailures = new Map<string, any[]>();
    failedLogins.forEach(log => {
      const ip = log.ip_address || 'unknown';
      if (!ipFailures.has(ip)) ipFailures.set(ip, []);
      ipFailures.get(ip)!.push(log);
    });
    // Check for brute force patterns
    for (const [ip, failures] of ipFailures) {
      if (failures.length >= 10) { // 10+ failures from same IP
        const timeSpan = new Date(failures[failures.length - 1].timestamp).getTime() -
                        new Date(failures[0].timestamp).getTime();
        if (timeSpan < 300000) { // Within 5 minutes
          incidents.push({
            id: `brute-force-${Date.now()}-${ip.replace(/\./g, '-')}`,
            type: 'BRUTE_FORCE',
            severity: 'HIGH',
            status: 'OPEN',
            title: `Brute Force Attack Detected from ${ip}`,
            description: `${failures.length} failed login attempts from IP ${ip} within ${Math.round(timeSpan/1000)} seconds`,
            detectedAt: new Date().toISOString(),
            detectedBy: 'SYSTEM',
            affectedSystems: ['authentication'],
            affectedUsers: [...new Set(failures.map(f => f.user_id))],
            indicators: [
              {
                type: 'IP_ADDRESS',
                value: ip,
                confidence: 95,
                source: 'audit_logs',
                timestamp: new Date().toISOString(),
              }
            ],
            response: {
              automated: [
                { action: 'BLOCK_IP', executed: false },
                { action: 'ALERT_ADMIN', executed: false }
              ],
              manual: [],
              containmentActions: [`Block IP address ${ip}`, 'Review affected user accounts'],
              recoveryActions: ['Monitor for continued attempts', 'Reset affected user passwords'],
              preventionMeasures: ['Implement rate limiting', 'Add CAPTCHA after failures']
            },
            timeline: [],
            metadata: { ip, failureCount: failures.length, timeSpan }
          });
        }
      }
    }
    return incidents;
  }
  private async detectUnauthorizedAccess(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    const accessLogs = logs.filter(log => log.action === 'ACCESS_DENIED');
    // Group by user
    const userDenials = new Map<string, any[]>();
    accessLogs.forEach(log => {
      const userId = log.user_id;
      if (!userDenials.has(userId)) userDenials.set(userId, []);
      userDenials.get(userId)!.push(log);
    });
    // Check for repeated unauthorized access attempts
    for (const [userId, denials] of userDenials) {
      if (denials.length >= 5) { // 5+ access denials
        const resources = [...new Set(denials.map(d => d.resource))];
        incidents.push({
          id: `unauthorized-access-${Date.now()}-${userId}`,
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'MEDIUM',
          status: 'OPEN',
          title: `Repeated Unauthorized Access Attempts by ${userId}`,
          description: `User ${userId} attempted to access ${resources.length} unauthorized resources ${denials.length} times`,
          detectedAt: new Date().toISOString(),
          detectedBy: 'SYSTEM',
          affectedSystems: resources,
          affectedUsers: [userId],
          indicators: [
            {
              type: 'BEHAVIOR',
              value: 'repeated_access_denials',
              confidence: 80,
              source: 'rbac_system',
              timestamp: new Date().toISOString(),
            }
          ],
          response: {
            automated: [
              { action: 'ALERT_ADMIN', executed: false }
            ],
            manual: [
              {
                action: 'Review user permissions and access patterns',
                assignedTo: 'security_team',
                dueDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
                status: 'PENDING'
              }
            ],
            containmentActions: ['Monitor user activity', 'Review role assignments'],
            recoveryActions: ['Adjust user permissions if needed'],
            preventionMeasures: ['Implement access request workflow', 'User training on proper access']
          },
          timeline: [],
          metadata: { userId, denialCount: denials.length, resources }
        });
      }
    }
    return incidents;
  }
  private async detectPrivilegeEscalation(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    const roleChanges = logs.filter(log => log.action === 'ROLE_ASSIGN');
    // Look for suspicious role assignments
    for (const log of roleChanges) {
      const details = log.details || {};
      // Check for admin role assignments
      if (details.roleName && details.roleName.includes('admin')) {
        incidents.push({
          id: `privilege-escalation-${Date.now()}-${log.user_id}`,
          type: 'PRIVILEGE_ESCALATION',
          severity: 'HIGH',
          status: 'OPEN',
          title: `Administrative Role Assignment to ${log.user_id}`,
          description: `User ${log.user_id} was assigned administrative role ${details.roleName}`,
          detectedAt: new Date().toISOString(),
          detectedBy: 'SYSTEM',
          affectedSystems: ['rbac_system'],
          affectedUsers: [log.user_id],
          indicators: [
            {
              type: 'BEHAVIOR',
              value: 'admin_role_assignment',
              confidence: 90,
              source: 'rbac_system',
              timestamp: log.timestamp,
            }
          ],
          response: {
            automated: [
              { action: 'ALERT_ADMIN', executed: false }
            ],
            manual: [
              {
                action: 'Verify legitimate business need for admin access',
                assignedTo: 'security_team',
                dueDate: new Date(Date.now() + 4*60*60*1000).toISOString(), // 4 hours
                status: 'PENDING'
              }
            ],
            containmentActions: ['Review role assignment justification'],
            recoveryActions: ['Revoke role if unauthorized'],
            preventionMeasures: ['Implement approval workflow for admin roles']
          },
          timeline: [],
          metadata: { assignedRole: details.roleName, assignedBy: details.assignedBy }
        });
      }
    }
    return incidents;
  }
  private async detectDataExfiltration(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    const exportLogs = logs.filter(log => log.action === 'PHI_EXPORT' || log.action === 'PHI_BULK_ACCESS');
    // Group by user and check for unusual export patterns
    const userExports = new Map<string, any[]>();
    exportLogs.forEach(log => {
      const userId = log.user_id;
      if (!userExports.has(userId)) userExports.set(userId, []);
      userExports.get(userId)!.push(log);
    });
    for (const [userId, exports] of userExports) {
      if (exports.length >= 3) { // 3+ exports in timeframe
        const timeSpan = new Date(exports[exports.length - 1].timestamp).getTime() -
                        new Date(exports[0].timestamp).getTime();
        if (timeSpan < 3600000) { // Within 1 hour
          incidents.push({
            id: `data-exfiltration-${Date.now()}-${userId}`,
            type: 'DATA_EXFILTRATION',
            severity: 'CRITICAL',
            status: 'OPEN',
            title: `Potential Data Exfiltration by ${userId}`,
            description: `User ${userId} performed ${exports.length} data exports within ${Math.round(timeSpan/60000)} minutes`,
            detectedAt: new Date().toISOString(),
            detectedBy: 'SYSTEM',
            affectedSystems: ['phi_data', 'export_system'],
            affectedUsers: [userId],
            indicators: [
              {
                type: 'BEHAVIOR',
                value: 'bulk_data_export',
                confidence: 85,
                source: 'audit_logs',
                timestamp: new Date().toISOString(),
              }
            ],
            response: {
              automated: [
                { action: 'DISABLE_USER', executed: false },
                { action: 'ALERT_ADMIN', executed: false }
              ],
              manual: [
                {
                  action: 'Investigate data export justification and review exported data',
                  assignedTo: 'security_team',
                  dueDate: new Date(Date.now() + 2*60*60*1000).toISOString(), // 2 hours
                  status: 'PENDING'
                }
              ],
              containmentActions: ['Temporarily disable user account', 'Review export logs'],
              recoveryActions: ['Assess data exposure', 'Notify affected parties if needed'],
              preventionMeasures: ['Implement export approval workflow', 'Add export monitoring']
            },
            timeline: [],
            metadata: { userId, exportCount: exports.length, timeSpan }
          });
        }
      }
    }
    return incidents;
  }
  private async detectAnomalousActivity(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    // Detect unusual login times
    const loginLogs = logs.filter(log => log.action === 'LOGIN_SUCCESS');
    for (const log of loginLogs) {
      const loginHour = new Date(log.timestamp).getHours();
      // Flag logins outside business hours (9 AM - 6 PM)
      if (loginHour < 9 || loginHour > 18) {
        incidents.push({
          id: `anomalous-login-${Date.now()}-${log.user_id}`,
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'LOW',
          status: 'OPEN',
          title: `Off-Hours Login by ${log.user_id}`,
          description: `User ${log.user_id} logged in at ${loginHour}:00 (outside business hours)`,
          detectedAt: new Date().toISOString(),
          detectedBy: 'SYSTEM',
          affectedSystems: ['authentication'],
          affectedUsers: [log.user_id],
          indicators: [
            {
              type: 'BEHAVIOR',
              value: 'off_hours_login',
              confidence: 60,
              source: 'audit_logs',
              timestamp: log.timestamp,
            }
          ],
          response: {
            automated: [],
            manual: [
              {
                action: 'Review off-hours access justification',
                assignedTo: 'security_team',
                dueDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
                status: 'PENDING'
              }
            ],
            containmentActions: ['Monitor user activity'],
            recoveryActions: [],
            preventionMeasures: ['Implement time-based access controls']
          },
          timeline: [],
          metadata: { loginTime: log.timestamp, loginHour }
        });
      }
    }
    return incidents;
  }
  private async detectComplianceViolations(logs: any[]): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = [];
    // Check for PHI access without proper authorization
    const phiLogs = logs.filter(log => log.resource === 'phi_data' && log.action.includes('PHI'));
    for (const log of phiLogs) {
      // Check if user has proper role for PHI access
      if (!log.user_roles || !log.user_roles.includes('clinician') && !log.user_roles.includes('healthcare_admin')) {
        incidents.push({
          id: `compliance-violation-${Date.now()}-${log.user_id}`,
          type: 'COMPLIANCE_VIOLATION',
          severity: 'HIGH',
          status: 'OPEN',
          title: `Unauthorized PHI Access by ${log.user_id}`,
          description: `User ${log.user_id} accessed PHI without proper healthcare role`,
          detectedAt: new Date().toISOString(),
          detectedBy: 'SYSTEM',
          affectedSystems: ['phi_data', 'compliance'],
          affectedUsers: [log.user_id],
          indicators: [
            {
              type: 'BEHAVIOR',
              value: 'unauthorized_phi_access',
              confidence: 95,
              source: 'compliance_monitor',
              timestamp: log.timestamp,
            }
          ],
          response: {
            automated: [
              { action: 'ALERT_ADMIN', executed: false }
            ],
            manual: [
              {
                action: 'Review PHI access authorization and user role assignment',
                assignedTo: 'compliance_officer',
                dueDate: new Date(Date.now() + 4*60*60*1000).toISOString(),
                status: 'PENDING'
              }
            ],
            containmentActions: ['Review user permissions', 'Audit PHI access logs'],
            recoveryActions: ['Adjust user roles if needed', 'Document compliance review'],
            preventionMeasures: ['Strengthen PHI access controls', 'Regular compliance training']
          },
          timeline: [],
          metadata: { phiResource: log.resource_id, userRoles: log.user_roles }
        });
      }
    }
    return incidents;
  }
  // ===== AUTOMATED RESPONSE =====
  async executeAutomatedResponse(incident: SecurityIncident): Promise<void> {
    for (const response of incident.response.automated) {
      if (response.executed) continue;
      try {
        switch (response.action) {
          case 'BLOCK_IP':
            await this.blockIPAddress(incident.indicators.find(i => i.type === 'IP_ADDRESS')?.value || '');
            break;
          case 'DISABLE_USER':
            await this.disableUser(incident.affectedUsers[0]);
            break;
          case 'ALERT_ADMIN':
            await this.alertAdministrators(incident);
            break;
          case 'QUARANTINE_SYSTEM':
            await this.quarantineSystem(incident.affectedSystems[0]);
            break;
          case 'BACKUP_DATA':
            await this.emergencyBackup(incident.affectedSystems);
            break;
        }
        response.executed = true;
        response.executedAt = new Date().toISOString();
        response.result = 'SUCCESS';
        // Log the automated response
        await this.auditLogger.log({
          userId: 'SYSTEM',
          action: 'INCIDENT_RESPONSE',
          resource: 'security',
          resourceId: incident.id,
          details: { action: response.action, result: 'SUCCESS' },
          success: true,
          riskLevel: 'HIGH',
        });
      } catch (error: any) {
        response.executed = true;
        response.executedAt = new Date().toISOString();
        response.error = error.message;
        await this.auditLogger.log({
          userId: 'SYSTEM',
          action: 'INCIDENT_RESPONSE',
          resource: 'security',
          resourceId: incident.id,
          details: { action: response.action, error: error.message },
          success: false,
          riskLevel: 'CRITICAL',
        });
      }
    }
    // Update incident in database
    await this.updateIncident(incident);
  }
  private async blockIPAddress(ip: string): Promise<void> {
    if (!ip) return;
    this.blockedIPs.add(ip);
    console.log(`🚫 Blocked IP address: ${ip}`);
    // In production, this would integrate with:
    // - AWS WAF to block at CDN level
    // - Security groups to block at network level
    // - Application firewall rules
  }
  private async disableUser(userId: string): Promise<void> {
    if (!userId) return;
    this.suspiciousUsers.add(userId);
    console.log(`🚫 Disabled user account: ${userId}`);
    // In production, this would:
    // - Disable user in Cognito
    // - Revoke active sessions
    // - Update user status in database
  }
  private async alertAdministrators(incident: SecurityIncident): Promise<void> {
    console.log(`🚨 SECURITY ALERT: ${incident.title}`);
    console.log(`Severity: ${incident.severity}`);
    console.log(`Description: ${incident.description}`);
    // In production, this would:
    // - Send email alerts to security team
    // - Create Slack/Teams notifications
    // - Trigger PagerDuty alerts for critical incidents
    // - Update security dashboard
  }
  private async quarantineSystem(system: string): Promise<void> {
    console.log(`🔒 Quarantined system: ${system}`);
    // In production, this would:
    // - Isolate affected systems
    // - Disable network access
    // - Create system snapshots
    // - Enable enhanced monitoring
  }
  private async emergencyBackup(systems: string[]): Promise<void> {
    console.log(`💾 Emergency backup initiated for systems: ${systems.join(', ')}`);
    // In production, this would:
    // - Trigger immediate database snapshots
    // - Backup critical system configurations
    // - Create forensic images
    // - Store backups in secure location
  }
  // ===== INCIDENT MANAGEMENT =====
  async createIncident(incident: SecurityIncident): Promise<void> {
    try {
      await this.databaseService.insert('security_incidents', {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        title: incident.title,
        description: incident.description,
        detected_at: incident.detectedAt,
        detected_by: incident.detectedBy,
        affected_systems: incident.affectedSystems,
        affected_users: incident.affectedUsers,
        indicators: JSON.stringify(incident.indicators),
        response: JSON.stringify(incident.response),
        timeline: JSON.stringify(incident.timeline),
        metadata: JSON.stringify(incident.metadata),
      });
      // Execute automated responses
      await this.executeAutomatedResponse(incident);
      // Log incident creation
      await this.auditLogger.log({
        userId: 'SYSTEM',
        action: 'SECURITY_INCIDENT',
        resource: 'security',
        resourceId: incident.id,
        details: { type: incident.type, severity: incident.severity },
        success: true,
        riskLevel: incident.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      });
    } catch (error: any) {
      console.error('Failed to create incident:', error);
    }
  }
  async updateIncident(incident: SecurityIncident): Promise<void> {
    try {
      await this.databaseService.update('security_incidents', incident.id, {
        status: incident.status,
        response: JSON.stringify(incident.response),
        timeline: JSON.stringify(incident.timeline),
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to update incident:', error);
    }
  }
  async getActiveIncidents(): Promise<SecurityIncident[]> {
    try {
      const result = await this.databaseService.select<any>('security_incidents', {
        filters: { status: ['OPEN', 'INVESTIGATING', 'CONTAINED'] },
        orderBy: [{ column: 'detected_at', ascending: false }],
      });
      return (result.data || []).map(this.mapDatabaseToIncident);
    } catch (error) {
      console.error('Failed to get active incidents:', error);
      return [];
    }
  }
  // ===== UTILITY METHODS =====
  private async getRecentAuditLogs(): Promise<any[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24*60*60*1000).toISOString();
      const result = await this.databaseService.select('audit_logs', {
        filters: { timestamp: `>=${oneDayAgo}` },
        orderBy: [{ column: 'timestamp', ascending: false }],
        limit: 1000,
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get recent audit logs:', error);
      return [];
    }
  }
  private initializeThresholds(): void {
    this.alertThresholds.set('failed_logins', 5);
    this.alertThresholds.set('access_denials', 3);
    this.alertThresholds.set('phi_exports', 2);
    this.alertThresholds.set('admin_actions', 1);
  }
  private startContinuousMonitoring(): void {
    // Run incident detection every 5 minutes
    setInterval(async () => {
      try {
        await this.detectSecurityIncidents();
      } catch (error) {
        console.error('Continuous monitoring error:', error);
      }
    }, 5 * 60 * 1000);
    console.log('🔍 Continuous security monitoring started');
  }
  private mapDatabaseToIncident(dbRow: any): SecurityIncident {
    return {
      id: dbRow.id,
      type: dbRow.type,
      severity: dbRow.severity,
      status: dbRow.status,
      title: dbRow.title,
      description: dbRow.description,
      detectedAt: dbRow.detected_at,
      detectedBy: dbRow.detected_by,
      affectedSystems: dbRow.affected_systems || [],
      affectedUsers: dbRow.affected_users || [],
      indicators: JSON.parse(dbRow.indicators || '[]'),
      response: JSON.parse(dbRow.response || '{}'),
      timeline: JSON.parse(dbRow.timeline || '[]'),
      metadata: JSON.parse(dbRow.metadata || '{}'),
    };
  }
  // Public method to check if IP is blocked
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }
  // Public method to check if user is suspended
  isUserSuspended(userId: string): boolean {
    return this.suspiciousUsers.has(userId);
  }
}
// Factory function to create incident response service
export function createIncidentResponseService(databaseService: DatabaseService): IncidentResponseService {
  return new IncidentResponseService(databaseService);
}
