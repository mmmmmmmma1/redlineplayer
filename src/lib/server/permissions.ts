import type { Role, Status, Video } from './db/schema';

/** Who is asking. Every permission rule in the app lives in this file. */
export type Actor = { id: string; role: Role; status: Status };

export const isActive = (a: Actor | null): a is Actor => a?.status === 'active';

export const isStaff = (a: Actor | null): a is Actor => isActive(a) && (a.role === 'staff' || a.role === 'admin');

export const canManageRoles = (a: Actor | null): boolean => isActive(a) && a.role === 'admin';

export const canReview = isStaff;

const owns = (a: Actor, v: Video) => a.id === v.ownerId;

/** Owners always see their own (unless removed); staff see everything; others see staff videos and added ones. */
export function canSeeVideo(a: Actor | null, v: Video): boolean {
	if (!isActive(a)) return false;
	if (isStaff(a)) return true;
	if (v.status === 'removed') return false;
	if (owns(a, v)) return true;
	return v.kind === 'staff' || v.status === 'added';
}

export function canDeleteVideo(a: Actor | null, v: Video): boolean {
	if (!isActive(a)) return false;
	if (isStaff(a)) return true;
	return owns(a, v) && v.status !== 'removed';
}

export function canRequestVideo(a: Actor | null, v: Video): boolean {
	return isActive(a) && owns(a, v) && v.kind === 'player' && (v.status === 'private' || v.status === 'declined');
}

export function canReport(a: Actor | null, v: Video): boolean {
	return isActive(a) && !owns(a, v) && canSeeVideo(a, v);
}

/** Owners can pull their own request back, or take an added video off the team list. */
export function canMakePrivate(a: Actor | null, v: Video): boolean {
	return isActive(a) && owns(a, v) && v.kind === 'player' && (v.status === 'requested' || v.status === 'added');
}
