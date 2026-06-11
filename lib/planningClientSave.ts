import type { Client } from '../types';
import { apiGet, apiPut } from './api';
import { defaultClientOwnerPreferences } from './client-owner-preferences';
import { migrateClientToBriefingV2 } from './briefingV2/migrate';
import { syncLegacyBrandGuideFields } from './briefingV2/syncLegacy';
import { resolveColorHex } from './utils';
import { normalizeClient } from '../components/clients/clientUtils';

/** Persiste cliente no mesmo formato usado por ClientsPage (Briefing V2 + dual-write). */
export async function savePlanningClient(client: Client): Promise<Client> {
	const briefingBase = client.briefingV2 ?? migrateClientToBriefingV2(client);
	const briefingForSave = {
		...briefingBase,
		_internal: {
			...briefingBase._internal,
			planning: {
				...briefingBase._internal?.planning,
				accountOwnerLegacy:
					client.planningAccountOwner || briefingBase._internal?.planning?.accountOwnerLegacy,
			},
		},
	};
	const legacyBriefingSync = syncLegacyBrandGuideFields(briefingForSave);

	const headerColorHex =
		client.headerColorIndex != null && client.brandColors?.[client.headerColorIndex]
			? resolveColorHex(client.brandColors[client.headerColorIndex].hex)
			: '#475569';
	const logos = (client.brandAssets || []).filter((a) => a.type === 'logo');
	const avatarUrlFromPrincipal =
		client.principalLogoIndex != null && logos[client.principalLogoIndex]?.url
			? logos[client.principalLogoIndex].url
			: null;

	const contactsForPayload = (client.contacts || []).map((ct) => ({
		id: ct.id ?? '',
		name: ct.name ?? '',
		role: ct.role ?? '',
		email: ct.email ?? '',
		whatsapp: ct.whatsapp ?? '',
		landlinePhone: ct.landlinePhone ?? '',
		notes: ct.notes ?? '',
		isPrimary: !!ct.isPrimary,
	}));

	const clientPayload: Record<string, unknown> = {
		name: client.name?.trim() ?? '',
		type: client.clientType || 'individual',
		currency: client.currency || 'BRL',
		active: true,
		color: headerColorHex,
		avatarUrl: avatarUrlFromPrincipal ?? null,
		website: client.website?.trim() || null,
		contactsJson: contactsForPayload.length > 0 ? contactsForPayload : null,
		socialLinksJson: client.socialLinks || [],
		addressJson: client.address || null,
		brandGuideJson: {
			brandColors: client.brandColors || [],
			headerColorIndex: client.headerColorIndex ?? null,
			principalLogoIndex: client.principalLogoIndex ?? null,
			typography: client.typography || {},
			brandAssets: client.brandAssets || [],
			legalRepresentativeRg: client.legalRepresentativeRg || null,
			legalRepresentativeEmail: client.legalRepresentativeEmail || null,
			legalRepresentativeWhatsapp: client.legalRepresentativeWhatsapp || null,
			legalRepresentativeRole: client.legalRepresentativeRole || null,
			legalRepresentativeBirthDate: client.legalRepresentativeBirthDate || null,
			companyStateRegistration: client.companyStateRegistration || null,
			companyLandlinePhone: client.companyLandlinePhone || null,
			companyPhone: client.companyPhone || null,
			brandGuidelines: (client.brandHistory || client.brandGuidelines) || null,
			...legacyBriefingSync,
		},
		accessCredentialsJson: client.accessCredentials || null,
		notes: briefingForSave.content.strategyNotes || client.strategyNotes || null,
		clientOwnerPreferencesJson: client.ownerPreferences ?? defaultClientOwnerPreferences(),
		contractJson: client.contract ?? null,
	};

	const updated = await apiPut<Record<string, unknown>>(`/clients/${client.id}`, clientPayload);
	let apiData = updated;
	if (!updated?.id) {
		apiData = await apiGet<Record<string, unknown>>(`/clients/${client.id}`, { _ts: Date.now() });
	}
	return normalizeClient(apiData);
}
