import React, { useState, KeyboardEvent } from 'react';

export const TagsInput: React.FC<{
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    label?: string;
    id?: string;
}> = ({ tags, onChange, placeholder, label, id }) => {
    const [input, setInput] = useState('');

    const addTag = (raw: string) => {
        const value = raw.trim();
        if (!value) return;
        const next = Array.from(new Set([...tags, value]));
        onChange(next);
        setInput('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    return (
        <div>
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {label}
                </label>
            )}
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2 min-h-[42px] focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(tags.filter((t) => t !== tag))}
                            className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white leading-none"
                            aria-label={`Remover ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => addTag(input)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter ou vírgula para adicionar</p>
        </div>
    );
};
