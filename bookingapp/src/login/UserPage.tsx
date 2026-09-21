import React, { useEffect, useState } from 'react';
import { User } from '../types/models';
import { fetchUsers, addUser } from '../services/api';
import { UserPlus, Users, Loader2 } from 'lucide-react';

export const UserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('password123');
  const [role, setRole] = useState<string>('BOOKUSER');
  const [phone, setPhone] = useState<string>('070-123456');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta användarlistan');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await addUser({
        email,
        password,
        role,
        address: {
          email,
          phone,
        },
      });
      setSuccess(`Användare ${email} har skapats!`);
      setEmail('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Kunde inte skapa användare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Användarhantering (Admin)</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
        Översikt över alla registrerade systemanvändare samt skapande av nya konton.
      </p>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Create user form */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <UserPlus size={20} color="var(--primary)" /> Skapa ny användare
          </h2>

          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label">E-postadress</label>
              <input
                type="email"
                className="form-input"
                placeholder="namn@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lösenord</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="BOOKUSER">BOOKUSER (Standard användare)</option>
                <option value="BOOKADMIN">BOOKADMIN (Administratör)</option>
                <option value="BOOKUSER,BOOKADMIN">BOOKUSER,BOOKADMIN (Båda roller)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input
                type="text"
                className="form-input"
                placeholder="070-123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
              Skapa konto
            </button>
          </form>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--gray-100)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={32} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{users.length}</div>
              <div style={{ color: 'var(--gray-500)' }}>Registrerade användare i systemet</div>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', lineHeight: '1.6' }}>
            Användare med rollen <strong>BOOKADMIN</strong> har behörighet att hantera lediga tider, skapa konton och konfigurera resurser. Användare med <strong>BOOKUSER</strong> kan genomföra och boka tider.
          </p>
        </div>
      </div>

      {/* Users table */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Användarlista</h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>E-post</th>
                <th>Roll</th>
                <th>Telefon</th>
                <th>Skapad</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.email}</strong></td>
                  <td>
                    <span className="role-tag">
                      {u.role}
                    </span>
                  </td>
                  <td>{u.address?.phone || '-'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {u.createtime ? u.createtime.substring(0, 19).replace('T', ' ') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
