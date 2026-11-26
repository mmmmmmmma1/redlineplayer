import { describe, expect, it } from 'vitest';
import { byId, categoryTitle, exercises, formatMeasure, formatTarget, searchExercises } from './library';

describe('exercise library', () => {
	it('loads the ported exercises', () => {
		expect(exercises.length).toBe(299);
		expect(byId('jumping-jacks')?.name).toBe('Jumping Jacks');
		expect(byId('nope')).toBeUndefined();
	});

	it('formats targets the same way as the iOS app', () => {
		expect(formatTarget(byId('jumping-jacks')!)).toBe('1 × 30');
		expect(formatTarget(byId('high-knees')!)).toBe('1 × 30s');
		expect(formatTarget(byId('skater-bound')!)).toBe('3 × 8 / side');
		expect(formatTarget(byId('jump-rope')!)).toBe('4 × 1:00');
		expect(formatTarget(byId('strides')!)).toBe('4 × 100m');
	});

	it('formats every measure', () => {
		expect(formatMeasure('seconds', 75)).toBe('1:15');
		expect(formatMeasure('meters', 1600)).toBe('1.6km');
		expect(formatMeasure('lines', 1)).toBe('1 line');
		expect(formatMeasure('lines', 3)).toBe('3 lines');
	});

	it('names categories', () => {
		expect(categoryTitle('power')).toBe('Power & Plyo');
		expect(categoryTitle('throwing')).toBe('Throws');
	});

	it('searches names, case-insensitively', () => {
		expect(searchExercises('skater bound').map((e) => e.id)).toContain('skater-bound');
		expect(searchExercises('SKATER BOUND').map((e) => e.id)).toContain('skater-bound');
	});

	it('search hides hockey-only categories for track', () => {
		const track = searchExercises('', { sport: 'track' });
		expect(track.some((e) => e.category === 'shooting')).toBe(false);
		expect(track.some((e) => e.category === 'sprints')).toBe(true);
		const hockey = searchExercises('', { sport: 'hockey' });
		expect(hockey.some((e) => e.category === 'sprints')).toBe(false);
		expect(hockey.some((e) => e.category === 'shooting')).toBe(true);
	});

	it('filters by category', () => {
		const r = searchExercises('', { category: 'core' });
		expect(r.length).toBeGreaterThan(0);
		expect(r.every((e) => e.category === 'core')).toBe(true);
	});

	it('finds by muscle name too', () => {
		expect(searchExercises('hamstrings').length).toBeGreaterThan(0);
	});
});
