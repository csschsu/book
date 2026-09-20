import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  MapPin,
  Box,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import type { Location, AssetLocation, Free } from '../types/models';
import {
  fetchFreeByAssetIdAdmin,
  fetchFreeByLocationIdAdmin,
  addFreeTime,
  deleteFreeTime,
} from '../services/api';

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

const formatDuration = (startStr: string, endStr: string): string => {
  try {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diffMs = end - start;
    if (diffMs <= 0 || isNaN(diffMs)) return '';
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} tim`;
    return `${hours} tim ${mins} min`;
  } catch {
    return '';
  }
};

interface SwedishDateTimeInputProps {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (val: string) => void;
}

function SwedishDateTimeInput({ label, value, onChange }: SwedishDateTimeInputProps) {
  const [datePart = '', timePart = ''] = (value || '').split('T');
  const hourPart = timePart ? timePart.slice(0, 2) : '12';
  const minutePart = timePart ? timePart.slice(3, 5) : '00';

  const handleDateChange = (newDate: string) => {
    onChange(`${newDate}T${hourPart}:${minutePart}`);
  };

  const handleHourChange = (newHour: string) => {
    const d = datePart || new Date().toISOString().slice(0, 10);
    onChange(`${d}T${newHour}:${minutePart}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const d = datePart || new Date().toISOString().slice(0, 10);
    onChange(`${d}T${hourPart}:${newMinute}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label} <span className="text-purple-600 font-normal">(24h)</span>
      </label>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="date"
          value={datePart}
          onChange={(e) => handleDateChange(e.target.value)}
          className="flex-1 min-w-0 border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
          required
        />
        <div className="flex items-center gap-1 bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-purple-400 shrink-0 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium mr-0.5">kl.</span>
          <select
            value={hourPart}
            onChange={(e) => handleHourChange(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            aria-label={`${label} timme`}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-bold">:</span>
          <select
            value={minutePart}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            aria-label={`${label} minut`}
          >
            {minutes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function FreePage({
  locations,
  assetLocations,
  onError,
  onSuccess,
  formatDateTime,
  getAssetLocationName,
}: FreePageProps) {
  // Selected asset
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(() => {
    return assetLocations.length > 0 ? assetLocations[0].assetId : null;
  });

  // Free times for the selected asset
  const [adminFreeList, setAdminFreeList] = useState<Free[]>([]);
  const [adminFreeLoading, setAdminFreeLoading] = useState<boolean>(false);

  // Form states for creating new free time
  const [newFreeStartTime, setNewFreeStartTime] = useState<string>(getDefaultStartTime);
  const [newFreeEndTime, setNewFreeEndTime] = useState<string>(getDefaultEndTime);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Search filter for grid
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep selected asset in sync if assets load after initial mount
  useEffect(() => {
    if (selectedAssetId === null && assetLocations.length > 0) {
      setSelectedAssetId(assetLocations[0].assetId);
    }
  }, [assetLocations, selectedAssetId]);

  // Derived selected asset & location
  // Derived selected asset
  const selectedAsset = useMemo(() => {
    return assetLocations.find((al) => al.assetId === selectedAssetId) ?? null;
  }, [assetLocations, selectedAssetId]);

  // Filtered locations and assets according to search query
  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter((loc) => {
      const matchLocName = loc.name?.toLowerCase().includes(query);
      const locAssets = assetLocations.filter((al) => al.locationId === loc.id);
      const matchAssets = locAssets.some((al) => al.name?.toLowerCase().includes(query));
      return matchLocName || matchAssets;
    });
  }, [locations, assetLocations, searchQuery]);

  // Fetch free times whenever selectedAssetId or reloadKey changes
  useEffect(() => {
    if (selectedAssetId === null) {
      setAdminFreeList([]);
      return;
    }

    let isCancelled = false;
    async function loadFree() {
      setAdminFreeLoading(true);
      onError(null);
      try {
        let data: Free[] = [];
        try {
          // Attempt direct fetch by asset ID
          data = await fetchFreeByAssetIdAdmin(selectedAssetId!);
        } catch {
          // Fallback: fetch by location and filter by assetId
          if (selectedAsset?.locationId) {
            const locData = await fetchFreeByLocationIdAdmin(selectedAsset.locationId);
            data = locData.filter((f) => f.assetId === selectedAssetId);
          }
        }
        if (!isCancelled) {
          // Sort by start time ascending
          data.sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
          setAdminFreeList(data);
        }
      } catch (err: unknown) {
        console.error(err);
        if (!isCancelled) {
          onError('Kunde inte hämta lediga tider för den valda resursen.');
        }
      } finally {
        if (!isCancelled) {
          setAdminFreeLoading(false);
        }
      }
    }

    loadFree();
    return () => {
      isCancelled = true;
    };
  }, [selectedAssetId, selectedAsset?.locationId, reloadKey, onError]);

  // Handle adding new free time
  const handleAddFreeTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      onError('Välj en resurs först.');
      onSuccess(null);
      return;
    }
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
        selectedAsset.assetId,
        getBackendLocalISO(newFreeStartTime),
        getBackendLocalISO(newFreeEndTime)
      );
      onError(null);
      onSuccess(`Ny ledig tid skapad för ${selectedAsset.name}!`);
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

  // Handle deleting a free time slot
  const handleDeleteFreeTime = async (freeId: number) => {
    const assetName = selectedAsset?.name || getAssetLocationName(selectedAssetId || 0);
    if (!window.confirm(`Vill du ta bort ledig tidslucka #${freeId} för ${assetName}?`)) {
      return;
    }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            a51. Hantera lediga tider (BOOKADMIN)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Välj en resurs i rutnätet för att visa, skapa och ta bort dess lediga tider.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrera plats eller resurs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Grid with Locations and Assets */}
      <div>

        {filteredLocations.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
            Inga platser eller resurser matchade sökningen.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => {
              const locAssets = assetLocations.filter((al) => al.locationId === location.id);

              return (
                <div
                  key={location.id}
                  className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Location Card Header */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                            Plats #{location.id}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {locAssets.length} {locAssets.length === 1 ? 'resurs' : 'resurser'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">
                          {location.name}
                        </h4>
                      </div>
                      <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                    </div>

                    {/* Assets Grid / List inside Location */}
                    <div className="mt-3 space-y-1.5">
                      {locAssets.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Inga resurser kopplade till denna plats.
                        </p>
                      ) : (
                        locAssets.map((asset) => {
                          const isSelected = selectedAssetId === asset.assetId;

                          return (
                            <button
                              key={asset.assetId}
                              type="button"
                              onClick={() => setSelectedAssetId(asset.assetId)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group ${isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-300'
                                : 'bg-slate-50/70 hover:bg-purple-50/70 text-slate-700 border-slate-200/80 hover:border-purple-200'
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Box
                                  className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-purple-600'
                                    }`}
                                />
                                <div className="truncate">
                                  <div className="text-xs font-semibold truncate">
                                    {asset.name}
                                  </div>
                                  <div
                                    className={`text-[10px] ${isSelected ? 'text-purple-100' : 'text-slate-500'
                                      }`}
                                  >
                                    ID: #{asset.assetId}
                                  </div>
                                </div>
                              </div>

                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[11px] font-medium bg-purple-700/80 px-2 py-0.5 rounded-md text-white shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Vald
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400 group-hover:text-purple-700 transition-colors shrink-0">
                                  Välj &rarr;
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Asset Workspace */}
      {selectedAsset ? (
        <div className="space-y-6 pt-2">
          {/* List of Free Times for Selected Asset */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Lediga tider för {selectedAsset.name} ({adminFreeList.length} st)
              </h3>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-medium transition-colors"
                title="Uppdatera lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminFreeLoading ? 'animate-spin' : ''}`} />
                Uppdatera lista
              </button>
            </div>

            {adminFreeList.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
                Inga lediga tider finns registrerade för denna resurs.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Starttid</th>
                      <th className="p-3">Sluttid</th>
                      <th className="p-3">Längd</th>
                      <th className="p-3 text-right">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminFreeList.map((free) => (
                      <tr key={free.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono text-xs text-slate-600">#{free.id}</td>
                        <td className="p-3 font-medium text-slate-800">
                          {formatDateTime(free.startTime)}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {formatDateTime(free.endTime)}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {formatDuration(free.startTime, free.endTime)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteFreeTime(free.id)}
                            disabled={adminFreeLoading}
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

          {/* Form: Add New Free Time for Selected Asset */}
          <form
            onSubmit={handleAddFreeTime}
            className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                Lägg till ny ledig tid för {selectedAsset.name}
              </h3>
              <span className="text-xs text-slate-500">
                Resurs-ID: #{selectedAsset.assetId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <SwedishDateTimeInput
                label="Starttid"
                value={newFreeStartTime}
                onChange={setNewFreeStartTime}
              />
              <SwedishDateTimeInput
                label="Sluttid"
                value={newFreeEndTime}
                onChange={setNewFreeEndTime}
              />
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
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-purple-200 rounded-2xl text-purple-900 bg-purple-50/20">
          <Box className="w-8 h-8 mx-auto text-purple-400 mb-2" />
          <p className="font-semibold text-sm">Ingen resurs vald</p>
          <p className="text-xs text-slate-500 mt-1">
            Klicka på en resurs i rutnätet ovan för att se och hantera dess lediga tider.
          </p>
        </div>
      )}
    </div>
  );
}
