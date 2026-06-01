import React from 'react';
import { Theme } from '../types';
import { AppContextType } from '../types';
import { EditIcon, MoonIcon, SunIcon, LogOutIcon, SettingsIcon } from './icons';

interface ProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    onEditProfile: () => void;
    onOpenSettings?: () => void;
    showSettings?: boolean;
    showNavigationActions?: boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    t: AppContextType['t'];
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
    isOpen,
    onClose,
    onLogout,
    onEditProfile,
    onOpenSettings,
    showSettings = false,
    showNavigationActions = true,
    theme,
    setTheme,
    t,
}) => {
    if (!isOpen) return null;

    const toggleTheme = () => {
        const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
        setTheme(newTheme);
    };

    return (
        <div className="absolute bottom-full mb-2 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-50">
            <div className="p-2">
                {showNavigationActions && (
                    <>
                        <button
                            type="button"
                            onClick={() => { onEditProfile(); onClose(); }}
                            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                        >
                            <EditIcon className="w-4 h-4" />
                            <span>{t('account_nav_my_account')}</span>
                        </button>
                        {showSettings && onOpenSettings && (
                            <button
                                type="button"
                                onClick={() => { onOpenSettings(); onClose(); }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                            >
                                <SettingsIcon className="w-4 h-4" />
                                <span>{t('settings')}</span>
                            </button>
                        )}
                    </>
                )}
                <button
                    onClick={toggleTheme}
                    className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                >
                    <div className="flex items-center gap-3">
                         {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
                        <span>{t('theme_mode')}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {theme === 'light' ? t('dark_theme') : t('light_theme')}
                    </span>
                </button>
            </div>
            <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md"
                >
                    <LogOutIcon className="w-4 h-4" />
                    <span>{t('logout')}</span>
                </button>
            </div>
        </div>
    );
};

export default ProfileMenu;