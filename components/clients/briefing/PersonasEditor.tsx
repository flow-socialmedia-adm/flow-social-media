import React from 'react';
import type { BriefingPersona } from '../../../lib/briefingV2/types';
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

export const PersonasEditor: React.FC<{
    personas: BriefingPersona[];
    onChange: (personas: BriefingPersona[]) => void;
    t: (k: string, vars?: Record<string, string | number>) => string;
}> = ({ personas, onChange, t }) => {
    const updatePersona = (id: string, patch: Partial<BriefingPersona>) => {
        onChange(personas.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    };

    const addPersona = () => {
        onChange([...personas, { id: newId('persona'), name: '', description: '', mainPain: '' }]);
    };

    const removePersona = (id: string) => {
        onChange(personas.filter((p) => p.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('briefing_personas_hint')}</p>
                <button
                    type="button"
                    onClick={addPersona}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-400 shrink-0"
                >
                    + {t('briefing_persona_add')}
                </button>
            </div>
            {personas.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t('briefing_personas_empty')}</p>
            )}
            {personas.map((persona, index) => (
                <div key={persona.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {t('briefing_persona_label', { n: index + 1 })}
                        </span>
                        <button type="button" onClick={() => removePersona(persona.id)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">
                            {t('delete')}
                        </button>
                    </div>
                    <SimpleInput
                        label={t('briefing_persona_name')}
                        value={persona.name}
                        onChange={(v) => updatePersona(persona.id, { name: v })}
                        placeholder={t('briefing_persona_name_placeholder')}
                    />
                    <SimpleInput
                        label={t('briefing_persona_description')}
                        value={persona.description || ''}
                        onChange={(v) => updatePersona(persona.id, { description: v })}
                        placeholder={t('briefing_persona_description_placeholder')}
                        rows={2}
                    />
                    <SimpleInput
                        label={t('briefing_persona_main_pain')}
                        value={persona.mainPain || ''}
                        onChange={(v) => updatePersona(persona.id, { mainPain: v, pains: v ? [v] : undefined })}
                        placeholder={t('briefing_persona_main_pain_placeholder')}
                    />
                </div>
            ))}
        </div>
    );
};
