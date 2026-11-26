import { randomUUID } from 'node:crypto';
import type { Db } from './db/index';
import { auditLog } from './db/schema';

export type AuditAction =
	| 'approve_user'
	| 'decline_user'
	| 'suspend_user'
	| 'restore_user'
	| 'set_role'
	| 'create_admin'
	| 'approve_video'
	| 'decline_video'
	| 'remove_video'
	| 'post_staff_video'
	| 'resolve_report';

/** Records a staff or admin action. `actor` is a user, or { id: 'system' } for server scripts. */
export function audit(
	db: Db,
	actor: { id: string },
	action: AuditAction,
	targetType: 'user' | 'video' | 'report',
	targetId: string,
	detail?: string
): void {
	db.insert(auditLog)
		.values({ id: randomUUID(), actorId: actor.id, action, targetType, targetId, detail: detail ?? null, createdAt: Date.now() })
		.run();
}
