import React from 'react';
import type { SocialPlatform } from '../../types';
import type { AccessCredential } from '../../types';
import { ALL_SOCIAL_PLATFORMS } from './socialHelpers';

export type AccessCredentialFormState = Partial<AccessCredential>;

export const AccessCredentialModal: React.FC<{
    formState: AccessCredentialFormState;
    onFormChange: (state: AccessCredentialFormState | null) => void;
    onClose: () => void;
    onSave: () => void;
    isEditing: boolean;
    t: (key: string) => string;
    readOnly?: boolean;
}> = ({ formState, onFormChange, onClose, onSave, isEditing, t, readOnly = false }) => {
    const ro = readOnly;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{isEditing ? t('edit') : t('add_credential')}</h3>
                {ro && (
                    <div className="rounded-lg border border-slate-200/90 dark:border-slate-600/50 bg-slate-50/90 dark:bg-slate-800/40 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t('read_only_badge')}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400 leading-snug">{t('read_only_hint')}</p>
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('select_platform')}</label>
                        <select
                            value={formState.platform || 'instagram'}
                            onChange={(e) => onFormChange(formState ? { ...formState, platform: e.target.value as SocialPlatform } : null)}
                            disabled={ro}
                            className="w-full bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                        >
                            {ALL_SOCIAL_PLATFORMS.map((p) => (
                                <option key={p} value={p}>{t(p)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('display_name')}</label>
                        <input
                            type="text"
                            value={formState.displayName || ''}
                            onChange={(e) => onFormChange(formState ? { ...formState, displayName: e.target.value } : null)}
                            placeholder={t('display_name')}
                            disabled={ro}
                            className="w-full bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('username')}</label>
                        <div className="flex items-center border border-gray-300 dark:border-gray-500 rounded-md bg-gray-50 dark:bg-gray-600">
                            <span className="pl-2 text-gray-500 text-sm">@</span>
                            <input
                                type="text"
                                value={formState.username || ''}
                                onChange={(e) => onFormChange(formState ? { ...formState, username: e.target.value.replace('@', '') } : null)}
                                placeholder={t('username')}
                                disabled={ro}
                                className="flex-1 p-2 bg-transparent text-sm border-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-80"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
                        <input
                            type="password"
                            value={formState.password || ''}
                            onChange={(e) => onFormChange(formState ? { ...formState, password: e.target.value } : null)}
                            placeholder={t('password')}
                            disabled={ro}
                            className="w-full bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('notes_optional')}</label>
                        <textarea
                            value={formState.notes || ''}
                            onChange={(e) => onFormChange(formState ? { ...formState, notes: e.target.value } : null)}
                            rows={2}
                            disabled={ro}
                            className="w-full bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500">
                        {ro ? t('close') : t('cancel')}
                    </button>
                    {!ro && (
                        <button type="button" onClick={onSave} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            {t('save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
