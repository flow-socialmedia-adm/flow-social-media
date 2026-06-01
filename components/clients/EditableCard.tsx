import React from 'react';
import { UnsavedChangesBar } from './UnsavedChangesBar';

export const EditableCard: React.FC<{
    heading: string;
    icon: React.ReactNode;
    children: (isEditing: boolean) => React.ReactNode;
    onSave: () => void;
    onCancel: () => void;
    className?: string;
    isDirty: boolean;
    requestConfirmation: (onConfirm: () => void) => void;
    onRequestEdit?: () => boolean;
    onEditEnd?: () => void;
    editDisabled?: boolean;
    forceCloseEditToken?: number;
}> = ({ heading, icon, children, onSave, onCancel, className, isDirty, requestConfirmation }) => {
    const handleSave = () => {
        onSave();
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col ${className || ''}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {icon}
                    <h3 className="font-semibold text-lg">{heading}</h3>
                </div>
                {isDirty && (
                    <div className="shrink-0">
                        <UnsavedChangesBar onCancel={onCancel} onSave={handleSave} requestConfirmation={requestConfirmation} />
                    </div>
                )}
            </div>
            <div className="p-6 sm:p-8 flex-grow">{children(true)}</div>
        </div>
    );
};
