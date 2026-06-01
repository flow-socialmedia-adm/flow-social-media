import React, { useCallback, useEffect, useRef, useState } from 'react';

export type AgendaInlineTitleSurface = 'light' | 'tinted';

type AgendaInlineTitleProps = {
    taskId: string;
    title: string;
    canEdit: boolean;
    className?: string;
    surface?: AgendaInlineTitleSurface;
    onSave: (taskId: string, title: string) => void | Promise<void>;
};

const SURFACE_STYLES: Record<
    AgendaInlineTitleSurface,
    { idleHover: string; focus: string; input: string }
> = {
    light: {
        idleHover: 'hover:text-indigo-600 dark:hover:text-indigo-400',
        focus: 'focus-visible:text-indigo-600 dark:focus-visible:text-indigo-400',
        input: 'text-gray-800 dark:text-gray-200 caret-gray-600 dark:caret-gray-300',
    },
    tinted: {
        idleHover: 'hover:text-white',
        focus: 'focus-visible:text-white',
        input: 'text-white caret-white',
    },
};

const AgendaInlineTitle: React.FC<AgendaInlineTitleProps> = ({
    taskId,
    title,
    canEdit,
    className,
    surface = 'tinted',
    onSave,
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(title);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const surfaceStyle = SURFACE_STYLES[surface];

    useEffect(() => {
        if (!editing) setDraft(title);
    }, [title, editing]);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    const cancel = useCallback(() => {
        setDraft(title);
        setEditing(false);
    }, [title]);

    const commit = useCallback(async () => {
        const trimmed = draft.trim();
        if (!trimmed || trimmed === title) {
            cancel();
            return;
        }
        setSaving(true);
        try {
            await onSave(taskId, trimmed);
            setEditing(false);
        } catch {
            setDraft(title);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }, [cancel, draft, onSave, taskId, title]);

    const baseClass = className ?? 'text-xs font-semibold truncate flex-1 min-w-0';

    if (!canEdit) {
        return <p className={baseClass}>{title}</p>;
    }

    if (!editing) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                }}
                className={`${baseClass} text-left transition-colors duration-150 ${surfaceStyle.idleHover} ${surfaceStyle.focus} focus:outline-none`}
                title={title}
            >
                {title}
            </button>
        );
    }

    return (
        <input
            ref={inputRef}
            type="text"
            value={draft}
            disabled={saving}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    void commit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            onBlur={() => {
                void commit();
            }}
            className={`min-w-0 w-full flex-1 bg-transparent border-0 p-0 text-xs font-semibold shadow-none outline-none ring-0 focus:ring-0 ${surfaceStyle.input}`}
            aria-label={title}
        />
    );
};

export default AgendaInlineTitle;
