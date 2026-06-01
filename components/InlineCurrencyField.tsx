import React, { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons';
import TooltipHint from './TooltipHint';
import type { Currency } from '../types';

/**
 * Seletor compacto de moeda (texto + seta), sem underline no estado normal.
 * Hover leve; menu alinhado ao gatilho (largura mínima ao conteúdo).
 */
export const InlineCurrencyField: React.FC<{
    value: Currency;
    onChange: (c: Currency) => void;
    disabled?: boolean;
    options: { value: Currency; label: string }[];
    /** Texto discreto no topo do menu (contexto). */
    menuTitle: string;
    className?: string;
    /** Hint quando `disabled` (não é atributo HTML `title`). */
    disabledHint?: string;
}> = ({ value, onChange, disabled, options, menuTitle, className = '', disabledHint }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);
    const currentLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? value;
    const triggerBtn = (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen((o) => !o)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-2 py-1 text-left text-xs font-medium text-gray-800 shadow-none transition-colors hover:bg-gray-100/90 focus:outline-none dark:text-gray-100 dark:hover:bg-gray-700/50 disabled:cursor-default disabled:opacity-60 sm:text-sm"
            aria-label={disabled && disabledHint ? disabledHint : undefined}
        >
            <span className="max-w-[14rem] truncate">{currentLabel}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
        </button>
    );
    return (
        <div ref={wrapRef} className={`relative inline-flex min-w-0 max-w-full ${className}`}>
            {disabled && disabledHint ? <TooltipHint label={disabledHint}>{triggerBtn}</TooltipHint> : triggerBtn}
            {open && !disabled && (
                <div className="absolute left-0 top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <div className="border-b border-gray-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        {menuTitle}
                    </div>
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                            className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/80"
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
