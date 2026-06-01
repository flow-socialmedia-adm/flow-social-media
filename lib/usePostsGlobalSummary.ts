import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from './api';
import type { PostsGlobalCounts } from './intelligentCentral';

type SummaryResponse = {
	posts?: {
		overdueCount?: number;
		approvedPendingCount?: number;
		unassignedActiveCount?: number;
		staleProductionCount?: number;
		todayStr?: string;
		staleProductionDays?: number;
		clientWorkflowId?: string | null;
		clientWorkflowResolved?: boolean;
	};
};

type UsePostsGlobalSummaryOptions = {
	/** Workflow de posts da agência. Sem ele o endpoint não calcula a seção posts. */
	clientWorkflowId: string | undefined;
	enabled?: boolean;
	/** Limite (dias) para "em produção há muito tempo". Default 14. */
	staleProductionDays?: number;
};

type UsePostsGlobalSummaryResult = {
	counts: PostsGlobalCounts | undefined;
	hasLoaded: boolean;
	isLoading: boolean;
	error: unknown;
	refresh: () => Promise<void>;
};

/**
 * Hook leve para alimentar `buildPostsIntelligenceItems` com contagens globais
 * vindas de `GET /tasks/summary?clientWorkflowId=...`.
 */
export function usePostsGlobalSummary(
	options: UsePostsGlobalSummaryOptions,
): UsePostsGlobalSummaryResult {
	const { clientWorkflowId, enabled = true, staleProductionDays = 14 } = options;
	const [counts, setCounts] = useState<PostsGlobalCounts | undefined>(undefined);
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
		if (!clientWorkflowId) return;
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsLoading(true);
		try {
			const resp = await apiGet<SummaryResponse>(
				'/tasks/summary',
				{ clientWorkflowId, staleProductionDays },
				{ bypassShortLivedCache: true },
			);
			if (!mountedRef.current) return;
			const posts = resp?.posts;
			if (!posts || posts.clientWorkflowResolved === false) {
				setCounts(undefined);
			} else {
				setCounts({
					overdueCount: posts.overdueCount,
					approvedPendingCount: posts.approvedPendingCount,
					unassignedActiveCount: posts.unassignedActiveCount,
					staleProductionCount: posts.staleProductionCount,
				});
			}
			setError(null);
		} catch (e) {
			if (!mountedRef.current) return;
			setError(e);
		} finally {
			if (mountedRef.current) {
				setIsLoading(false);
				setHasLoaded(true);
			}
			inFlightRef.current = false;
		}
	}, [enabled, clientWorkflowId, staleProductionDays]);

	useEffect(() => {
		if (!enabled) return;
		if (!clientWorkflowId) return;
		void fetchSummary();
	}, [enabled, clientWorkflowId, fetchSummary]);

	const refresh = useCallback(async () => {
		await fetchSummary();
	}, [fetchSummary]);

	return { counts, hasLoaded, isLoading, error, refresh };
}
