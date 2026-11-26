import { describe, expect, it } from 'vitest';
import type { Role, Status, Video, VideoStatus } from './db/schema';
import {
	canDeleteVideo,
	canMakePrivate,
	canManageRoles,
	canReport,
	canRequestVideo,
	canReview,
	canSeeVideo,
	isActive,
	isStaff,
	type Actor
} from './permissions';

const actor = (role: Role, status: Status = 'active', id: string = role): Actor => ({ id, role, status });
const video = (status: VideoStatus, kind: 'staff' | 'player' = 'player', ownerId = 'owner'): Video => ({
	id: 'v',
	ownerId,
	exerciseId: 'e',
	kind,
	status,
	title: 't',
	declineReason: null,
	file: 'f',
	durationS: 1,
	createdAt: 0,
	reviewedBy: null,
	reviewedAt: null
});
const owner: Actor = { id: 'owner', role: 'player', status: 'active' };
const other = actor('player', 'active', 'other');

describe('account checks', () => {
	it('only active accounts are active', () => {
		expect(isActive(null)).toBe(false);
		for (const s of ['pending', 'declined', 'suspended'] as const) expect(isActive(actor('admin', s))).toBe(false);
		expect(isActive(actor('player'))).toBe(true);
	});

	it('staff and admins are staff only while active', () => {
		expect(isStaff(actor('player'))).toBe(false);
		expect(isStaff(actor('staff'))).toBe(true);
		expect(isStaff(actor('admin'))).toBe(true);
		expect(isStaff(actor('staff', 'pending'))).toBe(false);
		expect(isStaff(actor('admin', 'suspended'))).toBe(false);
	});

	it('pending staff cannot review', () => {
		expect(canReview(actor('staff', 'pending'))).toBe(false);
		expect(canReview(actor('staff'))).toBe(true);
		expect(canReview(actor('player'))).toBe(false);
	});

	it('only active admins manage roles', () => {
		expect(canManageRoles(actor('admin'))).toBe(true);
		expect(canManageRoles(actor('staff'))).toBe(false);
		expect(canManageRoles(actor('admin', 'suspended'))).toBe(false);
	});
});

describe('seeing videos', () => {
	const cases: [VideoStatus, boolean, boolean][] = [
		// status, owner sees, other player sees
		['private', true, false],
		['requested', true, false],
		['added', true, true],
		['declined', true, false],
		['removed', false, false]
	];
	it.each(cases)('player video %s: owner %s, other %s', (status, ownerSees, otherSees) => {
		expect(canSeeVideo(owner, video(status))).toBe(ownerSees);
		expect(canSeeVideo(other, video(status))).toBe(otherSees);
	});

	it('staff see every video, including removed', () => {
		for (const [s] of cases) expect(canSeeVideo(actor('staff'), video(s))).toBe(true);
	});

	it('everyone active sees staff videos', () => {
		expect(canSeeVideo(other, video('added', 'staff', 'coach'))).toBe(true);
	});

	it('inactive accounts see nothing', () => {
		expect(canSeeVideo({ ...owner, status: 'suspended' }, video('private'))).toBe(false);
		expect(canSeeVideo(actor('staff', 'pending'), video('added'))).toBe(false);
		expect(canSeeVideo(null, video('added'))).toBe(false);
	});
});

describe('changing videos', () => {
	it('owner or staff can delete', () => {
		expect(canDeleteVideo(owner, video('added'))).toBe(true);
		expect(canDeleteVideo(other, video('added'))).toBe(false);
		expect(canDeleteVideo(actor('staff'), video('private'))).toBe(true);
		expect(canDeleteVideo(owner, video('removed'))).toBe(false);
	});

	it('owner can request a private or declined video', () => {
		expect(canRequestVideo(owner, video('private'))).toBe(true);
		expect(canRequestVideo(owner, video('declined'))).toBe(true);
		expect(canRequestVideo(owner, video('requested'))).toBe(false);
		expect(canRequestVideo(owner, video('added'))).toBe(false);
		expect(canRequestVideo(other, video('private'))).toBe(false);
	});

	it('others can report what they can see, owners cannot report their own', () => {
		expect(canReport(other, video('added'))).toBe(true);
		expect(canReport(owner, video('added'))).toBe(false);
		expect(canReport(other, video('private'))).toBe(false);
		expect(canReport(actor('player', 'pending', 'p'), video('added'))).toBe(false);
	});
});

describe('making a video private again', () => {
	it('owner can pull back a requested or added video', () => {
		expect(canMakePrivate(owner, video('requested'))).toBe(true);
		expect(canMakePrivate(owner, video('added'))).toBe(true);
		expect(canMakePrivate(owner, video('private'))).toBe(false);
		expect(canMakePrivate(owner, video('removed'))).toBe(false);
		expect(canMakePrivate(other, video('added'))).toBe(false);
		expect(canMakePrivate(owner, video('added', 'staff'))).toBe(false);
	});
});
