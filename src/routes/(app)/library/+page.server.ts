import type { PageServerLoad } from './$types';
import { CATEGORIES, formatTarget, searchExercises, type Category } from '#lib/data/library.js';

export const load: PageServerLoad = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').slice(0, 80);
	const c = url.searchParams.get('category') ?? '';
	const category = c in CATEGORIES ? (c as Category) : undefined;
	const list = searchExercises(q, { category }).map((e) => ({
		id: e.id,
		name: e.name,
		category: e.category,
		target: formatTarget(e),
		summary: e.summary
	}));
	return { q, category: category ?? '', list };
};
