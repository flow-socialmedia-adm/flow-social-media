import React, { useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { formatDateToYYYYMMDD } from '../lib/utils';
import { CheckCircleIcon, ClockIcon, AlertTriangleIcon, UsersIcon, BellIcon, InfoIcon, CalendarIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, ArrowUpIcon, ArrowDownIcon } from './icons';
import { Task, StatusCategory, FinancialEntry, FinancialExpense, Currency } from '../types';
import { apiGet, apiPut } from '../lib/api';
import { API_FINANCIAL_CHARTS_CASHFLOW_6M, API_FINANCIAL_KPIS_MONTH } from '../lib/apiPaths';
import GuidedTour from './GuidedTour';
import { AuthContext } from '../contexts/AuthContext';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_HEADER_ACTIONS_ROW,
    CONTENT_PAGE_SCROLL_OUTER,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import IntelligentCentral from './IntelligentCentral';
import { buildDashboardIntelligenceItems } from '../lib/intelligentCentral';

// Conversão local (fallback)
const conversionRates: Record<Currency, number> = {
    BRL: 1,
    USD: 5.25,
    EUR: 5.65,
};

// Hook para animação de contagem
const useCountUp = (end: number, duration: number = 2000, start: number = 0): number => {
    const [count, setCount] = useState(start);
    const [isVisible, setIsVisible] = useState(false);
    const countRef = useRef(start);

    useEffect(() => {
        setIsVisible(true);
        const startTime = Date.now();
        const startValue = countRef.current;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (end - startValue) * easeOut);
            
            setCount(current);
            countRef.current = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        if (isVisible) {
            requestAnimationFrame(animate);
        }
    }, [end, duration, isVisible]);

    return count;
};

// Componente de Card de Métrica Animado com Contagem
const AnimatedMetricCard: React.FC<{
    title: string;
    value: number | string;
    change?: number;
    changeLabel?: string;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
    onClick?: () => void;
    formatValue?: (val: number) => string;
}> = ({ title, value, change, changeLabel, icon, gradient, iconBg, onClick, formatValue }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d.-]/g, '')) || 0;
    const shouldAnimate = typeof value === 'number' && formatValue;
    const animatedCount = shouldAnimate ? useCountUp(numericValue, 1500) : 0;
    const displayValue = shouldAnimate && formatValue 
        ? formatValue(animatedCount)
        : value;
    
    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform ${isHovered ? 'scale-[1.03]' : 'scale-100'} cursor-pointer ${onClick ? '' : 'cursor-default'}`}
            style={{ animation: isVisible ? 'fadeInUp 0.6s ease-out' : 'none' }}
        >
            {/* Gradiente de fundo sutil */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full blur-3xl transition-transform duration-500 ${isHovered ? 'scale-150' : 'scale-100'}`}></div>
            
            <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${iconBg} shadow-md transition-transform duration-300 ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}>
                        {icon}
                    </div>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                            change >= 0 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        } ${isHovered ? 'scale-110' : 'scale-100'}`}>
                            {change >= 0 ? (
                                <ArrowUpIcon className="w-3 h-3" />
                            ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                            )}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white transition-all duration-300">{displayValue}</p>
                    {changeLabel && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{changeLabel}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente de Gráfico de Barras Animado
const AnimatedBarChart: React.FC<{
    data: { label: string; value: number; color: string }[];
    height?: number;
    onHover?: (index: number | null) => void;
}> = ({ data, height = 200, onHover }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [animatedValues, setAnimatedValues] = useState<number[]>(data.map(() => 0));
    const maxValue = Math.max(...data.map(d => d.value), 1);

    useEffect(() => {
        const duration = 1000;
        const startTime = Date.now();
        const startValues = data.map(() => 0);

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedValues(
                data.map((d, i) => Math.floor(d.value * easeOut))
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [data]);

    return (
        <div className="relative" style={{ height: `${height}px` }}>
            <div className="flex items-end justify-between h-full gap-2">
                {data.map((item, index) => {
                    const percentage = (animatedValues[index] / maxValue) * 100;
                    const isHovered = hoveredIndex === index;
                    
                    return (
                        <div
                            key={index}
                            className="flex-1 flex flex-col items-center group cursor-pointer"
                            onMouseEnter={() => {
                                setHoveredIndex(index);
                                onHover?.(index);
                            }}
                            onMouseLeave={() => {
                                setHoveredIndex(null);
                                onHover?.(null);
                            }}
                        >
                            <div className="w-full flex flex-col items-center">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-500 ${item.color} ${
                                        isHovered ? 'opacity-100 scale-y-105' : 'opacity-90'
                                    }`}
                                    style={{ 
                                        height: `${percentage}%`,
                                        minHeight: percentage > 0 ? '4px' : '0'
                                    }}
                                >
                                    {isHovered && (
                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                            {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center truncate w-full">
                                {item.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Componente de Donut Chart Animado
const AnimatedDonutChart: React.FC<{
    data: { label: string; value: number; color: string }[];
    size?: number;
    onHover?: (index: number | null) => void;
}> = ({ data, size = 200, onHover }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [animatedValues, setAnimatedValues] = useState<number[]>(data.map(() => 0));
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        const duration = 1500;
        const startTime = Date.now();
        const startValues = data.map(() => 0);

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedValues(
                data.map((d) => d.value * easeOut)
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setAnimatedValues(data.map(d => d.value));
            }
        };

        requestAnimationFrame(animate);
    }, [data]);

    let currentAngle = -90;
    const segments = data.map((item, index) => {
        const animatedValue = animatedValues[index];
        const percentage = total > 0 ? (animatedValue / total) * 100 : 0;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;
        const largeArcFlag = angle > 180 ? 1 : 0;

        const x1 = radius + radius * Math.cos(startAngleRad);
        const y1 = radius + radius * Math.sin(startAngleRad);
        const x2 = radius + radius * Math.cos(endAngleRad);
        const y2 = radius + radius * Math.sin(endAngleRad);

        const pathData = [
            `M ${radius} ${radius}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        return {
            pathData,
            percentage,
            color: item.color,
            label: item.label,
            value: item.value,
            index,
        };
    });

    return (
        <div className="flex w-full flex-col items-center">
            <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {segments.map((segment, index) => {
                        const isHovered = hoveredIndex === index;
                        return (
                            <g
                                key={index}
                                onMouseEnter={() => {
                                    setHoveredIndex(index);
                                    onHover?.(index);
                                }}
                                onMouseLeave={() => {
                                    setHoveredIndex(null);
                                    onHover?.(null);
                                }}
                                className="cursor-pointer transition-all duration-300"
                                style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                            >
                                <path
                                    d={segment.pathData}
                                    fill={segment.color}
                                    opacity={isHovered ? 1 : 0.8}
                                    className="transition-all duration-300"
                                />
                                {isHovered && (
                                    <text
                                        x={size / 2}
                                        y={size / 2}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-gray-900 dark:fill-white text-sm font-bold"
                                        transform={`rotate(90 ${size / 2} ${size / 2})`}
                                    >
                                        {segment.percentage.toFixed(1)}%
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
                {hoveredIndex === null && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    </div>
                )}
            </div>
            <div className="mt-4 flex w-full flex-wrap justify-center gap-x-4 gap-y-2">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className={`h-3 w-3 shrink-0 rounded-full ${item.color}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Componente de Gráfico de Linha Animado
const AnimatedLineChart: React.FC<{
    data: { label: string; income: number; expense: number }[];
    height?: number;
}> = ({ data, height = 200 }) => {
    const [animatedData, setAnimatedData] = useState<{ label: string; income: number; expense: number }[]>(
        data.map(d => ({ ...d, income: 0, expense: 0 }))
    );

    useEffect(() => {
        const duration = 1500;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedData(
                data.map(d => ({
                    ...d,
                    income: d.income * easeOut,
                    expense: d.expense * easeOut,
                }))
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [data]);

    const maxValue = Math.max(
        ...animatedData.map(d => Math.max(d.income, d.expense)),
        1
    );

    const pointsIncome = animatedData.map((d, i) => {
        const x = (i / (animatedData.length - 1 || 1)) * 100;
        const y = 100 - (d.income / maxValue) * 100;
        return `${x},${y}`;
    }).join(' ');

    const pointsExpense = animatedData.map((d, i) => {
        const x = (i / (animatedData.length - 1 || 1)) * 100;
        const y = 100 - (d.expense / maxValue) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative" style={{ height: `${height}px` }}>
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="gradient-income" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gradient-expense" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polyline
                    points={`0,100 ${pointsIncome} 100,100`}
                    fill="url(#gradient-income)"
                />
                <polyline
                    points={`0,100 ${pointsExpense} 100,100`}
                    fill="url(#gradient-expense)"
                />
                <polyline
                    points={`0,100 ${pointsIncome}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <polyline
                    points={`0,100 ${pointsExpense}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 dark:text-gray-600 px-1">
                {data.map((d, i) => (
                    <span key={i} className="truncate" style={{ maxWidth: `${100 / data.length}%` }}>
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const context = useContext(AppContext);
    const auth = useContext(AuthContext);

    if (!context) return null;
    
    const { 
        t, 
        tasks, 
        clients, 
        notifications, 
        setPage, 
        canViewModule,
        workflows, 
        clientWorkflowId, 
        generalWorkflowId, 
        language,
        financialEntries,
        financialExpenses,
        agencyProfile
    } = context;

    // Tour guiado - CAMADA 2
    const [showTour, setShowTour] = useState(false);
    const tourSteps = useMemo(() => [
        {
            id: 'overview',
            title: 'Bem-vindo ao Flow ERP!',
            content: 'Este é o seu dashboard. Aqui você tem uma visão geral de tudo: finanças, tarefas e clientes.',
        },
        {
            id: 'tasks',
            title: 'Tarefas',
            content: 'Gerencie seus posts e tarefas internas. Clique em "Tarefas" no menu lateral para começar.',
        },
        {
            id: 'clients',
            title: 'Clientes',
            content: 'Organize todos os seus clientes em um só lugar. Acesse pelo menu lateral.',
        },
        ...(agencyProfile?.plan_tier && agencyProfile.plan_tier !== 'agencia' ? [{
            id: 'finance',
            title: 'Financeiro',
            content: 'Acompanhe receitas, despesas e fluxo de caixa. Tudo organizado para você.',
        }] : []),
        {
            id: 'cta',
            title: 'Pronto para começar?',
            content: 'Clique em "Tarefas" no menu lateral para criar sua primeira tarefa!',
        },
    ], [agencyProfile?.plan_tier]);

    useEffect(() => {
        // Verificar se deve mostrar o tour
        if (auth?.user?.onboarding?.showGuidedTour && !auth?.user?.onboarding?.hasSeenHomeTour) {
            // Pequeno delay para garantir que a página carregou
            const timer = setTimeout(() => {
                setShowTour(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [auth?.user?.onboarding]);

    const handleTourComplete = async () => {
        setShowTour(false);
        // Marcar como visto
        try {
            await apiPut('/agencies/me', {
                hasSeenHomeTour: true,
            });
            // Recarregar dados do usuário
            await auth?.refreshMe();
        } catch (error) {
            console.error('Erro ao salvar hasSeenHomeTour:', error);
        }
    };

    const handleTourSkip = async () => {
        setShowTour(false);
        // Marcar como visto mesmo ao pular
        try {
            await apiPut('/agencies/me', {
                hasSeenHomeTour: true,
            });
            await auth?.refreshMe();
        } catch (error) {
            console.error('Erro ao salvar hasSeenHomeTour:', error);
        }
    };
    
    const baseCurrency = agencyProfile?.baseCurrency || 'BRL';
    const canViewFinancial = canViewModule('financial');
    
    const [backendSummary, setBackendSummary] = useState<{ todo: number; doing: number; done: number } | null>(null);
    const [backendKpis, setBackendKpis] = useState<{ 
        faturado: number; 
        recebido: number; 
        despesas: number; 
        saldo: number; 
        baseCurrency: string 
    } | null>(null);
    const [backendCash, setBackendCash] = useState<{ 
        baseCurrency: string; 
        data: { month: string; income: number; expense: number }[] 
    } | null>(null);
    const [backendNext, setBackendNext] = useState<{ baseCurrency: string; nextIncome: any; nextExpense: any } | null>(null);
    const [backendRecent, setBackendRecent] = useState<any[] | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [summary, kpis, cash, next, recent] = await Promise.all([
                    apiGet('/dashboard/summary'),
                    apiGet(API_FINANCIAL_KPIS_MONTH),
                    apiGet(API_FINANCIAL_CHARTS_CASHFLOW_6M),
                    apiGet('/dashboard/next-financial'),
                    apiGet('/dashboard/recent-clients'),
                ]);
                if (!mounted) return;
                setBackendSummary(summary as any);
                setBackendKpis(kpis as any);
                setBackendCash(cash as any);
                setBackendNext(next as any);
                setBackendRecent(recent as any[]);
            } catch {
                // fallback silencioso para dados locais
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Função de conversão de moeda
    const convertToBase = useCallback((value: number, fromCurrency: Currency): number => {
        if (fromCurrency === baseCurrency) return value;
        const rateFrom = conversionRates[fromCurrency] || 1;
        const rateTo = conversionRates[baseCurrency] || 1;
        const baseValue = value * rateFrom;
        return baseValue / rateTo;
    }, [baseCurrency]);

    // Função de formatação de moeda
    const formatCurrency = useCallback((value: number, currency: Currency = baseCurrency) => {
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
        } catch (e) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value);
        }
    }, [language, baseCurrency]);

    // Entradas derivadas de contrato (mesma regra do FinancePage).
    const contractDerivedEntries = useMemo((): FinancialEntry[] => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const entries: FinancialEntry[] = [];
        clients.forEach((client) => {
            (client.contract?.services || []).forEach((service: any) => {
                if (service.frequency === 'monthly') {
                    const start = service.startDate ? new Date(service.startDate + 'T00:00') : null;
                    const end = service.endDate ? new Date(service.endDate + 'T00:00') : null;
                    if (start && start <= monthEnd && (!end || end >= monthStart)) {
                        const payDay = service.paymentDay || 10;
                        entries.push({
                            id: `_contract-${service.id}-${monthStr}`,
                            clientId: client.id,
                            description: service.name,
                            category: 'fee_monthly_services',
                            value: service.value || 0,
                            currency: client.currency,
                            dueDate: `${monthStr}-${String(payDay).padStart(2, '0')}`,
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
    }, [clients]);

    // Combina entradas manuais com derivadas de contrato (evitando duplicata por cliente+descrição+mês).
    const allIncomeEntries = useMemo(() => {
        const manualKeys = new Set(
            financialEntries
                .filter((e) => e.clientId)
                .map((e) => `${e.clientId}-${e.description}-${e.dueDate?.slice(0, 7)}`),
        );
        const nonDuplicateContractEntries = contractDerivedEntries.filter(
            (e) => !manualKeys.has(`${e.clientId}-${e.description}-${e.dueDate?.slice(0, 7)}`),
        );
        return [...financialEntries, ...nonDuplicateContractEntries];
    }, [financialEntries, contractDerivedEntries]);

    // Calcula faturado do mês atual a partir da visão consolidada (manual + contrato).
    const billedThisMonth = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return allIncomeEntries
            .filter((entry) => {
                const due = new Date(entry.dueDate + 'T00:00:00');
                return due >= monthStart && due <= monthEnd;
            })
            .reduce((sum, entry) => sum + convertToBase(entry.value, entry.currency || baseCurrency), 0);
    }, [allIncomeEntries, baseCurrency, convertToBase]);

    // Cálculo de métricas financeiras
    const financialMetrics = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Recebido sempre do estado global (atualizado em tempo real quando FinancePage marca como pago)
        const currentMonthPaid = financialEntries.filter(e => {
            if (!e.paymentDate) return false;
            const d = new Date(e.paymentDate + 'T00:00:00');
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const received = currentMonthPaid.reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);

        const lastMonthPaid = financialEntries.filter(e => {
            if (!e.paymentDate) return false;
            const d = new Date(e.paymentDate + 'T00:00:00');
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const lastMonthReceived = lastMonthPaid.reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);
        const receivedChange = lastMonthReceived > 0 ? ((received - lastMonthReceived) / lastMonthReceived) * 100 : 0;

        if (backendKpis) {
            const lastMonthExpenses = financialExpenses.filter(e => {
                const date = new Date(e.dueDate + 'T00:00:00');
                return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
            });
            const lastMonthExpensesTotal = lastMonthExpenses
                .filter(e => e.paymentDate)
                .reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);
            const expensesChange = lastMonthExpensesTotal > 0 
                ? ((backendKpis.despesas - lastMonthExpensesTotal) / lastMonthExpensesTotal) * 100 
                : 0;

            return {
                received,
                expenses: backendKpis.despesas,
                balance: received - backendKpis.despesas,
                billed: backendKpis.faturado,
                receivedChange,
                expensesChange,
            };
        }

        // Fallback para cálculo local
        const currentMonthExpenses = financialExpenses.filter(e => {
            const date = new Date(e.dueDate + 'T00:00:00');
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const expenses = currentMonthExpenses
            .filter(e => e.paymentDate)
            .reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);

        const lastMonthExpenses = financialExpenses.filter(e => {
            const date = new Date(e.dueDate + 'T00:00:00');
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        });
        const lastMonthExpensesTotal = lastMonthExpenses
            .filter(e => e.paymentDate)
            .reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);

        const expensesChange = lastMonthExpensesTotal > 0 
            ? ((expenses - lastMonthExpensesTotal) / lastMonthExpensesTotal) * 100 
            : 0;

        return {
            received,
            expenses,
            balance: received - expenses,
            billed: billedThisMonth,
            receivedChange,
            expensesChange,
        };
    }, [financialEntries, financialExpenses, backendKpis, baseCurrency, convertToBase, billedThisMonth]);

    // Cálculo de métricas de tarefas
    const taskMetrics = useMemo(() => {
        if (backendSummary) {
            const total = (backendSummary.todo ?? 0) + (backendSummary.doing ?? 0) + (backendSummary.done ?? 0);
            const completionRate = total > 0 ? ((backendSummary.done ?? 0) / total) * 100 : 0;
            return {
                todo: backendSummary.todo ?? 0,
                inProgress: backendSummary.doing ?? 0,
                completedThisWeek: backendSummary.done ?? 0,
                total,
                completionRate,
            };
        }
        
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = formatDateToYYYYMMDD(startOfWeek);

        const getStatusCategory = (task: Task): StatusCategory | null => {
            const workflow = task.isGeneral ? workflows[generalWorkflowId] : workflows[clientWorkflowId];
            const status = workflow?.statuses.find(s => s.id === task.statusId);
            return status ? status.category : null;
        };

        const stats = tasks.reduce((acc, task) => {
            const category = getStatusCategory(task);
            if (!category) return acc;
            
            if (category === 'todo') acc.todo += 1;
            if (category === 'in_progress') acc.inProgress += 1;
            if (category === 'done' && task.date >= startOfWeekStr) acc.completedThisWeek += 1;

            return acc;
        }, { todo: 0, inProgress: 0, completedThisWeek: 0 });

        const total = stats.todo + stats.inProgress + stats.completedThisWeek;
        const completionRate = total > 0 ? (stats.completedThisWeek / total) * 100 : 0;

        return {
            ...stats,
            total,
            completionRate,
        };
    }, [tasks, workflows, clientWorkflowId, generalWorkflowId, backendSummary]);

    // Dados do gráfico de cash flow
    const cashFlowData = useMemo(() => {
        if (backendCash && backendCash.data) {
            return backendCash.data.slice(-6).map((d) => {
                const parts = d.month.split('-');
                const y = parseInt(parts[0] || '', 10);
                const m = parseInt(parts[1] || '', 10);
                const label =
                    Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12
                        ? new Date(y, m - 1, 1).toLocaleDateString(language, { month: 'short' })
                        : d.month;
                return {
                    label,
                    income: d.income,
                    expense: d.expense,
                };
            });
        }

        // Fallback: calcular últimos 6 meses
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toLocaleDateString(language, { month: 'short' });
            
            const monthEntries = financialEntries.filter(e => {
                const entryDate = new Date(e.dueDate + 'T00:00:00');
                return entryDate.getMonth() === date.getMonth() && entryDate.getFullYear() === date.getFullYear();
            });
            const monthExpenses = financialExpenses.filter(e => {
                const expenseDate = new Date(e.dueDate + 'T00:00:00');
                return expenseDate.getMonth() === date.getMonth() && expenseDate.getFullYear() === date.getFullYear();
            });

            const income = monthEntries
                .filter(e => e.paymentDate)
                .reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);
            const expense = monthExpenses
                .filter(e => e.paymentDate)
                .reduce((sum, e) => sum + convertToBase(e.value, e.currency || baseCurrency), 0);

            months.push({ label: monthStr, income, expense });
        }
        return months;
    }, [backendCash, financialEntries, financialExpenses, baseCurrency, convertToBase, language]);

    // Top clientes por receita
    const topClients = useMemo(() => {
        const clientRevenue: Record<string, number> = {};
        
        allIncomeEntries
            .filter(e => e.clientId)
            .forEach(e => {
                const revenue = convertToBase(e.value, e.currency || baseCurrency);
                clientRevenue[e.clientId!] = (clientRevenue[e.clientId!] || 0) + revenue;
            });

        return Object.entries(clientRevenue)
            .map(([clientId, revenue]) => ({
                client: clients.find(c => c.id === clientId),
                revenue,
            }))
            .filter(item => item.client)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [allIncomeEntries, clients, baseCurrency, convertToBase]);

    // Dados para gráfico de barras de receita por cliente
    const clientsBarData = useMemo(() => {
        return topClients.slice(0, 5).map((item, index) => ({
            label: item.client?.name || 'Cliente',
            value: item.revenue,
            color: `bg-gradient-to-t from-indigo-${500 + index * 100} to-indigo-${400 + index * 100}`,
        }));
    }, [topClients]);

    // Dados para donut chart de tarefas
    const tasksDonutData = useMemo(() => {
        return [
            {
                label: t('dashboard_completed_this_week'),
                value: taskMetrics.completedThisWeek,
                color: '#22c55e',
            },
            {
                label: t('dashboard_in_progress'),
                value: taskMetrics.inProgress,
                color: '#eab308',
            },
            {
                label: t('dashboard_todo'),
                value: taskMetrics.todo,
                color: '#f97316',
            },
        ].filter(d => d.value > 0);
    }, [taskMetrics, t]);

    // Próximos vencimentos
    const upcomingPayments = useMemo(() => {
        const today = formatDateToYYYYMMDD(new Date());
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = formatDateToYYYYMMDD(nextWeek);

        const upcoming = financialEntries
            .filter(e => (e.status === 'pending' || e.status === 'overdue') && e.dueDate >= today && e.dueDate <= nextWeekStr)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, 5);

        return upcoming;
    }, [financialEntries]);

    const recentClients = useMemo(() => {
        if (backendRecent) return backendRecent;
        return [...clients]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [clients, backendRecent]);

    const unreadNotifications = useMemo(() => {
        return notifications.filter(n => !n.read).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    }, [notifications]);

    const dashboardIntelligenceItems = useMemo(
        () =>
            buildDashboardIntelligenceItems({
                tasks,
                clients,
                workflows,
                clientWorkflowId,
                generalWorkflowId,
            }),
        [tasks, clients, workflows, clientWorkflowId, generalWorkflowId],
    );

    const getNotificationIcon = (type: 'info' | 'warning' | 'alert') => {
        switch (type) {
            case 'info': return <InfoIcon className="w-5 h-5 text-blue-500" />;
            case 'warning': return <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
            case 'alert': return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
        }
    };
    
    return (
        <>
            <GuidedTour
                isOpen={showTour}
                onComplete={handleTourComplete}
                onSkip={handleTourSkip}
                steps={tourSteps}
            />
            <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
                <ContentPageHeader
                    heading={t('dashboard')}
                    subtitle={t('dashboard_subtitle')}
                    actions={(
                        <p
                            className="flex h-10 min-h-[2.5rem] items-center rounded-lg border border-white/30 bg-white/20 px-3 text-right text-sm font-semibold leading-none text-white/95 box-border sm:text-base"
                            suppressHydrationWarning
                        >
                            {new Date().toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                />
                <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                <div className={CONTENT_PAGE_BODY_INNER}>
                <style>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: none;
                        }
                    }
                `}</style>

                <div className="w-full space-y-14">
            {dashboardIntelligenceItems.length > 0 && (
            <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-indigo-900/40 dark:bg-gray-800">
                <IntelligentCentral
                    className="max-w-none"
                    items={dashboardIntelligenceItems}
                    t={t}
                    title={t('intel_central_title')}
                    onAction={(item) => {
                        if (item.clientId) setPage('planejamento');
                        else setPage('planejamento');
                    }}
                />
            </section>
            )}
            {/* ========== SEÇÃO FINANCEIRO ========== */}
            {canViewFinancial && (
            <section className="space-y-6">
                <div className="flex w-full min-w-0 items-center gap-3 text-left">
                    <h2 className="min-w-0 text-2xl font-bold text-gray-900 dark:text-white">{t('financial_dashboard')}</h2>
                    <div className="ml-auto shrink-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-2" aria-hidden={true}>
                        <DollarSignIcon className="h-6 w-6 text-white" />
                    </div>
                </div>

                {/* Cards de Métricas Financeiras */}
                <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <AnimatedMetricCard
                        title={t('dashboard_income_month')}
                        value={financialMetrics.received}
                        change={financialMetrics.receivedChange}
                        changeLabel={t('dashboard_vs_previous_month')}
                        icon={<DollarSignIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
                        gradient="bg-gradient-to-br from-green-400 to-emerald-600"
                        iconBg="bg-green-100 dark:bg-green-900/30"
                        onClick={() => setPage('finance')}
                        formatValue={(val) => formatCurrency(val, baseCurrency)}
                    />
                    <AnimatedMetricCard
                        title={t('dashboard_expenses_month')}
                        value={financialMetrics.expenses}
                        change={financialMetrics.expensesChange}
                        changeLabel={t('dashboard_vs_previous_month')}
                        icon={<TrendingDownIcon className="w-6 h-6 text-red-600 dark:text-red-400" />}
                        gradient="bg-gradient-to-br from-red-400 to-rose-600"
                        iconBg="bg-red-100 dark:bg-red-900/30"
                        onClick={() => setPage('finance')}
                        formatValue={(val) => formatCurrency(val, baseCurrency)}
                    />
                    <AnimatedMetricCard
                        title={t('dashboard_current_balance')}
                        value={financialMetrics.balance}
                        icon={<TrendingUpIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                        gradient="bg-gradient-to-br from-indigo-400 to-purple-600"
                        iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                        onClick={() => setPage('finance')}
                        formatValue={(val) => formatCurrency(val, baseCurrency)}
                    />
                    <AnimatedMetricCard
                        title={t('dashboard_billed_month')}
                        value={financialMetrics.billed}
                        icon={<DollarSignIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                        gradient="bg-gradient-to-br from-blue-400 to-cyan-600"
                        iconBg="bg-blue-100 dark:bg-blue-900/30"
                        onClick={() => setPage('finance')}
                        formatValue={(val) => formatCurrency(val, baseCurrency)}
                    />
                </div>

                {/* Gráficos Financeiros */}
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Gráfico de Fluxo de Caixa */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard_cashflow_6m')}</h3>
                            <button 
                                onClick={() => setPage('finance')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('view_details')}
                            </button>
                        </div>
                        <AnimatedLineChart data={cashFlowData} height={200} />
                        <div className="flex items-center gap-4 text-sm mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-gray-600 dark:text-gray-400">{t('income')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-gray-600 dark:text-gray-400">{t('expenses')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Próximos Vencimentos */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dashboard_upcoming_due')}</h3>
                            <button 
                                onClick={() => setPage('finance')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('view_all')}
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {upcomingPayments.length > 0 ? (
                                upcomingPayments.map(payment => {
                                    const client = clients.find(c => c.id === payment.clientId);
                                    const isOverdue = payment.status === 'overdue';
                                    return (
                                        <div key={payment.id} className={`p-3 rounded-lg border-l-4 transition-all duration-300 hover:shadow-md ${
                                            isOverdue 
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                                                : 'bg-gray-50 dark:bg-gray-700/50 border-yellow-500'
                                        }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    {client?.name || t('no_client_display')}
                                                </p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    isOverdue 
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                    {isOverdue ? t('status_overdue') : t('status_pending')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{payment.description}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(payment.dueDate + 'T00:00:00').toLocaleDateString(language)}
                                                </p>
                                                <p className="font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(payment.value, payment.currency || baseCurrency)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('dashboard_no_upcoming_due')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            )}

            {/* ========== SEÇÃO TAREFAS ========== */}
            <section className="space-y-6">
                <div className="flex w-full min-w-0 items-center gap-3 text-left">
                    <h2 className="min-w-0 text-2xl font-bold text-gray-900 dark:text-white">{t('tarefas')}</h2>
                    <div className="ml-auto shrink-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-2" aria-hidden={true}>
                        <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                </div>

                {/* Cards de Métricas de Tarefas */}
                <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <AnimatedMetricCard
                        title={t('todo_tasks')}
                        value={taskMetrics.todo}
                        icon={<ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                        gradient="bg-gradient-to-br from-orange-400 to-amber-600"
                        iconBg="bg-orange-100 dark:bg-orange-900/30"
                        onClick={() => setPage('agenda')}
                    />
                    <AnimatedMetricCard
                        title={t('in_progress_tasks')}
                        value={taskMetrics.inProgress}
                        icon={<AlertTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
                        gradient="bg-gradient-to-br from-yellow-400 to-amber-600"
                        iconBg="bg-yellow-100 dark:bg-yellow-900/30"
                        onClick={() => setPage('agenda')}
                    />
                    <AnimatedMetricCard
                        title={t('completed_this_week')}
                        value={taskMetrics.completedThisWeek}
                        icon={<CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
                        gradient="bg-gradient-to-br from-green-400 to-emerald-600"
                        iconBg="bg-green-100 dark:bg-green-900/30"
                        onClick={() => setPage('agenda')}
                    />
                    <AnimatedMetricCard
                        title={t('dashboard_completion_rate')}
                        value={`${taskMetrics.completionRate.toFixed(0)}%`}
                        icon={<CheckCircleIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                        gradient="bg-gradient-to-br from-purple-400 to-pink-600"
                        iconBg="bg-purple-100 dark:bg-purple-900/30"
                        onClick={() => setPage('agenda')}
                    />
                </div>

                {/* Gráficos de Tarefas */}
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Donut Chart de Tarefas */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard_task_distribution')}</h3>
                            <button 
                                onClick={() => setPage('agenda')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('dashboard_view_tasks')}
                            </button>
                        </div>
                        {tasksDonutData.length > 0 ? (
                            <AnimatedDonutChart data={tasksDonutData} size={250} />
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-gray-400 dark:text-gray-600">
                                <p className="text-sm">{t('dashboard_no_tasks')}</p>
                            </div>
                        )}
                    </div>

                    {/* Performance de Tarefas */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard_performance')}</h3>
                            <button 
                                onClick={() => setPage('agenda')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('dashboard_view_tasks')}
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{t('dashboard_completed_this_week')}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{taskMetrics.completedThisWeek} / {taskMetrics.total || 1}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-1000 ease-out"
                                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.completedThisWeek / taskMetrics.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{t('dashboard_in_progress')}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{taskMetrics.inProgress} / {taskMetrics.total || 1}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all duration-1000 ease-out"
                                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.inProgress / taskMetrics.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{t('dashboard_todo')}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{taskMetrics.todo} / {taskMetrics.total || 1}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000 ease-out"
                                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.todo / taskMetrics.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========== SEÇÃO CLIENTES ========== */}
            <section className="space-y-6">
                <div className="flex w-full min-w-0 items-center gap-3 text-left">
                    <h2 className="min-w-0 text-2xl font-bold text-gray-900 dark:text-white">{t('clients')}</h2>
                    <div className="ml-auto shrink-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-2" aria-hidden={true}>
                        <UsersIcon className="h-6 w-6 text-white" />
                    </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Gráfico de Barras - Top Clientes */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard_top_clients_revenue')}</h3>
                            <button 
                                onClick={() => setPage('clients')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('view_all')}
                            </button>
                        </div>
                        {clientsBarData.length > 0 ? (
                            <AnimatedBarChart 
                                data={clientsBarData.map((item, index) => {
                                    const colors = [
                                        'bg-gradient-to-t from-indigo-500 to-indigo-400',
                                        'bg-gradient-to-t from-indigo-600 to-indigo-500',
                                        'bg-gradient-to-t from-indigo-700 to-indigo-600',
                                        'bg-gradient-to-t from-purple-500 to-purple-400',
                                        'bg-gradient-to-t from-purple-600 to-purple-500',
                                    ];
                                    return {
                                        label: item.label,
                                        value: item.revenue,
                                        color: colors[index % colors.length],
                                    };
                                })}
                                height={250}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-gray-400 dark:text-gray-600">
                                <p className="text-sm">{t('dashboard_no_revenue_data')}</p>
                            </div>
                        )}
                    </div>

                    {/* Lista de Clientes Recentes */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dashboard_recent_clients')}</h3>
                            <button 
                                onClick={() => setPage('clients')}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {t('view_all')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentClients.length > 0 ? (
                                recentClients.map((client, index) => (
                                    <div 
                                        key={client.id} 
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold">
                                                {(client.name ?? '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{client.name ?? '—'}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {client.contacts?.find((contact: any) => contact.isPrimary)?.email || t('dashboard_no_email')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                                    <UsersIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('no_clients_found')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
                </div>
                </div>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;
