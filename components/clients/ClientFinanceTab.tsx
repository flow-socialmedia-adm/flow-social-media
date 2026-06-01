import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import type { Client } from '../../types';
import { DollarSignIcon } from '../icons';
import TooltipHint from '../TooltipHint';

export const ClientFinanceTab: React.FC<{ client: Client }> = ({ client }) => {
    const context = useContext(AppContext)!;
    const { t, financialEntries, language } = context;

    const clientEntries = useMemo(() => {
        return financialEntries
            .filter((entry) => entry.clientId === client.id)
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [financialEntries, client.id]);

    const formatCurrency = (value: number) => {
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: client.currency || 'USD' }).format(value);
        } catch {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value);
        }
    };

    const statusMap: Record<string, { textKey: string; color: string }> = {
        pending: { textKey: 'status_pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
        paid: { textKey: 'status_paid', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
        overdue: { textKey: 'status_overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <DollarSignIcon className="text-indigo-500" />
                <h3 className="font-semibold text-lg">{t('financial_history')}</h3>
            </div>
            <div className="p-2 sm:p-4">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('description')}</th>
                                <th className="p-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('value')}</th>
                                <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('due_date')}</th>
                                <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('payment_date')}</th>
                                <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientEntries.length > 0 ? (
                                clientEntries.map((entry) => {
                                    const { textKey, color } = statusMap[entry.status] || { textKey: entry.status, color: 'bg-gray-100 text-gray-800' };
                                    return (
                                        <tr key={entry.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                            <td className="p-3 text-sm max-w-[220px] sm:max-w-xs align-top">
                                                <TooltipHint label={entry.description?.trim() || '-'} className="block w-full min-w-0">
                                                    <span className="block truncate">{entry.description?.trim() || '-'}</span>
                                                </TooltipHint>
                                            </td>
                                            <td className="p-3 text-sm font-semibold text-right">{formatCurrency(entry.value)}</td>
                                            <td className="p-3 text-sm text-center">{new Date(entry.dueDate + 'T00:00:00').toLocaleDateString(language)}</td>
                                            <td className="p-3 text-sm text-center">{entry.paymentDate ? new Date(entry.paymentDate + 'T00:00:00').toLocaleDateString(language) : '-'}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{t(textKey)}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-gray-500 dark:text-gray-400">
                                        {t('no_income_entries')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
