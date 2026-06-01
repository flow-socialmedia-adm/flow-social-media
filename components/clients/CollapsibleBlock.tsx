import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../icons';

export const CollapsibleBlock: React.FC<{
    heading: string;
    icon?: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}> = ({ heading, icon, expanded, onToggle, children }) => (
    <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80">
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
            aria-expanded={expanded}
        >
            {expanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            )}
            {icon && <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{heading}</span>
        </button>
        {expanded && <div className="px-5 pb-5 pt-0 border-t border-gray-200/80 dark:border-gray-700/80">{children}</div>}
    </div>
);
