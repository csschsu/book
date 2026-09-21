import React, { useState } from 'react';
import { login } from '../services/api';
import { AuthSession } from '../types/models';
import { X, Lock, Mail, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState<string>('user1@example.com');
  const [password, setPassword] = useState<string>('password123');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const session = await login(identifier, password);
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Inloggningen misslyckades. Kontrollera uppgifterna.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string) => {
    setIdentifier(email);
    setPassword('password123');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Logga in</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-post eller ID</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="user1@example.com"
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
                required
              />
              <Lock size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Logga in'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Snabbval testanvändare:</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => fillCredentials('user1@example.com')}
            >
              user1 (Admin)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => fillCredentials('user2@example.com')}
            >
              user2 (Admin+User)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => fillCredentials('user3@example.com')}
            >
              user3 (User)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

