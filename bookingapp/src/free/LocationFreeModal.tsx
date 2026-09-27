import React, { useState, useEffect } from 'react';
import { Location, Asset, Free } from '../types/models';
import {
  fetchAssetsByLocation,
  fetchFreeByAssetIdAdmin,
  addFreeTime,
  updateFreeTime,
  deleteFreeTime,
} from '../services/api';
import moment from 'moment';
import {
  X,
  Clock,
  Plus,
  Trash2,
  Calendar,
  Save,
  Loader2,
  Layers,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LocationFreeModalProps {
  isOpen: boolean;
  location: Location | null;
  onClose: () => void;
}

export const LocationFreeModal: React.FC<LocationFreeModalProps> = ({
  isOpen,
  location,
  onClose,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [freeBlocks, setFreeBlocks] = useState<Free[]>([]);
  const [loadingFree, setLoadingFree] = useState<boolean>(false);

  // Time editor state
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [editingFreeId, setEditingFreeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [savingTime, setSavingTime] = useState<boolean>(false);

  // Status / error textbox state (Requirement 3b)
  const [statusText, setStatusText] = useState<string>('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  useEffect(() => {
    if (isOpen && location) {
      loadAssets(location.id);
      setSelectedAsset(null);
      setFreeBlocks([]);
      setIsEditingTime(false);
      setEditingFreeId(null);
      setStatusText('Välj en resurs i listan för att hantera dess lediga tider.');
      setStatusType('neutral');
    }
  }, [isOpen, location]);

  const loadAssets = async (locId: number) => {
    try {
      setLoadingAssets(true);
      const data = await fetchAssetsByLocation(locId);
      setAssets(data);
    } catch (err: any) {
      setStatusText(`Fel vid hämtning av resurser: ${err.message || 'Okänt fel'}`);
      setStatusType('error');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSelectAsset = async (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditingTime(false);
    setEditingFreeId(null);
    setStatusText(`Vald resurs: ${asset.name}. Hämtar registrerade lediga tider...`);
    setStatusType('neutral');
    await loadFreeBlocks(asset.id);
  };

  const loadFreeBlocks = async (assetId: number) => {
    try {
      setLoadingFree(true);
      const blocks = await fetchFreeByAssetIdAdmin(assetId);
      setFreeBlocks(blocks);
      setStatusText(`Hämtade ${blocks.length} lediga tider för resurs.`);
      setStatusType('neutral');
    } catch (err: any) {
      setStatusText(`Fel vid hämtning av lediga tider: ${err.message || 'Okänt fel'}`);
      setStatusType('error');
    } finally {
      setLoadingFree(false);
    }
  };

  // 3a. Click existing free time slot -> open editor with existing values
  const handleSelectFreeTime = (block: Free) => {
    setEditingFreeId(block.id);
    setIsEditingTime(true);
    setStartDate(moment(block.startTime).format('YYYY-MM-DD'));
    setStartTime(moment(block.startTime).format('HH:mm'));
    setEndDate(moment(block.endTime).format('YYYY-MM-DD'));
    setEndTime(moment(block.endTime).format('HH:mm'));
    setStatusText(`Redigerar ledig tid #${block.id}. Justera start-/sluttid och klicka Spara.`);
    setStatusType('neutral');
  };

  // 3c. Click "Registrera ny ledig tid" -> open editor with today's current date and time
  const handleStartNewFreeTime = () => {
    setEditingFreeId(null);
    setIsEditingTime(true);
    const now = moment();
    setStartDate(now.format('YYYY-MM-DD'));
    setStartTime(now.format('HH:mm'));
    setEndDate(now.format('YYYY-MM-DD'));
    setEndTime(now.format('HH:mm'));
    setStatusText(`Registrera ny ledig tid för ${selectedAsset?.name}. Justera tider och klicka Spara.`);
    setStatusType('neutral');
  };

  // 3b. Save free time & validate rules with API; display status/error in textbox
  const handleSaveFreeTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      setStatusText('Fel: Ingen resurs vald.');
      setStatusType('error');
      return;
    }

    const startStr = `${startDate} ${startTime.trim().replace('.', ':')}`;
    const endStr = `${endDate} ${endTime.trim().replace('.', ':')}`;

    const startMoment = moment(startStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm'], true);
    const endMoment = moment(endStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm'], true);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      setStatusText('Fel: Starttid och sluttid måste ha giltigt datum och tid i 24-timmars format (t.ex. 09:00).');
      setStatusType('error');
      return;
    }

    const startIso = startMoment.format('YYYY-MM-DDTHH:mm:ss');
    const endIso = endMoment.format('YYYY-MM-DDTHH:mm:ss');

    try {
      setSavingTime(true);
      if (editingFreeId != null) {
        // Updating existing free time
        const res = await updateFreeTime(editingFreeId, startIso, endIso);
        setStatusText(`Status 200 OK: ${res.message || 'Ledig tid uppdaterades framgångsrikt.'} (ID: ${res.id})`);
        setStatusType('success');
      } else {
        // Creating new free time
        const res = await addFreeTime(selectedAsset.id, startIso, endIso);
        setStatusText(`Status 200 OK: ${res.message || 'Ledig tid har registrerats!'} (ID: ${res.id})`);
        setStatusType('success');
      }

      setIsEditingTime(false);
      setEditingFreeId(null);
      await loadFreeBlocks(selectedAsset.id);
    } catch (err: any) {
      setStatusText(`Fel vid kontroll/sparande: ${err.message || 'Ett fel uppstod'}`);
      setStatusType('error');
    } finally {
      setSavingTime(false);
    }
  };

  // Delete free time
  const handleDeleteFree = async (freeId: number) => {
    if (!window.confirm(`Är du säker på att du vill ta bort ledig tid #${freeId}?`)) return;
    try {
      await deleteFreeTime(freeId);
      setStatusText(`Status 200 OK: Ledig tid #${freeId} borttagen.`);
      setStatusType('success');
      if (editingFreeId === freeId) {
        setIsEditingTime(false);
        setEditingFreeId(null);
      }
      if (selectedAsset) {
        await loadFreeBlocks(selectedAsset.id);
      }
    } catch (err: any) {
      setStatusText(`Fel vid borttagning av ledig tid: ${err.message || 'Okänt fel'}`);
      setStatusType('error');
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Lediga tider: {location.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 3b. Svarstatus / Feltext textbox */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {statusType === 'error' ? <AlertCircle size={15} color="var(--danger)" /> : statusType === 'success' ? <CheckCircle2 size={15} color="var(--success)" /> : null}
            Status / Svar från API
          </label>
          <textarea
            readOnly
            rows={2}
            className="form-input"
            value={statusText}
            style={{
              backgroundColor: statusType === 'error' ? '#fef2f2' : statusType === 'success' ? '#f0fdf4' : '#f9fafb',
              borderColor: statusType === 'error' ? 'var(--danger)' : statusType === 'success' ? 'var(--success)' : 'var(--gray-300)',
              color: statusType === 'error' ? 'var(--danger)' : statusType === 'success' ? '#166534' : 'var(--gray-700)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              resize: 'none',
              fontWeight: statusType !== 'neutral' ? 600 : 400,
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* 2. Asset list for the location */}
          <div className="card" style={{ padding: '1rem', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="var(--primary)" /> Resurser på platsen ({assets.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                Klicka på en resurs för att se lediga tider
              </span>
            </div>

            {loadingAssets ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                <Loader2 className="animate-spin" size={24} color="var(--primary)" />
              </div>
            ) : assets.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                Inga resurser kopplade till denna plats.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {assets.map((asset) => {
                  const isSelected = selectedAsset?.id === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                        backgroundColor: isSelected ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--gray-800)' }}>
                          {asset.name}
                        </div>
                        {asset.mark && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                            {asset.mark}
                          </span>
                        )}
                        {asset.pricePerHour != null && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                            {Number(asset.pricePerHour).toFixed(2)} kr/tim
                          </span>
                        )}
                      </div>

                      <ChevronRight size={16} color={isSelected ? 'var(--primary)' : 'var(--gray-400)'} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Free times for selected asset */}
          {selectedAsset && (
            <div className="card" style={{ padding: '1rem', border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Lediga tider för: <span style={{ color: 'var(--primary)' }}>{selectedAsset.name}</span> ({freeBlocks.length})
                </h3>

                {/* 3c. Button "Registrera ny ledig tid" */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={handleStartNewFreeTime}
                >
                  <Plus size={15} /> Registrera ny ledig tid
                </button>
              </div>

              {/* 3a / 3c Time picker form with "Spara" button */}
              {isEditingTime && (
                <form
                  onSubmit={handleSaveFreeTime}
                  style={{
                    backgroundColor: 'var(--gray-50)',
                    padding: '1rem',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1rem',
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={16} color="var(--primary)" />
                    {editingFreeId ? `Redigera ledig tid #${editingFreeId}` : 'Registrera ny ledig tid'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Starttid (Datum & Tid)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.5rem' }}>
                        <input
                          type="date"
                          className="form-input"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                        <input
                          type="time"
                          className="form-input"
                          list="free-modal-time-presets"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          style={{ textAlign: 'center' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Sluttid (Datum & Tid)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.5rem' }}>
                        <input
                          type="date"
                          className="form-input"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                        <input
                          type="time"
                          className="form-input"
                          list="free-modal-time-presets"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          style={{ textAlign: 'center' }}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <datalist id="free-modal-time-presets">
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

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setIsEditingTime(false);
                        setEditingFreeId(null);
                      }}
                      disabled={savingTime}
                    >
                      Avbryt
                    </button>
                    {/* 3a / 3b / 3c Spara button */}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      disabled={savingTime}
                    >
                      {savingTime ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                      Spara
                    </button>
                  </div>
                </form>
              )}

              {/* Free blocks list / table */}
              {loadingFree ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                </div>
              ) : freeBlocks.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                  Inga lediga tider registrerade för denna resurs. Klicka på "Registrera ny ledig tid" för att lägga till.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Starttid</th>
                        <th>Sluttid</th>
                        <th>Åtgärd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freeBlocks.map((block) => {
                        const isPast = moment(block.endTime).isBefore(moment());
                        const isCurrentlyEdited = editingFreeId === block.id;
                        return (
                          <tr
                            key={block.id}
                            onClick={() => handleSelectFreeTime(block)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isCurrentlyEdited ? '#eff6ff' : undefined,
                              opacity: isPast ? 0.6 : 1,
                            }}
                            title="Klicka för att redigera start- och sluttid"
                          >
                            <td>#{block.id}</td>
                            <td>{moment(block.startTime).format('YYYY-MM-DD HH:mm')}</td>
                            <td>
                              {moment(block.endTime).format('YYYY-MM-DD HH:mm')}
                              {isPast && (
                                <span style={{ marginLeft: '0.4rem', color: 'var(--danger)', fontSize: '0.75rem' }}>
                                  (Passerad)
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFree(block.id);
                                }}
                              >
                                <Trash2 size={13} /> Ta bort
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
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
