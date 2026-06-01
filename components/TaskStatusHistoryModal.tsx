import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from './icons';
import { fetchTaskStatusHistory, type TaskStatusHistoryItemDto } from '../lib/taskStatusHistory';
import { substatusNameKeyForActionId } from '../lib/taskActionFlow';

type TaskStatusHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  variant: 'post' | 'task';
  t: (key: string, replacements?: Record<string, string>) => string;
};

/** Layout futuro: `timeline` pode ser adicionado sem reescrever o carregamento de dados. */
export type TaskStatusHistoryLayout = 'list' | 'timeline';

const STATUS_HISTORY_LAYOUT: TaskStatusHistoryLayout = 'list';

type DateSortDir = 'asc' | 'desc';

function formatHistoryDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusDisplayName(item: TaskStatusHistoryItemDto, t: TaskStatusHistoryModalProps['t']): string {
  if (item.status?.nameKey) {
    return t(item.status.nameKey);
  }
  return item.statusId || t('history_unknown_status');
}

/** Status macro + sub-etapa quando existir (ex.: "Em Produção · Criando arte"). */
function statusWithSubstep(item: TaskStatusHistoryItemDto, t: TaskStatusHistoryModalProps['t']): string {
  const base = statusDisplayName(item, t);
  const subKey = substatusNameKeyForActionId(item.currentActionId);
  if (!subKey) return base;
  return `${base} · ${t(subKey)}`;
}

function executionOwnerAutoLabel(detail: unknown, t: TaskStatusHistoryModalProps['t']): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const o = detail as Record<string, unknown>;
  if (o.type !== 'execution_owner') return null;
  const userName = typeof o.userName === 'string' ? o.userName.trim() : '';
  return t('history_execution_owner_auto_line', {
    name: userName || t('history_user_unknown'),
  });
}

function compareHistoryByDate(a: TaskStatusHistoryItemDto, b: TaskStatusHistoryItemDto): number {
  const ta = new Date(a.changedAt).getTime();
  const tb = new Date(b.changedAt).getTime();
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function previousStatusLabel(
  displayRows: TaskStatusHistoryItemDto[],
  rowIndex: number,
  t: TaskStatusHistoryModalProps['t'],
): string {
  if (rowIndex === 0) {
    return t('history_status_previous_created');
  }
  return statusWithSubstep(displayRows[rowIndex - 1], t);
}

type HistoryListTableProps = {
  rows: TaskStatusHistoryItemDto[];
  dateSort: DateSortDir;
  onToggleDateSort: () => void;
  t: TaskStatusHistoryModalProps['t'];
};

function HistoryListTable({ rows, dateSort, onToggleDateSort, t }: HistoryListTableProps) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 min-w-0">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-600">
            <th scope="col" className="py-2 pr-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              <button
                type="button"
                onClick={onToggleDateSort}
                className="inline-flex items-center gap-1 rounded-md -ml-1 pl-1 pr-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-left"
                aria-label={dateSort === 'asc' ? t('history_sort_date_aria_asc') : t('history_sort_date_aria_desc')}
              >
                <span>{t('history_col_date_changed')}</span>
                {dateSort === 'asc' ? (
                  <ArrowUpIcon className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                ) : (
                  <ArrowDownIcon className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                )}
              </button>
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {t('history_col_status_previous')}
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {t('history_col_status_current')}
            </th>
            <th scope="col" className="py-2 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {t('history_col_who_changed')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
          {rows.map((item, index) => {
            const execLabel =
              item.changeSource === 'execution_owner_auto' ? executionOwnerAutoLabel(item.detailJson, t) : null;
            const statusAtual = execLabel ?? statusWithSubstep(item, t);
            const statusAnterior = previousStatusLabel(rows, index, t);
            const when = formatHistoryDateTime(item.changedAt);
            const userName = item.user?.fullName?.trim();
            const who = userName || t('history_user_unknown');
            return (
              <tr key={item.id} className="align-top">
                <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{when}</td>
                <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{statusAnterior}</td>
                <td className="py-2.5 pr-3 text-gray-900 dark:text-gray-100 font-medium">{statusAtual}</td>
                <td className="py-2.5 text-gray-600 dark:text-gray-300">{who}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const TaskStatusHistoryModal: React.FC<TaskStatusHistoryModalProps> = ({ isOpen, onClose, taskId, variant, t }) => {
  const [items, setItems] = useState<TaskStatusHistoryItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateSort, setDateSort] = useState<DateSortDir>('asc');

  useEffect(() => {
    if (!isOpen || !taskId) {
      setItems([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDateSort('asc');
    void fetchTaskStatusHistory(taskId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t('history_load_error'));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId, t]);

  const sortedRows = useMemo(() => {
    const copy = [...items];
    copy.sort(compareHistoryByDate);
    if (dateSort === 'desc') {
      copy.reverse();
    }
    return copy;
  }, [items, dateSort]);

  if (!isOpen) return null;

  const title = variant === 'post' ? t('history_modal_post_title') : t('history_modal_task_title');

  const toggleDateSort = () => {
    setDateSort((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center items-start pt-14 sm:pt-20 md:pt-24 px-4 pb-10 overflow-y-auto bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-status-history-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl p-6 my-0 max-h-[min(calc(100dvh-5.5rem),90vh)] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-4">
          <h2 id="task-status-history-title" className="text-lg font-bold text-gray-900 dark:text-white leading-snug pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('cancel')}
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t('history_loading')}</p>}
        {!loading && error && <p className="text-sm text-red-600 dark:text-red-400 py-2">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{t('history_empty')}</p>
        )}
        {!loading && !error && items.length > 0 && STATUS_HISTORY_LAYOUT === 'list' && (
          <HistoryListTable rows={sortedRows} dateSort={dateSort} onToggleDateSort={toggleDateSort} t={t} />
        )}
      </div>
    </div>
  );
};

export default TaskStatusHistoryModal;
