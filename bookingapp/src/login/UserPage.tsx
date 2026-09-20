import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw } from 'lucide-react';
import type { User } from '../types/models';
import { fetchUsers, addUser } from '../services/api';

interface UserPageProps {
  onError: (msg: string | null) => void;
  onSuccess: (msg: string | null) => void;
  formatDateTime: (isoStr: string) => string;
}

export default function UserPage({
  onError,
  onSuccess,
  formatDateTime,
}: UserPageProps) {
  const [adminUsersList, setAdminUsersList] = useState<User[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRoles, setNewUserRoles] = useState<string[]>(['BOOKUSER']);
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;
    async function loadUsers() {
      setAdminUsersLoading(true);
      onError(null);
      try {
        const data = await fetchUsers();
        if (!isCancelled) setAdminUsersList(data);
      } catch (err: unknown) {
        console.error(err);
        if (!isCancelled) onError('Kunde inte hämta användarlistan.');
      } finally {
        if (!isCancelled) setAdminUsersLoading(false);
      }
    }
    loadUsers();
    return () => {
      isCancelled = true;
    };
  }, [reloadKey, onError]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      onError('E-post och lösenord krävs.');
      onSuccess(null);
      return;
    }
    if (newUserPassword.length < 6) {
      onError('Lösenordet måste vara minst 6 tecken.');
      onSuccess(null);
      return;
    }
    if (newUserRoles.length === 0) {
      onError('Välj minst en roll.');
      onSuccess(null);
      return;
    }

    setAdminUsersLoading(true);
    onError(null);
    onSuccess(null);
    try {
      const email = newUserEmail.trim();
      await addUser({
        email,
        password: newUserPassword,
        role: newUserRoles.join(','),
        code: 0,
        address: {
          email,
          phone: newUserPhone.trim() || '',
        },
      });
      onError(null);
      onSuccess(`Användaren ${email} har skapats!`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      onSuccess(null);
      onError('Misslyckades med att skapa användare. E-posten kan redan vara registrerad.');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const toggleRole = (roleToToggle: string) => {
    if (newUserRoles.includes(roleToToggle)) {
      if (newUserRoles.length > 1) {
        setNewUserRoles(newUserRoles.filter((r) => r !== roleToToggle));
      }
    } else {
      setNewUserRoles([...newUserRoles, roleToToggle]);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          a61 & a62. Hantera användare (BOOKADMIN)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Visa alla registrerade användare och lägg till nya användare med krypterat lösenord
        </p>
      </div>

      {/* a61: Add User Form */}
      <form
        onSubmit={handleAddUser}
        className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4"
      >
        <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-purple-600" />
          a61. Lägg till ny användare
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-postadress (a11)
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="namn@example.com"
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lösenord (a12 - minst 6 tecken, sparas krypterat)
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Minst 6 tecken"
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telefonnummer (valfritt)
            </label>
            <input
              type="tel"
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(e.target.value)}
              placeholder="070-1234567"
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Rollar (a15)
            </label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={newUserRoles.includes('BOOKUSER')}
                  onChange={() => toggleRole('BOOKUSER')}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                BOOKUSER
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={newUserRoles.includes('BOOKADMIN')}
                  onChange={() => toggleRole('BOOKADMIN')}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                BOOKADMIN
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={adminUsersLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {adminUsersLoading ? 'Skapar...' : 'Skapa användare (a61)'}
          </button>
        </div>
      </form>

      {/* a62: View Users Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">
            a62. Registrerade användare ({adminUsersList.length} st)
          </h3>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${adminUsersLoading ? 'animate-spin' : ''}`} />
            Uppdatera
          </button>
        </div>

        {adminUsersList.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
            Inga användare hämtade.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">E-post</th>
                  <th className="p-3">Rollar</th>
                  <th className="p-3">Kod</th>
                  <th className="p-3">Skapad</th>
                  <th className="p-3">Telefon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminUsersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono text-xs">#{u.id}</td>
                    <td className="p-3 font-medium text-slate-900">{u.email}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {u.role.split(',').map((r) => (
                          <span
                            key={r}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r === 'BOOKADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">{u.code}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {u.createtime ? formatDateTime(u.createtime) : '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">{u.address?.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

