import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { RequestContextService } from '../context/request-context.service';

/** Rotas em que o front já chama `logActivity` + `/activity-logs/ingest` (mensagem legível). */
function shouldSkipDuplicateClientActivityLog(method: string, originalUrl: string): boolean {
	const raw = String(originalUrl || '').split('?')[0];
	let path = raw;
	try {
		if (raw.startsWith('http')) path = new URL(raw).pathname;
	} catch {
		path = raw;
	}
	if (path.includes('/activity-logs/ingest')) return true;
	const m = method.toUpperCase();
	if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return false;
	if (path === '/tasks' || path.startsWith('/tasks/')) return true;
	if (path === '/clients' || path.startsWith('/clients/')) return true;
	if (path.startsWith('/users/')) return true;
	if (path === '/agencies/me' && ['PUT', 'PATCH'].includes(m)) return true;
	if (path === '/financial' || path.startsWith('/financial/')) return true;
	return false;
}

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
	constructor(
		private readonly logs: ActivityLogsService,
		private readonly ctx: RequestContextService,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest();
		const { method, originalUrl } = req;
		const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
		if (!isWrite) return next.handle();
		if (shouldSkipDuplicateClientActivityLog(method, originalUrl)) {
			return next.handle();
		}
		const snap = this.ctx.get();
		if (!snap?.agencyId || !snap?.userId) {
			return next.handle();
		}
		const actor = { agencyId: snap.agencyId, userId: snap.userId };
		return next.handle().pipe(
			tap(() => {
				const targetName =
					req.body?.name ||
					req.body?.title ||
					req.params?.id ||
					req.body?.id ||
					null;
				void this.logs
					.createLogEntry(actor, `${method} ${originalUrl}`, targetName ?? undefined)
					.catch(() => {});
			}),
		);
	}
}
