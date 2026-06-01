import type { Client } from '../../../types';
import type { AppContextType } from '../../../types';

export type SectionEditorHandlers = {
    onUpdate: (update: Partial<Client>) => void;
    onCancel: () => void;
    onSave: () => void;
    requestConfirmation: (onConfirm: () => void) => void;
    onCopy?: (hex: string) => void;
};

export type BaseSectionEditorProps = {
    editedClient: Client;
    handlers: SectionEditorHandlers;
    isDirty: boolean;
    saveBarMessage: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss: () => void;
    context: AppContextType;
};
