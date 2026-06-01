import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { FORBIDDEN_ACTION_DENIED } from '../permissions/forbidden-messages';

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const required =
			this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
				context.getHandler(),
				context.getClass(),
			]) ?? [];
		if (required.length === 0) return true;
		const { user } = context.switchToHttp().getRequest();
		const perms = (user?.permissions as string[] | undefined) ?? [];
		const ok = required.every((p) => perms.includes(p));
		if (!ok) throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		return ok;
	}
}

