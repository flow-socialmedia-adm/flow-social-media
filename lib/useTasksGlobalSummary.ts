import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from './api';
import type { TasksGlobalCounts } from './intelligentCentral';

type SummaryResponse = {
	general?: {
		overdueCount?: number;
		unassignedActiveCount?: number;
		wipCount?: number;
		todayStr?: string;
		wipThreshold?: number;
		generalWorkflowId?: string | null;
		generalWorkflowResolved?: boolean;
	};
};

type UseTasksGlobalSummaryOptions = {
	/** Workflow geral da agência. Sem ele o endpoint devolve zeros e o builder cai no fallback local. */
	generalWorkflowId: string | undefined;
	/** Habilita a busca; útil para esperar mappedUser/auth antes de chamar. Default true. */
	enabled?: boolean;
	/** Limite enviado ao backend (reservado a evoluções futuras). Default 8. */
	wipThreshold?: number;
};

type UseTasksGlobalSummaryResult = {
	counts: TasksGlobalCounts | undefined;
	hasLoaded: boolean;
	isLoading: boolean;
	error: unknown;
	/** Refaz a chamada — usado após mutações em tasks (criar, atualizar, excluir, mover status). */
	refresh: () => Promise<void>;
};

/**
 * Hook leve para alimentar `buildTasksIntelligenceItems` com contagens globais
 * vindas de `GET /tasks/summary`. Não substitui a carga local de tasks da página;
 * apenas complementa a Central Inteligente.
 *
 * Falhas e respostas vazias devolvem `counts = undefined` — o builder mantém o
 * comportamento local anterior, então um erro de rede não quebra a Central.
 */
export function useTasksGlobalSummary(
	options: UseTasksGlobalSummaryOptions,
): UseTasksGlobalSummaryResult {
	const { generalWorkflowId, enabled = true, wipThreshold = 8 } = options;
	const [counts, setCounts] = useState<TasksGlobalCounts | undefined>(undefined);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<unknown>(null);
	const inFlightRef = useRef(false);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const fetchSummary = useCallback(async () => {
		if (!enabled) return;
		if (!generalWorkflowId) return;
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsLoading(true);
		try {
			const resp = await apiGet<SummaryResponse>(
				'/tasks/summary',
				{ generalWorkflowId, wipThreshold },
				{ bypassShortLivedCache: true },
			);
			if (!mountedRef.current) return;
			const general = resp?.general;
			if (!general || general.generalWorkflowResolved === false) {
				// Workflow não encontrado no backend ou resposta sem dados: fallback silencioso
				setCounts(undefined);
			} else {
				setCounts({
					overdueCount: general.overdueCount,
					unassignedActiveCount: general.unassignedActiveCount,
					wipCount: general.wipCount,
				});
			}
			setError(null);
		} catch (e) {
			if (!mountedRef.current) return;
			setError(e);
			// Em erro, não derrubamos counts anteriores (se houver); mantemos último valor conhecido
		} finally {
			if (mountedRef.current) {
				setIsLoading(false);
				setHasLoaded(true);
			}
			inFlightRef.current = false;
		}
	}, [enabled, generalWorkflowId, wipThreshold]);

	useEffect(() => {
		if (!enabled) return;
		if (!generalWorkflowId) return;
		void fetchSummary();
	}, [enabled, generalWorkflowId, fetchSummary]);

	const refresh = useCallback(async () => {
		await fetchSummary();
	}, [fetchSummary]);

	return { counts, hasLoaded, isLoading, error, refresh };
}
