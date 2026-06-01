import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Service, Currency } from '../../types';
import type { AppContextType } from '../../types';
import { PlusIcon, EditIcon, TrashIcon, FileTextIcon, UploadCloudIcon, BriefcaseIcon } from '../icons';
import TooltipHint from '../TooltipHint';
import { GhostInput } from '../GhostInput';
import { InlineCurrencyField } from '../InlineCurrencyField';

const BLOCK_STYLE = 'bg-white/95 dark:bg-gray-800/95 rounded-xl p-5';
const ICON_STYLE = 'w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0';

const InputField: React.FC<{
    name: keyof Service;
    type: string;
    placeholder?: string;
    className?: string;
    children?: React.ReactNode;
    value: unknown;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: string | undefined;
}> = ({ type, placeholder, className, children, value, onChange, error }) => (
    <div className="w-full">
        <div className={`flex items-center rounded transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30 border-b ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'} focus-within:border-gray-400 dark:focus-within:border-gray-400`}>
            {children}
            <input type={type} placeholder={placeholder} value={(value ?? '') as string} onChange={onChange} className="w-full text-sm bg-transparent py-2 px-0 border-0 focus:outline-none focus:ring-0" />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);

const selectClass = 'w-full text-sm bg-transparent py-2 px-0 border-b border-gray-300 dark:border-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-400 rounded hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors';

const ServiceForm: React.FC<{
    service: Partial<Service>;
    onDataChange: (field: keyof Service, value: unknown) => void;
    errors: Record<string, string>;
    currencySymbol: string;
    t: AppContextType['t'];
    notify?: AppContextType['notify'];
}> = ({ service, onDataChange, errors, currencySymbol, t, notify }) => {
    const contractInputRef = useRef<HTMLInputElement>(null);

    const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                onDataChange('contractUrl', event.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else if (file) {
            notify?.(t('contract_pdf_only'));
        }
    };

    return (
        <div className={`${BLOCK_STYLE} space-y-4`}>
            <div>
                <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('service_name')}</span></div>
                <GhostInput value={service.name ?? ''} onChange={(v) => onDataChange('name', v)} placeholder={t('service_name')} className="w-full" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('service_value')}</span></div>
                    <InputField name="value" type="number" value={service.value} onChange={(e) => onDataChange('value', e.target.value === '' ? null : parseFloat(e.target.value))} error={errors.value}>
                        <span className="pl-0 pr-2 text-gray-500 dark:text-gray-400 text-sm shrink-0">{currencySymbol}</span>
                    </InputField>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('payment_frequency')}</span></div>
                    <select value={service.frequency} onChange={(e) => onDataChange('frequency', e.target.value)} className={selectClass}>
                        <option value="monthly">{t('payment_monthly')}</option>
                        <option value="yearly">{t('yearly')}</option>
                        <option value="once">{t('once')}</option>
                    </select>
                </div>
                {(service.frequency === 'monthly' || service.frequency === 'yearly') && (
                    <div>
                        <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('payment_day')}</span></div>
                        <input type="number" min={1} max={31} value={service.paymentDay ?? ''} onChange={(e) => onDataChange('paymentDay', e.target.value ? parseInt(e.target.value, 10) : undefined)} placeholder="1-31" className={selectClass} />
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('status')}</span></div>
                    <select value={service.status ?? 'active'} onChange={(e) => onDataChange('status', e.target.value)} className={selectClass}>
                        <option value="active">{t('service_status_active')}</option>
                        <option value="paused">{t('service_status_paused')}</option>
                        <option value="canceled">{t('service_status_canceled')}</option>
                        <option value="completed">{t('service_status_completed')}</option>
                    </select>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('start_date')}</span></div>
                    <InputField name="startDate" type="date" value={service.startDate} onChange={(e) => onDataChange('startDate', e.target.value)} error={errors.startDate} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500 dark:text-gray-400">{t('end_date')}</span></div>
                    <InputField name="endDate" type="date" value={service.endDate} onChange={(e) => onDataChange('endDate', e.target.value)} error={errors.endDate} />
                </div>
            </div>
            <div className="pt-2">
                <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-500 dark:text-gray-400">{t('upload_contract')}</span></div>
                {service.contractUrl ? (
                    <div className="flex items-center gap-2">
                        <a href={service.contractUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                            <FileTextIcon className="w-4 h-4" />
                            {t('view_contract')}
                        </a>
                        <button type="button" onClick={() => onDataChange('contractUrl', undefined)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                            <TrashIcon className="w-4 h-4" />
                            {t('remove_contract')}
                        </button>
                    </div>
                ) : (
                    <>
                        <input type="file" ref={contractInputRef} onChange={handleContractFileChange} className="hidden" accept="application/pdf" />
                        <button type="button" onClick={() => contractInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 rounded-md shadow-sm border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">
                            <UploadCloudIcon className="w-5 h-5" />
                            {t('upload_from_computer')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export const ContractServicesManager: React.FC<{
    services: Service[];
    context: AppContextType;
    clientCurrency: Currency | undefined;
    onServicesUpdate: (services: Service[]) => void;
    requestConfirmation: (onConfirm: () => void) => void;
    onDirtyChange: (isDirty: boolean) => void;
    onRequestEdit?: () => boolean;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    onRegisterActions?: (actions: { save: () => Service[] | null; cancel: () => void } | null) => void;
    onCurrencyChange?: (currency: Currency) => void;
    /** Sem criar/editar/remover serviços nem moeda do contrato */
    readOnly?: boolean;
}> = ({ services, context, clientCurrency, onCurrencyChange, onServicesUpdate, requestConfirmation, onDirtyChange, onRequestEdit, onEditStart, onEditEnd, onRegisterActions, readOnly = false }) => {
    const { t, language, showConfirmation, notify } = context;
    const [isAdding, setIsAdding] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [formState, setFormState] = useState<Partial<Service>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showAddMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddMenu]);

    const validateService = useCallback((service: Partial<Service>) => {
        const tempErrors: Record<string, string> = {};
        if (!service.name || String(service.name).trim() === '') tempErrors.name = t('error_name_required');
        if (service.value === null || typeof service.value === 'undefined') tempErrors.value = t('error_value_required');
        else if (isNaN(Number(service.value)) || Number(service.value) < 0) tempErrors.value = t('error_value_invalid');
        if (!service.startDate) tempErrors.startDate = t('error_start_date_required');
        if (service.frequency !== 'once' && !service.endDate) tempErrors.endDate = t('error_end_date_required');
        if (service.startDate && service.endDate && new Date(service.endDate) < new Date(service.startDate)) tempErrors.endDate = t('error_end_date_before_start');
        return tempErrors;
    }, [t]);

    const performCancel = useCallback(() => {
        setIsAdding(false);
        setEditingServiceId(null);
        setFormState({});
        setErrors({});
        setIsSubmitted(false);
    }, []);

    const prevServicesRef = useRef<Service[]>(services);
    const serviceFormRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const prevIds = prevServicesRef.current.map((s) => s.id).sort().join(',');
        const currIds = services.map((s) => s.id).sort().join(',');
        const contentChanged = prevIds !== currIds || JSON.stringify(prevServicesRef.current) !== JSON.stringify(services);
        if (contentChanged && !isAdding && !editingServiceId) performCancel();
        prevServicesRef.current = services;
    }, [services, performCancel, isAdding, editingServiceId]);

    useEffect(() => {
        const isFormDirty = (isAdding && (formState.name !== '' && formState.name !== undefined)) || (!!editingServiceId && JSON.stringify(formState) !== JSON.stringify(services.find((s) => s.id === editingServiceId)));
        onDirtyChange(!!isFormDirty);
    }, [formState, isAdding, editingServiceId, services, onDirtyChange]);

    useEffect(() => {
        if (isSubmitted || isAdding || editingServiceId) setErrors(validateService(formState));
    }, [formState, isSubmitted, isAdding, editingServiceId, validateService]);

    const handleDataChange = (field: keyof Service, value: unknown) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddNew = () => {
        if (onRequestEdit && !onRequestEdit()) return;
        setIsAdding(true);
        setEditingServiceId(null);
        setFormState({ id: `s-${Date.now()}`, name: '', value: null, frequency: 'monthly', startDate: new Date().toISOString().split('T')[0] });
        setErrors({});
        setIsSubmitted(false);
        onEditStart?.();
    };

    const handleEdit = (service: Service) => {
        if (onRequestEdit && !onRequestEdit()) return;
        setEditingServiceId(service.id);
        setIsAdding(false);
        setFormState(service);
        setErrors({});
        setIsSubmitted(false);
        onEditStart?.();
    };

    const handleCancel = () => {
        const originalService = editingServiceId ? services.find((s) => s.id === editingServiceId) : {};
        const isDirty = (isAdding && (formState.name !== '' && formState.name !== undefined)) || (!!editingServiceId && JSON.stringify(formState) !== JSON.stringify(originalService));
        if (isDirty) requestConfirmation(() => { performCancel(); onEditEnd?.(); });
        else { performCancel(); onEditEnd?.(); }
    };

    const handleSave = useCallback((): Service[] | null => {
        if (!isAdding && !editingServiceId) return services;
        setIsSubmitted(true);
        const validationErrors = validateService(formState);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return null;
        }
        const serviceToSave = formState as Service;
        const updatedServices = isAdding ? [...services, serviceToSave] : services.map((s) => (s.id === editingServiceId ? serviceToSave : s));
        onServicesUpdate(updatedServices);
        performCancel();
        onEditEnd?.();
        return updatedServices;
    }, [isAdding, editingServiceId, formState, validateService, services, onServicesUpdate, performCancel, onEditEnd]);

    useEffect(() => {
        if (onRegisterActions) {
            if (isAdding || editingServiceId) onRegisterActions({ save: handleSave, cancel: () => { performCancel(); onEditEnd?.(); } });
            else onRegisterActions(null);
        }
    }, [isAdding, editingServiceId, handleSave, performCancel, onEditEnd, onRegisterActions]);

    useEffect(() => {
        if (isAdding && serviceFormRef.current) {
            requestAnimationFrame(() => {
                serviceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }, [isAdding]);

    const handleRemove = (serviceId: string) => {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
            showConfirmation({
                title: t('delete'),
                message: t('confirm_delete_service_message', { name: service.name }),
                onConfirm: () => onServicesUpdate(services.filter((s) => s.id !== serviceId)),
            });
        }
    };

    const { recurringServices, oneOffServices, historyServices } = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const recurring: Service[] = [];
        const oneOff: Service[] = [];
        const history: Service[] = [];
        for (const s of services) {
            const endDate = s.endDate ? new Date(s.endDate + 'T00:00') : null;
            const isEnded = endDate && endDate < now;
            if (isEnded) history.push(s);
            else if (s.frequency === 'once') oneOff.push(s);
            else recurring.push(s);
        }
        return { recurringServices: recurring, oneOffServices: oneOff, historyServices: history };
    }, [services]);

    const formatCurrency = (value: number) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: clientCurrency || 'USD' }).format(value);
    const currencySymbol = (0).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: clientCurrency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();

    const ServiceViewRow: React.FC<{ service: Service; readOnly?: boolean }> = ({ service, readOnly }) => {
        const startStr = service.startDate ? new Date(service.startDate + 'T00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const endStr = service.endDate ? new Date(service.endDate + 'T00:00').toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : t('active');
        const statusKey = service.status ? `service_status_${service.status}` : null;
        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <span className="font-medium">{startStr}</span>
                        <span className="mx-1.5 text-gray-400">→</span>
                        <span className="font-medium">{endStr}</span>
                        {service.paymentDay && service.frequency !== 'once' && <span className="text-gray-500 dark:text-gray-400 ml-1">• {t('payment_day')}: {service.paymentDay}</span>}
                    </p>
                    {statusKey && <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600">{t(statusKey)}</span>}
                </div>
                <div className="sm:text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(service.value || 0)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t(service.frequency === 'monthly' ? 'payment_monthly' : service.frequency === 'yearly' ? 'yearly' : 'once')}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {service.contractUrl && (
                        <TooltipHint label={t('view_contract')}>
                            <a
                                href={service.contractUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('view_contract')}
                                className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FileTextIcon className="w-4 h-4" />
                            </a>
                        </TooltipHint>
                    )}
                    {!readOnly && (
                        <>
                            <TooltipHint label={t('edit')}>
                                <button
                                    type="button"
                                    onClick={() => handleEdit(service)}
                                    aria-label={t('edit')}
                                    className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <EditIcon className="w-4 h-4" />
                                </button>
                            </TooltipHint>
                            <TooltipHint label={t('delete')}>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(service.id)}
                                    aria-label={t('delete')}
                                    className="p-2 text-gray-500 hover:text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </TooltipHint>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const ServiceSection: React.FC<{ title: string; services: Service[]; readOnly?: boolean; emptyMessage?: string }> = ({ title, services: svcs, readOnly, emptyMessage }) => (
        <div className={BLOCK_STYLE}>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
            {svcs.length > 0 ? (
                <div className="space-y-3">
                    {svcs.map((s) =>
                        !readOnly && s.id === editingServiceId ? (
                            <ServiceForm key={s.id} service={formState} onDataChange={handleDataChange} errors={isSubmitted ? errors : {}} currencySymbol={currencySymbol} t={t} notify={notify} />
                        ) : (
                            <ServiceViewRow key={s.id} service={s} readOnly={readOnly} />
                        )
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4">{emptyMessage || t('no_items_yet')}</p>
            )}
        </div>
    );

    const handleAddRecurring = () => {
        if (onRequestEdit && !onRequestEdit()) return;
        setIsAdding(true);
        setEditingServiceId(null);
        setFormState({ id: `svc-${Date.now()}`, name: '', value: null, frequency: 'monthly', status: 'active', startDate: new Date().toISOString().split('T')[0] });
        setErrors({});
        setIsSubmitted(false);
        onEditStart?.();
    };
    const handleAddOneOff = () => {
        if (onRequestEdit && !onRequestEdit()) return;
        setIsAdding(true);
        setEditingServiceId(null);
        setFormState({ id: `svc-${Date.now()}`, name: '', value: null, frequency: 'once', status: 'active', startDate: new Date().toISOString().split('T')[0] });
        setErrors({});
        setIsSubmitted(false);
        onEditStart?.();
    };

    return (
        <div className="space-y-6">
            <div className={`${BLOCK_STYLE} flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-2">
                    <BriefcaseIcon className={ICON_STYLE} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('contract_base_currency')}</span>
                    <InlineCurrencyField
                        value={clientCurrency || 'BRL'}
                        onChange={(c) => onCurrencyChange?.(c)}
                        disabled={readOnly}
                        menuTitle={t('contract_base_currency')}
                        options={[
                            { value: 'BRL', label: t('currency_display_brl') },
                            { value: 'USD', label: t('currency_display_usd') },
                            { value: 'EUR', label: t('currency_display_eur') },
                        ]}
                    />
                </div>
                {!readOnly && (
                <div ref={addMenuRef} className="relative">
                    <button onClick={() => setShowAddMenu((v) => !v)} disabled={!!isAdding || !!editingServiceId} className="flex items-center gap-1.5 px-3 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                        <PlusIcon className="w-4 h-4" />
                        {t('add_service') || 'Adicionar'}
                    </button>
                    {showAddMenu && (
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px] py-1 overflow-hidden">
                            <button onClick={() => { handleAddRecurring(); setShowAddMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {t('recurring_contracts') || 'Contrato recorrente'}
                            </button>
                            <button onClick={() => { handleAddOneOff(); setShowAddMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {t('one_off_services') || 'Serviço avulso'}
                            </button>
                        </div>
                    )}
                </div>
                )}
            </div>
            {!readOnly && isAdding && <div ref={serviceFormRef}><ServiceForm service={formState} onDataChange={handleDataChange} errors={isSubmitted ? errors : {}} currencySymbol={currencySymbol} t={t} notify={notify} /></div>}
            <div className="space-y-6">
                <ServiceSection title={t('recurring_contracts')} services={recurringServices} readOnly={readOnly} />
                <ServiceSection title={t('one_off_services')} services={oneOffServices} readOnly={readOnly} />
                <ServiceSection title={t('service_history')} services={historyServices} readOnly />
            </div>
        </div>
    );
};
