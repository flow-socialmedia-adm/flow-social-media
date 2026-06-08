import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../../icons';
import type { BlockProgress } from '../../../lib/clientBriefingProgress';

const BLOCK_ACCENTS = {
    strategy: 'border-l-violet-500',
    audience: 'border-l-sky-500',
    communication: 'border-l-rose-500',
    content: 'border-l-emerald-500',
    planning: 'border-l-amber-500',
} as const;

export type BriefingBlockAccent = keyof typeof BLOCK_ACCENTS;

export const BriefingBlockSection: React.FC<{
    title: string;
    description: string;
    accent: BriefingBlockAccent;
    expanded: boolean;
    onToggle: () => void;
    progress?: BlockProgress;
    progressLabel?: string;
    children: React.ReactNode;
}> = ({ title, description, accent, expanded, onToggle, progress, progressLabel, children }) => (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden border-l-4 ${BLOCK_ACCENTS[accent]}`}>
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-5 py-4 text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={expanded}
        >
            {expanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {progress && progressLabel && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                            {progressLabel.replace('{filled}', String(progress.filled)).replace('{total}', String(progress.total))}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </button>
        {expanded && <div className="p-5 space-y-4">{children}</div>}
    </section>
);

const SimpleTextarea: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    label?: string;
    rows?: number;
}> = ({ value, onChange, placeholder, label, rows = 3 }) => (
    <div>
        {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>}
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

export { SimpleTextarea };
