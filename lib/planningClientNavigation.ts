import type { TabId } from '../components/ClientPresentationView';

export const CLIENT_DEEP_LINK_KEY = 'flow.clientDeepLink';

export type ClientDeepLink = {
	clientId: string;
	tab: TabId;
};

export function setClientDeepLink(clientId: string, tab: TabId): void {
	try {
		localStorage.setItem(CLIENT_DEEP_LINK_KEY, JSON.stringify({ clientId, tab } satisfies ClientDeepLink));
	} catch {
		/* ignore */
	}
}

export function consumeClientDeepLink(expectedClientId?: string): ClientDeepLink | null {
	try {
		const raw = localStorage.getItem(CLIENT_DEEP_LINK_KEY);
		if (!raw) return null;
		localStorage.removeItem(CLIENT_DEEP_LINK_KEY);
		const parsed = JSON.parse(raw) as ClientDeepLink;
		if (!parsed?.clientId || !parsed?.tab) return null;
		if (expectedClientId && parsed.clientId !== expectedClientId) return null;
		return parsed;
	} catch {
		return null;
	}
}
