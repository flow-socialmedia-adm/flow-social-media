import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Language } from '../types';
import { MenuIcon, GlobeIcon } from './icons';
import TooltipHint from './TooltipHint';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { language, setLanguage, t } = context;
    const [showHelpMenu, setShowHelpMenu] = useState(false);
    const helpMenuRef = useRef<HTMLDivElement>(null);

    const cycleLanguage = () => {
        const languages = [Language.PT, Language.EN, Language.ES];
        const currentIndex = languages.indexOf(language);
        const nextIndex = (currentIndex + 1) % languages.length;
        setLanguage(languages[nextIndex]);
    };

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setShowHelpMenu(false);
            }
        };

        if (showHelpMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHelpMenu]);

    const handleOpenTasksOnboarding = () => {
        // Disparar evento customizado que AgendaPage escuta
        window.dispatchEvent(new CustomEvent('open-tasks-onboarding'));
        setShowHelpMenu(false);
    };
    
    return (
         <header className="flex-shrink-0 h-16 flex items-center justify-between bg-white dark:bg-gray-800 px-4 border-b border-gray-200 dark:border-gray-700">
             <div className="flex items-center">
                <button onClick={onMenuClick} className="md:hidden mr-4 text-gray-600 dark:text-gray-300" aria-label="Menu">
                    <MenuIcon className="w-6 h-6"/>
                </button>
             </div>
             
             <div className="flex items-center gap-2">
                {/* Menu Ajuda */}
                <div className="relative" ref={helpMenuRef}>
                    <TooltipHint label={t('help')}>
                        <button
                            type="button"
                            onClick={() => setShowHelpMenu(!showHelpMenu)}
                            aria-label={t('help')}
                            aria-expanded={showHelpMenu}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                            </svg>
                        </button>
                    </TooltipHint>

                    {/* Dropdown Menu */}
                    {showHelpMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                            <button
                                onClick={handleOpenTasksOnboarding}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Ver onboarding de Tarefas
                            </button>
                        </div>
                    )}
                </div>

                <button onClick={cycleLanguage} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center">
                    <GlobeIcon className="w-5 h-5" />
                    <span className="ml-2 text-xs font-bold uppercase">{language}</span>
                </button>
             </div>
          </header>
    );
}

export default Header;