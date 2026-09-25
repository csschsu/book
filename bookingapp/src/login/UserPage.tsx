import React, { useEffect, useState } from 'react';
import { User } from '../types/models';
import { fetchUsers, addUser, updateUser, getAuthSession, setAuthSession } from '../services/api';
import { UserPlus, Users, Loader2, Edit2, Check } from 'lucide-react';

export const UserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected user for editing (null means create mode)
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state for all user fields
  const [email, setEmail] = useState<string>('');
  const [alias, setAlias] = useState<string>('');
  const [password, setPassword] = useState<string>('password123');
  const [role, setRole] = useState<string>('BOOKUSER');
  const [phone, setPhone] = useState<string>('070-123456');
  const [code, setCode] = useState<number>(0);
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

  const handleSelectUser = (u: User) => {
    setEditingUser(u);
    setEmail(u.email);
    setAlias(u.alias || '');
    setPassword(''); // leave blank unless updating
    setRole(u.role);
    setPhone(u.address?.phone || '');
    setCode(u.code ?? 0);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEmail('');
    setAlias('');
    setPassword('password123');
    setRole('BOOKUSER');
    setPhone('070-123456');
    setCode(0);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (editingUser) {
        await updateUser(editingUser.id, {
          email,
          alias,
          password: password.trim() ? password.trim() : undefined,
          role,
          code,
          address: {
            email,
            phone,
          },
        });
        const currentSession = getAuthSession();
        if (currentSession && currentSession.id === editingUser.id) {
          currentSession.email = email;
          currentSession.role = role;
          setAuthSession(currentSession);
        }
        setSuccess(`Användare #${editingUser.id} (${email}) har uppdaterats!`);
        handleCancelEdit();
      } else {
        await addUser({
          email,
          alias,
          password,
          role,
          code,
          address: {
            email,
            phone,
          },
        });
        setSuccess(`Användare ${email} har skapats!`);
        setEmail('');
        setAlias('');
        setPassword('password123');
        setCode(0);
      }
      await loadUsers();
    } catch (err: any) {
      setError(err.message || (editingUser ? 'Kunde inte uppdatera användare' : 'Kunde inte skapa användare'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Användarhantering (Admin)</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
        Översikt över alla registrerade systemanvändare samt skapande och redigering av konton.
      </p>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* User form (Create or Edit) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              {editingUser ? (
                <>
                  <Edit2 size={20} color="var(--primary)" /> Redigera användare #{editingUser.id}
                </>
              ) : (
                <>
                  <UserPlus size={20} color="var(--primary)" /> Skapa ny användare
                </>
              )}
            </h2>
            {editingUser && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
              >
                Avbryt
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
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
              <label className="form-label">Alias</label>
              <input
                type="text"
                className="form-input"
                placeholder="t.ex. Alias: 1"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {editingUser ? 'Nytt lösenord (valfritt)' : 'Lösenord'}
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                placeholder={editingUser ? 'Lämna tomt för att behålla befintligt' : 'Lösenord'}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUser}
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

            <div className="form-group">
              <label className="form-label">Kod</label>
              <input
                type="number"
                className="form-input"
                value={code}
                onChange={(e) => setCode(Number(e.target.value) || 0)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : editingUser ? (
                  <Check size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                {editingUser ? 'Spara ändringar' : 'Skapa konto'}
              </button>
              {editingUser && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Avbryt
                </button>
              )}
            </div>
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
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: 0 }}>
              Alias visas på bokning i kalender
            </p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Användarlista</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
          Klicka på en användare i listan för att redigera den
        </span>
      </div>

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
                <th>Alias</th>
                <th>E-post</th>
                <th>Roll</th>
                <th>Telefon</th>
                <th>Kod</th>
                <th>Skapad</th>
                <th style={{ textAlign: 'center' }}>Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelected = editingUser?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined,
                    }}
                    title="Klicka för att redigera användaren"
                  >
                    <td>#{u.id}</td>
                    <td><strong>{u.alias || '-'}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="role-tag">
                        {u.role}
                      </span>
                    </td>
                    <td>{u.address?.phone || '-'}</td>
                    <td>{u.code ?? 0}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {u.createtime ? u.createtime.substring(0, 19).replace('T', ' ') : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(u);
                        }}
                      >
                        <Edit2 size={13} /> Redigera
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
