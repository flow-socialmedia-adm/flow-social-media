import type { ActivityHistoryLineV2, ActivityHistoryPageV2 } from '../types';

/** Post/previsão/tarefa a partir do fluxo de tarefas (API `/tasks`). */
export function buildTaskFlowHistoryLine(
	verb: 'created' | 'updated' | 'deleted',
	opts: {
		name: string;
		page: ActivityHistoryPageV2;
		isPost: boolean;
		isForecast?: boolean;
	},
): ActivityHistoryLineV2 {
	const item = opts.isForecast ? 'forecast' : opts.isPost ? 'post' : 'task';
	return { v: 2, verb, item, name: opts.name, page: opts.page };
}
