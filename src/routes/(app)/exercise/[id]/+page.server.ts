import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { byId } from '#lib/data/library.js';

export const load: PageServerLoad = ({ params }) => {
	const exercise = byId(params.id);
	if (!exercise) error(404, 'No such exercise.');
	return { exercise };
};
