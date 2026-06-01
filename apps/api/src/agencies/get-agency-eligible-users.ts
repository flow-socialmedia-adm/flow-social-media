import type { PrismaService } from '../database/prisma.service';
import type { UserEligibilityRow } from './agency-operational.util';

/**
 * Membros da agência no formato usado por elegibilidade de responsáveis (owners).
 * Query alinhada a `TasksService.create` / preferências de cliente — sem filtros adicionais.
 */
export async function getAgencyEligibleUsers(
	prisma: Pick<PrismaService, 'user'>,
	agencyId: string,
): Promise<UserEligibilityRow[]> {
	const users = await prisma.user.findMany({
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
	});
	return users as unknown as UserEligibilityRow[];
}
