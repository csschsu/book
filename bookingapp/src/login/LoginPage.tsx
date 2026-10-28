import React, { useState, useEffect } from 'react';
import { login, fetchAuthConfig, registerUser } from '../services/api';
import { AuthSession } from '../types/models';
import { X, Lock, Mail, Loader2, CheckCircle2, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  onBackToCalendar?: () => void;
  notice?: string | null;
  initialMode?: 'login' | 'register';
}

type Mode = 'login' | 'register' | 'registered';

export const LoginPage: React.FC<LoginPageProps> = ({
  onClose,
  onLoginSuccess,
  onBackToCalendar,
  notice,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [allowRegister, setAllowRegister] = useState<boolean>(false);

  // Login form state
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Register form state
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(notice || null);

  useEffect(() => {
    fetchAuthConfig().then((cfg) => {
      if (cfg?.bookUserAdd) {
        setAllowRegister(true);
      }
    });
  }, []);

  useEffect(() => {
    setIdentifier('');
    setPassword('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setError(null);
    setInfoNotice(notice || null);
    setMode(initialMode || 'login');
  }, [notice, initialMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setInfoNotice(null);
      const session = await login(identifier, password);
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Inloggningen misslyckades. Kontrollera uppgifterna.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setError('Lösenorden matchar inte.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Lösenordet måste bestå av minst 8 tecken.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfoNotice(null);
      await registerUser(regEmail.trim(), regPassword);
      setMode('registered');
    } catch (err: any) {
      setError(err.message || 'Registreringen misslyckades.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLogin = () => {
    setIdentifier(regEmail.trim());
    setPassword('');
    setError(null);
    setInfoNotice(null);
    setMode('login');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            {mode === 'login' && 'Logga in'}
            {mode === 'register' && 'Registrera ny användare'}
            {mode === 'registered' && 'Registrering klar'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>

        {infoNotice && !error && <div className="alert-warning" style={{ marginBottom: '1rem' }}>{infoNotice}</div>}
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* 1. Login Mode */}
        {mode === 'login' && (
          <>
            <form onSubmit={handleLoginSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">E-post eller ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="din.epost@example.com"
                    autoComplete="off"
                    required
                  />
                  <Mail size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lösenord</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Lösenord"
                    autoComplete="new-password"
                    required
                  />
                  <Lock size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Logga in'}
              </button>
            </form>

            {allowRegister && (
              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>Inget konto än? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setInfoNotice(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Registrera ny användare
                </button>
              </div>
            )}

            {onBackToCalendar && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onBackToCalendar}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                  }}
                >
                  tillbaka till kalender
                </button>
              </div>
            )}
          </>
        )}

        {/* 2. Register Mode (Punkt 1b) */}
        {mode === 'register' && (
          <>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Ange din e-postadress och önskat lösenord. Efter registrering skickas ett verifieringsmail med en länk som du behöver klicka på för att aktivera ditt konto innan du loggar in och bokar.
            </p>
            <form onSubmit={handleRegisterSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">E-postadress</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="din.epost@example.com"
                    autoComplete="off"
                    required
                  />
                  <Mail size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Önskat lösenord</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minst 8 tecken"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <Lock size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bekräfta lösenord</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Upprepa lösenord"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <Lock size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Registrera användare
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfoNotice(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-500)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Tillbaka till inloggning
              </button>

              {onBackToCalendar && (
                <button
                  type="button"
                  onClick={onBackToCalendar}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                  }}
                >
                  tillbaka till kalender
                </button>
              )}
            </div>
          </>
        )}

        {/* 3. Registered Mode (Punkt 1b.3.1 i TODO.txt) */}
        {mode === 'registered' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: '#dcfce7', borderRadius: '50%', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>

            <div
              className="alert-success"
              style={{
                marginBottom: '1.5rem',
                textAlign: 'left',
                lineHeight: 1.5,
                fontSize: '0.95rem',
              }}
            >
              <strong>Verifiera registrering med mottaget mail, logga därefter in</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                Ett verifieringsmail har skickats till <strong>{regEmail}</strong>. Klicka på länken i mailet för att aktivera ditt konto innan du loggar in.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleStartLogin}
            >
              Start login
            </button>

            {onBackToCalendar && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onBackToCalendar}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                  }}
                >
                  tillbaka till kalender
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
