import React from 'react';

const itemClass =
	'w-full px-2 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded';

const deleteClass =
	'w-full px-2 py-1 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded';

type CardOverflowSecondaryMenuProps = {
    duplicateLabel?: string;
    onDuplicate?: () => void;
    editLabel?: string;
    onEdit?: () => void;
    children?: React.ReactNode;
    deleteLabel: string;
    onDelete?: () => void;
    /** Variante com padding maior (menu legado de tarefas). */
    variant?: 'compact' | 'spacious';
};

/**
 * Ações secundárias do menu ⋮ — ordem fixa: Duplicar → Editar → (navegação) → Excluir.
 */
export const CardOverflowSecondaryMenu: React.FC<CardOverflowSecondaryMenuProps> = ({
    duplicateLabel,
    onDuplicate,
    editLabel,
    onEdit,
    children,
    deleteLabel,
    onDelete,
    variant = 'compact',
}) => {
    const hasBlock = onDuplicate || onEdit || children || onDelete;
    if (!hasBlock) return null;

    const pad = variant === 'spacious' ? 'px-3 py-1.5' : 'px-2 py-1';
    const editItemClass = variant === 'spacious' ? 'w-full text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ' + pad : itemClass;
    const dupClass = variant === 'spacious' ? editItemClass : itemClass;

    return (
        <>
            <div className="shrink-0 my-1 border-t border-gray-200 dark:border-gray-600" />
            <div className={`shrink-0 ${variant === 'spacious' ? 'px-1' : 'px-2 py-1'}`}>
                {onDuplicate && duplicateLabel ? (
                    <button type="button" onClick={onDuplicate} className={dupClass}>
                        {duplicateLabel}
                    </button>
                ) : null}
                {onEdit && editLabel ? (
                    <button type="button" onClick={onEdit} className={editItemClass}>
                        {editLabel}
                    </button>
                ) : null}
                {children}
                {onDelete ? (
                    <button type="button" onClick={onDelete} className={variant === 'spacious' ? deleteClass.replace('px-2', 'px-3').replace('py-1', 'py-1.5') : deleteClass}>
                        {deleteLabel}
                    </button>
                ) : null}
            </div>
        </>
    );
};
