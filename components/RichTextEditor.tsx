import React, { useRef, useEffect, useCallback } from 'react';
import TooltipHint from './TooltipHint';

export const RichTextEditor: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    minHeight?: string;
    className?: string;
}> = ({ value, onChange, placeholder, rows = 4, minHeight = '6rem', className = '' }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (el.innerHTML !== value && document.activeElement !== el) {
            el.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        onChange(el.innerHTML || '');
    }, [onChange]);

    const execCmd = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const ToolbarButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode }> = ({ onClick, label, children }) => (
        <TooltipHint label={label}>
            <button
                type="button"
                onMouseDown={(e) => {
                    e.preventDefault();
                    editorRef.current?.focus();
                    onClick();
                }}
                className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
                aria-label={label}
            >
                {children}
            </button>
        </TooltipHint>
    );

    return (
        <div className={`rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden ${className}`}>
            <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-600">
                <ToolbarButton onClick={() => execCmd('bold')} label="Negrito">B</ToolbarButton>
                <ToolbarButton onClick={() => execCmd('italic')} label="Itálico"><em className="italic font-normal not-italic">I</em></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('insertUnorderedList')} label="Lista com marcadores">•</ToolbarButton>
                <ToolbarButton onClick={() => execCmd('insertOrderedList')} label="Lista numerada">1.</ToolbarButton>
                <ToolbarButton onClick={() => execCmd('foreColor', '#000000')} label="Cor do texto"><span className="underline">A</span></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('hiliteColor', '#fef08a')} label="Destacar texto"><span className="bg-yellow-200 px-0.5">A</span></ToolbarButton>
                <ToolbarButton onClick={() => execCmd('indent')} label="Indentar">↳</ToolbarButton>
                <ToolbarButton onClick={() => execCmd('outdent')} label="Reduzir indentação">↲</ToolbarButton>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                data-placeholder={placeholder}
                className="w-full p-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 min-w-0 overflow-auto focus:outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500"
                style={{ minHeight }}
                suppressContentEditableWarning
            />
        </div>
    );
};
