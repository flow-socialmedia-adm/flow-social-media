import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { CheckCircleIcon, AlertTriangleIcon, SaveIcon } from '../icons';

/** Tempo do aviso de sucesso/erro (alinhar com expectativa da página Clientes). */
const FEEDBACK_AUTO_DISMISS_MS = 2200;

export const UnsavedChangesBar: React.FC<{
    onCancel: () => void;
    onSave: () => void | Promise<void>;
    requestConfirmation: (onConfirm: () => void) => void;
    feedback?: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss?: () => void;
}> = ({ onCancel, onSave, requestConfirmation, feedback, onFeedbackDismiss }) => {
    const { t } = useContext(AppContext)!;
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!feedback || !onFeedbackDismiss) return;
        const id = window.setTimeout(onFeedbackDismiss, FEEDBACK_AUTO_DISMISS_MS);
        return () => window.clearTimeout(id);
    }, [feedback, onFeedbackDismiss]);
    const handleCancel = () => {
        requestConfirmation(() => {
            onCancel();
        });
    };
    const isFeedback = !!feedback;
    return (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 flex justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-[1200px] flex items-center justify-end gap-4 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                {isFeedback ? (
                    <span className={`text-sm font-medium flex items-center gap-2 ${feedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {feedback.type === 'success' && <CheckCircleIcon className="w-4 h-4" />}
                        {feedback.type === 'error' && <AlertTriangleIcon className="w-4 h-4" />}
                        {feedback.text}
                    </span>
                ) : (
                    <>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('unsaved_changes')}</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleCancel} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">{t('cancel')}</button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                    if (saving) return;
                                    setSaving(true);
                                    void Promise.resolve(onSave()).finally(() => setSaving(false));
                                }}
                                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <SaveIcon className="w-4 h-4" /> {t('save')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
