import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../common/security/crypto.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';
import {
	normalizeClientOwnerPreferences,
	type AgencySliceForClientOwner,
} from './client-owner.util';
import type { UserEligibilityRow } from '../agencies/agency-operational.util';

type CreateClientDto = {
	name: string;
	color?: string | null;
	avatarUrl?: string | null;
	website?: string | null;
	contactsJson?: unknown;
	type: 'company' | 'individual';
	document?: string | null;
	currency: 'BRL' | 'USD' | 'EUR';
	active?: boolean;
	addressJson?: unknown;
	brandGuideJson?: unknown;
	socialLinksJson?: unknown;
	accessCredentialsJson?: unknown; // will be encrypted
	contractJson?: unknown;
	clientOwnerPreferencesJson?: unknown;
	notes?: string | null;
};

type UpdateClientDto = Partial<CreateClientDto>;

@Injectable()
export class ClientsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly crypto: CryptoService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
	) {}

	private async loadAgencySliceAndUsersForOwnerPrefs(): Promise<{
		slice: AgencySliceForClientOwner;
		users: UserEligibilityRow[];
	}> {
		const agencyId = this.ctx.get()?.agencyId!;
		const [agency, users] = await this.prisma.$transaction([
			this.prisma.agency.findUnique({
				where: { id: agencyId },
				select: { mode: true, defaultOwnerStrategy: true, allowStageOwners: true },
			}),
			this.prisma.user.findMany({
				where: { agencyId },
				select: {
					id: true,
					fullName: true,
					email: true,
					role: true,
					deletedAt: true,
					operationalRole: true,
					canBeTaskOwner: true,
					canBePostOwner: true,
				},
			}),
		]);
		if (!agency) throw new BadRequestException('Agency not found');
		const slice: AgencySliceForClientOwner = {
			mode: agency.mode ?? 'SOLO',
			defaultOwnerStrategy: agency.defaultOwnerStrategy ?? 'AGENCY_OWNER',
			allowStageOwners: agency.allowStageOwners ?? false,
		};
		return { slice, users: users as UserEligibilityRow[] };
	}

	async list(page: number, pageSize: number, onlyDeleted = false) {
		const skip = (page - 1) * pageSize;
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const whereActive = { deletedAt: null };
		const whereDeleted = {
			deletedAt: { not: null, gte: thirtyDaysAgo },
		};
		const where = onlyDeleted ? whereDeleted : whereActive;
		const [items, total] = await this.prisma.$transaction([
			this.prisma.client.findMany({
				where,
				orderBy: onlyDeleted ? { deletedAt: 'desc' } : { name: 'asc' },
				skip,
				take: pageSize,
			}),
			this.prisma.client.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async get(id: string) {
		await this.access.assertCanView('clients');
		const client = await this.prisma.client.findUnique({ where: { id } });
		if (!client || client.deletedAt) return null;
		return client;
	}

	async create(data: CreateClientDto) {
		await this.access.assertCanEdit('clients');
		if (data.contractJson !== undefined && data.contractJson !== null) {
			await this.access.assertCanEdit('contracts');
		}
		const agencyId = this.ctx.get()?.agencyId!;
		const encCreds =
			typeof data.accessCredentialsJson !== 'undefined'
				? this.crypto.encryptJson(data.accessCredentialsJson)
				: undefined;
		let ownerJson: unknown = undefined;
		if (typeof data.clientOwnerPreferencesJson !== 'undefined') {
			const { slice, users } = await this.loadAgencySliceAndUsersForOwnerPrefs();
			ownerJson = normalizeClientOwnerPreferences(data.clientOwnerPreferencesJson, users, slice);
		}
		const createData = {
			agencyId,
			name: data.name,
			color: data.color ?? null,
			avatarUrl: data.avatarUrl ?? null,
			website: data.website ?? null,
			contactsJson: data.contactsJson ?? null,
			type: data.type,
			document: data.document ?? null,
			currency: data.currency,
			active: data.active ?? true,
			addressJson: data.addressJson ?? null,
			brandGuideJson: data.brandGuideJson ?? null,
			socialLinksJson: data.socialLinksJson ?? null,
			accessCredentialsJson: encCreds ?? null,
			contractJson: data.contractJson ?? null,
			...(typeof data.clientOwnerPreferencesJson !== 'undefined'
				? { clientOwnerPreferencesJson: ownerJson as object }
				: {}),
			notes: data.notes ?? null,
		};
		return this.prisma.client.create({ data: createData as any });
	}

	async update(id: string, data: UpdateClientDto) {
		await this.access.assertCanEdit('clients');
		if (data.contractJson !== undefined) {
			await this.access.assertCanEdit('contracts');
		}
		// Update parcial: apenas campos explicitamente presentes no payload entram no update.
		// Campos ausentes (undefined) não são tocados — evita sobrescrever contractJson
		// e outros JSONs quando o frontend não os envia.
		const encCreds =
			typeof data.accessCredentialsJson !== 'undefined'
				? this.crypto.encryptJson(data.accessCredentialsJson)
				: undefined;

		const updateData: Record<string, any> = {};
		if (data.name !== undefined) updateData.name = data.name;
		if (data.color !== undefined) updateData.color = data.color;
		if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
		if (data.website !== undefined) updateData.website = data.website;
		if (data.contactsJson !== undefined) updateData.contactsJson = data.contactsJson;
		if (data.type !== undefined) updateData.type = data.type;
		if (data.document !== undefined) updateData.document = data.document;
		if (data.currency !== undefined) updateData.currency = data.currency;
		if (data.active !== undefined) updateData.active = data.active;
		if (data.notes !== undefined) updateData.notes = data.notes;

		if (data.addressJson !== undefined) updateData.addressJson = data.addressJson;
		if (data.brandGuideJson !== undefined) updateData.brandGuideJson = data.brandGuideJson;
		if (data.socialLinksJson !== undefined) updateData.socialLinksJson = data.socialLinksJson;
		if (data.contractJson !== undefined) updateData.contractJson = data.contractJson;
		if (typeof data.accessCredentialsJson !== 'undefined')
			updateData.accessCredentialsJson = encCreds;

		if (data.clientOwnerPreferencesJson !== undefined) {
			const { slice, users } = await this.loadAgencySliceAndUsersForOwnerPrefs();
			updateData.clientOwnerPreferencesJson = normalizeClientOwnerPreferences(
				data.clientOwnerPreferencesJson,
				users,
				slice,
			) as object;
		}

		if (Object.keys(updateData).length === 0) {
			return this.prisma.client.findUnique({ where: { id } });
		}

		try {
			// O middleware multi-tenant converte update→updateMany (retorna {count:N}).
			await this.prisma.client.update({
				where: { id },
				data: updateData,
			});
		} catch (err) {
			console.error('[ClientsService.update] Erro ao atualizar cliente:', err);
			throw err;
		}

		return this.prisma.client.findFirst({ where: { id } });
	}

	async remove(id: string) {
		await this.access.assertCanEdit('clients');
		const client = await this.prisma.client.findFirst({ where: { id, deletedAt: null } });
		if (!client) return { ok: false, deleted: 0 };
		await this.prisma.client.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
		return { ok: true, deleted: 1 };
	}

	async restore(id: string) {
		await this.access.assertCanEdit('clients');
		const client = await this.prisma.client.findFirst({
			where: { id, deletedAt: { not: null } },
		});
		if (!client) return null;
		return this.prisma.client.update({
			where: { id },
			data: { deletedAt: null },
		});
	}
}

