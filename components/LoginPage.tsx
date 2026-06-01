import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { GoogleIcon, EyeIcon, EyeOffIcon } from './icons';

interface LoginPageProps {
  onLogin: () => void;
  onNavigateToLanding: () => void;
  onNavigateToSignup: () => void;
}

  const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToLanding, onNavigateToSignup }) => {
    const context = useContext(AppContext);
  const { login, googleLogin } = useContext(AuthContext);
    const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
  // Reset explícito ao montar para não herdar estados anteriores
  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setSubmitting(false);
    setError(null);
  }, []);
    
    if (!context) return null;
    const { t, notify } = context;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-[#4285F4] relative items-center justify-center p-12 text-white flex-col">
          <div className="absolute top-8 left-8 text-2xl font-bold">
              Flow
          </div>
          <div className="z-10 text-center">
            <h1 className="text-5xl font-bold mb-4">{t('login_welcome')}</h1>
            <p className="text-lg max-w-sm">{t('login_welcome_tagline')}</p>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-lg transform rotate-45"></div>
      </div>

      {/* Right login form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:hidden">
                 <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">Flow</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Entre na sua conta</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
                {t('no_account')}{' '}
                <button onClick={onNavigateToSignup} className="font-medium text-indigo-600 hover:text-indigo-500">{t('create_account')}</button>
            </p>
            
            <form autoComplete="off" onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setSubmitting(true);
              try {
                await login({ email, password });
                onLogin();
              } catch (err: unknown) {
                let msg = 'Credenciais inválidas ou erro de conexão.';
                try {
                  const t = err instanceof Error ? err.message : '';
                  if (t.startsWith('{')) {
                    const j = JSON.parse(t) as { message?: string | string[]; code?: string };
                    if (Array.isArray(j.message)) msg = j.message.join(', ');
                    else if (typeof j.message === 'string') msg = j.message;
                  }
                } catch {
                  /* keep default */
                }
                setError(msg);
              } finally {
                setSubmitting(false);
              }
            }}>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input name="login-email" autoComplete="off" value={email} onChange={(e)=>setEmail(e.target.value)} type="email" id="login-email" required placeholder="voce@empresa.com" className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                     <div className="relative">
                        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sua senha</label>
                        <input name="login-password" autoComplete="off" value={password} onChange={(e)=>setPassword(e.target.value)} type={showPassword ? "text" : "password"} id="login-password" required className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                           {showPassword ? <EyeOffIcon/> : <EyeIcon/>}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                     <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500">{t('forgot_password')}</a>
                </div>

                <div className="mt-8">
                    <button disabled={submitting} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Entrar
                    </button>
                </div>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </form>

            <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t('or_divider')}</span>
                </div>
            </div>

            <div className="mt-6">
                <button
                  onClick={async () => {
                    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string | undefined;
                    if (!clientId || !(window as any).google?.accounts?.id) {
                      notify?.(t('google_oauth_not_configured'));
                      return;
                    }
                    (window as any).google.accounts.id.initialize({
                      client_id: clientId,
                      callback: async (resp: any) => {
                        if (resp?.credential) {
                          try {
                            await googleLogin(resp.credential);
                            onLogin();
                          } catch {
                            notify?.(t('google_sign_in_failed'));
                          }
                        }
                      },
                    });
                    (window as any).google.accounts.id.prompt(); // one-tap
                  }}
                  className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                   <GoogleIcon className="w-5 h-5 mr-3" />
                    {t('login_with_google')}
                </button>
            </div>
            <div className="mt-4 text-center">
                 <button onClick={onNavigateToLanding} className="text-sm text-indigo-600 hover:text-indigo-500">&larr; Voltar para a página inicial</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
