import { describe, expect, it } from 'vitest';
import type { ColorSchemeAreaPreference, ColorSchemeCustomData } from '../types';
import { DEFAULT_POST_STATUS_COLORS } from './defaultFlowColors';
import {
	buildColorSchemeActivation,
	buildColorSchemeContentSave,
} from './colorSchemeEditing';

const custom: ColorSchemeCustomData = {
	id: 'custom',
	name: 'Meu esquema',
	colors: {
		fazer_post: DEFAULT_POST_STATUS_COLORS.fazer_post,
	},
};

describe('edição e ativação independentes de esquemas', () => {
	it('salva um custom novo sem ativá-lo automaticamente', () => {
		const committed: ColorSchemeAreaPreference = { active: 'default', custom: null };

		expect(buildColorSchemeContentSave(committed, custom)).toEqual({
			active: 'default',
			custom,
		});
	});

	it('mantém o custom ativo ao salvar alterações do seu conteúdo', () => {
		const committed: ColorSchemeAreaPreference = { active: 'custom', custom };
		const renamed = { ...custom, name: 'Identidade da agência' };

		expect(buildColorSchemeContentSave(committed, renamed)).toEqual({
			active: 'custom',
			custom: renamed,
		});
	});

	it('retorna ao Padrão ao excluir o custom ativo', () => {
		const committed: ColorSchemeAreaPreference = { active: 'custom', custom };

		expect(buildColorSchemeContentSave(committed, null)).toEqual({
			active: 'default',
			custom: null,
		});
	});

	it('troca somente o active e preserva o custom persistido', () => {
		const committed: ColorSchemeAreaPreference = { active: 'default', custom };

		expect(buildColorSchemeActivation(committed, 'custom')).toEqual({
			active: 'custom',
			custom,
		});
	});

	it('não permite ativar um custom inexistente', () => {
		const committed: ColorSchemeAreaPreference = { active: 'default', custom: null };

		expect(buildColorSchemeActivation(committed, 'custom')).toEqual({
			active: 'default',
			custom: null,
		});
	});
});
