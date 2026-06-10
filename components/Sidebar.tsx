
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { toUploadUrl } from '../lib/api';
import { Language } from '../types';
import { HomeIcon, CalendarIcon, UsersIcon, DollarSignIcon, StarIcon, LayoutGridIcon, CheckSquareIcon, ClipboardListIcon, GlobeIcon, EditIcon, SettingsIcon } from './icons';
import { FlowBrandLogo } from './brand/FlowBrandLogo';
import ProfileMenu from './ProfileMenu';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
        return words[0].charAt(0) + words[words.length - 1].charAt(0);
    }
    return name.substring(0, 2).toUpperCase();
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const context = useContext(AppContext);
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const [showHelpMenu, setShowHelpMenu] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const helpMenuRef = useRef<HTMLDivElement>(null);
    const prefetchingRef = useRef<Record<string, boolean>>({});
    const lastClickTimeRef = useRef<number>(0);
    const CLICK_THROTTLE_MS = 250;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setShowHelpMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!context) return null;
    const { t, page, setPage, agencyProfile, logout, theme, setTheme, currentUser, hasPermission, canViewModule, language, setLanguage, isOperationalProfile } = context;

    const cycleLanguage = () => {
        const languages = [Language.PT, Language.EN, Language.ES];
        const currentIndex = languages.indexOf(language);
        const nextIndex = (currentIndex + 1) % languages.length;
        setLanguage(languages[nextIndex]);
    };

    const handleOpenTasksOnboarding = () => {
        window.dispatchEvent(new CustomEvent('open-tasks-onboarding'));
        setShowHelpMenu(false);
    };

    const prefetchPage = (pageName: 'dashboard' | 'producao' | 'agenda' | 'tarefas' | 'clients' | 'planejamento' | 'finance' | 'settings' | 'account') => {
        if (page === pageName) return;
        if (prefetchingRef.current[pageName]) return;
        prefetchingRef.current[pageName] = true;
        switch (pageName) {
            case 'clients':
                import('./ClientsPage').catch(() => {}); break;
            case 'agenda':
                import('./AgendaPage').catch(() => {}); break;
            case 'producao':
                import('./ProducaoPage').catch(() => {}); break;
            case 'tarefas':
                import('./TarefasPage').catch(() => {}); break;
            case 'planejamento':
                import('./PlanningPage').catch(() => {}); break;
            case 'finance':
                import('./FinancePage').catch(() => {}); break;
            case 'settings':
                import('./AgencySettingsPage').catch(() => {}); break;
            default:
                break;
        }
    };

    const handleNavClick = (pageName: 'dashboard' | 'producao' | 'agenda' | 'tarefas' | 'clients' | 'planejamento' | 'finance' | 'settings' | 'account') => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTimeRef.current;

        if (timeSinceLastClick < CLICK_THROTTLE_MS) {
            return;
        }

        lastClickTimeRef.current = now;

        try {
            setPage(pageName);
        } catch (err) {
            console.error(`[Sidebar] ERRO ao chamar setPage:`, err);
        }

        try {
            onClose();
        } catch (err) {
            console.error(`[Sidebar] ERRO ao chamar onClose:`, err);
        }
    };

    const NavItem = ({ icon, label, pageName, active = false }: { icon: React.ReactNode, label: string, pageName: 'dashboard' | 'producao' | 'agenda' | 'tarefas' | 'clients' | 'planejamento' | 'finance' | 'settings' | 'account', active?: boolean }) => (
        <button
            onMouseEnter={() => prefetchPage(pageName)}
            onClick={() => handleNavClick(pageName)}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors duration-200 ${
                active
                    ? 'bg-indigo-100 text-indigo-900 dark:bg-gray-700 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-3">{label}</span>
        </button>
    );

    return (
        <>
            <div
                className={`fixed inset-y-0 left-0 z-30 flex h-screen min-h-0 w-64 flex-col bg-white dark:bg-gray-800 shadow-[2px_0_20px_-4px_rgba(15,23,42,0.08)] dark:shadow-[2px_0_24px_-4px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                <div className="flex h-[7.5rem] shrink-0 items-center px-4">
                    <FlowBrandLogo variant="full" height={66} className="max-w-[124px]" />
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-2">
                        <nav className="space-y-0.5">
                            {hasPermission('view_dashboard') && !isOperationalProfile && (
                                <NavItem icon={<HomeIcon className="w-5 h-5"/>} label={t('dashboard')} pageName="dashboard" active={page === 'dashboard'} />
                            )}
                            {(hasPermission('manage_clients') || hasPermission('view_clients')) && (
                                <NavItem icon={<UsersIcon className="w-5 h-5"/>} label={t('clients')} pageName="clients" active={page === 'clients'} />
                            )}
                            {hasPermission('view_agenda') && <NavItem icon={<ClipboardListIcon className="w-5 h-5"/>} label={t('editorial_calendar')} pageName="planejamento" active={page === 'planejamento'} />}
                            {hasPermission('view_agenda') && <NavItem icon={<LayoutGridIcon className="w-5 h-5"/>} label={t('posts')} pageName="producao" active={page === 'producao'} />}
                            {hasPermission('view_agenda') && <NavItem icon={<CheckSquareIcon className="w-5 h-5"/>} label={t('tarefas')} pageName="tarefas" active={page === 'tarefas'} />}
                            {hasPermission('view_agenda') && <NavItem icon={<CalendarIcon className="w-5 h-5"/>} label={t('agenda')} pageName="agenda" active={page === 'agenda'} />}
                            {(hasPermission('manage_finance') || hasPermission('view_finance')) && (
                                <NavItem icon={<DollarSignIcon className="w-5 h-5"/>} label={t('finance')} pageName="finance" active={page === 'finance'} />
                            )}
                        </nav>
                    </div>

                    <div className="shrink-0 space-y-0.5 border-t border-slate-200 px-3 py-2 dark:border-gray-700">
                        <div className="mb-1 px-4 pt-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
                                {t('sidebar_account_system')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onMouseEnter={() => prefetchPage('account')}
                            onClick={() => handleNavClick('account')}
                            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                page === 'account'
                                    ? 'bg-indigo-100 text-indigo-900 dark:bg-gray-700 dark:text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white'
                            }`}
                        >
                            <EditIcon className="h-5 w-5 shrink-0 opacity-80" />
                            <span>{t('account_nav_my_account')}</span>
                        </button>
                        {canViewModule('settings') && (
                            <button
                                type="button"
                                onMouseEnter={() => prefetchPage('settings')}
                                onClick={() => handleNavClick('settings')}
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                    page === 'settings'
                                        ? 'bg-indigo-100 text-indigo-900 dark:bg-gray-700 dark:text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white'
                                }`}
                            >
                                <SettingsIcon className="h-5 w-5 shrink-0 opacity-80" />
                                <span>{t('settings')}</span>
                            </button>
                        )}
                        <div className="relative" ref={helpMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowHelpMenu((v) => !v)}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                aria-expanded={showHelpMenu}
                            >
                                <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                                </svg>
                                <span>{t('help')}</span>
                            </button>
                            {showHelpMenu && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 z-50">
                                    <button
                                        type="button"
                                        onClick={handleOpenTasksOnboarding}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Ver onboarding de Tarefas
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={cycleLanguage}
                            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                        >
                            <GlobeIcon className="h-5 w-5 shrink-0 opacity-70" />
                            <span className="uppercase">{language}</span>
                        </button>
                    </div>
                </div>

                <div ref={profileRef} className="relative shrink-0 border-t border-slate-200 bg-slate-50/50 p-3 dark:border-gray-700 dark:bg-transparent">
                    <ProfileMenu
                        isOpen={isProfileMenuOpen}
                        onClose={() => setProfileMenuOpen(false)}
                        onLogout={() => { logout(); onClose(); }}
                        onEditProfile={() => { setPage('account'); onClose(); }}
                        onOpenSettings={() => { setPage('settings'); onClose(); }}
                        showSettings={false}
                        showNavigationActions={false}
                        theme={theme}
                        setTheme={setTheme}
                        t={t}
                    />
                    <button onClick={() => setProfileMenuOpen((prev) => !prev)} className="w-full rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                {agencyProfile.avatarUrl ? (
                                    <img src={toUploadUrl(agencyProfile.avatarUrl)} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200/80 dark:ring-0" />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
                                        <span className="text-sm font-bold text-white">{getInitials(agencyProfile.name)}</span>
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1">
                                    {currentUser?.avatarUrl ? (
                                        <img src={toUploadUrl(currentUser.avatarUrl)} alt="" className="h-5 w-5 rounded-full border-2 border-white object-cover dark:border-gray-800" />
                                    ) : (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-indigo-500 dark:border-gray-800">
                                            <span className="text-[8px] font-bold text-white">{getInitials(currentUser?.name || '')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{agencyProfile.name}</span>
                                <div className="flex items-center gap-1">
                                    <span className="block truncate text-xs text-slate-500 dark:text-gray-400">{currentUser?.name}</span>
                                    {currentUser?.role === 'owner' && <StarIcon className="h-3 w-3 flex-shrink-0 fill-current text-amber-500 dark:text-amber-400" />}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
