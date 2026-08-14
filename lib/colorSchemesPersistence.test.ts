import { describe, expect, it } from 'vitest';
import {
	defaultStoredColorSchemeArea,
	normalizeStoredColorSchemeArea,
	normalizeStoredColorSchemes,
} from '../apps/api/src/agencies/agency-color-schemes';
import {
	applyActiveColorSchemes,
	createDefaultColorSchemesPreferences,
	normalizeColorSchemesPreferences,
	serializeColorSchemeAreaPreference,
} from './colorSchemes';
import { DEFAULT_POST_STATUS_COLORS } from './defaultFlowColors';
import { getStatusColorVariantClass } from './getStatusColorVariants';
import type { Workflow } from '../types';

describe('persistência dos esquemas de cores da agência', () => {
	it('backend usa fallback Padrão para payload ausente ou inválido', () => {
		expect(normalizeStoredColorSchemes(null)).toEqual({
			posts: defaultStoredColorSchemeArea(),
			tasks: defaultStoredColorSchemeArea(),
		});
		expect(normalizeStoredColorSchemeArea('posts', { active: 'custom' })).toEqual(
			defaultStoredColorSchemeArea(),
		);
	});

	it('backend aceita apenas IDs canônicos e classes seguras', () => {
		const normalized = normalizeStoredColorSchemeArea('posts', {
			active: 'custom',
			custom: {
				name: ' Minha paleta ',
				colors: {
					fazer_post: {
						bg: 'bg-purple-500',
						text: 'text-white',
						border: 'border-purple-600 dark:border-purple-400',
						ring: 'ring-purple-500',
					},
					status_inexistente: {
						bg: 'bg-red-500',
						text: 'text-white',
						border: 'border-red-600',
						ring: 'ring-red-500',
					},
					ideia_post: {
						bg: 'url(javascript:alert(1))',
						text: 'text-white',
						border: 'border-red-600',
						ring: 'ring-red-500',
					},
				},
			},
		});

		expect(normalized.active).toBe('custom');
		expect(normalized.custom?.name).toBe('Minha paleta');
		expect(Object.keys(normalized.custom?.colors ?? {})).toEqual(['fazer_post']);
	});

	it('frontend envia somente overrides e reidrata com os padrões oficiais', () => {
		const preferences = createDefaultColorSchemesPreferences();
		preferences.posts = {
			active: 'custom',
			custom: {
				id: 'custom',
				name: 'Meu esquema',
				colors: {
					...DEFAULT_POST_STATUS_COLORS,
					fazer_post: {
						bg: 'bg-purple-500',
						text: 'text-white',
						border: 'border-purple-600 dark:border-purple-400',
						ring: 'ring-purple-500',
					},
				},
			},
		};

		const compact = serializeColorSchemeAreaPreference('posts', preferences.posts);
		expect(Object.keys(compact.custom?.colors ?? {})).toEqual(['fazer_post']);

		const rehydrated = normalizeColorSchemesPreferences({
			posts: compact,
			tasks: preferences.tasks,
		});
		expect(rehydrated.posts.custom?.colors.ideia_post).toEqual(DEFAULT_POST_STATUS_COLORS.ideia_post);
		expect(rehydrated.posts.custom?.colors.fazer_post.bg).toBe('bg-purple-500');
	});

	it('substatus derivam tons da família escolhida no status principal', () => {
		const purple = {
			bg: 'bg-purple-500',
			text: 'text-white',
			border: 'border-purple-600 dark:border-purple-400',
			ring: 'ring-purple-500',
		};
		expect(getStatusColorVariantClass(purple, 'light')).toBe('bg-purple-100');
		expect(getStatusColorVariantClass(purple, 'medium')).toBe('bg-purple-200');
		expect(getStatusColorVariantClass(purple, 'dark')).toBe('bg-purple-700');
	});

	it('aplica cores aos IDs da API sem alterar a estrutura dos workflows', () => {
		const fallback = {
			bg: 'bg-gray-500',
			text: 'text-white',
			border: 'border-gray-600',
			ring: 'ring-gray-500',
		};
		const makeStatus = (id: string, category: string) => ({
			id,
			nameKey: id,
			category,
			color: { ...fallback },
		});
		const workflows: Record<string, Workflow> = {
			posts: {
				id: 'posts',
				nameKey: 'posts',
				category: 'client',
				isCustom: false,
				statuses: [
					makeStatus('pauta_criada', 'todo'),
					makeStatus('em_producao', 'in_progress'),
					makeStatus('aguardando_aprovacao', 'in_progress'),
					makeStatus('aprovado', 'in_progress'),
					makeStatus('agendado', 'done'),
					makeStatus('publicado', 'done'),
				],
			},
			tasks: {
				id: 'tasks',
				nameKey: 'tasks',
				category: 'general',
				isCustom: false,
				statuses: [
					makeStatus('a_fazer', 'todo'),
					makeStatus('em_andamento', 'in_progress'),
					makeStatus('concluido', 'done'),
				],
			},
		};
		const prefs = createDefaultColorSchemesPreferences();
		prefs.posts = {
			active: 'custom',
			custom: {
				id: 'custom',
				name: 'Custom',
				colors: {
					...DEFAULT_POST_STATUS_COLORS,
					enviar_aprovacao: {
						bg: 'bg-purple-500',
						text: 'text-white',
						border: 'border-purple-600',
						ring: 'ring-purple-500',
					},
				},
			},
		};

		const applied = applyActiveColorSchemes(workflows, prefs, 'posts', 'tasks');
		expect(applied.posts.statuses.map((status) => status.id)).toEqual(
			workflows.posts.statuses.map((status) => status.id),
		);
		expect(applied.posts.statuses.find((status) => status.id === 'aguardando_aprovacao')?.color.bg)
			.toBe('bg-purple-500');
		expect(applied.posts.statuses.find((status) => status.id === 'aprovado')?.color.bg)
			.toBe('bg-purple-500');
	});
});
