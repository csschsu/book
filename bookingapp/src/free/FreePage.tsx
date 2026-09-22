import React, { useEffect, useState } from 'react';
import { Location, AssetLocation, Free } from '../types/models';
import { fetchLocations, fetchAssetLocations, fetchFreeByLocationIdAdmin, addFreeTime, deleteFreeTime } from '../services/api';
import moment from 'moment';
import { Plus, Trash2, Calendar, Clock, Loader2, AlertTriangle } from 'lucide-react';

export const FreePage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const [assetLocations, setAssetLocations] = useState<AssetLocation[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number>(0);

  const [freeBlocks, setFreeBlocks] = useState<Free[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New free time form (Calendar date + Swedish 24h clock)
  const [startDate, setStartDate] = useState<string>(moment().add(1, 'day').format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endDate, setEndDate] = useState<string>(moment().add(1, 'day').format('YYYY-MM-DD'));
  const [endTime, setEndTime] = useState<string>('17:00');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocationId > 0) {
      loadFreeBlocks(selectedLocationId);
    }
  }, [selectedLocationId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [locs, assets] = await Promise.all([
        fetchLocations(),
        fetchAssetLocations(),
      ]);
      setLocations(locs);
      setAssetLocations(assets);
      if (locs.length > 0) {
        setSelectedLocationId(locs[0].id);
        const firstLocAssets = assets.filter((a: AssetLocation) => a.locationId === locs[0].id);
        if (firstLocAssets.length > 0) {
          setSelectedAssetId(firstLocAssets[0].assetId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta data');
    } finally {
      setLoading(false);
    }
  };

  const loadFreeBlocks = async (locId: number) => {
    try {
      setLoading(true);
      setError(null);
      const blocks = await fetchFreeByLocationIdAdmin(locId);
      setFreeBlocks(blocks);
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta lediga tider');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locId: number) => {
    setSelectedLocationId(locId);
    const locAssets = assetLocations.filter(a => a.locationId === locId);
    if (locAssets.length > 0) {
      setSelectedAssetId(locAssets[0].assetId);
    } else {
      setSelectedAssetId(0);
    }
  };

  const handleAddFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setError('Välj en resurs att lägga till tid för');
      return;
    }

    const startStr = `${startDate} ${startTime.trim().replace('.', ':')}`;
    const endStr = `${endDate} ${endTime.trim().replace('.', ':')}`;

    const startMoment = moment(startStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm'], true);
    const endMoment = moment(endStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm'], true);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      setError('Starttid och Sluttid måste ha giltigt datum och tid i 24-timmars format (t.ex. 09:00)');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const startIso = startMoment.format('YYYY-MM-DDTHH:mm:ss');
      const endIso = endMoment.format('YYYY-MM-DDTHH:mm:ss');
      await addFreeTime(selectedAssetId, startIso, endIso);
      setSuccess('Ledig tid har registrerats!');
      await loadFreeBlocks(selectedLocationId);
    } catch (err: any) {
      setError(err.message || 'Kunde inte lägga till ledig tid');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (freeId: number) => {
    if (!window.confirm('Är du säker på att du vill ta bort detta tidsblock?')) return;
    try {
      setError(null);
      await deleteFreeTime(freeId);
      setSuccess('Tidsblock borttaget.');
      await loadFreeBlocks(selectedLocationId);
    } catch (err: any) {
      setError(err.message || 'Kunde inte ta bort tidsblock');
    }
  };

  const filteredAssets = assetLocations.filter(a => a.locationId === selectedLocationId);
  const displayBlocks = selectedAssetId > 0
    ? freeBlocks.filter(f => f.assetId === selectedAssetId)
    : freeBlocks;

  return (
    <div>
      <h1 className="page-title">Hantera lediga tider (Admin)</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
        Registrera och ta bort lediga tidsluckor för resurser på dina anläggningar.
      </p>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Form: Add free time */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Plus size={20} color="var(--primary)" /> Lägg till ny ledig tid
          </h2>

          <form onSubmit={handleAddFree}>
            <div className="form-group">
              <label className="form-label">Plats</label>
              <select
                className="form-input"
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(Number(e.target.value))}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resurs</label>
              <select
                className="form-input"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(Number(e.target.value))}
              >
                {filteredAssets.map(asset => (
                  <option key={asset.assetId} value={asset.assetId}>
                    {asset.name} (ID: {asset.assetId})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Starttid</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch { }
                  }}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="09:00"
                  list="time-presets"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ textAlign: 'center' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sluttid</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    try { (e.currentTarget as any).showPicker?.(); } catch { }
                  }}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="17:00"
                  list="time-presets"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ textAlign: 'center' }}
                  required
                />
              </div>
            </div>

            <datalist id="time-presets">
              <option value="06:00" />
              <option value="07:00" />
              <option value="08:00" />
              <option value="08:30" />
              <option value="09:00" />
              <option value="09:30" />
              <option value="10:00" />
              <option value="10:30" />
              <option value="11:00" />
              <option value="11:30" />
              <option value="12:00" />
              <option value="12:30" />
              <option value="13:00" />
              <option value="13:30" />
              <option value="14:00" />
              <option value="14:30" />
              <option value="15:00" />
              <option value="15:30" />
              <option value="16:00" />
              <option value="16:30" />
              <option value="17:00" />
              <option value="17:30" />
              <option value="18:00" />
              <option value="18:30" />
              <option value="19:00" />
              <option value="19:30" />
              <option value="20:00" />
              <option value="20:30" />
              <option value="21:00" />
              <option value="21:30" />
              <option value="22:00" />
            </datalist>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Spara ledig tid
            </button>
          </form>
        </div>

        {/* Filter controls */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>Filtrera visning</h2>
          <div className="form-group">
            <label className="form-label">Visa för resurs</label>
            <select
              className="form-input"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(Number(e.target.value))}
            >
              <option value={0}>Alla resurser på denna plats</option>
              {filteredAssets.map(asset => (
                <option key={asset.assetId} value={asset.assetId}>
                  {asset.name} (ID: {asset.assetId})
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', lineHeight: '1.6' }}>
            <p><strong>Regler för ledig tid:</strong></p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li>Starttiden måste vara i framtiden.</li>
              <li>Sluttiden måste vara efter starttiden.</li>
              <li>Ny tid får inte krocka med redan registrerad ledig tid för samma resurs.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Free Blocks Table */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
        Registrerade lediga tider ({displayBlocks.length})
      </h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        </div>
      ) : displayBlocks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: 'var(--radius)', color: 'var(--gray-500)' }}>
          Inga lediga tider registrerade för detta val.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Resursnamn</th>
                <th>Starttid</th>
                <th>Sluttid</th>
                <th>Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {displayBlocks.map((block) => {
                const assetMatch = assetLocations.find(a => a.assetId === block.assetId);
                const isPast = moment(block.endTime).isBefore(moment());
                return (
                  <tr key={block.id} style={{ opacity: isPast ? 0.6 : 1 }}>
                    <td>#{block.id}</td>
                    <td>{assetMatch ? assetMatch.name : `Resurs ${block.assetId}`}</td>
                    <td>{moment(block.startTime).format('YYYY-MM-DD HH:mm')}</td>
                    <td>
                      {moment(block.endTime).format('YYYY-MM-DD HH:mm')}
                      {isPast && <span style={{ marginLeft: '0.5rem', color: 'var(--danger)', fontSize: '0.75rem' }}>(Passerad)</span>}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(block.id)}
                      >
                        <Trash2 size={14} /> Ta bort
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
