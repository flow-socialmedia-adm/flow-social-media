import type { AgencyOperationMode } from '../types';

/** Em `operationMode === 'solo'` não exibimos nem aplicamos (no backend) "em execução por". */
export function agencyShowsExecutionOwner(operationMode: AgencyOperationMode | undefined): boolean {
	return (operationMode ?? 'solo') !== 'solo';
}
