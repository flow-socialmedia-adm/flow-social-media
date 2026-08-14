type ColorArea = 'posts' | 'tasks';
type ActiveScheme = 'default' | 'custom';

export type StoredStatusColor = {
	bg: string;
	text: string;
	border: string;
	ring: string;
};

export type StoredColorSchemeArea = {
	active: ActiveScheme;
	custom: {
		id: 'custom';
		name: string;
		colors: Record<string, StoredStatusColor>;
	} | null;
};

export type StoredColorSchemes = Record<ColorArea, StoredColorSchemeArea>;

const AREA_STATUS_IDS: Record<ColorArea, ReadonlySet<string>> = {
	posts: new Set(['ideia_post', 'fazer_post', 'enviar_aprovacao', 'agendar_post', 'agendado_postado']),
	tasks: new Set(['todo', 'in_progress', 'done']),
};

const SAFE_CLASS = /^[a-z0-9:[\]/.%_-]+(?:\s+[a-z0-9:[\]/.%_-]+)*$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validClass(value: unknown, prefixes: string[]): value is string {
	if (typeof value !== 'string' || value.length > 120 || !SAFE_CLASS.test(value)) return false;
	const tokens = value.split(/\s+/);
	return tokens.every((token) => prefixes.some((prefix) => token.startsWith(prefix)));
}

function normalizeStatusColor(value: unknown): StoredStatusColor | null {
	if (!isRecord(value)) return null;
	if (!validClass(value.bg, ['bg-'])) return null;
	if (!validClass(value.text, ['text-', 'dark:text-'])) return null;
	if (!validClass(value.border, ['border-', 'dark:border-'])) return null;
	if (!validClass(value.ring, ['ring-', 'dark:ring-'])) return null;
	return {
		bg: value.bg,
		text: value.text,
		border: value.border,
		ring: value.ring,
	};
}

export function defaultStoredColorSchemeArea(): StoredColorSchemeArea {
	return { active: 'default', custom: null };
}

export function normalizeStoredColorSchemeArea(area: ColorArea, raw: unknown): StoredColorSchemeArea {
	if (!isRecord(raw)) return defaultStoredColorSchemeArea();

	const customRaw = isRecord(raw.custom) ? raw.custom : null;
	let custom: StoredColorSchemeArea['custom'] = null;
	if (customRaw) {
		const colors: Record<string, StoredStatusColor> = {};
		if (isRecord(customRaw.colors)) {
			for (const [statusId, colorRaw] of Object.entries(customRaw.colors)) {
				if (!AREA_STATUS_IDS[area].has(statusId)) continue;
				const color = normalizeStatusColor(colorRaw);
				if (color) colors[statusId] = color;
			}
		}
		const rawName = typeof customRaw.name === 'string' ? customRaw.name.trim() : '';
		custom = {
			id: 'custom',
			name: (rawName || 'Personalizado').slice(0, 80),
			colors,
		};
	}

	const active: ActiveScheme = raw.active === 'custom' && custom ? 'custom' : 'default';
	return { active, custom };
}

export function normalizeStoredColorSchemes(raw: unknown): StoredColorSchemes {
	const source = isRecord(raw) ? raw : {};
	return {
		posts: normalizeStoredColorSchemeArea('posts', source.posts),
		tasks: normalizeStoredColorSchemeArea('tasks', source.tasks),
	};
}
