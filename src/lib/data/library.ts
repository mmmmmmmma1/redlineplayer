import data from './exercises.json';

export type Category =
	| 'warmup' | 'lowerBody' | 'upperBody' | 'core' | 'power' | 'speed' | 'conditioning' | 'balance' | 'mobility'
	| 'stickhandling' | 'shooting' | 'goalie' | 'running' | 'sprints' | 'hurdles' | 'jumps' | 'throwing';
export type Measure = 'reps' | 'seconds' | 'meters' | 'lines';
export type Muscle = keyof typeof MUSCLES;
export type Sport = 'hockey' | 'track';

export type Exercise = {
	id: string;
	name: string;
	category: Category;
	measure: Measure;
	sets: number;
	base: number;
	perSide: boolean;
	level: number;
	primary: Muscle[];
	secondary: Muscle[];
	equipment: string[];
	tags: string[];
	summary: string;
	steps: string[];
	cues: string[];
	why: string;
};

export const exercises = data as Exercise[];
const index = new Map(exercises.map((e) => [e.id, e]));
export const byId = (id: string): Exercise | undefined => index.get(id);

export const CATEGORIES: Record<Category, string> = {
	warmup: 'Warm-up',
	lowerBody: 'Lower Body',
	upperBody: 'Upper Body',
	core: 'Core',
	power: 'Power & Plyo',
	speed: 'Speed & Agility',
	conditioning: 'Conditioning',
	balance: 'Balance',
	mobility: 'Mobility',
	stickhandling: 'Stickhandling',
	shooting: 'Shooting',
	goalie: 'Goalie',
	running: 'Running',
	sprints: 'Sprints',
	hurdles: 'Hurdles',
	jumps: 'Jumps',
	throwing: 'Throws'
};
export const categoryTitle = (c: Category) => CATEGORIES[c];

export const HOCKEY_ONLY: Category[] = ['stickhandling', 'shooting', 'goalie'];
export const TRACK_ONLY: Category[] = ['sprints', 'hurdles', 'jumps', 'throwing'];

export const MUSCLES = {
	chest: 'Chest',
	shoulders: 'Shoulders',
	biceps: 'Biceps',
	triceps: 'Triceps',
	forearms: 'Forearms & Grip',
	upperBack: 'Upper Back',
	lats: 'Lats',
	lowerBack: 'Lower Back',
	abs: 'Abs',
	obliques: 'Obliques',
	hipFlexors: 'Hip Flexors',
	glutes: 'Glutes',
	adductors: 'Adductors (Groin)',
	abductors: 'Hip Abductors',
	quads: 'Quads',
	hamstrings: 'Hamstrings',
	calves: 'Calves'
} as const;

export const EQUIPMENT: Record<string, string> = {
	dumbbells: 'Dumbbells',
	kettlebell: 'Kettlebell',
	band: 'Resistance Band',
	barbell: 'Barbell & Rack',
	bench: 'Bench / Chair',
	box: 'Plyo Box / Step',
	medBall: 'Medicine Ball',
	pullupBar: 'Pull-up Bar',
	jumpRope: 'Jump Rope',
	cones: 'Cones / Markers',
	foamRoller: 'Foam Roller',
	slideBoard: 'Slide Board',
	stickBall: 'Stick & Ball',
	shootingPad: 'Shooting Pad & Net',
	tennisBall: 'Tennis Ball & Wall',
	hill: 'Hill / Ramp'
};

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const levelTitle = (e: Exercise) => LEVELS[Math.max(0, Math.min(2, e.level - 1))];

const pad = (n: number) => String(n).padStart(2, '0');

/** Same text as the iOS app's Measure.format. */
export function formatMeasure(m: Measure, v: number): string {
	switch (m) {
		case 'reps':
			return String(v);
		case 'seconds':
			return v >= 60 ? `${Math.floor(v / 60)}:${pad(v % 60)}` : `${v}s`;
		case 'lines':
			return `${v} ${v === 1 ? 'line' : 'lines'}`;
		case 'meters':
			return v >= 1000 ? `${(v / 1000).toFixed(1)}km` : `${v}m`;
	}
}

/** "3 × 8 / side", like the iOS app's defaultTarget(). */
export const formatTarget = (e: Exercise) =>
	`${e.sets} × ${formatMeasure(e.measure, e.base)}${e.perSide ? ' / side' : ''}`;

const haystack = new Map(
	exercises.map((e) => [
		e.id,
		[e.name, CATEGORIES[e.category], e.summary, ...e.primary.map((m) => MUSCLES[m]), ...e.secondary.map((m) => MUSCLES[m])]
			.join(' ')
			.toLowerCase()
	])
);

/** Every word of the query must appear in the name, category, summary or muscles. */
export function searchExercises(q: string, opts: { category?: Category; sport?: Sport } = {}): Exercise[] {
	const words = q.toLowerCase().split(/\s+/).filter(Boolean);
	const hidden = opts.sport === 'track' ? HOCKEY_ONLY : opts.sport === 'hockey' ? TRACK_ONLY : [];
	return exercises.filter(
		(e) =>
			!hidden.includes(e.category) &&
			(!opts.category || e.category === opts.category) &&
			words.every((w) => haystack.get(e.id)!.includes(w))
	);
}
