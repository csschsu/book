import React, { useEffect, useState } from 'react';
import { AssetLocation } from '../types/models';
import { fetchAssetsByLocation, createAsset, deleteAsset } from '../services/api';
import { Box, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';

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
  const [assets, setAssets] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newAssetName, setNewAssetName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
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

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      await createAsset(locationId, newAssetName.trim());
      setNewAssetName('');
      await loadAssets();
      onAssetChanged?.();
    } catch (err: any) {
      setError(err.message || 'Kunde inte skapa resursen');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    try {
      setDeletingAssetId(assetId);
      setError(null);
      await deleteAsset(assetId);
      setConfirmDeleteId(null);
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

      {/* 4.3 / 5.3 Function: Create new asset */}
      <form onSubmit={handleCreateAsset} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Nytt resursnamn (t.ex. Mötesrum A, Squashbana 1)"
          value={newAssetName}
          onChange={(e) => setNewAssetName(e.target.value)}
          disabled={creating}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating || !newAssetName.trim()}
          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          {creating ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
          Lägg till resurs
        </button>
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
          {assets.map((asset) => (
            <div
              key={asset.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--gray-200)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Box size={16} color="var(--gray-500)" />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{asset.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', background: 'var(--gray-200)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  ID: {asset.assetId}
                </span>
              </div>

              {/* 5.4 Function: Delete asset */}
              {allowDelete && (
                <div>
                  {confirmDeleteId === asset.assetId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Säkert?</span>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteAsset(asset.assetId)}
                        disabled={deletingAssetId === asset.assetId}
                      >
                        {deletingAssetId === asset.assetId ? <Loader2 className="animate-spin" size={12} /> : 'Ja, ta bort'}
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
                      onClick={() => setConfirmDeleteId(asset.assetId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

