import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { AgencyModuleKey, ModuleAccessLevel } from '../permissions/agency-module-keys';

export type RequestContextStore = {
	userId?: string;
	agencyId?: string;
	role?: string;
	permissions?: string[];
	/** Cache por request preenchido por ModuleAccessService. */
	resolvedModulePermissions?: Record<AgencyModuleKey, ModuleAccessLevel>;
};

@Injectable()
export class RequestContextService {
	private readonly als = new AsyncLocalStorage<RequestContextStore>();

	run<T>(store: RequestContextStore, callback: () => T): T {
		return this.als.run(store, callback);
	}

	get(): RequestContextStore | undefined {
		return this.als.getStore();
	}
}

