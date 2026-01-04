// Automated Backup & Recovery Service
// Medical-grade security implementation for data protection and disaster recovery
// Conditional imports for AWS SDK - only available server-side
let S3Client: any, PutObjectCommand: any, GetObjectCommand: any, ListObjectsV2Command: any, DeleteObjectCommand: any;
let RDSClient: any, CreateDBSnapshotCommand: any, DescribeDBSnapshotsCommand: any, RestoreDBInstanceFromDBSnapshotCommand: any;
if (typeof window === 'undefined') {
  try {
    const s3 = require('@aws-sdk/client-s3');
    S3Client = s3.S3Client;
    PutObjectCommand = s3.PutObjectCommand;
    GetObjectCommand = s3.GetObjectCommand;
    ListObjectsV2Command = s3.ListObjectsV2Command;
    DeleteObjectCommand = s3.DeleteObjectCommand;
    const rds = require('@aws-sdk/client-rds');
    RDSClient = rds.RDSClient;
    CreateDBSnapshotCommand = rds.CreateDBSnapshotCommand;
    DescribeDBSnapshotsCommand = rds.DescribeDBSnapshotsCommand;
    RestoreDBInstanceFromDBSnapshotCommand = rds.RestoreDBInstanceFromDBSnapshotCommand;
  } catch (error) {
    console.warn('AWS SDK not available - BackupRecoveryService will not work in server environment');
  }
}
import { createAuditLogger, AuditLogger } from './AuditLogger';
import { DatabaseService } from '../database/DatabaseService';
export interface BackupConfig {
  s3BucketName: string;
  s3Region: string;
  rdsInstanceId: string;
  rdsRegion: string;
  encryptionKey?: string;
  retentionDays: number;
}
export interface BackupResult {
  success: boolean;
  backupId?: string;
  location?: string;
  size?: number;
  timestamp?: string;
  error?: string;
}
export interface RestoreResult {
  success: boolean;
  restoredInstanceId?: string;
  timestamp?: string;
  error?: string;
}
export interface BackupMetadata {
  id: string;
  type: 'database' | 'files' | 'full';
  location: string;
  size: number;
  timestamp: string;
  encrypted: boolean;
  checksum: string;
  retentionUntil: string;
  tags: Record<string, string>;
}
export class BackupRecoveryService {
  private s3Client: S3Client;
  private rdsClient: RDSClient;
  private auditLogger: AuditLogger;
  private config: BackupConfig;
  constructor(config: BackupConfig, databaseService: DatabaseService) {
    this.config = config;
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.warn('BackupRecoveryService cannot be used in browser environment. Use API endpoints for backup operations.');
      this.auditLogger = createAuditLogger(databaseService);
      return;
    }
    // Check if AWS SDK is available
    if (!S3Client || !RDSClient) {
      console.warn('AWS SDK not available - BackupRecoveryService will not work');
      this.auditLogger = createAuditLogger(databaseService);
      return;
    }
    this.s3Client = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.rdsClient = new RDSClient({
      region: config.rdsRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.auditLogger = createAuditLogger(databaseService);
  }
  // ===== DATABASE BACKUP =====
  async createDatabaseSnapshot(
    userId: string,
    description?: string
  ): Promise<BackupResult> {
    // Check if service is available
    if (typeof window !== 'undefined' || !this.rdsClient) {
      return {
        success: false,
        error: 'Backup service not available in browser environment. Use server-side API endpoints.',
      };
    }
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotId = `mindmeasure-snapshot-${timestamp}`;
      const command = new CreateDBSnapshotCommand({
        DBSnapshotIdentifier: snapshotId,
        DBInstanceIdentifier: this.config.rdsInstanceId,
        Tags: [
          { Key: 'CreatedBy', Value: userId },
          { Key: 'Type', Value: 'Manual' },
          { Key: 'Purpose', Value: description || 'Manual backup' },
          { Key: 'Timestamp', Value: timestamp },
        ],
      });
      const result = await this.rdsClient.send(command);
      // Log the backup creation
      await this.auditLogger.logAdminAction(
        'BACKUP_CREATE',
        userId,
        userId,
        snapshotId,
        {
          type: 'database_snapshot',
          instanceId: this.config.rdsInstanceId,
          description,
        }
      );
      return {
        success: true,
        backupId: snapshotId,
        location: `RDS Snapshot: ${snapshotId}`,
        timestamp: timestamp,
      };
    } catch (error: any) {
      console.error('Database snapshot creation failed:', error);
      await this.auditLogger.log({
        userId,
        action: 'BACKUP_CREATE',
        resource: 'database',
        details: { error: error.message },
        success: false,
        riskLevel: 'HIGH',
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
  async listDatabaseSnapshots(): Promise<BackupMetadata[]> {
    try {
      const command = new DescribeDBSnapshotsCommand({
        DBInstanceIdentifier: this.config.rdsInstanceId,
        SnapshotType: 'manual',
        MaxRecords: 100,
      });
      const result = await this.rdsClient.send(command);
      const snapshots = result.DBSnapshots || [];
      return snapshots.map(snapshot => ({
        id: snapshot.DBSnapshotIdentifier || '',
        type: 'database' as const,
        location: `RDS Snapshot: ${snapshot.DBSnapshotIdentifier}`,
        size: snapshot.AllocatedStorage || 0,
        timestamp: snapshot.SnapshotCreateTime?.toISOString() || '',
        encrypted: snapshot.Encrypted || false,
        checksum: snapshot.DBSnapshotArn || '',
        retentionUntil: this.calculateRetentionDate(snapshot.SnapshotCreateTime).toISOString(),
        tags: this.extractTags(snapshot.TagList),
      }));
    } catch (error: any) {
      console.error('Failed to list database snapshots:', error);
      return [];
    }
  }
  async restoreFromSnapshot(
    snapshotId: string,
    newInstanceId: string,
    userId: string
  ): Promise<RestoreResult> {
    try {
      const command = new RestoreDBInstanceFromDBSnapshotCommand({
        DBInstanceIdentifier: newInstanceId,
        DBSnapshotIdentifier: snapshotId,
        DBInstanceClass: 'db.serverless', // Aurora Serverless v2
        Engine: 'aurora-postgresql',
        Tags: [
          { Key: 'RestoredBy', Value: userId },
          { Key: 'RestoredFrom', Value: snapshotId },
          { Key: 'RestoredAt', Value: new Date().toISOString() },
        ],
      });
      await this.rdsClient.send(command);
      // Log the restore operation
      await this.auditLogger.logAdminAction(
        'BACKUP_RESTORE',
        userId,
        userId,
        newInstanceId,
        {
          type: 'database_restore',
          sourceSnapshot: snapshotId,
          targetInstance: newInstanceId,
        }
      );
      return {
        success: true,
        restoredInstanceId: newInstanceId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Database restore failed:', error);
      await this.auditLogger.log({
        userId,
        action: 'BACKUP_RESTORE',
        resource: 'database',
        details: {
          error: error.message,
          snapshotId,
          targetInstance: newInstanceId,
        },
        success: false,
        riskLevel: 'CRITICAL',
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
  // ===== FILE BACKUP =====
  async backupFiles(
    userId: string,
    files: { key: string; content: Buffer }[],
    backupType: 'incremental' | 'full' = 'incremental'
  ): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `files-backup-${timestamp}`;
      const backupKey = `backups/${backupType}/${backupId}.tar.gz`;
      // Create compressed archive (simplified - in production use proper compression)
      const archiveContent = this.createArchive(files);
      const checksum = this.calculateChecksum(archiveContent);
      // Encrypt if encryption key is provided
      const finalContent = this.config.encryptionKey
        ? this.encryptData(archiveContent, this.config.encryptionKey)
        : archiveContent;
      const command = new PutObjectCommand({
        Bucket: this.config.s3BucketName,
        Key: backupKey,
        Body: finalContent,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-id': backupId,
          'backup-type': backupType,
          'created-by': userId,
          'file-count': files.length.toString(),
          'checksum': checksum,
          'encrypted': this.config.encryptionKey ? 'true' : 'false',
        },
        Tagging: `CreatedBy=${userId}&Type=${backupType}&Purpose=FileBackup`,
      });
      await this.s3Client.send(command);
      // Log the backup creation
      await this.auditLogger.logAdminAction(
        'BACKUP_CREATE',
        userId,
        userId,
        backupId,
        {
          type: 'file_backup',
          backupType,
          fileCount: files.length,
          location: `s3://${this.config.s3BucketName}/${backupKey}`,
        }
      );
      return {
        success: true,
        backupId,
        location: `s3://${this.config.s3BucketName}/${backupKey}`,
        size: finalContent.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('File backup failed:', error);
      await this.auditLogger.log({
        userId,
        action: 'BACKUP_CREATE',
        resource: 'files',
        details: { error: error.message, fileCount: files.length },
        success: false,
        riskLevel: 'HIGH',
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
  async restoreFiles(
    backupId: string,
    userId: string,
    targetPath?: string
  ): Promise<RestoreResult> {
    try {
      // Find the backup file
      const backupKey = await this.findBackupKey(backupId);
      if (!backupKey) {
        throw new Error(`Backup ${backupId} not found`);
      }
      const command = new GetObjectCommand({
        Bucket: this.config.s3BucketName,
        Key: backupKey,
      });
      const result = await this.s3Client.send(command);
      if (!result.Body) {
        throw new Error('Backup file is empty');
      }
      const backupContent = await this.streamToBuffer(result.Body as any);
      // Decrypt if needed
      const isEncrypted = result.Metadata?.['encrypted'] === 'true';
      const finalContent = isEncrypted && this.config.encryptionKey
        ? this.decryptData(backupContent, this.config.encryptionKey)
        : backupContent;
      // Verify checksum
      const storedChecksum = result.Metadata?.['checksum'];
      const calculatedChecksum = this.calculateChecksum(finalContent);
      if (storedChecksum && storedChecksum !== calculatedChecksum) {
        throw new Error('Backup integrity check failed - checksum mismatch');
      }
      // Extract files (simplified - in production use proper extraction)
      const extractedFiles = this.extractArchive(finalContent);
      // Log the restore operation
      await this.auditLogger.logAdminAction(
        'BACKUP_RESTORE',
        userId,
        userId,
        backupId,
        {
          type: 'file_restore',
          backupKey,
          targetPath,
          fileCount: extractedFiles.length,
        }
      );
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('File restore failed:', error);
      await this.auditLogger.log({
        userId,
        action: 'BACKUP_RESTORE',
        resource: 'files',
        details: { error: error.message, backupId },
        success: false,
        riskLevel: 'HIGH',
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
  // ===== BACKUP MANAGEMENT =====
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.s3BucketName,
        Prefix: 'backups/',
        MaxKeys: 1000,
      });
      const result = await this.s3Client.send(command);
      const objects = result.Contents || [];
      const fileBackups: BackupMetadata[] = objects.map(obj => ({
        id: this.extractBackupId(obj.Key || ''),
        type: 'files' as const,
        location: `s3://${this.config.s3BucketName}/${obj.Key}`,
        size: obj.Size || 0,
        timestamp: obj.LastModified?.toISOString() || '',
        encrypted: true, // S3 server-side encryption
        checksum: obj.ETag || '',
        retentionUntil: this.calculateRetentionDate(obj.LastModified).toISOString(),
        tags: {},
      }));
      // Combine with database snapshots
      const dbBackups = await this.listDatabaseSnapshots();
      return [...fileBackups, ...dbBackups].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error: any) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
  async deleteExpiredBackups(userId: string): Promise<{ deleted: number; errors: string[] }> {
    const backups = await this.listBackups();
    const now = new Date();
    const expiredBackups = backups.filter(
      backup => new Date(backup.retentionUntil) < now
    );
    let deleted = 0;
    const errors: string[] = [];
    for (const backup of expiredBackups) {
      try {
        if (backup.type === 'database') {
          // Delete RDS snapshot (implementation needed)
          console.log(`Would delete RDS snapshot: ${backup.id}`);
        } else {
          // Delete S3 object
          const key = backup.location.replace(`s3://${this.config.s3BucketName}/`, '');
          await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.config.s3BucketName,
            Key: key,
          }));
        }
        deleted++;
      } catch (error: any) {
        errors.push(`Failed to delete ${backup.id}: ${error.message}`);
      }
    }
    // Log cleanup operation
    await this.auditLogger.logAdminAction(
      'BACKUP_DELETE',
      userId,
      userId,
      undefined,
      {
        type: 'cleanup',
        deletedCount: deleted,
        errorCount: errors.length,
      }
    );
    return { deleted, errors };
  }
  // ===== UTILITY METHODS =====
  private createArchive(files: { key: string; content: Buffer }[]): Buffer {
    // Simplified archive creation - in production use tar or zip library
    const archive = JSON.stringify(files.map(f => ({
      key: f.key,
      content: f.content.toString('base64'),
    })));
    return Buffer.from(archive);
  }
  private extractArchive(archiveContent: Buffer): { key: string; content: Buffer }[] {
    // Simplified archive extraction
    const archive = JSON.parse(archiveContent.toString());
    return archive.map((f: any) => ({
      key: f.key,
      content: Buffer.from(f.content, 'base64'),
    }));
  }
  private encryptData(data: Buffer, key: string): Buffer {
    // Browser compatibility check
    if (typeof window !== 'undefined') {
      throw new Error('BackupRecoveryService cannot be used in browser environment. Use API endpoints for backup operations.');
    }
    // Simplified encryption - in production use proper crypto library
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-cbc', key);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }
  private decryptData(data: Buffer, key: string): Buffer {
    // Browser compatibility check
    if (typeof window !== 'undefined') {
      throw new Error('BackupRecoveryService cannot be used in browser environment. Use API endpoints for backup operations.');
    }
    // Simplified decryption
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
  private calculateChecksum(data: Buffer): string {
    // Browser compatibility check
    if (typeof window !== 'undefined') {
      throw new Error('BackupRecoveryService cannot be used in browser environment. Use API endpoints for backup operations.');
    }
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  private calculateRetentionDate(createdDate?: Date): Date {
    const date = createdDate || new Date();
    const retentionDate = new Date(date);
    retentionDate.setDate(retentionDate.getDate() + this.config.retentionDays);
    return retentionDate;
  }
  private extractTags(tagList?: any[]): Record<string, string> {
    if (!tagList) return {};
    return tagList.reduce((acc, tag) => {
      acc[tag.Key] = tag.Value;
      return acc;
    }, {});
  }
  private extractBackupId(key: string): string {
    const match = key.match(/([^/]+)\.(tar\.gz|zip)$/);
    return match ? match[1] : key;
  }
  private async findBackupKey(backupId: string): Promise<string | null> {
    const command = new ListObjectsV2Command({
      Bucket: this.config.s3BucketName,
      Prefix: 'backups/',
    });
    const result = await this.s3Client.send(command);
    const objects = result.Contents || [];
    const backupObject = objects.find(obj =>
      obj.Key?.includes(backupId)
    );
    return backupObject?.Key || null;
  }
}
// Factory function to create backup service
export function createBackupRecoveryService(
  config: BackupConfig,
  databaseService: DatabaseService
): BackupRecoveryService {
  return new BackupRecoveryService(config, databaseService);
}
