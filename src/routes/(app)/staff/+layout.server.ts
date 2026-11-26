import type { LayoutServerLoad } from './$types';
import { requireStaff } from '#lib/server/guard.js';

export const load: LayoutServerLoad = (event) => {
	requireStaff(event);
};
