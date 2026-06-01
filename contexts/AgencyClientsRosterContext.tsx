import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { apiGet } from '../lib/api';

export type RosterClient = { id: string; name: string };

type RosterCtx = {
	roster: RosterClient[];
	isLoading: boolean;
	hasLoaded: boolean;
	idSet: Set<string>;
	nameById: Map<string, string>;
	addClient: (c: RosterClient) => void;
	removeClient: (clientId: string) => void;
	refresh: () => Promise<void>;
};

const DEFAULT_CTX: RosterCtx = {
	roster: [],
	isLoading: false,
	hasLoaded: false,
	idSet: new Set(),
	nameById: new Map(),
	addClient: () => undefined,
	removeClient: () => undefined,
	refresh: async () => undefined,
};

const AgencyClientsRosterContext = createContext<RosterCtx>(DEFAULT_CTX);

type ProviderProps = {
	children: React.ReactNode;
	/** Habilita o fetch inicial. Pode ser desligado em rotas públicas (landing/auth). */
	enabled?: boolean;
};

export const AgencyClientsRosterProvider: React.FC<ProviderProps> = ({
	children,
	enabled = true,
}) => {
	const [roster, setRoster] = useState<RosterClient[]>([]);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const inFlightRef = useRef<Promise<void> | null>(null);

	const refresh = useCallback(async () => {
		if (inFlightRef.current) return inFlightRef.current;
		const promise = (async () => {
			setIsLoading(true);
			try {
				const resp = await apiGet<{ items: { id: string; name: string }[]; total: number }>(
					'/clients',
					{ page: 1, pageSize: 1000 },
				);
				const next: RosterClient[] = (resp.items || [])
					.filter((c) => !!c?.id)
					.map((c) => ({ id: String(c.id), name: c.name ?? '' }));
				setRoster(next);
			} catch {
				setRoster([]);
			} finally {
				setIsLoading(false);
				setHasLoaded(true);
				inFlightRef.current = null;
			}
		})();
		inFlightRef.current = promise;
		return promise;
	}, []);

	useEffect(() => {
		if (!enabled || hasLoaded) return;
		void refresh();
	}, [enabled, hasLoaded, refresh]);

	const addClient = useCallback((c: RosterClient) => {
		setRoster((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
	}, []);

	const removeClient = useCallback((clientId: string) => {
		setRoster((prev) => prev.filter((c) => c.id !== clientId));
	}, []);

	const idSet = useMemo(() => new Set(roster.map((c) => c.id)), [roster]);
	const nameById = useMemo(
		() => new Map(roster.map((c) => [c.id, c.name] as const)),
		[roster],
	);

	const value = useMemo<RosterCtx>(
		() => ({ roster, isLoading, hasLoaded, idSet, nameById, addClient, removeClient, refresh }),
		[roster, isLoading, hasLoaded, idSet, nameById, addClient, removeClient, refresh],
	);

	return (
		<AgencyClientsRosterContext.Provider value={value}>
			{children}
		</AgencyClientsRosterContext.Provider>
	);
};

/** Acessa o roster compartilhado de clientes ativos (id + name). Carga única, atualizações locais. */
export function useAgencyClientsRoster(): RosterCtx {
	return useContext(AgencyClientsRosterContext);
}
