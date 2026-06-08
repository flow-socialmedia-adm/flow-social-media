import React from 'react';
import type { MarketReference, MarketReferenceType } from '../../../lib/briefingV2/types';
import { newId } from '../../../lib/briefingV2/helpers';

const SimpleInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    label?: string;
    rows?: number;
}> = ({ value, onChange, placeholder, label, rows = 1 }) => (
    <div>
        {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>}
        {rows > 1 ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
        ) : (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
        )}
    </div>
);

export const MarketReferencesEditor: React.FC<{
    references: MarketReference[];
    onChange: (refs: MarketReference[]) => void;
    t: (k: string, vars?: Record<string, string | number>) => string;
}> = ({ references, onChange, t }) => {
    const updateRef = (id: string, patch: Partial<MarketReference>) => {
        onChange(references.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };

    const addRef = (type: MarketReferenceType) => {
        onChange([...references, { id: newId('ref'), type, name: '' }]);
    };

    const removeRef = (id: string) => {
        onChange(references.filter((r) => r.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => addRef('competitor')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                >
                    + {t('briefing_ref_add_competitor')}
                </button>
                <button
                    type="button"
                    onClick={() => addRef('inspiration')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                >
                    + {t('briefing_ref_add_inspiration')}
                </button>
            </div>
            {references.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('briefing_ref_empty')}</p>
            )}
            {references.map((ref) => (
                <div key={ref.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {ref.type === 'competitor' ? t('briefing_ref_type_competitor') : t('briefing_ref_type_inspiration')}
                        </span>
                        <button type="button" onClick={() => removeRef(ref.id)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">
                            {t('delete')}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SimpleInput
                            label={t('briefing_ref_name')}
                            value={ref.name}
                            onChange={(v) => updateRef(ref.id, { name: v })}
                            placeholder={t('briefing_ref_name_placeholder')}
                        />
                        <SimpleInput
                            label={t('briefing_ref_link')}
                            value={ref.link || ''}
                            onChange={(v) => updateRef(ref.id, { link: v })}
                            placeholder="https://"
                        />
                    </div>
                    <SimpleInput
                        label={t('briefing_ref_note')}
                        value={ref.note || ''}
                        onChange={(v) => updateRef(ref.id, { note: v })}
                        placeholder={t('briefing_ref_note_placeholder')}
                        rows={2}
                    />
                </div>
            ))}
        </div>
    );
};
