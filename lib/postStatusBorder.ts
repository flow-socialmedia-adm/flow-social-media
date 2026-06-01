/** Borda lateral de mini-cards (Planejamento) — usa `category` do workflow quando disponível. */
export function getPostStatusBorderClass(status: { id?: string; category?: string } | undefined): string {
	if (!status) return 'border-l-slate-400';
	if (status.category === 'done') return 'border-l-emerald-500';
	if (status.category === 'in_progress') return 'border-l-violet-500';
	const id = (status.id || '').toLowerCase();
	if (/aprovacao|aguardando|enviar_aprovacao/.test(id)) return 'border-l-amber-500';
	return 'border-l-slate-400';
}
