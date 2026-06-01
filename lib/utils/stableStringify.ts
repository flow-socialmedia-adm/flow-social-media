/** JSON.stringify com chaves de objetos ordenadas (comparações estáveis / dirty check). */
export function stableStringify(obj: unknown): string {
	return JSON.stringify(sortKeys(obj));
}

function sortKeys(obj: unknown): unknown {
	if (Array.isArray(obj)) return obj.map(sortKeys);

	if (obj && typeof obj === 'object') {
		const o = obj as Record<string, unknown>;
		return Object.keys(o)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = sortKeys(o[key]);
				return acc;
			}, {});
	}

	return obj;
}
