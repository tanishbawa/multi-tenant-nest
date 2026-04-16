export const AUDIT_QUEUE_NAME = 'audit';
export const AUDIT_JOB_NAME = 'event';

export type AuditEventName =
  | 'auth.login.succeeded'
  | 'auth.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted';

export interface AuditJobData {
  event: AuditEventName;
  userId: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}
