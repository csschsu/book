import { useState } from 'react';
import { X, KeyRound, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import type { Timeslot, AuthSession } from '../types/models';
import { login as apiLogin } from '../services/api';

interface LoginPageProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  pendingBookingSlot: Timeslot | null;
  loginError: string | null;
  setLoginError: (err: string | null) => void;
}

export default function LoginPage({
  isOpen,
  onClose,
  onLoginSuccess,
  pendingBookingSlot,
  loginError,
  setLoginError,
}: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState<string>('user@example.com');
  const [loginPassword, setLoginPassword] = useState<string>('user123');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const newSession = await apiLogin(loginEmail.trim(), loginPassword);
      onLoginSuccess(newSession);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError('Felaktig e-post eller lösenord.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900">
          Logga in (a41)
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {pendingBookingSlot
            ? 'Logga in för att slutföra din bokning.'
            : 'Ange din e-post och lösenord för att autentisera.'}
        </p>

        {loginError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Quick Demo Credentials */}
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Snabbval demo-konton:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('user@example.com', 'user123')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              user@example.com (BOOKUSER)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@example.com', 'admin123')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
            >
              admin@example.com (BOOKADMIN)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('super@example.com', 'super123')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              super@example.com (Dual)
            </button>
          </div>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-post (Användar-ID)
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="din@epost.se"
              className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lösenord
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Lösenord"
              className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loginLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loggar in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Logga in
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

