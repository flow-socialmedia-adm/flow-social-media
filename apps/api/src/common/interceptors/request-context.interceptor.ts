import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
	constructor(private readonly ctx: RequestContextService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest();
		const user = req.user as
			| { sub: string; agencyId: string; role: string; permissions?: string[] }
			| undefined;

		return this.ctx.run(
			{
				userId: user?.sub,
				agencyId: user?.agencyId,
				role: user?.role,
				permissions: user?.permissions ?? [],
			},
			() => next.handle(),
		);
	}
}

