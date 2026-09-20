import { useState, useEffect } from 'react';
import { Shield, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Location, AssetLocation, Free } from '../types/models';
import { fetchFreeByLocationIdAdmin, addFreeTime, deleteFreeTime } from '../services/api';

interface FreePageProps {
  locations: Location[];
  assetLocations: AssetLocation[];
  onError: (msg: string | null) => void;
  onSuccess: (msg: string | null) => void;
  formatDateTime: (isoStr: string) => string;
  getAssetLocationName: (assetId: number) => string;
}

const formatToLocalISO = (date: Date): string => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDefaultStartTime = (): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return formatToLocalISO(new Date(now.getTime() + 60 * 60 * 1000));
};

const getDefaultEndTime = (): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return formatToLocalISO(new Date(now.getTime() + 25 * 60 * 60 * 1000));
};

const getBackendLocalISO = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  if (dateTimeStr.length === 16) {
    return `${dateTimeStr}:00`;
  }
  return dateTimeStr.slice(0, 19);
};

export default function FreePage({
  locations,
  assetLocations,
  onError,
  onSuccess,
  formatDateTime,
  getAssetLocationName,
}: FreePageProps) {
  const [adminFreeLocationId, setAdminFreeLocationId] = useState<number>(() => locations[0]?.id || 1);
  const [adminFreeList, setAdminFreeList] = useState<Free[]>([]);
  const [adminFreeLoading, setAdminFreeLoading] = useState<boolean>(false);
  const [newFreeAssetId, setNewFreeAssetId] = useState<number>(() => assetLocations[0]?.assetId || 1);
  const [newFreeStartTime, setNewFreeStartTime] = useState<string>(getDefaultStartTime);
  const [newFreeEndTime, setNewFreeEndTime] = useState<string>(getDefaultEndTime);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;
    async function loadFree() {
      setAdminFreeLoading(true);
      onError(null);
      try {
        const data = await fetchFreeByLocationIdAdmin(adminFreeLocationId);
        if (!isCancelled) setAdminFreeList(data);
      } catch (err: unknown) {
        console.error(err);
        if (!isCancelled) onError('Kunde inte hämta lediga tider för admin.');
      } finally {
        if (!isCancelled) setAdminFreeLoading(false);
      }
    }
    loadFree();
    return () => {
      isCancelled = true;
    };
  }, [adminFreeLocationId, reloadKey, onError]);

  const handleAddFreeTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreeStartTime || !newFreeEndTime) {
      onError('Välj både start- och sluttid.');
      onSuccess(null);
      return;
    }
    setAdminFreeLoading(true);
    onError(null);
    onSuccess(null);
    try {
      await addFreeTime(
        newFreeAssetId,
        getBackendLocalISO(newFreeStartTime),
        getBackendLocalISO(newFreeEndTime)
      );
      onError(null);
      onSuccess('Ny ledig tid skapad!');
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      onSuccess(null);
      if (err instanceof Error && err.message) {
        onError(err.message);
      } else {
        onError('Misslyckades med att skapa ledig tid.');
      }
    } finally {
      setAdminFreeLoading(false);
    }
  };

  const handleDeleteFreeTime = async (freeId: number) => {
    if (!window.confirm(`Vill du ta bort ledig tidslucka #${freeId}?`)) return;
    setAdminFreeLoading(true);
    onError(null);
    onSuccess(null);
    try {
      await deleteFreeTime(freeId);
      onError(null);
      onSuccess(`Ledig tidslucka #${freeId} togs bort.`);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      onSuccess(null);
      if (err instanceof Error && err.message) {
        onError(err.message);
      } else {
        onError('Kunde inte ta bort ledig tid.');
      }
    } finally {
      setAdminFreeLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            a51. Hantera lediga tider (BOOKADMIN)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visa, skapa och ta bort lediga tidsluckor i systemet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="admin-loc" className="text-xs font-semibold text-slate-600">
            Välj plats:
          </label>
          <select
            id="admin-loc"
            value={adminFreeLocationId}
            onChange={(e) => setAdminFreeLocationId(Number(e.target.value))}
            className="border border-purple-200 rounded-xl p-2 text-sm bg-purple-50/40 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} (ID: {loc.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Free Timeslot Form */}
      <form
        onSubmit={handleAddFreeTime}
        className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4"
      >
        <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-purple-600" />
          Skapa ny ledig tidslucka
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resurs / Asset
            </label>
            <select
              value={newFreeAssetId}
              onChange={(e) => setNewFreeAssetId(Number(e.target.value))}
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
            >
              {assetLocations
                .filter((al) => al.locationId === adminFreeLocationId || true)
                .map((al) => (
                  <option key={al.assetId} value={al.assetId}>
                    {al.name} (ID: {al.assetId})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Starttid
            </label>
            <input
              type="datetime-local"
              value={newFreeStartTime}
              onChange={(e) => setNewFreeStartTime(e.target.value)}
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sluttid
            </label>
            <input
              type="datetime-local"
              value={newFreeEndTime}
              onChange={(e) => setNewFreeEndTime(e.target.value)}
              className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
              required
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={adminFreeLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {adminFreeLoading ? 'Sparar...' : 'Lägg till ledig tid'}
          </button>
        </div>
      </form>

      {/* List of Free Timeslots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">
            Aktuella lediga tider för vald plats ({adminFreeList.length} st)
          </h3>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${adminFreeLoading ? 'animate-spin' : ''}`} />
            Uppdatera lista
          </button>
        </div>

        {adminFreeList.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
            Inga lediga tider registrerade för denna plats.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Resurs</th>
                  <th className="p-3">Starttid</th>
                  <th className="p-3">Sluttid</th>
                  <th className="p-3 text-right">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminFreeList.map((free) => (
                  <tr key={free.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono text-xs">#{free.id}</td>
                    <td className="p-3 font-medium text-slate-900">{getAssetLocationName(free.assetId)}</td>
                    <td className="p-3">{formatDateTime(free.startTime)}</td>
                    <td className="p-3">{formatDateTime(free.endTime)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteFreeTime(free.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        title="Ta bort ledig tid"
                      >
                        <Trash2 className="w-4 h-4" />
                        Ta bort
                      </button>
                    </td>
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

