import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { FORBIDDEN_MODULE_VIEW } from '../permissions/forbidden-messages';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles =
			this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
				context.getHandler(),
				context.getClass(),
			]) ?? [];
		if (requiredRoles.length === 0) return true;
		const { user } = context.switchToHttp().getRequest();
		if (!user?.role) {
			throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		}
		return requiredRoles.includes(user.role);
	}
}

