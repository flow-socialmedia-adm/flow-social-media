import type { PrismaClient } from '@prisma/client';

/** Chaves internas estáveis para funções de sistema (idempotência). */
export const SYSTEM_ROLE_KEYS = {
	ADMIN: 'ADMIN',
	MANAGER: 'MANAGER',
	SOCIAL_MEDIA: 'SOCIAL_MEDIA',
	DESIGNER: 'DESIGNER',
	ATENDIMENTO: 'ATENDIMENTO',
	FINANCEIRO: 'FINANCEIRO',
} as const;

type ModulePerm = 'none' | 'view' | 'edit';

type Perms = Record<string, ModulePerm>;

type Flags = {
	canBeResponsiblePosts: boolean;
	canBeResponsibleTasks: boolean;
	canBeResponsibleClients: boolean;
	canBeResponsiblePlanning: boolean;
};

const P = (p: Partial<Record<string, ModulePerm>>): Perms => ({
	clients: p.clients ?? 'none',
	planning: p.planning ?? 'none',
	posts: p.posts ?? 'none',
	tasks: p.tasks ?? 'none',
	agenda: p.agenda ?? 'none',
	financial: p.financial ?? 'none',
	contracts: p.contracts ?? 'none',
	team: p.team ?? 'none',
	settings: p.settings ?? 'none',
});

const ALL_EDIT = P({
	clients: 'edit',
	planning: 'edit',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'edit',
	financial: 'edit',
	contracts: 'edit',
	team: 'edit',
	settings: 'edit',
});

const ALL_FLAGS_TRUE: Flags = {
	canBeResponsiblePosts: true,
	canBeResponsibleTasks: true,
	canBeResponsibleClients: true,
	canBeResponsiblePlanning: true,
};

const templates: Array<{
	systemKey: string;
	name: string;
	accessLevel: string;
	permissions: Perms;
	flags: Flags;
}> = [
	{
		systemKey: SYSTEM_ROLE_KEYS.ADMIN,
		name: 'Administrador',
		accessLevel: 'ADMIN',
		permissions: ALL_EDIT,
		flags: ALL_FLAGS_TRUE,
	},
	{
		systemKey: SYSTEM_ROLE_KEYS.MANAGER,
		name: 'Gestor',
		accessLevel: 'MANAGER',
		permissions: P({
			clients: 'edit',
			planning: 'edit',
			posts: 'edit',
			tasks: 'edit',
			agenda: 'edit',
			financial: 'view',
			contracts: 'view',
			team: 'view',
			settings: 'none',
		}),
		flags: ALL_FLAGS_TRUE,
	},
	{
		systemKey: SYSTEM_ROLE_KEYS.SOCIAL_MEDIA,
		name: 'Social Media',
		accessLevel: 'OPERATIONAL',
		permissions: P({
			clients: 'view',
			planning: 'edit',
			posts: 'edit',
			tasks: 'edit',
			agenda: 'edit',
			financial: 'none',
			contracts: 'none',
			team: 'none',
			settings: 'none',
		}),
		flags: {
			canBeResponsiblePosts: true,
			canBeResponsibleTasks: true,
			canBeResponsibleClients: false,
			canBeResponsiblePlanning: false,
		},
	},
	{
		systemKey: SYSTEM_ROLE_KEYS.DESIGNER,
		name: 'Designer',
		accessLevel: 'OPERATIONAL',
		permissions: P({
			clients: 'view',
			planning: 'view',
			posts: 'edit',
			tasks: 'edit',
			agenda: 'view',
			financial: 'none',
			contracts: 'none',
			team: 'none',
			settings: 'none',
		}),
		flags: {
			canBeResponsiblePosts: true,
			canBeResponsibleTasks: true,
			canBeResponsibleClients: false,
			canBeResponsiblePlanning: false,
		},
	},
	{
		systemKey: SYSTEM_ROLE_KEYS.ATENDIMENTO,
		name: 'Atendimento',
		accessLevel: 'OPERATIONAL',
		permissions: P({
			clients: 'edit',
			planning: 'view',
			posts: 'view',
			tasks: 'edit',
			agenda: 'edit',
			financial: 'view',
			contracts: 'view',
			team: 'view',
			settings: 'none',
		}),
		flags: {
			canBeResponsiblePosts: false,
			canBeResponsibleTasks: true,
			canBeResponsibleClients: true,
			canBeResponsiblePlanning: true,
		},
	},
	{
		systemKey: SYSTEM_ROLE_KEYS.FINANCEIRO,
		name: 'Financeiro',
		accessLevel: 'FINANCIAL',
		permissions: P({
			clients: 'view',
			planning: 'none',
			posts: 'none',
			tasks: 'none',
			agenda: 'none',
			financial: 'edit',
			contracts: 'edit',
			team: 'none',
			settings: 'none',
		}),
		flags: {
			canBeResponsiblePosts: false,
			canBeResponsibleTasks: false,
			canBeResponsibleClients: false,
			canBeResponsiblePlanning: false,
		},
	},
];

export async function ensureAgencySystemRoles(prisma: PrismaClient, agencyId: string) {
	for (const tpl of templates) {
		const exists = await prisma.agencyRole.findFirst({
			where: { agencyId, systemKey: tpl.systemKey },
		});
		if (exists) continue;
		await prisma.agencyRole.create({
			data: {
				agencyId,
				name: tpl.name,
				accessLevel: tpl.accessLevel,
				permissions: tpl.permissions as object,
				flags: tpl.flags as object,
				isSystem: true,
				systemKey: tpl.systemKey,
			},
		});
	}
}
