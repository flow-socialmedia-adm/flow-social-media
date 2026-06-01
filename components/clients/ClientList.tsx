import React, { useState, useContext, useCallback, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import type { Client } from '../../types';
import { PlusIcon, UsersIcon, ChevronDownIcon } from '../icons';
import { apiGet } from '../../lib/api';
import { toUploadUrl } from '../../lib/api';
import { resolveClientImageUrl } from '../../lib/clientVisual';
import { CONTENT_PAGE_BODY_INNER } from '../../lib/contentPageHeader';
import { normalizeClient } from './clientUtils';
import TooltipHint from '../TooltipHint';
import { ClientCard } from './ClientCard';

const DeletedHistorySection: React.FC<{ onRestore: (id: string) => Promise<void> }> = ({ onRestore }) => {
    const { t } = useContext(AppContext)!;
    const [expanded, setExpanded] = useState(false);
    const [deletedClients, setDeletedClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    const loadDeleted = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await apiGet<{ items: unknown[] }>('/clients', { page: 1, pageSize: 50, onlyDeleted: true, _ts: Date.now() });
            setDeletedClients((resp.items || []).map((c: unknown) => normalizeClient(c as Record<string, unknown>)));
        } catch {
            setDeletedClients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (expanded && deletedClients.length === 0 && !loading) loadDeleted();
    }, [expanded, loadDeleted, deletedClients.length, loading]);

    const handleRestore = async (id: string) => {
        setRestoringId(id);
        try {
            await onRestore(id);
            await loadDeleted();
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <button type="button" onClick={() => { setExpanded(!expanded); if (!expanded) loadDeleted(); }} className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {t('deleted_history_30_days')}
            </button>
            {expanded && (
                <div className="mt-4">
                    {loading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Carregando...</p>
                    ) : deletedClients.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t('no_deleted_clients')}</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {deletedClients.map((c) => {
                                const imgUrl = resolveClientImageUrl(c);
                                return (
                                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-3 opacity-75">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {imgUrl ? <img src={toUploadUrl(imgUrl)} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${c.color || 'bg-slate-600'}`}>{c.name?.charAt(0) || '?'}</div>}
                                        <span className="font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
                                    </div>
                                    <button type="button" onClick={() => handleRestore(c.id)} disabled={!!restoringId} className="shrink-0 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md disabled:opacity-50">{restoringId === c.id ? '...' : t('restore_client')}</button>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ClientList: React.FC<{
    clients: Client[];
    onSelectClient: (id: string) => void;
    onAddClient: () => void;
    onDeleteClient: (id: string) => void;
    onRestoreClient?: (id: string) => Promise<void>;
    removingIds?: Set<string>;
    /** Quando true, não renderiza o título/botão do topo (faixa roxa na página pai) */
    hidePageHeader?: boolean;
    allowAdd?: boolean;
    showDeletedHistory?: boolean;
}> = ({ clients, onSelectClient, onAddClient, onDeleteClient: _onDeleteClient, onRestoreClient, removingIds, hidePageHeader = false, allowAdd = true, showDeletedHistory = true }) => {
    const { t } = useContext(AppContext)!;

    const inner = (
        <>
            {!hidePageHeader && (
                <header className="mb-6 flex items-center justify-between text-left">
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                        {t('manage_clients')}
                        {allowAdd && (
                            <TooltipHint label={t('add_client')}>
                                <button
                                    type="button"
                                    onClick={onAddClient}
                                    className="rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700"
                                    aria-label={t('add_client')}
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            </TooltipHint>
                        )}
                    </h1>
                </header>
            )}

            <main className="text-left">
                <style>{`
                      @keyframes fadeInUp { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
                      .card-enter { animation: fadeInUp 200ms ease-out; }
                      .card-exit { opacity:0; transform: translateY(6px); transition: opacity 180ms ease, transform 180ms ease; }
                    `}</style>
                {clients.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {clients
                            .filter((c) => c.id && c.id !== 'new')
                            .map((client) => {
                                const isExiting = !!removingIds?.has(client.id);
                                return (
                                    <div key={client.id} className={`relative group ${isExiting ? 'card-exit' : 'card-enter'}`}>
                                        <ClientCard client={client} onSelect={() => onSelectClient(client.id)} />
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-800">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                            <UsersIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">{t('no_clients_found')}</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('empty_state_clients_subtitle')}</p>
                        {allowAdd && (
                            <button
                                onClick={onAddClient}
                                className="mx-auto mt-8 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                            >
                                <PlusIcon className="h-5 w-5" />
                                {t('add_client')}
                            </button>
                        )}
                    </div>
                )}
            </main>
            {showDeletedHistory && onRestoreClient && <DeletedHistorySection onRestore={onRestoreClient} />}
        </>
    );

    if (hidePageHeader) {
        return <div className="w-full min-w-0 text-left">{inner}</div>;
    }

    return (
        <div className={`${CONTENT_PAGE_BODY_INNER} pt-8 text-left sm:pt-10`}>{inner}</div>
    );
};
