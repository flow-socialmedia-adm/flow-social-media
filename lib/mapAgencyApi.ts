import type {
	AgencyProfile,
	AgencyRole,
	Address,
	User,
	DefaultOwnerStrategy,
	SocialLink,
	AgencyOperationMode,
	ClientResponsibleMode,
} from '../types';
import { AGENCY_USER_FUNCTION_KEYS } from './agencyUserFunctions';
import { parseAgencyRoleFlags, parseAgencyRolePermissions } from './modulePermissions';

const USER_FN_ALLOWED = new Set<string>(AGENCY_USER_FUNCTION_KEYS);

function parseUserFunctionsFromApi(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	for (const x of raw) {
		if (typeof x !== 'string') continue;
		if (x === 'video') {
			if (!out.includes('videomaker')) out.push('videomaker');
			continue;
		}
		if (USER_FN_ALLOWED.has(x) && !out.includes(x)) out.push(x);
	}
	return out;
}

export function mapApiUserToTeamMember(u: any): User {
	return {
		id: u.id,
		name: u.fullName,
		email: u.email,
		avatarUrl: u.avatarUrl ?? undefined,
		role: u.role,
		permissions: (u.permissions as any) ?? [],
		jobTitle: u.jobTitle ?? undefined,
		phone: u.phone ?? undefined,
		birthDate: u.birthDate ?? undefined,
		operationalRole: u.operationalRole ?? 'OUTRO',
		canBeTaskOwner: u.canBeTaskOwner !== false,
		canBePostOwner: u.canBePostOwner !== false,
		canBeClientOwner: u.canBeClientOwner !== false,
		canBePlanningOwner: u.canBePlanningOwner !== false,
		agencyRoleId: u.agencyRoleId ?? null,
		simpleAccessLevel: u.simpleAccessLevel ?? null,
		functions: parseUserFunctionsFromApi(u.functions ?? u.userFunctions),
		inviteStatus: u.inviteStatus ?? 'active',
		invitedAt: u.invitedAt ?? null,
		activatedAt: u.activatedAt ?? null,
	};
}

function mapApiAgencyRole(r: any): AgencyRole {
	return {
		id: r.id,
		name: r.name,
		accessLevel: r.accessLevel ?? 'OPERATIONAL',
		permissions: parseAgencyRolePermissions(r.permissions),
		flags: parseAgencyRoleFlags(r.flags),
		isSystem: !!r.isSystem,
		systemKey: r.systemKey ?? null,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
	};
}

export function mergeAgencyFromApi(agency: any, prev: AgencyProfile): AgencyProfile {
	const aj = agency.addressJson as Record<string, unknown> | undefined | null;
	let mergedAddress: Address | undefined = prev.address;
	let mergedWhatsapp = prev.whatsapp;
	let mergedSocial = prev.socialLinks;
	if (aj && typeof aj === 'object' && !Array.isArray(aj)) {
		const { whatsapp: w, socialLinks: sl, ...addrRest } = aj as Record<string, unknown>;
		mergedAddress = { ...(prev.address || {}), ...addrRest } as Address;
		if (typeof w === 'string') mergedWhatsapp = w;
		if (Array.isArray(sl)) mergedSocial = sl as SocialLink[];
	}
	return {
		...prev,
		name: agency.name,
		avatarUrl: agency.logoUrl ?? prev.avatarUrl,
		contactEmail: agency.email,
		landlinePhone: agency.phone ?? prev.landlinePhone,
		whatsapp: mergedWhatsapp,
		address: mergedAddress,
		socialLinks: mergedSocial,
		cnpj: agency.cnpj ?? prev.cnpj,
		baseCurrency: agency.baseCurrency || 'BRL',
		plan_tier: agency.planTierV2 ?? 'agencia',
		trial_start: agency.trialStart ? new Date(agency.trialStart).toISOString() : undefined,
		trial_end: agency.trialEnd ? new Date(agency.trialEnd).toISOString() : undefined,
		subscription_status: agency.subscriptionStatus,
		subscription: {
			...prev.subscription,
			maxUsers: agency.maxUsers ?? prev.subscription.maxUsers,
		},
		defaultOwnerStrategy: (agency.defaultOwnerStrategy as DefaultOwnerStrategy) ?? 'AGENCY_OWNER',
		allowStageOwners: !!agency.allowStageOwners,
		operationMode: (agency.operationMode as AgencyOperationMode) ?? 'solo',
		clientResponsibleMode: (agency.clientResponsibleMode as ClientResponsibleMode) ?? 'per_client_planning',
		defaultClientOwnerUserId: agency.defaultClientOwnerUserId ?? null,
		agencyRoles: Array.isArray(agency.agencyRoles)
			? agency.agencyRoles.map(mapApiAgencyRole)
			: prev.agencyRoles ?? [],
		teamMembers: Array.isArray(agency.users) ? agency.users.map(mapApiUserToTeamMember) : prev.teamMembers,
	};
}
