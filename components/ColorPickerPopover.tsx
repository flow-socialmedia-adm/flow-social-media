import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { CopyIcon } from './icons';
import TooltipHint from './TooltipHint';

/** ~20 cores predefinidas para marcas (azuis, vermelhos, verdes, roxos, neutros) */
const PRESET_COLORS = [
    '#2340d1', '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4',
    '#dc2626', '#ef4444', '#f43f5e', '#ea580c', '#f97316',
    '#059669', '#22c55e', '#10b981', '#ca8a04', '#eab308',
    '#7c3aed', '#8b5cf6', '#a855f7', '#475569', '#64748b', '#1e293b',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

export type ColorPickerPopoverProps = {
    color: string;
    onChange: (color: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    t: (key: string) => string;
};

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ color, onChange, onClose, anchorRef, t }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [inputMode, setInputMode] = useState<'hex' | 'rgb'>('hex');
    const [rgbInput, setRgbInput] = useState({ r: 0, g: 0, b: 0 });
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ top: 0, left: 0 });
    const hexColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#475569';

    const rgb = hexToRgb(hexColor);
    useEffect(() => {
        if (rgb) setRgbInput(rgb);
    }, [hexColor]);

    const updatePosition = () => {
        const anchor = anchorRef.current;
        if (!anchor || typeof document === 'undefined') return;
        const rect = anchor.getBoundingClientRect();
        const popoverHeight = 360;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < popoverHeight && rect.top > spaceBelow;
        const top = showAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;
        const left = rect.left + rect.width / 2 - 140;
        setPopoverStyle({
            top: Math.max(8, Math.min(window.innerHeight - popoverHeight - 8, top)),
            left: Math.max(8, Math.min(window.innerWidth - 296, left)),
        });
    };

    useLayoutEffect(() => {
        updatePosition();
        const ro = new ResizeObserver(updatePosition);
        const anchor = anchorRef.current;
        if (anchor) ro.observe(anchor);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [anchorRef]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const anchor = anchorRef.current;
            const popover = popoverRef.current;
            if (popover && !popover.contains(e.target as Node) && anchor && !anchor.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorRef]);

    const hasEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;

    const handleEyedropper = async () => {
        if (!hasEyedropper) return;
        try {
            const dropper = new (window as any).EyeDropper();
            const { sRGBHex } = await dropper.open();
            if (sRGBHex) onChange(sRGBHex);
        } catch {
            // User cancelled or error
        }
    };

    const handleRgbChange = (key: 'r' | 'g' | 'b', val: number) => {
        const next = { ...rgbInput, [key]: Math.max(0, Math.min(255, val)) };
        setRgbInput(next);
        onChange(rgbToHex(next.r, next.g, next.b));
    };

    const handleCopy = () => {
        navigator.clipboard?.writeText(hexColor);
    };

    const popoverEl = (
        <div
            ref={popoverRef}
            className="fixed z-[9999] p-4 w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600"
            style={popoverStyle}
        >
            {/* Presets */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
                {PRESET_COLORS.map((c) => (
                    <TooltipHint key={c} label={c}>
                        <button
                            type="button"
                            onClick={() => onChange(c)}
                            className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            style={{
                                backgroundColor: c,
                                borderColor: hexColor === c ? 'var(--tw-ring-color, #6366f1)' : 'transparent',
                                boxShadow: hexColor === c ? '0 0 0 2px #6366f1' : undefined,
                            }}
                            aria-label={c}
                        />
                    </TooltipHint>
                ))}
            </div>

            {/* Picker */}
            <div className="mb-4 [&_.react-colorful]:h-[140px] [&_.react-colorful]:rounded-lg [&_.react-colorful__saturation]:rounded-t-lg [&_.react-colorful__hue]:rounded-b-lg">
                <HexColorPicker color={hexColor} onChange={onChange} />
            </div>

            {/* Ações: conta-gotas + hex/rgb + copiar */}
            <div className="flex items-center gap-2">
                {hasEyedropper && (
                    <TooltipHint label={t('pick_color_screen')}>
                        <button
                            type="button"
                            onClick={handleEyedropper}
                            className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label={t('pick_color_screen')}
                        >
                            <EyedropperIcon className="w-4 h-4" />
                        </button>
                    </TooltipHint>
                )}
                <div className="flex-1 flex gap-1">
                    <button
                        type="button"
                        onClick={() => setInputMode('hex')}
                        className={`px-2 py-1 text-xs rounded ${inputMode === 'hex' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        HEX
                    </button>
                    <button
                        type="button"
                        onClick={() => setInputMode('rgb')}
                        className={`px-2 py-1 text-xs rounded ${inputMode === 'rgb' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        RGB
                    </button>
                </div>
                {inputMode === 'hex' ? (
                    <HexColorInput
                        color={hexColor}
                        onChange={onChange}
                        prefixed
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm font-mono bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                ) : (
                    <div className="flex-1 flex gap-1">
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={rgbInput.r}
                            onChange={e => handleRgbChange('r', parseInt(e.target.value, 10) || 0)}
                            className="w-12 px-1 py-1 text-xs font-mono bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-center"
                        />
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={rgbInput.g}
                            onChange={e => handleRgbChange('g', parseInt(e.target.value, 10) || 0)}
                            className="w-12 px-1 py-1 text-xs font-mono bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-center"
                        />
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={rgbInput.b}
                            onChange={e => handleRgbChange('b', parseInt(e.target.value, 10) || 0)}
                            className="w-12 px-1 py-1 text-xs font-mono bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-center"
                        />
                    </div>
                )}
                <TooltipHint label={t('copy')}>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label={t('copy')}
                    >
                        <CopyIcon className="w-4 h-4" />
                    </button>
                </TooltipHint>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(popoverEl, document.body);
    }
    return null;
};

/** Ícone de conta-gotas (eyedropper) */
const EyedropperIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m2 22 1-1h3l9-9" />
        <path d="M3 21v-3l9-9" />
        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z" />
    </svg>
);
