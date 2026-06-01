import React, { useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { formatDateToYYYYMMDD, getMonthName } from '../lib/utils';
import { FinancialEntry, Client, FinancialExpense, Language, RecurrenceFrequency, Currency, FinancialStatus } from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import { API_FINANCIAL_CHARTS_CASHFLOW_6M, API_FINANCIAL_KPIS_MONTH } from '../lib/apiPaths';
import { DollarSignIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, PlusIcon, SparklesIcon, XIcon, BriefcaseIcon, ChevronLeftIcon, ChevronRightIcon, EditIcon, TrashIcon, CheckIcon } from './icons';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_HEADER_ACTIONS_ROW,
    CONTENT_PAGE_SCROLL_OUTER,
    HEADER_GRADIENT_ICON_BUTTON_CLASS,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';

// Conversão local (fallback). O backend fornece KPIs e gráficos convertidos.
const conversionRates: Record<Currency, number> = {
    BRL: 1,
    USD: 5.25,
    EUR: 5.65,
};

const CHART_COLORS = ['#4f46e5', '#ec4899', '#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#14b8a6', '#eab308'];

const statusMap: Record<FinancialStatus, { textKey: string; color: string; }> = {
    pending: { textKey: 'status_pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    paid: { textKey: 'status_paid', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    overdue: { textKey: 'status_overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

interface IncomeTableRowProps {
    entry: FinancialEntry;
    onMarkAsPaid: (entryId: string) => void;
    onUnmarkAsPaid: (entryId: string) => void;
    onEdit: (entry: FinancialEntry) => void;
    onDelete: (entryId: string) => void;
    formatCurrency: (value: number, currency?: Currency) => string;
    t: (key: string, replacements?: Record<string, string>) => string;
    language: Language;
    baseCurrency: Currency;
    convertToBase: (value: number, fromCurrency: Currency) => number;
    getEntryCurrency: (entry: FinancialEntry) => Currency;
    getClientById: (id: string) => Client | undefined;
    readOnly?: boolean;
}

const IncomeTableRow: React.FC<IncomeTableRowProps> = ({ entry, onMarkAsPaid, onUnmarkAsPaid, onEdit, onDelete, formatCurrency, t, language, baseCurrency, convertToBase, getEntryCurrency, getClientById, readOnly = false }) => {
    const { textKey, color } = statusMap[entry.status];
    const client = entry.clientId ? getClientById(entry.clientId) : undefined;
    const entryCurrency = getEntryCurrency(entry);
    // Entradas derivadas do contrato: exibição apenas (não editáveis individualmente)
    const isContractDerived = entry.id.startsWith('_contract-');

    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="p-3 text-sm">
                {client ? (
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${client.color}`}></span>
                        {client.name}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <span className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                        <span>{t('no_client_display')}</span>
                    </div>
                )}
            </td>
            <td className="p-3 text-sm flex items-center gap-2">
                {entry.description}
                {isContractDerived && (
                    <TooltipHint label={t('automatic_entry_tooltip')} className="text-indigo-400">
                        <SparklesIcon className="w-4 h-4" />
                    </TooltipHint>
                )}
                {!isContractDerived && entry.recurrence && (
                    <TooltipHint
                        label={t('recurring_income_tooltip', { frequency: t(entry.recurrence === 'monthly' ? 'payment_monthly' : entry.recurrence) })}
                        className="text-gray-400"
                    >
                        <BriefcaseIcon className="w-4 h-4" />
                    </TooltipHint>
                )}
            </td>
            <td className="p-3 text-sm">{t(entry.category)}</td>
            <td className="p-3 text-sm text-right">
                <div className="font-semibold">{formatCurrency(convertToBase(entry.value, entryCurrency), baseCurrency)}</div>
                {entryCurrency !== baseCurrency && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(entry.value, entryCurrency)}
                    </div>
                )}
            </td>
            <td className="p-3 text-sm text-center">{new Date(entry.dueDate + "T00:00").toLocaleDateString(language)}</td>
            <td className="p-3 text-sm text-center">{entry.paymentDate ? new Date(entry.paymentDate + "T00:00").toLocaleDateString(language) : '-'}</td>
            <td className="p-3 text-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{t(textKey)}</span>
            </td>
            <td className="p-3">
                {readOnly ? (
                    <span className="flex justify-center text-sm text-gray-400 dark:text-gray-500">—</span>
                ) : (
                 <div className="flex justify-center items-center gap-2">
                    <div className="w-6 text-center">
                    {entry.status === 'paid' ? (
                        <TooltipHint label={t('unmark_as_paid')}>
                            <button
                                type="button"
                                onClick={() => onUnmarkAsPaid(entry.id)}
                                aria-label={t('unmark_as_paid')}
                                className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    ) : (
                        <TooltipHint label={t('mark_as_paid')}>
                            <button
                                type="button"
                                onClick={() => onMarkAsPaid(entry.id)}
                                aria-label={t('mark_as_paid')}
                                className="text-gray-400 hover:text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                                <CheckIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    )}
                    </div>
                    {!isContractDerived && (
                        <div className="w-6 text-center">
                            <TooltipHint label={t('edit')}>
                                <button
                                    type="button"
                                    onClick={() => onEdit(entry)}
                                    aria-label={t('edit')}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                            </TooltipHint>
                        </div>
                    )}
                    {!isContractDerived && (
                        <div className="w-6 text-center">
                            <TooltipHint label={t('delete')}>
                                <button
                                    type="button"
                                    onClick={() => onDelete(entry.id)}
                                    aria-label={t('delete')}
                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </TooltipHint>
                        </div>
                    )}
                </div>
                )}
            </td>
        </tr>
    );
};

interface ExpenseTableRowProps {
    expense: FinancialExpense;
    onMarkAsPaid: (expenseId: string) => void;
    onUnmarkAsPaid: (expenseId: string) => void;
    onEdit: (expense: FinancialExpense) => void;
    onDelete: (expenseId: string) => void;
    formatCurrency: (value: number, currency?: Currency) => string;
    t: (key: string, replacements?: Record<string, string>) => string;
    language: Language;
    baseCurrency: Currency;
    convertToBase: (value: number, fromCurrency: Currency) => number;
    readOnly?: boolean;
}

const ExpenseTableRow: React.FC<ExpenseTableRowProps> = ({ expense, onMarkAsPaid, onUnmarkAsPaid, onEdit, onDelete, formatCurrency, t, language, baseCurrency, convertToBase, readOnly = false }) => {
    const { textKey, color } = statusMap[expense.status];
    const expenseCurrency = expense.currency || baseCurrency;

    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="p-3 text-sm">{expense.supplier || '-'}</td>
            <td className="p-3 text-sm flex items-center gap-2">
                {expense.description}
                {expense.recurrence && (
                    <TooltipHint
                        label={t('recurring_expense_tooltip', { frequency: t(expense.recurrence === 'monthly' ? 'payment_monthly' : expense.recurrence) })}
                        className="text-gray-400"
                    >
                        <BriefcaseIcon className="w-4 h-4" />
                    </TooltipHint>
                )}
            </td>
            <td className="p-3 text-sm">{t(expense.category)}</td>
            <td className="p-3 text-sm text-right">
                <div className="font-semibold">{formatCurrency(convertToBase(expense.value, expenseCurrency), baseCurrency)}</div>
                {expenseCurrency !== baseCurrency && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(expense.value, expenseCurrency)}
                    </div>
                )}
            </td>
            <td className="p-3 text-sm text-center">{new Date(expense.dueDate + "T00:00").toLocaleDateString(language)}</td>
            <td className="p-3 text-sm text-center">{expense.paymentDate ? new Date(expense.paymentDate + "T00:00").toLocaleDateString(language) : '-'}</td>
            <td className="p-3 text-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{t(textKey)}</span>
            </td>
            <td className="p-3">
                {readOnly ? (
                    <span className="flex justify-center text-sm text-gray-400 dark:text-gray-500">—</span>
                ) : (
                 <div className="flex justify-center items-center gap-2">
                    <div className="w-6 text-center">
                    {expense.status === 'paid' ? (
                        <TooltipHint label={t('unmark_as_paid')}>
                            <button
                                type="button"
                                onClick={() => onUnmarkAsPaid(expense.id)}
                                aria-label={t('unmark_as_paid')}
                                className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    ) : (
                        <TooltipHint label={t('mark_as_paid')}>
                            <button
                                type="button"
                                onClick={() => onMarkAsPaid(expense.id)}
                                aria-label={t('mark_as_paid')}
                                className="text-gray-400 hover:text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                                <CheckIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    )}
                    </div>
                    <div className="w-6 text-center">
                        <TooltipHint label={t('edit')}>
                            <button
                                type="button"
                                onClick={() => onEdit(expense)}
                                aria-label={t('edit')}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            >
                                <EditIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    </div>
                    <div className="w-6 text-center">
                        <TooltipHint label={t('delete')}>
                            <button
                                type="button"
                                onClick={() => onDelete(expense.id)}
                                aria-label={t('delete')}
                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    </div>
                </div>
                )}
            </td>
        </tr>
    );
};


interface IncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: FinancialEntry) => void;
    entry: Partial<FinancialEntry> | null;
    clients: Client[];
    t: (key: string, replacements?: Record<string, string>) => string;
}

const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, entry, clients, t }) => {
    const [currentEntry, setCurrentEntry] = useState<Partial<FinancialEntry> | null>(entry);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setCurrentEntry(entry);
        } else {
            setCurrentEntry(null);
            setErrors({});
        }
    }, [entry, isOpen]);

    if (!isOpen || !currentEntry) return null;

    const incomeCategories = [
        'fee_monthly_services', 'one_time_projects', 'consulting', 'product_sales', 'other_income'
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!currentEntry.description?.trim()) newErrors.description = t('error_field_required');
        if (!currentEntry.category) newErrors.category = t('error_category_required');
        if (!currentEntry.value || currentEntry.value <= 0) newErrors.value = t('error_value_required');
        if (!currentEntry.dueDate) newErrors.dueDate = t('error_field_required');
        return newErrors;
    };
    
    const handleSave = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const finalEntry: FinancialEntry = {
            id: currentEntry.id || `entry-${Date.now()}`,
            description: currentEntry.description!,
            category: currentEntry.category!,
            value: currentEntry.value!,
            dueDate: currentEntry.dueDate!,
            status: currentEntry.status || 'pending',
            clientId: currentEntry.clientId === 'none' ? undefined : currentEntry.clientId,
            currency: currentEntry.currency,
            recurrence: currentEntry.recurrence,
        };
        onSave(finalEntry);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let finalValue: any = value;
        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
        } else if (name === 'clientId') {
            const client = clients.find(c => c.id === value);
            setCurrentEntry(prev => prev ? { ...prev, clientId: value, currency: client?.currency } : null);
            return;
        }

        setCurrentEntry(prev => prev ? { ...prev, [name]: finalValue } : null);
    };

     const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        if (checked) {
            setCurrentEntry(prev => prev ? { ...prev, recurrence: 'monthly' } : null);
        } else {
            const { recurrence, ...rest } = currentEntry || {};
            setCurrentEntry(rest);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentEntry.id ? t('edit_income_entry') : t('new_income_entry')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('client')}</label>
                            <select id="clientId" name="clientId" value={currentEntry.clientId || 'none'} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2">
                                <option value="none">{t('no_client_option')}</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('currency')}</label>
                            <select id="currency" name="currency" value={currentEntry.currency || ''} onChange={handleChange} disabled={!!currentEntry.clientId && currentEntry.clientId !== 'none'} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 disabled:opacity-50">
                                <option value="BRL">{t('BRL')}</option>
                                <option value="USD">{t('USD')}</option>
                                <option value="EUR">{t('EUR')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('category')}</label>
                        <select id="category" name="category" value={currentEntry.category || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2">
                            <option value="">{t('select_income_category')}</option>
                            {incomeCategories.map(cat => <option key={cat} value={cat}>{t(cat)}</option>)}
                        </select>
                        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</label>
                        <input type="text" id="description" name="description" value={currentEntry.description || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                         {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('value')}</label>
                            <input type="number" id="value" name="value" value={currentEntry.value || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('due_date')}</label>
                            <input type="date" id="dueDate" name="dueDate" value={currentEntry.dueDate || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                            {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="is_recurring_income" name="is_recurring_income" checked={!!currentEntry.recurrence} onChange={handleCheckboxChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="is_recurring_income" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('is_recurring_income')}</label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{t('save')}</button>
                </div>
            </div>
        </div>
    )
}

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: FinancialExpense) => void;
    expense: Partial<FinancialExpense> | null;
    t: (key: string, replacements?: Record<string, string>) => string;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSave, expense, t }) => {
    const [currentExpense, setCurrentExpense] = useState<Partial<FinancialExpense> | null>(expense);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setCurrentExpense(expense);
        } else {
            setCurrentExpense(null);
            setErrors({});
        }
    }, [expense, isOpen]);

    if (!isOpen || !currentExpense) return null;

    const expenseCategories = [
        'tools_software', 'freelancers', 'ads', 'taxes', 'salaries', 'rent', 'utilities', 'internet', 'other'
    ];
    
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!currentExpense.description?.trim()) newErrors.description = t('error_field_required');
        if (!currentExpense.category) newErrors.category = t('error_category_required');
        if (!currentExpense.value || currentExpense.value <= 0) newErrors.value = t('error_value_required');
        if (!currentExpense.dueDate) newErrors.dueDate = t('error_field_required');
        return newErrors;
    };
    
    const handleSave = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const finalExpense: FinancialExpense = {
            id: currentExpense.id || `expense-${Date.now()}`,
            description: currentExpense.description!,
            category: currentExpense.category!,
            value: currentExpense.value!,
            dueDate: currentExpense.dueDate!,
            status: currentExpense.status || 'pending',
            supplier: currentExpense.supplier,
            currency: currentExpense.currency || 'BRL',
            recurrence: currentExpense.recurrence,
        };
        onSave(finalExpense);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setCurrentExpense(prev => prev ? { ...prev, [name]: type === 'number' ? (value === '' ? null : parseFloat(value)) : value } : null);
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { checked } = e.target;
        if (checked) {
            setCurrentExpense(prev => prev ? { ...prev, recurrence: 'monthly' } : null);
        } else {
            const { recurrence, ...rest } = currentExpense || {};
            setCurrentExpense(rest);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentExpense.id ? t('edit_expense_entry') : t('new_expense_entry')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="exp-supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('supplier')}</label>
                            <input type="text" id="exp-supplier" name="supplier" value={currentExpense.supplier || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                        </div>
                        <div>
                            <label htmlFor="exp-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('currency')}</label>
                            <select id="exp-currency" name="currency" value={currentExpense.currency || 'BRL'} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2">
                                <option value="BRL">{t('BRL')}</option>
                                <option value="USD">{t('USD')}</option>
                                <option value="EUR">{t('EUR')}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="exp-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('category')}</label>
                        <select id="exp-category" name="category" value={currentExpense.category || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2">
                            <option value="">{t('select_category')}</option>
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{t(cat)}</option>)}
                        </select>
                        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                    </div>
                    <div>
                        <label htmlFor="exp-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</label>
                        <input type="text" id="exp-description" name="description" value={currentExpense.description || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                         {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="exp-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('value')}</label>
                            <input type="number" id="exp-value" name="value" value={currentExpense.value || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                        </div>
                        <div>
                            <label htmlFor="exp-dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('due_date')}</label>
                            <input type="date" id="exp-dueDate" name="dueDate" value={currentExpense.dueDate || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2"/>
                            {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="is_recurring" name="is_recurring" checked={!!currentExpense.recurrence} onChange={handleCheckboxChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('is_recurring')}</label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{t('save')}</button>
                </div>
            </div>
        </div>
    )
}

const CashFlowChart = ({ data, t, formatCurrency }: { data: {month: string, income: number, expenses: number}[], t: (k:string) => string, formatCurrency: (v: number) => string }) => {
    const maxValue = useMemo(() => {
        const max = Math.max(...data.map(d => d.income), ...data.map(d => d.expenses));
        return max === 0 ? 1000 : max * 1.1; // Add 10% buffer
    }, [data]);

    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">{t('no_data_available')}</div>
    }

    return (
        <div className="h-64 flex flex-col">
            <div className="flex-grow">
                 <svg width="100%" height="100%" viewBox={`0 0 ${data.length * 50} 100`} preserveAspectRatio="none" className="text-gray-400 dark:text-gray-500">
                    {data.map((d, i) => {
                        const incomeHeight = d.income > 0 ? (d.income / maxValue) * 100 : 0;
                        const expenseHeight = d.expenses > 0 ? (d.expenses / maxValue) * 100 : 0;
                        
                        return (
                            <g key={i} transform={`translate(${i * 50}, 0)`}>
                                <rect 
                                    y={100 - incomeHeight}
                                    x={10} 
                                    width={15} 
                                    height={incomeHeight}
                                    className="fill-green-400 dark:fill-green-600 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    <title>{t('income')}: {formatCurrency(d.income)}</title>
                                </rect>
                                <rect 
                                    y={100 - expenseHeight}
                                    x={26}
                                    width={15}
                                    height={expenseHeight}
                                    className="fill-red-400 dark:fill-red-600 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    <title>{t('expenses')}: {formatCurrency(d.expenses)}</title>
                                </rect>
                            </g>
                        )
                    })}
                </svg>
            </div>
             <div className="flex justify-around items-center text-xs mt-2">
                {data.map(d => <span key={d.month} className="text-center w-full">{d.month}</span>)}
            </div>
            <div className="flex justify-center items-center gap-4 text-xs mt-2">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400 dark:bg-green-600"></div> {t('income')}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400 dark:bg-red-600"></div> {t('expenses')}</span>
            </div>
        </div>
    )
}

const DonutChart = ({ data, t, formatCurrency }: { data: {label: string, value: number}[], t: (k:string) => string, formatCurrency: (v: number) => string }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    
    if (!data || data.length === 0 || total === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">{t('no_data_available')}</div>
    }
    
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercentage = 0;

    const segments = data.map((item, index) => {
        const percentage = item.value / total;
        const rotation = cumulativePercentage * 360;
        cumulativePercentage += percentage;
        
        // FIX: Explicitly cast to Number to resolve potential type inference issues.
        const dash = Number(circumference) * Number(percentage);
        const gap = Number(circumference) - Number(dash);

        return {
            strokeDasharray: `${dash} ${gap}`,
            rotation,
            color: CHART_COLORS[index % CHART_COLORS.length],
            label: item.label,
            value: item.value
        };
    });

    return (
        <div className="h-64 flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-1/2 h-full -rotate-90">
                {segments.map((seg, i) => (
                     <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={seg.color}
                        strokeWidth="15"
                        fill="none"
                        strokeDasharray={seg.strokeDasharray}
                        transform={`rotate(${seg.rotation} 50 50)`}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <title>{t(seg.label)}: {formatCurrency(seg.value)}</title>
                    </circle>
                ))}
            </svg>
            <div className="flex-1 overflow-y-auto text-xs space-y-2 h-full pr-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></div>
                        <div className="flex-grow truncate">{t(item.label)}</div>
                        <div className="font-semibold">{formatCurrency(item.value)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const useFinancialSummary = ({ currentDate, financialEntries, financialExpenses, convertToBase, getEntryCurrency, getExpenseCurrency, language }: { currentDate: Date; financialEntries: FinancialEntry[]; financialExpenses: FinancialExpense[]; convertToBase: (value: number, fromCurrency: Currency) => number; getEntryCurrency: (entry: FinancialEntry) => Currency; getExpenseCurrency: (expense: FinancialExpense) => Currency; language: Language; }) => {
    return useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const filteredEntriesByDueDate = financialEntries.filter(entry => {
            const entryDate = new Date(entry.dueDate + "T00:00");
            return entryDate.getFullYear() === year && entryDate.getMonth() === month;
        });

        const filteredExpensesByDueDate = financialExpenses.filter(expense => {
            const expenseDate = new Date(expense.dueDate + "T00:00");
            return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
        });
        
        const billedTotal = filteredEntriesByDueDate.reduce((sum, entry) => sum + convertToBase(entry.value, getEntryCurrency(entry)), 0);
        
        const receivedTotal = financialEntries.filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
            .reduce((sum, entry) => sum + convertToBase(entry.value, getEntryCurrency(entry)), 0);

        const expensesTotal = financialExpenses.filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
            .reduce((sum, expense) => sum + convertToBase(expense.value, getExpenseCurrency(expense)), 0);
        
        const cashFlowData = Array.from({ length: 6 }).map((_, i) => {
            const date = new Date(currentDate);
            date.setMonth(currentDate.getMonth() - (5 - i));
            const year = date.getFullYear();
            const month = date.getMonth();

            const income = financialEntries
                .filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
                .reduce((sum, e) => sum + convertToBase(e.value, getEntryCurrency(e)), 0);

            const expenses = financialExpenses
                .filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
                .reduce((sum, e) => sum + convertToBase(e.value, getExpenseCurrency(e)), 0);
            
            return { month: date.toLocaleString(language, { month: 'short' }), income, expenses };
        });

        const incomeByCategoryData = Object.entries(financialEntries
            .filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
            .reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + convertToBase(e.value, getEntryCurrency(e));
                return acc;
            }, {} as Record<string, number>))
            .map(([label, value]) => ({ label, value }))
            .sort((a,b) => b.value - a.value);

        const expensesByCategoryData = Object.entries(financialExpenses
            .filter(e => e.paymentDate && new Date(e.paymentDate + "T00:00").getFullYear() === year && new Date(e.paymentDate + "T00:00").getMonth() === month)
            .reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + convertToBase(e.value, getExpenseCurrency(e));
                return acc;
            }, {} as Record<string, number>))
            .map(([label, value]) => ({ label, value }))
            .sort((a,b) => b.value - a.value);

        return {
            billed: billedTotal,
            received: receivedTotal,
            expenses: expensesTotal,
            balance: receivedTotal - expensesTotal,
            visibleEntries: filteredEntriesByDueDate,
            visibleExpenses: filteredExpensesByDueDate,
            cashFlowData,
            incomeByCategoryData,
            expensesByCategoryData,
        };
    }, [currentDate, financialEntries, financialExpenses, convertToBase, getEntryCurrency, getExpenseCurrency, language]);
};


const FinancePage: React.FC = () => {
    const context = useContext(AppContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<Partial<FinancialEntry> | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Partial<FinancialExpense> | null>(null);
    // Filtros da Gestão de Receitas
    const [filterClientId, setFilterClientId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    if (!context) return null;

    const {
        t,
        language,
        financialEntries,
        setFinancialEntries,
        financialExpenses,
        setFinancialExpenses,
        clients,
        agencyProfile,
        showConfirmation,
        notify,
        canEditModule,
        logActivity,
    } = context;
    const canEditFinancial = canEditModule('financial');
    const baseCurrency = agencyProfile?.baseCurrency ?? 'BRL';
    const [backendKpis, setBackendKpis] = useState<{ faturado: number; recebido: number; despesas: number; saldo: number; baseCurrency: string } | null>(null);
    const [backendCash, setBackendCash] = useState<{ baseCurrency: string; data: { month: string; income: number; expense: number }[] } | null>(null);
    const [backendPieIncome, setBackendPieIncome] = useState<{ baseCurrency: string; data: { category: string; total: number }[] } | null>(null);
    const [backendPieExpense, setBackendPieExpense] = useState<{ baseCurrency: string; data: { category: string; total: number }[] } | null>(null);

    const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

    const getEntryCurrency = useCallback((entry: FinancialEntry): Currency => {
        if (entry.currency) return entry.currency;
        if (entry.clientId) {
            const client = getClientById(entry.clientId);
            if (client && client.currency) return client.currency;
        }
        return baseCurrency;
    }, [getClientById, baseCurrency]);

    const getExpenseCurrency = useCallback((expense: FinancialExpense): Currency => {
        return expense.currency || baseCurrency;
    }, [baseCurrency]);

    const convertToBase = useCallback((value: number, fromCurrency: Currency): number => {
        if (fromCurrency === baseCurrency) return value;
        const rateFrom = conversionRates[fromCurrency] || 1;
        const rateTo = conversionRates[baseCurrency] || 1;
        const baseValue = value * rateFrom; // Convert to BRL first as the common base
        return baseValue / rateTo;
    }, [baseCurrency]);

    const formatCurrency = useCallback((value: number, currency: Currency = baseCurrency) => {
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
        } catch (e) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value);
        }
    }, [language, baseCurrency]);
    
     const checkOverdueStatus = useCallback(() => {
        const today = formatDateToYYYYMMDD(new Date());
        
        const updatedEntries = financialEntries.map(entry => {
            if (entry.status === 'pending' && entry.dueDate < today) {
                return { ...entry, status: 'overdue' };
            }
            return entry;
        });

        const updatedExpenses = financialExpenses.map(expense => {
            // FIX: Replaced 'unpaid' with 'pending' to match the FinancialStatus type.
            if (expense.status === 'pending' && expense.dueDate < today) {
                return { ...expense, status: 'overdue' };
            }
            return expense;
        });
        
        if (JSON.stringify(updatedEntries) !== JSON.stringify(financialEntries)) {
            setFinancialEntries(updatedEntries);
        }
        if (JSON.stringify(updatedExpenses) !== JSON.stringify(financialExpenses)) {
            setFinancialExpenses(updatedExpenses);
        }
    }, [financialEntries, financialExpenses, setFinancialEntries, setFinancialExpenses]);

    useEffect(() => {
        checkOverdueStatus();
    }, [financialEntries, financialExpenses, checkOverdueStatus]);

    // Helpers para carregar mês e KPIs do backend (evita inconsistências)
    const reloadSeq = useRef(0);
    const deletedIncomeIdsRef = useRef<Set<string>>(new Set());
    const deletedExpenseIdsRef = useRef<Set<string>>(new Set());
    const opQueueRef = useRef<Promise<void>>(Promise.resolve());
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    const reloadMonthData = useCallback(async () => {
        const seq = ++reloadSeq.current;
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startStr = formatDateToYYYYMMDD(start);
        const endStr = formatDateToYYYYMMDD(end);
        const [incomes, expenses] = await Promise.all([
            apiGet<{ items: any[]; total: number }>(`/financial`, { type: 'income', startDate: startStr, endDate: endStr, page: 1, pageSize: 1000 }),
            apiGet<{ items: any[]; total: number }>(`/financial`, { type: 'expense', startDate: startStr, endDate: endStr, page: 1, pageSize: 1000 }),
        ]);
        if (seq !== reloadSeq.current) return; // ignora respostas antigas
        const rawIncome = incomes.items.map((e) => ({
            id: e.id,
            description: e.description,
            category: e.category,
            value: Number(e.value),
            dueDate: e.dueDate.slice(0, 10),
            paymentDate: e.paymentDate ? e.paymentDate.slice(0, 10) : undefined,
            status: e.status,
            clientId: e.clientId || undefined,
            currency: e.currency,
            recurrence: e.recurrence !== 'none' ? e.recurrence : undefined,
        })) as FinancialEntry[];
        const rawExpense = expenses.items.map((e) => ({
            id: e.id,
            description: e.description,
            category: e.category,
            value: Number(e.value),
            dueDate: e.dueDate.slice(0, 10),
            paymentDate: e.paymentDate ? e.paymentDate.slice(0, 10) : undefined,
            status: e.status,
            supplier: e.supplier || undefined,
            currency: e.currency,
            recurrence: e.recurrence !== 'none' ? e.recurrence : undefined,
        })) as FinancialExpense[];
        // Auto-limpeza: entradas com categoria 'service' e clientId são do formato antigo
        // gerado por bug anterior. Deletar silenciosamente do banco para consolidar dados.
        const staleAutoGenerated = rawIncome.filter(e => e.category === 'service' && e.clientId);
        if (staleAutoGenerated.length > 0) {
            await Promise.allSettled(staleAutoGenerated.map(e => apiDelete(`/financial/${e.id}`)));
            staleAutoGenerated.forEach(e => deletedIncomeIdsRef.current.add(e.id));
        }
        // Filtra ids marcados como excluídos e entradas auto-geradas antigas
        const staleIds = new Set(staleAutoGenerated.map(e => e.id));
        const mapIncome = rawIncome.filter(e => !deletedIncomeIdsRef.current.has(e.id) && !staleIds.has(e.id));
        const mapExpense = rawExpense.filter(e => !deletedExpenseIdsRef.current.has(e.id));
        // Backend é a fonte de verdade para entradas manuais: substitui listas
        setFinancialEntries(mapIncome);
        setFinancialExpenses(mapExpense);
        // Limpa apenas ids que não vieram do backend (remoção confirmada)
        const backendIncomeIds = new Set(rawIncome.map(i => i.id));
        const backendExpenseIds = new Set(rawExpense.map(i => i.id));
        deletedIncomeIdsRef.current.forEach(id => { if (!backendIncomeIds.has(id)) deletedIncomeIdsRef.current.delete(id); });
        deletedExpenseIdsRef.current.forEach(id => { if (!backendExpenseIds.has(id)) deletedExpenseIdsRef.current.delete(id); });
    }, [currentDate]); // ✅ Removido setFinancialEntries e setFinancialExpenses - são funções estáveis

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await reloadMonthData();
            } catch {
                // fallback
            }
        })();
        return () => { mounted = false; };
    }, [currentDate, reloadMonthData]);

    // KPIs e gráficos (só para o mês corrente; fallback local nos demais)
    const reloadKpis = useCallback(async () => {
        const now = new Date();
        const sameMonth = now.getFullYear() === currentDate.getFullYear() && now.getMonth() === currentDate.getMonth();
        if (!sameMonth) {
            setBackendKpis(null);
            setBackendCash(null);
            setBackendPieIncome(null);
            setBackendPieExpense(null);
            return;
        }
        try {
            const [kpis, cash, pieIncome, pieExpense] = await Promise.all([
                apiGet(API_FINANCIAL_KPIS_MONTH),
                apiGet(API_FINANCIAL_CHARTS_CASHFLOW_6M),
                apiGet(`/financial/charts/pie`, { type: 'income' }),
                apiGet(`/financial/charts/pie`, { type: 'expense' }),
            ]);
            setBackendKpis(kpis as any);
            setBackendCash(cash as any);
            setBackendPieIncome(pieIncome as any);
            setBackendPieExpense(pieExpense as any);
        } catch {
            // fallback
        }
    }, [currentDate]);

    useEffect(() => {
        reloadKpis();
    }, [reloadKpis]);


    // Entradas derivadas dos contratos para o mês selecionado (on-the-fly, não persistidas no banco)
    // Esta é a ÚNICA fonte para receitas de contrato — o banco só armazena entradas manuais.
    const contractDerivedEntries = useMemo((): FinancialEntry[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const entries: FinancialEntry[] = [];

        clients.forEach(client => {
            (client.contract?.services || []).forEach((service: any) => {
                if (service.frequency === 'monthly') {
                    const start = service.startDate ? new Date(service.startDate + 'T00:00') : null;
                    const end = service.endDate ? new Date(service.endDate + 'T00:00') : null;
                    if (start && start <= monthEnd && (!end || end >= monthStart)) {
                        // Dia de vencimento: usa paymentDay do serviço ou dia 10 como fallback
                        const payDay = service.paymentDay || 10;
                        const dueDate = `${monthStr}-${String(payDay).padStart(2, '0')}`;
                        entries.push({
                            id: `_contract-${service.id}-${monthStr}`,
                            clientId: client.id,
                            description: service.name,
                            category: 'fee_monthly_services',
                            value: service.value || 0,
                            currency: client.currency,
                            dueDate,
                            status: 'pending',
                        } as FinancialEntry);
                    }
                } else if (service.frequency === 'once') {
                    const start = service.startDate ? new Date(service.startDate + 'T00:00') : null;
                    if (start && start >= monthStart && start <= monthEnd) {
                        entries.push({
                            id: `_contract-${service.id}-once`,
                            clientId: client.id,
                            description: service.name,
                            category: 'fee_one_off',
                            value: service.value || 0,
                            currency: client.currency,
                            dueDate: service.startDate,
                            status: 'pending',
                        } as FinancialEntry);
                    }
                }
            });
        });

        return entries;
    }, [clients, currentDate]);
    
    // Combina entradas manuais do banco com entradas derivadas dos contratos (on-the-fly).
    // Evita duplicatas: se houver entrada manual com mesmo clientId+descrição+mês, a manual prevalece.
    const allIncomeEntries = useMemo(() => {
        const manualKeys = new Set(
            financialEntries
                .filter(e => e.clientId)
                .map(e => `${e.clientId}-${e.description}-${e.dueDate?.slice(0, 7)}`)
        );
        const nonDuplicate = contractDerivedEntries.filter(
            e => !manualKeys.has(`${e.clientId}-${e.description}-${e.dueDate?.slice(0, 7)}`)
        );
        return [...financialEntries, ...nonDuplicate];
    }, [financialEntries, contractDerivedEntries]);

    const { billed, received, expenses, balance, visibleEntries, visibleExpenses, cashFlowData, incomeByCategoryData, expensesByCategoryData } = useFinancialSummary({
        currentDate,
        financialEntries: allIncomeEntries,
        financialExpenses,
        convertToBase,
        getEntryCurrency,
        getExpenseCurrency,
        language
    });

    // Entradas filtradas por cliente e/ou status para exibição na tabela
    const filteredVisibleEntries = useMemo(() => {
        return visibleEntries.filter(entry => {
            if (filterClientId && entry.clientId !== filterClientId) return false;
            if (filterStatus && entry.status !== filterStatus) return false;
            return true;
        });
    }, [visibleEntries, filterClientId, filterStatus]);

    // Clientes com entradas no mês para popular o filtro
    const clientsWithEntries = useMemo(() => {
        const ids = new Set(visibleEntries.map(e => e.clientId).filter(Boolean));
        return clients.filter(c => ids.has(c.id));
    }, [visibleEntries, clients]);

    const handleDateChange = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + amount);
        setCurrentDate(newDate);
    };
    
    // --- Income Handlers ---
    const handleOpenIncomeModal = (entry: Partial<FinancialEntry> | null) => {
        setSelectedEntry(entry || {
            dueDate: formatDateToYYYYMMDD(new Date()),
            status: 'pending',
            currency: baseCurrency,
        });
        setIsIncomeModalOpen(true);
    };
    
    const handleSaveIncome = (entryToSave: FinancialEntry) => {
        setIsIncomeModalOpen(false);
        // Enfileira a operação para evitar corrida entre POST e GET
        opQueueRef.current = opQueueRef.current.then(async () => {
            try {
                // Enquanto recarrega do backend, exibir valores locais nos cards/gráficos
                setBackendKpis(null);
                setBackendCash(null);
                setBackendPieIncome(null);
                setBackendPieExpense(null);
                if (entryToSave.id.startsWith('entry-')) {
                    await apiPost<any>('/financial', {
                        type: 'income',
                        description: entryToSave.description,
                        category: entryToSave.category,
                        value: String(entryToSave.value),
                        currency: entryToSave.currency || baseCurrency,
                        dueDate: entryToSave.dueDate,
                        recurrence: entryToSave.recurrence || 'none',
                        clientId: entryToSave.clientId || null,
                    });
                    await sleep(200);
                    await reloadMonthData();
                    await reloadKpis();
                    logActivity({
                        v: 2,
                        verb: 'created',
                        item: 'income',
                        name: (entryToSave.description || '').trim() || '—',
                        page: 'financial',
                    });
                    return;
                } else {
                    await apiPut(`/financial/${entryToSave.id}`, {
                        description: entryToSave.description,
                        category: entryToSave.category,
                        value: String(entryToSave.value),
                        currency: entryToSave.currency || baseCurrency,
                        dueDate: entryToSave.dueDate,
                        recurrence: entryToSave.recurrence || 'none',
                        clientId: entryToSave.clientId || null,
                    });
                }
                await sleep(150);
                await reloadMonthData();
                await reloadKpis();
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'income',
                    name: (entryToSave.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao salvar receita:', error);
            }
        });
    };
    
    const handleDeleteIncome = (entryId: string) => {
        // Entradas derivadas do contrato não existem no banco — ignorar exclusão
        if (entryId.startsWith('_contract-')) return;
        showConfirmation({
            title: t('confirm_delete_title'),
            message: t('confirm_delete_entry_message'),
            onConfirm: () => {
                const entry = financialEntries.find((e) => e.id === entryId);
                deletedIncomeIdsRef.current.add(entryId);
                setFinancialEntries(prev => prev.filter(e => e.id !== entryId));
                (async () => {
                    try {
                        setBackendKpis(null);
                        setBackendCash(null);
                        setBackendPieIncome(null);
                        setBackendPieExpense(null);
                        await apiDelete(`/financial/${entryId}`);
                        await sleep(450);
                        await reloadMonthData();
                        await reloadKpis();
                        logActivity({
                            v: 2,
                            verb: 'deleted',
                            item: 'income',
                            name: (entry?.description || '').trim() || '—',
                            page: 'financial',
                        });
                    } catch (error) {
                        notify?.(t('agency_op_save_error'), 'error');
                        console.error('[FinancePage] Falha ao excluir receita:', error);
                    }
                })();
            },
        });
    };
    
    const handleMarkIncomePaid = (entryId: string) => {
        (async () => {
            try {
                setBackendKpis(null); setBackendCash(null); setBackendPieIncome(null); setBackendPieExpense(null);
                let realId = entryId;
                // Entrada derivada do contrato: materializar no banco antes de marcar como paga
                if (entryId.startsWith('_contract-')) {
                    const derivedEntry = allIncomeEntries.find(e => e.id === entryId);
                    if (!derivedEntry) return;
                    const created = await apiPost<any>('/financial', {
                        type: 'income',
                        description: derivedEntry.description,
                        category: derivedEntry.category,
                        value: String(derivedEntry.value),
                        currency: derivedEntry.currency || baseCurrency,
                        dueDate: derivedEntry.dueDate,
                        recurrence: 'none',
                        clientId: derivedEntry.clientId || null,
                    });
                    realId = created.id;
                }
                await apiPost(`/financial/${realId}/mark-paid`);
                await reloadMonthData();
                await reloadKpis();
                const labeled = allIncomeEntries.find((e) => e.id === entryId || e.id === realId);
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'income',
                    name: (labeled?.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao marcar receita como paga:', error);
            }
        })();
    };

    const handleUnmarkIncomePaid = (entryId: string) => {
        const labeled = allIncomeEntries.find((e) => e.id === entryId);
        setFinancialEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'pending', paymentDate: undefined } : e));
        (async () => {
            try {
                setBackendKpis(null);
                setBackendCash(null);
                setBackendPieIncome(null);
                setBackendPieExpense(null);
                await apiPost(`/financial/${entryId}/unpay`);
                await reloadMonthData();
                await reloadKpis();
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'income',
                    name: (labeled?.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao desmarcar receita como paga:', error);
            }
        })();
    };

    // --- Expense Handlers ---
    const handleOpenExpenseModal = (expense: Partial<FinancialExpense> | null) => {
        setSelectedExpense(expense || {
            dueDate: formatDateToYYYYMMDD(new Date()),
            status: 'pending',
            currency: baseCurrency,
        });
        setIsExpenseModalOpen(true);
    };

    const handleSaveExpense = (expenseToSave: FinancialExpense) => {
        setIsExpenseModalOpen(false);
        opQueueRef.current = opQueueRef.current.then(async () => {
            try {
                setBackendKpis(null); setBackendCash(null); setBackendPieIncome(null); setBackendPieExpense(null);
                if (expenseToSave.id.startsWith('expense-')) {
                    await apiPost<any>('/financial', {
                        type: 'expense',
                        description: expenseToSave.description,
                        category: expenseToSave.category,
                        value: String(expenseToSave.value),
                        currency: expenseToSave.currency || baseCurrency,
                        dueDate: expenseToSave.dueDate,
                        recurrence: expenseToSave.recurrence || 'none',
                        supplier: expenseToSave.supplier || null,
                        clientId: null,
                    });
                } else {
                    await apiPut(`/financial/${expenseToSave.id}`, {
                        description: expenseToSave.description,
                        category: expenseToSave.category,
                        value: String(expenseToSave.value),
                        currency: expenseToSave.currency || baseCurrency,
                        dueDate: expenseToSave.dueDate,
                        recurrence: expenseToSave.recurrence || 'none',
                        supplier: expenseToSave.supplier || null,
                    });
                }
                await sleep(200);
                await reloadMonthData();
                await reloadKpis();
                logActivity({
                    v: 2,
                    verb: expenseToSave.id.startsWith('expense-') ? 'created' : 'updated',
                    item: 'expense',
                    name: (expenseToSave.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao salvar despesa:', error);
            }
        });
    };

    const handleDeleteExpense = (expenseId: string) => {
        showConfirmation({
            title: t('confirm_delete_title'),
            message: t('confirm_delete_entry_message'),
            onConfirm: () => {
                const exp = financialExpenses.find((e) => e.id === expenseId);
                deletedExpenseIdsRef.current.add(expenseId);
                setFinancialExpenses(prev => prev.filter(e => e.id !== expenseId));
                opQueueRef.current = opQueueRef.current.then(async () => {
                    try {
                        setBackendKpis(null);
                        setBackendCash(null);
                        setBackendPieIncome(null);
                        setBackendPieExpense(null);
                        await apiDelete(`/financial/${expenseId}`);
                        await sleep(450);
                        await reloadMonthData();
                        await reloadKpis();
                        logActivity({
                            v: 2,
                            verb: 'deleted',
                            item: 'expense',
                            name: (exp?.description || '').trim() || '—',
                            page: 'financial',
                        });
                    } catch (error) {
                        notify?.(t('agency_op_save_error'), 'error');
                        console.error('[FinancePage] Falha ao excluir despesa:', error);
                    }
                });
            },
        });
    };

    const handleMarkExpensePaid = (expenseId: string) => {
        const exp = financialExpenses.find((e) => e.id === expenseId);
        setFinancialExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status: 'paid', paymentDate: formatDateToYYYYMMDD(new Date()) } : e));
        opQueueRef.current = opQueueRef.current.then(async () => {
            try {
                setBackendKpis(null);
                setBackendCash(null);
                setBackendPieIncome(null);
                setBackendPieExpense(null);
                await apiPost(`/financial/${expenseId}/mark-paid`);
                await sleep(100);
                await reloadMonthData();
                await reloadKpis();
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'expense',
                    name: (exp?.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao marcar despesa como paga:', error);
            }
        });
    };
    
    const handleUnmarkExpensePaid = (expenseId: string) => {
        const exp = financialExpenses.find((e) => e.id === expenseId);
        setFinancialExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status: 'pending', paymentDate: undefined } : e));
        opQueueRef.current = opQueueRef.current.then(async () => {
            try {
                setBackendKpis(null);
                setBackendCash(null);
                setBackendPieIncome(null);
                setBackendPieExpense(null);
                await apiPost(`/financial/${expenseId}/unpay`);
                await sleep(100);
                await reloadMonthData();
                await reloadKpis();
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'expense',
                    name: (exp?.description || '').trim() || '—',
                    page: 'financial',
                });
            } catch (error) {
                notify?.(t('agency_op_save_error'), 'error');
                console.error('[FinancePage] Falha ao desmarcar despesa como paga:', error);
            }
        });
    };


    const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
    
    return (
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            <ContentPageHeader
                heading={t('financial_dashboard')}
                subtitle={t('financial_page_subtitle')}
                actions={(
                    <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW}>
                        <TooltipHint label={t('planning_month_nav_prev')}>
                            <button
                                type="button"
                                onClick={() => handleDateChange(-1)}
                                className={HEADER_GRADIENT_ICON_BUTTON_CLASS}
                                aria-label={t('planning_month_nav_prev')}
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                        </TooltipHint>
                        <span className="flex h-10 min-h-[2.5rem] min-w-[11rem] items-center justify-center text-center text-base font-bold tabular-nums leading-none text-white box-border sm:min-w-[12rem] sm:text-lg">
                            {getMonthName(currentDate, language)}
                        </span>
                        <TooltipHint label={t('planning_month_nav_next')}>
                            <button
                                type="button"
                                onClick={() => handleDateChange(1)}
                                className={HEADER_GRADIENT_ICON_BUTTON_CLASS}
                                aria-label={t('planning_month_nav_next')}
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </TooltipHint>
                    </div>
                )}
            />

            <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
            <div className={`${CONTENT_PAGE_BODY_INNER} text-left`}>
            <section className="mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Faturado: sempre usa cálculo local (inclui contratos derivados + manuais) */}
                    <StatCard title={t('billed_this_month')} value={formatCurrency(billed)} icon={<ClockIcon className="w-6 h-6 text-blue-800 dark:text-blue-200" />} color="bg-blue-100 dark:bg-blue-900" />
                    <StatCard title={t('received_this_month')} value={formatCurrency(Math.max(backendKpis?.recebido ?? 0, received))} icon={<CheckCircleIcon className="w-6 h-6 text-green-800 dark:text-green-200" />} color="bg-green-100 dark:bg-green-900" />
                    <StatCard title={t('expenses_this_month')} value={formatCurrency(Math.max(backendKpis?.despesas ?? 0, expenses))} icon={<AlertTriangleIcon className="w-6 h-6 text-red-800 dark:text-red-200" />} color="bg-red-100 dark:bg-red-900" />
                    <StatCard title={t('balance_this_month')} value={formatCurrency(balance)} icon={<DollarSignIcon className="w-6 h-6 text-indigo-800 dark:text-indigo-200" />} color="bg-indigo-100 dark:bg-indigo-900" />
                </div>
                 <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">{t('converted_values_notice', { currency: baseCurrency })}</p>
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold mb-4">{t('cash_flow')}</h3>
                     <CashFlowChart data={backendCash ? backendCash.data.map(d => ({ month: d.month, income: d.income, expenses: d.expense })) : cashFlowData} t={t} formatCurrency={(v) => formatCurrency(v, baseCurrency)} />
                </div>
                 <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold mb-4">{t('income_by_category')}</h3>
                     <DonutChart data={backendPieIncome ? backendPieIncome.data.map(d => ({ label: d.category, value: d.total })) : incomeByCategoryData} t={t} formatCurrency={(v) => formatCurrency(v, baseCurrency)} />
                </div>
                 <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold mb-4">{t('expenses_by_category')}</h3>
                    <DonutChart data={backendPieExpense ? backendPieExpense.data.map(d => ({ label: d.category, value: d.total })) : expensesByCategoryData} t={t} formatCurrency={(v) => formatCurrency(v, baseCurrency)} />
                </div>
            </section>

            <section className="space-y-8">
                {/* Income Management Table */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h2 className="text-xl font-semibold">{t('income_management')}</h2>
                        {canEditFinancial && (
                        <button onClick={() => handleOpenIncomeModal(null)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            {t('add_income')}
                        </button>
                        )}
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('finance_filter_client')}</label>
                            <select
                                value={filterClientId}
                                onChange={e => setFilterClientId(e.target.value)}
                                className="text-sm border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[140px]"
                            >
                                <option value="">{t('finance_filter_all')}</option>
                                {clientsWithEntries.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('finance_filter_status')}</label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="text-sm border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[120px]"
                            >
                                <option value="">{t('finance_filter_all')}</option>
                                <option value="pending">{t('status_pending')}</option>
                                <option value="paid">{t('status_paid')}</option>
                                <option value="overdue">{t('status_overdue')}</option>
                            </select>
                        </div>
                        {(filterClientId || filterStatus) && (
                            <button
                                onClick={() => { setFilterClientId(''); setFilterStatus(''); }}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline self-center"
                            >
                                {t('finance_filter_clear')}
                            </button>
                        )}
                        {(filterClientId || filterStatus) && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                                {t('finance_filter_results', { count: String(filteredVisibleEntries.length) })}
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    {['client', 'description', 'category', 'value', 'due_date', 'payment_date', 'status', 'actions'].map(col => (
                                        <th key={col} className={`p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${['value'].includes(col) ? 'text-right' : (['due_date', 'payment_date', 'status'].includes(col) ? 'text-center' : 'text-left')}`}>{t(col)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisibleEntries.length > 0 ? (
                                    filteredVisibleEntries.map(entry => (
                                        <IncomeTableRow 
                                            key={entry.id} 
                                            entry={entry} 
                                            onMarkAsPaid={handleMarkIncomePaid}
                                            onUnmarkAsPaid={handleUnmarkIncomePaid}
                                            onEdit={handleOpenIncomeModal} 
                                            onDelete={handleDeleteIncome}
                                            formatCurrency={formatCurrency} 
                                            t={t} 
                                            language={language}
                                            baseCurrency={baseCurrency}
                                            convertToBase={convertToBase}
                                            getEntryCurrency={getEntryCurrency}
                                            getClientById={getClientById}
                                            readOnly={!canEditFinancial}
                                        />
                                    ))
                                ) : (
                                    <tr><td colSpan={8} className="text-center p-8 text-gray-500 dark:text-gray-400">{t('no_income_entries')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Expense Management Table */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">{t('expense_management')}</h2>
                        {canEditFinancial && (
                        <button onClick={() => handleOpenExpenseModal(null)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            {t('add_expense')}
                        </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                     {['supplier', 'description', 'category', 'value', 'due_date', 'payment_date', 'status', 'actions'].map(col => (
                                        <th key={col} className={`p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${['value'].includes(col) ? 'text-right' : (['due_date', 'payment_date', 'status'].includes(col) ? 'text-center' : 'text-left')}`}>{t(col)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleExpenses.length > 0 ? (
                                    visibleExpenses.map(expense => (
                                        <ExpenseTableRow
                                            key={expense.id}
                                            expense={expense}
                                            onMarkAsPaid={handleMarkExpensePaid}
                                            onUnmarkAsPaid={handleUnmarkExpensePaid}
                                            onEdit={handleOpenExpenseModal}
                                            onDelete={handleDeleteExpense}
                                            readOnly={!canEditFinancial}
                                            formatCurrency={formatCurrency}
                                            t={t}
                                            language={language}
                                            baseCurrency={baseCurrency}
                                            convertToBase={convertToBase}
                                        />
                                    ))
                                ) : (
                                    <tr><td colSpan={8} className="text-center p-8 text-gray-500 dark:text-gray-400">{t('no_expense_entries')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            </div>
            </div>

            {isIncomeModalOpen && <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSave={handleSaveIncome} entry={selectedEntry} clients={clients} t={t} />}
            {isExpenseModalOpen && <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSaveExpense} expense={selectedExpense} t={t} />}

        </div>
    );
};

export default FinancePage;