// Role-Based Access Control (RBAC) Service
// Medical-grade security implementation for enterprise access control
import { DatabaseService, QueryResult } from '../database/DatabaseService';
import { createAuditLogger, AuditLogger } from './AuditLogger';
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  role?: Role; // Populated in joins
}
export interface ResourcePolicy {
  id: string;
  resourceType: string;
  resourceId: string;
  userId?: string;
  roleId?: string;
  permissions: string[];
  conditions?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPermissions?: string[];
  userRoles?: string[];
}
export class RBACService {
  private databaseService: DatabaseService;
  private auditLogger: AuditLogger;
  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.auditLogger = createAuditLogger(databaseService);
  }
  // ===== ROLE MANAGEMENT =====
  async createRole(
    roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<{ success: boolean; role?: Role; error?: string }> {
    try {
      const result = await this.databaseService.insert<Role>('roles', {
        name: roleData.name,
        display_name: roleData.displayName,
        description: roleData.description,
        level: roleData.level,
        is_system_role: roleData.isSystemRole,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      const role = result.data?.[0];
      if (role) {
        await this.auditLogger.logAdminAction(
          'ROLE_CREATE',
          createdBy,
          createdBy,
          role.id,
          { roleName: roleData.name, roleLevel: roleData.level }
        );
      }
      return { success: true, role };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async getRoles(): Promise<Role[]> {
    try {
      const result = await this.databaseService.select<Role>('roles', {
        orderBy: [{ column: 'level', ascending: false }],
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get roles:', error);
      return [];
    }
  }
  async getRoleByName(name: string): Promise<Role | null> {
    try {
      const result = await this.databaseService.select<Role>('roles', {
        filters: { name },
        limit: 1,
      });
      return result.data?.[0] || null;
    } catch (error) {
      console.error('Failed to get role by name:', error);
      return null;
    }
  }
  // ===== PERMISSION MANAGEMENT =====
  async getPermissions(): Promise<Permission[]> {
    try {
      const result = await this.databaseService.select<Permission>('permissions', {
        orderBy: [{ column: 'resource', ascending: true }, { column: 'action', ascending: true }],
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return [];
    }
  }
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      // This would need a custom query or view in a real implementation
      // For now, we'll use a simplified approach
      const result = await this.databaseService.rpc<Permission>(
        'get_role_permissions',
        { role_id: roleId }
      );
      return result.data || [];
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      return [];
    }
  }
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    grantedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.insert('role_permissions', {
        role_id: roleId,
        permission_id: permissionId,
        granted_by: grantedBy,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      await this.auditLogger.logAdminAction(
        'PERMISSION_GRANT',
        grantedBy,
        grantedBy,
        roleId,
        { permissionId, action: 'grant' }
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  // ===== USER ROLE MANAGEMENT =====
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.insert('user_roles', {
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        expires_at: expiresAt?.toISOString(),
        is_active: true,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      await this.auditLogger.logAdminAction(
        'ROLE_ASSIGN',
        assignedBy,
        assignedBy,
        userId,
        { roleId, expiresAt: expiresAt?.toISOString() }
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const result = await this.databaseService.select<UserRole>('user_roles', {
        filters: { user_id: userId, is_active: true },
        orderBy: [{ column: 'assigned_at', ascending: false }],
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.databaseService.update(
        'user_roles',
        '', // We'll need to find the specific record
        { is_active: false },
        { filters: { user_id: userId, role_id: roleId } }
      );
      if (result.error) {
        return { success: false, error: result.error };
      }
      await this.auditLogger.logAdminAction(
        'ROLE_ASSIGN',
        removedBy,
        removedBy,
        userId,
        { roleId, action: 'remove' }
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  // ===== ACCESS CONTROL =====
  async checkAccess(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<AccessCheckResult> {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(userId);
      if (userRoles.length === 0) {
        return {
          allowed: false,
          reason: 'User has no assigned roles',
          userRoles: [],
        };
      }
      // Check role-based permissions
      const roleNames = [];
      const matchedPermissions = [];
      for (const userRole of userRoles) {
        // Check if role is expired
        if (userRole.expiresAt && new Date(userRole.expiresAt) < new Date()) {
          continue;
        }
        // Get role details
        const role = await this.getRoleByName(userRole.roleId); // This would need role lookup
        if (!role) continue;
        roleNames.push(role.name);
        // Check if role has required permission
        const permissions = await this.getRolePermissions(userRole.roleId);
        const hasPermission = permissions.some(
          (p) => p.resource === resource && p.action === action
        );
        if (hasPermission) {
          matchedPermissions.push(`${resource}:${action}`);
        }
      }
      // Check resource-specific policies
      if (resourceId) {
        const resourcePolicies = await this.getResourcePolicies(
          resource,
          resourceId,
          userId
        );
        for (const policy of resourcePolicies) {
          if (policy.permissions.includes(action)) {
            // Check conditions (IP, time, etc.)
            if (this.evaluatePolicyConditions(policy.conditions, context)) {
              matchedPermissions.push(`resource_policy:${action}`);
            }
          }
        }
      }
      const allowed = matchedPermissions.length > 0;
      // Log access attempt
      await this.auditLogger.log({
        userId,
        action: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        resource: 'access_control',
        resourceId: resourceId,
        details: {
          requestedResource: resource,
          requestedAction: action,
          userRoles: roleNames,
          matchedPermissions,
        },
        success: allowed,
        riskLevel: allowed ? 'LOW' : 'MEDIUM',
      });
      return {
        allowed,
        reason: allowed
          ? 'Access granted based on role permissions'
          : 'No matching permissions found',
        matchedPermissions,
        userRoles: roleNames,
      };
    } catch (error: any) {
      console.error('Access check failed:', error);
      return {
        allowed: false,
        reason: `Access check error: ${error.message}`,
        userRoles: [],
      };
    }
  }
  // ===== RESOURCE POLICIES =====
  async createResourcePolicy(
    policyData: Omit<ResourcePolicy, 'id' | 'createdAt'>,
    createdBy: string
  ): Promise<{ success: boolean; policy?: ResourcePolicy; error?: string }> {
    try {
      const result = await this.databaseService.insert<ResourcePolicy>('resource_policies', {
        resource_type: policyData.resourceType,
        resource_id: policyData.resourceId,
        user_id: policyData.userId,
        role_id: policyData.roleId,
        permissions: policyData.permissions,
        conditions: policyData.conditions ? JSON.stringify(policyData.conditions) : null,
        created_by: createdBy,
        expires_at: policyData.expiresAt,
        is_active: policyData.isActive,
      });
      if (result.error) {
        return { success: false, error: result.error };
      }
      const policy = result.data?.[0];
      if (policy) {
        await this.auditLogger.logAdminAction(
          'PERMISSION_GRANT',
          createdBy,
          createdBy,
          policy.id,
          {
            resourceType: policyData.resourceType,
            resourceId: policyData.resourceId,
            permissions: policyData.permissions,
          }
        );
      }
      return { success: true, policy };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  async getResourcePolicies(
    resourceType: string,
    resourceId: string,
    userId?: string
  ): Promise<ResourcePolicy[]> {
    try {
      const filters: Record<string, any> = {
        resource_type: resourceType,
        resource_id: resourceId,
        is_active: true,
      };
      if (userId) {
        filters.user_id = userId;
      }
      const result = await this.databaseService.select<ResourcePolicy>('resource_policies', {
        filters,
        orderBy: [{ column: 'created_at', ascending: false }],
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get resource policies:', error);
      return [];
    }
  }
  // ===== UTILITY METHODS =====
  private evaluatePolicyConditions(
    conditions?: Record<string, any>,
    context?: Record<string, any>
  ): boolean {
    if (!conditions || !context) return true;
    // IP address restrictions
    if (conditions.allowedIPs && context.ipAddress) {
      const allowedIPs = Array.isArray(conditions.allowedIPs)
        ? conditions.allowedIPs
        : [conditions.allowedIPs];
      if (!allowedIPs.includes(context.ipAddress)) {
        return false;
      }
    }
    // Time-based restrictions
    if (conditions.allowedHours) {
      const currentHour = new Date().getHours();
      const allowedHours = conditions.allowedHours;
      if (
        currentHour < allowedHours.start ||
        currentHour > allowedHours.end
      ) {
        return false;
      }
    }
    // Day of week restrictions
    if (conditions.allowedDays) {
      const currentDay = new Date().getDay(); // 0 = Sunday
      if (!conditions.allowedDays.includes(currentDay)) {
        return false;
      }
    }
    return true;
  }
  async getUserEffectivePermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoles = await this.getUserRoles(userId);
      const allPermissions: Permission[] = [];
      for (const userRole of userRoles) {
        if (userRole.expiresAt && new Date(userRole.expiresAt) < new Date()) {
          continue; // Skip expired roles
        }
        const rolePermissions = await this.getRolePermissions(userRole.roleId);
        allPermissions.push(...rolePermissions);
      }
      // Remove duplicates
      const uniquePermissions = allPermissions.filter(
        (permission, index, self) =>
          index === self.findIndex((p) => p.id === permission.id)
      );
      return uniquePermissions;
    } catch (error) {
      console.error('Failed to get user effective permissions:', error);
      return [];
    }
  }
  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const accessResult = await this.checkAccess(userId, resource, action);
    return accessResult.allowed;
  }
  async requirePermission(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const accessResult = await this.checkAccess(userId, resource, action, resourceId);
    if (!accessResult.allowed) {
      throw new Error(`Access denied: ${accessResult.reason}`);
    }
  }
}
// Factory function to create RBAC service
export function createRBACService(databaseService: DatabaseService): RBACService {
  return new RBACService(databaseService);
}
// Utility function to check if user has admin privileges
export async function isAdmin(userId: string, rbacService: RBACService): Promise<boolean> {
  return await rbacService.hasPermission(userId, 'system', 'admin');
}
// Utility function to check if user can access PHI data
export async function canAccessPHI(userId: string, rbacService: RBACService): Promise<boolean> {
  return await rbacService.hasPermission(userId, 'phi_data', 'read');
}
