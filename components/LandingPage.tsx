import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import { CalendarIcon, ZapIcon, UsersIcon, CheckIcon } from './icons';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToSignup: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, onNavigateToSignup }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { t } = context;

    const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    );
    
    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Flow</span>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <Link
                            to="/landing-v2"
                            className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            {t('landing_try_v2')}
                        </Link>
                        <button onClick={onNavigateToLogin} className="text-sm font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{t('landing_login')}</button>
                        <button onClick={onNavigateToSignup} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-colors">{t('landing_free_trial')}</button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-24">
                <section className="container mx-auto px-6 py-20 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
                        {t('landing_hero_title')}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
                        {t('landing_hero_subtitle')}
                    </p>
                    <button onClick={onNavigateToSignup} className="px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">
                        {t('landing_free_trial')}
                    </button>
                </section>

                {/* Features Section */}
                <section className="bg-white dark:bg-gray-800 py-20">
                    <div className="container mx-auto px-6">
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard 
                                icon={<CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>}
                                title={t('landing_feature_1_title')}
                                description={t('landing_feature_1_desc')}
                            />
                             <FeatureCard 
                                icon={<ZapIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>}
                                title={t('landing_feature_2_title')}
                                description={t('landing_feature_2_desc')}
                            />
                             <FeatureCard 
                                icon={<UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>}
                                title={t('landing_feature_3_title')}
                                description={t('landing_feature_3_desc')}
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 dark:bg-gray-900/50 py-8">
                <div className="container mx-auto px-6 text-center text-gray-500 dark:text-gray-400">
                   <p>{t('landing_footer_text')}</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;