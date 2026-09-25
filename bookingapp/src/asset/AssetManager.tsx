import React, { useEffect, useState } from 'react';
import { Asset } from '../types/models';
import { fetchAssetsByLocation, createAsset, updateAsset, deleteAsset } from '../services/api';
import { Box, Trash2, Loader2, AlertCircle, Edit2 } from 'lucide-react';

interface AssetManagerProps {
  locationId: number;
  allowDelete?: boolean;
  onAssetChanged?: () => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({
  locationId,
  allowDelete = true,
  onAssetChanged,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for Asset (excluding id, userId, locationId)
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [name, setName] = useState<string>('');
  const [mark, setMark] = useState<string>('');
  const [pricePerHour, setPricePerHour] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadAssets();
  }, [locationId]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAssetsByLocation(locationId);
      setAssets(data);
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta resurser för platsen');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setName(asset.name || '');
    setMark(asset.mark || '');
    setPricePerHour(
      asset.pricePerHour != null ? Number(asset.pricePerHour).toFixed(2) : '0.00'
    );
    setError(null);
  };

  const handleResetForm = () => {
    setEditingAssetId(null);
    setName('');
    setMark('');
    setPricePerHour('');
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError(null);
      const parsedPrice = pricePerHour ? parseFloat(pricePerHour) : 0.0;

      if (editingAssetId != null) {
        // Update existing asset
        await updateAsset(editingAssetId, {
          id: editingAssetId,
          name: name.trim(),
          mark: mark.trim(),
          pricePerHour: parsedPrice,
        });
      } else {
        // Create new asset
        await createAsset(locationId, {
          name: name.trim(),
          mark: mark.trim(),
          pricePerHour: parsedPrice,
        });
      }

      handleResetForm();
      await loadAssets();
      onAssetChanged?.();
    } catch (err: any) {
      setError(err.message || 'Kunde inte spara resursen');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    try {
      setDeletingAssetId(assetId);
      setError(null);
      await deleteAsset(assetId);
      setConfirmDeleteId(null);
      if (editingAssetId === assetId) {
        handleResetForm();
      }
      await loadAssets();
      onAssetChanged?.();
    } catch (err: any) {
      setError(err.message || 'Kunde inte ta bort resursen');
    } finally {
      setDeletingAssetId(null);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Box size={18} color="var(--primary)" />
          Kopplade resurser ({assets.length})
        </h3>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Asset Form (name, mark, pricePerHour with 2 decimals) */}
      <form onSubmit={handleSaveAsset} style={{ background: 'var(--gray-50)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Namn *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Resursnamn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Märke</label>
            <input
              type="text"
              className="form-input"
              placeholder="Märke / beteckning"
              value={mark}
              onChange={(e) => setMark(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Pris/timme (kr)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="0.00"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
          {editingAssetId != null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetForm}
              disabled={saving}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            >
              Avbryt
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !name.trim()}
            style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : null}
            Spara
          </button>
        </div>
      </form>

      {/* 4.2 / 5.2 Function: View existing assets */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
          <Loader2 className="animate-spin" size={24} color="var(--primary)" />
        </div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--gray-500)', fontSize: '0.9rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
          Inga resurser har lagts till för denna plats än. Använd formuläret ovan för att lägga till resurser.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
          {assets.map((asset) => {
            const isEditing = editingAssetId === asset.id;
            return (
              <div
                key={asset.id}
                onClick={() => handleSelectAsset(asset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: isEditing ? '#eff6ff' : 'var(--gray-50)',
                  borderRadius: 'var(--radius)',
                  border: isEditing ? '1px solid var(--primary)' : '1px solid var(--gray-200)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                title="Klicka för att redigera"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Box size={16} color={isEditing ? 'var(--primary)' : 'var(--gray-500)'} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isEditing ? 'var(--primary)' : 'inherit' }}>
                    {asset.name}
                  </span>
                  {asset.mark && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', background: 'var(--gray-200)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {asset.mark}
                    </span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)', fontWeight: 500 }}>
                    {Number(asset.pricePerHour ?? 0).toFixed(2)} kr/tim
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', background: 'var(--gray-200)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ID: {asset.id}
                  </span>
                  {isEditing && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Edit2 size={12} /> Redigeras
                    </span>
                  )}
                </div>

                {/* 5.4 Function: Delete asset */}
                {allowDelete && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {confirmDeleteId === asset.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Säkert?</span>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteAsset(asset.id)}
                          disabled={deletingAssetId === asset.id}
                        >
                          {deletingAssetId === asset.id ? <Loader2 className="animate-spin" size={12} /> : 'Ja, ta bort'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Avbryt
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '0.3rem',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Ta bort resurs"
                        onClick={() => setConfirmDeleteId(asset.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

