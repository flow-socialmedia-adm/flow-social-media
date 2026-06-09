import React from 'react';

export const QuickSuggestionChips: React.FC<{
    suggestions: readonly string[];
    existing: string[];
    onAdd: (value: string) => void;
    label?: string;
}> = ({ suggestions, existing, onAdd, label }) => {
    const available = suggestions.filter((s) => !existing.includes(s));
    if (available.length === 0) return null;

    return (
        <div className="mt-2">
            {label && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
                {available.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onAdd(s)}
                        className="px-2.5 py-1 text-xs font-medium rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                        + {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

/** Chips para campo texto (ex.: tom de voz) — acrescentam ao valor existente. */
export const QuickTextSuggestionChips: React.FC<{
    suggestions: readonly string[];
    currentValue: string;
    onSelect: (value: string) => void;
    label?: string;
}> = ({ suggestions, currentValue, onSelect, label }) => (
    <div className="mt-2">
        {label && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
                <button
                    key={s}
                    type="button"
                    onClick={() => onSelect(currentValue.trim() ? `${currentValue.trim()}, ${s}` : s)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        currentValue.includes(s)
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
                            : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                >
                    {s}
                </button>
            ))}
        </div>
    </div>
);
