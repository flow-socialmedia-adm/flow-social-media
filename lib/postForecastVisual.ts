import type { Task } from '../types';

/** Item de cliente marcado como previsão de post (planejado, ainda não é post “fechado”). */
export function isPostForecast(task: Task): boolean {
    return !task.isGeneral && task.category === 'forecast';
}
